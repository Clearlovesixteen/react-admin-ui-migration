import { useStore, getStoreState, setStoreState } from './useStore';
import type { StoreConfig } from '@/types/store';

export type RouteHistoryItem = { name: string; path: string; search: string; state: unknown };
const config: StoreConfig<{ routes: RouteHistoryItem[] }> = { name: 'routeHistory', state: { routes: [] } };
export const useRouteHistory = () => useStore(config);

export function addRoute(route: RouteHistoryItem) {
  const previous = getStoreState(config).routes;
  const routes = previous.some((item) => item.path === route.path)
    ? previous.map((item) => item.path === route.path ? route : item)
    : [...previous, route];
  setStoreState(config, { routes });
  return routes;
}

export function removeRoute(path: string) {
  const routes = getStoreState(config).routes.filter((item) => item.path !== path);
  setStoreState(config, { routes });
  return routes;
}
