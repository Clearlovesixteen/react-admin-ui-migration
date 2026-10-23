# React 后台 UI 迁移

独立维护的迁移 Skill 包：将 React/Ant Design 旧后台升级到新版 UI。包含迁移流程、项目级 PageLayout 展示模板、组件差异说明和只读候选扫描器。

仓库地址：https://github.com/Clearlovesixteen/react-admin-ui-migration 。以 GitHub 插件源分发，版本以 package.json 与 plugin.json 为准。package.json 设为 private，npm 用于本地检查和离线打包。

## 内容与职责

~~~text
plugin.json                       Codex 可识别的便携插件入口
.agents/plugins/marketplace.json   GitHub 仓库中的插件目录
skills/react-admin-ui-migration/
  SKILL.md                        迁移入口
  references/                     Layout、组件差异与验收
  assets/page-layout/             可复制到目标项目的展示模板
  assets/baseline.json            组件基线、源文件与产物指纹
  scripts/scan-candidates.mjs     只读扫描器
scripts/                          维护、版本和打包检查
tests/                            扫描器和分发契约验证
~~~

`@gancao-web/base-element-react` 是 UI 组件库；本包是迁移工作流与资源包。PageLayout 模板在迁移时落入目标业务项目，不成为组件库公开 API。已有业务权限、Router、请求和平台入口通过目标项目自己的适配层接入。

## 同学如何安装

在支持 Git 插件源的 Codex 中执行：

~~~bash
codex plugin marketplace add git@github.com:Clearlovesixteen/react-admin-ui-migration.git --ref main
~~~

然后在插件页中选择“甘草后台 UI 迁移”，安装 React 后台 UI 迁移插件。私有仓库需要当前 GitHub 账号拥有读取权限及可用的 Git SSH 登录。

安装包包含全部说明、模板和扫描器，不需要先克隆维护仓库、安装后台依赖或启动 MCP 服务。在目标后台项目的新会话中调用：

~~~text
使用 $react-admin-ui-migration，把当前旧后台迁到新版 UI，保留业务行为。
~~~

## 更新

维护者同步 UI 基线、更新规则并提升版本，检查通过后推送 main。同学刷新插件源：

~~~bash
codex plugin marketplace upgrade gancao-ui-migration
codex plugin list --marketplace gancao-ui-migration --json
~~~

核对安装版本，按客户端提示重新加载插件或开始新会话。main 为更新通道，固定旧标签的安装不会自动跟进。未在同学客户端实测前，不承诺后台静默更新或旧对话热更新。

更新插件会更新 skill、参考资料、工具与模板；已复制进业务项目的 PageLayout 属于项目代码，不会自动覆盖。需要更新已迁 UI 时，再次调用本 skill 比较差异并完成项目适配。

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

该命令只提取展示层，排除源系统业务入口、固定平台接口、品牌图片和用户状态。规则发生变化时同步更新对应 references，不能只刷新快照。

使用 `npm run version:patch`、`version:minor` 或 `version:major` 同步包和插件版本；命令不会自动提交、打标签或发布。新增说明/修正规则通常提升 patch，新增兼容能力提升 minor，改变迁移契约或基线兼容范围提升 major。

分发前运行检查并审查差异，再提交、推送 main。可按需要创建版本标签和 GitHub Release，附上本地打出的 tgz；日常插件更新直接跟随 GitHub main。

规则更新不等于提高了迁移覆盖率。需要在一个真实旧系统上完成从安装、迁移到交互验收的验证，记录可自动完成和需要项目适配的部分。

依据：[OpenAI 插件打包与 Git marketplace 文档](https://developers.openai.com/plugins/build/plugins)。
