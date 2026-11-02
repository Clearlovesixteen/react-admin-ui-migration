import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanProject } from '../skills/react-admin-ui-migration/scripts/scan-candidates.mjs';

async function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'migration-merge-'));
  const write = (path, value) => writeFileSync(join(root, path), value);
  mkdirSync(join(root, 'src'));
  write('src/main.tsx', 'export const app = 1;');
  try { await run(root, write); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('新依赖合入旧 Umi 生命周期且锁被删除时，报告混合架构和钩子待核对，不执行脚本', () => fixture(async (root, write) => {
  write('package.json', JSON.stringify({
    packageManager: 'pnpm@10.30.3',
    devDependencies: { vite: '8.2.1' },
    scripts: {
      start: 'umi dev',
      build: 'cross-env UMI_ENV=test umi build',
      postinstall: 'umi generate tmp && touch secret-should-not-run',
      'prebuild-test': 'npm ci',
    },
    gitHooks: { 'pre-commit': 'lint-staged' },
  }));
  write('.nvmrc', '20.20.2\n');
  const report = await scanProject(root);
  assert.equal(report.architecture.kind, 'mixed');
  assert.equal(report.architecture.action, 'migrate-framework');
  assert(report.architecture.legacyEvidence.includes('script:postinstall'));
  assert(report.gitHookNames.includes('pre-commit'));
  assert(report.diagnostics.some((item) => item.code === 'DECLARED_LOCK_MISSING'));
  assert(report.diagnostics.some((item) => item.code === 'PACKAGE_MANAGER_SCRIPT_MISMATCH'));
  assert.equal(report.requestedNodeVersion, '20.20.2');
  assert(!existsSync(join(root, 'secret-should-not-run')));
  assert(!JSON.stringify(report).includes('secret-should-not-run'));
}));

test('正常 Vite 脚本和已有锁可通过；日志字符串中提及 umi 不算旧执行链', () => fixture(async (root, write) => {
  write('package.json', JSON.stringify({
    packageManager: 'pnpm@10.30.3',
    devDependencies: { vite: '8.2.1' },
    scripts: { dev: 'vite', build: 'vite build', note: 'node -e "console.log(\'umi dev\')"' },
  }));
  write('pnpm-lock.yaml', 'lockfileVersion: 9\n');
  const before = readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8');
  const report = await scanProject(root);
  assert.equal(report.architecture.kind, 'modern');
  assert.equal(report.complete, true);
  assert.deepEqual(report.gitHookNames, []);
  assert.equal(readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8'), before);
}));
