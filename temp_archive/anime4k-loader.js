// Подключение anime4k-webgpu вынесено в отдельный файл, а не инлайн-скрипт в
// index.html — потому что CSP (см. <meta http-equiv="Content-Security-Policy">)
// разрешает script-src только 'self' и cdn.jsdelivr.net, БЕЗ 'unsafe-inline'.
// Инлайн-код молча блокировался бы политикой, а вот загрузка этого файла как
// локального модуля ('self') разрешена, и import изнутри него с домена
// cdn.jsdelivr.net — тоже (он в списке разрешённых для script-src).
try {
  const mod = await import('https://cdn.jsdelivr.net/npm/anime4k-webgpu/+esm');
  console.log('[anime4k] реальные экспорты модуля:', Object.keys(mod));
  // Object.keys выше — это только ИМЕНА экспортов, не их содержимое. Судя по
  // тому, что среди имён затесалось "anime4k-webgpu" — это типичный jsdelivr-
  // артефакт для CJS/UMD-пакетов при конвертации в ESM через +esm: нужные
  // классы (render/CNNx2UL/GANUUL) почти наверняка не на верхнем уровне, а
  // внутри mod.default (или под тем самым ключом с именем пакета) — логируем
  // сразу их содержимое, а не только имена, чтобы не гадать по новой.
  console.log('[anime4k] mod.default:', mod.default);
  if (mod.default) console.log('[anime4k] ключи внутри mod.default:', Object.keys(mod.default));
  if (mod['anime4k-webgpu']) {
    console.log('[anime4k] mod["anime4k-webgpu"]:', mod['anime4k-webgpu']);
    console.log('[anime4k] ключи внутри mod["anime4k-webgpu"]:', Object.keys(mod['anime4k-webgpu']));
  }
  window.Anime4KWebGPU = mod;
} catch (err) {
  // раньше при сбое здесь window.Anime4KWebGPU просто никогда не появлялся,
  // и кнопка апскейла вечно показывала "ещё загружается, попробуй позже" —
  // теперь хотя бы видно в консоли, что случилось на самом деле
  console.error('[anime4k] не удалось загрузить модуль апскейла:', err);
  window.Anime4KWebGPULoadError = err?.message || String(err);
}