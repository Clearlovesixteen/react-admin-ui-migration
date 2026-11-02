import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skill = join(repository, 'skills/react-admin-ui-migration');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const coreFiles = [
  'src/main.tsx', 'src/env.d.ts', 'src/polyfills.ts',
  'src/common/env.ts', 'src/common/auth.ts', 'src/common/request.ts', 'src/common/slsLog.ts', 'src/common/util.ts',
  'src/hooks/useStore.ts', 'src/hooks/useStoreUser.ts', 'src/hooks/useStoreAuth.ts', 'src/hooks/useRouteHistory.ts',
  'src/router/history.ts', 'src/router/index.tsx', 'src/router/menuMetadata.ts',
  'src/types/route.ts', 'src/types/store.ts',
  'src/components/AuthRoute/index.tsx', 'src/components/GuardRoute/index.tsx', 'src/components/RouteLoadBoundary.tsx',
  'src/components/PageLayout/index.tsx', 'src/components/PageLayout/routes.ts', 'src/components/PageLayout/routeIcon.tsx',
  'src/components/PageLayout/applications.ts', 'src/components/PageLayout/files.ts', 'src/components/PageLayout/file-center.less',
  'src/components/PageLayout/components/FileCenter.tsx', 'src/components/PageLayout/components/RouteTabs.tsx',
  'src/pages/base/login/api.ts', 'src/pages/base/login/index.tsx', 'src/pages/base/login/navigation.ts', 'src/pages/base/login/index.less',
  'src/pages/base/auth/api.ts', 'src/pages/base/auth/permissions.ts', 'src/pages/base/auth/index.tsx',
  'src/pages/base/403/index.tsx', 'src/pages/base/404/index.tsx',
  'vite.config.ts', 'uno.config.ts', 'config/theme.ts', 'tsconfig.json', 'tsconfig.node.json', 'typings.d.ts',
  'eslint.config.mjs', 'stylelint.config.cjs', 'scripts/check-html-assets.mjs',
];

function walk(directory, prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error('框架源不能包含符号链接');
    const path = prefix ? prefix + '/' + entry.name : entry.name;
    return entry.isDirectory() ? walk(join(directory, entry.name), path) : [path];
  });
}

