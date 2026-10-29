import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { scanProject } from '../skills/react-admin-ui-migration/scripts/scan-candidates.mjs';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'ui-migration-scan-'));
  const write = (path, content) => {
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  };
  write('package.json', JSON.stringify({ packageManager: 'pnpm@8.15.9', dependencies: { react: '18.2.0', 'base-element-react': '2.5.95-alpha.7' } }));
  return Promise.resolve().then(() => run(root, write)).finally(() => rmSync(root, { recursive: true, force: true }));
}

function snapshot(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const path = join(prefix, entry.name);
    if (entry.isSymbolicLink()) return [[path, 'symlink']];
    return entry.isDirectory() ? snapshot(root, path) : [[path, readFileSync(join(root, path), 'utf8')]];
  });
}

test('发现我的应用接入候选，不执行加载函数，也不把候选当成完整接入证明', () => fixture(async (root, write) => {
  write('src/layout.tsx', 'export const ui = <PageLayoutShell applicationPanel={{ loadApplications }} />;');
  const before = snapshot(root);
  const report = await scanProject(root);
  assert.equal(report.summary['application-panel'], 1);
  assert.deepEqual(snapshot(root), before);
}));

test('发现旧包、旧页面、布局和汇总候选且不执行源码或写入目标', () => fixture(async (root, write) => {
  write('src/main.tsx', [
    "import { BasePage } from 'base-element-react';",
    "import { writeFileSync } from 'node:fs';",
    "writeFileSync('should-not-execute', 'bad');",
    'BaseElement.use({ listForm: {} });',
    'const view = <BasePage page={page} />;',
    'const config = { paginationExtraRender: renderSummary };',
    'const layout = { itemCol: 3 };',
  ].join('\n'));
  write('.env', 'PRIVATE_VALUE=DO_NOT_PRINT');
  const before = snapshot(root);
  const report = await scanProject(root);
  assert.equal(report.summary['component-imports'], 1);
  assert.equal(report.summary['legacy-page'], 1);
  assert.equal(report.summary['list-summary'], 1);
  assert.equal(report.summary['form-layout'], 1);
  assert.equal(report.packageManager, 'pnpm@8.15.9');
  assert.equal(report.installedComponent, null);
  assert(!JSON.stringify(report).includes('DO_NOT_PRINT'));
  assert.deepEqual(snapshot(root), before);
}));

test('跳过本地组件实现、依赖和源码符号链接，记录未覆盖的源码', () => fixture(async (root, write) => {
  write('src/page.tsx', "import { BasePage } from '@gancao-web/base-element-react';\nexport const view = <BasePage config={config} />;");
  write('src/base-element-react/index.tsx', "export const view = <BasePage page={oldPage} />;");
  write('node_modules/something/index.tsx', "export const view = <BasePage page={oldPage} />;");
  write('external/page.tsx', "export const view = <BasePage page={oldPage} />;");
  symlinkSync(join(root, 'external'), join(root, 'src/linked'), 'dir');
  const report = await scanProject(root);
  assert.equal(report.localComponentSource, true);
  assert.equal(report.inspectedFiles, 1);
  assert.equal(report.summary['component-imports'], 0);
  assert.equal(report.summary['legacy-page'], 0);
  assert.equal(report.complete, false);
  assert(report.diagnostics.some((item) => item.file === 'src/linked'));
}));

test('扫描范围为空或超大源码时显式报告未覆盖，不能当作零迁移结果', () => fixture(async (root, write) => {
  let report = await scanProject(root);
  assert.equal(report.complete, false);
  assert.equal(report.inspectedFiles, 0);
  write('src/huge.ts', ' '.repeat(2 * 1024 * 1024 + 1));
  report = await scanProject(root);
  assert.equal(report.complete, false);
  assert(report.diagnostics.some((item) => item.file === 'src/huge.ts'));
}));

