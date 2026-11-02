export type PageLayoutStorage = Pick<Storage, 'getItem' | 'setItem'>;

function getDefaultStorage(): PageLayoutStorage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** 只接受明确的 true/false，缺失、非法值和存储异常均回退到调用方默认值。 */
export function readPageLayoutCollapsed(
  storageKey: string | false,
  fallback: boolean,
  storage: PageLayoutStorage | null = getDefaultStorage(),
): boolean {
  if (storageKey === false || !storage) return fallback;

  try {
    const value = storage.getItem(storageKey);
    if (value === 'true') return true;
    if (value === 'false') return false;
  } catch {
    // 隐私模式或宿主策略可能禁用 localStorage，Layout 应继续按默认值工作。
  }
  return fallback;
}

/** 写入失败只表示不能持久化，不应阻断当前折叠交互。 */
export function writePageLayoutCollapsed(
  storageKey: string | false,
  collapsed: boolean,
  storage: PageLayoutStorage | null = getDefaultStorage(),
): boolean {
  if (storageKey === false || !storage) return false;

  try {
    storage.setItem(storageKey, String(collapsed));
    return true;
  } catch {
    return false;
  }
}
