// renderer.js — обычный JS без доступа к Node. Всё, что нужно с диска/сети,
// идёт через window.hanko (см. preload.js).

const els = {
  navHome: document.getElementById('navHome'),
  navManga: document.getElementById('navManga'),
  navAnime: document.getElementById('navAnime'),
  navProfile: document.getElementById('navProfile'),
  navFriends: document.getElementById('navFriends'),
  friendsNavBadge: document.getElementById('friendsNavBadge'),
  viewHome: document.getElementById('viewHome'),
  viewManga: document.getElementById('viewManga'),
  viewAnime: document.getElementById('viewAnime'),
  viewProfile: document.getElementById('viewProfile'),
  viewFriends: document.getElementById('viewFriends'),

  profileAvatarBtn: document.getElementById('profileAvatarBtn'),
  profileAvatarImg: document.getElementById('profileAvatarImg'),
  profileAvatarFallback: document.getElementById('profileAvatarFallback'),
  profileNameInput: document.getElementById('profileNameInput'),
  profileBioInput: document.getElementById('profileBioInput'),
  profileMangaGrid: document.getElementById('profileMangaGrid'),
  profileMangaEmpty: document.getElementById('profileMangaEmpty'),
  profileSitesGrid: document.getElementById('profileSitesGrid'),
  profileSitesEmpty: document.getElementById('profileSitesEmpty'),
  profileStats: document.getElementById('profileStats'),

  accountStatusText: document.getElementById('accountStatusText'),
  authForms: document.getElementById('authForms'),
  registerForm: document.getElementById('registerForm'),
  registerEmail: document.getElementById('registerEmail'),
  registerPassword: document.getElementById('registerPassword'),
  loginForm: document.getElementById('loginForm'),
  loginEmail: document.getElementById('loginEmail'),
  loginPassword: document.getElementById('loginPassword'),
  authFeedback: document.getElementById('authFeedback'),
  logoutBtn: document.getElementById('logoutBtn'),

  onlineStatusHint: document.getElementById('onlineStatusHint'),
  onlineRetryBtn: document.getElementById('onlineRetryBtn'),
  usernameRow: document.getElementById('usernameRow'),
  usernameValue: document.getElementById('usernameValue'),
  usernameEditBtn: document.getElementById('usernameEditBtn'),
  usernameForm: document.getElementById('usernameForm'),
  usernameInput: document.getElementById('usernameInput'),
  usernameFeedback: document.getElementById('usernameFeedback'),
  addFriendBtn: document.getElementById('addFriendBtn'),
  addFriendModalBackdrop: document.getElementById('addFriendModalBackdrop'),
  addFriendModalClose: document.getElementById('addFriendModalClose'),
  addFriendForm: document.getElementById('addFriendForm'),
  addFriendInput: document.getElementById('addFriendInput'),
  addFriendPreview: document.getElementById('addFriendPreview'),
  addFriendFeedback: document.getElementById('addFriendFeedback'),
  incomingRequestsList: document.getElementById('incomingRequestsList'),
  incomingRequestsEmpty: document.getElementById('incomingRequestsEmpty'),
  outgoingRequestsList: document.getElementById('outgoingRequestsList'),
  outgoingRequestsEmpty: document.getElementById('outgoingRequestsEmpty'),
  requestsBtn: document.getElementById('requestsBtn'),
  requestsBadge: document.getElementById('requestsBadge'),
  requestsModalBackdrop: document.getElementById('requestsModalBackdrop'),
  requestsModalClose: document.getElementById('requestsModalClose'),
  friendsList: document.getElementById('friendsList'),
  friendsListEmpty: document.getElementById('friendsListEmpty'),

  chatOverlay: document.getElementById('chatOverlay'),
  chatBack: document.getElementById('chatBack'),
  chatAvatar: document.getElementById('chatAvatar'),
  chatTitle: document.getElementById('chatTitle'),
  chatOnlineLabel: document.getElementById('chatOnlineLabel'),
  chatBody: document.getElementById('chatBody'),
  chatForm: document.getElementById('chatForm'),
  chatInput: document.getElementById('chatInput'),

  friendProfileOverlay: document.getElementById('friendProfileOverlay'),
  friendProfileBack: document.getElementById('friendProfileBack'),
  friendProfileAvatar: document.getElementById('friendProfileAvatar'),
  friendProfileName: document.getElementById('friendProfileName'),
  friendProfileOnlineLabel: document.getElementById('friendProfileOnlineLabel'),
  friendProfileBio: document.getElementById('friendProfileBio'),
  friendProfileError: document.getElementById('friendProfileError'),
  friendBookmarksEmpty: document.getElementById('friendBookmarksEmpty'),
  friendBookmarksGrid: document.getElementById('friendBookmarksGrid'),
  friendCommentsEmpty: document.getElementById('friendCommentsEmpty'),
  friendCommentsList: document.getElementById('friendCommentsList'),
  friendCommentForm: document.getElementById('friendCommentForm'),
  friendCommentInput: document.getElementById('friendCommentInput'),
  friendCommentFeedback: document.getElementById('friendCommentFeedback'),

  downloadsRemoveAllBtn: document.getElementById('downloadsRemoveAllBtn'),

  homeMangaGrid: document.getElementById('homeMangaGrid'),
  homeMangaHint: document.getElementById('homeMangaHint'),
  homeAnimeGrid: document.getElementById('homeAnimeGrid'),
  homeAnimeHint: document.getElementById('homeAnimeHint'),

  mangaSearchForm: document.getElementById('mangaSearchForm'),
  mangaSearchInput: document.getElementById('mangaSearchInput'),
  mangaSearchSection: document.getElementById('mangaSearchSection'),
  mangaSearchGrid: document.getElementById('mangaSearchGrid'),
  mangaLibraryGrid: document.getElementById('mangaLibraryGrid'),
  mangaLibraryEmpty: document.getElementById('mangaLibraryEmpty'),

  downloadsList: document.getElementById('downloadsList'),
  downloadsEmpty: document.getElementById('downloadsEmpty'),

  sitesGrid: document.getElementById('sitesGrid'),
  addSiteBtn: document.getElementById('addSiteBtn'),
  browserPane: document.getElementById('browserPane'),
  browserUrl: document.getElementById('browserUrl'),
  browserBack: document.getElementById('browserBack'),
  browserForward: document.getElementById('browserForward'),
  browserReload: document.getElementById('browserReload'),
  browserClose: document.getElementById('browserClose'),
  siteWebview: document.getElementById('siteWebview'),
  siteNote: document.getElementById('siteNote'),

  siteModalBackdrop: document.getElementById('siteModalBackdrop'),
  siteModalForm: document.getElementById('siteModalForm'),
  siteModalCancel: document.getElementById('siteModalCancel'),
  siteNameInput: document.getElementById('siteNameInput'),
  siteUrlInput: document.getElementById('siteUrlInput'),

  titleModalBackdrop: document.getElementById('titleModalBackdrop'),
  titleModalBody: document.getElementById('titleModalBody'),
  titleModalClose: document.getElementById('titleModalClose'),

  readerOverlay: document.getElementById('readerOverlay'),
  readerBack: document.getElementById('readerBack'),
  readerTitle: document.getElementById('readerTitle'),
  readerRefresh: document.getElementById('readerRefresh'),
  readerBody: document.getElementById('readerBody'),
  readerPaged: document.getElementById('readerPaged'),
  readerPageControls: document.getElementById('readerPageControls'),
  readerPrev: document.getElementById('readerPrev'),
  readerNext: document.getElementById('readerNext'),
  readerPageLabel: document.getElementById('readerPageLabel'),
  readerModePaged: document.getElementById('readerModePaged'),
  readerModeScroll: document.getElementById('readerModeScroll'),
  zoomInBtn: document.getElementById('zoomInBtn'),
  zoomOutBtn: document.getElementById('zoomOutBtn'),
  zoomLabel: document.getElementById('zoomLabel'),
  chapterPrevBtn: document.getElementById('chapterPrevBtn'),
  chapterNextBtn: document.getElementById('chapterNextBtn'),
};

let library = [];
let sites = [];
let downloads = [];
let profile = null;
let currentSiteId = null;

let onlineState = { ready: false, connecting: true, error: null, myId: null, friendCode: null };
let onlineInitStarted = false;
let incomingRequests = [];
let outgoingRequests = [];
let friendsList = [];
const unreadFriendIds = new Set();
let onlineFriendIds = new Set();
let activeChat = null; // { friendId, name }
let activeFriendProfile = null; // { friendId, name }

let reader = {
  mangaId: null,
  mangaTitle: '',
  coverUrl: '',
  title: '',
  pages: [],
  mode: 'paged',
  zoom: 1,
  page: 0,
  chapterId: null,
  chapterLabel: '',
  chapters: [],
  chapterIndex: -1,
  offline: false,
};

