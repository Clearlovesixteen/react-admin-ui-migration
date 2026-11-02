/** 浏览器环境唯一入口。单测通过同契约的 test/env.ts 隔离 Vite 语法。 */
export const env = import.meta.env;
export const isAuthOpen = env.VITE_APP_AUTH_OPEN === '1';
export const keepAlive = env.VITE_APP_ROUTE_KEEPALIVE === '1';
export const showRouteTabs = env.VITE_APP_ROUTE_TABS === '1';
