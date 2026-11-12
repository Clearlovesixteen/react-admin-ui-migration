# 亮暗外框与用户偏好

新旧项目迁移都需要接入亮/暗色调切换；已有等价能力时复用并核对以下行为，不重复显示开关。视觉源为 MES 的导航外框：暗色背景 #1d2c42、文字 #ced7e5、菜单选中 #2d75d2。业务表单、表格、账户/文件中心面板和业务弹窗保持原浅色主题；仅导航折叠菜单和快捷搜索 portal 随外框变暗。不使用全局 invert/filter，也不把它描述为全站暗色。

## 偏好契约

- 无记录、无效记录或读取异常时默认 **light**，不跟随系统暗色设置；读取默认值不写入存储。
- 用户手动选择后立即更新并保存；刷新、关闭后重新进入、退出再登录均保留选择。初次渲染同步读取偏好，菜单 portal 属性在浏览器绘制前应用，不能先渲染亮色再异步切暗色。
- 偏好使用项目独立、稳定的 localStorage key，与用户/token/权限 Store 分离；退出登录不清除此键，避免 localStorage.clear()。默认是同一浏览器内当前应用的偏好，不声称跨设备或账号服务端同步。若目标已有按账号存储合同则沿用，账号未确定时不得覆盖旧记录。
- 已有有效 light/dark 选择必须保留。MES 使用 mes-layout-theme，迁移时继续传此键；随包读取函数同时兼容原始字符串和 JSON 字符串。其他旧编码先确认再适配，不盲目清空或重置为亮色。
- 存储被禁用或写入失败时，本次页面仍可切换；如实说明跨次恢复依赖浏览器允许保存，不让异常阻断业务。其他标签的同 key localStorage 变更可同步，忽略 sessionStorage/其他应用键。
- 切换只改变外框样式，不刷新页面，不用 theme 作为 Router/Outlet/KeepAlive 的 key；保留筛选、滚动、表单草稿和当前路由。

## 接入资源

`assets/page-layout/theme/` 提供 preference.js（纯存储边界及类型声明）、usePageLayoutTheme.ts、ThemeToggle.tsx 和 theme.less；完整框架资源已接入。独立 UI 迁移通过现有 Shell 插槽接入，不改组件库，不另建 Layout。

~~~tsx
import { usePageLayoutTheme } from './theme/usePageLayoutTheme';
import PageLayoutThemeToggle from './theme/ThemeToggle';
import './theme/theme.less';

// 位于项目 PageLayout 内；实际项目使用自身稳定 appId 或沿用已有偏好 key。
const [theme, setTheme] = usePageLayoutTheme('page-layout-theme:' + appId);

<PageLayoutShell
  className={`page-layout-theme-${theme}`}
  background={theme === 'dark' ? '#1d2c42' : originalLightBackground}
  headerTrailingActions={[
    ...existingTrailingActions,
    <PageLayoutThemeToggle key="theme" theme={theme} onChange={setTheme} />,
  ]}
  {...otherLayoutProps}
>
  {routeContent}
</PageLayoutShell>
~~~

示例变量须从真实适配器取得；合并原 className、背景、actions 和其余 props，避免展开对象覆盖 theme 的设置。usePageLayoutTheme 由单一正式 Layout 持有，不能为每个业务页或嵌套 Layout 重复创建全局主题控制器。保留本地已有的亮色品牌背景。theme.less 放在菜单视觉基础样式之后，检查其实际 CSS 顺序；保留 data-page-layout-theme 对 body 中菜单浮层的作用范围。组件包只有静态主题变量不代表具备这套用户偏好能力。

## 验证

在隔离存储下检查首次亮色 → 手动暗色 → 刷新/重新进入仍暗色 → 手动亮色 → 重进仍亮色。检查原 MES 已存 JSON 字符串、无效值、读写受限、其他项目 key、localStorage 跨标签同步及监听器清理。确认用户没有操作时不写入偏好。

真实运行检查开关名称、键盘 Space/Enter、焦点、浅暗两态、选中/展开/收起/disabled 菜单、菜单搜索和折叠 portal、窄屏头部。切换时保留输入内容；表格、表单和业务弹窗继续沿用原样式。开发模式和构建产物均核对。离线资源和单元测试不能替代目标项目的实际 UI 验收。
