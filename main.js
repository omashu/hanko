// main.js — главный процесс Electron.
// Тут и только тут есть доступ к файловой системе и сети.
// Окно (renderer) ничего не может напрямую — только через preload.js + ipc.

const { app, BrowserWindow, ipcMain, shell, dialog, Menu, Tray, session } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { autoUpdater } = require('electron-updater');
const { createClient } = require('@supabase/supabase-js');
// у @supabase/supabase-js реалтайм (чат/уведомления вживую) работает через WebSocket;
// в браузере он есть глобально, а в Node (наш главный процесс) — нет, поэтому
// подставляем реализацию из пакета "ws" перед созданием клиента.
if (!global.WebSocket) global.WebSocket = require('ws');

const SETTINGS_PATH = () => path.join(app.getPath('userData'), 'settings.json');
const LIBRARY_PATH = () => path.join(app.getPath('userData'), 'library.json');
const HISTORY_PATH = () => path.join(app.getPath('userData'), 'history.json');
const ANIME_LIBRARY_PATH = () => path.join(app.getPath('userData'), 'anime-library.json');
const ANIME_HISTORY_PATH = () => path.join(app.getPath('userData'), 'anime-history.json');
const SITES_PATH = () => path.join(app.getPath('userData'), 'sites.json');
const DOWNLOADS_DIR = () => path.join(app.getPath('userData'), 'downloads');
const DOWNLOADS_INDEX_PATH = () => path.join(DOWNLOADS_DIR(), 'index.json');
const PROFILE_PATH = () => path.join(app.getPath('userData'), 'profile.json');
const AVATAR_DIR = () => path.join(app.getPath('userData'), 'avatar');
const ONLINE_SESSION_PATH = () => path.join(app.getPath('userData'), 'online-session.json');

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
  const avatarUrl = profile.avatarFile ? `file://${path.join(AVATAR_DIR(), profile.avatarFile)}` : null;
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
    } else {
      details.requestHeaders['Referer'] = 'https://mangadex.org/';
    }
    details.requestHeaders['User-Agent'] = USER_AGENT;
    callback({ requestHeaders: details.requestHeaders });
  });
}

// ---------- окно ----------

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
      webviewTag: true, // нужен для встроенной вкладки-браузера в разделе "Аниме"
    },
    autoHideMenuBar: true,
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
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

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId('com.hanko.app');
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
  if (idx >= 0) items[idx] = { ...items[idx], ...item };
  else items.unshift(item);
  return saveLibrary(items);
});

ipcMain.handle('library:remove', async (_e, id) => {
  const items = (await loadLibrary()).filter((i) => i.id !== id);
  return saveLibrary(items);
});

ipcMain.handle('library:progress', async (_e, { id, chapterId, chapterLabel, page }) => {
  const items = await loadLibrary();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx].progress = { chapterId, chapterLabel, page, updatedAt: Date.now() };
    await saveLibrary(items);
  }
  return items;
});

ipcMain.handle('history:load', () => loadHistory());

ipcMain.handle('history:progress', async (_e, { mangaId, title, coverUrl, chapterId, chapterLabel, page }) => {
  const items = await loadHistory();
  const filtered = items.filter((i) => i.mangaId !== mangaId);
  filtered.unshift({ mangaId, title, coverUrl, chapterId, chapterLabel, page, updatedAt: Date.now() });
  return saveHistory(filtered);
});

ipcMain.handle('history:remove', async (_e, mangaId) => {
  const items = (await loadHistory()).filter((i) => i.mangaId !== mangaId);
  return saveHistory(items);
});

ipcMain.handle('history:clear', () => saveHistory([]));

ipcMain.handle('anime-library:load', () => loadAnimeLibrary());

ipcMain.handle('anime-library:upsert', async (_e, item) => {
  const items = await loadAnimeLibrary();
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = { ...items[idx], ...item };
  else items.push({ ...item, addedAt: Date.now() });
  return saveAnimeLibrary(items);
});