test('目标元数据无效时失败，不继续猜测项目结构', () => fixture(async (root, write) => {
  write('package.json', '{ broken');
  await assert.rejects(() => scanProject(root), /package\.json/);
}));

test('源码根目录为符号链接时也不会越界扫描', () => fixture(async (root, write) => {
  write('external/page.tsx', 'export const view = <BasePage page={oldPage} />;');
  symlinkSync(join(root, 'external'), join(root, 'src'), 'dir');
  const report = await scanProject(root);
  assert.equal(report.inspectedFiles, 0);
  assert.equal(report.complete, false);
  assert(report.diagnostics.some((item) => item.file === 'src'));
}));

test('新版 npm 组件仅有主题变量导入时报告样式待验，不能将变量当成控件 CSS', () => fixture(async (root, write) => {
  write('package.json', JSON.stringify({ dependencies: { '@gancao-web/base-element-react': '3.0.0' } }));
  write('src/global.less', "@import '~antd/es/style/themes/default.less';\n");
  write('node_modules/@gancao-web/base-element-react/package.json', JSON.stringify({ name: '@gancao-web/base-element-react', version: '3.0.0' }));
  const report = await scanProject(root);
  assert.equal(report.styleVerification, 'needs-runtime-check');
  assert.equal(report.styleEntries[0].kind, 'variables-only');
  assert.equal(report.complete, false);
  assert(report.diagnostics.some((item) => item.level === 'warning' && item.message.includes('样式入口')));
}));

test('完整 Ant Design Less/CSS 入口可被发现，但仍明确未完成运行时验收', () => fixture(async (root, write) => {
  write('package.json', JSON.stringify({ dependencies: { '@gancao-web/base-element-react': '3.0.0' } }));
  write('src/global.less', "@import '~antd/dist/antd.less';\n");
  write('src/main.tsx', "import 'antd/dist/antd.css';\nconst value = <span className={target.color}>状态</span>;");
  const before = snapshot(root);
  const report = await scanProject(root);
  assert.equal(report.styleEntries.filter((item) => item.kind === 'full').length, 2);
  assert.equal(report.styleVerification, 'entry-found-runtime-unverified');
  assert.equal(report.summary['legacy-color-classes'], 1);
  assert.equal(report.complete, true);
  assert.deepEqual(snapshot(root), before);
}));

test('按需样式只作为入口证据，包内间接控件和 portal 样式仍需验证', () => fixture(async (root, write) => {
  write('package.json', JSON.stringify({ dependencies: { '@gancao-web/base-element-react': '3.0.0' } }));
  write('src/main.tsx', "import 'antd/es/table/style';\n");
  const report = await scanProject(root);
  assert.equal(report.styleEntries[0].kind, 'component');
  assert.equal(report.styleVerification, 'needs-runtime-check');
}));

test('保留并报告多锁文件和安装布局冲突，不泄漏锁文件内容', () => fixture(async (root, write) => {
  write('package.json', JSON.stringify({ packageManager: 'npm@6.14.18', engines: { node: '14.x' } }));
  write('package-lock.json', JSON.stringify({ lockfileVersion: 1 }));
  write('pnpm-lock.yaml', 'private_config: DO_NOT_PRINT_LOCK_CONTENT\n');
  write('node_modules/.pnpm/.fixture', '');
  write('src/index.ts', 'export const value = 1;');
  const before = snapshot(root);
  const report = await scanProject(root);
  assert.deepEqual(report.lockFiles, ['package-lock.json', 'pnpm-lock.yaml']);
  assert.equal(report.installationLayout, 'pnpm');
  assert.equal(report.nodeEngines, '14.x');
  assert.equal(report.complete, false);
  assert(report.diagnostics.some((item) => item.message.includes('安装布局冲突')));
  assert(!JSON.stringify(report).includes('DO_NOT_PRINT_LOCK_CONTENT'));
  assert.deepEqual(snapshot(root), before);
}));
