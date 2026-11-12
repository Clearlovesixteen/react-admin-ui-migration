import { Switch, Tooltip } from 'antd';
import type { PageLayoutTheme } from './preference.js';

/** 使用本地太阳/月亮图形，兼容目标已有 @ant-design/icons 版本。 */
export default function PageLayoutThemeToggle({ theme, onChange }: {
  theme: PageLayoutTheme;
  onChange: (theme: PageLayoutTheme) => void;
}) {
  return (
    <Tooltip title={theme === 'dark' ? '切换为亮色模式' : '切换为暗色模式'}>
      <span className="page-layout-theme-toggle">
        <Switch
          aria-label="暗色模式"
          checked={theme === 'dark'}
          checkedChildren={<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.3A8.5 8.5 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3Z" /></svg>}
          unCheckedChildren={<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>}
          onChange={(checked) => onChange(checked ? 'dark' : 'light')}
        />
      </span>
    </Tooltip>
  );
}
