# 项目级 PageLayout 接入

## 随包资产与依赖

`assets/page-layout/` 是可复制的展示模板，基于当前 UI 的 Shell、Menu、MenuSearch、菜单索引和折叠存储提取。只依赖 React、Ant Design 4、@ant-design/icons 和 Less；没有业务别名、固定业务 API、用户 Store、Router 或品牌图片。

模板提供 ApplicationPanel、纯响应转换与样式，通过注入加载函数接入我的应用。没有业务入口 index.tsx、FileCenter、RouteTabs 和 menu.tsx；业务请求、鉴权和导航契约由目标项目适配。headerActions/headerTrailingActions 是其他项目功能的展示插槽，不意味着组件库提供平台 API。

将整个 page-layout 目录复制到目标项目现有 Layout 位置（例如 src/components/PageLayout），然后生成项目入口。已有同名文件先阅读合并，不直接整目录覆盖。

复制后清点 import 闭包，保留目标项目自己的 brandLogo、brandTitle、背景和菜单图标。模板使用 Ant Design 主题变量，Less 入口已移除 Vite 专属的波浪线别名；目标构建仍需支持 Less 及其既有 antd 主题配置。

模板中的 themes/default.less 只提供变量，不加载全部控件样式。先按 [样式与主题接入](styles-and-runtime.md) 补齐实际样式管线，再将随包 assets/theme/antd4.ts 合并到目标主题入口；不能把模板复制成功当作主题与浮层已迁移。

## 项目入口

下面描述入口契约，不是可以照抄的业务文件：

~~~tsx
<PageLayoutShell
  menuItems={accessibleMenuItems}
  selectedKey={currentMenuKey}
  brandLogo={targetLogo}
  brandTitle={targetTitle}
  account={{ name: username, menuItems: accountItems }}
  applicationPanel={{ loadApplications: loadTargetApplications }}
  headerActions={existingPlatformEntries}
  tabs={routeTabsEnabled ? routeTabs : undefined}
  contentScroll={childOwnsScroll ? 'child' : 'container'}
>
  {routeOutlet}
</PageLayoutShell>
~~~

这些变量分别从目标项目现有逻辑取得；接入时写成真实代码，不留下占位变量。按当前 Router 版本保留 Outlet、children 或对应路由渲染方式，不为换 UI 强制升级 Router。

- menuItems：保留本地菜单真源和目标权限过滤规则；服务端只提供权限时，不用它覆盖本地名称、层级与图标。
- selectedKey：沿用目标稳定 key，不能用名称替代已有路径/编码。菜单 index 会忽略重复 key 并警告；接入方应解决真实重复。
- onClick：封装目标统一导航，保留 redirect、hash/history、basename、新窗口和外链行为。
- account：保留用户信息、退出登录以及原有环境切换和清理副作用。
- collapsedStorageKey：沿用已有 key；原来不持久化就不随意新增持久化。
- defaultOpenAll/defaultCollapsed：读取目标既有开关或明确采用新版默认值。

需要字符串图标时在项目适配层转成 ReactElement。随包的 components/MenuIcon.tsx 与 menu-icons.json 提供 WMS 同系列的本地线性图形（含 gc-shezhi、gc-cangchupeizhi、gc-wenjianzhongxin 等）；用 isPageLayoutMenuIconName 判断 gc-* 名称，未知名称按目标原解析器处理，不能只识别 ControlOutlined 就静默丢弃其他图标。保留目标实际图标含义和明确自定义 ReactElement，旧的通用占位图标可按菜单含义映射到同系列图标；不能把仓库图标套给内容管理。

部分 Umi 路由 icon 字段会参与 Ant Design 图标代码生成，先核对生成规则；运行时还可能把字符串变成 ReactElement，映射时同时识别原始名称与对应组件类型，并保留明确的自定义图标。必要时在项目适配层映射，保留 Router 的原字段；浏览器必须确认最终 SVG 已变化，不能只检查源路由字符串。不要把源项目 iconfont CDN 地址、接口或机器路径带入模板，也不要为此升级路由框架。

menu-visual.less 与模板 index.less 一起接入：WMS 普通项 #5d5f67、一级菜单 rgba(0,0,0,.65)、选中项 #2d75d2、底色 rgba(86,154,222,.1)。这些是菜单独立配色，不能从 Ant Design 的 text-color-secondary 或 primary 色透明度猜测；不要为改菜单而改变表单和按钮的全局文字色。展开、选中祖先、收起、hover、disabled 与 body 中的折叠浮层需要分别验收；比对底色前先把鼠标移出菜单，避免把 hover 色当作选中色。

