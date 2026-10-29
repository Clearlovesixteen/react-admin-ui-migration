---
name: react-admin-ui-migration
description: 将 React/Ant Design 旧后台迁移到新版 base-element-react UI。适用于组件包升级、项目级 PageLayout、菜单、页签、搜索表单、列表汇总和旧布局清理；内置可复制的展示模板，业务接口和权限按目标项目适配。
---

# React 后台 UI 迁移

把已授权的旧后台升级到新版 UI，完成可由代码推导的迁移工作，并明确剩余业务适配和人工验收。单纯开发新业务页面时，使用组件包自身的 skill。

## 使用与边界

在目标项目中调用：

~~~text
使用 $react-admin-ui-migration，将当前旧后台迁移到新版 UI，保留业务行为。
~~~

本 skill 的 references、assets、scripts 均相对当前 SKILL.md 所在目录解析。取得实际安装目录后使用绝对路径访问；不依赖维护者电脑、参考仓库或旧提交记录。

- UI 组件使用 `@gancao-web/base-element-react` 的真实导出；当前模板基线见 [baseline.json](assets/baseline.json)。
- **组件包不导出 PageLayout、Menu、RouteTabs，也没有 BaseElement.use().layout。** PageLayout 落在目标项目，自行拥有路由、权限、账户与平台功能。
- 随包的 [PageLayout 模板](assets/page-layout/components/PageLayoutShell.tsx) 提供展示代码和样式；在目标项目中复制、适配后再引用，不能从插件缓存或 npm skill 包跨路径运行应用。
- 包更新只更新 skill、参考资料和模板。已迁入业务项目的代码不会自动覆盖；后续再次调用本 skill，比较差异后按需更新。
- 保留目标项目的 API、鉴权、权限码、路由、请求时机、缓存 key、字段语义、金额/时间单位和空态。视觉更新不自动授权改变这些业务契约。

## 1. 盘点目标项目

阅读目标项目 AGENTS.md、README、package.json、锁文件、初始化、主题、Layout、路由、菜单、权限和一个代表页面。然后运行随包只读扫描器：

~~~bash
node "<skill目录>/scripts/scan-candidates.mjs" "<目标项目>" --json
~~~

扫描器不运行项目代码、不请求业务接口、不安装依赖、不修改目标文件。输出是候选，零命中也不证明迁移已完成；查看诊断和忽略范围后，使用 rg 补查动态封装、重命名组件、别名和 CSS。

确认以下事实并记录实施范围：

| 层 | 要确认的内容 |
| --- | --- |
| 组件 | 本地源码还是 npm 包、锁定版本、真实导出、表单/列表/弹窗/Tabs API |
| 样式 | Ant Design 基础 CSS、组件扩展样式、主题变量、旧全局/颜色类、构建对包内引用的处理范围 |
| 外壳 | 现有 Layout 位置、Router 版本、菜单真源、权限过滤、外链与重定向 |
| 状态 | KeepAlive、query/state、最近访问页签、持久化 key |
| 平台 | 账户退出、文件中心、我的应用、预发切换等原有功能及对应接口 |
| 页面 | 普通列表、复杂筛选、弹窗/抽屉、汇总、业务 Tabs、自定义表格 |

每个迁移单元标记“执行 / 已符合 / 受阻 / 不适用”，附源码位置、保持的行为和验证方式。缺少某个可选平台契约时，保留原实现，继续其他单元；不因工具缺失阻塞所有迁移。

## 2. 查询组件版本、执行必要升级并确认入口

先按 [版本查询与升级](references/version-upgrade.md) 核对声明、锁定、实际加载版本与目标 registry，查询已发布版本并选择兼容稳定候选。本次迁移目标为 3.x 稳定版，旧版可升级到该目标；已使用 3.x 也必须查询，有更高兼容版本时在本次迁移授权范围内安装并更新锁文件。用户限制依赖变更、本地扩展无法等价迁移、无兼容版本或查询失败时记录具体结果；不无条件安装 latest，不越出已确认的目标主版本范围，也不降级。

版本检查及必要安装完成后，再按 [组件迁移](references/components.md) 核对能力。优先读目标项目本地组件源码；否则读已安装包的真实导出、类型和 `skill/SKILL.md`，按需读取其 references。遇到资料与实现不一致，以安装版本的代码/类型为准。

合并后的组件是一套实现，先按组件迁移中的判断步骤核对 defaults、全局初始化、页面覆盖和旧样式，再应用已确认的 UI 基线。全局 list 配置搜索区，纯编辑表单按实例判断。将变更合并进目标原有 BaseElement.use；该调用替换整份注册值，不能另调仅含 UI 字段的 use。