// ---------------- навигация между разделами ----------------

function showView(name) {
  const isHome = name === 'home';
  const isManga = name === 'manga';
  const isAnime = name === 'anime';
  const isProfile = name === 'profile';
  const isFriends = name === 'friends';
  els.viewHome.hidden = !isHome;
  els.viewManga.hidden = !isManga;
  els.viewAnime.hidden = !isAnime;
  els.viewProfile.hidden = !isProfile;
  els.viewFriends.hidden = !isFriends;
  els.navHome.classList.toggle('is-active', isHome);
  els.navManga.classList.toggle('is-active', isManga);
  els.navAnime.classList.toggle('is-active', isAnime);
  els.navProfile.classList.toggle('is-active', isProfile);
  els.navFriends.classList.toggle('is-active', isFriends);
  window.hanko.saveSettings({ lastTab: name });
  if (isHome) loadHomeContent();
  if (isProfile) loadProfileView();
  if (isFriends) loadFriendsView();
}

els.navHome.addEventListener('click', () => showView('home'));
els.navManga.addEventListener('click', () => showView('manga'));
els.navAnime.addEventListener('click', () => showView('anime'));
els.navProfile.addEventListener('click', () => showView('profile'));
els.navFriends.addEventListener('click', () => showView('friends'));

// ---------------- главная: витрина популярного ----------------

let homeLoaded = false;
async function loadHomeContent() {
  if (homeLoaded) return;
  homeLoaded = true;

  try {
    const items = await window.hanko.mangadexPopular();
    els.homeMangaHint.hidden = items.length > 0;
    els.homeMangaHint.textContent = 'Пусто.';
    els.homeMangaGrid.innerHTML = '';
    for (const item of items) {
      els.homeMangaGrid.appendChild(mangaCard(item, { inLibrary: library.some((l) => l.id === item.id) }));
    }
  } catch (err) {
    els.homeMangaHint.hidden = false;
    els.homeMangaHint.textContent = `Не удалось загрузить: ${err.message}`;
  }

  try {
    const items = await window.hanko.anilistTrending();
    els.homeAnimeHint.hidden = items.length > 0;
    els.homeAnimeHint.textContent = 'Пусто.';
    els.homeAnimeGrid.innerHTML = '';
    for (const item of items) {
      els.homeAnimeGrid.appendChild(animeCard(item));
    }
  } catch (err) {
    els.homeAnimeHint.hidden = false;
    els.homeAnimeHint.textContent = `Не удалось загрузить: ${err.message}`;
  }
}

function animeCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  const metaBits = [];
  if (item.format) metaBits.push(escapeHtml(item.format));
  if (item.episodes) metaBits.push(`${item.episodes} эп.`);
  if (item.score) metaBits.push(`★ ${(item.score / 10).toFixed(1)}`);

  card.innerHTML = `
    <img class="card-cover" src="${item.coverUrl || ''}" alt="" loading="lazy" onerror="this.style.opacity=0" />
    <div class="card-body">
      <p class="card-title">${escapeHtml(item.title)}</p>
      <p class="card-meta">${metaBits.join(' · ')}</p>
    </div>
  `;
  card.addEventListener('click', () => openAnimeInfoModal(item));
  return card;
}

function openAnimeInfoModal(item) {
  els.titleModalBackdrop.hidden = false;
  const metaBits = [];
  if (item.format) metaBits.push(escapeHtml(item.format));
  if (item.episodes) metaBits.push(`${item.episodes} эп.`);
  if (item.score) metaBits.push(`★ ${(item.score / 10).toFixed(1)}`);

  els.titleModalBody.innerHTML = `
    <div class="title-modal-header">
      <img src="${item.coverUrl || ''}" alt="" onerror="this.style.opacity=0" />
      <div>
        <h2>${escapeHtml(item.title)}</h2>
        <p class="card-meta" style="margin-bottom:8px;">${metaBits.join(' · ')}</p>
        <p>${escapeHtml(item.description || '')}</p>
      </div>
    </div>
    <p class="empty-hint" style="margin-top:16px;">
      Тайтл из общей базы AniList — тут только для ознакомления. Раздел «Аниме» в Hanko
      работает через твои сохранённые сайты, так что смотреть отсюда напрямую нельзя —
      но можно открыть страницу тайтла в браузере.
    </p>
    ${item.siteUrl ? '<button class="btn-secondary" id="animeOpenExternalBtn" style="margin-top:12px;">Открыть на AniList ↗</button>' : ''}
  `;
  const openBtn = document.getElementById('animeOpenExternalBtn');
  if (openBtn) openBtn.addEventListener('click', () => window.hanko.openExternal(item.siteUrl));
}

// ---------------- манга: поиск ----------------

function mangaCard(item, { inLibrary }) {
  const card = document.createElement('div');
  card.className = 'card';

  const fold = item.progress
    ? `<div class="card-fold"></div><span class="card-fold-label">${escapeHtml(item.progress.chapterLabel || '')}</span>`
    : '';
  const note = item.note
    ? `<p class="card-note">${escapeHtml(item.note)}</p>`
    : '';

  card.innerHTML = `
    ${fold}
    <img class="card-cover" src="${item.coverUrl || ''}" alt="" loading="lazy" onerror="this.style.opacity=0" />
    <div class="card-body">
      <p class="card-title">${escapeHtml(item.title)}</p>
      <p class="card-meta">${item.status ? escapeHtml(item.status) : ''}</p>
      ${note}
    </div>
    ${inLibrary ? '' : '<button class="card-add" title="В библиотеку">+</button>'}
  `;

  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-add')) return;
    openTitleModal(item);
  });

  const addBtn = card.querySelector('.card-add');
  if (addBtn) {
    addBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await window.hanko.upsertLibraryItem({
        id: item.id, title: item.title, coverUrl: item.coverUrl, status: item.status,
      });
      syncBookmarkUpsert(item);
      library = await window.hanko.loadLibrary();
      renderLibrary();
      addBtn.remove();
    });
  }

  return card;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// синхронизация закладок с Supabase — best-effort, чтобы друзья видели
// библиотеку в профиле; если офлайн или онлайн ещё не готов, просто тихо не сработает
function syncBookmarkUpsert(item) {
  window.hanko.onlineSyncBookmarkUpsert({
    mangaId: item.id, title: item.title, coverUrl: item.coverUrl, status: item.status,
  }).catch(() => {});
}
function syncBookmarkRemove(id) {
  window.hanko.onlineSyncBookmarkRemove(id).catch(() => {});
}

els.mangaSearchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = els.mangaSearchInput.value.trim();
  if (!q) return;
  els.mangaSearchGrid.innerHTML = '<p class="empty-hint">Ищу…</p>';
  els.mangaSearchSection.hidden = false;
  try {
    const results = await window.hanko.mangadexSearch(q);
    els.mangaSearchGrid.innerHTML = '';
    if (!results.length) {
      els.mangaSearchGrid.innerHTML = '<p class="empty-hint">Ничего не нашлось.</p>';
      return;
    }
    for (const item of results) {
      const inLibrary = library.some((l) => l.id === item.id);
      els.mangaSearchGrid.appendChild(mangaCard(item, { inLibrary }));
    }
  } catch (err) {
    els.mangaSearchGrid.innerHTML = `<p class="empty-hint">Не удалось получить результаты: ${escapeHtml(err.message)}</p>`;
  }
});

function renderLibrary() {
  els.mangaLibraryGrid.innerHTML = '';
  els.mangaLibraryEmpty.hidden = library.length > 0;
  for (const item of library) {
    els.mangaLibraryGrid.appendChild(mangaCard(item, { inLibrary: true }));
  }
}

// ---------------- манга: загрузки (офлайн) ----------------

function downloadRow(d) {
  const row = document.createElement('div');
  row.className = 'chapter-row';
  row.innerHTML = `
    <div class="chapter-row-main">
      <img class="download-row-cover" src="${d.coverUrl || ''}" alt="" onerror="this.style.opacity=0" />
      <span class="chapter-row-label">${escapeHtml(d.title)} — ${escapeHtml(d.chapterLabel || '')}</span>
    </div>
    <button class="download-remove-btn" title="Удалить">✕</button>
  `;
  row.addEventListener('click', (e) => {
    if (e.target.closest('.download-remove-btn')) return;
    openOfflineChapter(d);
  });
  row.querySelector('.download-remove-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    await window.hanko.removeDownload({ mangaId: d.mangaId, chapterId: d.chapterId });
    downloads = await window.hanko.listDownloads();
    renderDownloads();
  });
  return row;
}

function renderDownloads() {
  els.downloadsList.innerHTML = '';
  els.downloadsEmpty.hidden = downloads.length > 0;
  els.downloadsRemoveAllBtn.hidden = downloads.length === 0;
  for (const d of downloads) els.downloadsList.appendChild(downloadRow(d));
}

