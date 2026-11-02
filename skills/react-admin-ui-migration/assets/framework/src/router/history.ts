import { env } from '@/common/env';
import { createBrowserHistory, createHashHistory, type History } from '@remix-run/router';

const ROUTER_MODE = env.VITE_APP_ROUTER_MODE;
// 相对资源 base 同样支持子目录部署，不能以 origin 解析而丢失部署路径。
const BASE_URL = new URL(env.BASE_URL, window.location.href).pathname;
const isHashMode = ROUTER_MODE === 'hash';

/** history 路由需与 Vite 的 base 保持一致，hash 路由的页面路径位于 # 后，无需 basename */
export const basename = isHashMode ? '/' : BASE_URL.replace(/\/$/, '') || '/';

/** 补齐 history 模式的部署路径 */
export function getResolvePath(path: string) {
  if (isHashMode || basename === '/' || basename === path || path.startsWith(`${basename}/`)) {
    return path;
  }

  return `${basename}${path}`;
}

/** 获取可供浏览器直接打开的完整路由路径 */
export function getRoutePath(path: string) {
  return isHashMode ? `${BASE_URL}#${path}` : getResolvePath(path);
}

/** 共享 history 让组件外的工具函数也能触发 React Router 单页导航 */
export const history: History = isHashMode
  ? createHashHistory({ v5Compat: true })
  : createBrowserHistory({ v5Compat: true });
