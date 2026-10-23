import type { CSSProperties, ReactElement, ReactNode } from 'react';
import type { MenuProps } from 'antd';

/** Layout 菜单可显示的非空标签。 */
export type PageLayoutMenuLabel = Exclude<ReactNode, null | undefined | boolean>;

/**
 * 与路由无关的菜单节点。
 * 权限过滤、路由跳转和业务 icon 字符串转换由 PageLayout 入口完成。
 */
export type PageLayoutMenuItem = {
  key: string;
  label: PageLayoutMenuLabel;
  icon?: ReactElement;
  keywords?: string[];
  disabled?: boolean;
  children?: PageLayoutMenuItem[];
  onClick?: () => void;
};

/** Header 账户区域的展示数据，所有业务副作用仍由菜单回调处理。 */
export type PageLayoutAccount = {
  name: ReactNode;
  icon?: ReactElement;
  suffixIcon?: ReactElement;
  menuItems?: MenuProps['items'];
};

/** 当前项目 PageLayout 的静态展示配置。 */
export type PageLayoutConfig = {
  brandLogo?: string | ReactNode;
  brandTitle?: ReactNode;
  background?: CSSProperties['background'];
  menuSearch?: boolean;
  menuSearchPlaceholder?: string;
  defaultOpenAll?: boolean;
  defaultCollapsed?: boolean;
  collapsedStorageKey?: string | false;
  contentTransition?: boolean;
};

/** Layout 与子页面之间明确的滚动责任。 */
export type PageLayoutContentScroll = 'container' | 'child';

/** PageLayout 内部 Shell 属性，不属于 base-element-react 的公开 API。 */
export type PageLayoutShellProps = PageLayoutConfig & {
  menuItems: PageLayoutMenuItem[];
  selectedKey?: string;
  /** 项目 Header 扩展，由目标项目提供真实功能。 */
  headerActions?: ReactNode[];
  /** 项目 Header 尾部扩展。 */
  headerTrailingActions?: ReactNode[];
  account?: PageLayoutAccount;
  tabs?: ReactNode;
  contentScroll?: PageLayoutContentScroll;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};
