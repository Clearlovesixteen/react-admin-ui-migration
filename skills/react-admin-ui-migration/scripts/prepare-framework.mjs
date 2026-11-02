import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const framework = join(skill, 'assets/framework');
const manifest = JSON.parse(readFileSync(join(skill, 'assets/framework-manifest.json'), 'utf8'));

/** 默认只列清单；仅向显式给出的新空目录准备资源，不覆盖消费者项目、不安装或执行代码。 */
export function prepareFramework(output) {
  const files = manifest.artifacts.map((item) => {
    const source = resolve(framework, item.path);
    assert(source.startsWith(framework + sep), '资源路径越界');
    assert(!lstatSync(source).isSymbolicLink(), '资源不能为符号链接');
    const data = readFileSync(source);
    assert.equal(createHash('sha256').update(data).digest('hex'), item.sha256, '资源指纹失效：' + item.path);
    return { path: item.path, data };
  });
  if (output) {
    const destination = resolve(output);
    if (existsSync(destination)) {
      assert(!lstatSync(destination).isSymbolicLink(), '输出不能为符号链接');
      assert(lstatSync(destination).isDirectory() && readdirSync(destination).length === 0, '输出必须是空目录，不能覆盖现有项目');
    }
    assert(!destination.startsWith(skill + sep) && destination !== skill, '不能写入已安装 skill');
    mkdirSync(destination, { recursive: true });
    for (const file of files) {
      const target = join(destination, file.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, file.data, { flag: 'wx' });
    }
  }
  return { files: files.map((file) => file.path), bindingKeys: manifest.bindingKeys, output: output ? resolve(output) : null };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    assert(!args.length || (args.length === 2 && args[0] === '--output'), '用法：node prepare-framework.mjs [--output <新空目录>]');
    console.log(JSON.stringify(prepareFramework(args[1]), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
