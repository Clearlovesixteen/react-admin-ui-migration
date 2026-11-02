import { history, getResolvePath, getRoutePath } from '@/router/history';

type HrefOptions = { reload?: boolean; replace?: boolean; state?: unknown };

/** 内部导航共用 Router history；完整地址保留浏览器导航语义。 */
export function href(path: string | number, options: HrefOptions = {}) {
  if (typeof path === 'number') return history.go(path);
  if (path.startsWith('/') && !path.startsWith('//')) {
    if (options.reload) return window.location.replace(getRouteUrl(path));
    const destination = getResolvePath(path);
    if (options.replace) history.replace(destination, options.state);
    else history.push(destination, options.state);
  } else if (options.replace) window.location.replace(path);
  else window.location.assign(path);
}

export function getRouteUrl(path: string) {
  if (/^(https?:)?\/\//i.test(path)) return new URL(path, window.location.href).href;
  return new URL(getRoutePath(path), window.location.href).href;
}

export function open(path: string) {
  window.open(getRouteUrl(path), '_blank', 'noopener,noreferrer');
}
