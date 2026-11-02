import { env } from '@/common/env';

/** 只恢复本应用内部路径；同时兼容旧完整 hash 深链和新相对路径。 */
export function resolveLoginFrom(value: string | null, currentUrl = window.location.href) {
  if (!value) return '/welcome';
  if (value.includes('\\') || Array.from(value).some((char) => char.charCodeAt(0) < 32)) return '/welcome';
  if (value.startsWith('/') && !value.startsWith('//')) {
    return value === '/' || value.startsWith('/?') ? '/welcome' : value;
  }
  try {
    const current = new URL(currentUrl);
    const target = new URL(value, current);
    const appBase = new URL(env.BASE_URL, current);
    if (target.origin !== current.origin || target.pathname !== appBase.pathname) return '/welcome';
    const path = target.hash.slice(1);
    return path.startsWith('/') && !path.startsWith('//') && path !== '/' ? path : '/welcome';
  } catch {
    return '/welcome';
  }
}

export function readLoginParams() {
  const current = new URL(window.location.href);
  const hash = new URLSearchParams(current.hash.split('?')[1] || '');
  return {
    code: current.searchParams.get('code') || hash.get('code'),
    from: resolveLoginFrom(current.searchParams.get('from') || hash.get('from')),
  };
}

export function beginSsoLogin(from: string) {
  const callback = new URL(env.BASE_URL, window.location.href);
  callback.search = '';
  callback.hash = '';
  callback.searchParams.set('from', resolveLoginFrom(from));
  const auth = new URL(env.VITE_APP_HOST_AUTH);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('client_id', env.VITE_APP_ID);
  auth.searchParams.set('redirect_uri', callback.href);
  window.location.assign(auth.href);
}
