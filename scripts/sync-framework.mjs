import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { isAppVersion } from '../resources/version-update/src/common/appVersion.js';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skill = join(repository, 'skills/react-admin-ui-migration');
const hash = (value) => createHash('sha256').update(value).digest('hex');
export const coreFiles = [
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
export function prepareFramework(sourceRepository, { upstreamRepository } = {}) {
  if (!upstreamRepository) throw new Error('框架提取需要已适配试点和 --upstream <master源项目> 两个来源；不能把 master 当成试点覆盖已有修正');
  const source = resolve(sourceRepository);
  const reviewed = JSON.parse(readFileSync(join(repository, 'resources/framework/baseline.json'), 'utf8'));
  let upstreamPackageText;
  try {
    upstreamPackageText = execFileSync('git', ['show', reviewed.upstream.commit + ':package.json'], {
      cwd: resolve(upstreamRepository), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch { throw new Error('上游仓库缺少已审查提交 ' + reviewed.upstream.commit + '，请先核对来源'); }
  const upstreamPackage = JSON.parse(upstreamPackageText);
  for (const [name, version] of Object.entries(reviewed.dependencies)) {
    if (upstreamPackage.dependencies?.[name] !== version) throw new Error('上游依赖组合变化，请先审查：' + name);
  }
  const expected = new Map();
  const origins = [];
  function add(path, content, origin, originRepository) {
    expected.set('assets/framework/' + path, content.replaceAll('\r\n', '\n'));
    if (origin) origins.push({ ...(originRepository ? { repository: originRepository } : {}), path: origin, sha256: hash(readFileSync(join(originRepository ? repository : source, origin))) });
  }
  for (const path of coreFiles) {
    let value = readFileSync(join(source, path), 'utf8');
    if (path === 'src/components/PageLayout/index.tsx') {
      value = value.replace(/^import pageBackground .*\n/m, '')
        .replace(/background=\{.*pageBackground.*\}/, 'background="linear-gradient(180deg, #eaf0fc 0%, #f2f5f7 100%)"');
    }
    if (path === 'src/components/PageLayout/index.tsx') {
      const replacements = [
        ["import './project.less';", "import { usePageLayoutTheme } from './theme/usePageLayoutTheme';\nimport PageLayoutThemeToggle from './theme/ThemeToggle';\nimport VersionUpdate from '@/components/VersionUpdate';\nimport './theme/theme.less';\nimport './project.less';"],
        ['  const location = useLocation();', "  const [theme, setTheme] = usePageLayoutTheme('page-layout-theme:' + env.VITE_APP_ID);\n  const location = useLocation();"],
        ['    <PageLayoutShell', '    <PageLayoutShell\n      className={`page-layout-theme-${theme}`}\n      headerTrailingActions={[<PageLayoutThemeToggle key="theme" theme={theme} onChange={setTheme} />]}'],
        ['background="linear-gradient(180deg, #eaf0fc 0%, #f2f5f7 100%)"', 'background={theme === \'dark\' ? \'#1d2c42\' : \'linear-gradient(180deg, #eaf0fc 0%, #f2f5f7 100%)\'}'],
        ['headerActions={[', 'headerActions={[<VersionUpdate key="version" />, '],
      ];
      for (const [before, after] of replacements) {
        if (!value.includes(before) || value.indexOf(before) !== value.lastIndexOf(before)) throw new Error('主题适配入口已变化，请审查：' + path);
        value = value.replace(before, after);
      }
    }
    if (path === 'src/main.tsx' && !value.includes('labelPosition:')) {
      const marker = "layoutMode: 'grid', itemCol: 4,";
      if (!value.includes(marker) || value.indexOf(marker) !== value.lastIndexOf(marker)) throw new Error('搜索标签配置入口已变化，请审查：' + path);
      value = value.replace(marker, marker + " labelPosition: 'left',");
    }
    if (path === 'src/common/request.ts') {
      // Hyperf 最终复用 GAPI；显式 host 才能与同项目的 GAPI/pre/开发代理保持一致。
      const replacements = [
        ["requestHyperf<T>({ AK: env.VITE_APP_GAPI_AK, ...config })", "requestHyperf<T>({ AK: env.VITE_APP_GAPI_AK, host: gapiHost, ...config })"],
        ['requestUc as requestUcBase, uploadGapi, uploadOSSAdmin,', 'requestUc as requestUcBase, uploadGapi, uploadOSS,'],
        ["RequestConfigGapi, UploadOptionGapi }", "RequestConfigGapi, UploadOptionGapi, OssSign }"],
        // SDK 的 uploadOSSAdmin 不转发签名 host，且没有 data 时不会注入 sysId；显式走已绑定的 UC 门面。
        ['await uploadOSSAdmin({ ...other, sysId: env.VITE_APP_ID }, uploadConfig)', "await uploadOSS(\n      await requestUc<OssSign>({ url: '/auth/base/oss/ticket', data: {} }), other, uploadConfig,\n    )"],
        ['  const result = env.VITE_APP_API_MODE', '  // UC 签名使用目标 host/sysId；SDK 便捷方法不会转发这两个适配条件。\n  const result = env.VITE_APP_API_MODE'],
      ];
      for (const [before, after] of replacements) {
        if (!value.includes(before) || value.indexOf(before) !== value.lastIndexOf(before)) throw new Error('SDK3 请求适配入口已变化，请审查：' + path);
        value = value.replace(before, after);
      }
    }
    if (path === 'vite.config.ts') {
      const marker = "import { lessThemeVars } from './config/theme.ts';";
      if (!value.includes(marker) || !value.includes('plugins: [')) throw new Error('Vite 版本插件入口已变化，请审查');
      value = value.replace(marker, marker + "\nimport { appVersionPlugin } from './plugins/appVersion.mjs';")
        .replace('plugins: [', 'plugins: [appVersionPlugin(env.VITE_APP_ENV), ');
    }
    if (path === 'tsconfig.node.json') {
      const config = JSON.parse(value);
      config.include = [...new Set([...config.include, 'plugins/**/*.mjs', 'plugins/**/*.d.mts'])];
      value = JSON.stringify(config, null, 2) + '\n';
    }
    // 保留通用边界，避免把试点项目名称误当成框架要求。
    value = value.replaceAll('CMS', '目标项目').replaceAll('cms-login', 'admin-login')
      .replaceAll('cms-route-loading', 'admin-route-loading').replaceAll('cms-auth-upload', 'admin-auth-upload');
    add(path, value, path);
  }
  // 展示层从已有离线资源组合，升级框架不会丢失已验证的 WMS 图标/颜色/我的应用。
  const layout = join(skill, 'assets/page-layout');
  for (const path of walk(layout)) add('src/components/PageLayout/' + path, readFileSync(join(layout, path), 'utf8'));
  const versionRoot = join(repository, 'resources/version-update');
  for (const path of walk(versionRoot).filter((path) => path !== 'source.json')) {
    add(path, readFileSync(join(versionRoot, path), 'utf8'), 'resources/version-update/' + path, 'migration-skill');
  }
  add('src/styles/windows-scrollbar.less', readFileSync(join(repository, 'resources/framework/windows-scrollbar.less'), 'utf8'), 'resources/framework/windows-scrollbar.less', 'migration-skill');
  const globalSource = readFileSync(join(source, 'src/global.less'), 'utf8');
  add('src/global.less', globalSource + "\n@import './styles/windows-scrollbar.less';\n.admin-route-loading { display: block; margin: 100px auto; }\n.admin-auth-upload { padding: 24px; }\n", 'src/global.less');
  const projectStyles = readFileSync(join(source, 'src/components/PageLayout/project.less'), 'utf8');
  if (!projectStyles.includes('@media')) throw new Error('未找到项目响应式样式区，请审查提取规则');
  add('src/components/PageLayout/project.less', projectStyles.slice(projectStyles.indexOf('@media')), 'src/components/PageLayout/project.less');
  add('src/router/menus.tsx', "import type { RouteMenu } from '@/types/route';\n\n/** 迁移时按原菜单注册真实页面、原 path/code，不启用旧系统关闭的模块。 */\nconst menus: RouteMenu[] = [];\nexport default menus;\n");
  add('src/router/routes.ts', "import menus from './menus';\nimport type { RouteMenu } from '@/types/route';\nconst routes: RouteMenu[] = [\n  { path: '/', component: () => import('@/pages/base/login'), meta: { auth: false } },\n  { component: () => import('@/components/PageLayout'), children: [\n    { path: '/welcome', component: () => import('@/pages/base/welcome') },\n    { path: '/auth', component: () => import('@/pages/base/auth') },\n    ...menus,\n  ] },\n  { path: '/403', component: () => import('@/pages/base/403') },\n  { path: '*', component: () => import('@/pages/base/404'), meta: { auth: false } },\n];\nexport default routes;\n");
  add('src/pages/base/welcome/index.tsx', "import { env } from '@/common/env';\nexport default function Welcome() { return <section style={{ padding: 24 }}>欢迎使用{env.VITE_APP_NAME}</section>; }\n");
  add('index.html', '<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>%VITE_APP_NAME%</title><script>globalThis.global = globalThis;</script></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n');
  add('.nvmrc', '20.20.2\n');
  // npm pack 排除 .npmrc；分发无凭据示例，准备资源时映射为项目 .npmrc。
  add('.npmrc.example', '@gancao-web:registry=https://web-registry.igancao.com/\n');
  const pkg = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
  origins.push({ path: 'package.json', sha256: hash(readFileSync(join(source, 'package.json'))) });
  const packageFragment = {
    private: true, type: 'module', packageManager: pkg.packageManager, engines: pkg.engines,
    // 应用版本来自目标绑定源，不复制 master 的业务发布号或插件版本。
    version: pkg.version, minVersion: pkg.minVersion ?? pkg.version,
    scripts: Object.fromEntries(Object.entries(pkg.scripts).filter(([key]) => !['test', 'test:unit', 'test:coverage', 'prettier'].includes(key))),
    dependencies: Object.fromEntries(Object.entries(pkg.dependencies).filter(([key]) => !['braft-editor', 'braft-extensions', 'braft-utils', 'copy-to-clipboard'].includes(key))),
    devDependencies: Object.fromEntries(Object.entries(pkg.devDependencies).filter(([key]) => !['jest', 'jest-environment-jsdom', 'babel-jest', 'babel-plugin-jest-hoist', '@babel/core', 'identity-obj-proxy'].includes(key))),
  };
  if (!isAppVersion({ env: 'build', version: packageFragment.version, minVersion: packageFragment.minVersion })) throw new Error('试点应用 version/minVersion 不合法，请先明确应用发布策略');
  Object.assign(packageFragment.dependencies, reviewed.dependencies);
  add('package.json', JSON.stringify(packageFragment, null, 2) + '\n');
  const keys = [...readFileSync(join(source, 'src/env.d.ts'), 'utf8').matchAll(/readonly (VITE_APP_[A-Z_]+):/g)].map((match) => match[1]);
  const defaults = {
    VITE_APP_ENV: 'development', VITE_APP_API_MODE: 'gapis', VITE_APP_GAPI_AK: '7',
    VITE_APP_ROUTER_MODE: 'hash', VITE_APP_LOGIN_GAPI_BY_JAVA: '0',
  };
  add('.env.example', '# 按目标项目填写。权限、保活、测试/预发/生产地址须逐环境核对，空值不代表已配置。\n' + keys.map((key) => key + '=' + JSON.stringify(defaults[key] ?? '')).join('\n') + '\n');
  const artifacts = [...expected].map(([path, value]) => ({ path: path.slice('assets/framework/'.length), sha256: hash(value) }));
  let pilotCommit = null;
  try { pilotCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* 非 Git 暂存源由逐文件指纹描述。 */ }
  expected.set('assets/framework-manifest.json', JSON.stringify({
    schemaVersion: 1,
    upstream: reviewed.upstream,
    pilot: { role: 'adapted-framework', commit: pilotCommit },
    upstreamSources: [{ path: 'package.json', sha256: hash(upstreamPackageText) }],
    dependencyBaseline: reviewed.dependencies,
    versionUpdate: JSON.parse(readFileSync(join(versionRoot, 'source.json'), 'utf8')),
    bindingKeys: keys,
    extraction: '已适配试点核心 + 固定 master 的四项依赖组合 + 维护版版本提示/Windows 样式 + 已验证展示资源；不是 master 全目录镜像。不含业务、环境值、品牌、凭据或 SDK 打包代码；目标发布号、测试和业务依赖须按原项目合并。',
    origins, artifacts,
  }, null, 2) + '\n');
  return expected;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const [source, ...flags] = args;
    let upstreamRepository;
    let check = false;
    for (let index = 0; index < flags.length; index++) {
      if (flags[index] === '--check' && !check) check = true;
      else if (flags[index] === '--upstream' && !upstreamRepository && flags[index + 1] && !flags[index + 1].startsWith('--')) upstreamRepository = flags[++index];
      else throw new Error('用法：node scripts/sync-framework.mjs <已适配试点> --upstream <master源项目> [--check]');
    }
    if (!source || source.startsWith('--')) throw new Error('需要明确的已适配试点项目');
    const expected = prepareFramework(source, { upstreamRepository });
    for (const [path, value] of expected) {
      const destination = join(skill, path);
      if (check) {
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
