import { useEffect } from 'react';
import { useStore, getStoreState, setStoreState } from './useStore';
import { useStoreUser, getStateUser } from './useStoreUser';
import { isAuthOpen } from '@/common/env';
import { apiAuthList, flattenPermissions } from '@/pages/base/auth/api';
import type { Permission } from '@/pages/base/auth/api';
import type { StoreConfig } from '@/types/store';

type StateAuth = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  owner: string;
  menuAuth: Permission[];
  btnAuth: Permission[];
};
const config: StoreConfig<StateAuth> = {
  name: 'auth',
  state: { status: isAuthOpen ? 'idle' : 'ready', owner: '', menuAuth: [], btnAuth: [] },
};
let pending: { owner: string; promise: Promise<void> } | undefined;
let version = 0;
export const getStateAuth = () => getStoreState(config);

/** 关闭权限无远程依赖；开启时按当前身份去重并隔离旧请求，失败允许重试。 */
export function loadAuth(force = false): Promise<void> {
  const { token, mid } = getStateUser();
  if (!isAuthOpen || !token) return Promise.resolve();
  const owner = String(mid) + ':' + token;
  const state = getStoreState(config);
  if (!force && state.owner === owner && state.status === 'ready') return Promise.resolve();
  if (pending?.owner === owner) return pending.promise;
  const requestVersion = ++version;
  setStoreState(config, { owner, status: 'loading', menuAuth: [], btnAuth: [] });
  const promise = apiAuthList().then((tree) => {
    if (requestVersion !== version || getStateUser().token !== token) return;
    const rows = flattenPermissions(tree);
    setStoreState(config, {
      status: 'ready',
      menuAuth: rows.filter((row) => row.type !== 2),
      btnAuth: rows.filter((row) => row.type === 2),
    });
  }).catch(() => {
    if (requestVersion === version && getStateUser().token === token) {
      setStoreState(config, { status: 'error' });
    }
  }).finally(() => {
    if (requestVersion === version) pending = undefined;
  });
  pending = { owner, promise };
  return promise;
}

export function useStoreAuth(enabled = true) {
  const [auth, setAuth] = useStore(config);
  const [user] = useStoreUser();
  useEffect(() => {
    if (enabled && user.token) void loadAuth();
  }, [enabled, user.token]);
  return [auth, setAuth] as const;
}
