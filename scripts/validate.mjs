import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function walk(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    if (['.git', 'node_modules', 'dist'].includes(entry.name)) return [];
    const path = join(root, entry.name);
    assert(!lstatSync(path).isSymbolicLink(), '分发目录不允许符号链接：' + path);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isInside(root, path) {
  return path === root || path.startsWith(root + sep);
}

function checkLocalImport(file, specifier, boundary) {
  const candidate = resolve(dirname(file), specifier);
  assert(isInside(boundary, candidate), '模板导入不能越出模板目录：' + specifier);
  assert(
    ['', '.ts', '.tsx', '.less', '/index.ts', '/index.tsx'].some((suffix) => existsSync(candidate + suffix)),
    '模板缺少依赖：' + file + ' -> ' + specifier,
  );
}

export function validateRepository(root = defaultRoot) {
  root = resolve(root);
  const pkg = readJson(join(root, 'package.json'));
  const plugin = readJson(join(root, 'plugin.json'));
  assert.equal(pkg.version, plugin.version, 'npm 包和插件版本必须一致');
  assert(/^\d+\.\d+\.\d+$/.test(pkg.version), '当前版本工具只支持稳定版本');
  assert.equal(plugin.name, 'react-admin-ui-migration');
  assert.equal(plugin.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  for (const hook of ['preinstall', 'install', 'postinstall']) {
    assert(!pkg.scripts?.[hook], '不能依赖安装钩子加载 skill');
  }
  assert(!plugin.mcpServers && !plugin.extensions?.['com.openai']?.hooks, '本包不需要 MCP 或运行钩子');

  const marketplacePath = join(root, '.agents/plugins/marketplace.json');
  if (existsSync(marketplacePath)) {
    const marketplace = readJson(marketplacePath);
    const entry = marketplace.plugins.find((item) => item.name === plugin.name);
    assert(entry, '团队目录缺少插件');
    assert.equal(entry.source.source, 'local');
    assert.equal(entry.source.path, './');
    assert(existsSync(resolve(root, entry.source.path, 'plugin.json')), 'GitHub 插件源应能直接找到完整插件');
  }
  assert.equal(pkg.private, true, '当前通过 GitHub 分发，不向 npm registry 发布');

  const skillRoot = join(root, 'skills/react-admin-ui-migration');
  const entrypoint = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8');
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(entrypoint)?.[1];
  assert(frontmatter, 'SKILL.md 缺少 frontmatter');
  assert(/^name: react-admin-ui-migration$/m.test(frontmatter));
  const description = /^description: (.+)$/m.exec(frontmatter)?.[1];
  assert(description && description.length <= 1024 && !/[<>]/.test(description));
  assert(!/^\[TODO:/m.test(entrypoint), 'skill 不能保留未完成占位段');

  const files = walk(root);
  const assetsRoot = join(skillRoot, 'assets/page-layout');
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (file.endsWith('.mjs')) {
      const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    }
    if (file.endsWith('.md') && isInside(skillRoot, file)) {
      for (const [, link] of source.matchAll(/\[[^\]]*]\(([^)]+)\)/g)) {
        if (/^(?:https?:|#)/.test(link)) continue;
        const target = resolve(dirname(file), decodeURIComponent(link.split('#')[0]));
        assert(isInside(skillRoot, target), 'skill 引用必须随包分发：' + link);
        assert(existsSync(target), 'skill 引用缺失：' + file + ' -> ' + link);
      }
    }
    if (isInside(assetsRoot, file) && ['.ts', '.tsx'].includes(extname(file))) {
      for (const [, specifier] of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
        if (specifier.startsWith('.')) checkLocalImport(file, specifier, assetsRoot);
        else assert(['react', 'antd', '@ant-design/icons'].includes(specifier), '展示模板出现业务或未声明依赖：' + specifier);
      }
    }
    if (isInside(assetsRoot, file) && file.endsWith('.less')) {
      for (const [, specifier] of source.matchAll(/@import\s+['"]([^'"]+)['"]/g)) {
        assert.equal(specifier, 'antd/es/style/themes/default.less');
      }
    }
  }

  const baseline = readJson(join(skillRoot, 'assets/baseline.json'));
  assert.equal(baseline.componentPackage, '@gancao-web/base-element-react');
  for (const artifact of baseline.artifacts) {
    const path = resolve(skillRoot, artifact.path);
    assert(isInside(assetsRoot, path), '基线产物必须属于展示模板');
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), artifact.sha256, '模板变化后需同步基线：' + artifact.path);
  }
  assert.equal(files.filter((file) => isInside(assetsRoot, file)).length, baseline.artifacts.length);
  return { files: files.length, templates: baseline.artifacts.length, componentVersion: baseline.componentVersion };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log('检查通过：' + JSON.stringify(validateRepository()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
