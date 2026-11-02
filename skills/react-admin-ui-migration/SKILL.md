---
name: react-admin-ui-migration
description: 将 React/Ant Design 旧后台迁入统一的 Vite、React Router、Store、请求 SDK 与新版 UI 架构；也用于已迁新框架项目的能力补齐和差异修复。包含离线框架资源、项目布局、我的应用、文件中心及只读盘点工具，保留目标业务合同。
---

# React 后台框架迁移

把旧后台迁到完整新架构，并完成当前项目的适配和验证。已使用新架构的项目按差异补齐，不能重复覆盖已符合的实现；用户明确仅迁 UI、只读评估或固定版本时遵守其范围。不是普通业务页面开发或任意框架重写的入口。

## 范围与资源

- 默认框架目标是 Vite + React Router 6 + 命名空间 Store + @gancao-web/request + base-tools + base-element-react 3.x + AntD 4 / Less / UnoCSS。具体基线见 [框架清单](assets/framework-manifest.json)，组件视觉基线见 [UI 清单](assets/baseline.json)。基线用于复现，不等于所有依赖的最新版本。
- 业务行为、API payload/响应、权限码、开放/关闭路由、提交与刷新语义、资源地址和专属编辑器保留；旧 Umi/请求等实现可以替换，但必须接回原职责。
- 我的应用是新版迁移必接项；完整框架同时接文件中心、登录/退出、错误处理和可配置的页签/保活。原无保活时可保持关闭，不机械套用模板开关。
- PageLayout 属于目标项目，组件包不导出 PageLayout/Menu/RouteTabs，没有 BaseElement.use().layout。
- 所有资源相对实际 SKILL.md 目录解析，落入目标项目后运行；不跨插件缓存导入，不依赖维护者电脑、私有环境或源项目 CDN。

## 1. 盘点并选择迁移路径

阅读目标 AGENTS、README、package.json、锁文件、真实启动、路由/权限、状态、请求/上传、样式及一个业务代表模块。运行只读盘点：

~~~bash
node "<skill目录>/scripts/scan-candidates.mjs" "<目标项目>" --json
~~~

输出 architecture 的旧/新/混合分类及证据只是阅读导航。零命中不证明完成，命中平台组件不证明接入真实服务；按调用关系补查动态封装、别名、关闭模块和测试。

框架迁移必读 [框架流程](references/framework-migration.md)。旧/混合架构迁完整链；新架构逐项比较并复用。每项登记“执行 / 原已符合 / 受阻 / 不适用”，记录契约、实现位置、验证和回退点；能由源码推导的适配直接完成，真正缺失的关键合同才询问。

## 2. 迁移工程与运行机制

按 [框架流程](references/framework-migration.md) 固定可回退基线，再切工具链、请求与身份、路由权限、布局平台、业务边界。框架资源工具默认只列清单，--output 仅写新空目录；暂存后按差异合入目标，不能覆盖原 package.json、测试、业务目录或环境。

按 [运行契约](references/request-and-login.md) 核对环境、GAPI/UC/Java、三类 token、用户 key、SSO 深链、权限码、树/平铺权限、关闭开关和上传。使用单一执行链、单一入口和正式 Layout；移除旧框架前确保所有生命周期职责已迁完。

保留目标业务直接依赖和有效修复；切 pnpm 时显式处理隐式依赖、多锁文件和真实安装布局。原单元测试不能被模板的测试环境开发服务替代。package.json 的资源参考不包含目标所有依赖和测试配置。

## 3. 合并组件、主题与布局

先按 [版本规则](references/version-upgrade.md) 区分声明/锁定/实际版本，查询目标 registry 后选择兼容候选；框架依赖按明确基线组合适配，不顺带追逐 latest 或降级已符合版本。核对已安装组件真实导出、类型及自身 skill，资料与实现冲突时以实现为准。

按 [组件迁移](references/components.md) 合并一次完整 BaseElement.use，保留目标 request/upload/file、分页、空值和生命周期合同。已符合的 3.x 页面不重复改造，专属编辑器和历史保持独立。

按 [样式与运行时](references/styles-and-runtime.md) 接完整 AntD 控件 CSS、组件扩展样式、Less 主题和 portal 浮层；变量导入不生成控件 CSS，安装和样式 mock 测试不能证明 UI 正常。

按 [外壳接入](references/page-layout.md) 复用展示 Shell、WMS 本地图标/配色、搜索左边缘、折叠40×40和响应式；项目入口连接 Router/Store/权限/账户及真实平台加载器。我的应用和文件中心不使用静态数据或吞错返回空数组。

## 4. 逐页验证并清理旧架构

先迁代表页面，再按同形态适配；所有开放页、关联弹窗、关闭模块和特殊流程均有清单。保留列表默认查询、分页、筛选零值/空值、成功后 reload/refresh、业务 Tabs、金额/时间单位、只读、历史快照和上传模式。

旧入口/依赖/类型/生成目录仅在引用和行为闭包核对后清理。不要保留导出空对象的 umi 兼容模块来隐藏未迁移点，也不为绿色结果删除测试或全局忽略类型错误。

## 5. 验收和沉淀

按 [框架验收](references/framework-verification.md) 与 [UI 验收](references/verification.md) 执行目标允许的类型、lint、测试和各环境构建，再验证开发模式与构建产物的实际页面。真实 SSO、权限、业务写入与只读检查分别记录；权限上传页可能挂载即写入，使用隔离 mock。

发现实际迁移问题时先在项目修复并验证，再沉淀到对应条件、资源和有意义的扫描/行为测试。框架资源在新空目录实际准备并检查离线闭包；更新 skill 不自动覆盖已迁入项目的代码。

交付说明采用的框架/组件组合、已迁范围、保留的业务合同、旧框架残留、实际验证、未完成项和回退方式。浏览器被禁用、真实服务未验或页面仍错误都如实保留，不能把扫描/构建通过当成完整完成。
