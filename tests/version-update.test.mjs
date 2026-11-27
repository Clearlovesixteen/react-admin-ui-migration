import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { appVersionPlugin } from '../resources/version-update/plugins/appVersion.mjs';
import { compareVersions, isVersion, isAppVersion } from '../resources/version-update/src/common/appVersion.js';
import { watchAppVersion } from '../resources/version-update/src/components/VersionUpdate/check.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));
const manifest = (version = '1.2.0', minVersion = '1.0.0', env = 'test') => ({ env, version, minVersion });

function browser(fetch) {
  const document = new EventTarget();
  document.visibilityState = 'visible';
  const events = new EventTarget();
  const timers = new Map();
  const intervals = new Map();
  let sequence = 0;
  let requests = 0;
  const platform = {
    document, location: { href: 'https://example.test/admin/#/deep/page' },
    fetch: (...args) => { requests++; return fetch(...args); },
    setTimeout(callback, delay) { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    setInterval(callback, delay) { const id = ++sequence; intervals.set(id, { callback, delay }); return id; },
    clearInterval(id) { intervals.delete(id); },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  return { platform, timers, intervals, requests: () => requests,
    online: () => events.dispatchEvent(new Event('online')),
    visible: () => document.dispatchEvent(new Event('visibilitychange')) };
}

test('版本比较按数值；拒绝不安全数字、预发布与错误版本清单', () => {
  for (const value of ['1.2.3', '0.0.0', '20.10.9']) assert(isVersion(value));
  for (const value of ['', '1.2', '1.02.3', 'v1.2.3', '1.2.3-beta.1', '9007199254740992.0.0', null]) assert(!isVersion(value));
  assert(compareVersions('2.8.10', '2.8.9') > 0);
  assert(compareVersions('3.0.0', '2.99.99') > 0);
  assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
  assert(isAppVersion(manifest()));
  for (const value of [null, {}, manifest('1.0.0', '2.0.0'), manifest('1.2.0', '1.0.0', '')]) assert(!isAppVersion(value));
});

test('插件从解析后的工程根生成清单，开发模式不生成或要求发布号', () => {
  const root = mkdtempSync(join(tmpdir(), 'app-version-plugin-'));
  try {
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '1.2.0', minVersion: '1.1.0' }));
    const emitted = [];
    const plugin = appVersionPlugin('pre');
    plugin.configResolved({ root, command: 'build' });
    plugin.buildStart.call({ emitFile: (asset) => { emitted.push(asset); return 'manifestRef'; } });
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0].fileName, 'version.json');
    assert.deepEqual(JSON.parse(emitted[0].source), manifest('1.2.0', '1.1.0', 'pre'));
    assert.equal(plugin.load('unrelated'), undefined);
    assert(plugin.load(plugin.resolveId('virtual:app-version')).includes('import.meta.ROLLUP_FILE_URL_manifestRef'));
    const dev = appVersionPlugin('');
    dev.configResolved({ root: '/no-package-needed', command: 'serve' });
    dev.buildStart.call({ emitFile() { assert.fail('dev must not emit'); } });
    assert(dev.load(dev.resolveId('virtual:app-version')).includes('manifestUrl = null'));
    for (const [version, minVersion, env] of [['1.2', '1.0.0', 'test'], ['1.0.0', '2.0.0', 'test'], ['1.2.0', '1.0.0', '']]) {
      writeFileSync(join(root, 'package.json'), JSON.stringify({ version, minVersion }));
      const invalid = appVersionPlugin(env);
      invalid.configResolved({ root, command: 'build' });
      assert.throws(() => invalid.buildStart.call({ emitFile() { assert.fail('invalid must not emit'); } }), /版本配置无效/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('开发模式不请求；隐藏页面跳过，恢复可见或上线后检查并无缓存请求', async () => {
  const updates = [];
  const mock = browser(async (url, config) => {
    assert.equal(url.pathname, '/admin/version.json');
    assert(url.searchParams.has('_t'));
    assert.equal(config.cache, 'no-store');
    return { ok: true, json: async () => manifest() };
  });
  const options = { url: 'https://example.test/admin/version.json', currentVersion: '1.0.0', env: 'test', onUpdate: (data) => updates.push(data) };
  watchAppVersion({ ...options, enabled: false }, mock.platform)();
  assert.equal(mock.requests(), 0);
  assert.equal(mock.intervals.size, 0);
  mock.platform.document.visibilityState = 'hidden';
  const stop = watchAppVersion(options, mock.platform);
  assert.equal(mock.requests(), 0);
  mock.platform.document.visibilityState = 'visible';
  mock.visible();
  await flush();
  assert.equal(updates.length, 1);
  assert.equal([...mock.intervals.values()][0].delay, 60_000);
  assert.equal(mock.timers.size, 0);
  mock.online();
  await flush();
  assert.equal(mock.requests(), 2);
  stop();
  mock.visible(); mock.online();
  await flush();
  assert.equal(mock.requests(), 2);
  assert.equal(mock.intervals.size, 0);
});

test('错误环境、降级、无效响应和断网不会覆盖已知新版本，随后仍可重试', async () => {
  const responses = [manifest('1.3.0'), manifest('1.2.0'), manifest('2.0.0', '1.0.0', 'production'), manifest('1.0.0'), {}, new Error('offline'), manifest('1.4.0', '1.4.0')];
  const updates = [];
  const mock = browser(async () => {
    const value = responses.shift();
    if (value instanceof Error) throw value;
    return { ok: true, json: async () => value };
  });
  const stop = watchAppVersion({ url: '/version.json', currentVersion: '1.0.0', env: 'test', onUpdate: (value) => updates.push(value) }, mock.platform);
  await flush();
  while (responses.length) { mock.online(); await flush(); }
  assert.deepEqual(updates.map((value) => value.version), ['1.3.0', '1.4.0']);
  assert(compareVersions('1.0.0', updates.at(-1).minVersion) < 0);
  stop();
});

test('请求去重、10秒超时与卸载中止；卸载后的响应不触发更新', async () => {
  let finish;
  let signal;
  const updates = [];
  const mock = browser((_url, config) => {
    signal = config.signal;
    return new Promise((resolve) => { finish = resolve; });
  });
  const stop = watchAppVersion({ url: '/version.json', currentVersion: '1.0.0', env: 'test', onUpdate: (value) => updates.push(value) }, mock.platform);
  mock.online(); mock.visible();
  assert.equal(mock.requests(), 1);
  const timeout = [...mock.timers.values()][0];
  assert.equal(timeout.delay, 10_000);
  timeout.callback();
  assert(signal.aborted);
  stop();
  finish({ ok: true, json: async () => manifest() });
  await flush();
  assert.equal(updates.length, 0);
  assert.equal(mock.timers.size, 0);
  assert.equal(mock.intervals.size, 0);
});

test('快照中的版本检查与维护源一致，不依赖未打包的运行时文件', () => {
  for (const path of ['src/common/appVersion.js', 'src/components/VersionUpdate/check.js', 'plugins/appVersion.mjs']) {
    assert.equal(readFileSync(new URL('../resources/version-update/' + path, import.meta.url), 'utf8'), readFileSync(new URL('../skills/react-admin-ui-migration/assets/framework/' + path, import.meta.url), 'utf8'));
  }
});
