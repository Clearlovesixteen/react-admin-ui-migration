import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateRepository } from '../scripts/validate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('完整资源闭包、版本与展示模板依赖可独立校验', () => {
  assert.equal(validateRepository(root).templates, 19);
  assert.equal(validateRepository(root).themes, 1);
});

test('npm 实际打包后能离线解包并在消费者目录运行扫描器', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'ui-migration-package-'));
  try {
    const packed = spawnSync('npm', [
      // 外层 npm pack --dry-run 会通过环境继承 dry-run；此处仍须实际生成隔离 tgz 才能验证解包。
      'pack', '--dry-run=false', '--json', '--ignore-scripts', '--offline',
      '--cache', join(temporary, 'npm-cache'), '--pack-destination', temporary,
    ], { cwd: root, encoding: 'utf8', timeout: 30000 });
    assert.equal(packed.status, 0, packed.stderr);
    const [metadata] = JSON.parse(packed.stdout);
    const names = metadata.files.map((file) => file.path);
    assert(names.includes('plugin.json'));
    assert(names.includes('skills/react-admin-ui-migration/SKILL.md'));
    assert(names.includes('skills/react-admin-ui-migration/references/page-layout.md'));
    assert(names.includes('skills/react-admin-ui-migration/references/version-upgrade.md'));
    assert(names.includes('skills/react-admin-ui-migration/references/styles-and-runtime.md'));
    assert(names.includes('skills/react-admin-ui-migration/assets/theme/antd4.ts'));
    assert(names.includes('skills/react-admin-ui-migration/assets/page-layout/theme/preference.js'));
    assert(names.includes('skills/react-admin-ui-migration/assets/framework/src/components/PageLayout/theme/ThemeToggle.tsx'));
    assert(names.includes('skills/react-admin-ui-migration/assets/page-layout/components/MenuIcon.tsx'));
    assert(names.includes('skills/react-admin-ui-migration/assets/page-layout/menu-icons.json'));
    assert(names.includes('skills/react-admin-ui-migration/assets/page-layout/menu-visual.less'));
    assert(names.includes('skills/react-admin-ui-migration/assets/page-layout/components/ApplicationPanel.tsx'));
    assert(names.includes('skills/react-admin-ui-migration/assets/page-layout/utils/applications.ts'));
    assert(names.includes('skills/react-admin-ui-migration/assets/page-layout/application-panel.less'));
    assert(names.includes('skills/react-admin-ui-migration/scripts/inspect-ui-styles.js'));
    assert(names.includes('skills/react-admin-ui-migration/assets/baseline.json'));
    assert(names.includes('skills/react-admin-ui-migration/scripts/scan-candidates.mjs'));
    assert(names.includes('skills/react-admin-ui-migration/scripts/prepare-framework.mjs'));
    assert(names.includes('skills/react-admin-ui-migration/assets/framework-manifest.json'));
    assert(names.includes('skills/react-admin-ui-migration/assets/framework/.npmrc.example'));
    assert(names.includes('skills/react-admin-ui-migration/assets/framework/src/common/request.ts'));
    assert(names.includes('skills/react-admin-ui-migration/assets/framework/src/pages/base/login/index.tsx'));
    for (const path of ['plugins/appVersion.mjs', 'plugins/appVersion.d.mts', 'src/common/appVersion.js', 'src/common/appVersion.d.ts', 'src/version-update.d.ts', 'src/components/VersionUpdate/index.tsx', 'src/components/VersionUpdate/check.js', 'src/components/VersionUpdate/check.d.ts', 'src/styles/windows-scrollbar.less']) {
      assert(names.includes('skills/react-admin-ui-migration/assets/framework/' + path), '离线包缺少版本/样式资源：' + path);
    }
    assert(!names.some((name) => /^(?:tests|scripts|node_modules|\.git|\.agents)\//.test(name)));
    assert(!names.some((name) => name.endsWith('.env') || name.endsWith('.npmrc')));

    const unpacked = join(temporary, 'unpacked');
    mkdirSync(unpacked);
    const unpack = spawnSync('tar', ['-xzf', join(temporary, metadata.filename), '-C', unpacked], { encoding: 'utf8' });
    assert.equal(unpack.status, 0, unpack.stderr);
    assert.equal(validateRepository(join(unpacked, 'package')).templates, 19);

    const consumer = join(temporary, 'consumer');
    mkdirSync(join(consumer, 'src'), { recursive: true });
    writeFileSync(join(consumer, 'package.json'), JSON.stringify({ dependencies: { 'base-element-react': '2.5.95-alpha.7' } }));
    writeFileSync(join(consumer, 'src/index.tsx'), "import { BasePage } from 'base-element-react';\nexport const screen = <BasePage page={oldPage} />;\n");
    const scan = spawnSync(process.execPath, [
      join(unpacked, 'package/skills/react-admin-ui-migration/scripts/scan-candidates.mjs'), consumer, '--json',
    ], { cwd: consumer, encoding: 'utf8', timeout: 10000 });
    assert.equal(scan.status, 0, scan.stderr);
    const report = JSON.parse(scan.stdout);
    assert.equal(report.summary['component-imports'], 1);
    assert.equal(report.summary['legacy-page'], 1);
    assert.equal(report.project, consumer);
    const prepared = join(temporary, 'prepared');
    const generate = spawnSync(process.execPath, [
      join(unpacked, 'package/skills/react-admin-ui-migration/scripts/prepare-framework.mjs'), '--output', prepared,
    ], { cwd: consumer, encoding: 'utf8', timeout: 10000 });
    assert.equal(generate.status, 0, generate.stderr);
    assert.equal(JSON.parse(generate.stdout).output, prepared);
    const preference = spawnSync(process.execPath, ['--input-type=module', '-e', `import { readPageLayoutTheme, savePageLayoutTheme } from './src/components/PageLayout/theme/preference.js'; const data = new Map(); const storage = {getItem: k => data.get(k), setItem: (k,v) => data.set(k,v)}; if(readPageLayoutTheme('test',storage)!=='light') process.exit(1); savePageLayoutTheme('test','dark',storage); if(readPageLayoutTheme('test',storage)!=='dark') process.exit(1);`], { cwd: prepared, encoding: 'utf8' });
    assert.equal(preference.status, 0, preference.stderr);
    assert.equal(readFileSync(join(prepared, '.npmrc'), 'utf8'), '@gancao-web:registry=https://web-registry.igancao.com/\n');
    assert(readFileSync(join(prepared, 'src/components/PageLayout/index.tsx'), 'utf8').includes('Outlet'));
    const frameworkPackage = JSON.parse(readFileSync(join(prepared, 'package.json'), 'utf8'));
    assert.equal(frameworkPackage.dependencies['@gancao-web/base-element-react'], '3.1.0');
    assert.equal(frameworkPackage.dependencies['@gancao-web/request'], '3.2.4');
    assert.equal(frameworkPackage.dependencies['@base-web-kits/base-tools-ts'], '2.1.5');
    assert.equal(frameworkPackage.dependencies['@base-web-kits/base-tools-web'], '2.1.5');
    assert.equal(frameworkPackage.version, '1.0.0');
    assert.equal(frameworkPackage.minVersion, '1.0.0');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('版本工具同时提升 npm 与插件版本，不需要发布或改动原仓库', () => {
  const temporary = mkdtempSync(join(tmpdir(), 'ui-migration-version-'));
  try {
    mkdirSync(join(temporary, 'scripts'));
    writeFileSync(join(temporary, 'scripts/version.mjs'), readFileSync(join(root, 'scripts/version.mjs')));
    for (const file of ['package.json', 'plugin.json']) {
      writeFileSync(join(temporary, file), JSON.stringify({ version: '0.1.9' }));
    }
    const result = spawnSync(process.execPath, [join(temporary, 'scripts/version.mjs'), 'minor'], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    for (const file of ['package.json', 'plugin.json']) {
      assert.equal(JSON.parse(readFileSync(join(temporary, file), 'utf8')).version, '0.2.0');
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
