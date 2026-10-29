import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('菜单图形快照只包含本地可渲染的单色路径，覆盖通用图标与展开箭头', () => {
  const icons = JSON.parse(readFileSync(new URL('../skills/react-admin-ui-migration/assets/page-layout/menu-icons.json', import.meta.url), 'utf8'));
  for (const name of ['gc-wenjianzhongxin', 'gc-quanbuyingyong', 'gc-down', 'gc-shezhi', 'gc-cangchupeizhi']) assert(icons[name]);
  for (const [name, icon] of Object.entries(icons)) {
    assert(/^gc-[a-z0-9-]+$/.test(name));
    assert(/^0 0 \d+ \d+$/.test(icon.viewBox));
    assert(icon.paths.length > 0);
    for (const path of icon.paths) {
      assert(Object.keys(path).every((key) => ['d', 'fill'].includes(key)));
      assert(/^[Mm][\d\s,\.\-A-Za-z]+$/.test(path.d));
      assert(['currentColor', 'none'].includes(path.fill));
    }
  }
});
