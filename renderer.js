// renderer.js — обычный JS без доступа к Node. Всё, что нужно с диска/сети,
// идёт через window.hanko (см. preload.js).

const els = {
  navHome: document.getElementById('navHome'),
  navManga: document.getElementById('navManga'),
  navAnime: document.getElementById('navAnime'),
  navProfile: document.getElementById('navProfile'),
  navFriends: document.getElementById('navFriends'),
  friendsNavBadge: document.getElementById('friendsNavBadge'),
  railOnlineFriends: document.getElementById('railOnlineFriends'),
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
  profileMangaShowAllBtn: document.getElementById('profileMangaShowAllBtn'),
  readingHistoryList: document.getElementById('readingHistoryList'),
  readingHistoryEmpty: document.getElementById('readingHistoryEmpty'),
  readingHistoryClearBtn: document.getElementById('readingHistoryClearBtn'),
  watchHistoryList: document.getElementById('watchHistoryList'),
  watchHistoryEmpty: document.getElementById('watchHistoryEmpty'),
  watchHistoryClearBtn: document.getElementById('watchHistoryClearBtn'),
  bookmarksModalBackdrop: document.getElementById('bookmarksModalBackdrop'),
  bookmarksModalClose: document.getElementById('bookmarksModalClose'),
  bookmarksModalTitle: document.getElementById('bookmarksModalTitle'),
  bookmarksModalGrid: document.getElementById('bookmarksModalGrid'),
  profileAnimeGrid: document.getElementById('profileAnimeGrid'),
  profileAnimeEmpty: document.getElementById('profileAnimeEmpty'),
  profileAnimeShowAllBtn: document.getElementById('profileAnimeShowAllBtn'),
  statBooks: document.getElementById('statBooks'),
  statFriendsBlock: document.getElementById('statFriendsBlock'),
  statFriends: document.getElementById('statFriends'),
  statComments: document.getElementById('statComments'),
  myCommentsEmpty: document.getElementById('myCommentsEmpty'),
  myCommentsList: document.getElementById('myCommentsList'),

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

  friendsQuickModalBackdrop: document.getElementById('friendsQuickModalBackdrop'),
  friendsQuickModalClose: document.getElementById('friendsQuickModalClose'),
  friendsQuickEmpty: document.getElementById('friendsQuickEmpty'),
  friendsQuickList: document.getElementById('friendsQuickList'),

  friendActionModalBackdrop: document.getElementById('friendActionModalBackdrop'),
  friendActionModalClose: document.getElementById('friendActionModalClose'),
  friendActionName: document.getElementById('friendActionName'),
  friendActionVisitBtn: document.getElementById('friendActionVisitBtn'),
  friendActionMessageBtn: document.getElementById('friendActionMessageBtn'),
  friendActionRemoveBtn: document.getElementById('friendActionRemoveBtn'),

  chatShareBtn: document.getElementById('chatShareBtn'),
  shareModalBackdrop: document.getElementById('shareModalBackdrop'),
  shareModalClose: document.getElementById('shareModalClose'),
  shareTabStickers: document.getElementById('shareTabStickers'),
  shareTabTitles: document.getElementById('shareTabTitles'),
  shareNoteInput: document.getElementById('shareNoteInput'),
  shareStickerPanel: document.getElementById('shareStickerPanel'),
  shareTitlesPanel: document.getElementById('shareTitlesPanel'),
  stickerGrid: document.getElementById('stickerGrid'),
  shareTitlesEmpty: document.getElementById('shareTitlesEmpty'),
  shareTitlesList: document.getElementById('shareTitlesList'),

  updateBanner: document.getElementById('updateBanner'),
  updateBannerTitle: document.getElementById('updateBannerTitle'),
  updateBannerFill: document.getElementById('updateBannerFill'),
  updateBannerBtn: document.getElementById('updateBannerBtn'),
  friendsList: document.getElementById('friendsList'),
  friendsListEmpty: document.getElementById('friendsListEmpty'),
  chatListSearch: document.getElementById('chatListSearch'),

  chatPanePlaceholder: document.getElementById('chatPanePlaceholder'),
  chatPaneActive: document.getElementById('chatPaneActive'),
  chatProfileBtn: document.getElementById('chatProfileBtn'),
  chatAvatar: document.getElementById('chatAvatar'),
  chatStatusDot: document.getElementById('chatStatusDot'),
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
  friendProfileTabProfile: document.getElementById('friendProfileTabProfile'),
  friendProfileTabBookmarks: document.getElementById('friendProfileTabBookmarks'),
  friendProfileTabProfilePanel: document.getElementById('friendProfileTabProfilePanel'),
  friendProfileTabBookmarksPanel: document.getElementById('friendProfileTabBookmarksPanel'),
  friendProfileBio: document.getElementById('friendProfileBio'),
  friendProfileError: document.getElementById('friendProfileError'),
  friendStatViews: document.getElementById('friendStatViews'),
  friendStatLikeBlock: document.getElementById('friendStatLikeBlock'),
  friendStatLikes: document.getElementById('friendStatLikes'),
  friendStatLikesLabel: document.getElementById('friendStatLikesLabel'),
  friendStatFriends: document.getElementById('friendStatFriends'),
  friendStatComments: document.getElementById('friendStatComments'),
  friendProfileUnfriendBtn: document.getElementById('friendProfileUnfriendBtn'),
  friendBookmarksEmpty: document.getElementById('friendBookmarksEmpty'),
  friendBookmarksGrid: document.getElementById('friendBookmarksGrid'),
  friendCommentsEmpty: document.getElementById('friendCommentsEmpty'),
  friendCommentsList: document.getElementById('friendCommentsList'),
  friendCommentForm: document.getElementById('friendCommentForm'),
  friendCommentInput: document.getElementById('friendCommentInput'),
  friendCommentFeedback: document.getElementById('friendCommentFeedback'),

  downloadsRemoveAllBtn: document.getElementById('downloadsRemoveAllBtn'),

  themeToggleBtn: document.getElementById('themeToggleBtn'),

  homeContinueSection: document.getElementById('homeContinueSection'),
  homeContinueGrid: document.getElementById('homeContinueGrid'),
  homeMangaGrid: document.getElementById('homeMangaGrid'),
  homeMangaHint: document.getElementById('homeMangaHint'),
  homeAnimeGrid: document.getElementById('homeAnimeGrid'),
  homeMangaSection: document.getElementById('homeMangaSection'),
  homeAnimeSection: document.getElementById('homeAnimeSection'),
  homeTabAll: document.getElementById('homeTabAll'),
  homeTabManga: document.getElementById('homeTabManga'),
  homeTabAnime: document.getElementById('homeTabAnime'),
  homeAnimeHint: document.getElementById('homeAnimeHint'),

  mangaSearchForm: document.getElementById('mangaSearchForm'),
  mangaSearchInput: document.getElementById('mangaSearchInput'),
  mangaSearchSection: document.getElementById('mangaSearchSection'),
  mangaPopularSection: document.getElementById('mangaPopularSection'),
  mangaSearchPagination: document.getElementById('mangaSearchPagination'),
  mangaSearchPageLabel: document.getElementById('mangaSearchPageLabel'),
  mangaSearchPrevBtn: document.getElementById('mangaSearchPrevBtn'),
  mangaSearchNextBtn: document.getElementById('mangaSearchNextBtn'),
  mangaSearchGrid: document.getElementById('mangaSearchGrid'),
  mangaPopularHint: document.getElementById('mangaPopularHint'),
  mangaPopularGrid: document.getElementById('mangaPopularGrid'),
  mangaFiltersBtn: document.getElementById('mangaFiltersBtn'),
  mangaFiltersModalBackdrop: document.getElementById('mangaFiltersModalBackdrop'),
  mangaFiltersModalClose: document.getElementById('mangaFiltersModalClose'),
  formatFilterRow: document.getElementById('formatFilterRow'),
  mangaSortSelect: document.getElementById('mangaSortSelect'),
  statusFilterRow: document.getElementById('statusFilterRow'),
  genreFilterHint: document.getElementById('genreFilterHint'),
  genreFilterRow: document.getElementById('genreFilterRow'),
  themeFilterRow: document.getElementById('themeFilterRow'),
  mangaFiltersResetBtn: document.getElementById('mangaFiltersResetBtn'),
  mangaFiltersApplyBtn: document.getElementById('mangaFiltersApplyBtn'),
  mangaLibraryGrid: document.getElementById('mangaLibraryGrid'),
  mangaLibraryEmpty: document.getElementById('mangaLibraryEmpty'),

  downloadsList: document.getElementById('downloadsList'),
  downloadsEmpty: document.getElementById('downloadsEmpty'),

  animeLibraryGrid: document.getElementById('animeLibraryGrid'),
  animeLibraryEmpty: document.getElementById('animeLibraryEmpty'),

  animeSearchForm: document.getElementById('animeSearchForm'),
  animeSearchInput: document.getElementById('animeSearchInput'),
  animeSearchSection: document.getElementById('animeSearchSection'),
  animeSearchGrid: document.getElementById('animeSearchGrid'),
  animeSearchPagination: document.getElementById('animeSearchPagination'),
  animeSearchPrevBtn: document.getElementById('animeSearchPrevBtn'),
  animeSearchPageLabel: document.getElementById('animeSearchPageLabel'),
  animeSearchNextBtn: document.getElementById('animeSearchNextBtn'),
  animePopularSection: document.getElementById('animePopularSection'),
  animePopularHint: document.getElementById('animePopularHint'),
  animePopularGrid: document.getElementById('animePopularGrid'),
  animeFiltersBtn: document.getElementById('animeFiltersBtn'),
  animeFiltersModalBackdrop: document.getElementById('animeFiltersModalBackdrop'),
  animeFiltersModalClose: document.getElementById('animeFiltersModalClose'),
  animeTypeFilterRow: document.getElementById('animeTypeFilterRow'),
  animeStatusFilterRow: document.getElementById('animeStatusFilterRow'),
  animeGenreFilterRow: document.getElementById('animeGenreFilterRow'),
  animeFiltersResetBtn: document.getElementById('animeFiltersResetBtn'),
  animeFiltersApplyBtn: document.getElementById('animeFiltersApplyBtn'),
  animeTitleModalBackdrop: document.getElementById('animeTitleModalBackdrop'),
  animeTitleModalClose: document.getElementById('animeTitleModalClose'),
  animeTitleModalBody: document.getElementById('animeTitleModalBody'),
  animePlayerOverlay: document.getElementById('animePlayerOverlay'),
  animePlayerBack: document.getElementById('animePlayerBack'),
  animePlayerTitle: document.getElementById('animePlayerTitle'),
  animeQualitySelect: document.getElementById('animeQualitySelect'),
  animeVideo: document.getElementById('animeVideo'),
  animeEpPrevBtn: document.getElementById('animeEpPrevBtn'),
  animeEpNextBtn: document.getElementById('animeEpNextBtn'),
  animeEpLabel: document.getElementById('animeEpLabel'),
  animePlayerBody: document.getElementById('animePlayerBody'),
  animeControls: document.getElementById('animeControls'),
  animeCenterBtn: document.getElementById('animeCenterBtn'),
  animePlayPauseBtn: document.getElementById('animePlayPauseBtn'),
  animeSkipBackBtn: document.getElementById('animeSkipBackBtn'),
  animeSkipFwdBtn: document.getElementById('animeSkipFwdBtn'),
  animeMuteBtn: document.getElementById('animeMuteBtn'),
  animeVolumeIcon: document.getElementById('animeVolumeIcon'),
  animeVolumeSlider: document.getElementById('animeVolumeSlider'),
  animeSpeedBtn: document.getElementById('animeSpeedBtn'),
  animeFullscreenBtn: document.getElementById('animeFullscreenBtn'),
  animeFullscreenIcon: document.getElementById('animeFullscreenIcon'),
  animeSeekTrack: document.getElementById('animeSeekTrack'),
  animeSeekFill: document.getElementById('animeSeekFill'),
  animeSeekBuffered: document.getElementById('animeSeekBuffered'),
  animeSeekThumb: document.getElementById('animeSeekThumb'),
  animeTimeCurrent: document.getElementById('animeTimeCurrent'),
  animeTimeDuration: document.getElementById('animeTimeDuration'),

  appConfirmBackdrop: document.getElementById('appConfirmBackdrop'),
  appConfirmTitle: document.getElementById('appConfirmTitle'),
  appConfirmMessage: document.getElementById('appConfirmMessage'),
  appConfirmCancelBtn: document.getElementById('appConfirmCancelBtn'),
  appConfirmOkBtn: document.getElementById('appConfirmOkBtn'),

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
  readerProgressFill: document.getElementById('readerProgressFill'),
  chapterPrevBtn: document.getElementById('chapterPrevBtn'),
  chapterNextBtn: document.getElementById('chapterNextBtn'),
};

// ---------- окно подтверждения (замена системного window.confirm) ----------
// Возвращает Promise<boolean>: true — нажали основную кнопку, false — отмена/Esc/клик по фону.
let appConfirmResolve = null;

function showAppConfirm(message, opts = {}) {
  const { title = 'Подтверждение', okText = 'Удалить', cancelText = 'Отмена', danger = true } = opts;
  els.appConfirmTitle.textContent = title;
  els.appConfirmMessage.textContent = message;
  els.appConfirmOkBtn.textContent = okText;
  els.appConfirmCancelBtn.textContent = cancelText;
  els.appConfirmOkBtn.classList.toggle('btn-primary--danger', danger);
  els.appConfirmBackdrop.hidden = false;
  return new Promise((resolve) => {
    appConfirmResolve = resolve;
  });
}

function closeAppConfirm(result) {
  els.appConfirmBackdrop.hidden = true;
  if (appConfirmResolve) {
    const resolve = appConfirmResolve;
    appConfirmResolve = null;
    resolve(result);
  }
}

