import { useSyncExternalStore } from 'react';
import { EventBus } from '@base-web-kits/base-tools-ts';
import { getLocalStorage, setLocalStorage } from '@base-web-kits/base-tools-web';
import type { StoreConfig } from '@/types/store';
import { env } from '@/common/env';

const event = new EventBus();
const states = new Map<string, unknown>();

/** 模板的命名空间 Store；精确取消当前订阅，不影响其他使用同一状态的组件。 */
export function getStoreKey(name: string) {
  return name + '_' + env.VITE_APP_ID;
}

export function getStoreState<T>(config: StoreConfig<T>): T {
  const key = getStoreKey(config.name);
  if (!states.has(key)) {
    const saved = config.isPersist ? getLocalStorage<Partial<T>>(key) : undefined;
    states.set(key, { ...config.state, ...(saved && typeof saved === 'object' ? saved : {}) });
  }
  return states.get(key) as T;
}

export function setStoreState<T>(config: StoreConfig<T>, state: Partial<T>) {
  const key = getStoreKey(config.name);
  const next = { ...getStoreState(config), ...state };
  states.set(key, next);
  if (config.isPersist) setLocalStorage(key, next);
  event.emit(key, next);
}

export function clearStoreState<T>(config: StoreConfig<T>) {
  const key = getStoreKey(config.name);
  states.set(key, { ...config.state });
  if (config.isPersist) localStorage.removeItem(key);
  event.emit(key, getStoreState(config));
}

/** React 18 外部状态订阅，避免渲染与 effect 之间的状态变更丢失。 */
export function useStore<T>(config: StoreConfig<T>): [T, (state: Partial<T>) => void] {
  const key = getStoreKey(config.name);
  const state = useSyncExternalStore(
    (listener) => {
      event.on(key, listener);
      return () => event.off(key, listener);
    },
    () => getStoreState(config),
  );
  return [state, (next) => setStoreState(config, next)];
}
