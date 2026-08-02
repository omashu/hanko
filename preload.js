// preload.js — единственный мост между окном (renderer) и главным процессом.
// Renderer не имеет прямого доступа к Node/файлам/сети — только то, что открыто здесь.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hanko', {
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (partial) => ipcRenderer.invoke('settings:save', partial),

  loadLibrary: () => ipcRenderer.invoke('library:load'),
  upsertLibraryItem: (item) => ipcRenderer.invoke('library:upsert', item),
  removeLibraryItem: (id) => ipcRenderer.invoke('library:remove', id),
  setProgress: (payload) => ipcRenderer.invoke('library:progress', payload),
  setLibraryNote: (payload) => ipcRenderer.invoke('library:note', payload),
  addLibraryComment: (payload) => ipcRenderer.invoke('library:addComment', payload),
  removeLibraryComment: (payload) => ipcRenderer.invoke('library:removeComment', payload),

  loadHistory: () => ipcRenderer.invoke('history:load'),
  setHistoryProgress: (payload) => ipcRenderer.invoke('history:progress', payload),
  removeHistoryItem: (mangaId) => ipcRenderer.invoke('history:remove', mangaId),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  loadAnimeLibrary: () => ipcRenderer.invoke('anime-library:load'),
  upsertAnimeLibraryItem: (item) => ipcRenderer.invoke('anime-library:upsert', item),
  removeAnimeLibraryItem: (id) => ipcRenderer.invoke('anime-library:remove', id),
  setAnimeLibraryNote: (payload) => ipcRenderer.invoke('anime-library:note', payload),
  addAnimeLibraryComment: (payload) => ipcRenderer.invoke('anime-library:addComment', payload),
  removeAnimeLibraryComment: (payload) => ipcRenderer.invoke('anime-library:removeComment', payload),
  loadAnimeHistory: () => ipcRenderer.invoke('anime-history:load'),
  setAnimeHistoryProgress: (payload) => ipcRenderer.invoke('anime-history:progress', payload),
  setAnimeHistoryPosition: (payload) => ipcRenderer.invoke('anime-history:setPosition', payload),
  removeAnimeHistoryItem: (releaseId) => ipcRenderer.invoke('anime-history:remove', releaseId),
  clearAnimeHistory: () => ipcRenderer.invoke('anime-history:clear'),

  loadSites: () => ipcRenderer.invoke('sites:load'),
  upsertSite: (site) => ipcRenderer.invoke('sites:upsert', site),
  removeSite: (id) => ipcRenderer.invoke('sites:remove', id),
  setSiteNote: (payload) => ipcRenderer.invoke('sites:note', payload),

  loadProfile: () => ipcRenderer.invoke('profile:load'),
  saveProfile: (partial) => ipcRenderer.invoke('profile:save', partial),
  pickAvatar: () => ipcRenderer.invoke('profile:pickAvatar'),
  pickBanner: () => ipcRenderer.invoke('profile:pickBanner'),
  removeBanner: () => ipcRenderer.invoke('profile:removeBanner'),

  mangadexSearch: (payload) => ipcRenderer.invoke('mangadex:search', payload),
  mangadexTags: () => ipcRenderer.invoke('mangadex:tags'),
  mangadexPopular: () => ipcRenderer.invoke('mangadex:popular'),
  mangadexChapters: (mangaId, title) => ipcRenderer.invoke('mangadex:chapters', { mangaId, title }),
  mangadexPages: (chapterId) => ipcRenderer.invoke('mangadex:pages', chapterId),
  remangaDetails: (id) => ipcRenderer.invoke('remanga:details', id),
  mangadexDetails: (id) => ipcRenderer.invoke('mangadex:details', id),
  findRuDescription: (title) => ipcRenderer.invoke('manga:findRuDescription', title),
  wamangaDetails: (title) => ipcRenderer.invoke('wamanga:details', title),

  anilistTrending: () => ipcRenderer.invoke('anilist:trending'),
  anilibriaSearch: (opts) => ipcRenderer.invoke('anilibria:search', opts),
  anilibriaPopular: () => ipcRenderer.invoke('anilibria:popular'),
  anilibriaEpisodes: (animeId) => ipcRenderer.invoke('anilibria:episodes', animeId),
  anilibriaDetails: (animeId) => ipcRenderer.invoke('anilibria:details', animeId),
  animeonFindForTitle: (title) => ipcRenderer.invoke('animeon:findForTitle', title),
  animeonResolve: (link) => ipcRenderer.invoke('animeon:resolve', link),
  openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),
  focusApp: () => ipcRenderer.invoke('app:focus'),
  isDev: () => ipcRenderer.invoke('app:isDev'),
  setFullScreen: (value) => ipcRenderer.invoke('app:setFullScreen', value),
  getNotificationIcon: () => ipcRenderer.invoke('app:notificationIcon'),
  listStickers: () => ipcRenderer.invoke('stickers:list'),

  listDownloads: () => ipcRenderer.invoke('downloads:list'),
  startDownload: (payload) => ipcRenderer.invoke('downloads:start', payload),
  cancelDownload: (payload) => ipcRenderer.invoke('downloads:cancel', payload),
  removeDownload: (payload) => ipcRenderer.invoke('downloads:remove', payload),
  removeAllDownloads: () => ipcRenderer.invoke('downloads:removeAll'),
  removeAllDownloadsForManga: (mangaId) => ipcRenderer.invoke('downloads:removeAllForManga', mangaId),
  downloadedPages: (payload) => ipcRenderer.invoke('downloads:pages', payload),
  onDownloadProgress: (cb) => {
    ipcRenderer.on('downloads:progress', (_e, data) => cb(data));
  },

  // ---------- онлайн: друзья и чат (Supabase) ----------
  onlineInit: () => ipcRenderer.invoke('online:init'),
  onlineGetState: () => ipcRenderer.invoke('online:getState'),
  onlineSetDisplayName: (name) => ipcRenderer.invoke('online:setDisplayName', name),
  onlineSetUsername: (username) => ipcRenderer.invoke('online:setUsername', username),
  onlineSearchUsernames: (query) => ipcRenderer.invoke('online:searchUsernames', query),
  onlineRegister: (payload) => ipcRenderer.invoke('online:register', payload),
  onlineLogin: (payload) => ipcRenderer.invoke('online:login', payload),
  onlineLogout: () => ipcRenderer.invoke('online:logout'),
  onlineGetOnlineIds: () => ipcRenderer.invoke('online:getOnlineIds'),
  onlineSendFriendRequest: (username) => ipcRenderer.invoke('online:sendFriendRequest', username),
  onlineSendFriendRequestByCode: (code) => ipcRenderer.invoke('online:sendFriendRequestByCode', code),
  onlineFindByCodePreview: (code) => ipcRenderer.invoke('online:findByCodePreview', code),
  onlineCancelFriendRequest: (requestId) => ipcRenderer.invoke('online:cancelFriendRequest', requestId),
  onlineRespondFriendRequest: (payload) => ipcRenderer.invoke('online:respondFriendRequest', payload),
  onlineListIncomingRequests: () => ipcRenderer.invoke('online:listIncomingRequests'),
  onlineListOutgoingRequests: () => ipcRenderer.invoke('online:listOutgoingRequests'),
  onlineListFriends: () => ipcRenderer.invoke('online:listFriends'),
  onlineUnfriend: (friendId) => ipcRenderer.invoke('online:unfriend', friendId),
  onlineSendMessage: (payload) => ipcRenderer.invoke('online:sendMessage', payload),
  onlineListMessages: (friendId) => ipcRenderer.invoke('online:listMessages', friendId),
  onlineMarkMessagesRead: (friendId) => ipcRenderer.invoke('online:markMessagesRead', friendId),
  onlineSetBio: (bio) => ipcRenderer.invoke('online:setBio', bio),
  onlineSetAvatarFrame: (frame) => ipcRenderer.invoke('online:setAvatarFrame', frame),
  onlineGetProfile: (userId) => ipcRenderer.invoke('online:getProfile', userId),
  onlineToggleProfileLike: (profileId) => ipcRenderer.invoke('online:toggleProfileLike', profileId),
  onlineSyncBookmarkUpsert: (payload) => ipcRenderer.invoke('online:syncBookmarkUpsert', payload),
  onlineSyncBookmarkRemove: (mangaId) => ipcRenderer.invoke('online:syncBookmarkRemove', mangaId),
  syncPullAll: () => ipcRenderer.invoke('online:syncPullAll'),
  onlineListBookmarks: (userId) => ipcRenderer.invoke('online:listBookmarks', userId),
  onlineListProfileComments: (profileId) => ipcRenderer.invoke('online:listProfileComments', profileId),
  onlineAddProfileComment: (payload) => ipcRenderer.invoke('online:addProfileComment', payload),
  onlineDeleteProfileComment: (commentId) => ipcRenderer.invoke('online:deleteProfileComment', commentId),
  onOnlineEvent: (cb) => {
    ipcRenderer.on('online:event', (_e, data) => cb(data));
  },

  partyCreate: () => ipcRenderer.invoke('party:create'),
  partyJoin: (roomId) => ipcRenderer.invoke('party:join', roomId),
  partyLeave: () => ipcRenderer.invoke('party:leave'),
  partySend: (payload) => ipcRenderer.invoke('party:send', payload),
  onPartyEvent: (cb) => {
    ipcRenderer.on('party:event', (_e, data) => cb(data));
  },

  updateGetStatus: () => ipcRenderer.invoke('update:getStatus'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (cb) => {
    ipcRenderer.on('update:status', (_e, status) => cb(status));
  },
});