els.downloadsRemoveAllBtn.addEventListener('click', async () => {
  if (!downloads.length) return;
  if (!confirm(`Удалить все скачанные главы (${downloads.length})? Это освободит место на диске.`)) return;
  els.downloadsRemoveAllBtn.disabled = true;
  els.downloadsRemoveAllBtn.textContent = 'Удаляю…';
  await window.hanko.removeAllDownloads();
  downloads = await window.hanko.listDownloads();
  renderDownloads();
  els.downloadsRemoveAllBtn.disabled = false;
  els.downloadsRemoveAllBtn.textContent = 'Удалить все';
});

function openOfflineChapter(d) {
  const item = { id: d.mangaId, title: d.title, coverUrl: d.coverUrl };
  const chapter = { id: d.chapterId, chapter: (d.chapterLabel || '').replace(/^Гл\.\s*/, '') };
  openReader(item, chapter, { offline: true });
}

// ---------------- манга: карточка тайтла + список глав ----------------

async function openTitleModal(item) {
  els.titleModalBackdrop.hidden = false;
  els.titleModalBody.innerHTML = '<p class="empty-hint">Загружаю главы…</p>';
  try {
    const allChapters = await window.hanko.mangadexChapters(item.id);
    const inLibrary = library.some((l) => l.id === item.id);
    const libItem = library.find((l) => l.id === item.id);

    // по умолчанию показываем русские главы; если их нет вообще — берём первый
    // доступный язык. Переключатель ниже позволяет посмотреть остальные языки,
    // на которых есть перевод (обычно это en).
    const availableLangs = Array.from(new Set(allChapters.map((c) => c.lang).filter(Boolean)));
    let activeLang = availableLangs.includes('ru') ? 'ru' : (availableLangs[0] || null);
    const langLabel = { ru: 'RU', en: 'EN' };

    const noteBlock = inLibrary
      ? `<div class="title-note">
           <label for="titleNoteInput">Заметка</label>
           <input id="titleNoteInput" type="text" placeholder="напр. жду перевод новой главы" value="${escapeHtml(libItem?.note || '')}" />
         </div>`
      : '';

    const commentsBlock = inLibrary
      ? `<div class="title-comments">
           <h3 class="section-title section-title--sub">Комментарии</h3>
           <form class="comment-form" id="commentForm">
             <input id="commentInput" type="text" placeholder="Написать мысль про тайтл…" autocomplete="off" maxlength="500" />
             <button type="submit" class="btn-secondary">Добавить</button>
           </form>
           <div id="commentsList"></div>
         </div>`
      : '';

    const langToggleBlock = availableLangs.length > 1
      ? `<div class="lang-toggle" id="langToggle">${availableLangs.map((l) => `
           <button type="button" class="lang-toggle-btn" data-lang="${escapeHtml(l)}">${escapeHtml(langLabel[l] || l.toUpperCase())}</button>
         `).join('')}</div>`
      : '';

    els.titleModalBody.innerHTML = `
      <div class="title-modal-header">
        <img src="${item.coverUrl || ''}" alt="" onerror="this.style.opacity=0" />
        <div>
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.description || '')}</p>
          <button class="btn-secondary" id="libToggleBtn" style="margin-top:10px;">
            ${inLibrary ? 'Убрать из библиотеки' : 'Добавить в библиотеку'}
          </button>
        </div>
      </div>
      ${noteBlock}
      ${commentsBlock}
      <div class="chapter-list-header">
        <h3 class="section-title">Главы</h3>
        ${langToggleBlock}
        <div class="chapter-list-actions" id="chapterListActions"></div>
      </div>
      <div class="chapter-list" id="chapterList"></div>
    `;

    document.getElementById('libToggleBtn').addEventListener('click', async () => {
      if (library.some((l) => l.id === item.id)) {
        await window.hanko.removeLibraryItem(item.id);
        syncBookmarkRemove(item.id);
      } else {
        await window.hanko.upsertLibraryItem({ id: item.id, title: item.title, coverUrl: item.coverUrl, status: item.status });
        syncBookmarkUpsert(item);
      }
      library = await window.hanko.loadLibrary();
      renderLibrary();
      openTitleModal(item);
    });

    const noteInput = document.getElementById('titleNoteInput');
    if (noteInput) {
      let noteTimer = null;
      noteInput.addEventListener('input', () => {
        clearTimeout(noteTimer);
        noteTimer = setTimeout(async () => {
          await window.hanko.setLibraryNote({ id: item.id, note: noteInput.value });
          library = await window.hanko.loadLibrary();
          renderLibrary();
        }, 500);
      });
    }

    const commentForm = document.getElementById('commentForm');
    if (commentForm) {
      function renderComments() {
        const listEl = document.getElementById('commentsList');
        const currentLib = library.find((l) => l.id === item.id);
        const comments = (currentLib && currentLib.comments) || [];
        if (!comments.length) {
          listEl.innerHTML = '<p class="empty-hint">Пока пусто — можешь оставить первую мысль о тайтле.</p>';
          return;
        }
        listEl.innerHTML = '';
        for (const c of comments) {
          const row = document.createElement('div');
          row.className = 'comment-row';
          const date = new Date(c.createdAt).toLocaleString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
          });
          row.innerHTML = `
            <div class="comment-row-head">
              <span class="comment-row-date">${escapeHtml(date)}</span>
              <button class="friend-request-remove" title="Удалить">✕</button>
            </div>
            <div class="comment-row-text">${escapeHtml(c.text)}</div>
          `;
          row.querySelector('.friend-request-remove').addEventListener('click', async () => {
            library = await window.hanko.removeLibraryComment({ id: item.id, commentId: c.id });
            renderLibrary();
            renderComments();
          });
          listEl.appendChild(row);
        }
      }

      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('commentInput');
        const text = input.value.trim();
        if (!text) return;
        library = await window.hanko.addLibraryComment({ id: item.id, text });
        input.value = '';
        renderLibrary();
        renderComments();
      });

      renderComments();
    }

    function currentChapters() {
      return activeLang ? allChapters.filter((c) => c.lang === activeLang) : allChapters;
    }

    function renderChapterRows(chapters) {
      const list = document.getElementById('chapterList');
      list.innerHTML = '';
      if (!chapters.length) {
        list.innerHTML = allChapters.length
          ? '<p class="empty-hint">На этом языке глав не нашлось — переключись на другой.</p>'
          : '<p class="empty-hint">Глав на русском/английском не нашлось.</p>';
        return;
      }
      for (const ch of chapters) {
        const dl = downloads.some((d) => d.mangaId === item.id && d.chapterId === ch.id);
        const row = document.createElement('div');
        row.className = 'chapter-row';
        row.innerHTML = `
          <div class="chapter-row-main">
            <span class="chapter-row-label">Глава ${escapeHtml(ch.chapter ?? '?')}${ch.title ? ' — ' + escapeHtml(ch.title) : ''}</span>
            <span class="lang-tag">${escapeHtml(ch.lang || '')}</span>
          </div>
          <button class="chapter-download-btn ${dl ? 'is-done' : ''}" data-chapter="${escapeHtml(ch.id)}" ${dl ? 'disabled' : ''}>
            ${dl ? 'Скачано' : 'Скачать'}
          </button>
        `;
        row.addEventListener('click', (e) => {
          if (e.target.closest('.chapter-download-btn')) return;
          openReader(item, ch, { chapters });
        });
        const dlBtn = row.querySelector('.chapter-download-btn');
        dlBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (dlBtn.disabled) return;
          dlBtn.disabled = true;
          dlBtn.textContent = '0%';
          const result = await window.hanko.startDownload({
            mangaId: item.id, title: item.title, coverUrl: item.coverUrl, chapter: ch,
          });
          if (!result || result.ok === false) {
            dlBtn.disabled = false;
            dlBtn.textContent = 'Ошибка, повторить?';
          }
        });
        list.appendChild(row);
      }
    }

    function renderActions() {
      const chapters = currentChapters();
      const actionsEl = document.getElementById('chapterListActions');
      const pendingCount = chapters.filter(
        (ch) => !downloads.some((d) => d.mangaId === item.id && d.chapterId === ch.id)
      ).length;
      const downloadedCount = chapters.length - pendingCount;

      actionsEl.innerHTML = `
        ${chapters.length
          ? `<button class="btn-download-all" id="downloadAllBtn" type="button" ${pendingCount === 0 ? 'disabled' : ''}>
               ${pendingCount === 0 ? 'Все главы скачаны' : `Скачать все главы (${pendingCount})`}
             </button>`
          : ''}
        ${downloadedCount > 0
          ? `<button class="btn-download-all btn-remove-all" id="removeAllBtn" type="button">Удалить скачанные (${downloadedCount})</button>`
          : ''}
      `;

      const downloadAllBtn = document.getElementById('downloadAllBtn');
      if (downloadAllBtn) {
        // состояние текущей массовой закачки — нужно, чтобы повторный клик по
        // той же кнопке во время закачки означал «отменить», а не «начать заново»
        const bulk = { running: false, cancelRequested: false, currentChapterId: null };

        downloadAllBtn.addEventListener('click', async () => {
          if (bulk.running) {
            bulk.cancelRequested = true;
            downloadAllBtn.disabled = true;
            downloadAllBtn.textContent = 'Останавливаю…';
            if (bulk.currentChapterId) {
              await window.hanko.cancelDownload({ mangaId: item.id, chapterId: bulk.currentChapterId });
            }
            return;
          }

          const pending = chapters.filter(
            (ch) => !downloads.some((d) => d.mangaId === item.id && d.chapterId === ch.id)
          );
          if (!pending.length) return;

          bulk.running = true;
          bulk.cancelRequested = false;
          downloadAllBtn.disabled = false;
          let done = 0;
          let failed = 0;
          // качаем главы одну за другой (не параллельно) — по той же причине,
          // что и страницы внутри главы: разом сервер обрывает часть запросов
          for (const ch of pending) {
            if (bulk.cancelRequested) break;
            bulk.currentChapterId = ch.id;
            downloadAllBtn.textContent = `Отменить (${done + failed + 1} / ${pending.length})`;
            const dlBtn = document.querySelector(`.chapter-download-btn[data-chapter="${ch.id}"]`);
            if (dlBtn && !dlBtn.disabled) { dlBtn.disabled = true; dlBtn.textContent = '0%'; }
            const result = await window.hanko.startDownload({
              mangaId: item.id, title: item.title, coverUrl: item.coverUrl, chapter: ch,
            });
            if (result && result.ok !== false) {
              done++;
            } else if (result && result.cancelled) {
              bulk.cancelRequested = true;
              if (dlBtn) { dlBtn.disabled = false; dlBtn.textContent = 'Скачать'; }
            } else {
              failed++;
              if (dlBtn) { dlBtn.disabled = false; dlBtn.textContent = 'Ошибка, повторить?'; }
            }
          }
          bulk.running = false;
          bulk.currentChapterId = null;
          downloadAllBtn.disabled = false;
          downloadAllBtn.textContent = bulk.cancelRequested
            ? `Остановлено: скачано ${done}`
            : failed
              ? `Готово: ${done}, ошибок: ${failed}`
              : 'Все главы скачаны';
        });
      }

      const removeAllBtn = document.getElementById('removeAllBtn');
      if (removeAllBtn) {
        removeAllBtn.addEventListener('click', async () => {
          if (!confirm(`Удалить скачанные главы (${downloadedCount}) для «${item.title}»?`)) return;
          removeAllBtn.disabled = true;
          removeAllBtn.textContent = 'Удаляю…';
          for (const ch of chapters) {
            if (downloads.some((d) => d.mangaId === item.id && d.chapterId === ch.id)) {
              await window.hanko.removeDownload({ mangaId: item.id, chapterId: ch.id });
            }
          }
          downloads = await window.hanko.listDownloads();
          renderDownloads();
          renderActions();
          renderChapterRows(currentChapters());
        });
      }
    }

    const langToggleEl = document.getElementById('langToggle');
    if (langToggleEl) {
      const syncLangButtons = () => {
        langToggleEl.querySelectorAll('.lang-toggle-btn').forEach((b) => {
          b.classList.toggle('is-active', b.dataset.lang === activeLang);
        });
      };
      langToggleEl.querySelectorAll('.lang-toggle-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          activeLang = btn.dataset.lang;
          syncLangButtons();
          renderActions();
          renderChapterRows(currentChapters());
        });
      });
      syncLangButtons();
    }

    renderActions();
    renderChapterRows(currentChapters());
  } catch (err) {
    els.titleModalBody.innerHTML = `<p class="empty-hint">Ошибка: ${escapeHtml(err.message)}</p>`;
  }
}

