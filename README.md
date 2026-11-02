# React 后台框架迁移

独立维护的迁移 Skill：将旧 React 后台统一到 Vite / React Router 6 / Store / 请求 SDK 和新版 UI；新架构项目按差异补齐。保留业务、权限码和接口合同。

仓库地址：https://github.com/Clearlovesixteen/react-admin-ui-migration 。以 GitHub 插件源分发，版本以 package.json 与 plugin.json 为准。package.json 设为 private，npm 用于本地检查和离线打包。

## 内容与职责

~~~text
plugin.json                       Codex 可识别的便携插件入口
.agents/plugins/marketplace.json   GitHub 仓库中的插件目录
skills/react-admin-ui-migration/
  SKILL.md                        迁移入口
  references/                     Layout、组件差异与验收
  assets/page-layout/             可复制到目标项目的展示模板
  assets/theme/                   Ant Design 4/Less 主题变量快照
  assets/framework/               完整框架离线资源（目标配置需绑定）
  assets/framework-manifest.json  框架基线、绑定键和资源指纹
  scripts/prepare-framework.mjs   默认只读，显式准备到新空目录
  assets/baseline.json            组件基线、源文件与产物指纹
  scripts/scan-candidates.mjs     只读扫描器
  scripts/inspect-ui-styles.js    浏览器只读样式检查表达式
scripts/                          维护、版本和打包检查
resources/menu-visual/             WMS 菜单图形/独立配色的维护源
resources/application-panel/       我的应用展示、响应转换与样式维护源
tests/                            扫描器和分发契约验证
~~~

`@gancao-web/base-element-react` 是 UI 组件库；本包是迁移工作流与资源包。PageLayout 模板在迁移时落入目标业务项目，不成为组件库公开 API。旧 Router、启动、状态和请求迁入统一框架；应用身份、接口差异和业务权限通过目标项目适配器接入。

样式与主题是独立的迁移单元。包内 Ant Design 控件不保证经过目标应用的按需样式转换；迁移时需要确认完整基础 CSS、组件扩展样式及 Less 主题，实际展开级联、下拉和弹窗验收。扫描器会报告样式入口、旧颜色类及包管理器冲突线索；发现入口仍不代表运行时已验证。

我的应用是新版迁移的必接项，旧系统没有也需补接。随包提供支持加载、搜索、新窗口链接、失败重试与窄屏的应用面板，通过目标项目已有用户中心封装注入真实数据；不包含参考环境的地址、令牌和请求实现。

PageLayout 同时分发 WMS 菜单的本地线性图标、展开箭头及独立配色。目标图标名称由项目适配层解析，不从维护者电脑或源系统 CDN 运行；业务菜单含义、权限和导航仍由目标项目决定。

## 同学如何安装

在支持 Git 插件源的 Codex 中执行：

~~~bash
codex plugin marketplace add git@github.com:Clearlovesixteen/react-admin-ui-migration.git --ref main
codex plugin add react-admin-ui-migration@gancao-ui-migration
~~~

也可以添加插件源后，在插件页中选择“甘草后台 UI 迁移”并安装。私有仓库需要当前 GitHub 账号拥有读取权限及可用的 Git SSH 登录。

安装包包含全部说明、模板和扫描器，不需要先克隆维护仓库、安装后台依赖或启动 MCP 服务。在目标后台项目的新会话中调用：

~~~text
使用 $react-admin-ui-migration，把当前后台迁入统一新架构，补齐平台能力并保留业务行为。
~~~

执行迁移时，Agent 会核对组件的声明、锁定和实际版本，查询目标项目 registry，选择兼容的 3.x 稳定版，并在迁移范围内完成必要安装和锁文件更新。版本查询需要能访问目标 registry；失败会记录为未核实。允许旧版迁到已确认的 3.x 目标，不无条件使用 latest、越出目标主版本范围或降级。只读检查或用户固定版本时遵守相应限制。详细规则见 `skills/react-admin-ui-migration/references/version-upgrade.md`。

## 更新

维护者同步 UI 基线、更新规则并提升版本，检查通过后推送 main。同学刷新插件源：

