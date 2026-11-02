import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { scanProject } from '../skills/react-admin-ui-migration/scripts/scan-candidates.mjs';
import { prepareFramework } from '../skills/react-admin-ui-migration/scripts/prepare-framework.mjs';

async function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'framework-scan-'));
  const write = (path, source) => {
    const destination = join(root, path);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, source);
  };
  try { await run(root, write); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('旧 Umi 工程要求完整框架迁移，读取隐藏根配置但不执行钩子或泄漏环境值', () => fixture(async (root, write) => {
  write('package.json', JSON.stringify({ dependencies: { umi: '^3.5.0' }, scripts: { postinstall: 'touch should-not-run' } }));
  write('.umirc.ts', "export default { define: { APP_ID: 'private-id' } };");
  write('.env.test', 'VITE_APP_ID=private-id\nTOKEN=private-token\n');
  write('src/app.tsx', "export const getInitialState = () => localStorage.getItem('user');");
  const report = await scanProject(root);
  assert.equal(report.architecture.kind, 'legacy');
  assert.equal(report.architecture.action, 'migrate-framework');
  assert(report.rootConfigFiles.includes('.umirc.ts'));
  assert(report.environmentKeys.includes('VITE_APP_ID'));
  assert(!JSON.stringify(report).includes('private-id'));
  assert(!JSON.stringify(report).includes('private-token'));
  assert(!readdirSync(root).includes('should-not-run'));
}));

test('Vite 工程残留 Umi 或旧请求为混合架构；新架构走补齐且命中不当成验收通过', () => fixture(async (root, write) => {
  write('package.json', JSON.stringify({ devDependencies: { vite: '8.2.1' }, dependencies: { 'react-router-dom': '6.30.4' } }));
  write('vite.config.ts', 'export default {};');
  write('src/main.tsx', 'BaseElement.use(config);');
  write('src/request.ts', 'export const requestApi = adapter;');
  let report = await scanProject(root);
  assert.equal(report.architecture.kind, 'modern');
  assert.equal(report.architecture.action, 'reconcile-framework');
  assert.equal(report.architecture.units.find((item) => item.unit === 'request').status, 'evidence-found-unverified');
  write('src/old.ts', "import { useModel } from 'umi';");
  report = await scanProject(root);
  assert.equal(report.architecture.kind, 'mixed');
  assert.equal(report.architecture.action, 'migrate-framework');
}));

test('已有 Vite 但 Router 5 仍需迁旧路由，不能因 Vite 存在判定统一完成', () => fixture(async (root, write) => {
  write('package.json', JSON.stringify({ devDependencies: { vite: '8.2.1' }, dependencies: { 'react-router-dom': '^5.3.0' } }));
  write('src/main.tsx', 'export const app = 1;');
  const report = await scanProject(root);
  assert.equal(report.architecture.kind, 'mixed');
  assert(report.architecture.legacyEvidence.includes('package:react-router-dom-before-6'));
}));

test('注释中的旧导入和样式不作为运行证据，真实导入仍保留原行号', () => fixture(async (root, write) => {
  write('package.json', JSON.stringify({ devDependencies: { vite: '8.2.1' }, dependencies: { '@gancao-web/base-element-react': '3.0.0' } }));
  write('src/main.tsx', [
    "// import { history } from 'umi';",
    '/* 旧框架记录',
    "import { useModel } from 'umi';",
    '*/',
    "const url = 'https://example.test';",
    'const pattern = /https?:\\/\\//;',
    'BaseElement.use(config);',
  ].join('\n'));
  write('src/global.less', "/* @import 'antd/dist/antd.less'; */\n@import 'antd/es/style/themes/default.less';\n");
  let report = await scanProject(root);
  assert.equal(report.architecture.kind, 'modern');
  assert.equal(report.summary['legacy-framework'], 0);
  assert.equal(report.styleVerification, 'needs-runtime-check');
  assert.equal(report.styleEntries.length, 1);
  write('src/main.tsx', readFileSync(join(root, 'src/main.tsx'), 'utf8') + "\nimport { history } from 'umi';\n");
  report = await scanProject(root);
  assert.equal(report.architecture.kind, 'mixed');
  assert.equal(report.findings.find((item) => item.unit === 'legacy-framework').line, 8);
}));

test('完整框架资源可离线准备，默认只读，拒绝覆盖现有项目', () => fixture(async (root, write) => {
  const before = readdirSync(root);
  const plan = prepareFramework();
  assert.equal(plan.output, null);
  assert.deepEqual(readdirSync(root), before);
  assert(plan.files.includes('src/common/request.ts'));
  assert(plan.files.includes('src/router/index.tsx'));
  assert(plan.files.includes('src/pages/base/login/index.tsx'));
  assert(plan.files.includes('src/components/PageLayout/components/FileCenter.tsx'));
  assert(plan.files.includes('src/components/PageLayout/components/ApplicationPanel.tsx'));
  const output = join(root, 'new');
  const result = prepareFramework(output);
  assert.equal(result.files.length, plan.files.length);
  assert(!readFileSync(join(output, '.env.example'), 'utf8').includes('10013'));
  const routes = readFileSync(join(output, 'src/router/menus.tsx'), 'utf8');
  assert(!routes.includes('/cms/'));
  assert.throws(() => prepareFramework(output), /不能覆盖/);
  write('existing/package.json', '{"name":"preserve-me"}');
  assert.throws(() => prepareFramework(join(root, 'existing')), /不能覆盖/);
  assert.equal(readFileSync(join(root, 'existing/package.json'), 'utf8'), '{"name":"preserve-me"}');
}));
