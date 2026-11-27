import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = join(repository, 'skills', 'react-admin-ui-migration');
const sourceFiles = [
  'config.ts', 'types.ts', 'components/PageLayoutShell.tsx', 'components/Menu.tsx',
  'components/MenuSearch.tsx', 'utils/menu.ts', 'utils/storage.ts', 'index.less',
];
const hash = (text) => createHash('sha256').update(text).digest('hex');

function replaceExactly(source, before, after) {
  if (!source.includes(before) || source.indexOf(before) !== source.lastIndexOf(before)) {
    throw new Error('源结构发生变化，请先审查提取规则：' + before);
  }
  return source.replace(before, after);
}

function removeSection(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from === -1 || to === -1) throw new Error('未找到预期样式分区，请审查源文件');
  return source.slice(0, from) + source.slice(to);
}

function extract(path, input) {
  let output = input;
  if (path === 'components/Menu.tsx') {
    output = replaceExactly(output, "import { DownOutlined, ProfileOutlined } from '@ant-design/icons';", "import PageLayoutMenuIcon from './MenuIcon';");
    output = replaceExactly(output, '<ProfileOutlined className="page-layout-menu-icon" />', '<PageLayoutMenuIcon name="gc-quanbuyingyong" />');
    output = replaceExactly(output, '<DownOutlined className="page-layout-menu-expand-icon" aria-hidden="true" />', '<PageLayoutMenuIcon name="gc-down" className="page-layout-menu-expand-icon" />');
    output = replaceExactly(output, '<div className="page-layout-menu-collapsed-trigger">{itemContent}</div>', '{itemContent}');
  }
  if (path === 'types.ts') {
    output = replaceExactly(output, '  /** 文件中心内置能力；默认关闭，只能在当前 Layout 实例开启。 */\n  fileCenter?: boolean;\n', '');
    output = replaceExactly(output, '  /** 我的应用内置能力；默认关闭，只能在当前 Layout 实例开启。 */\n  applicationPanel?: boolean;\n', '  /** 新版迁移需接入我的应用；使用目标项目已鉴权的加载函数。 */\n  applicationPanel?: false | { loadApplications: () => Promise<import(\'./utils/applications\').PageLayoutApplicationItem[]> };\n');
    output = output.replaceAll('内置平台能力之前的项目 Header 扩展。', '项目 Header 扩展，由目标项目提供真实功能。');
    output = output.replaceAll('内置平台能力之后的项目 Header 扩展。', '项目 Header 尾部扩展。');
  }
  if (path === 'components/PageLayoutShell.tsx') {
    // master 新增的版本提示属于项目适配器；通用 Shell 仍保持无项目依赖。
    if (output.includes("import VersionUpdate from '@/components/VersionUpdate';")) {
      output = replaceExactly(output, "import VersionUpdate from '@/components/VersionUpdate';\n", '');
      output = replaceExactly(output, '          <VersionUpdate />\n', '');
    }
    for (const line of [
      "import PageLayoutFileCenter from './FileCenter';\n",
      '  fileCenter = false,\n',
      '    fileCenter ? <PageLayoutFileCenter key="page-layout-file-center" /> : null,\n',
    ]) output = replaceExactly(output, line, '');
    output = replaceExactly(output, '<PageLayoutApplicationPanel key="page-layout-application-panel" />', '<PageLayoutApplicationPanel key="page-layout-application-panel" {...applicationPanel} />');
  }
  if (path === 'index.less') {
    output = replaceExactly(output, `.page-layout {
  position: relative;`, `.page-layout {
  --page-layout-current-sidebar-width: @page-layout-sidebar-width;
  --page-layout-header-padding-x: 22px;
  --page-layout-header-gap: 20px;
  position: relative;`);
    output = replaceExactly(output, '    padding: 0 22px;', '    padding: 0 var(--page-layout-header-padding-x);');
    output = replaceExactly(output, `  .page-layout-header-left {
    flex: 1;
    gap: 20px;`, `  .page-layout-header-left {
    flex: 1;
    gap: var(--page-layout-header-gap);`);
    output = replaceExactly(output, `  .page-layout-brand {
    flex: none;
    gap: 8px;
  }`, `  .page-layout-brand {
    flex: 0 0 calc(var(--page-layout-current-sidebar-width) - var(--page-layout-header-padding-x) - var(--page-layout-header-gap));
    gap: 8px;
    overflow: hidden;
    transition: flex-basis 0.2s ease;
  }`);
    output = replaceExactly(output, `  .page-layout-brand-title {
    max-width: 320px;`, `  .page-layout-brand-title {
    flex: 1;
    min-width: 0;
    max-width: 320px;`);
    output = replaceExactly(output, '  &.is-collapsed .page-layout-sidebar {', `  &.is-collapsed {
    --page-layout-current-sidebar-width: @page-layout-sidebar-collapsed-width;

    .page-layout-brand-logo + .page-layout-brand-title {
      display: none;
    }
  }

  &.is-collapsed .page-layout-sidebar {`);
    output = replaceExactly(output, `    --page-layout-current-sidebar-width: @page-layout-sidebar-collapsed-width;
`, `    --page-layout-current-sidebar-width: @page-layout-sidebar-collapsed-width;

    .page-layout-brand-logo {
      margin-left: calc(var(--page-layout-current-sidebar-width) / 2 - var(--page-layout-header-padding-x) - 10px);
    }
`);
    output = replaceExactly(output, `      .page-layout-menu-level-1 > .page-layout-menu-item {
        margin-right: 20px;
        margin-left: 20px;
      }`, `      .page-layout-menu-level-1 > .page-layout-menu-item {
        width: 40px;
        margin-right: auto;
        margin-left: auto;
      }`);
    output = replaceExactly(output, `        justify-content: center;
        padding: 0;
      }`, `        justify-content: center;
        padding: 0;
        border-radius: 8px;
      }

      .page-layout-menu-button-main {
        justify-content: center;
      }`);
    output = replaceExactly(output, `    .page-layout-sidebar,
    .page-layout-menu-button,`, `    .page-layout-sidebar,
    .page-layout-brand,
    .page-layout-menu-button,`);
    output = replaceExactly(output, "@import '~antd/es/style/themes/default.less';", "@import 'antd/es/style/themes/default.less';");
    output = removeSection(output, '\n  .page-layout-platform-trigger {', '\n  .page-layout-header-divider {');
    output = removeSection(output, '\n.page-layout-file-center-popover,', '\n.page-layout-menu-popup {');
    output = output.replaceAll('var(--app-font-medium)', 'var(--app-font-medium, 600)');
    output += "\n@import './menu-visual.less';\n@import './application-panel.less';\n";
  }
  return output;
}