function closeTitleModal() { els.titleModalBackdrop.hidden = true; }
els.titleModalClose.addEventListener('click', closeTitleModal);
els.titleModalBackdrop.addEventListener('click', (e) => { if (e.target === els.titleModalBackdrop) closeTitleModal(); });

// ---------------- ридер ----------------

async function openReader(item, chapter, opts = {}) {
  closeTitleModal();
  const chapters = opts.chapters || [];
  const chapterIndex = chapters.findIndex((c) => c.id === chapter.id);

  reader = {
    mangaId: item.id,
    mangaTitle: item.title,
    coverUrl: item.coverUrl || '',
    title: `${item.title} · Глава ${chapter.chapter ?? '?'}`,
    pages: [],
    mode: reader.mode || 'paged',
    zoom: reader.zoom || 1,
    page: 0,
    chapterId: chapter.id,
    chapterLabel: `Гл. ${chapter.chapter ?? '?'}`,
    chapters,
    chapterIndex,
    offline: !!opts.offline,
  };
  els.readerOverlay.hidden = false;
  els.readerTitle.textContent = reader.title + (reader.offline ? ' (офлайн)' : '');
  els.readerBody.innerHTML = '<p class="empty-hint" style="padding:40px;">Загружаю страницы…</p>';
  setZoom(reader.zoom);
  updateChapterNavButtons();

  try {
    const pages = reader.offline
      ? await window.hanko.downloadedPages({ mangaId: item.id, chapterId: chapter.id })
      : await window.hanko.mangadexPages(chapter.id);
    reader.pages = pages;
    renderReaderPages();
    setReaderMode(reader.mode);
    if (!reader.offline && library.some((l) => l.id === item.id)) {
      await window.hanko.setProgress({
        id: item.id, chapterId: chapter.id, chapterLabel: reader.chapterLabel, page: 0,
      });
      library = await window.hanko.loadLibrary();
      renderLibrary();
    }
  } catch (err) {
    els.readerBody.innerHTML = `<p class="empty-hint" style="padding:40px;">Не удалось загрузить страницы: ${escapeHtml(err.message)}</p>`;
  }
}

function updateChapterNavButtons() {
  const hasChapters = reader.chapters.length > 0 && reader.chapterIndex >= 0;
  els.chapterPrevBtn.disabled = !hasChapters || reader.chapterIndex <= 0;
  els.chapterNextBtn.disabled = !hasChapters || reader.chapterIndex >= reader.chapters.length - 1;
}

async function goToAdjacentChapter(direction) {
  if (!reader.chapters.length || reader.chapterIndex < 0) return;
  const newIndex = reader.chapterIndex + direction;
  if (newIndex < 0 || newIndex >= reader.chapters.length) return;
  const nextChapter = reader.chapters[newIndex];
  const item = { id: reader.mangaId, title: reader.mangaTitle, coverUrl: reader.coverUrl };
  await openReader(item, nextChapter, { chapters: reader.chapters });
}

els.chapterPrevBtn.addEventListener('click', () => goToAdjacentChapter(-1));
els.chapterNextBtn.addEventListener('click', () => goToAdjacentChapter(1));

function makeRetryButton(img, url) {
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'page-retry';
  retry.textContent = 'Страница не загрузилась — нажми, чтобы попробовать снова';
  retry.addEventListener('click', () => {
    retry.remove();
    img.classList.remove('is-broken');
    img.dataset.retries = '0';
    img.src = url + (url.includes('?') ? '&' : '?') + 'retry=' + Date.now();
  });
  return retry;
}

function attachPageErrorHandling(wrap, img, url) {
  img.addEventListener('load', () => {
    img.classList.remove('is-broken');
    const retryBtn = wrap.querySelector('.page-retry');
    if (retryBtn) retryBtn.remove();
  });
  img.addEventListener('error', () => {
    const attempts = Number(img.dataset.retries || 0);
    if (attempts < 2) {
      // автоматически подождать и попробовать снова — так исчезают
      // разовые сетевые сбои без участия человека
      img.dataset.retries = String(attempts + 1);
      setTimeout(() => {
        img.src = url + (url.includes('?') ? '&' : '?') + 'retry=' + Date.now();
      }, 1000 * (attempts + 1));
      return;
    }
    img.classList.add('is-broken');
    if (!wrap.querySelector('.page-retry')) {
      wrap.insertBefore(makeRetryButton(img, url), img);
    }
  });
}

// раздающий узел MangaDex обрывает запросы, если бить по нему всеми страницами
// главы разом (десятки параллельных соединений) — грузим очередью, не больше
// PAGE_LOAD_CONCURRENCY штук одновременно, тогда получается так же надёжно,
// как при последовательном скачивании
const PAGE_LOAD_CONCURRENCY = 3;

