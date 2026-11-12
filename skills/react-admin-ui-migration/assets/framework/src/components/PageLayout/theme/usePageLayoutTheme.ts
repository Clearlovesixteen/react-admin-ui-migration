import { useLayoutEffect, useState } from 'react';
import { getThemeStorage, readPageLayoutTheme, savePageLayoutTheme } from './preference.js';
import type { PageLayoutTheme } from './preference.js';

/** storageKey 是当前应用的稳定配置；更换项目或账号策略时由适配器明确确定。 */
export function usePageLayoutTheme(storageKey: string) {
  const [selection, setSelection] = useState(() => ({ key: storageKey, theme: readPageLayoutTheme(storageKey) }));
  // 配置变化不能将前一个应用的偏好写入新命名空间。
  const theme = selection.key === storageKey ? selection.theme : readPageLayoutTheme(storageKey);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-page-layout-theme');
    root.setAttribute('data-page-layout-theme', theme);
    return () => {
      if (previous === null) root.removeAttribute('data-page-layout-theme');
      else root.setAttribute('data-page-layout-theme', previous);
    };
  }, [theme]);

  useLayoutEffect(() => {
    setSelection({ key: storageKey, theme: readPageLayoutTheme(storageKey) });
    const sync = (event: StorageEvent) => {
      if (event.storageArea !== getThemeStorage()) return;
      if (event.key === storageKey || event.key === null) {
        setSelection({ key: storageKey, theme: readPageLayoutTheme(storageKey) });
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [storageKey]);

  const changeTheme = (next: PageLayoutTheme) => {
    if (next !== 'light' && next !== 'dark') return;
    setSelection({ key: storageKey, theme: next });
    // 写入失败也保留本次会话的选择；不影响路由和未保存表单。
    savePageLayoutTheme(storageKey, next);
  };
  return [theme, changeTheme] as const;
}
