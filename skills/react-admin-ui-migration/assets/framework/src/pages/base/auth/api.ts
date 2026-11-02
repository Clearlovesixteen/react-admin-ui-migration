import { requestUc } from '@/common/request';
import { getStateUser } from '@/hooks/useStoreUser';
import { env } from '@/common/env';

export type Permission = {
  code: string; type: number; path?: string; name?: string; sort?: number | null;
  parentCode?: string | null; sysId?: string; children?: Permission[];
};

/** 目标项目 仍使用原树接口，边界内归一化后供模板式守卫使用。 */
export async function apiAuthList() {
  const data = await requestUc<Permission[]>({
    url: env.VITE_APP_PERMISSION_URL, data: { phone: getStateUser().phone },
  });
  if (!Array.isArray(data)) throw new Error('权限响应格式异常');
  return data;
}

export function flattenPermissions(tree: Permission[]): Permission[] {
  return tree.flatMap((item) => [item, ...flattenPermissions(item.children || [])]);
}

export const apiAuthSave = (permList: Permission[]) =>
  requestUc({ url: '/auth/perm/saveBatch', data: { permList } });