function loadPagesQueued(tasks, limit) {
  let cursor = 0;
  let active = 0;
  function pump() {
    while (active < limit && cursor < tasks.length) {
      const { img, url } = tasks[cursor++];
      active++;
      const release = () => { active--; pump(); };
      img.addEventListener('load', release, { once: true });
      img.addEventListener('error', release, { once: true });
      img.src = url;
    }
  }
  pump();
}

function renderReaderPages() {
  els.readerBody.innerHTML = '';
  const tasks = [];
  reader.pages.forEach((url, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'reader-page';
    wrap.dataset.index = i;
    if (i === 0) wrap.classList.add('is-current');

    const img = document.createElement('img');
    img.dataset.retries = '0';
    attachPageErrorHandling(wrap, img, url);

    wrap.appendChild(img);
    els.readerBody.appendChild(wrap);
    tasks.push({ img, url });
  });
  updatePageLabel();
  loadPagesQueued(tasks, PAGE_LOAD_CONCURRENCY);
}

function setReaderMode(mode) {
  reader.mode = mode;
  els.readerBody.classList.toggle('mode-paged', mode === 'paged');
  els.readerPageControls.style.display = mode === 'paged' ? 'flex' : 'none';
  els.readerModePaged.classList.toggle('is-active', mode === 'paged');
  els.readerModeScroll.classList.toggle('is-active', mode === 'scroll');
  if (mode === 'paged') showPage(reader.page);
}

// масштаб страниц — общий для обоих режимов чтения (постранично и скролл),
// т.к. и там, и там размер картинки задаётся одним и тем же CSS-правилом
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.1;

function setZoom(value) {
  const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
  reader.zoom = clamped;
  els.readerBody.style.setProperty('--reader-zoom', clamped);
  els.zoomLabel.textContent = `${Math.round(clamped * 100)}%`;
}

els.zoomInBtn.addEventListener('click', () => setZoom((reader.zoom || 1) + ZOOM_STEP));
els.zoomOutBtn.addEventListener('click', () => setZoom((reader.zoom || 1) - ZOOM_STEP));
els.zoomLabel.addEventListener('click', () => setZoom(1));

function showPage(idx) {
  const pages = els.readerBody.querySelectorAll('.reader-page');
  if (!pages.length) return;
  reader.page = Math.max(0, Math.min(idx, pages.length - 1));
  pages.forEach((p, i) => p.classList.toggle('is-current', i === reader.page));
  updatePageLabel();
  saveReaderProgress();
}

function updatePageLabel() {
  els.readerPageLabel.textContent = reader.pages.length
    ? `${reader.page + 1} / ${reader.pages.length}`
    : '';
}

let progressSaveTimer = null;
function saveReaderProgress() {
  if (reader.offline || !reader.mangaId || !library.some((l) => l.id === reader.mangaId)) return;
  clearTimeout(progressSaveTimer);
  progressSaveTimer = setTimeout(async () => {
    await window.hanko.setProgress({
      id: reader.mangaId, chapterId: reader.chapterId, chapterLabel: reader.chapterLabel, page: reader.page,
    });
    library = await window.hanko.loadLibrary();
    renderLibrary();
  }, 500);
}

// на последней странице «Следующая» уводит в следующую главу, а на первой
// «Предыдущая» — в предыдущую (и то же самое для стрелочек на клавиатуре)
els.readerPrev.addEventListener('click', () => {
  if (reader.page <= 0) goToAdjacentChapter(-1);
  else showPage(reader.page - 1);
});
els.readerNext.addEventListener('click', () => {
  if (reader.page >= reader.pages.length - 1) goToAdjacentChapter(1);
  else showPage(reader.page + 1);
});
els.readerModePaged.addEventListener('click', () => setReaderMode('paged'));
els.readerModeScroll.addEventListener('click', () => setReaderMode('scroll'));
els.readerBack.addEventListener('click', () => { els.readerOverlay.hidden = true; });

els.readerRefresh.addEventListener('click', async () => {
  if (!reader.chapterId || els.readerRefresh.classList.contains('is-loading')) return;
  els.readerRefresh.classList.add('is-loading');
  try {
    const pages = reader.offline
      ? await window.hanko.downloadedPages({ mangaId: reader.mangaId, chapterId: reader.chapterId })
      : await window.hanko.mangadexPages(reader.chapterId);
    reader.pages = pages;
    renderReaderPages();
    setReaderMode(reader.mode);
  } catch (err) {
    els.readerBody.innerHTML = `<p class="empty-hint" style="padding:40px;">Не удалось обновить страницы: ${escapeHtml(err.message)}</p>`;
  } finally {
    els.readerRefresh.classList.remove('is-loading');
  }
});

document.addEventListener('keydown', (e) => {
  if (els.readerOverlay.hidden) return;
  if (e.key === 'Escape') { els.readerOverlay.hidden = true; return; }
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;

  if (reader.mode !== 'paged') {
    // в вебтун-скролле нет понятия «страница» — стрелочки сразу листают главу целиком
    goToAdjacentChapter(e.key === 'ArrowRight' ? 1 : -1);
    return;
  }
  if (e.key === 'ArrowRight') {
    if (reader.page >= reader.pages.length - 1) goToAdjacentChapter(1);
    else showPage(reader.page + 1);
  }
  if (e.key === 'ArrowLeft') {
    if (reader.page <= 0) goToAdjacentChapter(-1);
    else showPage(reader.page - 1);
  }
});

window.hanko.onDownloadProgress(async ({ mangaId, chapterId, done, total, finished, error, cancelled }) => {
  const btn = document.querySelector(`.chapter-download-btn[data-chapter="${chapterId}"]`);
  if (btn) {
    if (cancelled) {
      btn.disabled = false;
      btn.textContent = 'Скачать';
    } else if (error) {
      btn.disabled = false;
      btn.textContent = 'Ошибка, повторить?';
    } else if (finished) {
      btn.disabled = true;
      btn.classList.add('is-done');
      btn.textContent = 'Скачано';
    } else if (total) {
      btn.textContent = `${Math.round((done / total) * 100)}%`;
    }
  }
  if (finished && !error) {
    downloads = await window.hanko.listDownloads();
    renderDownloads();
  }
});

// ---------------- аниме: сайты + встроенный браузер ----------------

function siteTile(site) {
  const tile = document.createElement('div');
  tile.className = 'site-tile';
  tile.style.position = 'relative';
  const letter = (site.name || '?').trim().charAt(0).toUpperCase();
  tile.innerHTML = `
    <button class="site-remove" title="Удалить">✕</button>
    <div class="site-avatar">${escapeHtml(letter)}</div>
    <div class="site-name">${escapeHtml(site.name)}</div>
    <div class="site-note">${escapeHtml(site.note || '')}</div>
  `;
  tile.addEventListener('click', (e) => {
    if (e.target.closest('.site-remove')) return;
    showView('anime');
    openSite(site);
  });
  tile.querySelector('.site-remove').addEventListener('click', async (e) => {
    e.stopPropagation();
    await window.hanko.removeSite(site.id);
    sites = await window.hanko.loadSites();
    renderSites();
  });
  return tile;
}

function renderSites() {
  els.sitesGrid.innerHTML = '';
  for (const s of sites) els.sitesGrid.appendChild(siteTile(s));
}

function openSite(site) {
  currentSiteId = site.id;
  els.browserPane.hidden = false;
  els.siteNote.value = site.note || '';
  els.siteWebview.src = site.url;
  els.browserUrl.textContent = site.url;
}

els.addSiteBtn.addEventListener('click', () => {
  els.siteNameInput.value = '';
  els.siteUrlInput.value = '';
  els.siteModalBackdrop.hidden = false;
  els.siteNameInput.focus();
});

els.siteModalCancel.addEventListener('click', () => { els.siteModalBackdrop.hidden = true; });
els.siteModalBackdrop.addEventListener('click', (e) => { if (e.target === els.siteModalBackdrop) els.siteModalBackdrop.hidden = true; });

els.siteModalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  let url = els.siteUrlInput.value.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const site = { id: `s_${Date.now()}`, name: els.siteNameInput.value.trim(), url, note: '' };
  await window.hanko.upsertSite(site);
  sites = await window.hanko.loadSites();
  renderSites();
  els.siteModalBackdrop.hidden = true;
});

els.browserBack.addEventListener('click', () => els.siteWebview.canGoBack() && els.siteWebview.goBack());
els.browserForward.addEventListener('click', () => els.siteWebview.canGoForward() && els.siteWebview.goForward());
els.browserReload.addEventListener('click', () => els.siteWebview.reload());
els.browserClose.addEventListener('click', () => { els.browserPane.hidden = true; currentSiteId = null; });

els.siteWebview.addEventListener('did-navigate', (e) => { els.browserUrl.textContent = e.url; });
els.siteWebview.addEventListener('did-navigate-in-page', (e) => { els.browserUrl.textContent = e.url; });

