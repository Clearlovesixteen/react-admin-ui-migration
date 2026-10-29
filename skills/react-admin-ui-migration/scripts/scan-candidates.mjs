import { realpathSync } from 'node:fs';
import { lstat, readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ignoredDirectories = new Set([
  '.git', '.agents', '.codex', '.claude', 'node_modules', 'dist', 'build',
  'coverage', '__tests__', '__type_tests__', 'base-element-react',
]);
const sourceExtensions = /\.(?:[cm]?[jt]sx?|less|css)$/i;
const rules = [
  ['component-imports', /(?:from\s*|import\s*)['"](?:base-element-react(?:\/[^'"]*)?|@\/base-element-react(?:\/[^'"]*)?|(?:\.\.?\/)+(?:[^'"]*\/)?base-element-react(?:\/[^'"]*)?)['"]/, '检查旧包、本地组件或深层导入，确认新包的等价导出'],
  ['initialization', /\bBaseElement\.use\s*\(/, '核对全局配置、请求上传和组件默认值'],
  ['page-layout', /\b(?:PageLayout|PageLayoutShell|NewMenu|MenuSearch)\b/, '核对项目级外壳、菜单和 Header 接入'],
  ['application-panel', /\b(?:ApplicationPanel|PageLayoutApplicationPanel|applicationPanel|getApplicationList|requestPageLayoutApplications)\b/, '我的应用是新版迁移必接项；核对用户中心真实列表、搜索、跳转和异常反馈，候选命中不代表已验收'],
  ['route-cache', /\b(?:useAliveController|KeepAlive|refreshScope|dropScope|useRouteHistory)\b/, '核对路由历史、参数恢复和缓存生命周期'],
  ['content-tabs', /<(?:Tabs|BaseTabs)\b/, '核对页签数据结构、受控值和内容生命周期'],
  ['list-pages', /<(?:BasePage|BaseList)\b|\bBasePageConfig\b/, '检查列表页面、工具插槽与汇总数据链'],
  ['list-summary', /\b(?:paginationLeftRender|paginationExtraRender)\s*[:=]/, '确认当前版本的分页汇总 hook 和响应参数'],
  ['form-layout', /\b(?:listForm|itemCol|labelWidth|paddingX|scrollHeight|fitViewport|layoutMode)\s*[:=]/, '核对布局配置，不能仅凭命中就删除旧设置'],
  ['style-loading', /(?:@import|import)\s*['"]~?antd\/(?:dist\/|(?:es|lib)\/.*style)/, '核对完整样式、主题变量或按需样式是否实际覆盖组件包间接使用的控件和浮层'],
  ['legacy-color-classes', /className\s*=\s*(?:\{[^}]*\.color\b|['"](?:red|green|gray|blue|yellow)['"])/, '核对旧组件作用域中的颜色类；新版需要 BaseText 等对应的样式载体，不能只保留裸 className'],
  ['select-input', /\bcomp\s*:\s*['"]select-input['"]/, '核对组合字段的默认值、联动和请求参数映射'],
  ['legacy-page', /\b(?:PageListConfig|PageModalConfig|pageModal|filterRow|filterParam)\b|<BasePage\b[^>]*\bpage\s*=/, '检查更早的页面配置和过滤钩子是否兼容'],
];
const inspectedPackages = [
  'react', 'antd', '@ant-design/icons', 'base-element-react',
  '@gancao-web/base-element-react',
];

async function exists(path) {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

/** 只读取受支持的源码；候选不能代替 API 核实或完整行为审查。 */
export async function scanProject(projectPath) {
  const project = resolve(projectPath);
  const packagePath = join(project, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  } catch (error) {
    throw new Error('无法读取目标 package.json：' + packagePath, { cause: error });
  }

  const diagnostics = [];
  const findings = [];
  const sourceRoots = [];
  const styleEntries = [];
  let inspectedFiles = 0;
  const relativePath = (path) => relative(project, path).replaceAll('\\', '/');

  async function walk(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      diagnostics.push({ level: 'warning', file: relativePath(directory), message: '目录未能读取', code: error.code });
      return;
    }

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name);
      if (ignoredDirectories.has(entry.name) || entry.name.startsWith('.')) continue;
      if (entry.isSymbolicLink()) {
        diagnostics.push({ level: 'warning', file: relativePath(path), message: '未跟随源码符号链接，请单独核对' });
      } else if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile() && sourceExtensions.test(entry.name)) {
        try {
          if ((await stat(path)).size > 2 * 1024 * 1024) {
            diagnostics.push({ level: 'warning', file: relativePath(path), message: '源码超过 2 MiB，未扫描' });
            continue;
          }
          const source = await readFile(path, 'utf8');
          for (const match of source.matchAll(/(?:@import\s*(?:\([^)]*\)\)\s*)?|import\s*)['"](~?antd\/[^'"]+)['"]/g)) {
            const specifier = match[1].replace(/^~/, '');
            const kind = /^antd\/dist\/antd(?:\.min)?\.(?:less|css)$/.test(specifier)
              ? 'full'
              : /\/style\/themes\//.test(specifier) ? 'variables-only' : 'component';
            styleEntries.push({ file: relativePath(path), line: source.slice(0, match.index).split('\n').length, specifier, kind });
          }
          inspectedFiles += 1;
          const lines = source.split(/\r?\n/);
          for (const [unit, pattern, reason] of rules) {
            const lineIndex = lines.findIndex((line) => pattern.test(line));
            if (lineIndex !== -1) {
              // 每文件/单元只列首次命中，返回文件和行号；不打印业务源码或环境内容。
              findings.push({ unit, file: relativePath(path), line: lineIndex + 1, reason });
            }
          }
        } catch (error) {
          diagnostics.push({ level: 'warning', file: relativePath(path), message: '源码未能读取', code: error.code });
        }
      }
    }
  }

  for (const name of ['src', 'app', 'pages']) {
    const directory = join(project, name);
    if (await exists(directory)) {
      sourceRoots.push(name);
      if ((await lstat(directory)).isSymbolicLink()) {
        diagnostics.push({ level: 'warning', file: name, message: '未跟随源码根目录符号链接，请单独核对' });
      } else {
        await walk(directory);
      }
    }
  }
  if (!sourceRoots.length || !inspectedFiles) {
    diagnostics.push({ level: 'warning', message: '未找到可扫描源码；请核对 monorepo 或自定义源码目录' });
  }

  const declared = { ...pkg.devDependencies, ...pkg.dependencies };
  const components = {};
  for (const name of inspectedPackages) {
    if (declared[name] !== undefined) components[name] = declared[name];
  }
  const installedPath = join(project, 'node_modules', '@gancao-web', 'base-element-react', 'package.json');
  let installedComponent;
  try {
    const installed = JSON.parse(await readFile(installedPath, 'utf8'));
    installedComponent = { name: installed.name, version: installed.version };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      diagnostics.push({ level: 'warning', file: relativePath(installedPath), message: '已安装组件元数据未能读取' });
    } else {
      diagnostics.push({ level: 'info', message: '未发现已安装的新组件包；声明版本不代表真实 API 已确认' });
    }
  }

  const lockFiles = [];
  for (const name of ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock']) {
    try {
      if ((await lstat(join(project, name))).isFile()) lockFiles.push(name);
    } catch (error) {
      if (error.code !== 'ENOENT') diagnostics.push({ level: 'warning', file: name, message: '锁文件状态未能读取', code: error.code });
    }
  }
  const hasPnpmLayout = await exists(join(project, 'node_modules', '.pnpm'));
  const npmLock = lockFiles.includes('package-lock.json') || lockFiles.includes('npm-shrinkwrap.json');
  if (lockFiles.length > 1 && !(lockFiles.length === 2 && npmLock && lockFiles.every((name) => name === 'package-lock.json' || name === 'npm-shrinkwrap.json'))) {
    diagnostics.push({ level: 'warning', message: '发现不同包管理器的锁文件；结合 README、CI 和安装布局确认包管理器，不自动删除用户文件或切换安装方式' });
  }
  if (hasPnpmLayout && (pkg.packageManager?.startsWith('npm@') || (npmLock && !lockFiles.includes('pnpm-lock.yaml')))) {
    diagnostics.push({ level: 'warning', message: 'npm 元数据与 pnpm 安装布局冲突；先核对模块解析和原锁文件，再启动页面' });
  }
  const usesComponentPackage = !!(installedComponent || declared['@gancao-web/base-element-react']);
  const needsStyleVerification = usesComponentPackage && !styleEntries.some((item) => item.kind === 'full');
  if (needsStyleVerification) {
    diagnostics.push({ level: 'warning', message: '未发现完整 Ant Design 样式入口；变量导入不生成控件 CSS，按需方案必须用实际构建和浏览器证明包内 Table/Cascader 等及 portal 浮层样式已生效' });
  }

  return {
    schemaVersion: 1,
    project,
    packageManager: pkg.packageManager ?? null,
    nodeEngines: pkg.engines?.node ?? null,
    lockFiles,
    installationLayout: hasPnpmLayout ? 'pnpm' : 'unconfirmed',
    declaredComponents: components,
    installedComponent: installedComponent ?? null,
    localComponentSource: await exists(join(project, 'src', 'base-element-react')),
    sourceRoots,
    ignoredDirectories: [...ignoredDirectories],
    inspectedFiles,
    styleEntries,
    styleVerification: !usesComponentPackage ? 'not-applicable' : needsStyleVerification ? 'needs-runtime-check' : 'entry-found-runtime-unverified',
    complete: !diagnostics.some((item) => item.level === 'warning'),
    summary: Object.fromEntries(rules.map(([unit]) => [unit, findings.filter((item) => item.unit === unit).length])),
    findings,
    diagnostics,
  };
}

async function main(args) {
  if (args.includes('--help') || !args.length) {
    console.log('用法：node scan-candidates.mjs <目标项目> [--json]\n只读扫描 src/app/pages；不执行项目代码，不修改文件。');
    process.exitCode = args.length ? 0 : 1;
    return;
  }
  if (args.filter((arg) => arg !== '--json').length !== 1 || args[0].startsWith('--')) {
    throw new Error('只接受一个目标项目路径及可选 --json；使用 --help 查看用法');
  }
  const result = await scanProject(args[0]);
  if (args.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('扫描文件：' + result.inspectedFiles + '；候选：' + result.findings.length);
    for (const item of result.findings) console.log(item.file + ':' + item.line + ' [' + item.unit + '] ' + item.reason);
    for (const item of result.diagnostics) console.log('[' + item.level + '] ' + (item.file ?? '') + ' ' + item.message);
  }
}

// npm、pnpm 和系统临时目录都可能通过符号链接进入，比较实际路径才能识别 CLI 入口。
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
