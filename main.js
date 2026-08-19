// main.js — главный процесс Electron.
// Тут и только тут есть доступ к файловой системе и сети.
// Окно (renderer) ничего не может напрямую — только через preload.js + ipc.

const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, session } = require('electron');
// WebGPU нужен апскейлу видео (anime4k-webgpu) — в отличие от обычного
// Chrome, Electron не всегда включает его по умолчанию (зависит от версии/
// сборки), из-за чего navigator.gpu в renderer'е может быть undefined, и
// библиотека падает прямо при импорте, даже не доходя до попытки отрисовки.
// Флаг нужно ставить ДО app.whenReady() — после команда не подействует.
app.commandLine.appendSwitch('enable-unsafe-webgpu');
const path = require('node:path');
const fs = require('node:fs/promises');
const http = require('node:http');
const { autoUpdater } = require('electron-updater');
const { createClient } = require('@supabase/supabase-js');
// у @supabase/supabase-js реалтайм (чат/уведомления вживую) работает через WebSocket;
// в браузере он есть глобально, а в Node (наш главный процесс) — нет, поэтому
// подставляем реализацию из пакета "ws" перед созданием клиента.
if (!global.WebSocket) global.WebSocket = require('ws');

const SETTINGS_PATH = () => path.join(app.getPath('userData'), 'settings.json');
const SITES_PATH = () => path.join(app.getPath('userData'), 'sites.json');
const DOWNLOADS_DIR = () => path.join(app.getPath('userData'), 'downloads');
const DOWNLOADS_INDEX_PATH = () => path.join(DOWNLOADS_DIR(), 'index.json');
const PROFILE_PATH = () => path.join(app.getPath('userData'), 'profile.json');
const AVATAR_DIR = () => path.join(app.getPath('userData'), 'avatar');
const ONLINE_SESSION_PATH = () => path.join(app.getPath('userData'), 'online-session.json');

// Закладки/история манги и аниме должны быть привязаны к АККАУНТУ, а не к
// компьютеру — иначе при входе с одного ПК под разными аккаунтами они видят
// чужие закладки/историю. Хуже того: раньше syncPullAll ("допиши в облако то,
// чего там ещё нет") реально дописывал чужие локальные данные в облако
// новосозданного аккаунта, потому что не отличал "мои несинхронизированные
// записи" от "чужих записей, оставшихся на диске от предыдущего входа".
// Теперь у каждого аккаунта свой файл (по id профиля); для гостя (не
// залогинен) — общий на устройство файл без суффикса, как и было раньше.
function scopedDataPath(baseName) {
  const uid = onlineState.myId;
  const fileName = uid ? `${baseName}.${uid}.json` : `${baseName}.json`;
  return path.join(app.getPath('userData'), fileName);
}

// одноразовая миграция: у файла без привязки к аккаунту могут быть данные
// ещё с тех пор, когда разделения по аккаунтам не было (или это тот самый
// компьютер, где всегда был только один настоящий аккаунт) — при первом
// входе под каким-либо аккаунтом после обновления переносим их в его личный
// файл, а не выбрасываем молча. Срабатывает только один раз на аккаунт —
// как только свой файл появился, дальше просто читаем его.
async function migrateLegacyDataFile(baseName) {
  const uid = onlineState.myId;
  if (!uid) return; // гостевой режим и так использует общий файл напрямую
  const scoped = scopedDataPath(baseName);
  const legacy = path.join(app.getPath('userData'), `${baseName}.json`);
  try {
    await fs.access(scoped);
    return; // у аккаунта уже есть свой файл — переносить нечего
  } catch { /* своего файла ещё нет — пробуем перенести legacy ниже */ }
  try {
    // именно ПЕРЕНОС (rename), а не копирование — legacy-файл должен
    // достаться только ПЕРВОМУ аккаунту, который его затребует. Если бы
    // копировали, второй/третий новый аккаунт на этом же компьютере унаследовал
    // бы те же самые старые данные — тот же баг, просто на шаг позже.
    await fs.rename(legacy, scoped);
  } catch { /* legacy-файла нет (уже перенесён другим аккаунтом/битый) — начинаем с чистого листа, это нормально */ }
}

const LIBRARY_PATH = () => scopedDataPath('library');
const HISTORY_PATH = () => scopedDataPath('history');
const ANIME_LIBRARY_PATH = () => scopedDataPath('anime-library');
const ANIME_HISTORY_PATH = () => scopedDataPath('anime-history');

const DEFAULT_SETTINGS = { lastTab: 'manga', readerMode: 'paged' };
const DEFAULT_PROFILE = { displayName: 'Читатель', bio: '', avatarFile: null };

const MANGADEX_API = 'https://api.mangadex.org';
const MANGADEX_UPLOADS = 'https://uploads.mangadex.org';
const USER_AGENT = 'Hanko-PersonalReader/1.0 (+local, single-user desktop app)';

// ReManga — неофициальный (реверс-инжиниренный) источник, добавлен как второй
// поставщик тайтлов поверх MangaDex. У него нет открытого публичного API, поэтому
// эндпоинты ниже подсмотрены по трафику (тот же способ, которым пользуются сторонние
// читалки вроде Tachiyomi-расширений) и могут сломаться без предупреждения при
// редизайне сайта — при ошибке просто молча не добавляем их в общую выдачу.
const REMANGA_API = 'https://api.remanga.org/api';
const REMANGA_SITE = 'https://remanga.org';
// префикс в id — так по одному идентификатору сразу видно, к какому источнику
// (и какому обработчику) относится тайтл/глава, не храня это отдельным полем
// везде, где id тайтла уже используется как ключ (библиотека, загрузки, прогресс)
const REMANGA_PREFIX = 'rm:';

// WaManga — третий источник, добавлен по тому же принципу, что и ReManga.
// В отличие от ReManga, у поиска есть открытый JSON-эндпоинт (api/v1/manga?query=),
// подсмотренный через devtools (никакого Cloudflare/WAF, обычный fetch без токена).
// А вот у страницы тайтла и главы отдельного JSON нет — сайт (SvelteKit) отдаёт
// их сразу готовым HTML при обычной серверной отрисовке, поэтому детали/главы/
// страницы мы просто вытаскиваем регэкспами из HTML, а не через API.
const WAMANGA_API = 'https://wamanga.ru/api/v1';
const WAMANGA_SITE = 'https://wamanga.ru';
// id вида wa:<type>:<slug> — type это раздел сайта (manga/manhwa/manhua/comic),
// он нужен, чтобы построить правильный URL страницы тайтла
const WAMANGA_PREFIX = 'wa:';

// MangaBuff — четвёртый источник. Обычный SSR (Laravel), без Cloudflare/анти-бота
// (сервер отдаёт заголовок Server: ddos-guard, но обычные запросы проходят без
// JS-челленджа — подтверждено вручную через devtools). У поиска есть открытый
// JSON-эндпоинт (search/suggestions?q=), у тайтла и главы отдельного API нет —
// всё, включая прямые ссылки на картинки страниц, уже лежит в SSR HTML.
const MANGABUFF_SITE = 'https://mangabuff.ru';
// id вида mb:<slug>, глава — mb:<slug>:<том>:<глава>
const MANGABUFF_PREFIX = 'mb:';

// Usagi — пятый источник, часть известного семейства "Readmanga"-движков
// (заголовок страницы буквально "Usagi - Readmanga"). Часть инфраструктуры
// (статика фронтенда, resrmu.one-way.work) стоит за DDoS-Guard, но сам
// контент (поиск, страницы тайтла/главы) — нет, проверено вручную. Поиск —
// открытый JSON (search/suggestion?query=), список глав и картинки страниц
// уже лежат прямо в SSR HTML, отдельного API не нужно.
const USAGI_SITE = 'https://web.usagi.one';
// id тайтла вида ug:<slug>, id главы — ug:<href нацело, начиная с "/">
const USAGI_PREFIX = 'ug:';

let mainWindow = null;

// ---------- диск: настройки / библиотека / сайты ----------

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return data;
}

async function loadSettings() {
  const s = await readJson(SETTINGS_PATH(), {});
  return { ...DEFAULT_SETTINGS, ...s };
}

async function saveSettings(partial) {
  const current = await loadSettings();
  return writeJson(SETTINGS_PATH(), { ...current, ...partial });
}

async function loadLibrary() {
  await migrateLegacyDataFile('library');
  const l = await readJson(LIBRARY_PATH(), { items: [] });
  return Array.isArray(l.items) ? l.items : [];
}

async function saveLibrary(items) {
  await writeJson(LIBRARY_PATH(), { items });
  return items;
}

// История прочтения — намеренно отдельный файл, не library.json: прогресс тут
// пишется для ЛЮБОГО открытого тайтла, даже если он не добавлен в библиотеку
// (в library.json прогресс молча не сохраняется для тайтлов не из списка —
// это осталось для карточек с полосой прогресса и виджета «Продолжить» на
// Главной, трогать не стали). Ограничиваем 300 записями, чтобы файл не рос
// бесконечно у тех, кто читает много разных тайтлов.
const HISTORY_MAX_ENTRIES = 300;

async function loadHistory() {
  await migrateLegacyDataFile('history');
  const h = await readJson(HISTORY_PATH(), { items: [] });
  return Array.isArray(h.items) ? h.items : [];
}

async function saveHistory(items) {
  await writeJson(HISTORY_PATH(), { items: items.slice(0, HISTORY_MAX_ENTRIES) });
  return items;
}

// Аниме-закладки — отдельный файл, полный аналог library.json, но для тайтлов
// AniLibria (item.id — id релиза AniLibria, не пересекается с id манги).
async function loadAnimeLibrary() {
  await migrateLegacyDataFile('anime-library');
  const l = await readJson(ANIME_LIBRARY_PATH(), { items: [] });
  return Array.isArray(l.items) ? l.items : [];
}

async function saveAnimeLibrary(items) {
  await writeJson(ANIME_LIBRARY_PATH(), { items });
  return items;
}

// История просмотров — аналог history.json для аниме: пишется для ЛЮБОГО
// открытого тайтла (не только из закладок), при открытии серии в плеере.
const ANIME_HISTORY_MAX_ENTRIES = 300;

async function loadAnimeHistory() {
  await migrateLegacyDataFile('anime-history');
  const h = await readJson(ANIME_HISTORY_PATH(), { items: [] });
  return Array.isArray(h.items) ? h.items : [];
}

async function saveAnimeHistory(items) {
  await writeJson(ANIME_HISTORY_PATH(), { items: items.slice(0, ANIME_HISTORY_MAX_ENTRIES) });
  return items;
}

async function loadSites() {
  const s = await readJson(SITES_PATH(), { sites: [] });
  return Array.isArray(s.sites) ? s.sites : [];
}

async function saveSites(sites) {
  await writeJson(SITES_PATH(), { sites });
  return sites;
}

async function readProfileRaw() {
  const p = await readJson(PROFILE_PATH(), {});
  return { ...DEFAULT_PROFILE, ...p };
}

function attachAvatarUrl(profile) {
  const avatarUrl = profile.avatarFile
    ? `http://127.0.0.1:${appServerPort}/__userdata/avatar/${encodeURIComponent(profile.avatarFile)}`
    : null;
  return { ...profile, avatarUrl };
}

async function loadProfile() {
  return attachAvatarUrl(await readProfileRaw());
}

async function saveProfile(partial) {
  const current = await readProfileRaw();
  const next = { ...current, ...partial };
  await writeJson(PROFILE_PATH(), next);
  return attachAvatarUrl(next);
}

async function loadDownloadsIndex() {
  const d = await readJson(DOWNLOADS_INDEX_PATH(), { entries: [] });
  return Array.isArray(d.entries) ? d.entries : [];
}

async function saveDownloadsIndex(entries) {
  await fs.mkdir(DOWNLOADS_DIR(), { recursive: true });
  await writeJson(DOWNLOADS_INDEX_PATH(), { entries });
  return entries;
}

// картинки страниц/обложек грузятся напрямую тегами <img> из окна (file://),
// у такой страницы браузер вообще не отправляет Referer — часть узлов раздачи
// MangaDex (@Home) на это ругается и отдаёт битую страницу. Подставляем Referer
// и наш User-Agent на уровне сети для всех запросов к MangaDex, чтобы это
// работало одинаково что для API (уже шлёт UA сам), что для картинок.
// ВАЖНО: у session.webRequest может быть только один активный обработчик
// onBeforeSendHeaders на сессию — повторный вызов этого метода полностью
// заменяет предыдущий колбэк, а не добавляется к нему (фильтр по urls тут
// не спасает, ограничение на уровне самого вызова). Поэтому MangaDex и
// ReManga обязаны подставлять заголовки из ОДНОГО обработчика, иначе тот,
// что зарегистрирован вторым, тихо отключает заголовки для первого.
function setupRequestHeaders() {
  const filter = {
    // reimg.org / reimg2.org и т.п. — CDN-зеркала ReManga для картинок страниц
    // (не сам remanga.org/api.remanga.org), без Referer с этих доменов сайт не
    // отдавал картинку — это и было причиной "страница не загрузилась" у части
    // тайтлов. Судя по всему, у сайта несколько пронумерованных зеркал этого CDN
    // (уже встретились reimg.org и reimg2.org на разных тайтлах) — добавил с
    // запасом ещё несколько вероятных номеров; если попадётся не из этого
    // списка, добавляется той же одной строкой.
    urls: [
      '*://*.mangadex.org/*', '*://*.mangadex.network/*',
      '*://*.remanga.org/*',
      '*://*.reimg.org/*', '*://*.reimg2.org/*', '*://*.reimg3.org/*',
      '*://*.reimg4.org/*', '*://*.reimg5.org/*',
      '*://*.wamanga.ru/*', '*://*.mangabuff.ru/*',
      // rmr.rocks — CDN картинок страниц Usagi, тоже несколько поддоменов-шардов
      // (p7/p11/p15/a12 уже встретились) — сразу без wildcard-номеров, раз тут
      // шардируется не по цифре в самом домене, а по случайному префиксу поддомена
      '*://*.rmr.rocks/*',
    ],
  };
  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const url = details.url;
    if (url.includes('remanga.org') || url.includes('reimg')) {
      details.requestHeaders['Referer'] = `${REMANGA_SITE}/`;
      details.requestHeaders['Origin'] = REMANGA_SITE;
    } else if (url.includes('wamanga.ru')) {
      details.requestHeaders['Referer'] = `${WAMANGA_SITE}/`;
      details.requestHeaders['Origin'] = WAMANGA_SITE;
    } else if (url.includes('mangabuff.ru')) {
      details.requestHeaders['Referer'] = `${MANGABUFF_SITE}/`;
      details.requestHeaders['Origin'] = MANGABUFF_SITE;
    } else if (url.includes('rmr.rocks')) {
      details.requestHeaders['Referer'] = `${USAGI_SITE}/`;
      details.requestHeaders['Origin'] = USAGI_SITE;
    } else {
      details.requestHeaders['Referer'] = 'https://mangadex.org/';
    }
    details.requestHeaders['User-Agent'] = USER_AGENT;
    callback({ requestHeaders: details.requestHeaders });
  });
}

// ---------- окно ----------

// ---------- локальный HTTP-сервер для содержимого окна (шаг 1) ----------
// Раньше index.html грузился через file:// — у такой страницы физически нет
// нормального origin, из-за чего YouTube (и в принципе любой встраиваемый
// сторонний контент) не может провалидировать встраивание и падает с
// ошибкой вида "player error 153". Поднимаем свой сервер на 127.0.0.1
// (только локальная петля, наружу не торчит) на случайном свободном порту —
// тогда у страницы появляется настоящий origin http://127.0.0.1:<port>.
//
// ВАЖНО (временно, до следующих шагов): это только сам index.html/
// renderer.js/style.css и т.п. из корня приложения — аватарка/стикеры/
// скачанные страницы манги всё ещё отдаются как file:// и на этом шаге
// ожидаемо перестанут показываться (Chromium блокирует file:// с страницы,
// загруженной не как file://). Это чинится следующими шагами по одному.
const APP_SERVER_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

let appServerPort = null;

function startAppServer() {
  return new Promise((resolve, reject) => {
    const root = __dirname;
    // три отдельных маршрута для данных ВНЕ корня приложения (userData, а у
    // стикеров в собранном .exe ещё и asarUnpack-путь рядом с asar) — обычная
    // статика ниже отдаёт только то, что физически лежит внутри __dirname
    const USERDATA_ROUTES = [
      { prefix: '/__userdata/avatar/', base: () => AVATAR_DIR() },
      { prefix: '/__stickers/', base: () => stickersBaseDir() },
      { prefix: '/__downloads/', base: () => DOWNLOADS_DIR() },
    ];
    const server = http.createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        let filePath;
        const route = USERDATA_ROUTES.find((r) => urlPath.startsWith(r.prefix));
        if (route) {
          const base = route.base();
          const rest = path.normalize(urlPath.slice(route.prefix.length)).replace(/^(\.\.[/\\])+/, '');
          filePath = path.join(base, rest);
          if (!filePath.startsWith(base)) { res.writeHead(403); res.end('Forbidden'); return; }
        } else {
          const safePath = path.normalize(urlPath === '/' ? '/index.html' : urlPath).replace(/^(\.\.[/\\])+/, '');
          filePath = path.join(root, safePath);
          if (!filePath.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
        }
        const data = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': APP_SERVER_MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    // порт был случайным (listen(0, ...)) — из-за этого Origin приложения
    // менялся при каждом запуске, а браузерный HTTP-кэш на диске иногда
    // отдавал ЗАКЭШИРОВАННЫЙ (с предыдущего запуска, другой Origin) CORS-
    // заголовок стороннего CDN — с несовпадающим портом в
    // Access-Control-Allow-Origin запрос блокировался. Фиксированный порт
    // убирает саму причину; если он вдруг занят (например, одновременно
    // открыты dev-версия и собранный .exe) — откатываемся на случайный,
    // это редкий случай и лучше так, чем не запуститься вовсе.
    const FIXED_APP_SERVER_PORT = 47812;
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        server.listen(0, '127.0.0.1');
      } else {
        reject(err);
      }
    });
    server.once('listening', () => {
      appServerPort = server.address().port;
      resolve(server);
    });
    server.listen(FIXED_APP_SERVER_PORT, '127.0.0.1');
  });
}

function createWindow() {
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#84addd',
    title: 'Hanko',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadURL(`http://127.0.0.1:${appServerPort}/index.html`);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Menu.setApplicationMenu(null) выше убирает вместе с меню и стандартный
  // шорткат Ctrl+Shift+I/F12 на DevTools — он живёт именно в этом меню, не
  // на уровне ОС. Возвращаем его отдельно, раз меню решили не показывать.
  mainWindow.webContents.on('before-input-event', (_e, input) => {
    const isToggleCombo = input.key === 'F12'
      || (input.key.toUpperCase() === 'I' && input.control && input.shift);
    if (isToggleCombo) mainWindow.webContents.toggleDevTools();
  });
}

// ---------- иконка в системном трее ----------
// Просто удобный доступ, пока приложение свёрнуто в панель задач: развернуть
// его обратно или полностью закрыть, не разыскивая окно среди других задач.
let tray = null;

function restoreWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function setupTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  tray.setToolTip('Hanko');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Открыть Hanko', click: restoreWindow },
    { type: 'separator' },
    { label: 'Закрыть', click: () => app.quit() },
  ]));
  tray.on('click', restoreWindow);
}

// ---------- флаг dev-режима для renderer ----------
// Нужен, чтобы часть отладочной информации (например, бейдж "источник: ...")
// показывалась только при запуске через `npm start`, а не в собранном .exe,
// который получают обычные пользователи.
ipcMain.handle('app:isDev', () => !app.isPackaged);

// Настоящий полноэкранный режим ОС (как F11 в браузере) — прячет и системную
// рамку окна, и панель задач Windows. Используется читалкой манги, чтобы
// ничего не отвлекало от страницы. Обычный "hidden" у оверлея в приложении
// этого не даёт — окно остаётся окном, просто с невидимым контентом вокруг.
ipcMain.handle('app:setFullScreen', (_e, value) => {
  if (mainWindow) mainWindow.setFullScreen(!!value);
});