els.appConfirmOkBtn.addEventListener('click', () => closeAppConfirm(true));
els.appConfirmCancelBtn.addEventListener('click', () => closeAppConfirm(false));
els.appConfirmBackdrop.addEventListener('click', (e) => {
  if (e.target === els.appConfirmBackdrop) closeAppConfirm(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.appConfirmBackdrop.hidden) closeAppConfirm(false);
});

let library = [];
let downloads = [];
let readingHistory = [];
let animeLibrary = [];
let animeHistory = [];
let profile = null;

let onlineState = { ready: false, connecting: true, error: null, myId: null, friendCode: null };
let onlineInitStarted = false;
let incomingRequests = [];
let outgoingRequests = [];
let friendsList = [];
const unreadFriendIds = new Set();
let onlineFriendIds = new Set();
let activeChat = null; // { friendId, name }
// счётчик "актуальности" загрузки чата — см. openChat(): нужен, чтобы устаревший
// (запоздавший) ответ сервера от предыдущего открытия чата не перезаписал
// свежую переписку, если пользователь успел переключиться на другой диалог
// быстрее, чем пришёл первый ответ
let chatLoadToken = 0;
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
  if (isHome) { renderHomeContinue(); loadHomeContent(); }
  if (isManga) loadMangaPopular();
  if (isAnime) loadAnimePopular();
  if (isProfile) loadProfileView();
  // если чат с кем-то уже был открыт раньше, а пользователь был на другой
  // вкладке (Манга/Аниме/Профиль) — сообщения, пришедшие в это время, не
  // попадали в DOM и не сбрасывали бейдж непрочитанных (isChatPaneVisible()
  // была false, пока вкладка "Друзья" не активна). Раньше при возврате на
  // вкладку чат просто оставался с устаревшим содержимым и висящим "1" на
  // иконке, пока пользователь вручную не открывал этот же чат заново.
  // Теперь просто перезагружаем открытый чат при каждом возврате на вкладку —
  // это заодно и подтягивает пропущенные сообщения, и сбрасывает бейдж.
  if (isFriends) {
    loadFriendsView();
    if (activeChat) openChat(activeChat.friendId, activeChat.name);
  }
}

els.navHome.addEventListener('click', () => showView('home'));
els.navManga.addEventListener('click', () => showView('manga'));
els.navAnime.addEventListener('click', () => showView('anime'));
els.navProfile.addEventListener('click', () => showView('profile'));
els.navFriends.addEventListener('click', () => showView('friends'));

function applyTheme(theme) {
  document.body.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}

els.themeToggleBtn.addEventListener('click', () => {
  const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  window.hanko.saveSettings({ theme: next });
});

// ---------------- главная: витрина популярного ----------------

// показывает на главной то, что реально читалось последним — сортировка
// по library[].progress.updatedAt, локально, без сети, поэтому обновляем
// это каждый раз при заходе на «Главную», а не один раз как витрину популярного
function renderHomeContinue() {
  const items = library
    .filter((item) => item.progress && item.progress.updatedAt)
    .sort((a, b) => b.progress.updatedAt - a.progress.updatedAt)
    .slice(0, 8);
  els.homeContinueSection.hidden = items.length === 0;
  els.homeContinueGrid.innerHTML = '';
  for (const item of items) {
    els.homeContinueGrid.appendChild(mangaCard(item, { inLibrary: true }));
  }
}

let homeLoaded = false;
async function loadHomeContent() {
  if (homeLoaded) return;
  homeLoaded = true;

  els.homeMangaHint.hidden = true;
  els.homeAnimeHint.hidden = true;
  renderSkeletons(els.homeMangaGrid);
  renderSkeletons(els.homeAnimeGrid);

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
    const { items } = await window.hanko.anilibriaPopular();
    els.homeAnimeHint.hidden = items.length > 0;
    els.homeAnimeHint.textContent = 'Пусто.';
    els.homeAnimeGrid.innerHTML = '';
    for (const item of items) {
      els.homeAnimeGrid.appendChild(anilibriaCard(item));
    }
  } catch (err) {
    els.homeAnimeHint.hidden = false;
    els.homeAnimeHint.textContent = `Не удалось загрузить: ${err.message}`;
  }
}

let mangaPopularLoaded = false;
async function loadMangaPopular() {
  if (mangaPopularLoaded) return;
  mangaPopularLoaded = true;
  els.mangaPopularHint.hidden = true;
  renderSkeletons(els.mangaPopularGrid);
  try {
    const items = await window.hanko.mangadexPopular();
    els.mangaPopularHint.hidden = items.length > 0;
    els.mangaPopularHint.textContent = 'Пусто.';
    els.mangaPopularGrid.innerHTML = '';
    for (const item of items) {
      els.mangaPopularGrid.appendChild(mangaCard(item, { inLibrary: library.some((l) => l.id === item.id) }));
    }
  } catch (err) {
    els.mangaPopularHint.hidden = false;
    els.mangaPopularHint.textContent = `Не удалось загрузить: ${err.message}`;
  }
}

function switchHomeCategory(cat) {
  els.homeTabAll.classList.toggle('is-active', cat === 'all');
  els.homeTabManga.classList.toggle('is-active', cat === 'manga');
  els.homeTabAnime.classList.toggle('is-active', cat === 'anime');
  els.homeMangaSection.hidden = cat === 'anime';
  els.homeAnimeSection.hidden = cat === 'manga';
}
els.homeTabAll.addEventListener('click', () => switchHomeCategory('all'));
els.homeTabManga.addEventListener('click', () => switchHomeCategory('manga'));
els.homeTabAnime.addEventListener('click', () => switchHomeCategory('anime'));

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

const MANGA_STATUS_RU = {
  ongoing: 'Онгоинг',
  completed: 'Завершено',
  hiatus: 'Приостановлено',
  cancelled: 'Отменено',
};

function mangaCard(item, { inLibrary }) {
  const card = document.createElement('div');
  card.className = 'card';

  const fold = item.progress
    ? `<div class="card-fold"></div><span class="card-fold-label">${escapeHtml(item.progress.chapterLabel || '')}</span>`
    : '';
  const note = item.note
    ? `<p class="card-note">${escapeHtml(item.note)}</p>`
    : '';
  const statusRu = item.status ? (MANGA_STATUS_RU[item.status] || item.status) : '';
  const ratingBadge = typeof item.rating === 'number' && item.rating > 0
    ? `<span class="card-rating">★ ${item.rating.toFixed(1)}</span>`
    : '';

  card.innerHTML = `
    ${fold}
    <img class="card-cover" src="${item.coverUrl || ''}" alt="" loading="lazy" onerror="this.style.opacity=0" />
    <div class="card-body">
      <div class="card-title-row">
        <p class="card-title">${escapeHtml(item.title)}</p>
        ${ratingBadge}
      </div>
      <p class="card-meta">${escapeHtml(statusRu)}</p>
      ${note}
      <div class="card-progress-track"><div class="card-progress-fill" id="progress-${item.id}"></div></div>
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

  // если по тайтлу уже есть прогресс чтения — досчитываем реальную долю
  // прочитанных глав (не для каждой карточки подряд, а только для тех, где
  // это вообще имеет смысл, чтобы не заваливать MangaDex запросами)
  if (item.progress) {
    window.hanko.mangadexChapters(item.id, item.title).then((chapters) => {
      if (!chapters || !chapters.length) return;
      const idx = chapters.findIndex((c) => c.id === item.progress.chapterId);
      const percent = idx >= 0 ? Math.round(((idx + 1) / chapters.length) * 100) : 0;
      const fill = card.querySelector(`#progress-${CSS.escape(item.id)}`);
      if (fill) fill.style.width = `${Math.min(100, Math.max(2, percent))}%`;
    }).catch(() => {});
  }

  return card;
}

function skeletonCard() {
  const card = document.createElement('div');
  card.className = 'card skeleton-card';
  card.innerHTML = `
    <div class="skeleton-cover"></div>
    <div class="card-body">
      <div class="skeleton-line"></div>
      <div class="skeleton-line skeleton-line--short"></div>
    </div>
  `;
  return card;
}

function renderSkeletons(grid, count = 6) {
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) grid.appendChild(skeletonCard());
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// по префиксу id главы (rm:/wa:/mb:/без префикса — MangaDex) определяем,
// с какого сайта реально пришли показанные главы — раньше это можно было
// только гадать (у WaManga/MangaBuff у глав нет названий), теперь показываем
// явно рядом со списком глав, чтобы было видно, что именно "легло", если
// какие-то главы вдруг не грузятся.
// Показываем ТОЛЬКО в dev-режиме (запуск через `npm start`) — обычным
// пользователям в собранном .exe эта отладочная информация не нужна и не видна.
let isDevMode = false;
function chapterSourceLabel(chapters) {
  if (!isDevMode) return null;
  if (!chapters || !chapters.length) return null;
  const id = chapters[0].id;
  if (id.startsWith('rm:')) return 'ReManga';
  if (id.startsWith('wa:')) return 'WaManga';
  if (id.startsWith('mb:')) return 'MangaBuff';
  return 'MangaDex';
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

const STATUS_FILTER_OPTIONS = [
  { value: 'ongoing', label: 'Онгоинг' },
  { value: 'completed', label: 'Завершено' },
  { value: 'hiatus', label: 'Приостановлено' },
  { value: 'cancelled', label: 'Отменено' },
];
const FORMAT_FILTER_OPTIONS = [
  { label: 'Манга', langs: ['ja'] },
  { label: 'Манхва', langs: ['ko'] },
  { label: 'Маньхуа', langs: ['zh', 'zh-hk'] },
  { label: 'Западный комикс', langs: ['en'] },
  { label: 'Индонезийский комикс', langs: ['id'] },
];
const mangaFilters = { tagIds: new Set(), status: new Set(), origin: new Set(), order: 'relevance' };
let mangaTagsCache = null;
const MANGA_PAGE_SIZE = 24;
let mangaSearchOffset = 0;
let mangaSearchTotal = 0;

async function runMangaSearch({ resetPage = true } = {}) {
  const q = els.mangaSearchInput.value.trim();
  if (!q && mangaFilters.tagIds.size === 0 && mangaFilters.status.size === 0 && mangaFilters.origin.size === 0) {
    els.mangaSearchSection.hidden = true;
    els.mangaPopularSection.hidden = false;
    return;
  }
  if (resetPage) mangaSearchOffset = 0;
  els.mangaSearchGrid.innerHTML = '<p class="empty-hint">Ищу…</p>';
  els.mangaSearchSection.hidden = false;
  els.mangaPopularSection.hidden = true;
  els.mangaSearchPagination.hidden = true;
  try {
    const { items, total } = await window.hanko.mangadexSearch({
      query: q,
      tagIds: [...mangaFilters.tagIds],
      status: [...mangaFilters.status],
      originalLanguage: [...mangaFilters.origin],
      order: mangaFilters.order,
      offset: mangaSearchOffset,
    });
    mangaSearchTotal = total;
    els.mangaSearchGrid.innerHTML = '';
    if (!items.length) {
      els.mangaSearchGrid.innerHTML = '<p class="empty-hint">Ничего не нашлось.</p>';
      return;
    }
    for (const item of items) {
      const inLibrary = library.some((l) => l.id === item.id);
      els.mangaSearchGrid.appendChild(mangaCard(item, { inLibrary }));
    }
    renderMangaSearchPagination();
  } catch (err) {
    els.mangaSearchGrid.innerHTML = `<p class="empty-hint">Не удалось получить результаты: ${escapeHtml(err.message)}</p>`;
  }
}

// показывает "Назад / Страница X из Y / Вперёд" под результатами поиска манги
// и включает/выключает кнопки по краям диапазона
function renderMangaSearchPagination() {
  const totalPages = Math.max(1, Math.ceil(mangaSearchTotal / MANGA_PAGE_SIZE));
  const currentPage = Math.floor(mangaSearchOffset / MANGA_PAGE_SIZE) + 1;
  els.mangaSearchPagination.hidden = totalPages <= 1;
  els.mangaSearchPageLabel.textContent = `Страница ${currentPage} из ${totalPages}`;
  els.mangaSearchPrevBtn.disabled = mangaSearchOffset <= 0;
  els.mangaSearchNextBtn.disabled = mangaSearchOffset + MANGA_PAGE_SIZE >= mangaSearchTotal;
}

els.mangaSearchPrevBtn.addEventListener('click', () => {
  if (mangaSearchOffset <= 0) return;
  mangaSearchOffset = Math.max(0, mangaSearchOffset - MANGA_PAGE_SIZE);
  runMangaSearch({ resetPage: false });
  els.mangaSearchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
els.mangaSearchNextBtn.addEventListener('click', () => {
  if (mangaSearchOffset + MANGA_PAGE_SIZE >= mangaSearchTotal) return;
  mangaSearchOffset += MANGA_PAGE_SIZE;
  runMangaSearch({ resetPage: false });
  els.mangaSearchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

els.mangaSearchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  runMangaSearch();
});

function updateMangaFiltersBtnLabel() {
  const count = mangaFilters.tagIds.size + mangaFilters.status.size + mangaFilters.origin.size + (mangaFilters.order !== 'relevance' ? 1 : 0);
  els.mangaFiltersBtn.textContent = count > 0 ? `Фильтры (${count})` : 'Фильтры';
}

function filterChip(label, isActive, onToggle) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'filter-chip' + (isActive ? ' is-active' : '');
  chip.textContent = label;
  chip.addEventListener('click', () => {
    chip.classList.toggle('is-active');
    onToggle(chip.classList.contains('is-active'));
  });
  return chip;
}

function renderStatusChips() {
  els.statusFilterRow.innerHTML = '';
  for (const opt of STATUS_FILTER_OPTIONS) {
    els.statusFilterRow.appendChild(filterChip(opt.label, mangaFilters.status.has(opt.value), (active) => {
      if (active) mangaFilters.status.add(opt.value); else mangaFilters.status.delete(opt.value);
    }));
  }
}

function renderFormatChips() {
  els.formatFilterRow.innerHTML = '';
  for (const opt of FORMAT_FILTER_OPTIONS) {
    const isActive = opt.langs.every((l) => mangaFilters.origin.has(l));
    els.formatFilterRow.appendChild(filterChip(opt.label, isActive, (active) => {
      for (const l of opt.langs) {
        if (active) mangaFilters.origin.add(l); else mangaFilters.origin.delete(l);
      }
    }));
  }
}

function renderTagChips(container, tags) {
  container.innerHTML = '';
  for (const tag of tags) {
    container.appendChild(filterChip(tag.name, mangaFilters.tagIds.has(tag.id), (active) => {
      if (active) mangaFilters.tagIds.add(tag.id); else mangaFilters.tagIds.delete(tag.id);
    }));
  }
}

async function openMangaFiltersModal() {
  renderStatusChips();
  renderFormatChips();
  els.mangaSortSelect.value = mangaFilters.order;
  els.mangaFiltersModalBackdrop.hidden = false;

  if (!mangaTagsCache) {
    try {
      mangaTagsCache = await window.hanko.mangadexTags();
      els.genreFilterHint.hidden = true;
      renderTagChips(els.genreFilterRow, mangaTagsCache.genre || []);
      renderTagChips(els.themeFilterRow, mangaTagsCache.theme || []);
    } catch (err) {
      els.genreFilterHint.textContent = `Не удалось загрузить жанры: ${err.message}`;
    }
  } else {
    renderTagChips(els.genreFilterRow, mangaTagsCache.genre || []);
    renderTagChips(els.themeFilterRow, mangaTagsCache.theme || []);
  }
}

els.mangaFiltersBtn.addEventListener('click', openMangaFiltersModal);
els.mangaFiltersModalClose.addEventListener('click', () => { els.mangaFiltersModalBackdrop.hidden = true; });
els.mangaFiltersModalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.mangaFiltersModalBackdrop) els.mangaFiltersModalBackdrop.hidden = true;
});

