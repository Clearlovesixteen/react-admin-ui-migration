import type { RouteMenu } from '@/types/route';
import type { Permission } from './api';
import { env } from '@/common/env';

/** 菜单迁移必须使用原 code；不按路径或层级重新生成服务端权限标识。 */
export function buildPermissionList(menus: RouteMenu[], saved: Permission[], parentCode: string | null = null): Permission[] {
  return menus.flatMap((menu) => {
    if (!menu.code) throw new Error('菜单缺少权限编码：' + menu.path);
    const row = saved.find((item) => item.code === menu.code);
    return [{
      code: menu.code, parentCode, type: 1, sysId: env.VITE_APP_ID,
      path: menu.path, name: row?.name || menu.name, sort: row?.sort ?? null,
    }, ...buildPermissionList(menu.children || [], saved, menu.code)];
  });
}