// ---------- иконка для нативных уведомлений Windows ----------
// Toast-уведомления Windows рисует отдельный системный процесс, который не
// умеет читать файлы внутри app.asar — поэтому даём ему реальный путь на
// диске (asarUnpack в package.json физически кладёт assets рядом с asar).
ipcMain.handle('app:notificationIcon', () => {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : __dirname;
  return path.join(base, 'assets', 'icon.png');
});

// ---------- стикеры (кастомные gif, по категориям-папкам) ----------
// Та же логика unpacked-пути, что и у иконки уведомлений — assets/**
// физически лежит рядом с asar (см. asarUnpack в package.json). Сами файлы
// отдаются через локальный http-сервер (маршрут /__stickers/, см.
// startAppServer) — раньше были прямые file://, но с переходом окна на
// http://127.0.0.1 (чтобы у YouTube-эмбедов был нормальный origin) обычные
// file:// с http-страницы Chromium уже не грузит.
// Структура: assets/stickers/<Категория>/<файл>.gif — подпапка = категория
// в интерфейсе (название папки = название категории, без отдельного
// маппинга). Gif-файлы прямо в assets/stickers/ (не в подпапке) попадают
// в отдельную категорию "Разное". Список читается заново при каждом вызове
// (не кэшируется в main) — так что закинуть новый gif в папку и перезапустить
// приложение достаточно, код трогать не нужно.
function stickersBaseDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'stickers')
    : path.join(__dirname, 'assets', 'stickers');
}

ipcMain.handle('stickers:list', async () => {
  const base = stickersBaseDir();
  let entries;
  try {
    entries = await fs.readdir(base, { withFileTypes: true });
  } catch {
    return { categories: [] };
  }
  const categories = [];
  const loose = [];
  // отбрасываем 0-байтные/битые файлы — раньше такой файл всё равно попадал
  // в список и превращался в "битую иконку" на месте стикера
  async function realGifFiles(dir, names) {
    const out = [];
    for (const name of names) {
      try {
        const stat = await fs.stat(path.join(dir, name));
        if (stat.size > 0) out.push(name);
      } catch {
        // не смогли прочитать — пропускаем
      }
    }
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dir = path.join(base, entry.name);
      let files;
      try {
        const all = (await fs.readdir(dir)).filter((f) => f.toLowerCase().endsWith('.gif'));
        files = await realGifFiles(dir, all);
      } catch {
        files = [];
      }
      if (!files.length) continue;
      categories.push({
        name: entry.name,
        stickers: files.map((f) => ({
          name: f,
          url: `http://127.0.0.1:${appServerPort}/__stickers/${encodeURIComponent(entry.name)}/${encodeURIComponent(f)}`,
          // стабильный ключ для передачи в чат — не зависит от абсолютного пути
          // на конкретном компьютере (у собеседника установка в другой папке)
          key: `${entry.name}/${f}`,
        })),
      });
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gif')) {
      loose.push(entry.name);
    }
  }
  const looseReal = await realGifFiles(base, loose);
  if (looseReal.length) {
    categories.push({
      name: 'Разное',
      stickers: looseReal.map((f) => ({
        name: f,
        url: `http://127.0.0.1:${appServerPort}/__stickers/${encodeURIComponent(f)}`,
        key: `Разное/${f}`,
      })),
    });
  }
  return { categories };
});

// ---------- автообновление (GitHub Releases, через electron-updater) ----------
// Работает только в собранном .exe (app.isPackaged) — при обычном "npm start"
// в разработке просто ничего не делает, там нет реального релиза для сверки.
// Статус прокидывается в renderer через IPC, чтобы окно "доступно обновление"
// было в стилистике приложения, а не системным диалогом Electron.
let lastUpdateStatus = { state: 'idle' };

function sendUpdateStatus(status) {
  lastUpdateStatus = status;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update:status', status);
  }
}

function setupAutoUpdate() {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({ state: 'available', version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({ state: 'downloading', percent: progress.percent, version: lastUpdateStatus.version });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({ state: 'ready', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    console.error('Автообновление:', err?.message || err);
    sendUpdateStatus({ state: 'error', message: err?.message || String(err) });
  });

  // Раньше checkForUpdates() вызывался только один раз при запуске — если
  // приложение долго не закрывать, а релиз вышел уже после старта, апдейтер
  // об этом просто никогда не узнавал, пока не перезайдёшь в приложение.
  // Теперь дополнительно перепроверяем раз в UPDATE_CHECK_INTERVAL_MS, пока
  // само приложение открыто — как и раньше, ничего не показываем, если
  // обновлений нет (never всё тихо).
  const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000; // раз в 30 минут

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('Проверка обновлений не удалась:', err?.message || err);
  });

  setInterval(() => {
    // если уже нашли/скачали обновление в этом сеансе — не дёргаем заново,
    // повторная проверка тут не нужна, просто ждём, пока человек перезайдёт
    if (lastUpdateStatus.state === 'available' || lastUpdateStatus.state === 'downloading' || lastUpdateStatus.state === 'ready') return;
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Проверка обновлений не удалась:', err?.message || err);
    });
  }, UPDATE_CHECK_INTERVAL_MS);
}

ipcMain.handle('update:getStatus', () => lastUpdateStatus);

ipcMain.handle('update:install', () => {
  // isSilent=true — ставит без видимого окна NSIS-инсталлятора (так это
  // ощущается как обновление на месте, а не переустановка), isForceRunAfter=true
  // — сам перезапускает приложение после установки
  autoUpdater.quitAndInstall(true, true);
});

app.whenReady().then(async () => {
  if (process.platform === 'win32') app.setAppUserModelId('com.hanko.app');
  await startAppServer();
  createWindow();
  setupRequestHeaders();
  setupAutoUpdate();
  startHealthMonitor();
  setupTray();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// не даём случайно созданным окнам (window.open из webview и т.п.) открываться внутри
// приложения без спроса — уводим такие переходы в обычный системный браузер
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() === 'webview') {
    contents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });
  }
});

// ---------- IPC: настройки / библиотека / сайты ----------

ipcMain.handle('settings:load', () => loadSettings());
ipcMain.handle('settings:save', (_e, partial) => saveSettings(partial || {}));

ipcMain.handle('library:load', () => loadLibrary());

ipcMain.handle('library:upsert', async (_e, item) => {
  const items = await loadLibrary();
  const idx = items.findIndex((i) => i.id === item.id);
  const merged = idx >= 0 ? { ...items[idx], ...item } : { ...item, addedAt: item.addedAt || Date.now() };
  if (idx >= 0) items[idx] = merged; else items.unshift(merged);
  await saveLibrary(items);
  pushLibraryItem('manga', merged);
  return items;
});

ipcMain.handle('library:remove', async (_e, id) => {
  const items = (await loadLibrary()).filter((i) => i.id !== id);
  await saveLibrary(items);
  pushLibraryRemove('manga', id);
  return items;
});

ipcMain.handle('library:progress', async (_e, { id, chapterId, chapterLabel, page }) => {
  const items = await loadLibrary();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx].progress = { chapterId, chapterLabel, page, updatedAt: Date.now() };
    await saveLibrary(items);
    pushLibraryItem('manga', items[idx]);
  }
  return items;
});

ipcMain.handle('history:load', () => loadHistory());

ipcMain.handle('history:progress', async (_e, { mangaId, title, coverUrl, chapterId, chapterLabel, page }) => {
  const items = await loadHistory();
  const filtered = items.filter((i) => i.mangaId !== mangaId);
  const entry = { mangaId, title, coverUrl, chapterId, chapterLabel, page, updatedAt: Date.now() };
  filtered.unshift(entry);
  await saveHistory(filtered);
  pushHistoryItem('manga', entry);
  return filtered;
});

ipcMain.handle('history:remove', async (_e, mangaId) => {
  const items = (await loadHistory()).filter((i) => i.mangaId !== mangaId);
  await saveHistory(items);
  pushHistoryRemove('manga', mangaId);
  return items;
});

ipcMain.handle('history:clear', async () => {
  const result = await saveHistory([]);
  pushHistoryClear('manga');
  return result;
});

ipcMain.handle('anime-library:load', () => loadAnimeLibrary());

ipcMain.handle('anime-library:upsert', async (_e, item) => {
  const items = await loadAnimeLibrary();
  const idx = items.findIndex((i) => i.id === item.id);
  const merged = idx >= 0 ? { ...items[idx], ...item } : { ...item, addedAt: Date.now() };
  if (idx >= 0) items[idx] = merged; else items.push(merged);
  await saveAnimeLibrary(items);
  pushLibraryItem('anime', merged);
  return items;
});

ipcMain.handle('anime-library:remove', async (_e, id) => {
  const items = (await loadAnimeLibrary()).filter((i) => i.id !== id);
  await saveAnimeLibrary(items);
  pushLibraryRemove('anime', id);
  return items;
});

ipcMain.handle('anime-history:load', () => loadAnimeHistory());

ipcMain.handle('anime-history:progress', async (_e, { releaseId, title, coverUrl, episodeIndex, episodeLabel }) => {
  const items = await loadAnimeHistory();
  const existing = items.find((i) => i.releaseId === releaseId);
  // если это та же самая серия, что уже была последней в истории — не сбрасываем
  // накопленную позицию воспроизведения (иначе смена качества/озвучки внутри
  // той же серии обнуляла бы её на каждый вызов); для действительно новой
  // серии начинаем с нуля
  const keepPosition = existing && existing.episodeLabel === episodeLabel ? (existing.positionSec || 0) : 0;
  const filtered = items.filter((i) => i.releaseId !== releaseId);
  const entry = {
    releaseId, title, coverUrl, episodeIndex, episodeLabel,
    positionSec: keepPosition,
    updatedAt: Date.now(),
  };
  filtered.unshift(entry);
  await saveAnimeHistory(filtered);
  // позицию (setPosition ниже) в облако не шлём — она обновляется каждые ~5 сек
  // во время просмотра, это было бы слишком часто; смена серии/тайтла — самое
  // важное для восстановления на другом устройстве — и так попадает сюда
  pushHistoryItem('anime', entry);
  return filtered;
});

// лёгкое обновление только позиции — вызывается часто (раз в ~5 сек во время
// просмотра), поэтому не трогает остальные поля записи и не шлётся в облако
ipcMain.handle('anime-history:setPosition', async (_e, { releaseId, positionSec }) => {
  const items = await loadAnimeHistory();
  const idx = items.findIndex((i) => i.releaseId === releaseId);
  if (idx >= 0) {
    items[idx].positionSec = positionSec;
    await saveAnimeHistory(items);
  }
  return true;
});

ipcMain.handle('anime-history:remove', async (_e, releaseId) => {
  const items = (await loadAnimeHistory()).filter((i) => i.releaseId !== releaseId);
  await saveAnimeHistory(items);
  pushHistoryRemove('anime', releaseId);
  return items;
});

ipcMain.handle('anime-history:clear', async () => {
  const result = await saveAnimeHistory([]);
  pushHistoryClear('anime');
  return result;
});

ipcMain.handle('library:note', async (_e, { id, note }) => {
  const items = await loadLibrary();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx].note = note;
    await saveLibrary(items);
    pushLibraryItem('manga', items[idx]);
  }
  return items;
});

ipcMain.handle('library:addComment', async (_e, { id, text }) => {
  const clean = String(text || '').trim().slice(0, 500);
  if (!clean) return loadLibrary();
  const items = await loadLibrary();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    const comments = Array.isArray(items[idx].comments) ? items[idx].comments : [];
    comments.unshift({ id: `cm_${Date.now()}`, text: clean, createdAt: Date.now() });
    items[idx].comments = comments;
    await saveLibrary(items);
    pushLibraryItem('manga', items[idx]);
  }
  return items;
});

ipcMain.handle('library:removeComment', async (_e, { id, commentId }) => {
  const items = await loadLibrary();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx].comments = (Array.isArray(items[idx].comments) ? items[idx].comments : []).filter(
      (c) => c.id !== commentId
    );
    await saveLibrary(items);
    pushLibraryItem('manga', items[idx]);
  }
  return items;
});

ipcMain.handle('anime-library:note', async (_e, { id, note }) => {
  const items = await loadAnimeLibrary();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx].note = note;
    await saveAnimeLibrary(items);
    pushLibraryItem('anime', items[idx]);
  }
  return items;
});

ipcMain.handle('anime-library:addComment', async (_e, { id, text }) => {
  const clean = String(text || '').trim().slice(0, 500);
  if (!clean) return loadAnimeLibrary();
  const items = await loadAnimeLibrary();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    const comments = Array.isArray(items[idx].comments) ? items[idx].comments : [];
    comments.unshift({ id: `cm_${Date.now()}`, text: clean, createdAt: Date.now() });
    items[idx].comments = comments;
    await saveAnimeLibrary(items);
    pushLibraryItem('anime', items[idx]);
  }
  return items;
});

ipcMain.handle('anime-library:removeComment', async (_e, { id, commentId }) => {
  const items = await loadAnimeLibrary();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx].comments = (Array.isArray(items[idx].comments) ? items[idx].comments : []).filter(
      (c) => c.id !== commentId
    );
    await saveAnimeLibrary(items);
    pushLibraryItem('anime', items[idx]);
  }
  return items;
});

ipcMain.handle('sites:load', () => loadSites());

ipcMain.handle('sites:upsert', async (_e, site) => {
  const sites = await loadSites();
  const idx = sites.findIndex((s) => s.id === site.id);
  if (idx >= 0) sites[idx] = { ...sites[idx], ...site };
  else sites.unshift(site);
  return saveSites(sites);
});

ipcMain.handle('sites:remove', async (_e, id) => {
  const sites = (await loadSites()).filter((s) => s.id !== id);
  return saveSites(sites);
});

ipcMain.handle('sites:note', async (_e, { id, note }) => {
  const sites = await loadSites();
  const idx = sites.findIndex((s) => s.id === id);
  if (idx >= 0) {
    sites[idx].note = note;
    await saveSites(sites);
  }
  return sites;
});

// ---------- Новости (YouTube-каналы + RSS новостных сайтов) ----------
// Список категорий/источников теперь ОБЩИЙ — хранится в Supabase
// (news_categories/news_sources, см. supabase_schema.sql), а не в локальном
// файле на каждом компьютере по отдельности (раньше было так, из-за чего
// "удалил у себя" не значило "удалил у всех" — разные компьютеры просто не
// знали друг о друге). Читать может любой; добавлять/удалять — только
// модератор (is_moderator на profiles), см. rpc_admin_* в supabase_schema.sql
// и обработчики news:upsertCategory/addSource/removeSource/removeCategory
// ниже — каждый требует supabase.rpc(...), которая сама проверяет права на
// сервере (клиентская проверка isModerator в renderer.js — только чтобы не
// показывать кнопки зря, не единственная защита).
// Локальный файл остался только как КЭШ на случай отсутствия сети/онлайна —
// последний успешно полученный список, чтобы вкладка не была пустой офлайн.
const NEWS_CACHE_PATH = () => path.join(app.getPath('userData'), 'news-categories-cache.json');

async function loadNewsCategoriesCache() {
  const c = await readJson(NEWS_CACHE_PATH(), { categories: [] });
  return Array.isArray(c.categories) ? c.categories : [];
}

async function loadNewsCategories() {
  try {
    const [{ data: cats, error: catErr }, { data: srcs, error: srcErr }] = await Promise.all([
      supabase.rpc('rpc_list_news_categories'),
      supabase.rpc('rpc_list_news_sources'),
    ]);
    if (catErr) throw catErr;
    if (srcErr) throw srcErr;
    const categories = (cats || []).map((c) => ({
      id: c.id,
      name: c.name,
      sources: (srcs || [])
        .filter((s) => s.category_id === c.id)
        .map((s) => (s.type === 'youtube'
          ? { id: s.id, type: 'youtube', channelId: s.value, label: s.label }
          : { id: s.id, type: 'rss', url: s.value, label: s.label })),
    }));
    writeJson(NEWS_CACHE_PATH(), { categories }).catch(() => {});
    return categories;
  } catch {
    // онлайн ещё не подключился / сети нет — отдаём последний известный кэш,
    // а не пустоту
    return loadNewsCategoriesCache();
  }
}

async function newsFetchText(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ru,en;q=0.8' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function decodeXmlEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '') // на всякий случай срезаем оставшиеся теги (иногда описание — само мини-HTML)
    .trim();
}
function stripHtml(s) {
  return decodeXmlEntities(s);
}

// YouTube-хэндл (@Aniplex_FGO) или ссылка на канал → { channelId, channelName }.
// channelId нужен RSS-ленте (сам YouTube RSS принимает только channel_id, не
// хэндл), channelName — чтобы в списке источников показывать нормальное имя
// канала, а не то, что человек вписал в поле (та же голая ссылка/хэндл — не
// всегда понятно с одного взгляда, какой это канал, особенно обрезанный
// многоточием в узком попапе)
async function resolveYoutubeChannel(input) {
  const raw = input.trim();
  const ucMatch = raw.match(/^UC[\w-]{20,}$/);
  const url = ucMatch ? `https://www.youtube.com/channel/${raw}`
    : (/^https?:\/\//.test(raw) ? raw : `https://www.youtube.com/${raw.replace(/^@?/, '@')}`);
  const html = await newsFetchText(url);
  let channelId = ucMatch ? raw : null;
  if (!channelId) {
    const m = html.match(/"channelId":"(UC[\w-]{20,})"/) || html.match(/channel_id=(UC[\w-]{20,})/);
    if (!m) throw new Error('Не удалось найти id канала — проверь ссылку/хэндл');
    channelId = m[1];
  }
  const nameMatch = html.match(/<meta name="title" content="([^"]+)"/)
    || html.match(/<meta property="og:title" content="([^"]+)"/);
  const channelName = nameMatch ? decodeXmlEntities(nameMatch[1]) : raw;
  return { channelId, channelName };
}

async function fetchYoutubeChannelFeed(channelId) {
  const xml = await newsFetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`);
  const items = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    const block = m[1];
    const videoId = (block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = decodeXmlEntities((block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '');
    const channelName = decodeXmlEntities((block.match(/<name>([\s\S]*?)<\/name>/) || [])[1] || '');
    const published = (block.match(/<published>([^<]+)<\/published>/) || [])[1];
    const description = decodeXmlEntities((block.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || '');
    if (!videoId) continue;
    items.push({
      type: 'video',
      id: `yt:${videoId}`,
      title,
      description,
      channelName,
      publishedAt: published ? new Date(published).getTime() : 0,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      videoId,
      link: `https://www.youtube.com/watch?v=${videoId}`,
    });
  }
  return items;
}

// обычный RSS 2.0 (<item>) или Atom (<entry>) — большинство новостных
// сайтов отдают один из этих двух форматов под /rss, /feed, /atom.xml и т.п.
function parseGenericFeed(xml, sourceLabel) {
  const items = [];
  const isAtom = !xml.includes('<item>') && xml.includes('<entry');
  const blockRe = isAtom ? /<entry[^>]*>([\s\S]*?)<\/entry>/g : /<item[^>]*>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = blockRe.exec(xml))) {
    const block = m[1];
    const title = decodeXmlEntities((block.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '');
    let link = '';
    if (isAtom) {
      const linkMatch = block.match(/<link[^>]*href="([^"]+)"[^>]*\/?>/);
      link = linkMatch ? linkMatch[1] : '';
    } else {
      link = decodeXmlEntities((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '');
    }
    const dateRaw = (block.match(/<pubDate>([^<]+)<\/pubDate>/) || block.match(/<published>([^<]+)<\/published>/) || block.match(/<updated>([^<]+)<\/updated>/) || [])[1];
    const descRaw = (block.match(/<description>([\s\S]*?)<\/description>/) || block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || block.match(/<content[^>]*>([\s\S]*?)<\/content>/) || [])[1] || '';
    const imgMatch = block.match(/<media:content[^>]+url="([^"]+)"/) || block.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="image/) || descRaw.match(/<img[^>]+src="([^"]+)"/);
    if (!title) continue;
    items.push({
      type: 'article',
      id: `rss:${link || title}`,
      title,
      description: stripHtml(descRaw).slice(0, 600),
      channelName: sourceLabel,
      publishedAt: dateRaw ? new Date(dateRaw).getTime() : 0,
      thumbnail: imgMatch ? imgMatch[1] : null,
      link,
    });
  }
  return items;
}

