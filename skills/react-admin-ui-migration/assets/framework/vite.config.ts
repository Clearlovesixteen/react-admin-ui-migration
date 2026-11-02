import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import UnoCSS from 'unocss/vite';
import svgr from 'vite-plugin-svgr';
import { gancaoRequestProxy } from '@gancao-web/request';
import { lessThemeVars } from './config/theme.ts';

/** 目标项目 保留旧服务目标，开发代理与 SDK 使用相同的环境契约。 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const proxy = (target: string, prefix: string) => ({
    target, changeOrigin: true, rewrite: (path: string) => path.slice(prefix.length) || '/',
  });
  return {
    base: './',
    plugins: [UnoCSS(), react(), svgr(), legacy({ targets: ['defaults', 'not IE 11'], modernPolyfills: true })],
    resolve: { alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      { find: /^~/, replacement: '' },
    ] },
    css: { preprocessorOptions: { less: { javascriptEnabled: true, modifyVars: lessThemeVars } } },
    server: { proxy: {
      ...gancaoRequestProxy(),
      '/api': proxy(env.VITE_APP_HOST_GAPI_TEST, '/api'),
      '/gancaoapi': proxy(env.VITE_APP_HOST_GAPI_OUTER_TEST, '/gancaoapi'),
      '/ucapi': proxy(env.VITE_APP_HOST_UC_TEST, '/ucapi'),
      ...(env.VITE_APP_HOST_JAVA_TEST ? { '/clientapi': proxy(env.VITE_APP_HOST_JAVA_TEST, '/clientapi') } : {}),
    } },
    build: { rolldownOptions: { output: { minify: { compress: { dropConsole: mode === 'production', dropDebugger: mode === 'production' } } } } },
  };
});