let noteSaveTimer = null;
els.siteNote.addEventListener('input', () => {
  clearTimeout(noteSaveTimer);
  noteSaveTimer = setTimeout(async () => {
    if (!currentSiteId) return;
    await window.hanko.setSiteNote({ id: currentSiteId, note: els.siteNote.value });
    sites = await window.hanko.loadSites();
    renderSites();
  }, 500);
});

// ---------------- профиль ----------------

async function loadProfileView() {
  profile = await window.hanko.loadProfile();
  renderProfileHeader();
  renderProfileBookmarks();
  renderProfileStats();
  await refreshOnline();
}

function renderProfileHeader() {
  els.profileNameInput.value = profile.displayName || '';
  els.profileBioInput.value = profile.bio || '';
  if (profile.avatarUrl) {
    els.profileAvatarImg.src = profile.avatarUrl;
    els.profileAvatarImg.hidden = false;
    els.profileAvatarFallback.hidden = true;
  } else {
    els.profileAvatarImg.hidden = true;
    els.profileAvatarFallback.hidden = false;
    els.profileAvatarFallback.textContent = (profile.displayName || 'Ч').trim().charAt(0).toUpperCase();
  }
}

function renderProfileBookmarks() {
  els.profileMangaGrid.innerHTML = '';
  els.profileMangaEmpty.hidden = library.length > 0;
  for (const item of library) {
    els.profileMangaGrid.appendChild(mangaCard(item, { inLibrary: true }));
  }
  els.profileSitesGrid.innerHTML = '';
  els.profileSitesEmpty.hidden = sites.length > 0;
  for (const s of sites) els.profileSitesGrid.appendChild(siteTile(s));
}

els.profileAvatarBtn.addEventListener('click', async () => {
  const updated = await window.hanko.pickAvatar();
  if (updated) {
    profile = updated;
    renderProfileHeader();
  }
});

let profileNameTimer = null;
els.profileNameInput.addEventListener('input', () => {
  clearTimeout(profileNameTimer);
  profileNameTimer = setTimeout(async () => {
    const name = els.profileNameInput.value.trim();
    profile = await window.hanko.saveProfile({ displayName: name });
    if (!profile.avatarUrl) {
      els.profileAvatarFallback.textContent = (profile.displayName || 'Ч').trim().charAt(0).toUpperCase();
    }
    // то же имя показываем друзьям онлайн — отдельного поля для этого нет
    if (onlineState.ready) {
      try { await window.hanko.onlineSetDisplayName(name); } catch { /* не критично, попробуем в другой раз */ }
    }
  }, 500);
});

let profileBioTimer = null;
els.profileBioInput.addEventListener('input', () => {
  clearTimeout(profileBioTimer);
  profileBioTimer = setTimeout(async () => {
    profile = await window.hanko.saveProfile({ bio: els.profileBioInput.value });
    // то же био показываем друзьям в профиле — отдельного поля для этого нет
    if (onlineState.ready) {
      try { await window.hanko.onlineSetBio(profile.bio || ''); } catch { /* не критично, попробуем в другой раз */ }
    }
  }, 500);
});

// ---------------- друзья и чат (онлайн, через Supabase) ----------------

function ruPlural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function renderProfileStats() {
  if (!els.profileStats) return;
  let text = `${library.length} ${ruPlural(library.length, 'тайтл', 'тайтла', 'тайтлов')} в библиотеке`;
  if (onlineState.ready) {
    text += ` · ${friendsList.length} ${ruPlural(friendsList.length, 'друг', 'друга', 'друзей')}`;
  }
  els.profileStats.textContent = text;
}

async function connectOnline() {
  if (onlineInitStarted) return;
  onlineInitStarted = true;
  onlineState = await window.hanko.onlineInit();
  renderOnlineStatus();
  if (onlineState.ready) await Promise.all([refreshIncoming(), refreshOutgoing(), refreshFriends(), refreshPresence()]);
}

async function loadFriendsView() {
  await refreshOnline();
  await refreshPresence();
}

async function refreshPresence() {
  if (!onlineState.ready) return;
  try {
    const ids = await window.hanko.onlineGetOnlineIds();
    onlineFriendIds = new Set(ids);
    renderFriendsList();
    updateChatOnlineLabel();
  } catch {
    // не критично — просто не покажем точки "в сети" пока не придёт live-обновление
  }
}

async function refreshOnline() {
  if (!onlineInitStarted) {
    await connectOnline();
    return;
  }
  onlineState = await window.hanko.onlineGetState();
  renderOnlineStatus();
  if (onlineState.ready) await Promise.all([refreshIncoming(), refreshOutgoing(), refreshFriends()]);
}

function renderOnlineStatus() {
  els.onlineRetryBtn.hidden = !onlineState.error;
  renderAccountStatus();
  renderUsernameUI();
  renderProfileStats();

  if (onlineState.error) {
    els.onlineStatusHint.hidden = false;
    els.onlineStatusHint.textContent = `Онлайн недоступен: ${onlineState.error}`;
  } else if (onlineState.ready) {
    els.onlineStatusHint.hidden = true;
  } else {
    els.onlineStatusHint.hidden = false;
    els.onlineStatusHint.textContent = 'Подключаюсь…';
  }
}

els.onlineRetryBtn.addEventListener('click', async () => {
  onlineState = { ready: false, connecting: true, error: null, isAnonymous: true };
  renderOnlineStatus();
  onlineState = await window.hanko.onlineInit();
  renderOnlineStatus();
  if (onlineState.ready) await Promise.all([refreshIncoming(), refreshOutgoing(), refreshFriends()]);
});

// ---------------- аккаунт: анонимно на этом компьютере / почта+пароль ----------------

function renderAccountStatus() {
  if (!onlineState.ready) {
    els.accountStatusText.textContent = 'Аккаунт появится, как только подключится онлайн (см. статус ниже).';
    els.authForms.hidden = true;
    els.logoutBtn.hidden = true;
    return;
  }
  if (onlineState.isAnonymous) {
    els.accountStatusText.textContent = 'Профиль пока привязан только к этому компьютеру. Зарегистрируйся, чтобы не потерять его, или войди, если аккаунт уже есть.';
    els.authForms.hidden = false;
    els.logoutBtn.hidden = true;
  } else {
    els.accountStatusText.textContent = `Вошёл как: ${onlineState.email || 'аккаунт подтверждён'}`;
    els.authForms.hidden = true;
    els.logoutBtn.hidden = false;
  }
}

function showAuthFeedback(text, isError) {
  els.authFeedback.hidden = false;
  els.authFeedback.textContent = text;
  els.authFeedback.style.color = isError ? 'var(--accent-bright)' : 'var(--text-muted)';
}

els.registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = els.registerEmail.value.trim();
  const password = els.registerPassword.value;
  if (!email || !password) return;
  try {
    onlineState = await window.hanko.onlineRegister({ email, password });
    renderOnlineStatus();
    showAuthFeedback(
      onlineState.isAnonymous
        ? 'Готово — проверь почту и подтверди адрес, чтобы вход по паролю заработал.'
        : 'Готово, ты зарегистрирован.',
      false
    );
    els.registerEmail.value = '';
    els.registerPassword.value = '';
  } catch (err) {
    showAuthFeedback(err.message, true);
  }
});

els.loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = els.loginEmail.value.trim();
  const password = els.loginPassword.value;
  if (!email || !password) return;
  try {
    onlineState = await window.hanko.onlineLogin({ email, password });
    renderOnlineStatus();
    if (onlineState.ready) await Promise.all([refreshIncoming(), refreshOutgoing(), refreshFriends()]);
    showAuthFeedback('Вошёл.', false);
    els.loginEmail.value = '';
    els.loginPassword.value = '';
  } catch (err) {
    showAuthFeedback(err.message, true);
  }
});

els.logoutBtn.addEventListener('click', async () => {
  if (!confirm('Выйти из аккаунта? На этом компьютере снова станет анонимный (гостевой) профиль.')) return;
  onlineState = await window.hanko.onlineLogout();
  renderOnlineStatus();
  if (onlineState.ready) await Promise.all([refreshIncoming(), refreshOutgoing(), refreshFriends()]);
});

// ---------------- ник (вместо кода — по нему теперь ищут друзей) ----------------

function renderUsernameUI() {
  const hasUsername = onlineState.ready && !!onlineState.username;
  els.usernameRow.hidden = !hasUsername;
  els.usernameForm.hidden = !onlineState.ready || hasUsername;
  els.addFriendBtn.hidden = !hasUsername;
  if (hasUsername) els.usernameValue.textContent = `@${onlineState.username}`;
}

els.usernameEditBtn.addEventListener('click', () => {
  els.usernameInput.value = onlineState.username || '';
  els.usernameRow.hidden = true;
  els.usernameForm.hidden = false;
  els.usernameInput.focus();
});