async function fetchRssFeed(url, label) {
  const xml = await newsFetchText(url);
  return parseGenericFeed(xml, label);
}

// бесплатный перевод через нестандартный, но крайне широко используемый
// (в т.ч. массой опенсорсных проектов) эндпоинт Google Translate — без
// платного API-ключа. sl=auto сам определяет язык; если текст уже на
// русском, просто вернётся тем же (или почти тем же).
const translateCache = new Map();
async function translateToRu(text) {
  if (!text) return text;
  if (translateCache.has(text)) return translateCache.get(text);
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ru&dt=t&q=${encodeURIComponent(text.slice(0, 4500))}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const translated = (data[0] || []).map((chunk) => chunk[0]).join('');
    translateCache.set(text, translated || text);
    return translated || text;
  } catch {
    return text; // не страшно — покажем оригинал, лучше чем ничего
  }
}

ipcMain.handle('news:loadCategories', () => loadNewsCategories());

ipcMain.handle('news:upsertCategory', async (_e, category) => {
  const id = category.id || `cat-${Date.now()}`;
  const { error } = await supabase.rpc('rpc_admin_upsert_news_category', {
    p_id: id, p_name: category.name,
  });
  if (error) throw new Error(friendlyOnlineError(error));
  return loadNewsCategories();
});

ipcMain.handle('news:removeCategory', async (_e, id) => {
  const { error } = await supabase.rpc('rpc_admin_remove_news_category', { p_id: id });
  if (error) throw new Error(friendlyOnlineError(error));
  return loadNewsCategories();
});

ipcMain.handle('news:addSource', async (_e, { categoryId, type, value }) => {
  let payload;
  if (type === 'youtube') {
    const { channelId, channelName } = await resolveYoutubeChannel(value);
    payload = { id: `src-${Date.now()}`, type: 'youtube', value: channelId, label: channelName };
  } else {
    // проверяем, что это реально парсящийся фид, а не мусорная ссылка —
    // лучше явная ошибка сразу при добавлении, чем молчаливо пустая категория
    const test = await fetchRssFeed(value, value);
    if (!test.length) throw new Error('По этой ссылке не нашлось ни одной новости — проверь, что это прямая ссылка на RSS/Atom-фид');
    payload = { id: `src-${Date.now()}`, type: 'rss', value, label: new URL(value).hostname };
  }
  const { error } = await supabase.rpc('rpc_admin_add_news_source', {
    p_id: payload.id, p_category_id: categoryId, p_type: payload.type, p_value: payload.value, p_label: payload.label,
  });
  if (error) throw new Error(friendlyOnlineError(error));
  return loadNewsCategories();
});

ipcMain.handle('news:removeSource', async (_e, { sourceId }) => {
  const { error } = await supabase.rpc('rpc_admin_remove_news_source', { p_id: sourceId });
  if (error) throw new Error(friendlyOnlineError(error));
  return loadNewsCategories();
});

ipcMain.handle('news:fetchCategory', async (_e, categoryId) => {
  const categories = await loadNewsCategories();
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return [];
  const results = await Promise.allSettled(
    cat.sources.map((s) => (s.type === 'youtube' ? fetchYoutubeChannelFeed(s.channelId) : fetchRssFeed(s.url, s.label)))
  );
  let items = [];
  // раньше был общий срез items.slice(0, 60) — именно он и "съедал" редко
  // постящие каналы, как только категория разрасталась: сортировка была по
  // дате, и топ-60 разом занимали несколько самых активных каналов, а более
  // тихие источники вообще не попадали в выдачу, хотя реально были в фиде.
  // Теперь лимит — per-источник (у YouTube-RSS он и так максимум 15 видео
  // на канал — это ограничение самого YouTube, не наше, тут ничего не
  // подкрутить без официального Data API с ключом), а сверху — общий
  // потолок с большим запасом просто на случай экзотического RSS с тысячами
  // записей, чтобы не переводить и не грузить их все разом
  const PER_SOURCE_LIMIT = 40;
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const sorted = r.value.slice().sort((a, b) => b.publishedAt - a.publishedAt);
    items.push(...sorted.slice(0, PER_SOURCE_LIMIT));
  }
  items.sort((a, b) => b.publishedAt - a.publishedAt);
  items = items.slice(0, 150); // выше — дольше грузится: каждая новость это ещё и отдельный запрос на перевод
  // переводим параллельно, но не безлимитно — не хотим 60 одновременных
  // запросов к переводчику разом
  const CONCURRENCY = 6;
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (item) => {
      item.titleRu = await translateToRu(item.title);
      if (item.description) item.descriptionRu = await translateToRu(item.description);
    }));
  }
  return items;
});

// ---------- IPC: профиль (локально: имя, аватар, "о себе") ----------
// Живёт только на диске пользователя. Настоящие друзья/чат — отдельный блок
// ниже ("ОНЛАЙН"), через Supabase.

ipcMain.handle('profile:load', () => loadProfile());
ipcMain.handle('profile:save', (_e, partial) => saveProfile(partial || {}));

// Раньше сюда просто копировался исходный файл как есть, любого размера и
// пропорций — а дальше каждое место, где показывается аватар (большой в
// профиле, крошечный кружок в боковой панели друзей, в чате...) само вырезало
// центр через object-fit: cover. Для не-квадратных фото (и вообще фото с
// высоким разрешением) в маленьких кружках это давало разный, часто "неполный"
// результат — видно было только случайный центральный кусок картинки.
// Теперь: диалог выбора файла остаётся здесь (Electron), но сам кроп в квадрат
// делает рендерер через <canvas> (там это на порядок проще и виднее
// пользователю, что именно будет видно) — а сюда, в profile:saveCroppedAvatar,
// присылается уже готовый квадратный PNG. Так все размеры показа получают
// один и тот же, заранее выбранный кроп.
ipcMain.handle('profile:pickAvatar', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выбери аватар',
    filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const src = result.filePaths[0];
  const ext = (path.extname(src) || '.png').toLowerCase();
  const contentType = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' }[ext] || 'image/png';
  const bytes = await fs.readFile(src);
  return { dataUrl: `data:${contentType};base64,${bytes.toString('base64')}` };
});

ipcMain.handle('profile:saveCroppedAvatar', async (_e, dataUrl) => {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('Некорректные данные аватара.');
  const contentType = match[1];
  const bytes = Buffer.from(match[2], 'base64');
  const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' }[contentType] || '.png';

  await fs.mkdir(AVATAR_DIR(), { recursive: true });

  // подчищаем файл предыдущего аватара, если он был
  const current = await readProfileRaw();
  if (current.avatarFile) {
    await fs.rm(path.join(AVATAR_DIR(), current.avatarFile), { force: true }).catch(() => {});
  }

  const fileName = `avatar_${Date.now()}${ext}`;
  await fs.writeFile(path.join(AVATAR_DIR(), fileName), bytes);

  // Показываем этот же аватар друзьям — заливаем в публичный бакет Storage и
  // сохраняем ссылку в profiles.avatar_url. Если онлайн не готов или заливка
  // не удалась — не страшно, локальный аватар всё равно применится, просто
  // друзья пока не увидят обновление (см. rpc_set_avatar_url в supabase_schema.sql).
  if (onlineState.ready && onlineState.myId) {
    try {
      const storagePath = `${onlineState.myId}/avatar${ext}`;
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(storagePath, bytes, { contentType, upsert: true });
      if (uploadErr) {
        console.error('Не удалось залить аватар в Supabase Storage:', uploadErr.message);
      } else {
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(storagePath);
        // добавляем метку времени в URL — иначе у друзей, увидевших старую
        // картинку раньше, браузерный/файловый кэш может её не обновить
        const bustedUrl = `${pub.publicUrl}?t=${Date.now()}`;
        const { error: rpcErr } = await supabase.rpc('rpc_set_avatar_url', { p_url: bustedUrl });
        if (rpcErr) console.error('Не удалось сохранить ссылку на аватар:', rpcErr.message);
      }
    } catch (err) {
      console.error('Синхронизация аватара с онлайн-профилем не удалась:', err?.message || err);
    }
  }

  return saveProfile({ avatarFile: fileName });
});

// аватар группы — тот же bucket 'avatars', та же логика кропа на стороне
// renderer'а, но путь в Storage ОБЯЗАН начинаться с id текущего пользователя
// (см. RLS-политику "avatar own write" в supabase_schema.sql — она проверяет
// именно первый сегмент пути), поэтому кладём в подпапку своего id, а не
// группы напрямую
ipcMain.handle('group:saveCroppedAvatar', async (_e, { groupId, dataUrl }) => {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('Некорректные данные аватара.');
  if (!onlineState.ready || !onlineState.myId) throw new Error('Нужно быть в сети, чтобы поменять аватар группы.');
  const contentType = match[1];
  const bytes = Buffer.from(match[2], 'base64');
  const ext = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif' }[contentType] || '.png';

  const storagePath = `${onlineState.myId}/group_${groupId}${ext}`;
  const { error: uploadErr } = await supabase.storage.from('avatars').upload(storagePath, bytes, { contentType, upsert: true });
  if (uploadErr) throw new Error(`Не удалось загрузить: ${uploadErr.message}`);
  const { data: pub } = supabase.storage.from('avatars').getPublicUrl(storagePath);
  // метка времени — иначе у остальных участников, уже видевших старую
  // картинку, браузерный/файловый кэш может не подхватить новую
  const bustedUrl = `${pub.publicUrl}?t=${Date.now()}`;
  const { error: rpcErr } = await supabase.rpc('rpc_set_group_avatar', { p_group_id: groupId, p_avatar_url: bustedUrl });
  if (rpcErr) throw new Error(friendlyOnlineError(rpcErr));
  return bustedUrl;
});

// Баннер — премиум-фича, локальной копии не держим (в отличие от аватара он
// не нужен, пока не подключён онлайн-профиль): сразу заливаем в Storage и
// сохраняем ссылку через rpc_set_banner, которая сама проверит подписку.
ipcMain.handle('profile:pickBanner', async () => {
  if (!mainWindow) return null;
  if (!onlineState.ready) throw new Error('Сначала подключись к онлайн-профилю (раздел «Аккаунт»).');
  if (!onlineState.isPremium) throw new Error(friendlyOnlineError({ message: 'not_premium' }));

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выбери баннер профиля',
    filters: [{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
    properties: ['openFile'],
  });
  if (result.canceled || !result.filePaths[0]) return null;

  const src = result.filePaths[0];
  const ext = (path.extname(src) || '.jpg').toLowerCase();
  const bytes = await fs.readFile(src);
  const contentType = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[ext] || 'image/jpeg';
  const storagePath = `${onlineState.myId}/banner${ext}`;

  const { error: uploadErr } = await supabase.storage.from('banners').upload(storagePath, bytes, { contentType, upsert: true });
  if (uploadErr) throw new Error(`Не удалось залить баннер: ${uploadErr.message}`);

  const { data: pub } = supabase.storage.from('banners').getPublicUrl(storagePath);
  const bustedUrl = `${pub.publicUrl}?t=${Date.now()}`;
  const { error: rpcErr } = await supabase.rpc('rpc_set_banner', { p_url: bustedUrl });
  if (rpcErr) throw new Error(friendlyOnlineError(rpcErr));

  onlineState.bannerUrl = bustedUrl;
  return bustedUrl;
});

ipcMain.handle('profile:removeBanner', async () => {
  const { error } = await supabase.rpc('rpc_set_banner', { p_url: null });
  if (error) throw new Error(friendlyOnlineError(error));
  onlineState.bannerUrl = null;
  return true;
});

// ---------- IPC: MangaDex (публичный открытый API, без ключа) ----------
// Запросы идут отсюда (main), а не из окна — так проще держать CSP окна строгим
// и не открывать renderer прямой доступ в сеть.

