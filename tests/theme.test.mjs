import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readPageLayoutTheme, savePageLayoutTheme } from '../skills/react-admin-ui-migration/assets/page-layout/theme/preference.js';
import { scanProject } from '../skills/react-admin-ui-migration/scripts/scan-candidates.mjs';

const fixture = () => {
  const values = new Map();
  let writes = 0;
  return { values, storage: { getItem: key => values.get(key) ?? null, setItem: (key,value) => { writes++; values.set(key,value); } }, writes: () => writes };
};

test('首次及非法值默认亮色，读取不写入，手动选择后重新读取恢复', () => {
  const { storage, values, writes } = fixture();
  assert.equal(readPageLayoutTheme('app-a', storage), 'light');
  values.set('app-a', 'system');
  assert.equal(readPageLayoutTheme('app-a', storage), 'light');
  assert.equal(writes(), 0);
  assert.equal(savePageLayoutTheme('app-a', 'dark', storage), true);
  assert.equal(readPageLayoutTheme('app-a', storage), 'dark');
  assert.equal(readPageLayoutTheme('app-b', storage), 'light');
  assert.equal(savePageLayoutTheme('app-a', 'light', storage), true);
  assert.equal(readPageLayoutTheme('app-a', storage), 'light');
  assert.equal(writes(), 2);
  assert.deepEqual([...values.keys()], ['app-a']);
});

test('保留 MES 已存 raw/JSON 明暗偏好，不主动迁写身份或其他配置', () => {
  const { storage, values, writes } = fixture();
  values.set('user', 'keep-user');
  for (const [saved, expected] of [['dark','dark'], ['"dark"','dark'], ['light','light'], ['"light"','light']]) {
    values.set('mes-layout-theme', saved);
    assert.equal(readPageLayoutTheme('mes-layout-theme', storage), expected);
    assert.equal(values.get('mes-layout-theme'), saved);
  }
  assert.equal(values.get('user'), 'keep-user');
  assert.equal(writes(), 0);
});

test('受限存储和无效写入不会抛错或保存任意主题', () => {
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  for (const storage of [null, denied]) {
    assert.equal(readPageLayoutTheme('app', storage), 'light');
    assert.equal(savePageLayoutTheme('app', 'dark', storage), false);
  }
  const { storage, writes } = fixture();
  assert.equal(savePageLayoutTheme('app', 'invalid', storage), false);
  assert.equal(writes(), 0);
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw Error('blocked'); } });
  try {
    assert.equal(readPageLayoutTheme('app'), 'light');
    assert.equal(savePageLayoutTheme('app', 'dark'), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else delete globalThis.localStorage;
  }
});

test('盘点识别旧 MES 与新偏好入口，只作为待验证线索', async () => {
  const root = mkdtempSync(join(tmpdir(), 'theme-scan-'));
  try {
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'package.json'), '{}');
    writeFileSync(join(root, 'src/theme.ts'), 'useMesTheme();');
    let result = await scanProject(root);
    assert.equal(result.summary['theme-preference'], 1);
    assert.equal(result.architecture.units.find(x => x.unit === 'theme-preference').status, 'evidence-found-unverified');
    writeFileSync(join(root, 'src/theme.ts'), 'usePageLayoutTheme(appId);');
    result = await scanProject(root);
    assert.equal(result.summary['theme-preference'], 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
