# 组件版本查询与升级

执行 UI 迁移时，完成“当前版本核对 → 目标 registry 查询 → 兼容稳定版选择 → 必要升级与锁文件更新 → 安装结果核实”，再配置新 UI。已使用 3.x 的项目也要查询，不能直接把本地版本或 skill 基线称为最新发布版本。

用户要求实际迁移且未禁止依赖变更时，将本次必要的兼容组件升级作为迁移工作执行，不为同一范围重复确认。只读评估、用户指定版本或禁止依赖变更时遵守其限制；仍可完成版本查询并说明差异。版本查询、安装由执行迁移的 Agent 使用目标项目工具完成；候选扫描器保持只读，不联网或安装依赖。

## 1. 确认当前实际版本和执行位置

- 读取目标 AGENTS.md、packageManager、锁文件、Node 版本和工作区配置，确认应用所在 package 与安装命令的工作目录。保留原包管理器和依赖所属的 dependencies/devDependencies 等位置。
- 对照 README/CI 与 node_modules 安装布局；多份锁文件不代表允许切换包管理器，pnpm 严格布局也不等于 npm 原有扁平依赖。模块无法解析时先恢复已确认的安装方式，保留用户文件，不用换框架/批量升级掩盖问题。
- 分别记录 package.json 声明范围、锁文件解析版本、node_modules 实际版本，并追踪业务 import/路径别名。扫描器会报告声明值和已安装新包元数据，不能代替锁文件及别名检查。
- 存在本地组件、workspace/file/link/git 依赖或 npm 别名时，确认真正加载的实现和独有扩展。安装一个没有被页面引用的新包不能算完成升级；迁到包入口前先核对扩展的等价能力。
- package.json 的 ^3.0.0、skill 的 3.0.0 基线和维护仓库源码版本均不能证明当前实际安装版本或 registry 已发布版本。

## 2. 查询目标项目正在使用的 registry

在正确的目标 package/工作区上下文中，通过包管理器的配置解析确认 @gancao-web 的 scope registry；未设置时才采用默认 registry。沿用目标现有配置及认证，不把维护者内网地址硬编码进迁移命令，不修改用户全局 registry，也不输出完整 .npmrc 或令牌。

pnpm 项目使用以下只读查询；npm 项目使用相同参数的 npm view：

~~~bash
pnpm view @gancao-web/base-element-react versions --json
pnpm view @gancao-web/base-element-react dist-tags --json
~~~

查询具体候选的元数据时，将候选版本替换为刚查到的精确版本：

~~~bash
pnpm view "@gancao-web/base-element-react@<候选版本>" version engines peerDependencies dependencies deprecated --json
~~~

Yarn 项目先确认 Classic/Berry 版本，再使用该版本的 info/npm info 等价查询，安装仍使用 Yarn。工作区和 catalog/overrides/resolutions 项目沿用自身依赖治理方式，不能为了执行示例改变项目结构或绕过工作区限制。

保存查询时间、脱敏后的 registry 来源、versions/dist-tags、候选元数据与退出状态。认证、网络、未发布或 registry 失败时标记“远端版本未核实”，保留当前依赖，停止依赖升级单元，继续不依赖新包能力的迁移；不能换公共源、反复原样重试或声称当前已是最新。

## 3. 选择兼容的稳定候选

默认支持范围以 [组件基线](../assets/baseline.json) 为准：当前为不低于 3.0.0 的 3.x 稳定版。versions 用来找候选，dist-tags 用来解释发布渠道；latest 标签不能替代兼容性判断。

1. 从实际发布列表中筛选支持范围内的稳定版本，按语义版本从高到低核对。排除 alpha/beta/rc 等预发布版本和已弃用版本；3.10.0 应高于 3.9.0，不能按字符串排序。
2. 检查候选的 engines、peerDependencies、React/ReactDOM、Ant Design、Less 等约束，核对发布说明中的 API 变化与项目扩展；安装后还需检查真实类型和实现。单看主版本相同不能证明兼容。
3. 选择满足用户版本限制和目标环境的最高兼容稳定版；排除更高版本时记录具体原因。不能为了组件 UI 升级顺带强制升级 Node、React、Ant Design 或构建工具，也不使用 --force/--legacy-peer-deps 隐藏冲突。

| 当前情况 | 执行结果 |
| --- | --- |
| 旧包名或低于支持基线 | 选择已确认兼容的稳定候选，安装新包并迁移使用方；旧包/本地目录在扩展和引用完成迁移后再清理 |
| 已安装支持范围内的稳定版 | 查询后有更高兼容版本就升级；已是最高兼容版本时保持依赖，并记录“查询后无需升级” |
| 当前是预发布版 | 有等价或更高兼容稳定版时切换；只有较低稳定版时不自动降级 |
| 当前版本高于 registry 候选，或已在 4.x 等范围外 | 不降级到基线；记录版本与 API 差异，核对支持范围后处理 |
| 本地源码或链接/工作区依赖 | 先确认真实实现和迁移范围；无法证明切换等价时保留，报告包入口升级受阻，不覆盖独有扩展 |
| 用户固定版本或禁止升级 | 遵守限制，报告发布差异与缺失能力，不静默改依赖 |

没有满足约束的已发布候选时保留当前版本并报告原因，不把源码中的未发布版本当成可安装候选。

## 4. 执行必要升级并核实结果

明确目标版本及兼容依据后，使用目标包管理器安装具体候选，更新目标依赖声明与原锁文件。普通 pnpm 应用示例：

~~~bash
pnpm add "@gancao-web/base-element-react@<候选版本>" --save-exact
~~~

npm 对应 npm install，同样指定候选版本；Yarn 使用目标版本对应的 add。示例固定精确版本，目标有依赖范围或 catalog 规范时按其规则写入，并核实锁文件最终解析版本。工作区只修改拥有该依赖的 package/catalog；不使用整仓 update --latest 或仅手改 package.json，也不删除锁文件重装。

安装失败不能当作升级成功。保留诊断和用户原有改动，修复明确的配置/兼容问题或记录受阻，不用清空工作区、忽略检查等方式掩盖失败。

安装后重新核对依赖声明、锁文件、实际安装版本及页面 import 解析；三者与选定候选或已说明的本地实现一致，才算版本升级单元完成。阅读该安装版本真实导出、类型和自带 skill；资料与代码冲突时以实现为准，再按 [组件迁移](components.md) 合并初始化并适配页面。安装新版本不会自动改好 UI 配置或生成 PageLayout。

按目标 AGENTS.md 执行允许的静态检查，复核此次依赖与锁文件差异，没有顺带升级整个工具链。交付记录升级前版本、远端候选、最终版本、兼容依据、实际命令和检查；没有变化或受阻也要给出真实原因，不能遗漏版本检查结果。

命令依据：[npm view](https://docs.npmjs.com/cli/v10/commands/npm-view/)、[npm registry 配置](https://docs.npmjs.com/cli/v10/configuring-npm/npmrc/)、[pnpm add](https://pnpm.io/10.x/cli/add)。