async function mdFetch(url, attempt = 1) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`MangaDex вернул HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    // "fetch failed" / оборванный сокет — обычно кратковременный сетевой сбой,
    // а не реальная проблема на стороне MangaDex; один повтор почти всегда чинит
    if (attempt < 2) return mdFetch(url, attempt + 1);
    throw err;
  }
}

// У MangaDex "основной" title почти никогда не содержит ru — русский перевод
// названия обычно лежит в altTitles (список альтернативных названий на разных
// языках). Поэтому сначала ищем ru и там, и там, и только потом падаем на en.
function pickTitle(attrs) {
  const titleObj = attrs?.title || {};
  const altTitles = Array.isArray(attrs?.altTitles) ? attrs.altTitles : [];

  if (titleObj.ru) return titleObj.ru;
  const altRu = altTitles.find((t) => t && t.ru);
  if (altRu) return altRu.ru;

  if (titleObj.en) return titleObj.en;
  const altEn = altTitles.find((t) => t && t.en);
  if (altEn) return altEn.en;

  const firstOwn = Object.values(titleObj)[0];
  if (firstOwn) return firstOwn;
  const firstAlt = altTitles.find((t) => t && Object.values(t)[0]);
  if (firstAlt) return Object.values(firstAlt)[0];

  return 'Без названия';
}

// MangaDex хранит рейтинг отдельно от карточки тайтла — берём его одним
// батч-запросом на всю выдачу разом, а не по одному на тайтл
async function fetchRatings(ids) {
  if (!ids.length) return {};
  const params = new URLSearchParams();
  for (const id of ids) params.append('manga[]', id);
  try {
    const data = await mdFetch(`${MANGADEX_API}/statistics/manga?${params.toString()}`);
    const out = {};
    for (const [id, stat] of Object.entries(data.statistics || {})) {
      const avg = stat?.rating?.bayesian ?? stat?.rating?.average;
      if (typeof avg === 'number') out[id] = Math.round(avg * 10) / 10;
    }
    return out;
  } catch {
    return {};
  }
}

// на MangaDex у части тайтлов после самого синопсиса community-редакторы
// дописывают технический блок вида "---\n**Links:**\n- [Aniti on ANN](url)"
// (ссылки на другие каталоги) — это не часть описания, а метаданные их вики,
// отрезаем всё начиная с первого разделителя или самого "**Links**"
function cleanMangaDescription(text) {
  if (!text) return '';
  let cleaned = text.split(/\r?\n\s*-{3,}\s*\r?\n/)[0];
  cleaned = cleaned.split(/\*\*\s*links?\s*:?\s*\*\*/i)[0];
  return cleaned.trim();
}

async function mapMangaList(data) {
  const items = (data.data || []).map((m) => {
    const cover = (m.relationships || []).find((r) => r.type === 'cover_art');
    const fileName = cover?.attributes?.fileName;
    return {
      id: m.id,
      title: pickTitle(m.attributes),
      // раньше при отсутствии русского описания молча подставлялся английский —
      // получалась мешанина языков в каталоге. Теперь строго только русское;
      // если его нет вообще, лучше пустое поле, чем перевод не на том языке.
      description: cleanMangaDescription(m.attributes?.description?.ru).slice(0, 400),
      status: m.attributes?.status,
      coverUrl: fileName ? `${MANGADEX_UPLOADS}/covers/${m.id}/${fileName}.256.jpg` : null,
    };
  });
  const ratings = await fetchRatings(items.map((i) => i.id));
  for (const item of items) item.rating = ratings[item.id] ?? null;
  return items;
}

// ---------- Единый монитор живости RU-источников (ReManga/WaManga/MangaBuff) ----------
// Раньше у WaManga/MangaBuff был свой изолированный "предохранитель" (флаг
// downUntil + cooldown), взводился он только реактивно — когда реальный запрос
// пользователя падал, — а у ReManga такого предохранителя вообще не было (там
// не было даже таймаута, из-за чего зависший запрос мог тянуться бесконечно).
// Проблема реактивной схемы: первый запрос после падения сайта всё равно ждал
// полный таймаут+ретрай, и даже после того как сайт снова оживал, приложение
// узнавало об этом только на следующем реальном запросе пользователя (то есть
// снова полный таймаут+ретрай, ощущается как "опять тормозит"). Теперь — общий
// sourceHealth на все три источника + фоновый пинг раз в HEALTH_CHECK_INTERVAL_MS,
// который сам замечает восстановление и снимает пометку "лежит" в фоне, а не
// дожидаясь действий пользователя.
const HEALTH_COOLDOWN_MS = 5 * 60 * 1000; // сколько считаем источник лежащим после реального падения запроса
const HEALTH_CHECK_INTERVAL_MS = 60 * 1000; // как часто фоново пингуем именно лежащие источники
const HEALTH_FETCH_TIMEOUT_MS = 15000;

const sourceHealth = {
  remanga: { up: true, downUntil: 0 },
  wamanga: { up: true, downUntil: 0 },
  mangabuff: { up: true, downUntil: 0 },
  usagi: { up: true, downUntil: 0 },
};

function isSourceUp(key) {
  const h = sourceHealth[key];
  if (!h) return true;
  // если cooldown истёк сам по себе (а фоновый пинг ещё не успел на этом тике) —
  // даём шанс живому запросу пользователя, не заставляем ждать лишний тик монитора
  if (!h.up && Date.now() >= h.downUntil) return true;
  return h.up;
}

function markSourceDown(key) {
  const h = sourceHealth[key];
  if (!h) return;
  h.up = false;
  h.downUntil = Date.now() + HEALTH_COOLDOWN_MS;
}

function markSourceUp(key) {
  const h = sourceHealth[key];
  if (!h) return;
  h.up = true;
  h.downUntil = 0;
}

// лёгкие пинги для фонового монитора — не завязаны на конкретный тайтл
// пользователя, просто проверяют, что сайт вообще отвечает
const HEALTH_PING = {
  remanga: () => fetch(`${REMANGA_API}/search/?query=a&page=1&count=1&field=titles`, {
    signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': USER_AGENT, Referer: `${REMANGA_SITE}/` },
  }),
  wamanga: () => fetch(`${WAMANGA_API}/manga?limit=1&offset=0&query=a`, {
    signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': USER_AGENT, Referer: `${WAMANGA_SITE}/`, Accept: 'application/json' },
  }),
  mangabuff: () => fetch(MANGABUFF_SITE, {
    signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': USER_AGENT },
  }),
  usagi: () => fetch(`${USAGI_SITE}/search/suggestion?query=a&types%5B%5D=CREATION&types%5B%5D=FEDERATION_MANGA`, {
    signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': USER_AGENT, Referer: `${USAGI_SITE}/` },
  }),
};

// проверяем в фоне ТОЛЬКО тех, кто сейчас считается лежащим — источник, который
// и так работает, не дёргаем лишний раз впустую
function startHealthMonitor() {
  setInterval(async () => {
    for (const key of Object.keys(sourceHealth)) {
      if (sourceHealth[key].up) continue;
      try {
        const res = await HEALTH_PING[key]();
        if (res.ok) markSourceUp(key);
      } catch {
        // всё ещё лежит — оставляем как есть, попробуем на следующем тике
      }
    }
  }, HEALTH_CHECK_INTERVAL_MS);
}

// ---------- ReManga (неофициальный источник, см. константы вверху файла) ----------

async function rmFetch(url, attempt = 1) {
  if (!isSourceUp('remanga')) throw new Error('ReManga временно недоступна (сайт не отвечает, повторим попытку позже)');
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        Referer: `${REMANGA_SITE}/`,
        Origin: REMANGA_SITE,
        'Accept-Language': 'ru,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`ReManga вернул HTTP ${res.status}`);
    const json = await res.json();
    markSourceUp('remanga');
    return json;
  } catch (err) {
    if (attempt < 2) return rmFetch(url, attempt + 1);
    markSourceDown('remanga');
    throw new Error(`ReManga не отвечает (${err.message})`);
  }
}

// content/is_licensed у ReManga отдаётся числовым id статуса — сводим к тем же
// значениям, что уже использует карточка/фильтры для MangaDex
const REMANGA_STATUS_MAP = { 1: 'completed', 2: 'ongoing', 3: 'hiatus', 4: 'hiatus', 6: 'cancelled' };

function remangaCoverUrl(img) {
  const rel = img?.high || img?.mid || img?.low;
  if (!rel) return null;
  return rel.startsWith('http') ? rel : `${REMANGA_SITE}/${rel.replace(/^\//, '')}`;
}

// поиск / каталог отдают "плоские" карточки без описания и статуса — их
// достаточно для карточки и превью, полное описание подтягивается только
// при открытии карточки тайтла (см. remanga:details)
function mapRemangaListItem(raw) {
  const dir = raw.dir;
  return {
    id: `${REMANGA_PREFIX}${dir}`,
    title: raw.rus_name || raw.main_name || dir,
    coverUrl: remangaCoverUrl(raw.img),
    status: null,
    rating: null,
    description: '',
  };
}

function remangaSortChaptersAsc(items) {
  items.sort((a, b) => {
    const na = parseFloat(a.chapter);
    const nb = parseFloat(b.chapter);
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  });
  return items;
}

async function remangaSearch(query, { count = 30 } = {}) {
  if (!query.trim()) return { items: [], total: 0 };
  const params = new URLSearchParams({ query: query.trim(), page: '1', count: String(count), field: 'titles' });
  const data = await rmFetch(`${REMANGA_API}/search/?${params.toString()}`);
  const content = data.content || [];
  return { items: content.map(mapRemangaListItem), total: data.props?.total_titles ?? content.length };
}

async function remangaTitleDetails(dir) {
  const data = await rmFetch(`${REMANGA_API}/titles/${encodeURIComponent(dir)}/`);
  return data.content || null;
}

ipcMain.handle('remanga:details', async (_e, id) => {
  const dir = String(id || '').replace(REMANGA_PREFIX, '');
  const content = await remangaTitleDetails(dir);
  if (!content) return null;
  const description = String(content.description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const statusId = content.status?.id;
  return {
    id: `${REMANGA_PREFIX}${dir}`,
    title: content.rus_name || content.main_name || dir,
    coverUrl: remangaCoverUrl(content.img),
    description,
    status: REMANGA_STATUS_MAP[statusId] || null,
  };
});

// подтягивают описание задним числом для старых закладок/истории, сохранённых
// до того, как описание вообще стало частью library-записи (см. mapMangaList/
// mapWamangaListItem) — сам поиск/каталог всегда отдаёт его сразу, так что
// нового кода парсинга тут нет, только повторный вызов уже рабочего поиска
ipcMain.handle('mangadex:details', async (_e, id) => {
  try {
    const params = new URLSearchParams();
    params.append('includes[]', 'cover_art');
    const data = await mdFetch(`${MANGADEX_API}/manga/${id}?${params.toString()}`);
    return { description: cleanMangaDescription(data.data?.attributes?.description?.ru).slice(0, 400) };
  } catch {
    return null;
  }
});

// у части тайтлов на MangaDex русского описания нет вообще (см. mapMangaList) —
// вместо пустой карточки ищем тот же тайтл на русскоязычных источниках и берём
// описание оттуда. ReManga в поиске отдаёт описание пустым (см. mapRemangaListItem),
// поэтому для неё нужен отдельный шаг remangaTitleDetails; у WaManga описание
// уже приходит прямо в результатах поиска.
ipcMain.handle('manga:findRuDescription', async (_e, title) => {
  if (!title) return null;
  try {
    const rm = await findRemangaMatchForTitle(title);
    if (rm?.id) {
      const dir = rm.id.slice(REMANGA_PREFIX.length);
      const content = await remangaTitleDetails(dir);
      const description = String(content?.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (description) return { description };
    }
  } catch { /* пробуем следующий источник */ }
  try {
    const wa = await findWamangaMatchForTitle(title);
    if (wa?.description) return { description: wa.description };
  } catch { /* ни один источник не нашёлся — оставляем без описания */ }
  return null;
});

ipcMain.handle('wamanga:details', async (_e, title) => {
  try {
    const { items } = await waSearch(title, { limit: 5 });
    const match = pickBestTitleMatch(title, items, (it) => it.title);
    return match ? { description: match.description } : null;
  } catch {
    return null;
  }
});

async function remangaChapters(dir) {
  const content = await remangaTitleDetails(dir);
  const branches = content?.branches || [];
  if (!branches.length) return [];
  const branchId = branches[0].id;

  let all = [];
  for (let page = 1; page <= 30; page++) { // страховка от зацикливания, с запасом
    const params = new URLSearchParams({
      branch_id: String(branchId), ordering: '-index', page: String(page), count: '100', user_data: '1',
    });
    const data = await rmFetch(`${REMANGA_API}/titles/chapters/?${params.toString()}`);
    const batch = data.content || [];
    all = all.concat(batch.filter((c) => !c.is_paid));
    if (batch.length < 100) break;
  }

  const items = all.map((c) => ({
    id: `${REMANGA_PREFIX}${c.id}`,
    chapter: c.chapter,
    title: c.name || null,
    lang: 'ru',
  }));
  return remangaSortChaptersAsc(items);
}

async function remangaPages(chapterId) {
  const data = await rmFetch(`${REMANGA_API}/titles/chapters/${encodeURIComponent(chapterId)}/`);
  const content = data.content || {};
  const raw = content.pages || [];
  // pages у ReManga иногда приходит вложенным массивом (страница -> варианты) —
  // расплющиваем на один уровень и сортируем по id, как в рабочем примере расширения
  const flat = [];
  const flatten = (arr) => {
    for (const item of arr) {
      if (Array.isArray(item)) flatten(item);
      else flat.push(item);
    }
  };
  flatten(raw);
  flat.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

  // раньше при отсутствии p.link получался битый URL вида "https://remanga.org/"
  // (голый домен без картинки) — сайт такой "адрес" отдавал как обычную ошибку,
  // а в читалке это выглядело как "страница почернела, потом ошибка загрузки".
  // Теперь: пробуем несколько вероятных имён поля (у некоторых тайтлов/загрузок,
  // судя по всему, схема отличается от той, на которой был протестирован парсер),
  // а если ни одно не подошло — просто пропускаем такую страницу, а не подсовываем
  // читалке заведомо нерабочую ссылку.
  const urls = flat
    .map((p) => p.link || p.img || p.url || p.src)
    .filter((link) => typeof link === 'string' && link.length > 0)
    .map((link) => {
      if (link.startsWith('http')) return link;
      // protocol-relative ("//cdn.example.com/...") — раньше это тоже попадало
      // в ветку "не начинается с http" и приклеивалось к REMANGA_SITE, получая
      // битый двойной адрес вида "https://remanga.org//cdn.example.com/..."
      if (link.startsWith('//')) return `https:${link}`;
      return `${REMANGA_SITE}/${link.replace(/^\//, '')}`;
    });

  // всегда логируем итоговые адреса (не только когда список пуст) — раньше лог
  // срабатывал лишь при 0 картинок, а бывает и так, что ссылка найдена и вроде
  // валидна, но сама картинка всё равно не грузится в читалке (напр. если она
  // ведёт на CDN-домен, для которого не настроен нужный Referer/Origin) — тогда
  // без этого лога вообще не видно, на какой адрес и домен идёт запрос
  console.log(`[ReManga] pages chapterId=${chapterId}: найдено ${urls.length} картинок, первая = ${urls[0] || '(нет)'}`);

  if (!urls.length) {
    // либо глава платная/заблокирована (is_paid у ReManga иногда всплывает только
    // в детальном ответе про саму главу, не в общем списке глав тайтла), либо
    // структура pages в этом ответе отличается от всех перечисленных выше полей —
    // логируем сырой пример, чтобы можно было доразобрать по логу, если пришлют
    if (content.is_paid) {
      throw new Error('Глава платная на ReManga — страницы не выдаются без покупки');
    }
    console.error(
      '[ReManga] pages: не нашли ни одной картинки, chapterId=', chapterId,
      'пример элемента pages=', JSON.stringify(flat[0] || raw).slice(0, 500),
    );
  }
  return urls;
}

// ---------- WaManga (см. константы вверху файла) ----------

async function waFetch(url, attempt = 1) {
  if (!isSourceUp('wamanga')) throw new Error('WaManga временно недоступна (сайт не отвечает, повторим попытку позже)');
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        Referer: `${WAMANGA_SITE}/`,
        Origin: WAMANGA_SITE,
        Accept: 'application/json',
        'Accept-Language': 'ru,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`WaManga вернул HTTP ${res.status}`);
    const json = await res.json();
    markSourceUp('wamanga');
    return json;
  } catch (err) {
    if (attempt < 2) return waFetch(url, attempt + 1);
    markSourceDown('wamanga');
    throw new Error(`WaManga не отвечает (${err.message})`);
  }
}

async function waFetchHtml(url, attempt = 1) {
  if (!isSourceUp('wamanga')) throw new Error('WaManga временно недоступна (сайт не отвечает, повторим попытку позже)');
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        Referer: `${WAMANGA_SITE}/`,
        'Accept-Language': 'ru,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`WaManga вернул HTTP ${res.status}`);
    const html = await res.text();
    markSourceUp('wamanga');
    return html;
  } catch (err) {
    if (attempt < 2) return waFetchHtml(url, attempt + 1);
    markSourceDown('wamanga');
    throw new Error(`WaManga не отвечает (${err.message})`);
  }
}

// statusTitle у WaManga уже приходит человекочитаемой строкой и почти совпадает
// с нашим словарём статусов — но на всякий случай сводим явным списком
const WAMANGA_STATUS_MAP = {
  ongoing: 'ongoing', announcement: 'ongoing', continuing: 'ongoing',
  completed: 'completed', finished: 'completed',
  hiatus: 'hiatus', paused: 'hiatus',
  cancelled: 'cancelled', canceled: 'cancelled', dropped: 'cancelled',
};

function wamangaUrl(type, slug) {
  return `${WAMANGA_SITE}/${type}/${slug}`;
}

// поиск отдаёт достаточно полную карточку (описание/жанры/статус уже есть),
// в отличие от ReManga тут не нужен отдельный шаг wamanga:details для описания
function mapWamangaListItem(raw) {
  const type = raw.type || 'manga';
  const slug = raw.slug;
  return {
    id: `${WAMANGA_PREFIX}${type}:${slug}`,
    title: raw.title || raw.titleEnglish || slug,
    coverUrl: raw.coverUrl ? `${WAMANGA_SITE}${raw.coverUrl}` : null,
    status: WAMANGA_STATUS_MAP[raw.statusTitle] || null,
    rating: null,
    description: String(raw.description || '').trim(),
  };
}

async function waSearch(query, { limit = 20 } = {}) {
  if (!query.trim()) return { items: [], total: 0 };
  const params = new URLSearchParams({ limit: String(limit), offset: '0', query: query.trim() });
  const data = await waFetch(`${WAMANGA_API}/manga?${params.toString()}`);
  const list = Array.isArray(data) ? data : (data.items || data.data || []);
  return { items: list.map(mapWamangaListItem), total: list.length };
}

// разбираем id вида wa:<type>:<slug> на составляющие
function parseWamangaId(id) {
  const rest = String(id || '').slice(WAMANGA_PREFIX.length);
  const idx = rest.indexOf(':');
  return { type: rest.slice(0, idx), slug: rest.slice(idx + 1) };
}

// главы на странице тайтла лежат прямо в HTML как обычные ссылки вида
// /<type>/<slug>/glava-N (в порядке убывания — новые сверху), забираем их
// регэкспом и сортируем по возрастанию сами, как и остальные источники
function parseWamangaChapters(html, type, slug) {
  // номер главы берём прямо из адреса (glava-354, glava-346.5) — так надёжнее,
  // чем парсить текст ссылки, который может быть обёрнут в произвольные теги
  const re = new RegExp(`href="[^"]*/${type}/${slug}/(glava-([\\d.]+))"`, 'gi');
  const seen = new Map();
  let m;
  while ((m = re.exec(html))) {
    if (!seen.has(m[1])) seen.set(m[1], m[2]);
  }
  const items = Array.from(seen.entries()).map(([chapterSlug, num]) => ({
    id: `${WAMANGA_PREFIX}${type}:${slug}:${chapterSlug}`,
    chapter: num,
    title: null,
    lang: 'ru',
  }));
  return remangaSortChaptersAsc(items); // сортировка чисто числовая, функция общая
}

async function waChapters(type, slug) {
  const html = await waFetchHtml(wamangaUrl(type, slug));
  return parseWamangaChapters(html, type, slug);
}

// страницы главы — обычные <img>, подписанные "страница N" в alt — сортируем
// по этому номеру, а не по порядку в html, на случай если разметка когда-то
// перемешается местами (лениво подгружаемые картинки и т.п.)
function parseWamangaPages(html) {
  const re = /<img[^>]+src="([^"]+\/app\/uploads\/[^"]+\.(?:webp|jpe?g|png))"[^>]*alt="[^"]*страниц[аы]\s+(\d+)/gi;
  const found = [];
  let m;
  while ((m = re.exec(html))) {
    found.push({ url: m[1].startsWith('http') ? m[1] : `${WAMANGA_SITE}${m[1]}`, page: parseInt(m[2], 10) });
  }
  found.sort((a, b) => a.page - b.page);
  return found.map((p) => p.url);
}

async function waPages(type, slug, chapterSlug) {
  const html = await waFetchHtml(`${wamangaUrl(type, slug)}/${chapterSlug}`);
  return parseWamangaPages(html);
}

// поиск на WaManga тайтла, соответствующего названию с MangaDex/другого источника
// (тот же API, что и обычный поиск, просто используем его для матчинга по имени)
async function findWamangaMatchForTitle(title) {
  if (!title) return null;
  try {
    const { items } = await waSearch(title, { limit: 10 });
    return pickBestTitleMatch(title, items, (it) => it.title);
  } catch {
    return null;
  }
}

// ---------- MangaBuff (см. константы вверху файла) ----------

async function mbFetchHtml(url, attempt = 1) {
  if (!isSourceUp('mangabuff')) throw new Error('MangaBuff временно недоступна (сайт не отвечает, повторим попытку позже)');
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        Referer: `${MANGABUFF_SITE}/`,
        Origin: MANGABUFF_SITE,
        'Accept-Language': 'ru,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`MangaBuff вернул HTTP ${res.status}`);
    const html = await res.text();
    markSourceUp('mangabuff');
    return html;
  } catch (err) {
    if (attempt < 2) return mbFetchHtml(url, attempt + 1);
    markSourceDown('mangabuff');
    throw new Error(`MangaBuff не отвечает (${err.message})`);
  }
}

async function mbFetchJson(url, attempt = 1) {
  if (!isSourceUp('mangabuff')) throw new Error('MangaBuff временно недоступна (сайт не отвечает, повторим попытку позже)');
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        Referer: `${MANGABUFF_SITE}/`,
        Origin: MANGABUFF_SITE,
        Accept: 'application/json',
        'Accept-Language': 'ru,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`MangaBuff вернул HTTP ${res.status}`);
    const json = await res.json();
    markSourceUp('mangabuff');
    return json;
  } catch (err) {
    if (attempt < 2) return mbFetchJson(url, attempt + 1);
    markSourceDown('mangabuff');
    throw new Error(`MangaBuff не отвечает (${err.message})`);
  }
}

function mbUrl(slug) {
  return `${MANGABUFF_SITE}/manga/${slug}`;
}

