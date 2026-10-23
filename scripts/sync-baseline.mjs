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
    output = replaceExactly(output, "@import '~antd/es/style/themes/default.less';", "@import 'antd/es/style/themes/default.less';");
    output = removeSection(output, '\n  .page-layout-platform-trigger {', '\n  .page-layout-header-divider {');
    output = removeSection(output, '\n.page-layout-file-center-popover,', '\n.page-layout-menu-popup {');
    output = output.replaceAll('var(--app-font-medium)', 'var(--app-font-medium, 600)');
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
  const rootPackage = JSON.parse(readFileSync(join(sourceRoot, 'package.json'), 'utf8'));
  const baseline = {
    schemaVersion: 1,
    componentPackage: library.name,
    componentVersion: library.version,
    uiDependencies: Object.fromEntries(['react', 'antd', '@ant-design/icons'].map((name) => [name, rootPackage.dependencies[name]])),
    extraction: '只包含项目展示层；排除业务入口、RouteTabs、用户/权限 Store、平台 API、品牌资源和固定平台组件。',
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