els.usernameForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = els.usernameInput.value.trim();
  if (!value) return;
  try {
    onlineState = await window.hanko.onlineSetUsername(value);
    els.usernameFeedback.hidden = true;
    renderUsernameUI();
  } catch (err) {
    els.usernameFeedback.hidden = false;
    els.usernameFeedback.textContent = err.message;
    els.usernameFeedback.style.color = 'var(--accent-bright)';
  }
});

// ---------------- попап «Добавить друга» (по нику ИЛИ по коду, с превью) ----------------

function openAddFriendModal() {
  els.addFriendInput.value = '';
  els.addFriendPreview.hidden = true;
  els.addFriendPreview.innerHTML = '';
  els.addFriendFeedback.hidden = true;
  els.addFriendModalBackdrop.hidden = false;
  els.addFriendInput.focus();
}
function closeAddFriendModal() {
  els.addFriendModalBackdrop.hidden = true;
}
els.addFriendBtn.addEventListener('click', openAddFriendModal);
els.addFriendModalClose.addEventListener('click', closeAddFriendModal);
els.addFriendModalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.addFriendModalBackdrop) closeAddFriendModal();
});
els.addFriendForm.addEventListener('submit', (e) => e.preventDefault());

function showAddFriendFeedback(text, isError) {
  els.addFriendFeedback.hidden = false;
  els.addFriendFeedback.textContent = text;
  els.addFriendFeedback.style.color = isError ? 'var(--accent-bright)' : 'var(--text-muted)';
}

function addFriendResultRow(label, sendRequest) {
  const row = document.createElement('div');
  row.className = 'chapter-row';
  row.innerHTML = `
    <div class="chapter-row-main">
      <span class="chapter-row-label">${escapeHtml(label)}</span>
    </div>
    <button class="btn-chat" type="button">Отправить заявку</button>
  `;
  const btn = row.querySelector('.btn-chat');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      await sendRequest();
      showAddFriendFeedback('Заявка отправлена.', false);
      els.addFriendPreview.hidden = true;
      els.addFriendPreview.innerHTML = '';
      els.addFriendInput.value = '';
      await Promise.all([refreshOutgoing(), refreshFriends()]);
    } catch (err) {
      showAddFriendFeedback(err.message, true);
      btn.disabled = false;
    }
  });
  return row;
}

let addFriendTimer = null;
els.addFriendInput.addEventListener('input', () => {
  clearTimeout(addFriendTimer);
  const query = els.addFriendInput.value.trim();
  els.addFriendFeedback.hidden = true;
  if (query.length < 2) {
    els.addFriendPreview.hidden = true;
    els.addFriendPreview.innerHTML = '';
    return;
  }
  addFriendTimer = setTimeout(async () => {
    try {
      const rows = [];
      // как ник — поиск по началу строки
      const byUsername = await window.hanko.onlineSearchUsernames(query);
      for (const user of byUsername) {
        rows.push(addFriendResultRow(
          `@${user.username}${user.display_name ? ' — ' + user.display_name : ''}`,
          () => window.hanko.onlineSendFriendRequest(user.username)
        ));
      }
      // как код — точное совпадение (коды короткие, обычно 6 символов)
      if (query.length <= 8) {
        const byCode = await window.hanko.onlineFindByCodePreview(query);
        if (byCode) {
          rows.push(addFriendResultRow(
            `Код ${byCode.friend_code}: ${byCode.username ? '@' + byCode.username : (byCode.display_name || 'без имени')}`,
            () => window.hanko.onlineSendFriendRequestByCode(byCode.friend_code)
          ));
        }
      }
      els.addFriendPreview.innerHTML = '';
      els.addFriendPreview.hidden = false;
      if (!rows.length) {
        const p = document.createElement('p');
        p.className = 'empty-hint';
        p.textContent = 'Никого не нашлось.';
        els.addFriendPreview.appendChild(p);
      } else {
        for (const row of rows) els.addFriendPreview.appendChild(row);
      }
    } catch (err) {
      showAddFriendFeedback(err.message, true);
    }
  }, 350);
});

// ---------------- попап «Заявки» (входящие/исходящие) ----------------

function openRequestsModal() {
  els.requestsModalBackdrop.hidden = false;
}
function closeRequestsModal() {
  els.requestsModalBackdrop.hidden = true;
}
els.requestsBtn.addEventListener('click', openRequestsModal);
els.requestsModalClose.addEventListener('click', closeRequestsModal);
els.requestsModalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.requestsModalBackdrop) closeRequestsModal();
});

function updateRequestsBadge() {
  const count = incomingRequests.length;
  els.requestsBadge.hidden = count === 0;
  els.requestsBadge.textContent = count > 9 ? '9+' : String(count);
}

// ---------------- заявки и друзья ----------------

async function refreshIncoming() {
  incomingRequests = await window.hanko.onlineListIncomingRequests();
  renderIncomingRequests();
  updateRequestsBadge();
}
async function refreshOutgoing() {
  outgoingRequests = await window.hanko.onlineListOutgoingRequests();
  renderOutgoingRequests();
}
async function refreshFriends() {
  friendsList = await window.hanko.onlineListFriends();
  renderFriendsList();
  renderProfileStats();
}

function incomingRequestRow(req) {
  const row = document.createElement('div');
  row.className = 'chapter-row';
  const date = new Date(req.created_at).toLocaleDateString('ru-RU');
  row.innerHTML = `
    <div class="chapter-row-main">
      <span class="chapter-row-label">${escapeHtml(req.from_name)} — ${escapeHtml(date)}</span>
    </div>
    <div class="request-row-actions">
      <button class="btn-accept" type="button">Принять</button>
      <button class="btn-decline" type="button">Отклонить</button>
    </div>
  `;
  row.querySelector('.btn-accept').addEventListener('click', async () => {
    await window.hanko.onlineRespondFriendRequest({ requestId: req.id, accept: true });
    await Promise.all([refreshIncoming(), refreshFriends()]);
  });
  row.querySelector('.btn-decline').addEventListener('click', async () => {
    await window.hanko.onlineRespondFriendRequest({ requestId: req.id, accept: false });
    await refreshIncoming();
  });
  return row;
}

function renderIncomingRequests() {
  els.incomingRequestsList.innerHTML = '';
  els.incomingRequestsEmpty.hidden = incomingRequests.length > 0;
  for (const req of incomingRequests) els.incomingRequestsList.appendChild(incomingRequestRow(req));
}

function outgoingRequestRow(req) {
  const row = document.createElement('div');
  row.className = 'chapter-row';
  const date = new Date(req.created_at).toLocaleDateString('ru-RU');
  const statusLabel = { pending: 'ожидает ответа', accepted: 'принята', declined: 'отклонена' }[req.status] || req.status;
  row.innerHTML = `
    <div class="chapter-row-main">
      <span class="chapter-row-label">${escapeHtml(req.to_name)} — ${escapeHtml(statusLabel)}, ${escapeHtml(date)}</span>
    </div>
    ${req.status === 'pending' ? '<button class="friend-request-remove" title="Отменить">✕</button>' : ''}
  `;
  const cancelBtn = row.querySelector('.friend-request-remove');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      await window.hanko.onlineCancelFriendRequest(req.id);
      await refreshOutgoing();
    });
  }
  return row;
}

function renderOutgoingRequests() {
  els.outgoingRequestsList.innerHTML = '';
  els.outgoingRequestsEmpty.hidden = outgoingRequests.length > 0;
  for (const req of outgoingRequests) els.outgoingRequestsList.appendChild(outgoingRequestRow(req));
}

function friendRow(f) {
  const row = document.createElement('div');
  row.className = 'chapter-row';
  const unread = unreadFriendIds.has(f.friend_id);
  row.innerHTML = `
    <div class="chapter-row-main friend-row-name" role="button" tabindex="0" style="cursor:pointer;">
      ${unread ? '<span class="unread-dot" title="Новое сообщение"></span>' : ''}
      <span class="chapter-row-label">${escapeHtml(f.display_name || 'Без имени')}</span>
    </div>
    <div class="request-row-actions">
      <button class="btn-chat" type="button">Написать</button>
      <button class="friend-request-remove" title="Удалить из друзей">✕</button>
    </div>
  `;
  const nameEl = row.querySelector('.friend-row-name');
  nameEl.addEventListener('click', () => openFriendProfile(f.friend_id, f.display_name || 'Без имени'));
  nameEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFriendProfile(f.friend_id, f.display_name || 'Без имени'); }
  });
  row.querySelector('.btn-chat').addEventListener('click', (e) => {
    e.stopPropagation();
    openChat(f.friend_id, f.display_name || 'Без имени');
  });
  row.querySelector('.friend-request-remove').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!confirm(`Удалить «${f.display_name || 'без имени'}» из друзей?`)) return;
    await window.hanko.onlineUnfriend(f.friend_id);
    await refreshFriends();
  });
  return row;
}