// ВАЖНО: точная форма JSON, который отдаёт /search/suggestions, пока не
// подтверждена (нужен реальный ответ из devtools) — сайт группирует поиск по
// вкладкам "Тайтлы/Пользователи/Карточки/..." на фронте, поэтому пробуем все
// правдоподобные варианты ключа с тайтлами и, если названия/обложки после
// первого теста окажутся пустыми, поправим маппинг полей ниже.
function mapMbListItem(raw) {
  const slug = raw.slug || raw.url_slug
    || (typeof raw.url === 'string' ? raw.url.match(/\/manga\/([^/?#]+)/)?.[1] : null)
    || (typeof raw.href === 'string' ? raw.href.match(/\/manga\/([^/?#]+)/)?.[1] : null);
  const poster = raw.poster || raw.image || raw.cover || raw.thumbnail || raw.img;
  const posterUrl = typeof poster === 'string'
    ? (poster.startsWith('http') ? poster : `${MANGABUFF_SITE}${poster.startsWith('/') ? '' : '/'}${poster}`)
    : null;
  return {
    id: `${MANGABUFF_PREFIX}${slug}`,
    title: raw.rus_name || raw.name || raw.title || slug,
    coverUrl: posterUrl,
    status: null,
    rating: null,
    description: '',
  };
}

async function mbSearch(query, { limit = 20 } = {}) {
  if (!query.trim()) return { items: [], total: 0 };
  const params = new URLSearchParams({ q: query.trim() });
  const data = await mbFetchJson(`${MANGABUFF_SITE}/search/suggestions?${params.toString()}`);
  const list = Array.isArray(data) ? data
    : (data.manga || data.titles || data.items || data.data || data.results || []);
  const items = list.filter((raw) => (raw.slug || raw.url || raw.href)).map(mapMbListItem).slice(0, limit);
  return { items, total: items.length };
}

// главы берутся не из отдельного API, а прямо со страницы тайтла — там уже
// лежит полный (или почти полный — очень длинные тайтлы могут догружать
// старые главы кнопкой "Загрузить ещё", это регэксп не поймает) список ссылок
// вида /manga/<slug>/<том>/<глава>
function parseMbChapters(html, slug) {
  const re = new RegExp(`/manga/${slug}/(\\d+)/([\\d.]+)"`, 'g');
  const seen = new Map();
  let m;
  while ((m = re.exec(html))) {
    const key = `${m[1]}/${m[2]}`;
    if (!seen.has(key)) seen.set(key, { vol: m[1], chapter: m[2] });
  }
  const items = Array.from(seen.values()).map(({ vol, chapter }) => ({
    id: `${MANGABUFF_PREFIX}${slug}:${vol}:${chapter}`,
    chapter,
    title: null,
    lang: 'ru',
  }));
  return remangaSortChaptersAsc(items); // сортировка чисто числовая, функция общая
}

async function mbChapters(slug) {
  const html = await mbFetchHtml(mbUrl(slug));
  return parseMbChapters(html, slug);
}

// картинки страниц лежат прямо в HTML главы, как обычные <img src="...">
// (первые несколько страниц) или <img data-src="..."> (остальные — вставляются
// в DOM виртуальным скроллом читалки, но URL уже присутствует в исходном HTML)
function parseMbPages(html) {
  const re = /<img\s+(?:data-)?src="([^"]+\/chapters\/[^"]+\.(?:jpe?g|png|webp)[^"]*)"[^>]*alt="[^"]*страниц\S*\s+(\d+)"/gi;
  const found = [];
  let m;
  while ((m = re.exec(html))) {
    found.push({ url: m[1], page: parseInt(m[2], 10) });
  }
  found.sort((a, b) => a.page - b.page);
  return found.map((p) => p.url);
}

async function mbPages(slug, vol, chapter) {
  const html = await mbFetchHtml(`${mbUrl(slug)}/${vol}/${chapter}`);
  const pages = parseMbPages(html);
  if (!pages.length) {
    // регэксп в parseMbPages рассчитан на конкретный формат (alt="страница N"
    // рядом с src/data-src, ссылка обязательно содержит "/chapters/") — если у
    // этого тайтла разметка страницы главы отличается (другой порядок атрибутов,
    // без слова "страниц" в alt, или картинки подгружаются не через обычный <img>),
    // здесь молча получается 0 совпадений. Логируем кусок HTML вокруг первого
    // вхождения "/chapters/", чтобы можно было разобрать реальную разметку.
    const idx = html.indexOf('/chapters/');
    console.error(
      `[MangaBuff] pages: 0 картинок, slug=${slug} vol=${vol} chapter=${chapter}.`,
      idx === -1 ? 'в HTML вообще нет "/chapters/"' : `фрагмент вокруг первого вхождения: ${html.slice(Math.max(0, idx - 200), idx + 300)}`,
    );
  } else {
    console.log(`[MangaBuff] pages slug=${slug} ${vol}/${chapter}: найдено ${pages.length} картинок, первая = ${pages[0]}`);
  }
  return pages;
}

async function findMangabuffMatchForTitle(title) {
  if (!title) return null;
  try {
    const { items } = await mbSearch(title, { limit: 10 });
    return pickBestTitleMatch(title, items, (it) => it.title);
  } catch {
    return null;
  }
}

// ---------- Usagi (см. константы USAGI_SITE/USAGI_PREFIX вверху файла) ----------

async function ugFetchHtml(url, attempt = 1) {
  if (!isSourceUp('usagi')) throw new Error('Usagi временно недоступна (сайт не отвечает, повторим попытку позже)');
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        Referer: `${USAGI_SITE}/`,
        'Accept-Language': 'ru,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`Usagi вернул HTTP ${res.status}`);
    const html = await res.text();
    markSourceUp('usagi');
    return html;
  } catch (err) {
    if (attempt < 2) return ugFetchHtml(url, attempt + 1);
    markSourceDown('usagi');
    throw new Error(`Usagi не отвечает (${err.message})`);
  }
}

async function ugFetchJson(url, attempt = 1) {
  if (!isSourceUp('usagi')) throw new Error('Usagi временно недоступна (сайт не отвечает, повторим попытку позже)');
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': USER_AGENT,
        Referer: `${USAGI_SITE}/`,
        Accept: 'application/json',
        'Accept-Language': 'ru,en;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`Usagi вернул HTTP ${res.status}`);
    const json = await res.json();
    markSourceUp('usagi');
    return json;
  } catch (err) {
    if (attempt < 2) return ugFetchJson(url, attempt + 1);
    markSourceDown('usagi');
    throw new Error(`Usagi не отвечает (${err.message})`);
  }
}

function mapUgListItem(raw) {
  const slug = (raw.link || '').replace(/^\//, '');
  return {
    id: `${USAGI_PREFIX}${slug}`,
    title: raw.value || raw.names?.[0] || slug,
    coverUrl: raw.thumbnail || null,
    status: null,
    rating: raw.score || null,
    description: '',
  };
}

async function ugSearch(query, { limit = 20 } = {}) {
  if (!query.trim()) return { items: [], total: 0 };
  const params = new URLSearchParams({ query: query.trim() });
  params.append('types[]', 'CREATION');
  params.append('types[]', 'FEDERATION_MANGA');
  const data = await ugFetchJson(`${USAGI_SITE}/search/suggestion?${params.toString()}`);
  // elementId.type у "Манга"/"Комикс"/"Манхва" и т.п. всегда "MANGA" в общей
  // федерации типов сайта — это и есть нужный нам фильтр, а не typeName
  const items = (data.suggestions || [])
    .filter((s) => s.elementId?.type === 'MANGA' && s.link)
    .map(mapUgListItem)
    .slice(0, limit);
  return { items, total: items.length };
}

// список глав лежит прямо в HTML тайтла — строки вида
// <tr class="item-row" data-id="..." data-vol="N" data-num="M"> с
// <a href="/slug/volN/глава" class="chapter-link">; data-num — номер главы,
// умноженный на 10 (поддерживает дробные вроде 20.5 → 205)
function parseUgChapters(html) {
  const rowRe = /<tr class="item-row" data-id="(\d+)" data-vol="(\d+)" data-num="(\d+)">([\s\S]*?)<\/tr>/g;
  const items = [];
  let m;
  while ((m = rowRe.exec(html))) {
    const [, , , num, block] = m;
    const linkMatch = block.match(/<a href="([^"]+)"[^>]*class="chapter-link/);
    if (!linkMatch) continue;
    items.push({
      id: `${USAGI_PREFIX}${linkMatch[1]}`, // linkMatch[1] уже вида "/slug/volN/глава"
      chapter: String(Number(num) / 10),
      title: null,
      lang: 'ru',
    });
  }
  return remangaSortChaptersAsc(items); // сортировка чисто числовая, функция общая
}

async function ugChapters(slug) {
  const html = await ugFetchHtml(`${USAGI_SITE}/${slug}`);
  const items = parseUgChapters(html);
  if (!items.length) {
    console.error(`[Usagi] chapters: 0 глав распознано для slug=${slug} — возможно, разметка строки главы отличается`);
  }
  return items;
}

// картинки страниц лежат прямо в HTML главы, в вызове rm_h.readerInit(...) —
// массив вида [['https://p15.rmr.rocks/','',"auto/.../000.png?t=...&h=...",900,1300,''], ...]
function parseUgPages(html) {
  const re = /\[\s*'([^']*)'\s*,\s*'[^']*'\s*,\s*"([^"]+)"/g;
  const urls = [];
  let m;
  while ((m = re.exec(html))) {
    urls.push(`${m[1]}${m[2]}`);
  }
  return urls;
}

async function ugPages(href) {
  const html = await ugFetchHtml(`${USAGI_SITE}${href}`);
  const pages = parseUgPages(html);
  if (!pages.length) {
    console.error(`[Usagi] pages: не нашли ни одной картинки в rm_h.readerInit, href=${href}`);
  } else {
    console.log(`[Usagi] pages ${href}: найдено ${pages.length} картинок, первая = ${pages[0]}`);
  }
  return pages;
}

async function findUsagiMatchForTitle(title) {
  if (!title) return null;
  try {
    const { items } = await ugSearch(title, { limit: 10 });
    return pickBestTitleMatch(title, items, (it) => it.title);
  } catch {
    return null;
  }
}

// ---------- AniLibria (аниме) ----------
// В отличие от манга-источников это не пиратский агрегатор, а команда
// озвучки/перевода со своим официальным открытым API, специально сделанным
// для сторонних приложений — поэтому тут всё честно: без Cloudflare, без
// рекламных прокладок, видео отдаётся напрямую с их CDN обычным HLS (.m3u8).
// Максимальное качество — 1080p, настоящего 4K в фансаб-сцене по сути не
// существует, это не наше ограничение, а их.
//
// ВАЖНО: старый v3 (api.anilibria.tv/v3) полностью отключён (HTTP 410).
// Актуальный — v1 на api.anilibria.app, схема подтверждена вручную через
// прямые запросы (не документация — Swagger-страница рендерится JS и не
// отдаёт статических путей):
//   GET /anime/catalog/releases?limit=&page=          — каталог/пагинация
//   GET /anime/catalog/releases?f[search]=<query>      — поиск (это Laravel-
//                                                        стиль фильтров, не
//                                                        обычный "search=")
//   GET /anime/releases/{numeric id}                   — тайтл + episodes[]
// Ответ везде обёрнут в {data: [...], meta: {...}} (Laravel-пагинация).
const ANILIBRIA_API = 'https://api.anilibria.app/api/v1';
const ANILIBRIA_SITE = 'https://anilibria.top';
const ANILIBRIA_PREFIX = 'al:';

async function aniFetch(url, attempt = 1) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`AniLibria вернул HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (attempt < 2) return aniFetch(url, attempt + 1);
    throw new Error(`AniLibria не отвечает (${err.message})`);
  }
}

function aniPosterUrl(poster) {
  const rel = poster?.optimized?.src || poster?.src;
  if (!rel) return null;
  return rel.startsWith('http') ? rel : `${ANILIBRIA_SITE}${rel}`;
}

function mapAniListItem(raw) {
  return {
    id: `${ANILIBRIA_PREFIX}${raw.id}`,
    title: raw.name?.main || raw.name?.english || raw.alias,
    coverUrl: aniPosterUrl(raw.poster),
    // is_ongoing — единственный статус-флаг, который реально отдаёт API;
    // более тонкой градации (завершён/заброшен/анонс) тут нет
    status: raw.is_ongoing ? 'ongoing' : 'completed',
    rating: null,
    description: String(raw.description || '').trim(),
  };
}

// f[search] — единственный параметр, который я реально проверил вручную через
// прямые запросы. f[genres]/f[type]/f[is_ongoing] — та же скобочная схема по
// аналогии; не проверено настолько же строго, но не ломает запрос, если имя
// параметра не то — Laravel просто тихо игнорирует незнакомый фильтр вместо
// ошибки (мы это уже видели на "search="/"query=" — они не 404/500, а no-op).
async function aniSearch({ query = '', limit = 24, page = 1, genreIds = [], type = '', isOngoing = null } = {}) {
  const params = new URLSearchParams({ limit: String(limit), page: String(page) });
  if (query.trim()) params.set('f[search]', query.trim());
  if (type) params.append('f[types][]', type);
  if (isOngoing !== null) params.set('f[publish_statuses]', isOngoing ? 'IS_ONGOING' : 'IS_NOT_ONGOING');
  for (const id of genreIds) params.append('f[genres][]', String(id));
  const data = await aniFetch(`${ANILIBRIA_API}/anime/catalog/releases?${params.toString()}`);
  const list = data.data || [];
  return { items: list.map(mapAniListItem), total: data.meta?.pagination?.total ?? list.length };
}

// "Новинки" — просто каталог без фильтра поиска (он у AniLibria и так
// приходит отсортированным по свежести/активности релизов)
async function aniPopular({ limit = 24 } = {}) {
  return aniSearch({ limit });
}

// "Популярное за всё время" — честная версия. У каталога нет параметра
// сортировки по популярности (проверяли), зато нашли в сырых данных релиза
// реальное поле added_in_users_favorites — сколько раз тайтл добавили в
// избранное. Раз сервер сам не сортирует по нему, тянем несколько страниц
// каталога (в параллель) и сортируем на своей стороне. Это не идеально
// покрывает вообще весь каталог AniLibria (тянуть тысячи релизов ради
// одного списка на 24 карточки — слишком дорого), но для реально известных
// популярных тайтлов этого с большим запасом достаточно: у них огромные
// цифры в favorites, и они почти гарантированно попадут хотя бы на одну из
// первых нескольких сотен позиций каталога.
async function aniPopularReal({ limit = 24, pages = 10, pageSize = 24 } = {}) {
  const requests = Array.from({ length: pages }, (_, i) =>
    aniFetch(`${ANILIBRIA_API}/anime/catalog/releases?${new URLSearchParams({ limit: String(pageSize), page: String(i + 1) }).toString()}`)
      .catch((err) => {
        // раньше ошибка тут тихо проглатывалась (просто {data:[]}) — если
        // отваливались ВСЕ страницы разом, результат пустой без единой строки
        // в логе, и понять причину было невозможно
        console.error(`[aniPopularReal] страница ${i + 1} не загрузилась:`, err?.message || err);
        return { data: [] };
      })
  );
  const results = await Promise.all(requests);
  const seen = new Map();
  for (const r of results) {
    for (const raw of (r.data || [])) seen.set(raw.id, raw);
  }
  console.log(`[aniPopularReal] всего собрано релизов: ${seen.size}`);
  const sorted = Array.from(seen.values())
    .sort((a, b) => (b.added_in_users_favorites || 0) - (a.added_in_users_favorites || 0))
    .slice(0, limit);
  return { items: sorted.map(mapAniListItem), total: sorted.length };
}

// список серий приходит прямо внутри объекта релиза (episodes[]) — отдельный
// запрос "серии по тайтлу" не нужен, как и раньше
async function aniEpisodes(aniId) {
  const data = await aniFetch(`${ANILIBRIA_API}/anime/releases/${encodeURIComponent(aniId)}`);
  const episodes = data.episodes || [];
  return episodes
    .slice()
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    .map((ep) => {
      // ссылки уже абсолютные (cache-*.libria.fun/...), просто отдаём как есть
      const qualities = [
        ep.hls_1080 && { label: '1080p', url: ep.hls_1080 },
        ep.hls_720 && { label: '720p', url: ep.hls_720 },
        ep.hls_480 && { label: '480p', url: ep.hls_480 },
      ].filter(Boolean);
      return {
        id: `${ANILIBRIA_PREFIX}${data.id}:${ep.id}`,
        chapter: String(ep.ordinal ?? '?'),
        title: ep.name || null,
        lang: 'ru',
        qualities,
      };
    });
}

ipcMain.handle('anilibria:search', async (_e, payload) => {
  const opts = typeof payload === 'string' ? { query: payload } : (payload || {});
  try {
    return await aniSearch(opts);
  } catch (err) {
    console.error('AniLibria поиск не удался:', err?.message || err);
    return { items: [], total: 0 };
  }
});

ipcMain.handle('anilibria:popular', async () => {
  try {
    return await aniPopular();
  } catch (err) {
    console.error('AniLibria не удалось получить каталог:', err?.message || err);
    return { items: [], total: 0 };
  }
});

// отдельный канал именно для честной популярности (added_in_users_favorites) —
// anilibria:popular выше используется и для "Новинки аниме" на Главной, там
// сортировка по свежести должна остаться как есть, менять его смысл нельзя
ipcMain.handle('anilibria:popularReal', async () => {
  try {
    return await aniPopularReal();
  } catch (err) {
    console.error('AniLibria не удалось получить реальную популярность:', err?.message || err);
    return { items: [], total: 0 };
  }
});

ipcMain.handle('anilibria:episodes', async (_e, animeId) => {
  const aniId = animeId.startsWith(ANILIBRIA_PREFIX) ? animeId.slice(ANILIBRIA_PREFIX.length) : animeId;
  return aniEpisodes(aniId);
});

// подтягивает описание задним числом для старых аниме-закладок, сохранённых
// до того, как описание стало частью library-записи
ipcMain.handle('anilibria:details', async (_e, animeId) => {
  try {
    const aniId = animeId.startsWith(ANILIBRIA_PREFIX) ? animeId.slice(ANILIBRIA_PREFIX.length) : animeId;
    const data = await aniFetch(`${ANILIBRIA_API}/anime/releases/${encodeURIComponent(aniId)}`);
    return { description: String(data.description || '').trim() };
  } catch {
    return null;
  }
});

// ---------- AnimeOn (несколько зеркал: .cc/.fun) — второй источник аниме.
// Своё видео на своём CDN (cloud.solodcdn.com) — в отличие от YummyAnime,
// тут не нужен webview: ссылка на серию хоть изначально и ведёт на Kodik, но
// у AnimeOn есть свой бэкенд /api/stream/resolve, который сам её
// расшифровывает и отдаёт чистый .m3u8 — проигрывается прямо в нашем
// собственном плеере, как и AniLibria. Ни подписей запросов, ни anti-bot
// защиты на API нет (в отличие от проверенного и отклонённого yamianime.com).
//
// Домен периодически меняется/падает (проект уже переезжал с .fun на .cc,
// бэкенд/API при этом остался тот же — проверено вручную: /api/search и
// /api/stream/resolve отвечают идентично на обоих). Пробуем зеркала по
// очереди, запоминаем, какое сейчас живое, и НЕ показываем оба одновременно —
// если активное упадёт, следующий запрос сам пере-проверит все зеркала и
// переключится на первое живое (тот же принцип, что у sourceHealth для
// манга-источников, но применён внутри одного логического источника).
const ANIMEON_MIRRORS = ['animeon.cc', 'animeon.fun'];
let animeonActiveMirror = null;
let animeonMirrorCheckedAt = 0;
const ANIMEON_MIRROR_RECHECK_MS = 5 * 60 * 1000;

async function pingAnimeonMirror(domain) {
  const res = await fetch(`https://${domain}/api/search?q=a&limit=1`, {
    signal: AbortSignal.timeout(HEALTH_FETCH_TIMEOUT_MS),
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return true;
}

async function resolveAnimeonMirror() {
  const now = Date.now();
  // уже знаем рабочее зеркало и недавно проверяли — не дёргаем сеть заново
  // на каждый чих, доверяем результату ещё ANIMEON_MIRROR_RECHECK_MS
  if (animeonActiveMirror && now - animeonMirrorCheckedAt < ANIMEON_MIRROR_RECHECK_MS) {
    return animeonActiveMirror;
  }
  // сначала пробуем уже известное активное зеркало (не теряем его без
  // причины), остальные — по порядку из ANIMEON_MIRRORS
  const order = animeonActiveMirror
    ? [animeonActiveMirror, ...ANIMEON_MIRRORS.filter((m) => m !== animeonActiveMirror)]
    : ANIMEON_MIRRORS;
  for (const domain of order) {
    try {
      await pingAnimeonMirror(domain);
      animeonActiveMirror = domain;
      animeonMirrorCheckedAt = now;
      return domain;
    } catch { /* пробуем следующее зеркало */ }
  }
  throw new Error('AnimeOn недоступен ни на одном известном зеркале');
}

async function aoFetch(path, options = {}, attempt = 1) {
  const domain = await resolveAnimeonMirror();
  try {
    const res = await fetch(`https://${domain}/api${path}`, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/json', 'User-Agent': USER_AGENT, ...(options.headers || {}) },
      ...options,
    });
    if (!res.ok) throw new Error(`AnimeOn вернул HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (attempt < 2) {
      // возможно, именно активное зеркало легло между проверками — сбрасываем
      // кэш живости, чтобы следующая попытка пере-проверила все зеркала заново
      animeonMirrorCheckedAt = 0;
      return aoFetch(path, options, attempt + 1);
    }
    throw new Error(`AnimeOn не отвечает (${err.message})`);
  }
}

function aoAbsoluteUrl(u) {
  if (!u) return null;
  if (u.startsWith('http')) return u;
  if (u.startsWith('//')) return `https:${u}`;
  return `https://${animeonActiveMirror || ANIMEON_MIRRORS[0]}${u}`;
}

// translations{studio}.episodes{"1":{link,screenshots,skipbuttons}} → плоская
// структура "студия → отсортированный список серий", как у RU-манга-источников
function groupAoTranslations(full) {
  const translations = full.translations || {};
  return Object.entries(translations)
    .filter(([, t]) => t && t.episodes && Object.keys(t.episodes).length)
    .map(([studio, t]) => {
      const episodes = Object.entries(t.episodes)
        .map(([number, ep]) => ({ number, link: ep.link }))
        .sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
      return { studio, episodes };
    });
}

async function aoFindForTitle(title) {
  const search = await aoFetch(`/search?q=${encodeURIComponent(title)}&limit=20`);
  const match = pickBestTitleMatch(title, search.results || [], (m) => m.title);
  if (!match) return null;
  const full = await aoFetch(`/anime/${encodeURIComponent(match.anime_url)}`);
  const translations = groupAoTranslations(full);
  if (!translations.length) return null;
  return { title: full.title || match.title, translations };
}

ipcMain.handle('animeon:findForTitle', async (_e, title) => {
  try {
    return await aoFindForTitle(title);
  } catch (err) {
    console.error('AnimeOn: не удалось найти тайтл', title, err?.message || err);
    return null;
  }
});

ipcMain.handle('animeon:resolve', async (_e, link) => {
  try {
    const data = await aoFetch('/stream/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ link, fresh: false }),
    });
    const links = data.links || {};
    const order = ['1080', '720', '480', '360'];
    const qualities = order
      .filter((q) => links[q]?.Src)
      .map((q) => ({ label: `${q}p`, url: aoAbsoluteUrl(links[q].Src) }));
    if (!qualities.length) {
      // на случай нестандартных ключей качества — берём любое, что нашлось
      for (const v of Object.values(links)) {
        if (v?.Src) qualities.push({ label: 'auto', url: aoAbsoluteUrl(v.Src) });
      }
    }
    if (!qualities.length) throw new Error('пустой список качеств в ответе');
    return { qualities };
  } catch (err) {
    console.error('AnimeOn: ошибка resolve', link, err?.message || err);
    return null;
  }
});

ipcMain.handle('mangadex:search', async (_e, payload) => {
  // обратная совместимость: раньше сюда передавали просто строку с названием
  const opts = typeof payload === 'string' ? { query: payload } : (payload || {});
  const { query = '', tagIds = [], status = [], order = 'relevance', originalLanguage = [], offset = 0 } = opts;

  const limit = 24;
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (query.trim()) params.append('title', query.trim());
  for (const id of tagIds) params.append('includedTags[]', id);
  for (const s of status) params.append('status[]', s);
  for (const lang of originalLanguage) params.append('originalLanguage[]', lang);

  // order[relevance] у MangaDex осмысленно работает только вместе с текстовым
  // запросом (title). Если ищем просто по жанру/теме без текста, "релевантность"
  // превращается в случайный порядок — оттуда и редкие тайтлы с парой лайков
  // вместо нормальных популярных вещей. В этом случае молча подменяем сортировку
  // на "по популярности", даже если в фильтрах стоит "По релевантности".
  const effectiveOrder = (!query.trim() && order === 'relevance') ? 'popular' : order;
  const orderKey = { relevance: 'relevance', popular: 'followedCount', rating: 'rating', latest: 'latestUploadedChapter' }[effectiveOrder] || 'relevance';
  params.append(`order[${orderKey}]`, 'desc');

  params.append('includes[]', 'cover_art');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');

  const data = await mdFetch(`${MANGADEX_API}/manga?${params.toString()}`);
  const items = await mapMangaList(data);
  let total = data.total ?? items.length;

  // ReManga вливаем в ту же выдачу, а не отдельным переключателем — только на
  // текстовый запрос (у него нет фильтров по тегам/статусу, как у MangaDex) и
  // только на первую страницу: пагинация у двух источников с разным размером
  // страницы точно не совместить, так что дальше (offset > 0) страницы
  // докручивает только MangaDex, а ReManga отдаёт свой единственный "кусок" сразу.
  // Если ReManga недоступен/изменил формат — просто тихо остаёмся с MangaDex.
  if (query.trim() && offset === 0) {
    try {
      const rm = await remangaSearch(query);
      if (rm.items.length) {
        items.push(...rm.items);
        total += rm.items.length;
      }
    } catch (err) {
      console.error('ReManga поиск не удался:', err?.message || err);
    }
    try {
      const wa = await waSearch(query);
      if (wa.items.length) {
        items.push(...wa.items);
        total += wa.items.length;
      }
    } catch (err) {
      console.error('WaManga поиск не удался:', err?.message || err);
    }
    try {
      const mb = await mbSearch(query);
      if (mb.items.length) {
        items.push(...mb.items);
        total += mb.items.length;
      }
    } catch (err) {
      console.error('MangaBuff поиск не удался:', err?.message || err);
    }
    try {
      const ug = await ugSearch(query);
      if (ug.items.length) {
        items.push(...ug.items);
        total += ug.items.length;
      }
    } catch (err) {
      console.error('Usagi поиск не удался:', err?.message || err);
    }
  }

  // data.total — сколько всего тайтлов подходит под фильтр (не только на этой странице),
  // нужно рендерeру, чтобы посчитать число страниц и включить/выключить "Вперёд"
  return { items, total, offset, limit };
});

// у MangaDex почти нет русской локализации тегов — переводим сами то, что
// реально встречается в жанрах/темах; чего нет в словаре — остаётся на английском
const TAG_NAME_RU = {
  // жанры
  Action: 'Экшен', Adventure: 'Приключения', "Boys' Love": 'Яой', Comedy: 'Комедия',
  Crime: 'Криминал', Drama: 'Драма', Fantasy: 'Фэнтези', "Girls' Love": 'Юри',
  Historical: 'История', Horror: 'Ужасы', Isekai: 'Исекай', 'Magical Girls': 'Махо-сёдзё',
  Mecha: 'Меха', Medical: 'Медицина', Mystery: 'Детектив', Philosophical: 'Философия',
  Psychological: 'Психология', Romance: 'Романтика', 'Sci-Fi': 'Научная фантастика',
  'Slice of Life': 'Повседневность', Sports: 'Спорт', Superhero: 'Супергерои',
  Thriller: 'Триллер', Tragedy: 'Трагедия', Wuxia: 'Уся',
  // темы
  Aliens: 'Пришельцы', Animals: 'Животные', Cooking: 'Кулинария', Crossdressing: 'Кроссдрессинг',
  Delinquents: 'Хулиганы', Demons: 'Демоны', Genderswap: 'Гендерная интрига', Ghosts: 'Призраки',
  Gyaru: 'Гяру', Harem: 'Гарем', Incest: 'Инцест', Loli: 'Лоли', Mafia: 'Мафия',
  Magic: 'Магия', Mahjong: 'Маджонг', 'Martial Arts': 'Боевые искусства', Military: 'Военное дело',
  'Monster Girls': 'Девушки-монстры', Monsters: 'Монстры', Music: 'Музыка', Ninja: 'Ниндзя',
  'Office Workers': 'Офисные работники', Police: 'Полиция', 'Post-Apocalyptic': 'Постапокалиптика',
  Reincarnation: 'Реинкарнация', 'Reverse Harem': 'Обратный гарем', Samurai: 'Самураи',
  'School Life': 'Школьная жизнь', Shota: 'Шота', Supernatural: 'Сверхъестественное',
  Survival: 'Выживание', 'Time Travel': 'Путешествия во времени', 'Traditional Games': 'Традиционные игры',
  Vampires: 'Вампиры', 'Video Games': 'Видеоигры', Villainess: 'Злодейка',
  'Virtual Reality': 'Виртуальная реальность', Zombies: 'Зомби',
};

// приложение — обычный читалка манги/манхвы/маньхуа, без взрослых жанров и тем;
// эти теги технически есть в справочнике MangaDex, но в фильтрах их быть не должно
const EXCLUDED_TAG_NAMES = new Set([
  "Boys' Love", "Girls' Love", // яой, юри
  'Incest', 'Loli', 'Shota', // хентай-тематика
  'Sexual Violence', // контентный тег 18+
]);

// список жанров/тем почти никогда не меняется — кэшируем на всё время работы приложения
let cachedTags = null;
ipcMain.handle('mangadex:tags', async () => {
  if (cachedTags) return cachedTags;
  const data = await mdFetch(`${MANGADEX_API}/manga/tag`);
  const groups = {};
  for (const t of data.data || []) {
    const original = t.attributes?.name?.en || 'Без названия';
    if (EXCLUDED_TAG_NAMES.has(original)) continue;
    const group = t.attributes?.group || 'other';
    const name = TAG_NAME_RU[original] || t.attributes?.name?.ru || original;
    if (!groups[group]) groups[group] = [];
    groups[group].push({ id: t.id, name });
  }
  for (const key of Object.keys(groups)) groups[key].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  cachedTags = groups;
  return groups;
});

// «Популярное» для главной страницы — сортировка MangaDex по числу подписок
async function mangadexPopularByFollows() {
  const params = new URLSearchParams({
    limit: '18',
    'order[followedCount]': 'desc',
  });
  params.append('includes[]', 'cover_art');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');
  params.append('hasAvailableChapters', 'true');

  const data = await mdFetch(`${MANGADEX_API}/manga?${params.toString()}`);
  return await mapMangaList(data);
}

ipcMain.handle('mangadex:popular', () => mangadexPopularByFollows());

// "Популярное" по MangaDex — это по сути "у кого сейчас больше фолловеров",
// а фолловят там в основном то, что недавно залили, включая много низкосортного
// контента. Для честного топа берём Jikan — открытый бесплатный API поверх
// MyAnimeList (без ключа), там реальный редакционный рейтинг, а не сырой
// поток заливок. Формат ответа отличается от MangaDex, и id тут — это id
// с MyAnimeList, НЕ id MangaDex — по клику на карточку резолвим через обычный
// поиск по названию среди уже подключённых источников (см. renderer.js).
const JIKAN_API = 'https://api.jikan.moe/v4';

async function jikanFetch(path, attempt = 1) {
  const url = `${JIKAN_API}${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
    // у Jikan жёсткий рейт-лимит (около 3 запросов в секунду) — при 429
    // просто ждём и пробуем ещё раз, а не сразу сдаёмся
    if (res.status === 429 && attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
      return jikanFetch(path, attempt + 1);
    }
    const raw = await res.text();
    if (!res.ok) {
      console.error(`[Jikan] ${url} → HTTP ${res.status}. Тело ответа: ${raw.slice(0, 500)}`);
      throw new Error(`HTTP ${res.status}`);
    }
    return JSON.parse(raw);
  } catch (err) {
    if (attempt < 2) return jikanFetch(path, attempt + 1);
    throw new Error(`Jikan не отвечает (${err.message})`);
  }
}

function mapJikanMangaItem(raw) {
  return {
    id: `jikan:${raw.mal_id}`,
    title: raw.title_russian || raw.title || raw.title_english || 'Без названия',
    // на всякий случай запоминаем оригинальное/английское название отдельно —
    // если русское название с MAL не совпадёт с тем, как тайтл называется на
    // наших источниках, для поиска пригодится английский вариант/ромадзи
    searchTitle: raw.title_english || raw.title || raw.title_russian,
    coverUrl: raw.images?.webp?.image_url || raw.images?.jpg?.image_url || null,
    score: raw.score || null,
    malUrl: raw.url || null,
  };
}

async function jikanTopManga({ limit = 24 } = {}) {
  const data = await jikanFetch(`/top/manga?limit=${limit}&filter=bypopularity`);
  const items = (data.data || []).map(mapJikanMangaItem);
  console.log(`[Jikan] топ манги: получено ${items.length} тайтлов`);
  return { items, total: items.length };
}

ipcMain.handle('jikan:topManga', async () => {
  try {
    const result = await jikanTopManga();
    if (result.items.length) return result;
    throw new Error('пустой ответ');
  } catch (err) {
    // Jikan — бесплатный community-сервис поверх MyAnimeList, у него бывают
    // реальные перебои именно на их стороне (см. лог "MyAnimeList may be
    // down"), не наш баг. Чтобы раздел не оставался пустым в такие моменты,
    // тихо откатываемся на старый способ (сортировка MangaDex по фолловерам) —
    // хуже по качеству подборки, но хоть что-то, а не пустота.
    console.error('Jikan: не удалось получить топ манги, откат на MangaDex:', err?.message || err);
    try {
      const items = await mangadexPopularByFollows();
      return { items, total: items.length, fallback: true };
    } catch {
      return { items: [], total: 0 };
    }
  }
});


// MangaDex, а не по общему числу подписчиков за всё время. У "Популярного"
// (followedCount) естественным образом перекос в сторону давних, массовых
// тайтлов — здесь наоборот, свежедобавленное, без учёта раскрученности
ipcMain.handle('mangadex:latest', async () => {
  const params = new URLSearchParams({
    limit: '18',
    'order[createdAt]': 'desc',
  });
  params.append('includes[]', 'cover_art');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');
  params.append('hasAvailableChapters', 'true');

  const data = await mdFetch(`${MANGADEX_API}/manga?${params.toString()}`);
  return await mapMangaList(data);
});

// сравнение названий без учёта регистра/пунктуации — чтобы сматчить один и тот
// же тайтл между MangaDex и ReManga, у которых написание может чуть отличаться
function normalizeTitleForMatch(s) {
  return (s || '').toLowerCase().replace(/[^a-zа-яё0-9]+/gi, ' ').trim();
}

function pickBestTitleMatch(target, candidates, getTitle) {
  const targetNorm = normalizeTitleForMatch(target);
  if (!targetNorm) return null;
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    const t = normalizeTitleForMatch(getTitle(c));
    if (!t) continue;
    let score = 0;
    if (t === targetNorm) score = 2;
    else if (t.includes(targetNorm) || targetNorm.includes(t)) score = 1;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

// ищем на ReManga тайтл, соответствующий названию с MangaDex (для карточек,
// открытых как MangaDex-тайтл — чтобы можно было сравнить, где глав на русском больше)
async function findRemangaMatchForTitle(title) {
  if (!title) return null;
  try {
    const { items } = await remangaSearch(title, { count: 10 });
    return pickBestTitleMatch(title, items, (it) => it.title);
  } catch {
    return null;
  }
}

// и наоборот — ищем на MangaDex тайтл, соответствующий названию с ReManga
// (нужно, чтобы у ReManga-карточек тоже был английский перевод от MangaDex)
async function findMangadexMatchForTitle(title) {
  if (!title) return null;
  try {
    const params = new URLSearchParams({ limit: '10', title: title.trim() });
    params.append('order[relevance]', 'desc');
    params.append('contentRating[]', 'safe');
    params.append('contentRating[]', 'suggestive');
    const data = await mdFetch(`${MANGADEX_API}/manga?${params.toString()}`);
    const match = pickBestTitleMatch(title, data.data || [], (m) => pickTitle(m.attributes));
    return match?.id || null;
  } catch {
    return null;
  }
}

// раньше брали только первые 200 записей одним запросом — у тайтлов, где
// несколько групп переводчиков закрывали одни и те же главы, реальных строк
// в ленте оказывается больше 200, и из-за лимита в выдачу попадал случайный
// кусок вместо начала (например, сразу глава 238 вместо 1). Догружаем ленту
// постранично, пока не заберём всё. langs — список кодов языка для фильтра.
async function mdChaptersFeed(mangaId, langs) {
  const limit = 500; // максимум, который отдаёт этот эндпоинт MangaDex за раз
  let offset = 0;
  let all = [];
  for (let i = 0; i < 20; i++) { // страховка от зацикливания, с запасом на любой тайтл
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    params.append('order[chapter]', 'asc');
    for (const lang of langs) params.append('translatedLanguage[]', lang);
    const data = await mdFetch(`${MANGADEX_API}/manga/${mangaId}/feed?${params.toString()}`);
    const batch = data.data || [];
    all = all.concat(batch);
    offset += limit;
    if (batch.length < limit || offset >= (data.total ?? all.length)) break;
  }
  return all.map((c) => ({
    id: c.id,
    chapter: c.attributes?.chapter,
    title: c.attributes?.title,
    lang: c.attributes?.translatedLanguage,
    pages: c.attributes?.pages,
  }));
}

function sortChaptersAsc(items) {
  items.sort((a, b) => {
    const na = parseFloat(a.chapter);
    const nb = parseFloat(b.chapter);
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  });
  return items;
}

// главы всегда собираем из ОБОИХ источников, независимо от того, как изначально
// пришла карточка (MangaDex или ReManga): EN — только с MangaDex (у ReManga его
// просто нет), RU — с того источника, у которого на русском больше глав. Так
// у тайтлов с неполным русским переводом на MangaDex подтягивается более полный
// перевод с ReManga, а у тайтлов, найденных через ReManga, всё равно есть EN.
ipcMain.handle('mangadex:chapters', async (_e, payload) => {
  const { mangaId, title } = typeof payload === 'string' ? { mangaId: payload, title: '' } : (payload || {});
  const isRemanga = typeof mangaId === 'string' && mangaId.startsWith(REMANGA_PREFIX);
  const isWamanga = typeof mangaId === 'string' && mangaId.startsWith(WAMANGA_PREFIX);
  const isMangabuff = typeof mangaId === 'string' && mangaId.startsWith(MANGABUFF_PREFIX);
  const isUsagi = typeof mangaId === 'string' && mangaId.startsWith(USAGI_PREFIX);

  let mdId = (isRemanga || isWamanga || isMangabuff || isUsagi) ? null : mangaId;
  let rmDir = isRemanga ? mangaId.slice(REMANGA_PREFIX.length) : null;
  let waType = null, waSlug = null;
  if (isWamanga) ({ type: waType, slug: waSlug } = parseWamangaId(mangaId));
  let mbSlug = isMangabuff ? mangaId.slice(MANGABUFF_PREFIX.length) : null;
  let ugSlug = isUsagi ? mangaId.slice(USAGI_PREFIX.length) : null;

  // Эти четыре поиска совпадения по названию независимы друг от друга, поэтому
  // гоняем их параллельно, а не по очереди — раньше был await один за другим,
  // и если один из источников подвисал (ещё не помеченный sourceHealth как
  // "лежит"), это добавляло его личный таймаут+ретрай (до 30 сек) ко ВСЕЙ
  // цепочке целиком, прежде чем дело доходило до следующего источника. Именно
  // это, похоже, и ощущалось как "тайтл долго грузится, хотя все сайты вроде
  // живы" — теперь худший случай это самый медленный источник, а не их сумма.
  const [mdMatch, rmMatch, waMatch, mbMatch, ugMatch] = await Promise.all([
    (!mdId && title) ? findMangadexMatchForTitle(title).catch(() => null) : null,
    (!rmDir && title) ? findRemangaMatchForTitle(title).catch(() => null) : null,
    (!waType && title) ? findWamangaMatchForTitle(title).catch(() => null) : null,
    (!mbSlug && title) ? findMangabuffMatchForTitle(title).catch(() => null) : null,
    (!ugSlug && title) ? findUsagiMatchForTitle(title).catch(() => null) : null,
  ]);
  if (!mdId && mdMatch) mdId = mdMatch;
  if (!rmDir && rmMatch) rmDir = rmMatch.id.slice(REMANGA_PREFIX.length);
  if (!waType && waMatch) ({ type: waType, slug: waSlug } = parseWamangaId(waMatch.id));
  if (!mbSlug && mbMatch) mbSlug = mbMatch.id.slice(MANGABUFF_PREFIX.length);
  if (!ugSlug && ugMatch) ugSlug = ugMatch.id.slice(USAGI_PREFIX.length);

  const [enItems, mdRuItems, rmRuItems, waRuItems, mbRuItems, ugRuItems] = await Promise.all([
    mdId ? mdChaptersFeed(mdId, ['en']).catch(() => []) : [],
    mdId ? mdChaptersFeed(mdId, ['ru']).catch(() => []) : [],
    rmDir ? remangaChapters(rmDir).catch(() => []) : [],
    waType ? waChapters(waType, waSlug).catch(() => []) : [],
    mbSlug ? mbChapters(mbSlug).catch(() => []) : [],
    ugSlug ? ugChapters(ugSlug).catch(() => []) : [],
  ]);

  // из источников RU (MangaDex/ReManga/WaManga/MangaBuff/Usagi) берём тот, где глав больше
  const ruCandidates = [
    { name: 'MangaDex', items: mdRuItems },
    { name: 'ReManga', items: rmRuItems },
    { name: 'WaManga', items: waRuItems },
    { name: 'MangaBuff', items: mbRuItems },
    { name: 'Usagi', items: ugRuItems },
  ];
  let winner = ruCandidates.reduce((best, cur) => (cur.items.length > best.items.length ? cur : best));

  // Предохранитель для "хрупких" источников (MangaBuff/Usagi): список глав
  // парсится из отдельного HTML (карточка тайтла) независимо от страниц
  // конкретной главы, поэтому у тайтла формально может быть больше всего
  // глав, а сам парсинг страниц при этом сломан для конкретной разметки (как
  // было с regex \w на кириллице у MangaBuff) — тайтл выигрывает сравнение,
  // но открывается пустым. Проверяем это пробным запросом первой главы и,
  // если страниц 0, откатываемся на следующего по числу глав. ReManga/WaManga
  // этой проверкой не трогаем — по опыту пользователя они надёжнее, и лишний
  // сетевой запрос на каждое открытие тайтла того не стоит.
  const fragileSourceCheckers = {
    MangaBuff: async (firstId) => {
      const m = /^mb:(.+):([^:]+):([^:]+)$/.exec(firstId);
      if (!m) return false;
      const [, slug, vol, chapter] = m;
      try { return (await mbPages(slug, vol, chapter)).length > 0; } catch { return false; }
    },
    Usagi: async (firstId) => {
      if (!firstId.startsWith(USAGI_PREFIX)) return false;
      try { return (await ugPages(firstId.slice(USAGI_PREFIX.length))).length > 0; } catch { return false; }
    },
  };
  if (fragileSourceCheckers[winner.name] && winner.items.length) {
    const pagesOk = await fragileSourceCheckers[winner.name](winner.items[0].id);
    if (!pagesOk) {
      const fallback = ruCandidates
        .filter((c) => c.name !== winner.name)
        .reduce((best, cur) => (cur.items.length > best.items.length ? cur : best));
      console.error(
        `[${winner.name}] выбран победителем по числу глав (${winner.items.length}), но пробная проверка первой главы вернула 0 страниц — откат на ${fallback.name} (${fallback.items.length} глав)`,
      );
      winner = fallback;
    }
  }

  const ruItems = winner.items;

  return sortChaptersAsc([...ruItems, ...enItems]);
});

async function getChapterPages(chapterId) {
  // forcePort443 — просим MangaDex назначить узел раздачи, который слушает именно
  // 443-й порт. Часть их узлов (@Home) работают на нестандартных портах, которые
  // тихо режутся роутером/провайдером/антивирусом — из-за этого одни тайтлы
  // открываются, а другие нет, и повторный запрос той же картинки не помогает,
  // т.к. порт всё так же заблокирован. 443 почти никогда никем не блокируется.
  const data = await mdFetch(`${MANGADEX_API}/at-home/server/${chapterId}?forcePort443=true`);
  const base = data.baseUrl;
  const hash = data.chapter?.hash;
  const files = data.chapter?.data || [];
  return files.map((f) => `${base}/data/${hash}/${f}`);
}

ipcMain.handle('mangadex:pages', async (_e, chapterId) => {
  if (typeof chapterId === 'string' && chapterId.startsWith(REMANGA_PREFIX)) {
    return remangaPages(chapterId.slice(REMANGA_PREFIX.length));
  }
  if (typeof chapterId === 'string' && chapterId.startsWith(WAMANGA_PREFIX)) {
    const rest = chapterId.slice(WAMANGA_PREFIX.length);
    const [type, slug, chapterSlug] = rest.split(':');
    return waPages(type, slug, chapterSlug);
  }
  if (typeof chapterId === 'string' && chapterId.startsWith(MANGABUFF_PREFIX)) {
    const [slug, vol, chapter] = chapterId.slice(MANGABUFF_PREFIX.length).split(':');
    return mbPages(slug, vol, chapter);
  }
  if (typeof chapterId === 'string' && chapterId.startsWith(USAGI_PREFIX)) {
    return ugPages(chapterId.slice(USAGI_PREFIX.length));
  }
  return getChapterPages(chapterId);
});

// ---------- IPC: AniList (публичный открытый GraphQL API, без ключа) ----------
// Используется только для витрины «Популярное аниме» на главной странице —
// раздел «Аниме» в целом по-прежнему работает через сохранённые сайты,
// это отдельная, независимая от него база данных для ознакомления.

const ANILIST_API = 'https://graphql.anilist.co';

const ANILIST_TRENDING_QUERY = `
  query ($perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
        id
        title { romaji english }
        description(asHtml: false)
        coverImage { large }
        averageScore
        episodes
        format
        siteUrl
      }
    }
  }
