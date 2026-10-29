import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
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
  }
  if (path === 'types.ts') {
    output = replaceExactly(output, '  /** 文件中心内置能力；默认关闭，只能在当前 Layout 实例开启。 */\n  fileCenter?: boolean;\n', '');
    output = replaceExactly(output, '  /** 我的应用内置能力；默认关闭，只能在当前 Layout 实例开启。 */\n  applicationPanel?: boolean;\n', '');
    output = output.replaceAll('内置平台能力之前的项目 Header 扩展。', '项目 Header 扩展，由目标项目提供真实功能。');
    output = output.replaceAll('内置平台能力之后的项目 Header 扩展。', '项目 Header 尾部扩展。');
  }
  if (path === 'components/PageLayoutShell.tsx') {
    for (const line of [
      "import PageLayoutApplicationPanel from './ApplicationPanel';\n",
      "import PageLayoutFileCenter from './FileCenter';\n",
      '  fileCenter = false,\n',
      '  applicationPanel = false,\n',
      '    fileCenter ? <PageLayoutFileCenter key="page-layout-file-center" /> : null,\n',
      '    applicationPanel ? <PageLayoutApplicationPanel key="page-layout-application-panel" /> : null,\n',
    ]) output = replaceExactly(output, line, '');
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
    output = replaceExactly(output, `    .page-layout-sidebar,
    .page-layout-menu-button,`, `    .page-layout-sidebar,
    .page-layout-brand,
    .page-layout-menu-button,`);
    output = replaceExactly(output, "@import '~antd/es/style/themes/default.less';", "@import 'antd/es/style/themes/default.less';");
    output = removeSection(output, '\n  .page-layout-platform-trigger {', '\n  .page-layout-header-divider {');
    output = removeSection(output, '\n.page-layout-file-center-popover,', '\n.page-layout-menu-popup {');
    output = output.replaceAll('var(--app-font-medium)', 'var(--app-font-medium, 600)');
    output += "\n@import './menu-visual.less';\n";
  }
  return output;
}

/** 显式同步维护快照；不读取或记录源仓库地址、凭据和业务接口。 */
export function prepareBaseline(sourceRepository) {
  const sourceRoot = resolve(sourceRepository);
  const library = JSON.parse(readFileSync(join(sourceRoot, 'src/base-element-react/package.json'), 'utf8'));
  const expected = new Map();
  const origins = [];
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
  const rootPackage = JSON.parse(readFileSync(join(sourceRoot, 'package.json'), 'utf8'));
  const baseline = {
    schemaVersion: 1,
    componentPackage: library.name,
    componentVersion: library.version,
    uiDependencies: Object.fromEntries(['react', 'antd', '@ant-design/icons'].map((name) => [name, rootPackage.dependencies[name]])),
    menuVisual: JSON.parse(readFileSync(join(repository, 'resources/menu-visual/source.json'), 'utf8')),
    extraction: '包含项目展示层、WMS 菜单配色/本地单色图形和 Ant Design 4/Less 主题变量；排除业务入口、RouteTabs、用户/权限 Store、平台 API、品牌资源、UnoCSS 和固定平台组件。',
    sources: origins,
    artifacts,
  };
  expected.set('assets/baseline.json', JSON.stringify(baseline, null, 2) + '\n');
  return expected;
}

function main(args) {
  const source = args.find((arg) => !arg.startsWith('--'));
  if (!source || args.some((arg) => arg.startsWith('--') && arg !== '--check') || args.filter((arg) => !arg.startsWith('--')).length !== 1) {
    throw new Error('用法：node scripts/sync-baseline.mjs <组件维护仓库> [--check]');
  }
  const expected = prepareBaseline(source);
  for (const [path, content] of expected) {
    const destination = join(skillRoot, path);
    if (args.includes('--check')) {
      if (readFileSync(destination, 'utf8') !== content) throw new Error('基线或快照已变化：' + path);
    } else {
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, content);
    }
  }
  console.log((args.includes('--check') ? '基线一致：' : '基线已同步：') + (expected.size - 1) + ' 个展示文件');
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