ipcMain.handle('anime-library:remove', async (_e, id) => {
  const items = (await loadAnimeLibrary()).filter((i) => i.id !== id);
  return saveAnimeLibrary(items);
});

ipcMain.handle('anime-history:load', () => loadAnimeHistory());

ipcMain.handle('anime-history:progress', async (_e, { releaseId, title, coverUrl, episodeIndex, episodeLabel }) => {
  const items = await loadAnimeHistory();
  const filtered = items.filter((i) => i.releaseId !== releaseId);
  filtered.unshift({ releaseId, title, coverUrl, episodeIndex, episodeLabel, updatedAt: Date.now() });
  return saveAnimeHistory(filtered);
});

ipcMain.handle('anime-history:remove', async (_e, releaseId) => {
  const items = (await loadAnimeHistory()).filter((i) => i.releaseId !== releaseId);
  return saveAnimeHistory(items);
});

ipcMain.handle('anime-history:clear', () => saveAnimeHistory([]));

ipcMain.handle('library:note', async (_e, { id, note }) => {
  const items = await loadLibrary();
  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) {
    items[idx].note = note;
    await saveLibrary(items);
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

// ---------- IPC: профиль (локально: имя, аватар, "о себе") ----------
// Живёт только на диске пользователя. Настоящие друзья/чат — отдельный блок
// ниже ("ОНЛАЙН"), через Supabase.

ipcMain.handle('profile:load', () => loadProfile());
ipcMain.handle('profile:save', (_e, partial) => saveProfile(partial || {}));

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
  await fs.mkdir(AVATAR_DIR(), { recursive: true });

  // подчищаем файл предыдущего аватара, если он был
  const current = await readProfileRaw();
  if (current.avatarFile) {
    await fs.rm(path.join(AVATAR_DIR(), current.avatarFile), { force: true }).catch(() => {});
  }

  const fileName = `avatar_${Date.now()}${ext}`;
  await fs.copyFile(src, path.join(AVATAR_DIR(), fileName));
  return saveProfile({ avatarFile: fileName });
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

async function mapMangaList(data) {
  const items = (data.data || []).map((m) => {
    const cover = (m.relationships || []).find((r) => r.type === 'cover_art');
    const fileName = cover?.attributes?.fileName;
    return {
      id: m.id,
      title: pickTitle(m.attributes),
      description: (m.attributes?.description?.ru || m.attributes?.description?.en || '').slice(0, 400),
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

// "Популярное" — просто каталог без фильтра поиска (он у AniLibria и так
// приходит отсортированным по свежести/активности релизов)
async function aniPopular({ limit = 24 } = {}) {
  return aniSearch({ limit });
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

ipcMain.handle('anilibria:episodes', async (_e, animeId) => {
  const aniId = animeId.startsWith(ANILIBRIA_PREFIX) ? animeId.slice(ANILIBRIA_PREFIX.length) : animeId;
  return aniEpisodes(aniId);
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
ipcMain.handle('mangadex:popular', async () => {
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

  let mdId = (isRemanga || isWamanga || isMangabuff) ? null : mangaId;
  let rmDir = isRemanga ? mangaId.slice(REMANGA_PREFIX.length) : null;
  let waType = null, waSlug = null;
  if (isWamanga) ({ type: waType, slug: waSlug } = parseWamangaId(mangaId));
  let mbSlug = isMangabuff ? mangaId.slice(MANGABUFF_PREFIX.length) : null;

  // Эти четыре поиска совпадения по названию независимы друг от друга, поэтому
  // гоняем их параллельно, а не по очереди — раньше был await один за другим,
  // и если один из источников подвисал (ещё не помеченный sourceHealth как
  // "лежит"), это добавляло его личный таймаут+ретрай (до 30 сек) ко ВСЕЙ
  // цепочке целиком, прежде чем дело доходило до следующего источника. Именно
  // это, похоже, и ощущалось как "тайтл долго грузится, хотя все сайты вроде
  // живы" — теперь худший случай это самый медленный источник, а не их сумма.
  const [mdMatch, rmMatch, waMatch, mbMatch] = await Promise.all([
    (!mdId && title) ? findMangadexMatchForTitle(title).catch(() => null) : null,
    (!rmDir && title) ? findRemangaMatchForTitle(title).catch(() => null) : null,
    (!waType && title) ? findWamangaMatchForTitle(title).catch(() => null) : null,
    (!mbSlug && title) ? findMangabuffMatchForTitle(title).catch(() => null) : null,
  ]);
  if (!mdId && mdMatch) mdId = mdMatch;
  if (!rmDir && rmMatch) rmDir = rmMatch.id.slice(REMANGA_PREFIX.length);
  if (!waType && waMatch) ({ type: waType, slug: waSlug } = parseWamangaId(waMatch.id));
  if (!mbSlug && mbMatch) mbSlug = mbMatch.id.slice(MANGABUFF_PREFIX.length);

  const [enItems, mdRuItems, rmRuItems, waRuItems, mbRuItems] = await Promise.all([
    mdId ? mdChaptersFeed(mdId, ['en']).catch(() => []) : [],
    mdId ? mdChaptersFeed(mdId, ['ru']).catch(() => []) : [],
    rmDir ? remangaChapters(rmDir).catch(() => []) : [],
    waType ? waChapters(waType, waSlug).catch(() => []) : [],
    mbSlug ? mbChapters(mbSlug).catch(() => []) : [],
  ]);

  // из источников RU (MangaDex/ReManga/WaManga/MangaBuff) берём тот, где глав больше
  const ruCandidates = [
    { name: 'MangaDex', items: mdRuItems },
    { name: 'ReManga', items: rmRuItems },
    { name: 'WaManga', items: waRuItems },
    { name: 'MangaBuff', items: mbRuItems },
  ];
  let winner = ruCandidates.reduce((best, cur) => (cur.items.length > best.items.length ? cur : best));

  // Предохранитель только для MangaBuff: список глав парсится из отдельного HTML
  // (карточка тайтла) независимо от страниц конкретной главы, поэтому у тайтла
  // формально может быть больше всего глав, а сам парсинг страниц при этом
  // сломан для конкретной разметки (как было с regex \w на кириллице) — тайтл
  // выигрывает сравнение, но открывается пустым. Проверяем это пробным запросом
  // первой главы и, если страниц 0, откатываемся на следующего по числу глав.
  // ReManga/WaManga этой проверкой не трогаем — по опыту пользователя они
  // надёжнее и лишний сетевой запрос на каждое открытие тайтла того не стоит.
  if (winner.name === 'MangaBuff' && winner.items.length) {
    const first = winner.items[0];
    const m = /^mb:(.+):([^:]+):([^:]+)$/.exec(first.id);
    let pagesOk = false;
    if (m) {
      const [, slug, vol, chapter] = m;
      try {
        const pages = await mbPages(slug, vol, chapter);
        pagesOk = pages.length > 0;
      } catch {
        pagesOk = false;
      }
    }
    if (!pagesOk) {
      const fallback = ruCandidates
        .filter((c) => c.name !== 'MangaBuff')
        .reduce((best, cur) => (cur.items.length > best.items.length ? cur : best));
      console.error(
        `[MangaBuff] выбран победителем по числу глав (${winner.items.length}), но пробная проверка первой главы вернула 0 страниц — откат на ${fallback.name} (${fallback.items.length} глав)`,
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
  return files.map((f) => `file://${path.join(folder, f)}`);
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

ipcMain.handle('online:setBio', async (_e, bio) => {
  const { error } = await supabase.rpc('rpc_set_bio', { p_bio: bio });
  if (error) throw new Error(friendlyOnlineError(error));
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