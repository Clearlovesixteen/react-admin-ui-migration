import type { ReactElement } from 'react';
import type { PageLayoutMenuItem } from './types';

/** 菜单适配器的展示字段；来自统一路由声明与远程权限元数据。 */
export type LayoutRoute = {
  path?: string;
  name?: string;
  icon?: string | ReactElement;
  access?: string;
  unaccessible?: boolean;
  unAccessible?: boolean;
  hideInMenu?: boolean;
  hideChildrenInMenu?: boolean;
  target?: string;
  redirect?: string;
  routes?: LayoutRoute[];
};

type RouteAccess = Record<string, boolean | ((route: LayoutRoute) => boolean)>;
export type MenuNavigation = { path: string; target?: string };

/**
 * 将已合并服务端名称、顺序的路由转换为展示菜单。
 * 与直达路由的 access 判定保持一致，父级拒绝时不暴露子级或搜索结果。
 * 这里只过滤展示，直达 URL 的权限交给 AuthRoute。
 */
export function buildLayoutMenu(
  routes: LayoutRoute[],
  access: RouteAccess,
  navigate: (destination: MenuNavigation) => void,
  renderIcon: (icon: LayoutRoute['icon']) => ReactElement | undefined,
): PageLayoutMenuItem[] {
  const items: PageLayoutMenuItem[] = [];
  for (const route of routes) {
    const rule = route.access ? access[route.access] : undefined;
    const allowed = typeof rule === 'function' ? rule(route) : rule;
    if (
      route.hideInMenu ||
      route.unaccessible ||
      route.unAccessible ||
      allowed === false
    ) {
      continue;
    }

    // 首页、权限上传和匿名包装路由不凭空变成菜单入口。
    if (!route.name || !route.path) {
      items.push(
        ...buildLayoutMenu(route.routes || [], access, navigate, renderIcon),
      );
      continue;
    }

    const children = route.hideChildrenInMenu
      ? []
      : buildLayoutMenu(route.routes || [], access, navigate, renderIcon);
    // 保持旧行为：分组没有可访问子页时不显示空菜单。
    if (route.routes?.length && !children.length && !route.hideChildrenInMenu) {
      continue;
    }
    const path = route.path;
    items.push({
      key: path,
      label: route.name,
      icon: renderIcon(route.icon),
      ...(children.length
        ? { children }
        : { onClick: () => navigate({ path, target: route.target }) }),
    });
  }
  return items;
}

/** 子路径高亮最长匹配的菜单项，避免 /cms/article-other 误命中。 */
export function getSelectedMenuKey(
  items: PageLayoutMenuItem[],
  pathname: string,
): string | undefined {
  let selected: string | undefined;
  function visit(nodes: PageLayoutMenuItem[]) {
    for (const item of nodes) {
      const path = item.key.split(/[?#]/)[0];
      if (
        !item.children?.length &&
        (pathname === path || pathname.startsWith(path + '/')) &&
        (!selected || path.length > selected.split(/[?#]/)[0].length)
      ) {
        selected = item.key;
      }
      if (item.children) visit(item.children);
    }
  }
  visit(items);
  return selected;
}
