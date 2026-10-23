# 项目级 PageLayout 接入

## 随包资产与依赖

`assets/page-layout/` 是可复制的展示模板，基于当前 UI 的 Shell、Menu、MenuSearch、菜单索引和折叠存储提取。只依赖 React、Ant Design 4、@ant-design/icons 和 Less；没有业务别名、固定业务 API、用户 Store、Router 或品牌图片。

模板没有业务入口 index.tsx，也没有 FileCenter、ApplicationPanel、RouteTabs 和 menu.tsx；这些入口涉及目标项目的数据和导航契约，须用其现有实现适配。模板中的 headerActions/headerTrailingActions 是纯展示插槽，不意味着组件库提供平台功能。

将整个 page-layout 目录复制到目标项目现有 Layout 位置（例如 src/components/PageLayout），然后生成项目入口。已有同名文件先阅读合并，不直接整目录覆盖。

复制后清点 import 闭包，保留目标项目自己的 brandLogo、brandTitle、背景和菜单图标。模板使用 Ant Design 主题变量，Less 入口已移除 Vite 专属的波浪线别名；目标构建仍需支持 Less 及其既有 antd 主题配置。

## 项目入口

下面描述入口契约，不是可以照抄的业务文件：

~~~tsx
<PageLayoutShell
  menuItems={accessibleMenuItems}
  selectedKey={currentMenuKey}
  brandLogo={targetLogo}
  brandTitle={targetTitle}
  account={{ name: username, menuItems: accountItems }}
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

需要字符串图标时在项目适配层转成 ReactElement；不要把源项目 iconfont 地址或机器路径带入模板。

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

## 头部平台功能

文件中心、我的应用、启动器、消息和预发入口属于项目。原来存在的功能必须在新 Header 接回，不能因为模板未包含就删除。

按目标接口确认鉴权、字段、搜索、分页、下载/跳转、空态、loading 与异常反馈；使用目标请求封装。缺少契约时保留原功能或记录受阻，不复制参考系统接口，也不实现返回空数组的假适配器。

已有功能可以通过 headerActions 接入纯展示模板。若目标项目已把平台组件做成 Layout 内置布尔开关，则保留目标实现，不为了模仿模板而改成另一套公共 API。
