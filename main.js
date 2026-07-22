// main.js — главный процесс Electron.
// Тут и только тут есть доступ к файловой системе и сети.
// Окно (renderer) ничего не может напрямую — только через preload.js + ipc.

const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
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

// ---------- окно ----------

function createWindow() {
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#10131a',
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

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('Проверка обновлений не удалась:', err?.message || err);
  });
}

ipcMain.handle('update:getStatus', () => lastUpdateStatus);

ipcMain.handle('update:install', () => {
  // isSilent=true — ставит без видимого окна NSIS-инсталлятора (так это
  // ощущается как обновление на месте, а не переустановка), isForceRunAfter=true
  // — сам перезапускает приложение после установки
  autoUpdater.quitAndInstall(true, true);
});

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdate();
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

async function mdFetch(url) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`MangaDex вернул HTTP ${res.status}`);
  return res.json();
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

function mapMangaList(data) {
  return (data.data || []).map((m) => {
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
}

ipcMain.handle('mangadex:search', async (_e, query) => {
  const params = new URLSearchParams({
    title: query,
    limit: '24',
    'order[relevance]': 'desc',
  });
  params.append('includes[]', 'cover_art');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');

  const data = await mdFetch(`${MANGADEX_API}/manga?${params.toString()}`);
  return mapMangaList(data);
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
  return mapMangaList(data);
});

ipcMain.handle('mangadex:chapters', async (_e, mangaId) => {
  const params = new URLSearchParams({
    limit: '200',
    'order[chapter]': 'asc',
  });
  params.append('translatedLanguage[]', 'ru');
  params.append('translatedLanguage[]', 'en');
  const data = await mdFetch(`${MANGADEX_API}/manga/${mangaId}/feed?${params.toString()}`);
  return (data.data || []).map((c) => ({
    id: c.id,
    chapter: c.attributes?.chapter,
    title: c.attributes?.title,
    lang: c.attributes?.translatedLanguage,
    pages: c.attributes?.pages,
  }));
});

async function getChapterPages(chapterId) {
  const data = await mdFetch(`${MANGADEX_API}/at-home/server/${chapterId}`);
  const base = data.baseUrl;
  const hash = data.chapter?.hash;
  const files = data.chapter?.data || [];
  return files.map((f) => `${base}/data/${hash}/${f}`);
}

ipcMain.handle('mangadex:pages', async (_e, chapterId) => getChapterPages(chapterId));

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

// ---------- IPC: локальные загрузки глав (офлайн-чтение) ----------

function downloadEntryFolder(mangaId, chapterId) {
  return path.join(DOWNLOADS_DIR(), mangaId, chapterId);
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
  await fs.rm(path.join(DOWNLOADS_DIR(), mangaId), { recursive: true, force: true }).catch(() => {});
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
    const pages = await getChapterPages(chapterId);
    for (let i = 0; i < pages.length; i++) {
      if (controller.signal.aborted) throw new DOMException('Отменено', 'AbortError');
      const url = pages[i];
      const ext = (url.split('.').pop() || 'jpg').split('?')[0].slice(0, 5);
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: controller.signal });
      if (!res.ok) throw new Error(`Страница ${i + 1}: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const fileName = `${String(i + 1).padStart(3, '0')}.${ext}`;
      await fs.writeFile(path.join(folder, fileName), buf);
      sendProgress({ done: i + 1, total: pages.length });
    }

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