function renderFriendsList() {
  els.friendsList.innerHTML = '';
  els.friendsListEmpty.hidden = friendsList.length > 0;
  for (const f of friendsList) els.friendsList.appendChild(friendRow(f));
}

// ---------------- чат ----------------

function chatBubble(msg) {
  const mine = msg.from_id === onlineState.myId;
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${mine ? 'is-mine' : 'is-theirs'}`;
  const time = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  bubble.innerHTML = `${escapeHtml(msg.body)}<span class="chat-bubble-time">${escapeHtml(time)}</span>`;
  return bubble;
}

async function openChat(friendId, name) {
  activeChat = { friendId, name };
  unreadFriendIds.delete(friendId);
  renderFriendsList();
  els.chatOverlay.hidden = false;
  els.chatTitle.textContent = name;
  els.chatAvatar.textContent = (name || '?').trim().charAt(0).toUpperCase();
  updateChatOnlineLabel();
  els.chatBody.innerHTML = '<p class="empty-hint" style="padding:20px;">Загружаю сообщения…</p>';
  try {
    const messages = await window.hanko.onlineListMessages(friendId);
    renderChatMessages(messages);
  } catch (err) {
    els.chatBody.innerHTML = `<p class="empty-hint" style="padding:20px;">Не удалось загрузить: ${escapeHtml(err.message)}</p>`;
  }
  els.chatInput.focus();
}

function renderChatMessages(messages) {
  els.chatBody.innerHTML = '';
  for (const m of messages) els.chatBody.appendChild(chatBubble(m));
  els.chatBody.scrollTop = els.chatBody.scrollHeight;
}

els.chatBack.addEventListener('click', () => { els.chatOverlay.hidden = true; activeChat = null; });

els.chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = els.chatInput.value.trim();
  if (!body || !activeChat) return;
  els.chatInput.value = '';
  try {
    const msg = await window.hanko.onlineSendMessage({ friendId: activeChat.friendId, body });
    els.chatBody.appendChild(chatBubble(msg));
    els.chatBody.scrollTop = els.chatBody.scrollHeight;
  } catch (err) {
    alert(err.message);
  }
});

// живые уведомления из главного процесса (реалтайм Supabase) — обновляем то,
// что сейчас видно, а остальное подтянется, когда откроют раздел «Профиль»
function updateFriendsNavBadge() {
  const count = unreadFriendIds.size;
  els.friendsNavBadge.hidden = count === 0;
  els.friendsNavBadge.textContent = count > 9 ? '9+' : String(count);
}

function updateChatOnlineLabel() {
  if (!activeChat || els.chatOverlay.hidden) return;
  els.chatOnlineLabel.hidden = !onlineFriendIds.has(activeChat.friendId);
}

function updateFriendProfileOnlineLabel() {
  if (!activeFriendProfile || els.friendProfileOverlay.hidden) return;
  els.friendProfileOnlineLabel.hidden = !onlineFriendIds.has(activeFriendProfile.friendId);
}

// ---------------- профиль друга (чужой, только для чтения + комментарии) ----------------

function friendBookmarkCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <img class="card-cover" src="${item.cover_url || ''}" alt="" loading="lazy" onerror="this.style.opacity=0" />
    <div class="card-body">
      <p class="card-title">${escapeHtml(item.title)}</p>
      <p class="card-meta">${item.status ? escapeHtml(item.status) : ''}</p>
    </div>
  `;
  return card;
}

function friendCommentRow(c) {
  const row = document.createElement('div');
  row.className = 'chapter-row';
  const date = new Date(c.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  row.innerHTML = `
    <div class="chapter-row-main">
      <span class="chapter-row-label"><b>${escapeHtml(c.author_name)}</b> — ${escapeHtml(c.body)}</span>
      <p class="card-meta" style="margin:2px 0 0;">${escapeHtml(date)}</p>
    </div>
    ${c.author_id === onlineState.myId ? '<button class="friend-request-remove" title="Удалить комментарий">✕</button>' : ''}
  `;
  const delBtn = row.querySelector('.friend-request-remove');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      try {
        await window.hanko.onlineDeleteProfileComment(c.id);
        await loadFriendComments(activeFriendProfile.friendId);
      } catch (err) {
        alert(err.message);
      }
    });
  }
  return row;
}

async function loadFriendComments(friendId) {
  const comments = await window.hanko.onlineListProfileComments(friendId);
  els.friendCommentsList.innerHTML = '';
  els.friendCommentsEmpty.hidden = comments.length > 0;
  for (const c of comments) els.friendCommentsList.appendChild(friendCommentRow(c));
}

async function openFriendProfile(friendId, name) {
  activeFriendProfile = { friendId, name };
  els.friendProfileOverlay.hidden = false;
  els.friendProfileName.textContent = name;
  els.friendProfileAvatar.textContent = (name || '?').trim().charAt(0).toUpperCase();
  updateFriendProfileOnlineLabel();

  els.friendProfileError.hidden = true;
  els.friendProfileBio.hidden = true;
  els.friendBookmarksGrid.innerHTML = '';
  els.friendBookmarksEmpty.hidden = true;
  els.friendCommentsList.innerHTML = '';
  els.friendCommentsEmpty.hidden = true;
  els.friendCommentFeedback.hidden = true;
  els.friendCommentInput.value = '';

  try {
    const profileData = await window.hanko.onlineGetProfile(friendId);
    if (profileData) {
      if (profileData.display_name) els.friendProfileName.textContent = profileData.display_name;
      if (profileData.bio) {
        els.friendProfileBio.hidden = false;
        els.friendProfileBio.textContent = profileData.bio;
      }
    }
    const bookmarks = await window.hanko.onlineListBookmarks(friendId);
    els.friendBookmarksEmpty.hidden = bookmarks.length > 0;
    for (const item of bookmarks) els.friendBookmarksGrid.appendChild(friendBookmarkCard(item));

    await loadFriendComments(friendId);
  } catch (err) {
    els.friendProfileError.hidden = false;
    els.friendProfileError.textContent = err.message;
  }
}

function closeFriendProfile() {
  els.friendProfileOverlay.hidden = true;
  activeFriendProfile = null;
}

els.friendProfileBack.addEventListener('click', closeFriendProfile);

function showFriendCommentFeedback(text, isError) {
  els.friendCommentFeedback.hidden = false;
  els.friendCommentFeedback.textContent = text;
  els.friendCommentFeedback.style.color = isError ? 'var(--accent-bright)' : 'var(--text-muted)';
}

els.friendCommentForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = els.friendCommentInput.value.trim();
  if (!body || !activeFriendProfile) return;
  try {
    await window.hanko.onlineAddProfileComment({ profileId: activeFriendProfile.friendId, body });
    els.friendCommentInput.value = '';
    els.friendCommentFeedback.hidden = true;
    await loadFriendComments(activeFriendProfile.friendId);
  } catch (err) {
    showFriendCommentFeedback(err.message, true);
  }
});

window.hanko.onOnlineEvent(async (event) => {
  if (event.type === 'friend-request-incoming') {
    if (!els.viewFriends.hidden) await refreshIncoming();
  } else if (event.type === 'friend-request-updated') {
    if (!els.viewFriends.hidden) await Promise.all([refreshOutgoing(), refreshFriends()]);
  } else if (event.type === 'presence') {
    onlineFriendIds = new Set(event.onlineIds);
    if (!els.viewFriends.hidden) renderFriendsList();
    updateChatOnlineLabel();
    updateFriendProfileOnlineLabel();
  } else if (event.type === 'message') {
    const msg = event.message;
    if (activeChat && msg.from_id === activeChat.friendId && !els.chatOverlay.hidden) {
      els.chatBody.appendChild(chatBubble(msg));
      els.chatBody.scrollTop = els.chatBody.scrollHeight;
    } else {
      unreadFriendIds.add(msg.from_id);
      updateFriendsNavBadge();
      if (!els.viewFriends.hidden) renderFriendsList();
    }
  }
});

// ---------------- старт ----------------

async function init() {
  const [settings, lib, sitesList, downloadsList] = await Promise.all([
    window.hanko.loadSettings(),
    window.hanko.loadLibrary(),
    window.hanko.loadSites(),
    window.hanko.listDownloads(),
  ]);
  library = lib;
  sites = sitesList;
  downloads = downloadsList;
  renderLibrary();
  renderSites();
  renderDownloads();
  const lastTab = ['anime', 'home', 'profile', 'friends'].includes(settings.lastTab) ? settings.lastTab : 'manga';
  showView(lastTab);
  // подключаемся к онлайну в фоне — не блокируем остальной запуск и не ждём,
  // пока откроют «Профиль», чтобы заявки/сообщения могли прийти в любой момент
  connectOnline();
}

init();