顶部快捷搜索与内容卡片左边缘共用侧栏宽度基线，品牌名称较短或较长都不能推移搜索框。模板使用 --page-layout-current-sidebar-width、--page-layout-header-padding-x 和 --page-layout-header-gap 计算品牌占位，收起时同步宽度并在存在 Logo 时隐藏品牌标题。项目响应式样式调整 Header 左右内边距或左侧间距时，修改对应变量；在正常与收起状态以及窄屏中用实际边界坐标核对，不能只补固定 margin-left。

## 菜单搜索和路由权限

搜索只接收已经按权限过滤的菜单，因此不能显示无权限页面。模板会排除被自身或祖先禁用的节点，搜索通过菜单同一个 onClick 导航。

视觉菜单过滤不能代替路由守卫或后端鉴权。保留原有公开路由、菜单权限和按钮权限规则。调整页面路径时同步菜单、路由、组件路径、动态导入 glob、权限同步数据与权限码兼容；只为更换 Layout 目录时不改业务 URL。

## RouteTabs 与 KeepAlive

展示模板只留 tabs 插槽。复用目标项目最近访问记录与缓存控制，不复制参考项目 Store 和缓存初始化。

- 保留页签唯一性规则：按 path 去重的项目继续保留；不同 query 不自动变成多个标签。
- 保留跳转时 query/state 的恢复、关闭当前页后的回退、关闭标签时的缓存释放和拖拽规则。
- 检查 query/state 是否需要刷新缓存，以项目原有行为为准；不要把整个 state 一律 JSON.stringify 后存入持久化 Store。
- 使用 location.state 时不能沿用会丢失 state 的缓存路径；现有项目通过绕过 KeepAlive 处理时保持该约定。
- 只在需要刷新时调用目标已有 refreshScope/dropScope，不能每次渲染强制销毁页面。

BaseTabs 属于组件库，可以作为 RouteTabs 的渲染器；路由信息、缓存和导航仍由项目代码拥有。

## 滚动和主题

- contentScroll="container"：内容容器滚动，适用于普通页面。
- contentScroll="child"：容器不滚动，子页面负责滚动，适用于自己管理高度的列表与 KeepAlive。
- BaseList.fitViewport 开启时，检查从 Layout 到 BasePage 的 flex、高度和 min-height 链；KeepAlive 自身不代表所有页面都必须固定表体高度。
- 禁止同时让 body、Layout 内容和表体承担同一段滚动。窄屏、少量数据、长筛选、页签和分页都需要检查。
- 保留目标主题入口及颜色真源；需要新 UI 圆角/弹窗间距时从已安装组件与目标主题核对，不整份复制参考项目的 global.less。

## 我的应用（必接）

新版 Header 必须包含我的应用，旧系统没有时也要补接。复制 components/ApplicationPanel.tsx、utils/applications.ts 与 application-panel.less，通过 applicationPanel={{ loadApplications }} 接入 Shell。该面板按首次打开加载，支持名称搜索、关闭清空搜索、成功结果在本实例缓存、失败重试及 Escape 关闭并返回焦点；加载中不显示空态，关闭后的过期响应不覆盖新请求。

已核实的甘草用户中心契约是 POST /user/system/getAllSys，列表字段为 sysName/sysUrl/icon，标识可取 sysId/id；目标请求层通常已解包 data。优先复用目标用户中心封装的环境地址、uc-token 和登录失效处理；不从其他系统复制域名、令牌、请求 Store 或整套请求层。若目标使用不同接口/字段，由项目适配层映射为 PageLayoutApplicationItem[]，没有真实契约时记录受阻，不伪造应用、不吞异常返回空数组。

normalizePageLayoutApplications 接受已解包数组或 { list }，支持 sysName/sysUrl 与 name/url 字段，保留 HTTP(S) 应用地址、图标和原 hash/query。错误顶层结构及全无有效地址的结果进入失败态。已有等价面板可复用并补齐验证，不能重复新增入口；若目标已内置布尔开关，保留其真实数据实现，不强制改成随包 props。

实际打开并验证列表、搜索匹配与无结果、清空、关闭后重新打开、图标、新窗口链接 target/rel，以及窄屏双列、浮层最大高度和头部仍可使用。首次请求失败时显示重试，不能直接显示“暂无应用”。用户中心权限决定可见应用，不用本系统菜单权限树或 sysId 过滤替代应用列表权限。

## 其他头部平台功能

文件中心、其他启动器、消息和预发入口按项目既有功能接回，不能因为模板未包含就删除。确认其鉴权、字段、分页、下载/跳转、空态、loading 与异常反馈；使用目标请求封装。缺少契约时保留原功能或记录受阻。

这些已有功能可通过 headerActions/headerTrailingActions 接入；保留它们与我的应用、账户的原顺序和副作用。我的应用不意味着同时新增文件中心或其他平台功能。