旧包 `base-element-react` 与新包 `@gancao-web/base-element-react` 不视为等价别名。需要升级时使用目标包管理器，保留目标 React/Ant Design 等环境；不要为了迁 UI 一并复制维护仓库的 Vite、TypeScript 或 lint 版本。

包管理器以目标 README、CI、packageManager 和原锁文件共同确认；扫描器会报告多锁文件及 pnpm 安装布局线索。声明版本正确不代表 node_modules 的安装方式正确，不自动删除用户已有的另一份锁文件。

随包展示模板适用于 React/Ant Design 4。目标使用 Ant Design 5 或其他框架时，不直接覆盖或强制降级；核实可复用的迁移单元，并说明模板不适用的部分。

只有确认新入口提供等价能力后才切换业务导入与初始化。锁文件由目标包管理器安装时更新，并核实实际解析与安装版本。保留既有 request/upload/toast/loading/登录/日志配置。存在项目专属组件扩展时先迁移其所有使用方，不直接删除本地组件目录。

切换组件入口时必读 [样式、主题与浏览器验收](references/styles-and-runtime.md)。确认 Ant Design 基础样式覆盖包内间接引用和 portal 浮层；变量导入不能代替控件 CSS。随包 [主题快照](assets/theme/antd4.ts) 通过目标已有 Less 管线合并，BaseElement.use 不会自动应用项目主题。

## 3. 迁移项目级 PageLayout

阅读 [外壳接入](references/page-layout.md)，将随包展示模板按目标目录约定落地，补写目标项目自己的入口与适配层：

~~~text
项目 PageLayout 入口
  ├─ 目标菜单与权限 -> PageLayoutMenuItem[]
  ├─ 目标导航、路由历史和 KeepAlive -> 选中项 / tabs / contentScroll
  ├─ 目标账户与平台功能 -> account / headerActions
  └─ PageLayoutShell -> 菜单、搜索、折叠、内容布局
~~~

先完成纯展示层，再接目标项目的行为。Shell 不直接读取用户 Store、Router、环境变量或业务 API；它接收已经过滤权限的菜单和业务回调。

菜单视觉也属于模板闭包：一并迁入本地图标目录、MenuIcon 和 menu-visual.less，接好目标图标名称的解析与必要的语义映射。按 [外壳接入](references/page-layout.md) 对照实际菜单普通/展开/选中/收起及浮层状态，不能用旧的通用 Ant Design 图标和全局次级文字色代替 WMS 菜单基线。

保持一个正式 Layout 入口。如果路径调整，同步路由配置、动态 glob、导入和文档；外部系统依赖旧入口时先保持兼容。不要新增无人使用的第二套 Layout。

## 4. 迁移页面

阅读 [组件迁移](references/components.md)，分组处理：

1. 全局列表外观、Grid、搜索区折叠与高度；纯编辑表单不继承列表默认配置。
2. 组合筛选使用 select-input，保持最终 API 参数映射、默认值和联动。
3. BasePage children 中的列表汇总迁入 paginationLeftRender，保留响应数据和展示语义。
4. 内容 Tabs 使用真实的 lib/value/children API；保持原有激活值、URL/存储和销毁语义。
5. 弹窗、抽屉、操作列和必要滚动适配；确认宽表列宽、数字控件及响应式搜索，再清理旧补丁和旧作用域颜色类。

每组先迁一个代表实现，完成代码核对和目标项目允许的静态检查，再处理同形态页面。复杂页面逐个适配，不能凭正则命中批量删配置。

## 5. 核验与交付

按 [验收与覆盖边界](references/verification.md) 逐项核对。遵循目标 AGENTS.md 的验证要求；若仅允许 lint，就不额外启动服务、浏览器、构建或测试。命令不存在时如实说明，不照抄参考项目的脚本名。

允许浏览器时用实际页面验收样式和交互；修改前后保留同一场景的截图/尺寸证据，至少打开代表下拉、级联、编辑弹窗与只读场景。可用 [只读样式检查表达式](scripts/inspect-ui-styles.js) 辅助确认已挂载控件。样式被 mock 的组件测试不能证明视觉完成；真实 UI 问题应以编译产物/浏览器验证闭环。

交付列出组件升级前/候选/最终版本、兼容依据与查询/安装结果，以及已完成单元、未完成项与原因、实际运行的检查、待用户验证的交互。不能把扫描结束、编译通过或模板落地等同于完整业务验收；未经真实迁移测量，不承诺固定自动化比例。