/** 显式同步维护快照；不读取或记录源仓库地址、凭据和业务接口。 */
export function prepareBaseline(sourceRepository, { componentManifest } = {}) {
  const sourceRoot = resolve(sourceRepository);
  const rootPackageText = readFileSync(join(sourceRoot, 'package.json'), 'utf8');
  const rootPackage = JSON.parse(rootPackageText);
  const localManifest = join(sourceRoot, 'src/base-element-react/package.json');
  const manifestPath = componentManifest ? resolve(componentManifest) : localManifest;
  if (!existsSync(manifestPath)) throw new Error('未发现本地组件源码；请用 --component-package 指定已核实 npm 包的 package.json，不读取可能过期的 node_modules');
  const libraryText = readFileSync(manifestPath, 'utf8');
  const library = JSON.parse(libraryText);
  if (library.name !== '@gancao-web/base-element-react' || !/^\d+\.\d+\.\d+$/.test(library.version)) throw new Error('组件元数据必须是已核实的 base-element-react 稳定版本');
  if (componentManifest && rootPackage.dependencies?.[library.name] !== library.version) throw new Error('npm 组件元数据与源项目精确声明不一致，请先核对锁文件和实际包');
  const expected = new Map();
  const origins = [{ path: 'package.json', sha256: hash(rootPackageText) }];
  if (!componentManifest) origins.push({ path: 'src/base-element-react/package.json', sha256: hash(libraryText) });
  const artifacts = [];
  for (const path of sourceFiles) {
    const sourcePath = 'src/components/PageLayout/' + path;
    const input = readFileSync(join(sourceRoot, sourcePath), 'utf8').replaceAll('\r\n', '\n');
    const output = extract(path, input);
    const artifact = 'assets/page-layout/' + path;
    expected.set(artifact, output);
    origins.push({ path: sourcePath, sha256: hash(input) });
    artifacts.push({ path: artifact, sha256: hash(output) });
  }
  for (const [name, destination] of [
    ['MenuIcon.tsx', 'components/MenuIcon.tsx'],
    ['menu-icons.json', 'menu-icons.json'],
    ['menu-visual.less', 'menu-visual.less'],
  ]) {
    const sourcePath = 'resources/menu-visual/' + name;
    const content = readFileSync(join(repository, sourcePath), 'utf8');
    const artifact = 'assets/page-layout/' + destination;
    expected.set(artifact, content);
    origins.push({ repository: 'migration-skill', path: sourcePath, sha256: hash(content) });
    artifacts.push({ path: artifact, sha256: hash(content) });
  }
  for (const [name, destination] of [
    ['ApplicationPanel.tsx', 'components/ApplicationPanel.tsx'],
    ['applications.ts', 'utils/applications.ts'],
    ['application-panel.less', 'application-panel.less'],
  ]) {
    const sourcePath = 'resources/application-panel/' + name;
    const content = readFileSync(join(repository, sourcePath), 'utf8');
    const artifact = 'assets/page-layout/' + destination;
    expected.set(artifact, content);
    origins.push({ repository: 'migration-skill', path: sourcePath, sha256: hash(content) });
    artifacts.push({ path: artifact, sha256: hash(content) });
  }
  for (const name of ['preference.js', 'preference.d.ts', 'usePageLayoutTheme.ts', 'ThemeToggle.tsx', 'theme.less']) {
    const sourcePath = 'resources/layout-theme/' + name;
    const content = readFileSync(join(repository, sourcePath), 'utf8');
    const artifact = 'assets/page-layout/theme/' + name;
    expected.set(artifact, content);
    origins.push({ repository: 'migration-skill', path: sourcePath, sha256: hash(content) });
    artifacts.push({ path: artifact, sha256: hash(content) });
  }
  // 主题是组件外部的视觉依赖；仅提取 Less 变量，不分发 UnoCSS/业务构建配置。
  const themePath = 'config/theme.ts';
  const themeInput = readFileSync(join(sourceRoot, themePath), 'utf8').replaceAll('\r\n', '\n');
  const themeEnd = themeInput.indexOf('// UnoCSS 主题颜色');
  if (themeEnd === -1) throw new Error('主题源结构发生变化，请审查 Less 变量提取范围');
  const themeOutput = themeInput.slice(0, themeEnd).trimEnd() + '\n';
  const themeArtifact = 'assets/theme/antd4.ts';
  expected.set(themeArtifact, themeOutput);
  origins.push({ path: themePath, sha256: hash(themeInput) });
  artifacts.push({ path: themeArtifact, sha256: hash(themeOutput) });
  let sourceCommit = null;
  try { sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: sourceRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* 临时提取目录可无 Git，但不能虚构提交。 */ }
  const baseline = {
    schemaVersion: 1,
    componentPackage: library.name,
    componentVersion: library.version,
    componentMetadata: { source: componentManifest ? 'published-package' : 'local-source', sha256: hash(libraryText) },
    sourceCommit,
    uiDependencies: Object.fromEntries(['react', 'antd', '@ant-design/icons'].map((name) => [name, rootPackage.dependencies[name]])),
    layoutTheme: JSON.parse(readFileSync(join(repository, 'resources/layout-theme/source.json'), 'utf8')),
    menuVisual: JSON.parse(readFileSync(join(repository, 'resources/menu-visual/source.json'), 'utf8')),
    extraction: '包含默认亮色且持久化偏好的 MES 外框主题、项目展示层、可注入请求的我的应用、WMS 菜单配色/本地单色图形和 Ant Design 4/Less 主题变量；排除业务入口、RouteTabs、用户/权限 Store、平台请求实现、品牌资源、UnoCSS 和文件中心。',
    sources: origins,
    artifacts,
  };
  expected.set('assets/baseline.json', JSON.stringify(baseline, null, 2) + '\n');
  return expected;
}

function main(args) {
  const [source, ...flags] = args;
  let componentManifest;
  let check = false;
  for (let index = 0; index < flags.length; index++) {
    if (flags[index] === '--check' && !check) check = true;
    else if (flags[index] === '--component-package' && !componentManifest && flags[index + 1] && !flags[index + 1].startsWith('--')) componentManifest = flags[++index];
    else throw new Error('用法：node scripts/sync-baseline.mjs <展示源项目> [--component-package <已核实组件package.json>] [--check]');
  }
  if (!source || source.startsWith('--')) throw new Error('需要明确的展示源项目');
  const expected = prepareBaseline(source, { componentManifest });
  for (const [path, content] of expected) {
    const destination = join(skillRoot, path);
    if (check) {
      if (readFileSync(destination, 'utf8') !== content) throw new Error('基线或快照已变化：' + path);
    } else {
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, content);
    }
  }
  console.log((check ? '基线一致：' : '基线已同步：') + (expected.size - 1) + ' 个展示文件');
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
