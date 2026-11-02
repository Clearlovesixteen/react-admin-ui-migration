import { useStore, getStoreState, setStoreState, clearStoreState } from './useStore';
import type { StoreConfig } from '@/types/store';
import { href } from '@/common/util';
import { env } from '@/common/env';

export type StateUser = {
  token: string;
  username: string;
  phone: string;
  mid: number | string;
  sso_token: string;
  gapi_token: string;
  gapi_mid: number | string;
  email?: string;
};

const config: StoreConfig<StateUser> = {
  name: 'user',
  isPersist: true,
  state: { token: '', username: '', phone: '', mid: 0, sso_token: '', gapi_token: '', gapi_mid: 0 },
};

export const useStoreUser = () => useStore(config);
export const getStateUser = () => getStoreState(config);
export const setStateUser = (value: Partial<StateUser>) => setStoreState(config, value);

/** 首次切换不读取旧 user；退出时同时清除兼容期旧 key，避免恢复已退出身份。 */
export function clearStateUser() {
  clearStoreState(config);
  localStorage.removeItem('user');
}

export function reLogin() {
  const from = window.location.hash.startsWith('#/')
    ? window.location.hash.slice(1)
    : window.location.pathname + window.location.search;
  clearStateUser();
  href('/?from=' + encodeURIComponent(from), { reload: true });
}

export function logout() {
  clearStateUser();
  if (env.VITE_APP_HOST_LOGOUT) window.location.assign(env.VITE_APP_HOST_LOGOUT);
  else href('/', { reload: true });
}