els.mangaFiltersApplyBtn.addEventListener('click', () => {
  mangaFilters.order = els.mangaSortSelect.value;
  updateMangaFiltersBtnLabel();
  els.mangaFiltersModalBackdrop.hidden = true;
  runMangaSearch();
});

els.mangaFiltersResetBtn.addEventListener('click', () => {
  mangaFilters.tagIds.clear();
  mangaFilters.status.clear();
  mangaFilters.origin.clear();
  mangaFilters.order = 'relevance';
  els.mangaSortSelect.value = 'relevance';
  renderStatusChips();
  renderFormatChips();
  if (mangaTagsCache) {
    renderTagChips(els.genreFilterRow, mangaTagsCache.genre || []);
    renderTagChips(els.themeFilterRow, mangaTagsCache.theme || []);
  }
  updateMangaFiltersBtnLabel();
  els.mangaFiltersModalBackdrop.hidden = true;
  runMangaSearch();
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
  if (!(await showAppConfirm(`Удалить все скачанные главы (${downloads.length})? Это освободит место на диске.`, { title: 'Удалить все главы?', okText: 'Удалить все' }))) return;
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
    // карточки ReManga из поиска приходят без описания/статуса (их нет в ответе
    // каталога) — подгружаем один раз при открытии, до отрисовки модалки
    if (item.id.startsWith('rm:') && !item.description) {
      try {
        const details = await window.hanko.remangaDetails(item.id);
        if (details) {
          item = { ...item, description: details.description, status: details.status || item.status };
        }
      } catch { /* тихо остаёмся без описания, если ReManga недоступен */ }
    }
    const allChapters = await window.hanko.mangadexChapters(item.id, item.title);
    const inLibrary = library.some((l) => l.id === item.id);
    const libItem = library.find((l) => l.id === item.id);
    const historyEntry = readingHistory.find((h) => h.mangaId === item.id);

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
        <span class="chapter-source-badge" id="chapterSourceBadge"></span>
        ${langToggleBlock}
        <button class="btn-secondary" id="chapterSortBtn" type="button">Сначала новые</button>
        <div class="chapter-list-actions" id="chapterListActions"></div>
      </div>
      <div class="chapter-list" id="chapterList"></div>
    `;

    document.getElementById('chapterSortBtn').addEventListener('click', () => {
      chapterSortDesc = !chapterSortDesc;
      document.getElementById('chapterSortBtn').textContent = chapterSortDesc ? 'Сначала старые' : 'Сначала новые';
      renderChapterRows(currentChapters());
    });

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

    let chapterSortDesc = false;
    function currentChapters() {
      const list = activeLang ? allChapters.filter((c) => c.lang === activeLang) : allChapters;
      // allChapters уже отсортирован по возрастанию номера главы — тут только
      // переворачиваем при необходимости, не пересортировываем заново
      return chapterSortDesc ? list.slice().reverse() : list;
    }

    function renderChapterRows(chapters) {
      const list = document.getElementById('chapterList');
      const badge = document.getElementById('chapterSourceBadge');
      if (badge) {
        const label = chapterSourceLabel(chapters);
        badge.textContent = label ? `источник: ${label}` : '';
      }
      list.innerHTML = '';
      if (!chapters.length) {
        list.innerHTML = allChapters.length
          ? '<p class="empty-hint">На этом языке глав не нашлось — переключись на другой.</p>'
          : '<p class="empty-hint">Глав на русском/английском не нашлось.</p>';
        return;
      }
      for (const ch of chapters) {
        const dl = downloads.some((d) => d.mangaId === item.id && d.chapterId === ch.id);
        // если по этой главе сохранён прогресс чтения (сохраняется в openReader
        // при просмотре страниц) — подсвечиваем строку и добавляем бейдж, чтобы
        // было видно, где именно человек остановился, не открывая ридер заново
        const isCurrent = historyEntry?.chapterId === ch.id;
        const row = document.createElement('div');
        row.className = `chapter-row${isCurrent ? ' chapter-row--current' : ''}`;
        row.innerHTML = `
          <div class="chapter-row-main">
            <span class="chapter-row-label">Глава ${escapeHtml(ch.chapter ?? '?')}${ch.title ? ' — ' + escapeHtml(ch.title) : ''}</span>
            ${isCurrent ? '<span class="chapter-row-current-badge">Читаешь</span>' : ''}
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
        const bulk = { running: false, cancelRequested: false, currentChapterIds: new Set() };

        downloadAllBtn.addEventListener('click', async () => {
          if (bulk.running) {
            bulk.cancelRequested = true;
            downloadAllBtn.disabled = true;
            downloadAllBtn.textContent = 'Останавливаю…';
            await Promise.all(
              Array.from(bulk.currentChapterIds).map((chId) =>
                window.hanko.cancelDownload({ mangaId: item.id, chapterId: chId })
              ),
            );
            return;
          }

          const pending = chapters.filter(
            (ch) => !downloads.some((d) => d.mangaId === item.id && d.chapterId === ch.id)
          );
          if (!pending.length) return;

          bulk.running = true;
          bulk.cancelRequested = false;
          bulk.currentChapterIds = new Set();
          downloadAllBtn.disabled = false;
          let done = 0;
          let failed = 0;
          let nextIdx = 0;
          const updateLabel = () => {
            downloadAllBtn.textContent = `Отменить (${done + failed} / ${pending.length})`;
          };
          updateLabel();

          // Несколько глав качаем одновременно, а не строго одну за другой —
          // внутри каждой главы страницы и так уже качаются пулом по 5 штук
          // (см. downloads:start в main.js), так что здесь достаточно небольшой
          // параллельности по главам, чтобы не разгонять суммарное число
          // одновременных запросов к сайту-источнику слишком сильно.
          const CHAPTER_CONCURRENCY = 2;
          async function chapterWorker() {
            while (nextIdx < pending.length && !bulk.cancelRequested) {
              const ch = pending[nextIdx++];
              bulk.currentChapterIds.add(ch.id);
              const dlBtn = document.querySelector(`.chapter-download-btn[data-chapter="${ch.id}"]`);
              if (dlBtn && !dlBtn.disabled) { dlBtn.disabled = true; dlBtn.textContent = '0%'; }
              const result = await window.hanko.startDownload({
                mangaId: item.id, title: item.title, coverUrl: item.coverUrl, chapter: ch,
              });
              bulk.currentChapterIds.delete(ch.id);
              if (result && result.ok !== false) {
                done++;
              } else if (result && result.cancelled) {
                bulk.cancelRequested = true;
                if (dlBtn) { dlBtn.disabled = false; dlBtn.textContent = 'Скачать'; }
              } else {
                failed++;
                if (dlBtn) { dlBtn.disabled = false; dlBtn.textContent = 'Ошибка, повторить?'; }
              }
              updateLabel();
            }
          }

          const workerCount = Math.min(CHAPTER_CONCURRENCY, pending.length);
          await Promise.all(Array.from({ length: workerCount }, () => chapterWorker()));

          bulk.running = false;
          bulk.currentChapterIds = new Set();
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
          if (!(await showAppConfirm(`Удалить скачанные главы (${downloadedCount}) для «${item.title}»?`, { title: 'Удалить главы?' }))) return;
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
  els.readerBody.innerHTML = '<div class="reader-loading-skeleton"></div><div class="reader-loading-skeleton"></div>';
  setZoom(reader.zoom);
  updateChapterNavButtons();

  try {
    const pages = reader.offline
      ? await window.hanko.downloadedPages({ mangaId: item.id, chapterId: chapter.id })
      : await window.hanko.mangadexPages(chapter.id);
    if (!pages.length) {
      els.readerBody.innerHTML = '<p class="empty-hint" style="padding:40px;">Страницы этой главы не найдены у источника (возможно, глава платная или структура ответа сайта отличается от обычной).</p>';
      return;
    }
    reader.pages = pages;
    renderReaderPages();
    setReaderMode(reader.mode);
    if (!reader.offline) {
      recordHistoryProgress({
        mangaId: item.id, title: item.title, coverUrl: item.coverUrl || '',
        chapterId: chapter.id, chapterLabel: reader.chapterLabel, page: 0,
      });
      if (library.some((l) => l.id === item.id)) {
        await window.hanko.setProgress({
          id: item.id, chapterId: chapter.id, chapterLabel: reader.chapterLabel, page: 0,
        });
        library = await window.hanko.loadLibrary();
        renderLibrary();
      }
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
  retry.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M17.65 6.35A8 8 0 106 18.35L4 20M6.35 17.65A8 8 0 0018 6.35L20 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
    <span>Страница не загрузилась — нажми, чтобы попробовать снова</span>
  `;
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
    img.classList.add('is-loaded');
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
  updateReaderProgress();
}

// в постраничном режиме прогресс — по номеру страницы, в вебтун-скролле —
// по фактической прокрутке холста (там нет понятия "текущая страница")
function updateReaderProgress() {
  if (!els.readerProgressFill) return;
  let pct = 0;
  if (reader.mode === 'paged') {
    pct = reader.pages.length ? ((reader.page + 1) / reader.pages.length) * 100 : 0;
  } else {
    const el = els.readerBody;
    const max = el.scrollHeight - el.clientHeight;
    pct = max > 0 ? (el.scrollTop / max) * 100 : 0;
  }
  els.readerProgressFill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

els.readerBody.addEventListener('scroll', () => {
  if (reader.mode === 'scroll') updateReaderProgress();
});

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

// Ctrl/Cmd + колесо мыши — быстрый зум, как в большинстве просмотрщиков изображений
els.readerBody.addEventListener('wheel', (e) => {
  if (!e.ctrlKey && !e.metaKey) return;
  e.preventDefault();
  setZoom((reader.zoom || 1) + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
}, { passive: false });

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
  updateReaderProgress();
}

// Сохраняет прогресс в отдельную историю прочтения (history.json, см. main.js) —
// работает для ЛЮБОГО тайтла, не только из библиотеки. debounce тут не нужен,
// вызывающий код уже сам решает, когда дёргать (один раз при открытии главы,
// раз в 500мс при листании страниц — см. saveReaderProgress ниже).
async function recordHistoryProgress(payload) {
  try {
    readingHistory = await window.hanko.setHistoryProgress(payload);
  } catch { /* история — best-effort, не мешаем чтению, если вдруг не записалось */ }
  if (!els.viewProfile.hidden) renderReadingHistory();
}

let progressSaveTimer = null;
function saveReaderProgress() {
  if (reader.offline || !reader.mangaId) return;
  clearTimeout(progressSaveTimer);
  progressSaveTimer = setTimeout(async () => {
    recordHistoryProgress({
      mangaId: reader.mangaId, title: reader.mangaTitle, coverUrl: reader.coverUrl || '',
      chapterId: reader.chapterId, chapterLabel: reader.chapterLabel, page: reader.page,
    });
    if (library.some((l) => l.id === reader.mangaId)) {
      await window.hanko.setProgress({
        id: reader.mangaId, chapterId: reader.chapterId, chapterLabel: reader.chapterLabel, page: reader.page,
      });
      library = await window.hanko.loadLibrary();
      renderLibrary();
    }
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
    if (!pages.length) {
      els.readerBody.innerHTML = '<p class="empty-hint" style="padding:40px;">Страницы этой главы не найдены у источника (возможно, глава платная или структура ответа сайта отличается от обычной).</p>';
      return;
    }
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

  if (e.ctrlKey || e.metaKey) {
    if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom((reader.zoom || 1) + ZOOM_STEP); return; }
    if (e.key === '-') { e.preventDefault(); setZoom((reader.zoom || 1) - ZOOM_STEP); return; }
    if (e.key === '0') { e.preventDefault(); setZoom(1); return; }
  }

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

// ---------------- аниме: закладки ----------------
// Раньше здесь была вкладка "Мои сайты" (ручные закладки на внешние сайты +
// встроенный webview-браузер) — с тех пор как появился встроенный поиск и
// плеер AniLibria, эта фича стала не нужна, отдельные сайты для просмотра
// искать/открывать в браузере приложения незачем. Убрали полностью, вместо
// неё — обычные закладки на тайтлы AniLibria, по аналогии с библиотекой манги.

function animeLibraryCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  const hist = animeHistory.find((h) => h.releaseId === item.id);
  const fold = hist
    ? `<div class="card-fold"></div><span class="card-fold-label">${escapeHtml(hist.episodeLabel || '')}</span>`
    : '';
  card.innerHTML = `
    ${fold}
    <img class="card-cover" src="${item.coverUrl || ''}" alt="" loading="lazy" onerror="this.style.opacity=0" />
    <div class="card-body">
      <p class="card-title">${escapeHtml(item.title)}</p>
    </div>
    <button class="card-add" title="Убрать из закладок">✕</button>
  `;
  card.addEventListener('click', (e) => {
    if (e.target.closest('.card-add')) return;
    openAnimeTitleModal(item);
  });
  card.querySelector('.card-add').addEventListener('click', async (e) => {
    e.stopPropagation();
    await window.hanko.removeAnimeLibraryItem(item.id);
    animeLibrary = await window.hanko.loadAnimeLibrary();
    renderAnimeLibrary();
  });
  return card;
}

function renderAnimeLibrary() {
  els.animeLibraryGrid.innerHTML = '';
  els.animeLibraryEmpty.hidden = animeLibrary.length > 0;
  for (const item of animeLibrary) els.animeLibraryGrid.appendChild(animeLibraryCard(item));
}

// Записывает прогресс в отдельную историю просмотров (anime-history.json,
// см. main.js) — для ЛЮБОГО тайтла, не только из закладок. Вызывается при
// открытии серии в плеере (см. openAnimePlayer).
async function recordAnimeHistoryProgress(payload) {
  try {
    animeHistory = await window.hanko.setAnimeHistoryProgress(payload);
  } catch { /* история — best-effort, не мешаем просмотру, если не записалось */ }
  if (!els.viewProfile.hidden) renderWatchHistory();
  if (!els.viewAnime.hidden) renderAnimeLibrary();
}

// ---------------- профиль ----------------

async function loadProfileView() {
  profile = await window.hanko.loadProfile();
  renderProfileHeader();
  renderProfileBookmarks();
  renderReadingHistory();
  renderWatchHistory();
  renderProfileStats();
  await refreshOnline();
  await loadMyComments();
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

// сколько карточек показываем прямо в профиле, прежде чем предлагать открыть
// полный список отдельным окном — иначе у тех, кто добавил много тайтлов,
// профиль превращается в бесконечную простыню карточек
const BOOKMARKS_PREVIEW_LIMIT = 12;

function renderProfileBookmarks() {
  els.profileMangaGrid.innerHTML = '';
  els.profileMangaEmpty.hidden = library.length > 0;
  for (const item of library.slice(0, BOOKMARKS_PREVIEW_LIMIT)) {
    els.profileMangaGrid.appendChild(mangaCard(item, { inLibrary: true }));
  }
  els.profileMangaShowAllBtn.hidden = library.length <= BOOKMARKS_PREVIEW_LIMIT;
  els.profileMangaShowAllBtn.textContent = `Показать все (${library.length})`;

  els.profileAnimeGrid.innerHTML = '';
  els.profileAnimeEmpty.hidden = animeLibrary.length > 0;
  for (const item of animeLibrary.slice(0, BOOKMARKS_PREVIEW_LIMIT)) {
    els.profileAnimeGrid.appendChild(animeLibraryCard(item));
  }
  els.profileAnimeShowAllBtn.hidden = animeLibrary.length <= BOOKMARKS_PREVIEW_LIMIT;
  els.profileAnimeShowAllBtn.textContent = `Показать все (${animeLibrary.length})`;
}

function openBookmarksModal(kind) {
  const isManga = kind === 'manga';
  els.bookmarksModalTitle.textContent = isManga ? 'Закладки — манга' : 'Закладки — аниме';
  els.bookmarksModalGrid.innerHTML = '';
  const items = isManga ? library : animeLibrary;
  for (const item of items) {
    els.bookmarksModalGrid.appendChild(isManga ? mangaCard(item, { inLibrary: true }) : animeLibraryCard(item));
  }
  els.bookmarksModalBackdrop.hidden = false;
}
els.profileMangaShowAllBtn.addEventListener('click', () => openBookmarksModal('manga'));
els.profileAnimeShowAllBtn.addEventListener('click', () => openBookmarksModal('anime'));
els.bookmarksModalClose.addEventListener('click', () => { els.bookmarksModalBackdrop.hidden = true; });
els.bookmarksModalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.bookmarksModalBackdrop) els.bookmarksModalBackdrop.hidden = true;
});

// показывает ВСЕ тайтлы, где есть сохранённый прогресс чтения — из отдельной
// истории (history.json, см. main.js), не из library.json, поэтому сюда
// попадает вообще любой открытый тайтл, а не только добавленные в библиотеку.
// Видно только на этом компьютере — раздел никак не связан с friendProfile*,
// который видят друзья, там этого списка нет и не будет.
function renderReadingHistory() {
  const items = readingHistory.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  els.readingHistoryEmpty.hidden = items.length > 0;
  els.readingHistoryClearBtn.hidden = items.length === 0;
  els.readingHistoryList.innerHTML = '';
  for (const h of items) {
    const row = document.createElement('div');
    row.className = 'history-row';
    const date = new Date(h.updatedAt).toLocaleDateString('ru-RU');
    row.innerHTML = `
      <img class="history-row-cover" src="${h.coverUrl || ''}" alt="" onerror="this.style.opacity=0" />
      <div class="history-row-info">
        <span class="history-row-title">${escapeHtml(h.title)}</span>
        <span class="history-row-chapter">${escapeHtml(h.chapterLabel || '')} · ${escapeHtml(date)}</span>
      </div>
      <button class="history-row-remove" type="button" title="Удалить из истории">✕</button>
    `;
    row.addEventListener('click', () => openTitleModal({ id: h.mangaId, title: h.title, coverUrl: h.coverUrl }));
    row.querySelector('.history-row-remove').addEventListener('click', async (e) => {
      e.stopPropagation();
      readingHistory = await window.hanko.removeHistoryItem(h.mangaId);
      renderReadingHistory();
    });
    els.readingHistoryList.appendChild(row);
  }
}
els.readingHistoryClearBtn.addEventListener('click', async () => {
  const ok = await showAppConfirm('Удалить всю историю прочтения? Отменить это будет нельзя.', { title: 'Очистить историю', okText: 'Очистить' });
  if (!ok) return;
  readingHistory = await window.hanko.clearHistory();
  renderReadingHistory();
});

// то же самое, но для просмотра аниме — из anime-history.json, тоже для
// ЛЮБОГО открытого тайтла, не только из аниме-закладок.
function renderWatchHistory() {
  const items = animeHistory.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  els.watchHistoryEmpty.hidden = items.length > 0;
  els.watchHistoryClearBtn.hidden = items.length === 0;
  els.watchHistoryList.innerHTML = '';
  for (const h of items) {
    const row = document.createElement('div');
    row.className = 'history-row';
    const date = new Date(h.updatedAt).toLocaleDateString('ru-RU');
    row.innerHTML = `
      <img class="history-row-cover" src="${h.coverUrl || ''}" alt="" onerror="this.style.opacity=0" />
      <div class="history-row-info">
        <span class="history-row-title">${escapeHtml(h.title)}</span>
        <span class="history-row-chapter">${escapeHtml(h.episodeLabel || '')} · ${escapeHtml(date)}</span>
      </div>
      <button class="history-row-remove" type="button" title="Удалить из истории">✕</button>
    `;
    row.addEventListener('click', () => openAnimeTitleModal({ id: h.releaseId, title: h.title, coverUrl: h.coverUrl }));
    row.querySelector('.history-row-remove').addEventListener('click', async (e) => {
      e.stopPropagation();
      animeHistory = await window.hanko.removeAnimeHistoryItem(h.releaseId);
      renderWatchHistory();
    });
    els.watchHistoryList.appendChild(row);
  }
}
els.watchHistoryClearBtn.addEventListener('click', async () => {
  const ok = await showAppConfirm('Удалить всю историю просмотров? Отменить это будет нельзя.', { title: 'Очистить историю', okText: 'Очистить' });
  if (!ok) return;
  animeHistory = await window.hanko.clearAnimeHistory();
  renderWatchHistory();
});

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
  els.statBooks.textContent = String(library.length);
  els.statFriends.textContent = onlineState.ready ? String(friendsList.length) : '—';
}

els.statFriendsBlock.addEventListener('click', openFriendsQuickModal);
els.statFriendsBlock.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFriendsQuickModal(); }
});

// ---------------- мини-попап «Друзья» (из профиля) + меню действий ----------------

function friendQuickRow(f) {
  const row = document.createElement('div');
  row.className = 'chat-list-item';
  const name = f.display_name || 'Без имени';
  const initial = name.trim().charAt(0).toUpperCase();
  const online = onlineFriendIds.has(f.friend_id);
  row.innerHTML = `
    <span class="chat-list-item-avatar">
      ${escapeHtml(initial)}
      ${online ? '<span class="chat-list-item-online-dot" title="В сети"></span>' : ''}
    </span>
    <div class="chat-list-item-info">
      <span class="chat-list-item-name">${escapeHtml(name)}</span>
      <span class="chat-list-item-sub">Личный чат</span>
    </div>
    <button class="chat-list-item-msg-btn" title="Написать сообщение">
      <svg viewBox="0 0 24 24" width="18" height="18"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  `;
  row.addEventListener('click', () => openFriendActionModal(f));
  row.querySelector('.chat-list-item-msg-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    closeFriendsQuickModal();
    showView('friends');
    openChat(f.friend_id, name);
  });
  return row;
}

function openFriendsQuickModal() {
  els.friendsQuickList.innerHTML = '';
  els.friendsQuickEmpty.hidden = friendsList.length > 0;
  for (const f of friendsList) els.friendsQuickList.appendChild(friendQuickRow(f));
  els.friendsQuickModalBackdrop.hidden = false;
}
function closeFriendsQuickModal() { els.friendsQuickModalBackdrop.hidden = true; }

els.friendsQuickModalClose.addEventListener('click', closeFriendsQuickModal);
els.friendsQuickModalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.friendsQuickModalBackdrop) closeFriendsQuickModal();
});

let quickActionFriend = null;

function openFriendActionModal(f) {
  quickActionFriend = f;
  els.friendActionName.textContent = f.display_name || 'Без имени';
  els.friendActionModalBackdrop.hidden = false;
}
function closeFriendActionModal() {
  els.friendActionModalBackdrop.hidden = true;
  quickActionFriend = null;
}
els.friendActionModalClose.addEventListener('click', closeFriendActionModal);
els.friendActionModalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.friendActionModalBackdrop) closeFriendActionModal();
});

els.friendActionVisitBtn.addEventListener('click', () => {
  if (!quickActionFriend) return;
  const f = quickActionFriend;
  closeFriendActionModal();
  closeFriendsQuickModal();
  openFriendProfile(f.friend_id, f.display_name || 'Без имени');
});

els.friendActionMessageBtn.addEventListener('click', () => {
  if (!quickActionFriend) return;
  const f = quickActionFriend;
  closeFriendActionModal();
  closeFriendsQuickModal();
  showView('friends');
  openChat(f.friend_id, f.display_name || 'Без имени');
});

els.friendActionRemoveBtn.addEventListener('click', async () => {
  if (!quickActionFriend) return;
  const f = quickActionFriend;
  if (!(await showAppConfirm(`Удалить «${f.display_name || 'без имени'}» из друзей?`, { title: 'Удалить из друзей?' }))) return;
  try {
    await window.hanko.onlineUnfriend(f.friend_id);
    closeFriendActionModal();
    closeFriendsQuickModal();
    await refreshFriends();
  } catch (err) {
    alert(err.message);
  }
});

function myCommentRow(c) {
  const row = document.createElement('div');
  row.className = 'chapter-row';
  const date = new Date(c.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  row.innerHTML = `
    <div class="chapter-row-main">
      <span class="chapter-row-label"><b>${escapeHtml(c.author_name)}</b> — ${escapeHtml(c.body)}</span>
      <p class="card-meta" style="margin:2px 0 0;">${escapeHtml(date)}</p>
    </div>
    <button class="friend-request-remove" title="Удалить комментарий">✕</button>
  `;
  row.querySelector('.friend-request-remove').addEventListener('click', async () => {
    try {
      await window.hanko.onlineDeleteProfileComment(c.id);
      await loadMyComments();
    } catch (err) {
      alert(err.message);
    }
  });
  return row;
}

async function loadMyComments() {
  if (!onlineState.ready) {
    els.statComments.textContent = '—';
    return;
  }
  try {
    const comments = await window.hanko.onlineListProfileComments(onlineState.myId);
    els.statComments.textContent = String(comments.length);
    els.myCommentsList.innerHTML = '';
    els.myCommentsEmpty.hidden = comments.length > 0;
    for (const c of comments) els.myCommentsList.appendChild(myCommentRow(c));
  } catch {
    els.statComments.textContent = '—';
  }
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
  if (!(await showAppConfirm('Выйти из аккаунта? На этом компьютере снова станет анонимный (гостевой) профиль.', { title: 'Выйти из аккаунта?', okText: 'Выйти', danger: false }))) return;
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
  row.className = 'chat-list-item';
  if (activeChat && activeChat.friendId === f.friend_id) row.classList.add('is-active');
  const unread = unreadFriendIds.has(f.friend_id);
  const online = onlineFriendIds.has(f.friend_id);
  const name = f.display_name || 'Без имени';
  const initial = name.trim().charAt(0).toUpperCase();
  row.innerHTML = `
    <span class="chat-list-item-avatar">
      ${escapeHtml(initial)}
      ${online ? '<span class="chat-list-item-online-dot" title="В сети"></span>' : ''}
      ${unread ? '<span class="chat-list-item-unread" title="Новое сообщение"></span>' : ''}
    </span>
    <div class="chat-list-item-info">
      <span class="chat-list-item-name">${escapeHtml(name)}</span>
      <span class="chat-list-item-sub">Личный чат</span>
    </div>
  `;
  row.addEventListener('click', () => openChat(f.friend_id, name));
  row.querySelector('.chat-list-item-avatar').addEventListener('click', (e) => {
    e.stopPropagation();
    openFriendProfile(f.friend_id, name);
  });
  return row;
}

let chatListFilter = '';
function renderFriendsList() {
  const filtered = chatListFilter
    ? friendsList.filter((f) => (f.display_name || '').toLowerCase().includes(chatListFilter))
    : friendsList;
  els.friendsList.innerHTML = '';
  els.friendsListEmpty.hidden = friendsList.length > 0;
  for (const f of filtered) els.friendsList.appendChild(friendRow(f));
  renderRailOnlineFriends();
}

// стопка мини-аватаров друзей, которые сейчас в сети — видна из любого раздела,
// не только со вкладки «Друзья», клик сразу открывает переписку с этим другом
const RAIL_ONLINE_MAX = 4;
function renderRailOnlineFriends() {
  if (!els.railOnlineFriends) return;
  const online = friendsList.filter((f) => onlineFriendIds.has(f.friend_id));
  els.railOnlineFriends.innerHTML = '';
  for (const f of online.slice(0, RAIL_ONLINE_MAX)) {
    const name = f.display_name || 'Без имени';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rail-online-avatar';
    btn.title = `${name} — в сети`;
    btn.innerHTML = `${escapeHtml(name.trim().charAt(0).toUpperCase())}<span class="rail-online-avatar-dot"></span>`;
    btn.addEventListener('click', () => {
      showView('friends');
      openChat(f.friend_id, name);
    });
    els.railOnlineFriends.appendChild(btn);
  }
  if (online.length > RAIL_ONLINE_MAX) {
    const more = document.createElement('div');
    more.className = 'rail-online-more';
    more.title = `Ещё в сети: ${online.length - RAIL_ONLINE_MAX}`;
    more.textContent = `+${online.length - RAIL_ONLINE_MAX}`;
    els.railOnlineFriends.appendChild(more);
  }
}

els.chatListSearch.addEventListener('input', () => {
  chatListFilter = els.chatListSearch.value.trim().toLowerCase();
  renderFriendsList();
});

// ---------------- чат ----------------

// сообщения-«стикеры» и «поделиться тайтлом/главой» кодируются как обычный
// текст с непечатаемым префиксом + JSON — так не нужно менять схему Supabase,
// а старые текстовые сообщения (без префикса) остаются обычным текстом
const RICH_PREFIX = '\u0001HANKO1\u0001';

function encodeRichMessage(payload) {
  return RICH_PREFIX + JSON.stringify(payload);
}

async function openSharedContent(rich) {
  const item = { id: rich.mangaId, title: rich.title, coverUrl: rich.coverUrl, status: rich.status };
  if (rich.kind === 'share_title' || !rich.chapterId) {
    openTitleModal(item);
    return;
  }
  try {
    const chapters = await window.hanko.mangadexChapters(rich.mangaId, rich.title);
    const chapter = chapters.find((c) => c.id === rich.chapterId) || { id: rich.chapterId, chapter: rich.chapterNum };
    await openReader(item, chapter, { chapters });
  } catch {
    openTitleModal(item);
  }
}

// показывает "Сегодня"/"Вчера"/дату — разделитель между сообщениями разных
// дней, чтобы не подписывать дату на каждом сообщении (время у сообщений и так
// есть), но было видно, где заканчивается один день переписки и начинается
// другой. dateKey — результат Date.prototype.toDateString(), его же можно
// скормить обратно в `new Date()`, поэтому он и используется как ключ, и как
// исходные данные для человекочитаемой метки
function chatDateLabel(dateKey) {
  const d = new Date(dateKey);
  const now = new Date();
  const startOfDay = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Вчера';
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit', month: 'long',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function chatDateDivider(dateKey) {
  const div = document.createElement('div');
  div.className = 'chat-date-divider';
  div.dataset.dateKey = dateKey;
  div.innerHTML = `<span>${escapeHtml(chatDateLabel(dateKey))}</span>`;
  return div;
}

// добавляет сообщение в чат, вставляя перед ним разделитель даты, если день
// сменился по сравнению с последним элементом в чате (сообщением или уже
// стоящим разделителем)
function appendChatMessage(msg, container = els.chatBody) {
  const bubble = chatBubble(msg);
  const lastEl = container.lastElementChild;
  if (!lastEl || lastEl.dataset.dateKey !== bubble.dataset.dateKey) {
    container.appendChild(chatDateDivider(bubble.dataset.dateKey));
  }
  container.appendChild(bubble);
  return bubble;
}

function chatBubble(msg) {
  const mine = msg.from_id === onlineState.myId;
  const bubble = document.createElement('div');
  bubble.dataset.msgId = msg.id;
  bubble.dataset.dateKey = new Date(msg.created_at).toDateString();
  const time = new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  // галочки показываем только на своих сообщениях — на чужих "прочитано"
  // смотреть нечего, это состояние видно только отправителю
  const readTick = mine
    ? `<span class="chat-bubble-read ${msg.read_at ? 'is-read' : ''}" title="${msg.read_at ? 'Прочитано' : 'Отправлено'}">${msg.read_at ? '✓✓' : '✓'}</span>`
    : '';

  let rich = null;
  if (msg.body && msg.body.startsWith(RICH_PREFIX)) {
    try { rich = JSON.parse(msg.body.slice(RICH_PREFIX.length)); } catch { rich = null; }
  }

  if (rich && rich.kind === 'sticker') {
    bubble.className = `chat-bubble chat-bubble--sticker ${mine ? 'is-mine' : 'is-theirs'}`;
    bubble.innerHTML = `${escapeHtml(rich.emoji)}<span class="chat-bubble-time">${escapeHtml(time)}${readTick}</span>`;
    return bubble;
  }

  if (rich && (rich.kind === 'share_title' || rich.kind === 'share_chapter')) {
    bubble.className = `chat-bubble chat-bubble--card is-clickable ${mine ? 'is-mine' : 'is-theirs'}`;
    const sub = rich.kind === 'share_chapter' ? (rich.chapterLabel || 'Глава') : (rich.status || '');
    bubble.innerHTML = `
      <img class="card-cover" src="${rich.coverUrl || ''}" alt="" loading="lazy" onerror="this.style.opacity=0" />
      <div class="chat-bubble--card-info">
        <span class="chat-bubble--card-title">${escapeHtml(rich.title || '')}</span>
        ${sub ? `<span class="chat-bubble--card-sub">${escapeHtml(sub)}</span>` : ''}
        ${rich.note ? `<span class="chat-bubble--card-note">${escapeHtml(rich.note)}</span>` : ''}
        <span class="chat-bubble-time">${escapeHtml(time)}${readTick}</span>
      </div>
    `;
    bubble.addEventListener('click', () => openSharedContent(rich));
    return bubble;
  }

  bubble.className = `chat-bubble ${mine ? 'is-mine' : 'is-theirs'}`;
  bubble.innerHTML = `${escapeHtml(msg.body)}<span class="chat-bubble-time">${escapeHtml(time)}${readTick}</span>`;
  return bubble;
}

async function openChat(friendId, name) {
  const myToken = ++chatLoadToken;
  activeChat = { friendId, name };
  unreadFriendIds.delete(friendId);
  renderFriendsList();
  updateFriendsNavBadge();
  els.chatPanePlaceholder.hidden = true;
  els.chatPaneActive.hidden = false;
  els.chatTitle.textContent = name;
  els.chatAvatar.textContent = (name || '?').trim().charAt(0).toUpperCase();
  updateChatOnlineLabel();
  els.chatBody.innerHTML = '<p class="empty-hint" style="padding:20px;">Загружаю сообщения…</p>';
  try {
    const messages = await window.hanko.onlineListMessages(friendId);
    // за время запроса пользователь мог открыть другой чат (или заново этот же) —
    // тогда этот, уже устаревший, ответ ничего не должен перезаписывать
    if (myToken !== chatLoadToken) return;
    renderChatMessages(messages);
    window.hanko.onlineMarkMessagesRead(friendId).catch(() => {});
  } catch (err) {
    if (myToken !== chatLoadToken) return;
    els.chatBody.innerHTML = `<p class="empty-hint" style="padding:20px;">Не удалось загрузить: ${escapeHtml(err.message)}</p>`;
  }
  els.chatInput.focus();
}

// true только когда переписка реально показана на экране прямо сейчас (вкладка
// "Друзья" открыта И конкретный диалог отрисован) — раньше проверяли только
// els.chatPaneActive.hidden, а он не сбрасывается при уходе на другую вкладку
// приложения, из-за чего новые сообщения от последнего открытого собеседника
// молча добавлялись в невидимый DOM: не звенел бейдж, не показывалось
// уведомление, и казалось, что сообщения "пропадают"
function isChatPaneVisible() {
  return !els.viewFriends.hidden && !els.chatPaneActive.hidden;
}

function renderChatMessages(messages) {
  // если пока шёл этот самый REST-запрос, по realtime уже прилетело более
  // новое сообщение и попало в DOM — не теряем его при полной перерисовке
  const incomingIds = new Set(messages.map((m) => m.id));
  const liveExtras = Array.from(els.chatBody.querySelectorAll('[data-msg-id]'))
    .filter((el) => !incomingIds.has(el.dataset.msgId));
  els.chatBody.innerHTML = '';
  for (const m of messages) appendChatMessage(m);
  for (const el of liveExtras) {
    const lastEl = els.chatBody.lastElementChild;
    if (!lastEl || lastEl.dataset.dateKey !== el.dataset.dateKey) {
      els.chatBody.appendChild(chatDateDivider(el.dataset.dateKey));
    }
    els.chatBody.appendChild(el);
  }
  els.chatBody.scrollTop = els.chatBody.scrollHeight;
}

els.chatProfileBtn.addEventListener('click', () => {
  if (activeChat) openFriendProfile(activeChat.friendId, activeChat.name);
});

async function sendChatPayload(body) {
  if (!activeChat) return;
  try {
    const msg = await window.hanko.onlineSendMessage({ friendId: activeChat.friendId, body });
    appendChatMessage(msg);
    els.chatBody.scrollTop = els.chatBody.scrollHeight;
  } catch (err) {
    alert(err.message);
  }
}

els.chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = els.chatInput.value.trim();
  if (!body || !activeChat) return;
  els.chatInput.value = '';
  await sendChatPayload(body);
});

// ---------------- попап «поделиться»: стикеры + тайтлы/главы из библиотеки ----------------

const STICKER_SET = ['😀', '😂', '😍', '👍', '🔥', '😢', '😮', '🎉', '❤️', '😴', '🤔', '👀', '😭', '🥳', '🙏', '💀'];

function openShareModal() {
  els.shareNoteInput.value = '';
  renderStickerGrid();
  renderShareTitlesList();
  switchShareTab('stickers');
  els.shareModalBackdrop.hidden = false;
}
function closeShareModal() { els.shareModalBackdrop.hidden = true; }

function switchShareTab(tab) {
  const isStickers = tab === 'stickers';
  els.shareTabStickers.classList.toggle('is-active', isStickers);
  els.shareTabTitles.classList.toggle('is-active', !isStickers);
  els.shareStickerPanel.hidden = !isStickers;
  els.shareTitlesPanel.hidden = isStickers;
}

function renderStickerGrid() {
  els.stickerGrid.innerHTML = '';
  for (const emoji of STICKER_SET) {
    const btn = document.createElement('button');
    btn.className = 'sticker-btn';
    btn.type = 'button';
    btn.textContent = emoji;
    btn.addEventListener('click', async () => {
      closeShareModal();
      await sendChatPayload(encodeRichMessage({ kind: 'sticker', emoji }));
    });
    els.stickerGrid.appendChild(btn);
  }
}

function shareTitleRow(item) {
  const row = document.createElement('div');
  row.className = 'share-title-row';
  row.innerHTML = `
    <img class="card-cover" src="${item.coverUrl || ''}" alt="" loading="lazy" onerror="this.style.opacity=0" />
    <div class="share-title-row-info">
      <span class="chapter-row-label">${escapeHtml(item.title)}</span>
    </div>
    <div class="share-title-row-actions">
      <button type="button" class="share-title-btn">Тайтл</button>
      ${item.progress && item.progress.chapterLabel ? `<button type="button" class="share-chapter-btn">${escapeHtml(item.progress.chapterLabel)}</button>` : ''}
    </div>
  `;
  row.querySelector('.share-title-btn').addEventListener('click', async () => {
    const note = els.shareNoteInput.value.trim();
    closeShareModal();
    await sendChatPayload(encodeRichMessage({
      kind: 'share_title', mangaId: item.id, title: item.title, coverUrl: item.coverUrl, status: item.status, note,
    }));
  });
  const chapterBtn = row.querySelector('.share-chapter-btn');
  if (chapterBtn) {
    chapterBtn.addEventListener('click', async () => {
      const note = els.shareNoteInput.value.trim();
      closeShareModal();
      await sendChatPayload(encodeRichMessage({
        kind: 'share_chapter', mangaId: item.id, title: item.title, coverUrl: item.coverUrl,
        chapterId: item.progress.chapterId,
        chapterNum: (item.progress.chapterLabel || '').replace(/^Гл\.\s*/, ''),
        chapterLabel: item.progress.chapterLabel, note,
      }));
    });
  }
  return row;
}

function renderShareTitlesList() {
  els.shareTitlesList.innerHTML = '';
  els.shareTitlesEmpty.hidden = library.length > 0;
  for (const item of library) els.shareTitlesList.appendChild(shareTitleRow(item));
}

els.chatShareBtn.addEventListener('click', openShareModal);
els.shareModalClose.addEventListener('click', closeShareModal);
els.shareModalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.shareModalBackdrop) closeShareModal();
});
els.shareTabStickers.addEventListener('click', () => switchShareTab('stickers'));
els.shareTabTitles.addEventListener('click', () => switchShareTab('titles'));

// живые уведомления из главного процесса (реалтайм Supabase) — обновляем то,
// что сейчас видно, а остальное подтянется, когда откроют раздел «Профиль»
function updateFriendsNavBadge() {
  const count = unreadFriendIds.size;
  els.friendsNavBadge.hidden = count === 0;
  els.friendsNavBadge.textContent = count > 9 ? '9+' : String(count);
}

function updateChatOnlineLabel() {
  if (!activeChat || els.chatPaneActive.hidden) return;
  const online = onlineFriendIds.has(activeChat.friendId);
  els.chatOnlineLabel.hidden = !online;
  els.chatStatusDot.classList.toggle('is-online', online);
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
  // раньше карточка ничего не делала по клику — теперь открывает тайтл в
  // своей библиотеке (та же логика, что и у истории прочтения): manga_id
  // общий для всех, id тайтла не привязан к конкретному пользователю
  card.addEventListener('click', () => openTitleModal({ id: item.manga_id, title: item.title, coverUrl: item.cover_url }));
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
        els.friendStatComments.textContent = String(Math.max(0, (parseInt(els.friendStatComments.textContent, 10) || 1) - 1));
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

function switchFriendProfileTab(tab) {
  const isProfile = tab === 'profile';
  els.friendProfileTabProfile.classList.toggle('is-active', isProfile);
  els.friendProfileTabBookmarks.classList.toggle('is-active', !isProfile);
  els.friendProfileTabProfilePanel.hidden = !isProfile;
  els.friendProfileTabBookmarksPanel.hidden = isProfile;
}
els.friendProfileTabProfile.addEventListener('click', () => switchFriendProfileTab('profile'));
els.friendProfileTabBookmarks.addEventListener('click', () => switchFriendProfileTab('bookmarks'));

function renderFriendLikeBlock(likesCount, likedByMe) {
  els.friendStatLikes.textContent = String(likesCount);
  els.friendStatLikeBlock.classList.toggle('is-liked', likedByMe);
  els.friendStatLikesLabel.textContent = likedByMe ? 'лайкнуто' : 'лайков';
}

els.friendStatLikeBlock.addEventListener('click', async () => {
  if (!activeFriendProfile) return;
  try {
    const likedNow = await window.hanko.onlineToggleProfileLike(activeFriendProfile.friendId);
    const current = parseInt(els.friendStatLikes.textContent, 10) || 0;
    renderFriendLikeBlock(likedNow ? current + 1 : Math.max(0, current - 1), likedNow);
  } catch (err) {
    alert(err.message);
  }
});

async function openFriendProfile(friendId, name) {
  activeFriendProfile = { friendId, name };
  els.friendProfileOverlay.hidden = false;
  els.friendProfileName.textContent = name;
  els.friendProfileAvatar.textContent = (name || '?').trim().charAt(0).toUpperCase();
  updateFriendProfileOnlineLabel();
  switchFriendProfileTab('profile');

  els.friendProfileError.hidden = true;
  els.friendProfileBio.hidden = true;
  els.friendStatViews.textContent = '0';
  renderFriendLikeBlock(0, false);
  els.friendStatFriends.textContent = '0';
  els.friendStatComments.textContent = '0';
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
      els.friendStatViews.textContent = String(profileData.view_count ?? 0);
      renderFriendLikeBlock(profileData.likes_count ?? 0, !!profileData.liked_by_me);
      els.friendStatFriends.textContent = String(profileData.friends_count ?? 0);
      els.friendStatComments.textContent = String(profileData.comments_count ?? 0);
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
els.friendProfileOverlay.addEventListener('click', (e) => {
  if (e.target === els.friendProfileOverlay) closeFriendProfile();
});

els.friendProfileUnfriendBtn.addEventListener('click', async () => {
  if (!activeFriendProfile) return;
  if (!(await showAppConfirm(`Удалить «${activeFriendProfile.name}» из друзей?`, { title: 'Удалить из друзей?' }))) return;
  try {
    await window.hanko.onlineUnfriend(activeFriendProfile.friendId);
    closeFriendProfile();
    await refreshFriends();
  } catch (err) {
    alert(err.message);
  }
});

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
    els.friendStatComments.textContent = String((parseInt(els.friendStatComments.textContent, 10) || 0) + 1);
  } catch (err) {
    showFriendCommentFeedback(err.message, true);
  }
});

// короткий двухтональный «дзынь» синтезируется на лету через Web Audio —
// без внешнего mp3-файла, звучит одинаково в собранном и несобранном виде
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t = now + i * 0.12;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    });
    setTimeout(() => ctx.close(), 800);
  } catch { /* звук не критичен для работы чата */ }
}

function richPreviewText(rich) {
  if (!rich) return '';
  if (rich.kind === 'sticker') return rich.emoji;
  if (rich.kind === 'share_title') return `Поделился(-ась) тайтлом «${rich.title}»`;
  if (rich.kind === 'share_chapter') return `Поделился(-ась) главой «${rich.title}»`;
  return 'Сообщение';
}

// путь к иконке для нативных уведомлений — реальный путь на диске (не внутри
// asar), иначе Windows тихо не показывает баннер уведомления, см. main.js
let notificationIconPath = null;
window.hanko.getNotificationIcon().then((p) => { notificationIconPath = p; }).catch(() => {});

function notifyIncomingMessage(msg) {
  playNotificationSound();
  try {
    const friend = friendsList.find((f) => f.friend_id === msg.from_id);
    const name = friend?.display_name || 'Новое сообщение';
    let bodyText = msg.body || '';
    if (bodyText.startsWith(RICH_PREFIX)) {
      try { bodyText = richPreviewText(JSON.parse(bodyText.slice(RICH_PREFIX.length))); } catch { bodyText = 'Сообщение'; }
    }
    const notif = new Notification(name, {
      body: bodyText,
      icon: notificationIconPath || 'assets/icon.png',
      silent: true, // звук уже играем сами через playNotificationSound() — свой звук приятнее и тише, чем системный виндовый
    });
    notif.onclick = async () => {
      await window.hanko.focusApp();
      showView('friends');
      openChat(msg.from_id, name);
    };
    // Windows сам решает, когда убрать всплывающий баннер — и после этого
    // уведомление просто оседает в Центре уведомлений насовсем. Явный close()
    // до этого момента убирает его целиком, а не только сам баннер, поэтому
    // всплывающее окошко ты всё равно увидишь, но в истории уведомлений оно
    // не останется.
    setTimeout(() => { try { notif.close(); } catch {} }, 6000);
  } catch { /* нативные уведомления не критичны */ }
}

window.hanko.onOnlineEvent(async (event) => {
  if (event.type === 'friend-request-incoming') {
    if (!els.viewFriends.hidden) await refreshIncoming();
  } else if (event.type === 'friend-request-updated') {
    if (!els.viewFriends.hidden) await Promise.all([refreshOutgoing(), refreshFriends()]);
    else friendsList = await window.hanko.onlineListFriends();
    renderRailOnlineFriends();
  } else if (event.type === 'presence') {
    onlineFriendIds = new Set(event.onlineIds);
    if (!els.viewFriends.hidden) renderFriendsList();
    else renderRailOnlineFriends();
    updateChatOnlineLabel();
    updateFriendProfileOnlineLabel();
  } else if (event.type === 'message') {
    const msg = event.message;
    const isActiveChatOpen = activeChat && msg.from_id === activeChat.friendId && isChatPaneVisible();
    if (isActiveChatOpen) {
      // сообщение уже могло попасть в DOM через REST-подгрузку истории в
      // openChat() (гонка запросов) — не дублируем бабл, если он уже есть
      if (!els.chatBody.querySelector(`[data-msg-id="${CSS.escape(msg.id)}"]`)) {
        appendChatMessage(msg);
        els.chatBody.scrollTop = els.chatBody.scrollHeight;
      }
      window.hanko.onlineMarkMessagesRead(msg.from_id).catch(() => {});
      // document.hasFocus() раньше решал, показывать ли сообщение живьём —
      // но эта проверка ненадёжна (мигает из-за webview на вкладке "Аниме"),
      // из-за чего сообщение не появлялось, пока не перезайдёшь в чат. Раз
      // нужный диалог открыт — просто показываем сообщение всегда, а системное
      // уведомление даём только если по факту нет фокуса окна.
      if (!document.hasFocus()) notifyIncomingMessage(msg);
    } else {
      unreadFriendIds.add(msg.from_id);
      updateFriendsNavBadge();
      if (!els.viewFriends.hidden) renderFriendsList();
      notifyIncomingMessage(msg);
    }
  } else if (event.type === 'message-read') {
    // друг прочитал одно из моих сообщений — если этот чат сейчас открыт,
    // проставляем двойную галочку прямо в DOM, без перезагрузки всей истории
    const msg = event.message;
    if (activeChat && msg.to_id === activeChat.friendId) {
      const bubble = els.chatBody.querySelector(`[data-msg-id="${CSS.escape(msg.id)}"] .chat-bubble-read`);
      if (bubble) {
        bubble.classList.add('is-read');
        bubble.textContent = '✓✓';
        bubble.title = 'Прочитано';
      }
    }
  }
});

// ---------------- старт ----------------

async function init() {
  const [settings, lib, downloadsList, historyList, animeLibList, animeHistList] = await Promise.all([
    window.hanko.loadSettings(),
    window.hanko.loadLibrary(),
    window.hanko.listDownloads(),
    window.hanko.loadHistory(),
    window.hanko.loadAnimeLibrary(),
    window.hanko.loadAnimeHistory(),
  ]);
  isDevMode = await window.hanko.isDev();
  library = lib;
  downloads = downloadsList;
  readingHistory = historyList;
  animeLibrary = animeLibList;
  animeHistory = animeHistList;
  applyTheme(settings.theme);
  renderLibrary();
  renderAnimeLibrary();
  renderDownloads();
  const lastTab = ['anime', 'home', 'profile', 'friends'].includes(settings.lastTab) ? settings.lastTab : 'manga';
  showView(lastTab);
  // подключаемся к онлайну в фоне — не блокируем остальной запуск и не ждём,
  // пока откроют «Профиль», чтобы заявки/сообщения могли прийти в любой момент
  connectOnline();
}

// ---------------- баннер автообновления ----------------

function renderUpdateBanner(status) {
  if (!status || status.state === 'idle' || status.state === 'error') {
    els.updateBanner.hidden = true;
    return;
  }
  els.updateBanner.hidden = false;
  const v = status.version ? ` v${status.version}` : '';
  if (status.state === 'available') {
    els.updateBannerTitle.textContent = `Найдено обновление${v} — скачиваю…`;
    els.updateBannerFill.style.width = '6%';
    els.updateBannerBtn.hidden = true;
  } else if (status.state === 'downloading') {
    const pct = Math.round(status.percent || 0);
    els.updateBannerTitle.textContent = `Скачивается обновление${v} — ${pct}%`;
    els.updateBannerFill.style.width = `${Math.max(6, pct)}%`;
    els.updateBannerBtn.hidden = true;
  } else if (status.state === 'ready') {
    els.updateBannerTitle.textContent = `Обновление${v} готово`;
    els.updateBannerFill.style.width = '100%';
    els.updateBannerBtn.hidden = false;
  }
}

window.hanko.onUpdateStatus(renderUpdateBanner);
window.hanko.updateGetStatus().then(renderUpdateBanner);
els.updateBannerBtn.addEventListener('click', () => window.hanko.updateInstall());

// ---------------- фоновая сцена: город на заднем плане ----------------

const SVG_NS = 'http://www.w3.org/2000/svg';
function buildBackgroundSkyline() {
  const far = document.getElementById('bgSkylineFar');
  const near = document.getElementById('bgSkylineNear');
  if (!far || !near) return;

  const farLayout = [
    { x: 0, w: 120, h: 280 }, { x: 140, w: 90, h: 320 }, { x: 260, w: 140, h: 250 },
    { x: 430, w: 100, h: 300 }, { x: 560, w: 160, h: 270 }, { x: 760, w: 110, h: 330 },
    { x: 900, w: 130, h: 260 }, { x: 1060, w: 95, h: 310 }, { x: 1190, w: 150, h: 250 },
    { x: 1370, w: 110, h: 290 }, { x: 1510, w: 120, h: 240 },
  ];
  const grads = ['url(#bgA)', 'url(#bgB)', 'url(#bgC)', 'url(#bgD)'];
  farLayout.forEach((b, i) => {
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', b.x);
    rect.setAttribute('y', 420 - b.h);
    rect.setAttribute('width', b.w);
    rect.setAttribute('height', b.h);
    rect.setAttribute('fill', grads[i % grads.length]);
    far.appendChild(rect);
  });

  const nearLayout = [
    { x: -20, w: 100, h: 260 }, { x: 70, w: 70, h: 200 }, { x: 150, w: 130, h: 320 }, { x: 290, w: 90, h: 230 },
    { x: 390, w: 150, h: 290 }, { x: 550, w: 80, h: 210 }, { x: 640, w: 120, h: 350 }, { x: 770, w: 100, h: 250 },
    { x: 880, w: 160, h: 300 }, { x: 1050, w: 90, h: 220 }, { x: 1150, w: 140, h: 340 }, { x: 1300, w: 100, h: 260 },
    { x: 1410, w: 130, h: 310 }, { x: 1550, w: 80, h: 230 },
  ];
  nearLayout.forEach((b, i) => {
    const y = 420 - b.h;
    const fill = grads[i % grads.length];
    const g = document.createElementNS(SVG_NS, 'g');

    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', b.x); rect.setAttribute('y', y);
    rect.setAttribute('width', b.w); rect.setAttribute('height', b.h);
    rect.setAttribute('fill', fill);
    rect.setAttribute('rx', 4);
    g.appendChild(rect);

    const roofType = i % 3;
    if (roofType === 0) {
      const antenna = document.createElementNS(SVG_NS, 'line');
      antenna.setAttribute('x1', b.x + b.w / 2); antenna.setAttribute('y1', y - 34);
      antenna.setAttribute('x2', b.x + b.w / 2); antenna.setAttribute('y2', y);
      antenna.setAttribute('stroke', '#8a7aa8'); antenna.setAttribute('stroke-width', 2);
      g.appendChild(antenna);
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('cx', b.x + b.w / 2); dot.setAttribute('cy', y - 34); dot.setAttribute('r', 4);
      dot.setAttribute('fill', '#ff8a7a');
      g.appendChild(dot);
    } else if (roofType === 1) {
      const box = document.createElementNS(SVG_NS, 'rect');
      box.setAttribute('x', b.x + b.w * 0.25); box.setAttribute('y', y - 22);
      box.setAttribute('width', b.w * 0.5); box.setAttribute('height', 22);
      box.setAttribute('fill', fill); box.setAttribute('rx', 3);
      g.appendChild(box);
    } else {
      const dome = document.createElementNS(SVG_NS, 'circle');
      dome.setAttribute('cx', b.x + b.w / 2); dome.setAttribute('cy', y); dome.setAttribute('r', b.w * 0.22);
      dome.setAttribute('fill', fill);
      g.appendChild(dome);
    }

    const cols = Math.max(2, Math.floor(b.w / 18));
    const rows = Math.max(3, Math.floor(b.h / 22));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.28) continue;
        const win = document.createElementNS(SVG_NS, 'rect');
        const wx = b.x + 8 + (c * (b.w - 16)) / cols;
        const wy = y + 14 + (r * (b.h - 24)) / rows;
        win.setAttribute('x', wx); win.setAttribute('y', wy);
        win.setAttribute('width', 6); win.setAttribute('height', 8);
        const lit = Math.random() < 0.35;
        win.setAttribute('fill', lit ? '#ffe19a' : 'rgba(120,100,150,0.35)');
        g.appendChild(win);
      }
    }
    near.appendChild(g);
  });

  // «вайфай-башня» — фирменная деталь фона
  const wifi = document.createElementNS(SVG_NS, 'g');
  const wx0 = 700, wy0 = 200, ww = 90, wh = 220;
  const wrect = document.createElementNS(SVG_NS, 'rect');
  wrect.setAttribute('x', wx0); wrect.setAttribute('y', wy0);
  wrect.setAttribute('width', ww); wrect.setAttribute('height', wh);
  wrect.setAttribute('fill', '#5a6fb0'); wrect.setAttribute('rx', 4);
  wifi.appendChild(wrect);
  [0, 1, 2].forEach((bar) => {
    const barEl = document.createElementNS(SVG_NS, 'path');
    const r = 14 + bar * 12;
    barEl.setAttribute('d', `M ${wx0 + ww / 2 - r} ${wy0 + 70} A ${r} ${r} 0 0 1 ${wx0 + ww / 2 + r} ${wy0 + 70}`);
    barEl.setAttribute('stroke', '#fff'); barEl.setAttribute('stroke-width', 5);
    barEl.setAttribute('fill', 'none'); barEl.setAttribute('stroke-linecap', 'round');
    barEl.setAttribute('opacity', 0.9 - bar * 0.15);
    wifi.appendChild(barEl);
  });
  near.appendChild(wifi);
}
buildBackgroundSkyline();

// ---------- Аниме: поиск / карточка / список серий / плеер (AniLibria) ----------

function anilibriaCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  const statusRu = item.status ? (MANGA_STATUS_RU[item.status] || item.status) : '';
  card.innerHTML = `
    <img class="card-cover" src="${item.coverUrl || ''}" alt="" loading="lazy" onerror="this.style.opacity=0" />
    <div class="card-body">
      <div class="card-title-row"><p class="card-title">${escapeHtml(item.title)}</p></div>
      <p class="card-meta">${escapeHtml(statusRu)}</p>
    </div>
  `;
  card.addEventListener('click', () => openAnimeTitleModal(item));
  return card;
}

// Тип и жанры — из реальных ответов AniLibria API (не выдумано): id/название
// жанров подтверждены напрямую из каталога, но это не полный список всех
// жанров сайта, только те, что успели встретиться. Имя параметра фильтра
// (f[type]/f[genres]/f[is_ongoing]) — по аналогии с подтверждённым f[search],
// не проверено настолько же строго — если не совпадёт, фильтр просто не
// сработает, само приложение не сломается.
const ANIME_TYPE_OPTIONS = [
  { value: 'TV', label: 'ТВ' },
  { value: 'MOVIE', label: 'Фильм' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'SPECIAL', label: 'Спешл' },
];
const ANIME_STATUS_OPTIONS = [
  { value: 'ongoing', label: 'Онгоинг' },
  { value: 'completed', label: 'Завершено' },
];
const ANIME_GENRE_OPTIONS = [
  { id: 1, name: 'Комедия' }, { id: 4, name: 'Сёнен' }, { id: 5, name: 'Сейнен' },
  { id: 8, name: 'Драма' }, { id: 11, name: 'Романтика' }, { id: 14, name: 'Экшен' },
  { id: 15, name: 'Боевые искусства' }, { id: 20, name: 'Сёдзе' }, { id: 21, name: 'Супер сила' },
  { id: 26, name: 'Исторический' }, { id: 27, name: 'Приключения' }, { id: 28, name: 'Сверхъестественное' },
  { id: 29, name: 'Фэнтези' },
];
const animeFilters = { type: '', status: '', genreIds: new Set() };
const ANIME_PAGE_SIZE = 24;
let animeSearchPage = 1;
let animeSearchTotal = 0;

function buildAnimeSearchOpts(query) {
  return {
    query,
    page: animeSearchPage,
    limit: ANIME_PAGE_SIZE,
    type: animeFilters.type,
    isOngoing: animeFilters.status ? animeFilters.status === 'ongoing' : null,
    genreIds: [...animeFilters.genreIds],
  };
}

async function runAnimeSearch({ resetPage = true } = {}) {
  const q = els.animeSearchInput.value.trim();
  const hasFilters = animeFilters.type || animeFilters.status || animeFilters.genreIds.size > 0;
  if (!q && !hasFilters) {
    els.animeSearchSection.hidden = true;
    els.animePopularSection.hidden = false;
    return;
  }
  if (resetPage) animeSearchPage = 1;
  els.animeSearchGrid.innerHTML = '<p class="empty-hint">Ищу…</p>';
  els.animeSearchSection.hidden = false;
  els.animePopularSection.hidden = true;
  els.animeSearchPagination.hidden = true;
  try {
    const { items, total } = await window.hanko.anilibriaSearch(buildAnimeSearchOpts(q));
    animeSearchTotal = total;
    els.animeSearchGrid.innerHTML = '';
    if (!items.length) {
      els.animeSearchGrid.innerHTML = '<p class="empty-hint">Ничего не нашлось.</p>';
      return;
    }
    for (const item of items) els.animeSearchGrid.appendChild(anilibriaCard(item));
    renderAnimeSearchPagination();
  } catch (err) {
    els.animeSearchGrid.innerHTML = `<p class="empty-hint">Не удалось получить результаты: ${escapeHtml(err.message)}</p>`;
  }
}

function renderAnimeSearchPagination() {
  const totalPages = Math.max(1, Math.ceil(animeSearchTotal / ANIME_PAGE_SIZE));
  els.animeSearchPagination.hidden = totalPages <= 1;
  els.animeSearchPageLabel.textContent = `Страница ${animeSearchPage} из ${totalPages}`;
  els.animeSearchPrevBtn.disabled = animeSearchPage <= 1;
  els.animeSearchNextBtn.disabled = animeSearchPage >= totalPages;
}

els.animeSearchPrevBtn.addEventListener('click', () => {
  if (animeSearchPage <= 1) return;
  animeSearchPage -= 1;
  runAnimeSearch({ resetPage: false });
  els.animeSearchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
els.animeSearchNextBtn.addEventListener('click', () => {
  const totalPages = Math.max(1, Math.ceil(animeSearchTotal / ANIME_PAGE_SIZE));
  if (animeSearchPage >= totalPages) return;
  animeSearchPage += 1;
  runAnimeSearch({ resetPage: false });
  els.animeSearchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

els.animeSearchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  runAnimeSearch();
});

let animePopularLoaded = false;
async function loadAnimePopular() {
  if (animePopularLoaded) return;
  animePopularLoaded = true;
  els.animePopularHint.hidden = true;
  renderSkeletons(els.animePopularGrid);
  try {
    const { items } = await window.hanko.anilibriaPopular();
    els.animePopularHint.hidden = items.length > 0;
    els.animePopularHint.textContent = 'Пусто.';
    els.animePopularGrid.innerHTML = '';
    for (const item of items) els.animePopularGrid.appendChild(anilibriaCard(item));
  } catch (err) {
    els.animePopularHint.hidden = false;
    els.animePopularHint.textContent = `Не удалось загрузить: ${err.message}`;
  }
}

function updateAnimeFiltersBtnLabel() {
  const count = (animeFilters.type ? 1 : 0) + (animeFilters.status ? 1 : 0) + animeFilters.genreIds.size;
  els.animeFiltersBtn.textContent = count > 0 ? `Фильтры (${count})` : 'Фильтры';
}

function renderAnimeTypeChips() {
  els.animeTypeFilterRow.innerHTML = '';
  for (const opt of ANIME_TYPE_OPTIONS) {
    els.animeTypeFilterRow.appendChild(filterChip(opt.label, animeFilters.type === opt.value, (active) => {
      animeFilters.type = active ? opt.value : '';
      renderAnimeTypeChips();
    }));
  }
}

function renderAnimeStatusChips() {
  els.animeStatusFilterRow.innerHTML = '';
  for (const opt of ANIME_STATUS_OPTIONS) {
    els.animeStatusFilterRow.appendChild(filterChip(opt.label, animeFilters.status === opt.value, (active) => {
      animeFilters.status = active ? opt.value : '';
      renderAnimeStatusChips();
    }));
  }
}

function renderAnimeGenreChips() {
  els.animeGenreFilterRow.innerHTML = '';
  for (const opt of ANIME_GENRE_OPTIONS) {
    els.animeGenreFilterRow.appendChild(filterChip(opt.name, animeFilters.genreIds.has(opt.id), (active) => {
      if (active) animeFilters.genreIds.add(opt.id); else animeFilters.genreIds.delete(opt.id);
    }));
  }
}

function openAnimeFiltersModal() {
  renderAnimeTypeChips();
  renderAnimeStatusChips();
  renderAnimeGenreChips();
  els.animeFiltersModalBackdrop.hidden = false;
}
els.animeFiltersBtn.addEventListener('click', openAnimeFiltersModal);
els.animeFiltersModalClose.addEventListener('click', () => { els.animeFiltersModalBackdrop.hidden = true; });
els.animeFiltersModalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.animeFiltersModalBackdrop) els.animeFiltersModalBackdrop.hidden = true;
});
els.animeFiltersApplyBtn.addEventListener('click', () => {
  updateAnimeFiltersBtnLabel();
  els.animeFiltersModalBackdrop.hidden = true;
  runAnimeSearch();
});
els.animeFiltersResetBtn.addEventListener('click', () => {
  animeFilters.type = '';
  animeFilters.status = '';
  animeFilters.genreIds.clear();
  renderAnimeTypeChips();
  renderAnimeStatusChips();
  renderAnimeGenreChips();
  updateAnimeFiltersBtnLabel();
  els.animeFiltersModalBackdrop.hidden = true;
  runAnimeSearch();
});

async function openAnimeTitleModal(item) {
  const inLibrary = animeLibrary.some((l) => l.id === item.id);
  els.animeTitleModalBackdrop.hidden = false;
  els.animeTitleModalBody.innerHTML = `
    <div class="title-modal-header">
      <img src="${item.coverUrl || ''}" alt="" onerror="this.style.opacity=0" />
      <div>
        <h2>${escapeHtml(item.title)}</h2>
        <p>${escapeHtml(item.description || '')}</p>
        <button class="btn-secondary" id="animeLibToggleBtn" style="margin-top:10px;">
          ${inLibrary ? 'Убрать из закладок' : 'Добавить в закладки'}
        </button>
      </div>
    </div>
    <h3 class="section-title">Серии</h3>
    <div class="chapter-list" id="animeEpisodeList"><p class="empty-hint">Загружаю…</p></div>
  `;
  document.getElementById('animeLibToggleBtn').addEventListener('click', async () => {
    if (animeLibrary.some((l) => l.id === item.id)) {
      await window.hanko.removeAnimeLibraryItem(item.id);
    } else {
      await window.hanko.upsertAnimeLibraryItem({ id: item.id, title: item.title, coverUrl: item.coverUrl });
    }
    animeLibrary = await window.hanko.loadAnimeLibrary();
    renderAnimeLibrary();
    openAnimeTitleModal(item);
  });
  try {
    const episodes = await window.hanko.anilibriaEpisodes(item.id);
    const list = document.getElementById('animeEpisodeList');
    if (!episodes.length) {
      list.innerHTML = '<p class="empty-hint">Серий пока не нашлось.</p>';
      return;
    }
    list.innerHTML = '';
    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[i];
      const row = document.createElement('div');
      row.className = 'chapter-row';
      row.innerHTML = `<div class="chapter-row-main"><span class="chapter-row-label">Серия ${escapeHtml(ep.chapter)}${ep.title ? ' — ' + escapeHtml(ep.title) : ''}</span></div>`;
      row.addEventListener('click', () => openAnimePlayer(item, episodes, i));
      list.appendChild(row);
    }
  } catch (err) {
    document.getElementById('animeEpisodeList').innerHTML = `<p class="empty-hint">Не удалось получить серии: ${escapeHtml(err.message)}</p>`;
  }
}

els.animeTitleModalClose.addEventListener('click', () => { els.animeTitleModalBackdrop.hidden = true; });
els.animeTitleModalBackdrop.addEventListener('click', (e) => {
  if (e.target === els.animeTitleModalBackdrop) els.animeTitleModalBackdrop.hidden = true;
});

// один общий экземпляр hls.js на всё приложение — пересоздавать его на каждую
// серию не нужно, docs самого hls.js рекомендуют переиспользовать loadSource
let hlsPlayer = null;
let animePlayerState = null; // { item, episodes, index }

function attachAnimeSource(url) {
  const video = els.animeVideo;
  if (window.Hls && window.Hls.isSupported()) {
    if (!hlsPlayer) hlsPlayer = new window.Hls();
    hlsPlayer.loadSource(url);
    hlsPlayer.attachMedia(video);
  } else {
    // Safari и некоторые сборки Chromium умеют HLS нативно через <video src>
    video.src = url;
  }
}

function openAnimePlayer(item, episodes, index) {
  animePlayerState = { item, episodes, index };
  const ep = episodes[index];
  els.animePlayerOverlay.hidden = false;
  els.animePlayerTitle.textContent = `${item.title} — серия ${ep.chapter}`;
  els.animeEpLabel.textContent = `${index + 1} / ${episodes.length}`;
  els.animeEpPrevBtn.disabled = index <= 0;
  els.animeEpNextBtn.disabled = index >= episodes.length - 1;

  recordAnimeHistoryProgress({
    releaseId: item.id, title: item.title, coverUrl: item.coverUrl || '',
    episodeIndex: index, episodeLabel: `Серия ${ep.chapter}`,
  });

  els.animeQualitySelect.innerHTML = ep.qualities
    .map((q, i) => `<option value="${i}">${escapeHtml(q.label)}</option>`).join('');
  const best = ep.qualities[0];
  if (best) attachAnimeSource(best.url);
  syncAnimeControlsUI();
  showAnimeControls({ keepVisible: true });
}

els.animeQualitySelect.addEventListener('change', () => {
  if (!animePlayerState) return;
  const { episodes, index } = animePlayerState;
  const q = episodes[index].qualities[Number(els.animeQualitySelect.value)];
  if (q) {
    const time = els.animeVideo.currentTime;
    attachAnimeSource(q.url);
    els.animeVideo.addEventListener('loadedmetadata', () => { els.animeVideo.currentTime = time; }, { once: true });
  }
});

function closeAnimePlayer() {
  els.animePlayerOverlay.hidden = true;
  els.animeVideo.pause();
  els.animeVideo.removeAttribute('src');
  if (hlsPlayer) { hlsPlayer.detachMedia(); }
  animePlayerState = null;
  clearTimeout(animeIdleTimer);
  els.animePlayerOverlay.classList.remove('is-idle');
}
els.animePlayerBack.addEventListener('click', closeAnimePlayer);

els.animeEpPrevBtn.addEventListener('click', () => {
  if (!animePlayerState || animePlayerState.index <= 0) return;
  const { item, episodes, index } = animePlayerState;
  openAnimePlayer(item, episodes, index - 1);
});
els.animeEpNextBtn.addEventListener('click', () => {
  if (!animePlayerState || animePlayerState.index >= animePlayerState.episodes.length - 1) return;
  const { item, episodes, index } = animePlayerState;
  openAnimePlayer(item, episodes, index + 1);
});

// ---------------- кастомные контролы плеера аниме ----------------
// раньше был обычный <video controls> — теперь свой набор в стиле ридера
// манги (тёмный оверлей, стеклянные панели, коралловый акцент), с
// автоскрытием панели во время просмотра, как у обычных видеоплееров.

const ANIME_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
let animeIdleTimer = null;
let animeIsDraggingSeek = false;
let animeVolumeBeforeMute = 1;

function formatAnimeTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const ANIME_PLAY_ICON = '<path d="M8 5v14l12-7L8 5z" fill="currentColor"/>';
const ANIME_PAUSE_ICON = '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>';

function updateAnimePlayIcon() {
  const paused = els.animeVideo.paused || els.animeVideo.ended;
  els.animePlayPauseBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20">${paused ? ANIME_PLAY_ICON : ANIME_PAUSE_ICON}</svg>`;
  els.animeCenterBtn.hidden = !paused;
}

function toggleAnimePlayback() {
  if (els.animeVideo.paused || els.animeVideo.ended) els.animeVideo.play().catch(() => {});
  else els.animeVideo.pause();
}

function syncAnimeControlsUI() {
  const video = els.animeVideo;
  updateAnimePlayIcon();
  els.animeVolumeSlider.value = video.muted ? 0 : video.volume;
  updateAnimeVolumeIcon();
  const speedIndex = ANIME_SPEEDS.indexOf(video.playbackRate);
  els.animeSpeedBtn.textContent = `${ANIME_SPEEDS[speedIndex] ?? video.playbackRate ?? 1}x`;
  els.animeTimeCurrent.textContent = formatAnimeTime(video.currentTime);
  els.animeTimeDuration.textContent = formatAnimeTime(video.duration);
}

function updateAnimeVolumeIcon() {
  const video = els.animeVideo;
  const level = video.muted || video.volume === 0 ? 'muted' : video.volume < 0.5 ? 'low' : 'high';
  const icons = {
    muted: '<path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/><path d="M18 9l5 6M23 9l-5 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    low: '<path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a4 4 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    high: '<path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/><path d="M16.5 8.5a4 4 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M19 6a7.5 7.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  };
  els.animeVolumeIcon.innerHTML = icons[level];
}

// ---- play/pause ----
els.animePlayPauseBtn.addEventListener('click', toggleAnimePlayback);
els.animeCenterBtn.addEventListener('click', toggleAnimePlayback);
els.animeVideo.addEventListener('click', toggleAnimePlayback);
els.animeVideo.addEventListener('play', () => { updateAnimePlayIcon(); armAnimeIdleTimer(); });
els.animeVideo.addEventListener('pause', () => { updateAnimePlayIcon(); showAnimeControls({ keepVisible: true }); });
els.animeVideo.addEventListener('ended', () => { updateAnimePlayIcon(); showAnimeControls({ keepVisible: true }); });

// ---- перемотка ±10 сек ----
els.animeSkipBackBtn.addEventListener('click', () => {
  els.animeVideo.currentTime = Math.max(0, els.animeVideo.currentTime - 10);
});
els.animeSkipFwdBtn.addEventListener('click', () => {
  const dur = els.animeVideo.duration;
  els.animeVideo.currentTime = Number.isFinite(dur) ? Math.min(dur, els.animeVideo.currentTime + 10) : els.animeVideo.currentTime + 10;
});

// ---- прогресс-бар: клик и перетаскивание ----
function animeSeekRatioFromEvent(e) {
  const rect = els.animeSeekTrack.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  return Math.min(1, Math.max(0, x / rect.width));
}
function renderAnimeSeekUI(ratio) {
  els.animeSeekFill.style.width = `${ratio * 100}%`;
  els.animeSeekThumb.style.left = `${ratio * 100}%`;
}
els.animeSeekTrack.addEventListener('mousedown', (e) => {
  animeIsDraggingSeek = true;
  els.animeSeekTrack.classList.add('is-dragging');
  const ratio = animeSeekRatioFromEvent(e);
  renderAnimeSeekUI(ratio);
  if (Number.isFinite(els.animeVideo.duration)) els.animeVideo.currentTime = ratio * els.animeVideo.duration;
  showAnimeControls({ keepVisible: true });
});
document.addEventListener('mousemove', (e) => {
  if (!animeIsDraggingSeek) return;
  const ratio = animeSeekRatioFromEvent(e);
  renderAnimeSeekUI(ratio);
  if (Number.isFinite(els.animeVideo.duration)) els.animeVideo.currentTime = ratio * els.animeVideo.duration;
});
document.addEventListener('mouseup', () => {
  if (!animeIsDraggingSeek) return;
  animeIsDraggingSeek = false;
  els.animeSeekTrack.classList.remove('is-dragging');
  armAnimeIdleTimer();
});

els.animeVideo.addEventListener('timeupdate', () => {
  if (animeIsDraggingSeek) return;
  const ratio = els.animeVideo.duration ? els.animeVideo.currentTime / els.animeVideo.duration : 0;
  renderAnimeSeekUI(ratio);
  els.animeTimeCurrent.textContent = formatAnimeTime(els.animeVideo.currentTime);
});
els.animeVideo.addEventListener('loadedmetadata', () => {
  els.animeTimeDuration.textContent = formatAnimeTime(els.animeVideo.duration);
});
els.animeVideo.addEventListener('progress', () => {
  const video = els.animeVideo;
  if (!video.buffered.length || !video.duration) return;
  const end = video.buffered.end(video.buffered.length - 1);
  els.animeSeekBuffered.style.width = `${Math.min(100, (end / video.duration) * 100)}%`;
});

// ---- громкость ----
els.animeVolumeSlider.addEventListener('input', () => {
  const v = Number(els.animeVolumeSlider.value);
  els.animeVideo.volume = v;
  els.animeVideo.muted = v === 0;
  if (v > 0) animeVolumeBeforeMute = v;
  updateAnimeVolumeIcon();
});
els.animeMuteBtn.addEventListener('click', () => {
  const video = els.animeVideo;
  if (video.muted || video.volume === 0) {
    video.muted = false;
    video.volume = animeVolumeBeforeMute || 1;
    els.animeVolumeSlider.value = video.volume;
  } else {
    animeVolumeBeforeMute = video.volume;
    video.muted = true;
    els.animeVolumeSlider.value = 0;
  }
  updateAnimeVolumeIcon();
});

// ---- скорость воспроизведения ----
els.animeSpeedBtn.addEventListener('click', () => {
  const current = ANIME_SPEEDS.indexOf(els.animeVideo.playbackRate);
  const next = ANIME_SPEEDS[(current + 1 + ANIME_SPEEDS.length) % ANIME_SPEEDS.length] ?? 1;
  els.animeVideo.playbackRate = next;
  els.animeSpeedBtn.textContent = `${next}x`;
});

// ---- полноэкранный режим ----
function isAnimeFullscreen() { return document.fullscreenElement === els.animePlayerBody; }
els.animeFullscreenBtn.addEventListener('click', () => {
  if (isAnimeFullscreen()) document.exitFullscreen();
  else els.animePlayerBody.requestFullscreen().catch(() => {});
});
document.addEventListener('fullscreenchange', () => {
  if (els.animePlayerOverlay.hidden) return;
  els.animeFullscreenIcon.innerHTML = isAnimeFullscreen()
    ? '<path d="M9 3v4a2 2 0 0 1-2 2H3M15 3v4a2 2 0 0 0 2 2h4M9 21v-4a2 2 0 0 0-2-2H3M15 21v-4a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    : '<path d="M8 3H4v4M16 3h4v4M8 21H4v-4M16 21h4v-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
});

// ---- автоскрытие панели управления во время просмотра ----
function showAnimeControls({ keepVisible = false } = {}) {
  els.animePlayerOverlay.classList.remove('is-idle');
  clearTimeout(animeIdleTimer);
  if (!keepVisible) armAnimeIdleTimer();
}
function armAnimeIdleTimer() {
  clearTimeout(animeIdleTimer);
  if (els.animeVideo.paused) return; // на паузе панель не прячем
  animeIdleTimer = setTimeout(() => {
    if (!animeIsDraggingSeek) els.animePlayerOverlay.classList.add('is-idle');
  }, 3000);
}
els.animePlayerBody.addEventListener('mousemove', () => showAnimeControls());
els.animePlayerBody.addEventListener('mouseleave', () => { if (!els.animeVideo.paused) armAnimeIdleTimer(); });

// ---- клавиатура (только пока плеер аниме открыт) ----
document.addEventListener('keydown', (e) => {
  if (els.animePlayerOverlay.hidden) return;
  if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyM', 'KeyF'].includes(e.code)) e.preventDefault();
  showAnimeControls();
  if (e.code === 'Space') toggleAnimePlayback();
  else if (e.code === 'ArrowLeft') els.animeSkipBackBtn.click();
  else if (e.code === 'ArrowRight') els.animeSkipFwdBtn.click();
  else if (e.code === 'ArrowUp') {
    els.animeVideo.volume = Math.min(1, els.animeVideo.volume + 0.05);
    els.animeVideo.muted = false;
    els.animeVolumeSlider.value = els.animeVideo.volume;
    updateAnimeVolumeIcon();
  } else if (e.code === 'ArrowDown') {
    els.animeVideo.volume = Math.max(0, els.animeVideo.volume - 0.05);
    els.animeVolumeSlider.value = els.animeVideo.volume;
    updateAnimeVolumeIcon();
  } else if (e.code === 'KeyM') els.animeMuteBtn.click();
  else if (e.code === 'KeyF') els.animeFullscreenBtn.click();
  else if (e.key === 'Escape' && !isAnimeFullscreen()) closeAnimePlayer();
});

init();