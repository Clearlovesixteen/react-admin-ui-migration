import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
if (!['patch', 'minor', 'major'].includes(mode) || process.argv.length !== 3) {
  throw new Error('用法：node scripts/version.mjs patch|minor|major');
}
const packagePath = join(root, 'package.json');
const pluginPath = join(root, 'plugin.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
const plugin = JSON.parse(readFileSync(pluginPath, 'utf8'));
if (pkg.version !== plugin.version || !/^\d+\.\d+\.\d+$/.test(pkg.version)) {
  throw new Error('请先核对 package.json 与 plugin.json 的稳定版本');
}
const parts = pkg.version.split('.').map(Number);
const index = ['major', 'minor', 'patch'].indexOf(mode);
parts[index] += 1;
for (let next = index + 1; next < parts.length; next += 1) parts[next] = 0;
const version = parts.join('.');
pkg.version = version;
plugin.version = version;
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
writeFileSync(pluginPath, JSON.stringify(plugin, null, 2) + '\n');
console.log('包与插件版本已同步为 ' + version + '；未提交、打标签或发布。');