`;

ipcMain.handle('anilist:trending', async () => {
  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query: ANILIST_TRENDING_QUERY, variables: { perPage: 18 } }),
  });
  if (!res.ok) throw new Error(`AniList вернул HTTP ${res.status}`);
  const json = await res.json();
  const media = json?.data?.Page?.media || [];
  return media.map((m) => ({
    id: m.id,
    title: m.title?.romaji || m.title?.english || 'Без названия',
    description: (m.description || '').replace(/<[^>]+>/g, '').slice(0, 400),
    coverUrl: m.coverImage?.large || null,
    score: m.averageScore || null,
    episodes: m.episodes || null,
    format: m.format || null,
    siteUrl: m.siteUrl || null,
  }));
});

// ---------- IPC: открытие ссылок в системном браузере ----------

ipcMain.handle('app:openExternal', (_e, url) => {
  if (typeof url === 'string' && /^https:\/\//.test(url)) shell.openExternal(url);
});

ipcMain.handle('app:focus', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

// ---------- IPC: локальные загрузки глав (офлайн-чтение) ----------

// Windows не разрешает : \ / * ? " < > | в именах файлов/папок — а наши id
// (например, у WaManga: wa:manga:slug:glava-1) двоеточия содержат.
// На macOS/Linux эти же символы либо разрешены, либо ведут себя иначе, так что
// заменяем их явно и одинаково на всех платформах, а не полагаемся на ОС.
function safePathSegment(s) {
  return String(s).replace(/[:\\/*?"<>|]/g, '_');
}

function downloadEntryFolder(mangaId, chapterId) {
  return path.join(DOWNLOADS_DIR(), safePathSegment(mangaId), safePathSegment(chapterId));
}

// активные закачки — чтобы можно было отменить главу, которая качается прямо сейчас
const activeDownloadControllers = new Map();

ipcMain.handle('downloads:list', () => loadDownloadsIndex());

ipcMain.handle('downloads:pages', async (_e, { mangaId, chapterId }) => {
  const folder = downloadEntryFolder(mangaId, chapterId);
  const files = (await fs.readdir(folder).catch(() => [])).filter((f) => /^\d+\.\w+$/.test(f));
  files.sort((a, b) => parseInt(a) - parseInt(b));
  // относительный путь от DOWNLOADS_DIR (папка уже прошла safePathSegment при
  // скачивании) — кодируем каждый сегмент отдельно на случай пробелов и т.п.
  const relDir = path.relative(DOWNLOADS_DIR(), folder).split(path.sep).map(encodeURIComponent).join('/');
  return files.map((f) => `http://127.0.0.1:${appServerPort}/__downloads/${relDir}/${encodeURIComponent(f)}`);
});

