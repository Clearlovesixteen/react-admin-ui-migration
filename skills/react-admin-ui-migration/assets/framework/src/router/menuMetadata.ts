import type { RouteMenu } from '@/types/route';
import type { Permission } from '@/pages/base/auth/api';
import type { LayoutRoute } from '@/components/PageLayout/routes';
import { isValidElement } from 'react';

/** 服务端仅覆盖展示名称/排序；路径、权限码和组件由本地声明控制。 */
export function mergeMenuMetadata(menus: RouteMenu[], permissions: Permission[]): LayoutRoute[] {
  return menus.map((menu, index) => {
    const saved = permissions.find((row) => row.code === menu.code);
    return {
      path: menu.path, name: saved?.name || menu.name, access: menu.code,
      icon: isValidElement(menu.icon) ? menu.icon : undefined,
      routes: menu.children ? mergeMenuMetadata(menu.children, permissions) : undefined,
      order: saved?.sort ?? 0, index,
    };
  }).sort((a, b) => a.order - b.order || a.index - b.index);
}

/** 直达子页面同样检查父级，和菜单/快捷搜索的过滤保持一致。 */
export function hasMenuAccess(menus: RouteMenu[], path: string, permissions: Permission[], parents: string[] = []): boolean {
  for (const menu of menus) {
    const codes = menu.code ? [...parents, menu.code] : parents;
    if (menu.path === path) return codes.every((code) => permissions.some((row) => row.code === code));
    if (menu.children && hasMenuAccess(menu.children, path, permissions, codes)) return true;
  }
  return false;
}

export function findMenuByPath(menus: RouteMenu[], path: string): RouteMenu | undefined {
  for (const menu of menus) {
    if (menu.path === path) return menu;
    const child = menu.children && findMenuByPath(menu.children, path);
    if (child) return child;
  }
}
