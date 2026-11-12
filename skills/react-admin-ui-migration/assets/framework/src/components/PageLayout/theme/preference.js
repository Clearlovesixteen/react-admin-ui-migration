/** 独立的外观偏好，不使用身份 Store；只在明确选择时写入。 */
export function getThemeStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function readPageLayoutTheme(storageKey, storage = getThemeStorage()) {
  try {
    const saved = storage?.getItem(storageKey);
    // MES 的 base-tools 版本可能使用 JSON 序列化；保留已有明确选择。
    if (saved === 'dark' || saved === '"dark"') return 'dark';
    if (saved === 'light' || saved === '"light"') return 'light';
  } catch { /* 存储不可用时仍可进入页面。 */ }
  return 'light';
}

export function savePageLayoutTheme(storageKey, theme, storage = getThemeStorage()) {
  if (theme !== 'light' && theme !== 'dark') return false;
  try {
    if (!storage) return false;
    storage.setItem(storageKey, theme);
    return true;
  } catch { return false; }
}