ipcMain.handle('downloads:remove', async (_e, { mangaId, chapterId }) => {
  const folder = downloadEntryFolder(mangaId, chapterId);
  await fs.rm(folder, { recursive: true, force: true }).catch(() => {});
  const entries = (await loadDownloadsIndex()).filter(
    (d) => !(d.mangaId === mangaId && d.chapterId === chapterId)
  );
  return saveDownloadsIndex(entries);
});

ipcMain.handle('downloads:removeAll', async () => {
  await fs.rm(DOWNLOADS_DIR(), { recursive: true, force: true }).catch(() => {});
  return saveDownloadsIndex([]);
});

ipcMain.handle('downloads:removeAllForManga', async (_e, mangaId) => {
  await fs.rm(path.join(DOWNLOADS_DIR(), safePathSegment(mangaId)), { recursive: true, force: true }).catch(() => {});
  const entries = (await loadDownloadsIndex()).filter((d) => d.mangaId !== mangaId);
  return saveDownloadsIndex(entries);
});

ipcMain.handle('downloads:cancel', (_e, { mangaId, chapterId }) => {
  const controller = activeDownloadControllers.get(`${mangaId}:${chapterId}`);
  if (controller) { controller.abort(); return true; }
  return false;
});

ipcMain.handle('downloads:start', async (_e, { mangaId, title, coverUrl, chapter }) => {
  const chapterId = chapter.id;
  const key = `${mangaId}:${chapterId}`;
  const controller = new AbortController();
  activeDownloadControllers.set(key, controller);
  const folder = downloadEntryFolder(mangaId, chapterId);
  await fs.mkdir(folder, { recursive: true });

  const sendProgress = (payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('downloads:progress', { mangaId, chapterId, ...payload });
    }
  };

  try {
    let pages;
    if (chapterId.startsWith(REMANGA_PREFIX)) {
      pages = await remangaPages(chapterId.slice(REMANGA_PREFIX.length));
    } else if (chapterId.startsWith(WAMANGA_PREFIX)) {
      const [waType, waSlug, waChapterSlug] = chapterId.slice(WAMANGA_PREFIX.length).split(':');
      pages = await waPages(waType, waSlug, waChapterSlug);
      if (!pages.length) throw new Error('Не нашлось ни одной страницы — похоже, WaManga поменяла разметку страницы главы');
    } else if (chapterId.startsWith(MANGABUFF_PREFIX)) {
      const [mbSlug, mbVol, mbChapter] = chapterId.slice(MANGABUFF_PREFIX.length).split(':');
      pages = await mbPages(mbSlug, mbVol, mbChapter);
      if (!pages.length) throw new Error('Не нашлось ни одной страницы — похоже, MangaBuff поменяла разметку страницы главы');
    } else {
      pages = await getChapterPages(chapterId);
    }
    // Раньше страницы скачивались строго по одной (await в цикле) — для быстрых
    // CDN (MangaDex, WaManga) это было не так заметно, а у ReManga (reimg*.org)
    // и MangaBuff задержка на каждый отдельный запрос выше, и при строгой
    // последовательности эти задержки складывались линейно на всю главу.
    // Теперь качаем несколько страниц одновременно (пул фиксированного размера),
    // порядок дозаписи файлов не важен — имя файла всё равно строится по номеру
    // страницы (i), а не по порядку завершения запроса.
    const DOWNLOAD_CONCURRENCY = 5;
    let done = 0;
    let nextIndex = 0;

    async function downloadPage(i) {
      if (controller.signal.aborted) throw new DOMException('Отменено', 'AbortError');
      const url = pages[i];
      const ext = (url.split('.').pop() || 'jpg').split('?')[0].slice(0, 5);
      const imgHeaders = { 'User-Agent': USER_AGENT };
      // reimg.org/reimg2-5.org — CDN-домены ReManga для самих картинок страниц
      // (см. setupRequestHeaders() выше, где то же самое уже учтено для чтения
      // через webview). Здесь отдельная ветка для скачивания (прямой fetch() из
      // main-процесса), про эти домены раньше не знала — из-за этого чтение
      // тайтла работало, а скачивание той же главы падало с ошибкой, потому что
      // Referer/Origin на CDN-домен не долетали.
      if (url.includes('remanga.org') || url.includes('reimg')) { imgHeaders.Referer = `${REMANGA_SITE}/`; imgHeaders.Origin = REMANGA_SITE; }
      if (url.includes('wamanga.ru')) { imgHeaders.Referer = `${WAMANGA_SITE}/`; imgHeaders.Origin = WAMANGA_SITE; }
      if (url.includes('mangabuff.ru')) { imgHeaders.Referer = `${MANGABUFF_SITE}/`; imgHeaders.Origin = MANGABUFF_SITE; }
      const res = await fetch(url, { headers: imgHeaders, signal: controller.signal });
      if (!res.ok) throw new Error(`Страница ${i + 1}: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const fileName = `${String(i + 1).padStart(3, '0')}.${ext}`;
      await fs.writeFile(path.join(folder, fileName), buf);
      done += 1;
      sendProgress({ done, total: pages.length });
    }

    async function downloadWorker() {
      while (nextIndex < pages.length) {
        const i = nextIndex++;
        await downloadPage(i);
      }
    }

    const workerCount = Math.min(DOWNLOAD_CONCURRENCY, pages.length);
    await Promise.all(Array.from({ length: workerCount }, () => downloadWorker()));

    const entries = await loadDownloadsIndex();
    const filtered = entries.filter((d) => !(d.mangaId === mangaId && d.chapterId === chapterId));
    filtered.unshift({
      mangaId,
      chapterId,
      title,
      coverUrl,
      chapterLabel: `Гл. ${chapter.chapter ?? '?'}`,
      pageCount: pages.length,
      downloadedAt: Date.now(),
    });
    await saveDownloadsIndex(filtered);
    sendProgress({ done: pages.length, total: pages.length, finished: true });
    return { ok: true };
  } catch (err) {
    // при ошибке одной страницы останавливаем остальные ещё летящие параллельные
    // загрузки этой же главы — иначе они могут дописать файлы в папку уже после
    // того, как её удалили ниже (гонка между fs.rm и догоняющими воркерами)
    controller.abort();
    await fs.rm(folder, { recursive: true, force: true }).catch(() => {});
    const cancelled = err.name === 'AbortError';
    sendProgress({ error: cancelled ? 'Отменено' : err.message, cancelled, finished: true });
    return { ok: false, cancelled, error: err.message };
  } finally {
    activeDownloadControllers.delete(key);
  }
});

// ---------- ОНЛАЙН: друзья и чат (через Supabase) ----------
// Тут единственное место, где приложение говорит с внешним сервером помимо
// MangaDex/AniList. Ключ ниже — publishable ("anon"), он специально сделан
// для того, чтобы лежать в коде клиентского приложения: сам по себе он ничего
// не даёт без правил доступа (RLS + функции), которые настраиваются в самом
// Supabase (см. supabase_schema.sql в этой же папке). Секретный ключ (secret /
// service_role) в приложении не используется и использоваться не должен —
// с ним любой, кто разберёт .exe, получил бы полный доступ ко всей базе.

const SUPABASE_URL = 'https://samjshzislepbanrlmfk.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_b7TV-CPzHn75PKBrQevkDQ_-4u0UlTz';

// Кастомное хранилище сессии — обычно supabase-js хранит её в localStorage
// браузера, а тут (Node, главный процесс) его нет. Храним в userData, чтобы
// после перезапуска приложения не создавался новый анонимный пользователь
// (и, соответственно, не менялся код друга).
const onlineSessionStorage = {
  async getItem(key) {
    const all = await readJson(ONLINE_SESSION_PATH(), {});
    return Object.prototype.hasOwnProperty.call(all, key) ? all[key] : null;
  },
  async setItem(key, value) {
    const all = await readJson(ONLINE_SESSION_PATH(), {});
    all[key] = value;
    await writeJson(ONLINE_SESSION_PATH(), all);
  },
  async removeItem(key) {
    const all = await readJson(ONLINE_SESSION_PATH(), {});
    delete all[key];
    await writeJson(ONLINE_SESSION_PATH(), all);
  },
};

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: onlineSessionStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

let onlineState = {
  ready: false,
  connecting: true,
  error: null,
  myId: null,
  friendCode: null,
  username: null,
  displayName: null,
  email: null,
  isAnonymous: true,
};
let realtimeReady = false;
let presenceChannel = null;
let onlineFriendIds = new Set();

function sendOnlineEvent(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('online:event', payload);
  }
}

// Понятные тексты вместо сырых сообщений Postgres-исключений (см. функции
// rpc_* в supabase_schema.sql — они как раз бросают эти короткие коды).
function friendlyOnlineError(err) {
  const msg = String(err?.message || err || '');
  const map = {
    friend_code_not_found: 'Код не найден — проверь, что ввёл его без ошибок.',
    username_not_found: 'Такой ник не найден.',
    invalid_username: 'Ник: 3–20 символов, только латиница/цифры/"_".',
    username_taken: 'Этот ник уже занят — придумай другой.',
    cannot_add_self: 'Нельзя отправить заявку самому себе.',
    already_friends: 'Вы уже друзья.',
    already_pending: 'Заявка уже отправлена и ждёт ответа.',
    request_not_found: 'Заявка не найдена — возможно, её уже отменили.',
    not_friends: 'Сначала нужно добавить друг друга.',
    empty_message: 'Сообщение пустое.',
    not_premium: 'Это премиум-функция — нужна активная подписка.',
    invalid_frame: 'Такой рамки не существует.',
    not_moderator: 'Управлять источниками новостей могут только модераторы.',
    empty_name: 'Название не может быть пустым.',
    invalid_type: 'Источник может быть только RSS или YouTube.',
    category_not_found: 'Такой категории не существует — возможно, её уже удалили.',
    not_a_member: 'Ты не состоишь в этой группе — возможно, тебя уже удалили или ты вышел.',
    not_group_creator: 'Удалять участников может только создатель группы.',
    'User already registered': 'Эта почта уже зарегистрирована — попробуй войти, а не регистрироваться заново.',
    'Invalid login credentials': 'Неверная почта или пароль.',
    'Password should be at least': 'Пароль слишком короткий (минимум 6 символов).',
    'Unable to validate email address': 'Проверь адрес почты — похоже, в нём ошибка.',
    'Anonymous sign-ins are disabled': 'В Supabase не включены анонимные входы (Authentication → Sign In / Providers → Anonymous Sign-Ins).',
  };
  const key = Object.keys(map).find((k) => msg.includes(k));
  if (key) return map[key];
  if (/relation .* does not exist|function .* does not exist|schema cache/i.test(msg)) {
    return 'Онлайн не настроен: похоже, не выполнен supabase_schema.sql в Supabase (SQL Editor).';
  }
  return msg || 'Неизвестная ошибка онлайн-сервиса';
}

async function ensureOnlineSession() {
  const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) throw sessionErr;
  if (!session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }
}

async function fetchMyProfile() {
  const { data, error } = await supabase.rpc('rpc_get_my_profile').maybeSingle();
  if (error) throw error;
  return data;
}

async function initOnline() {
  onlineState = { ...onlineState, connecting: true, error: null };
  try {
    await ensureOnlineSession();

    // Профиль создаёт триггер на сервере сразу при регистрации анонимного
    // пользователя — обычно это мгновенно, но на всякий случай пробуем
    // несколько раз с паузой, а не падаем с первой попытки.
    let profileRow = await fetchMyProfile();
    for (let i = 0; i < 6 && !profileRow; i++) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      profileRow = await fetchMyProfile();
    }
    if (!profileRow) {
      throw new Error('Профиль не появился на сервере — проверь, что выполнен supabase_schema.sql.');
    }

    const { data: userData } = await supabase.auth.getUser();
    const authUser = userData?.user || null;

    onlineState = {
      ready: true,
      connecting: false,
      error: null,
      myId: profileRow.id,
      friendCode: profileRow.friend_code,
      username: profileRow.username || null,
      displayName: profileRow.display_name || null,
      email: authUser?.email || null,
      isAnonymous: authUser?.is_anonymous !== false,
      premiumUntil: profileRow.premium_until || null,
      isPremium: !!(profileRow.premium_until && new Date(profileRow.premium_until) > new Date()),
      bannerUrl: profileRow.banner_url || null,
      avatarFrame: profileRow.avatar_frame || null,
      isModerator: !!profileRow.is_moderator,
    };
    setupRealtimeSubscriptions(profileRow.id);
  } catch (err) {
    onlineState = {
      ready: false,
      connecting: false,
      error: friendlyOnlineError(err),
      myId: null,
      friendCode: null,
      username: null,
      displayName: null,
      email: null,
      isAnonymous: true,
      isModerator: false,
    };
  }
  return onlineState;
}

// Используется при входе в существующий аккаунт / выходе — в отличие от
// "регистрации" (апгрейд анонимного пользователя на месте) тут меняется сам
// auth.uid(), так что старые подписки реалтайма нужно снести и открыть заново.
async function switchIdentity() {
  realtimeReady = false;
  await teardownPresence();
  await leavePartyChannel();
  try {
    await supabase.removeAllChannels();
  } catch { /* не критично */ }
  return initOnline();
}

function setupRealtimeSubscriptions(myId) {
  if (realtimeReady) return;
  realtimeReady = true;

  supabase
    .channel('hanko-incoming-requests')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'friend_requests', filter: `to_id=eq.${myId}` },
      () => sendOnlineEvent({ type: 'friend-request-incoming' })
    )
    .subscribe();

  supabase
    .channel('hanko-outgoing-requests-status')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'friend_requests', filter: `from_id=eq.${myId}` },
      (payload) => sendOnlineEvent({ type: 'friend-request-updated', status: payload.new?.status })
    )
    .subscribe();

  supabase
    .channel('hanko-incoming-messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `to_id=eq.${myId}` },
      (payload) => sendOnlineEvent({ type: 'message', message: payload.new })
    )
    .subscribe();

  // группового сообщения нет конкретного получателя (to_id) — оно относится
  // ко всей группе, поэтому фильтр по колонке тут не поставить. Подписываемся
  // без фильтра на всю таблицу — Supabase Realtime сам ограничивает то, что
  // реально долетит до клиента, той же RLS-политикой SELECT, что и обычные
  // запросы ("see messages of own groups") — то есть сюда и так прилетят
  // только сообщения из групп, где я состою, не нужно фильтровать вручную.
  supabase
    .channel('hanko-incoming-group-messages')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'group_messages' },
      (payload) => sendOnlineEvent({ type: 'group-message', message: payload.new })
    )
    .subscribe();

  // обновления моих же исходящих сообщений — это и есть момент, когда друг их
  // прочитал (read_at проставился), нужно живьём обновить галочки в чате
  supabase
    .channel('hanko-outgoing-messages-read')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'messages', filter: `from_id=eq.${myId}` },
      (payload) => sendOnlineEvent({ type: 'message-read', message: payload.new })
    )
    .subscribe();

  setupPresence(myId);
}

// "Онлайн/офлайн" у друзей — общий presence-канал, в котором каждый открытый
// Hanko отмечается своим id. Ничего не пишется в базу — это живое состояние
// именно текущего websocket-соединения, поэтому при закрытии приложения
// человек автоматически "гаснет" без отдельного действия.
function setupPresence(myId) {
  if (presenceChannel) return;
  presenceChannel = supabase.channel('hanko-presence', {
    config: { presence: { key: myId } },
  });
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      onlineFriendIds = new Set(Object.keys(state));
      sendOnlineEvent({ type: 'presence', onlineIds: Array.from(onlineFriendIds) });
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ at: new Date().toISOString() });
      }
    });
}

async function teardownPresence() {
  onlineFriendIds = new Set();
  if (presenceChannel) {
    try { await presenceChannel.untrack(); } catch { /* не критично */ }
    try { await supabase.removeChannel(presenceChannel); } catch { /* не критично */ }
    presenceChannel = null;
  }
}

// ---------- совместный просмотр аниме (watch party) ----------
// Отдельный Realtime-канал на "комнату": Broadcast — для play/pause/
// перемотки/смены серии/чата внутри плеера, Presence (на том же канале) —
// для списка участников. В отличие от чата друзей (пишется в таблицу
// messages) тут всё эфемерно, ничего не сохраняется в базе — комната просто
// перестаёт существовать, когда из неё все вышли. Роль участников
// симметрична: у канала нет "хозяина" — любой в комнате может поставить на
// паузу/перемотать/переключить серию, это применится у всех остальных.
let partyChannel = null;
let partyRoomId = null;

function sendPartyEvent(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('party:event', payload);
  }
}

async function leavePartyChannel() {
  if (partyChannel) {
    try { await partyChannel.untrack(); } catch { /* не критично */ }
    try { await supabase.removeChannel(partyChannel); } catch { /* не критично */ }
  }
  partyChannel = null;
  partyRoomId = null;
}

function joinPartyChannel(roomId, myId, myName) {
  return new Promise((resolve, reject) => {
    const channel = supabase.channel(`hanko-party-${roomId}`, {
      config: { broadcast: { self: false }, presence: { key: myId } },
    });
    channel
      .on('broadcast', { event: 'sync' }, ({ payload }) => sendPartyEvent(payload))
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const participants = Object.entries(state).map(([id, metas]) => ({
          id, name: metas[0]?.name || '?',
        }));
        sendPartyEvent({ event: 'participants', participants });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          partyChannel = channel;
          partyRoomId = roomId;
          await channel.track({ name: myName });
          resolve(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error('Не удалось подключиться к совместному просмотру'));
        }
      });
  });
}

ipcMain.handle('party:create', async () => {
  await leavePartyChannel();
  const roomId = `${onlineState.myId}-${Date.now()}`;
  const myName = onlineState.displayName || onlineState.username || 'Друг';
  await joinPartyChannel(roomId, onlineState.myId, myName);
  return { roomId };
});

ipcMain.handle('party:join', async (_e, roomId) => {
  await leavePartyChannel();
  const myName = onlineState.displayName || onlineState.username || 'Друг';
  await joinPartyChannel(roomId, onlineState.myId, myName);
  return { roomId };
});

ipcMain.handle('party:leave', () => leavePartyChannel());

ipcMain.handle('party:send', async (_e, payload) => {
  if (!partyChannel || !partyRoomId) return false;
  await partyChannel.send({ type: 'broadcast', event: 'sync', payload: { ...payload, from: onlineState.myId } });
  return true;
});

ipcMain.handle('online:init', () => initOnline());
ipcMain.handle('online:getState', () => onlineState);

ipcMain.handle('online:setDisplayName', async (_e, name) => {
  const clean = String(name || '').trim().slice(0, 40);
  const { error } = await supabase.rpc('rpc_set_display_name', { p_name: clean });
  if (error) throw new Error(friendlyOnlineError(error));
  onlineState.displayName = clean || null;
  return onlineState;
});

ipcMain.handle('online:setUsername', async (_e, username) => {
  const { error } = await supabase.rpc('rpc_set_username', { p_username: username });
  if (error) throw new Error(friendlyOnlineError(error));
  onlineState.username = String(username || '').trim().toLowerCase();
  return onlineState;
});

ipcMain.handle('online:searchUsernames', async (_e, query) => {
  const { data, error } = await supabase.rpc('rpc_search_usernames', { p_query: query });
  if (error) throw new Error(friendlyOnlineError(error));
  return data || [];
});

// регистрация = апгрейд текущего анонимного пользователя до постоянного
// (email+пароль), тот же auth.uid() — все данные (ник, друзья, сообщения)
// остаются на месте. В зависимости от настроек проекта Supabase может
// потребоваться подтверждение по почте.
ipcMain.handle('online:register', async (_e, { email, password }) => {
  const { error } = await supabase.auth.updateUser({ email, password });
  if (error) throw new Error(friendlyOnlineError(error));
  return initOnline();
});

ipcMain.handle('online:login', async (_e, { email, password }) => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyOnlineError(error));
  return switchIdentity();
});

ipcMain.handle('online:logout', async () => {
  await supabase.auth.signOut();
  return switchIdentity();
});

ipcMain.handle('online:getOnlineIds', () => Array.from(onlineFriendIds));

ipcMain.handle('online:sendFriendRequest', async (_e, username) => {
  const { data, error } = await supabase.rpc('rpc_send_friend_request', { p_username: username });
  if (error) throw new Error(friendlyOnlineError(error));
  return data;
});

ipcMain.handle('online:sendFriendRequestByCode', async (_e, code) => {
  const { data, error } = await supabase.rpc('rpc_send_friend_request_by_code', { p_code: code });
  if (error) throw new Error(friendlyOnlineError(error));
  return data;
});

ipcMain.handle('online:findByCodePreview', async (_e, code) => {
  const { data, error } = await supabase.rpc('rpc_find_by_code_preview', { p_code: code }).maybeSingle();
  if (error) throw new Error(friendlyOnlineError(error));
  return data || null;
});

ipcMain.handle('online:cancelFriendRequest', async (_e, requestId) => {
  const { error } = await supabase.rpc('rpc_cancel_friend_request', { p_request_id: requestId });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

ipcMain.handle('online:respondFriendRequest', async (_e, { requestId, accept }) => {
  const { error } = await supabase.rpc('rpc_respond_friend_request', {
    p_request_id: requestId,
    p_accept: !!accept,
  });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

ipcMain.handle('online:listIncomingRequests', async () => {
  const { data, error } = await supabase.rpc('rpc_list_incoming_requests');
  if (error) throw new Error(friendlyOnlineError(error));
  return data || [];
});

ipcMain.handle('online:listOutgoingRequests', async () => {
  const { data, error } = await supabase.rpc('rpc_list_outgoing_requests');
  if (error) throw new Error(friendlyOnlineError(error));
  return data || [];
});

ipcMain.handle('online:listFriends', async () => {
  const { data, error } = await supabase.rpc('rpc_list_friends');
  if (error) throw new Error(friendlyOnlineError(error));
  return data || [];
});

ipcMain.handle('online:unfriend', async (_e, friendId) => {
  const { error } = await supabase.rpc('rpc_unfriend', { p_friend_id: friendId });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

ipcMain.handle('online:sendMessage', async (_e, { friendId, body }) => {
  const { data, error } = await supabase.rpc('rpc_send_message', { p_friend_id: friendId, p_body: body });
  if (error) throw new Error(friendlyOnlineError(error));
  return data;
});

ipcMain.handle('online:listMessages', async (_e, friendId) => {
  const { data, error } = await supabase.rpc('rpc_list_messages', { p_friend_id: friendId });
  if (error) throw new Error(friendlyOnlineError(error));
  return data || [];
});

ipcMain.handle('online:markMessagesRead', async (_e, friendId) => {
  const { error } = await supabase.rpc('rpc_mark_messages_read', { p_friend_id: friendId });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

// ---------- групповые чаты (см. таблицы groups/group_members/group_messages в supabase_schema.sql) ----------

ipcMain.handle('online:createGroup', async (_e, { name, memberIds }) => {
  const { data, error } = await supabase.rpc('rpc_create_group', { p_name: name, p_member_ids: memberIds || [] });
  if (error) throw new Error(friendlyOnlineError(error));
  return data;
});

ipcMain.handle('online:listGroups', async () => {
  const { data, error } = await supabase.rpc('rpc_list_groups');
  if (error) throw new Error(friendlyOnlineError(error));
  return data || [];
});

ipcMain.handle('online:listGroupMembers', async (_e, groupId) => {
  const { data, error } = await supabase.rpc('rpc_list_group_members', { p_group_id: groupId });
  if (error) throw new Error(friendlyOnlineError(error));
  return data || [];
});

ipcMain.handle('online:addGroupMember', async (_e, { groupId, userId }) => {
  const { error } = await supabase.rpc('rpc_add_group_member', { p_group_id: groupId, p_user_id: userId });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

ipcMain.handle('online:leaveGroup', async (_e, groupId) => {
  const { error } = await supabase.rpc('rpc_leave_group', { p_group_id: groupId });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

ipcMain.handle('online:removeGroupMember', async (_e, { groupId, userId }) => {
  const { error } = await supabase.rpc('rpc_remove_group_member', { p_group_id: groupId, p_user_id: userId });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

ipcMain.handle('online:setGroupName', async (_e, { groupId, name }) => {
  const { error } = await supabase.rpc('rpc_set_group_name', { p_group_id: groupId, p_name: name });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

ipcMain.handle('online:setGroupAvatar', async (_e, { groupId, avatarUrl }) => {
  const { error } = await supabase.rpc('rpc_set_group_avatar', { p_group_id: groupId, p_avatar_url: avatarUrl });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

ipcMain.handle('online:sendGroupMessage', async (_e, { groupId, body }) => {
  const { data, error } = await supabase.rpc('rpc_send_group_message', { p_group_id: groupId, p_body: body });
  if (error) throw new Error(friendlyOnlineError(error));
  return data;
});

ipcMain.handle('online:listGroupMessages', async (_e, groupId) => {
  const { data, error } = await supabase.rpc('rpc_list_group_messages', { p_group_id: groupId });
  if (error) throw new Error(friendlyOnlineError(error));
  return data || [];
});

ipcMain.handle('online:markGroupRead', async (_e, groupId) => {
  const { error } = await supabase.rpc('rpc_mark_group_read', { p_group_id: groupId });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

ipcMain.handle('online:setBio', async (_e, bio) => {
  const { error } = await supabase.rpc('rpc_set_bio', { p_bio: bio });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

ipcMain.handle('online:setAvatarFrame', async (_e, frame) => {
  const { error } = await supabase.rpc('rpc_set_avatar_frame', { p_frame: frame || null });
  if (error) throw new Error(friendlyOnlineError(error));
  onlineState.avatarFrame = frame || null;
  return true;
});

ipcMain.handle('online:getProfile', async (_e, userId) => {
  const { data, error } = await supabase.rpc('rpc_get_profile', { p_user_id: userId }).maybeSingle();
  if (error) throw new Error(friendlyOnlineError(error));
  return data || null;
});

ipcMain.handle('online:toggleProfileLike', async (_e, profileId) => {
  const { data, error } = await supabase.rpc('rpc_toggle_profile_like', { p_profile_id: profileId });
  if (error) throw new Error(friendlyOnlineError(error));
  return data;
});

// Синхронизация закладок — best-effort, вызывается при каждом изменении
// локальной библиотеки. Ошибки (например, нет сети) не пробрасываются наверх,
// чтобы не мешать основной локальной операции — просто вернём false.
ipcMain.handle('online:syncBookmarkUpsert', async (_e, { mangaId, title, coverUrl, status }) => {
  if (!onlineState.ready) return false;
  const { error } = await supabase.rpc('rpc_upsert_bookmark', {
    p_manga_id: mangaId, p_title: title, p_cover_url: coverUrl || null, p_status: status || null,
  });
  return !error;
});

ipcMain.handle('online:syncBookmarkRemove', async (_e, mangaId) => {
  if (!onlineState.ready) return false;
  const { error } = await supabase.rpc('rpc_remove_bookmark', { p_manga_id: mangaId });
  return !error;
});

ipcMain.handle('online:listBookmarks', async (_e, userId) => {
  const { data, error } = await supabase.rpc('rpc_list_bookmarks', { p_user_id: userId });
  if (error) throw new Error(friendlyOnlineError(error));
  return data || [];
});

ipcMain.handle('online:listProfileComments', async (_e, profileId) => {
  const { data, error } = await supabase.rpc('rpc_list_profile_comments', { p_profile_id: profileId });
  if (error) throw new Error(friendlyOnlineError(error));
  return data || [];
});

ipcMain.handle('online:addProfileComment', async (_e, { profileId, body }) => {
  const { data, error } = await supabase.rpc('rpc_add_profile_comment', { p_profile_id: profileId, p_body: body }).maybeSingle();
  if (error) throw new Error(friendlyOnlineError(error));
  return data;
});

ipcMain.handle('online:deleteProfileComment', async (_e, commentId) => {
  const { error } = await supabase.rpc('rpc_delete_profile_comment', { p_comment_id: commentId });
  if (error) throw new Error(friendlyOnlineError(error));
  return true;
});

// ---------- Личный бэкап библиотеки и истории (НЕ видно друзьям) ----------
// Отдельно от bookmarks выше (та таблица — только то, что видно друзьям на
// профиле: название/обложка/статус). Здесь — полная копия для восстановления
// на другом ПК: заметки, свои комментарии к тайтлу и прогресс чтения/просмотра.
// Скачанные главы сюда намеренно не входят — они тяжёлые, их проще на новом
// устройстве просто скачать заново.
//
// Отправка (push) встроена прямо в обработчики library:*/history:* ниже по
// файлу — каждое локальное изменение молча пытается уехать в облако, ошибки
// (офлайн, не авторизован) просто проглатываются, локальная операция от этого
// никогда не страдает.
//
// Восстановление (pull) — только online:syncPullAll: догружает то, чего нет
// локально, и доливает наверх то, чего ещё нет в облаке (разовый бэкфилл для
// уже существующей локальной библиотеки). Существующие с обеих сторон записи
// не перезаписываются — так безопаснее, если однажды всё-таки читаешь с двух
// устройств одновременно, ничего не затрётся.

function pushLibraryItem(kind, item) {
  if (!onlineState.ready || !item) return;
  Promise.resolve(supabase.rpc('rpc_upsert_library_item', {
    p_kind: kind,
    p_item_id: item.id,
    p_title: item.title,
    p_cover_url: item.coverUrl || null,
    p_status: item.status || null,
    p_note: item.note || null,
    p_comments: Array.isArray(item.comments) ? item.comments : [],
    p_chapter_id: item.progress?.chapterId || null,
    p_chapter_label: item.progress?.chapterLabel || null,
    p_page: typeof item.progress?.page === 'number' ? item.progress.page : null,
  })).catch(() => {});
}

function pushLibraryRemove(kind, itemId) {
  if (!onlineState.ready) return;
  Promise.resolve(supabase.rpc('rpc_remove_library_item', { p_kind: kind, p_item_id: itemId })).catch(() => {});
}

function pushHistoryItem(kind, entry) {
  if (!onlineState.ready || !entry) return;
  const itemId = kind === 'anime' ? entry.releaseId : entry.mangaId;
  Promise.resolve(supabase.rpc('rpc_upsert_history_item', {
    p_kind: kind,
    p_item_id: itemId,
    p_title: entry.title,
    p_cover_url: entry.coverUrl || null,
    p_chapter_id: kind === 'anime' ? null : (entry.chapterId || null),
    p_chapter_label: kind === 'anime' ? (entry.episodeLabel || null) : (entry.chapterLabel || null),
    p_page: kind === 'anime' ? (entry.episodeIndex ?? null) : (entry.page ?? null),
    p_position_sec: kind === 'anime' ? (entry.positionSec ?? null) : null,
  })).catch(() => {});
}

function pushHistoryRemove(kind, itemId) {
  if (!onlineState.ready) return;
  Promise.resolve(supabase.rpc('rpc_remove_history_item', { p_kind: kind, p_item_id: itemId })).catch(() => {});
}

function pushHistoryClear(kind) {
  if (!onlineState.ready) return;
  Promise.resolve(supabase.rpc('rpc_clear_history_items', { p_kind: kind })).catch(() => {});
}


ipcMain.handle('online:syncPullAll', async () => {
  if (!onlineState.ready) return null;
  const [libRes, histRes] = await Promise.all([
    supabase.rpc('rpc_list_library_items'),
    supabase.rpc('rpc_list_history_items'),
  ]);
  if (libRes.error || histRes.error) return null;

  const cloudLibrary = libRes.data || [];
  const cloudHistory = histRes.data || [];

  const library = await loadLibrary();
  const animeLibrary = await loadAnimeLibrary();
  let changedLibrary = false;
  let changedAnimeLibrary = false;

  for (const row of cloudLibrary) {
    const list = row.kind === 'anime' ? animeLibrary : library;
    if (!list.some((i) => i.id === row.item_id)) {
      const restored = {
        id: row.item_id, title: row.title, coverUrl: row.cover_url, status: row.status,
        addedAt: new Date(row.added_at).getTime(),
      };
      if (row.note) restored.note = row.note;
      if (Array.isArray(row.comments) && row.comments.length) restored.comments = row.comments;
      if (row.chapter_id || row.chapter_label || typeof row.page === 'number') {
        restored.progress = {
          chapterId: row.chapter_id, chapterLabel: row.chapter_label, page: row.page,
          updatedAt: new Date(row.updated_at).getTime(),
        };
      }
      list.push(restored);
      if (row.kind === 'anime') changedAnimeLibrary = true; else changedLibrary = true;
    }
  }
  if (changedLibrary) await saveLibrary(library);
  if (changedAnimeLibrary) await saveAnimeLibrary(animeLibrary);

  // локальные тайтлы, которых ещё нет в облаке — доливаем (разовый бэкфилл
  // + подхватит то, что успели добавить, пока были офлайн)
  const cloudLibKeys = new Set(cloudLibrary.map((r) => `${r.kind}:${r.item_id}`));
  for (const item of library) if (!cloudLibKeys.has(`manga:${item.id}`)) pushLibraryItem('manga', item);
  for (const item of animeLibrary) if (!cloudLibKeys.has(`anime:${item.id}`)) pushLibraryItem('anime', item);

  const history = await loadHistory();
  const animeHistory = await loadAnimeHistory();
  let changedHistory = false;
  let changedAnimeHistory = false;

  for (const row of cloudHistory) {
    const list = row.kind === 'anime' ? animeHistory : history;
    const has = row.kind === 'anime'
      ? list.some((i) => i.releaseId === row.item_id)
      : list.some((i) => i.mangaId === row.item_id);
    if (!has) {
      const restored = row.kind === 'anime'
        ? {
            releaseId: row.item_id, title: row.title, coverUrl: row.cover_url,
            episodeIndex: row.page, episodeLabel: row.chapter_label,
            positionSec: row.position_sec || 0, updatedAt: new Date(row.updated_at).getTime(),
          }
        : {
            mangaId: row.item_id, title: row.title, coverUrl: row.cover_url,
            chapterId: row.chapter_id, chapterLabel: row.chapter_label, page: row.page,
            updatedAt: new Date(row.updated_at).getTime(),
          };
      list.push(restored);
      if (row.kind === 'anime') changedAnimeHistory = true; else changedHistory = true;
    }
  }
  if (changedHistory) { history.sort((a, b) => b.updatedAt - a.updatedAt); await saveHistory(history); }
  if (changedAnimeHistory) { animeHistory.sort((a, b) => b.updatedAt - a.updatedAt); await saveAnimeHistory(animeHistory); }

  const cloudHistKeys = new Set(cloudHistory.map((r) => `${r.kind}:${r.item_id}`));
  for (const entry of history) if (!cloudHistKeys.has(`manga:${entry.mangaId}`)) pushHistoryItem('manga', entry);
  for (const entry of animeHistory) if (!cloudHistKeys.has(`anime:${entry.releaseId}`)) pushHistoryItem('anime', entry);

  return { library, animeLibrary, history, animeHistory };
});