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
