import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { prepareBaseline } from '../scripts/sync-baseline.mjs';
import { prepareFramework } from '../scripts/sync-framework.mjs';

test('npm 化展示源须显式核实组件元数据，不回退旧 node_modules 或接受错误版本', () => {
  const root = mkdtempSync(join(tmpdir(), 'baseline-source-'));
  try {
    const pkg = JSON.stringify({ dependencies: { '@gancao-web/base-element-react': '3.1.0' } });
    writeFileSync(join(root, 'package.json'), pkg);
    assert.throws(() => prepareBaseline(root), /--component-package/);
    const manifest = join(root, 'component.json');
    for (const metadata of [
      { name: 'other-package', version: '3.1.0' },
      { name: '@gancao-web/base-element-react', version: '3.1.0-beta.1' },
      { name: '@gancao-web/base-element-react', version: '3.0.0' },
    ]) {
      writeFileSync(manifest, JSON.stringify(metadata));
      assert.throws(() => prepareBaseline(root, { componentManifest: manifest }), /组件元数据/);
    }
    assert.equal(readFileSync(join(root, 'package.json'), 'utf8'), pkg);
    assert.deepEqual(readdirSync(root).sort(), ['component.json', 'package.json']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('框架提取先校验双来源和固定提交，失败不猜源、不产生部分资源', () => {
  const root = mkdtempSync(join(tmpdir(), 'framework-source-'));
  try {
    assert.throws(() => prepareFramework(root), /--upstream/);
    assert.throws(() => prepareFramework(root, { upstreamRepository: root }), /缺少已审查提交/);
    assert.deepEqual(readdirSync(root), []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
