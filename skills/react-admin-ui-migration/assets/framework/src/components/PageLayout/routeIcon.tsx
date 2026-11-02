import React from 'react';
import { ControlOutlined } from '@ant-design/icons';
import PageLayoutMenuIcon, {
  isPageLayoutMenuIconName,
} from './components/MenuIcon';
import type { LayoutRoute } from './routes';

/** Umi 会把配置中的图标名转成 ReactElement，两种输入均需适配。 */
export function renderRouteIcon(icon: LayoutRoute['icon']) {
  if (typeof icon === 'string' && isPageLayoutMenuIconName(icon)) {
    return <PageLayoutMenuIcon name={icon} />;
  }
  if (
    icon === 'ControlOutlined' ||
    (React.isValidElement(icon) && icon.type === ControlOutlined)
  ) {
    return <PageLayoutMenuIcon name="gc-wenjianzhongxin" />;
  }
  return typeof icon === 'string' ? undefined : icon;
}
