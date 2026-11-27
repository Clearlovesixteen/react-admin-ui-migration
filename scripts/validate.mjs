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
    ['', '.ts', '.tsx', '.js', '.mjs', '.less', '.json', '/index.ts', '/index.tsx'].some((suffix) => existsSync(candidate + suffix)),
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
  const themeRoot = join(skillRoot, 'assets/theme');
  const frameworkRoot = join(skillRoot, 'assets/framework');
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (/\.m?js$/.test(file)) {
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
        if (specifier.startsWith('.')) checkLocalImport(file, specifier, assetsRoot);
        else assert.equal(specifier, 'antd/es/style/themes/default.less');
      }
    }
  }

  const baseline = readJson(join(skillRoot, 'assets/baseline.json'));
  assert.equal(baseline.componentPackage, '@gancao-web/base-element-react');
  for (const artifact of baseline.artifacts) {
    const path = resolve(skillRoot, artifact.path);
    assert(isInside(assetsRoot, path) || isInside(themeRoot, path), '基线产物必须属于展示模板或主题变量');
    assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), artifact.sha256, '模板变化后需同步基线：' + artifact.path);
  }
  const templateCount = files.filter((file) => isInside(assetsRoot, file)).length;
  const themeCount = files.filter((file) => isInside(themeRoot, file)).length;
  assert.equal(templateCount + themeCount, baseline.artifacts.length);
  const manifest = readJson(join(skillRoot, 'assets/framework-manifest.json'));
  const frameworkPackage = readJson(join(frameworkRoot, 'package.json'));
  for (const [name, version] of Object.entries(manifest.dependencyBaseline)) {
    assert.equal(frameworkPackage.dependencies[name], version, '框架依赖必须匹配已审查组合：' + name);
  }
  assert.equal(frameworkPackage.dependencies[baseline.componentPackage], baseline.componentVersion, '展示与框架的组件基线必须一致');
  assert.equal(manifest.versionUpdate.upstream.commit, manifest.upstream.commit, '版本提示来源与上游审查点不一致');
  const external = new Set([
    'react', 'react-dom/client', 'react/jsx-runtime', 'antd/es/locale/zh_CN', 'uno.css',
    'node:url', 'node:fs', 'node:path', 'node:crypto', 'vite', 'unocss/vite',
    ...Object.keys(frameworkPackage.dependencies), ...Object.keys(frameworkPackage.devDependencies),
  ]);
  // 唯一的虚拟模块由随包插件实现，不允许任意未声明依赖绕过闭包检查。
  const versionPlugin = readFileSync(join(frameworkRoot, 'plugins/appVersion.mjs'), 'utf8');
  assert(versionPlugin.includes("'virtual:app-version'"), '缺少版本虚拟模块实现');
  assert(readFileSync(join(frameworkRoot, 'vite.config.ts'), 'utf8').includes('appVersionPlugin(env.VITE_APP_ENV)'), '版本插件未接入真实构建');
  assert(readFileSync(join(frameworkRoot, 'src/components/PageLayout/index.tsx'), 'utf8').includes('<VersionUpdate key="version" />'), '版本提示未挂载到项目 Layout');
  assert(/^\d+\.\d+\.\d+$/.test(frameworkPackage.version) && /^\d+\.\d+\.\d+$/.test(frameworkPackage.minVersion), '缺少应用版本绑定字段');
  external.add('virtual:app-version');
  for (const artifact of manifest.artifacts) {
    const path = resolve(frameworkRoot, artifact.path);
    assert(isInside(frameworkRoot, path), '框架资源路径越界');
    const source = readFileSync(path, 'utf8');
    assert.equal(createHash('sha256').update(source).digest('hex'), artifact.sha256, '框架资源变化后需重新同步：' + artifact.path);
    assert(!source.includes('/Users/') && !source.includes('10013'), '框架不能依赖维护者路径或试点应用标识');
    if (['.ts','.tsx','.mjs','.cjs'].includes(extname(path))) {
      for (const [, specifier] of source.matchAll(/\b(?:from\s+|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g)) {
        if (specifier.startsWith('.')) checkLocalImport(path, specifier, frameworkRoot);
        else if (specifier.startsWith('@/')) checkLocalImport(join(frameworkRoot, 'src/__entry.ts'), './' + specifier.slice(2), frameworkRoot);
        else assert(external.has(specifier), '框架出现未声明依赖：' + specifier);
      }
    }
  }
  assert.equal(files.filter((file) => isInside(frameworkRoot, file)).length, manifest.artifacts.length);
  const example = readFileSync(join(frameworkRoot, '.env.example'), 'utf8');
  assert(!/https?:\/\/|(?:token|secret|password)=\S+/i.test(example), '框架环境示例不能包含真实环境值或凭据');
  return { files: files.length, templates: templateCount, themes: themeCount, framework: manifest.artifacts.length, componentVersion: baseline.componentVersion };
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log('检查通过：' + JSON.stringify(validateRepository()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