/** 从实际迁移项目提取通用核心；环境值、业务页、品牌和自定义编辑器不进入包。 */
export function prepareFramework(sourceRepository) {
  const source = resolve(sourceRepository);
  const expected = new Map();
  const origins = [];
  function add(path, content, origin) {
    expected.set('assets/framework/' + path, content.replaceAll('\r\n', '\n'));
    if (origin) origins.push({ path: origin, sha256: hash(readFileSync(join(source, origin))) });
  }
  for (const path of coreFiles) {
    let value = readFileSync(join(source, path), 'utf8');
    if (path === 'src/components/PageLayout/index.tsx') {
      value = value.replace(/^import pageBackground .*\n/m, '')
        .replace(/background=\{.*pageBackground.*\}/, 'background="linear-gradient(180deg, #eaf0fc 0%, #f2f5f7 100%)"');
    }
    // 保留通用边界，避免把试点项目名称误当成框架要求。
    value = value.replaceAll('CMS', '目标项目').replaceAll('cms-login', 'admin-login')
      .replaceAll('cms-route-loading', 'admin-route-loading').replaceAll('cms-auth-upload', 'admin-auth-upload');
    add(path, value, path);
  }
  // 展示层从已有离线资源组合，升级框架不会丢失已验证的 WMS 图标/颜色/我的应用。
  const layout = join(skill, 'assets/page-layout');
  for (const path of walk(layout)) add('src/components/PageLayout/' + path, readFileSync(join(layout, path), 'utf8'));
  const globalSource = readFileSync(join(source, 'src/global.less'), 'utf8');
  add('src/global.less', globalSource + '\n.admin-route-loading { display: block; margin: 100px auto; }\n.admin-auth-upload { padding: 24px; }\n', 'src/global.less');
  const projectStyles = readFileSync(join(source, 'src/components/PageLayout/project.less'), 'utf8');
  add('src/components/PageLayout/project.less', projectStyles.slice(projectStyles.indexOf('@media')), 'src/components/PageLayout/project.less');
  add('src/router/menus.tsx', "import type { RouteMenu } from '@/types/route';\n\n/** 迁移时按原菜单注册真实页面、原 path/code，不启用旧系统关闭的模块。 */\nconst menus: RouteMenu[] = [];\nexport default menus;\n");
  add('src/router/routes.ts', "import menus from './menus';\nimport type { RouteMenu } from '@/types/route';\nconst routes: RouteMenu[] = [\n  { path: '/', component: () => import('@/pages/base/login'), meta: { auth: false } },\n  { component: () => import('@/components/PageLayout'), children: [\n    { path: '/welcome', component: () => import('@/pages/base/welcome') },\n    { path: '/auth', component: () => import('@/pages/base/auth') },\n    ...menus,\n  ] },\n  { path: '/403', component: () => import('@/pages/base/403') },\n  { path: '*', component: () => import('@/pages/base/404'), meta: { auth: false } },\n];\nexport default routes;\n");
  add('src/pages/base/welcome/index.tsx', "import { env } from '@/common/env';\nexport default function Welcome() { return <section style={{ padding: 24 }}>欢迎使用{env.VITE_APP_NAME}</section>; }\n");
  add('index.html', '<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>%VITE_APP_NAME%</title><script>globalThis.global = globalThis;</script></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n');
  add('.nvmrc', '20.20.2\n');
  const pkg = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
  const packageFragment = {
    private: true, type: 'module', packageManager: pkg.packageManager, engines: pkg.engines,
    scripts: Object.fromEntries(Object.entries(pkg.scripts).filter(([key]) => !['test', 'test:unit', 'test:coverage', 'prettier'].includes(key))),
    dependencies: Object.fromEntries(Object.entries(pkg.dependencies).filter(([key]) => !['braft-editor', 'braft-extensions', 'braft-utils', 'copy-to-clipboard'].includes(key))),
    devDependencies: Object.fromEntries(Object.entries(pkg.devDependencies).filter(([key]) => !['jest', 'jest-environment-jsdom', 'babel-jest', 'babel-plugin-jest-hoist', '@babel/core', 'identity-obj-proxy'].includes(key))),
  };
  add('package.json', JSON.stringify(packageFragment, null, 2) + '\n');
  const keys = [...readFileSync(join(source, 'src/env.d.ts'), 'utf8').matchAll(/readonly (VITE_APP_[A-Z_]+):/g)].map((match) => match[1]);
  const defaults = {
    VITE_APP_ENV: 'development', VITE_APP_API_MODE: 'gapis', VITE_APP_GAPI_AK: '7',
    VITE_APP_ROUTER_MODE: 'hash', VITE_APP_LOGIN_GAPI_BY_JAVA: '0',
  };
  add('.env.example', '# 按目标项目填写。权限、保活、测试/预发/生产地址须逐环境核对，空值不代表已配置。\n' + keys.map((key) => key + '=' + JSON.stringify(defaults[key] ?? '')).join('\n') + '\n');
  const artifacts = [...expected].map(([path, value]) => ({ path: path.slice('assets/framework/'.length), sha256: hash(value) }));
  expected.set('assets/framework-manifest.json', JSON.stringify({
    schemaVersion: 1,
    upstream: { project: 'admin-template', branch: 'master', commit: '9c4b26a5354b8e333ef3aeb4808dee429f859220' },
    bindingKeys: keys,
    extraction: '模板框架核心 + 实际迁移修正 + 已验证的展示资源；不含试点业务、环境值、品牌、凭据或 SDK 打包代码。package.json 是合并参考，旧测试/业务依赖须保留。',
    origins, artifacts,
  }, null, 2) + '\n');
  return expected;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (!args[0] || args.some((arg, index) => index > 0 && arg !== '--check')) throw new Error('用法：node scripts/sync-framework.mjs <已验收框架项目> [--check]');
    const expected = prepareFramework(args[0]);
    for (const [path, value] of expected) {
      const destination = join(skill, path);
      if (args.includes('--check')) {
        if (readFileSync(destination, 'utf8') !== value) throw new Error('框架快照已变化：' + path);
      } else {
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, value);
      }
    }
    console.log('框架资源：' + (expected.size - 1) + ' 文件；不含目标环境值');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
