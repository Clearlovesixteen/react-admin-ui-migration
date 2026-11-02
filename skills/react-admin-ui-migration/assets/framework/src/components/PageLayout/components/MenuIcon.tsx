import React from 'react';
import type { CSSProperties } from 'react';
import icons from '../menu-icons.json';

export type PageLayoutMenuIconName = keyof typeof icons;

export function isPageLayoutMenuIconName(name: string): name is PageLayoutMenuIconName {
  return Object.prototype.hasOwnProperty.call(icons, name);
}

/** 本地线性图标快照，颜色跟随菜单，不注入远端 iconfont 脚本。 */
export default function PageLayoutMenuIcon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: CSSProperties;
}) {
  if (!isPageLayoutMenuIconName(name)) return null;
  const icon = icons[name];
  return (
    <span
      className={['page-layout-menu-icon', className].filter(Boolean).join(' ')}
      style={style}
      data-menu-icon={name}
      aria-hidden="true"
    >
      <svg viewBox={icon.viewBox} width="1em" height="1em" fill="currentColor" focusable="false">
        {icon.paths.map((path, index) => <path key={index} {...path} />)}
      </svg>
    </span>
  );
}
