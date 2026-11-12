import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { scanProject } from '../skills/react-admin-ui-migration/scripts/scan-candidates.mjs';
import { prepareFramework } from '../skills/react-admin-ui-migration/scripts/prepare-framework.mjs';

async function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'migration-registry-test-'));
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src/main.ts'), 'export const app = 1;');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: { '@gancao-web/request': '2.2.7' } }));
  const write = (source) => writeFileSync(join(root, '.npmrc'), source);
  try { await run(root, write); } finally { rmSync(root, { recursive: true, force: true }); }
}

test('缺失或错误 scope 源均报告，公共默认源和注释不能替代 scope', () => fixture(async (root, write) => {
  for (const value of [null, 'registry=https://registry.npmmirror.com/\n# @gancao-web:registry=https://web-registry.igancao.com/\n']) {
    if (value !== null) write(value);
    const report = await scanProject(root);
    assert.equal(report.scopeRegistry.projectConfig, 'missing');
    assert(report.diagnostics.some((item) => item.code === 'GANCAO_REGISTRY_MISSING'));
    assert.equal(report.complete, false);
  }
  write('@gancao-web:registry=https://registry.npmmirror.com/\n');
  const report = await scanProject(root);
  assert.equal(report.scopeRegistry.projectConfig, 'different');
  assert(report.diagnostics.some((item) => item.code === 'GANCAO_REGISTRY_DIFFERENT'));
}));

test('正确 scope 与公共源、其他 scope、认证共存，配置字节不变且报告不泄漏', () => fixture(async (root, write) => {
  const content = [
    'registry=https://registry.npmmirror.com/',
    '@another:registry=https://other.example/',
    '; preserve comments',
    ' @gancao-web:registry = https://web-registry.igancao.com/ ; team source',
    '//web-registry.igancao.com/:_authToken=fixture-secret-do-not-output',
    '//other.example/:_authToken=${PRIVATE_NPM_TOKEN}',
  ].join('\r\n');
  write(content);
  const report = await scanProject(root);
  assert.equal(report.scopeRegistry.projectConfig, 'configured');
  assert.equal(report.scopeRegistry.runtimeVerified, false);
  assert.equal(report.complete, true);
  assert.equal(readFileSync(join(root, '.npmrc'), 'utf8'), content);
  assert(!/fixture-secret|PRIVATE_NPM_TOKEN|other\.example/.test(JSON.stringify(report)));
}));

test('变量及重复 scope 需实际解析，不解析环境，不泄漏认证 URL', () => fixture(async (root, write) => {
  for (const content of [
    '@gancao-web:registry=${PRIVATE_REGISTRY}\n',
    '@gancao-web:registry="https://web-registry.igancao.com/" ; team source\n',
    '[nested]\n@gancao-web:registry=https://web-registry.igancao.com/\n',
    '@gancao-web:registry=https://registry.npmmirror.com/\n@gancao-web:registry=https://web-registry.igancao.com/\n',
  ]) {
    write(content);
    assert.equal((await scanProject(root)).scopeRegistry.projectConfig, 'needs-resolution');
  }
  write('@gancao-web:registry=https://fixture-user:fixture-secret@private.example/?auth=fixture-query\n');
  const report = await scanProject(root);
  assert.equal(report.scopeRegistry.projectConfig, 'different');
  assert(!/fixture-|private\.example|PRIVATE_REGISTRY/.test(JSON.stringify(report)));
}));

test('符号链接配置不跟随；没有相关依赖时不强加 scope 检查', () => fixture(async (root) => {
  const outside = join(root, 'private-config');
  writeFileSync(outside, '@gancao-web:registry=https://web-registry.igancao.com/\n');
  symlinkSync(outside, join(root, '.npmrc'));
  assert.equal((await scanProject(root)).scopeRegistry.projectConfig, 'unreadable');
  writeFileSync(join(root, 'package.json'), '{"dependencies":{"react":"18.3.1"}}');
  const report = await scanProject(root);
  assert.equal(report.scopeRegistry.projectConfig, 'not-applicable');
  assert(!report.diagnostics.some((item) => item.code?.startsWith('GANCAO_REGISTRY_')));
}));

test('旧组件和 npm 别名迁移也检查 scope；已正确源允许无末尾斜线', () => fixture(async (root, write) => {
  for (const dependencies of [{ 'base-element-react': '2.5.0' }, { component: 'npm:@gancao-web/base-element-react@3.0.0' }]) {
    writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies }));
    assert.equal((await scanProject(root)).scopeRegistry.projectConfig, 'missing');
  }
  write('@gancao-web:registry=https://web-registry.igancao.com\n');
  assert.equal((await scanProject(root)).scopeRegistry.projectConfig, 'configured');
  write('@gancao-web:registry="https://web-registry.igancao.com/"\n');
  assert.equal((await scanProject(root)).scopeRegistry.projectConfig, 'configured');
}));

test('准备资源生成实际 .npmrc，拒绝覆盖已有项目配置', () => fixture(async (root, write) => {
  const content = 'registry=https://registry.npmmirror.com/\n';
  write(content);
  assert.throws(() => prepareFramework(root), /不能覆盖/);
  assert.equal(readFileSync(join(root, '.npmrc'), 'utf8'), content);
  const output = join(root, 'new');
  const report = prepareFramework(output);
  assert(report.files.includes('.npmrc'));
  assert(!report.files.includes('.npmrc.example'));
  assert.equal(readFileSync(join(output, '.npmrc'), 'utf8'), '@gancao-web:registry=https://web-registry.igancao.com/\n');
}));
