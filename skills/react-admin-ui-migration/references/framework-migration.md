# 框架迁移

目标是统一到 admin-template/master 的显式入口、Vite、React Router 6、命名空间 Store、请求 SDK 和平台能力。基线组合及来源见 [框架清单](../assets/framework-manifest.json)，可复制资源见 [框架目录](../assets/framework)。仅用户明确限制 UI 时保留原工具链。

## 先区分当前状态

| 项目状态 | 做法 |
| --- | --- |
| Umi / 旧 Router / 旧请求 | 迁移完整基础设施，逐个接回生命周期承担的业务职责 |
| Vite 中仍有 Umi 钩子、旧请求或 Router 5 | 按混合架构清理闭包，不因 Vite 能构建而提前完成 |
| 已使用目标框架 | 对照单元补齐；保留适用的现有实现及用户修正，不重装一份模板 |
| 无法识别 / 其他 React 体系 | 读真实入口、构建和调用方后确定边界，不能仅凭扫描结果选择覆盖 |

扫描器的 architecture 是候选分类；units 的 evidence-found-unverified 只代表发现代码。框架、组件库、展示 Shell 三者不能互相代替。

## 迁移顺序

1. 固定目标提交和回退环境。记录开放/关闭路由、原权限码、环境、应用身份、7 类边界：请求、登录、状态、权限、上传、页面生命周期、构建/测试。
2. 切工具链。Node/pnpm 以框架基线为复现起点，保留目标业务直接依赖。packageManager、唯一应用依赖锁、实际安装方式一起切换；skills-lock 等其他用途的锁不删除。
3. 建立 env、用户 Store 和 SDK 请求。随后接登录；请求不得导入业务 API 导致循环依赖。每个请求动态读身份。
4. 接 React Router、权限和布局。所有公开 URL、旧权限码、后端名称/排序及原关闭模块有对照表；loader 在模块级定义，避免每次渲染重新创建 lazy 类型。
5. 逐页迁移服务和环境读取，合并完整 BaseElement 初始化；补齐我的应用和文件中心。自定义编辑器、历史、导出等逐项适配。
6. 安装、类型、测试、各环境构建、开发模式与实际产物分别验收。最后清理旧入口、依赖、生成类型和无效脚本。

每阶段保留可回退提交或产物，不提交半份 HTML/JS/CSS。无需为了回退同时交付两套生产运行时。

## 资源准备

默认只读查看清单：

~~~bash
node "<skill目录>/scripts/prepare-framework.mjs"
~~~

向显式新空目录准备可审查资源：

~~~bash
node "<skill目录>/scripts/prepare-framework.mjs" --output "<临时新空目录>"
~~~

工具不改消费者项目、不装依赖、不执行应用代码；拒绝覆盖非空目录。Agent 随后按差异将资源合入目标项目，不能把暂存目录整体覆盖目标。资源内 package.json 是合并参考，不包含目标的业务依赖和既有测试配置。

环境示例只给键和少量框架默认值。将目标身份、品牌、菜单、原权限开关、保活开关、服务地址和测试入口填回后才能启动；空值不表示能力不适用。根 .env 不从维护者项目复制。

## Umi 职责映射

| 旧入口 | 新职责 |
| --- | --- |
| render / code 回调 | pages/base/login + 完整清除授权参数后的深链恢复 |
| getInitialState / useModel | 用户 Store、独立业务 Store、明确的初始化任务 |
| patchRoutes / access | menus + 服务端 metadata + AuthRoute / 按钮权限 |
| layout / childrenRender | PageLayout 项目适配器 + Outlet + 原展示 Shell |
| onPageChange / history | 路由守卫、统一导航和 React Router history |
| .umirc define/proxy/theme | env 模块、Vite proxy/Less、统一 theme |
| umi-test / shim | 目标的独立测试工具与必要浏览器 polyfill |

获取批量配置、补充用户字段、上报、埋点、任务轮询等不是“Umi 功能”而是目标业务职责；找出调用者后迁入适当模块，不随旧文件一起删除。

## 工具链和测试易错点

- 模板的 test 脚本是测试环境 Vite 服务，不是单元测试。旧项目的单元测试/覆盖率入口保留，环境服务另命名 dev:test。
- pnpm 严格解析会暴露隐式依赖。业务直接导入的 Braft/扩展、copy-to-clipboard、图标，以及 Jest、转换器、样式 mock 等须显式声明。
- Vite 构建成功不保证开发预构建或真实渲染成功；懒加载失败和组件报错必须在页面核对。
- ESM 应用的 Jest 配置/转换器用 .cjs；旧 CommonJS 转换器不能直接执行 import.meta.env，统一 env 模块并在测试中替换。
- AntD 4 完整 Less、SVG、~ 别名、theme、UnoCSS 和浏览器 polyfill 是独立构建项。自定义 Braft 需要的 global 兼容也要保留，Node 升级不替代浏览器能力。
- 不为迁框架重复迁已符合组件库 3.x 的页面；禁止删除旧测试或全局忽略错误来获得绿色结果。

## 合并和提交入口

迁移后再合并旧分支时，逐项核对 package.json 的 scripts、生命周期、gitHooks/lint-staged、包管理器声明和对应锁文件。依赖已是 Vite 也可能被合回 umi dev/build/generate、umi-test 或 npm ci；此时属于混合执行链，不能把整个旧配置选入后继续提交。锁被合并删除时，优先恢复已确认迁移提交中的匹配锁，再做冻结安装；有有效依赖变化则重新按目标包管理器生成并验证。

提交钩子也属于本机迁移边界：核对实际生效的 core.hooksPath/钩子文件、执行器与项目配置。旧 Yorkie 钩子可能指向已移除的 node_modules 入口；按当前项目保留必要校验并接回新工具链，不盲目删除团队钩子，不用 --no-verify 掩盖问题。复验应直接运行已阅读的实际钩子，避免为了测试而生成一次提交。

核对 .nvmrc 指定版本与当前、已安装版本；声明版本并不会自动安装。确需安装时使用目标已有版本管理器，不通过降低项目要求解决本机缺少版本。保留当前合并状态；未获提交授权时，修复配置后停在可提交状态。

完成检查见 [框架验收](framework-verification.md)；请求、登录与权限的项目差异见 [运行契约](request-and-login.md)。