~~~bash
codex plugin marketplace upgrade gancao-ui-migration
codex plugin list --marketplace gancao-ui-migration --json
~~~

核对安装版本，按客户端提示重新加载插件或开始新会话。main 为更新通道，固定旧标签的安装不会自动跟进。未在同学客户端实测前，不承诺后台静默更新或旧对话热更新。

更新插件会更新 skill、参考资料、工具与模板；已复制进业务项目的 PageLayout 属于项目代码，不会自动覆盖。需要更新已迁 UI 时，再次调用本 skill 比较差异并完成项目适配。

刷新插件源只更新迁移 skill；目标后台的组件版本查询和依赖升级在调用 skill 执行迁移时进行。单独运行候选扫描器仍是本地只读盘点。

其他 Agent 可以读取本仓库 `skills/react-admin-ui-migration/SKILL.md`，或者按其标准 skill 安装方式接入。不要假定其他 Agent 能自动识别 Codex 插件源；安装/更新方式须按对应客户端验证。

## 维护与发布

本仓库运行工具只使用 Node 内置模块，无需安装后台应用依赖：

~~~bash
npm run lint
npm test
npm pack --dry-run
~~~

同步新的 UI 基线时，传入组件维护仓库的实际位置：

~~~bash
node scripts/sync-baseline.mjs "<base-element-react仓库>"
node scripts/sync-baseline.mjs "<base-element-react仓库>" --check
~~~

该命令提取展示层与 Less 主题变量，同时保留可注入请求的我的应用；排除源系统业务入口、平台请求实现、品牌图片、UnoCSS 和用户状态。规则发生变化时同步更新对应 references，不能只刷新快照。

使用 `npm run version:patch`、`version:minor` 或 `version:major` 同步包和插件版本；命令不会自动提交、打标签或发布。新增说明/修正规则通常提升 patch，新增兼容能力提升 minor，改变迁移契约或基线兼容范围提升 major。

分发前运行检查并审查差异，再提交、推送 main。可按需要创建版本标签和 GitHub Release，附上本地打出的 tgz；日常插件更新直接跟随 GitHub main。

规则更新不等于提高了迁移覆盖率。需要在一个真实旧系统上完成从安装、迁移到交互验收的验证，记录可自动完成和需要项目适配的部分。

依据：[OpenAI 插件打包与 Git marketplace 文档](https://developers.openai.com/plugins/build/plugins)。

## 框架版资源和边界

调用后先识别旧、新或混合架构。旧/混合项目迁完整链，新项目核对适用实现后补齐；明确仅迁 UI 时不扩大范围。我的应用和完整框架的文件中心要接真实服务，不能以空数组代替。

~~~bash
node skills/react-admin-ui-migration/scripts/scan-candidates.mjs "<目标项目>" --json
node skills/react-admin-ui-migration/scripts/prepare-framework.mjs
node skills/react-admin-ui-migration/scripts/prepare-framework.mjs --output "<新空目录>"
~~~

资源工具不覆盖现有项目、不安装依赖、不执行消费者代码。先准备到新目录，再按差异合并；package.json 是参考，不包括目标所有业务依赖/既有测试。环境示例仅给键，无 CMS 身份或私有环境值。安装标识继续使用 react-admin-ui-migration，避免旧安装失联。

维护框架快照：

~~~bash
node scripts/sync-framework.mjs "<迁移试点项目>"
node scripts/sync-framework.mjs "<迁移试点项目>" --check
~~~

框架基线来自 admin-template/master 的已固定提交，并包含实际迁移发现的修正；展示资源继续保留 WMS 图标、菜单配色、对齐与折叠修复。同步 UI 与框架资源后一起校验指纹和实际离线包。详细流程见 skills/react-admin-ui-migration/references/framework-migration.md。

资源/测试通过与真实业务验收分别记录。CMS 试点已脱离 Umi，真实 SSO 已返回原深链；浏览器定位并修复了 Vite 8 导入旧 Braft UMD 的默认导出兼容问题，以及表格插入按钮触发表单提交的问题。开发服务和 test 构建产物已核对真实列表、编辑器和表格插入。真实保存、上传、不同权限账号及部署回退仍需目标环境验收，不能把资源测试当成业务全流程通过。
