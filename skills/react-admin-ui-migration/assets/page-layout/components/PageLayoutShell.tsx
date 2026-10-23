import { Children, Fragment, useEffect, useMemo, useState } from 'react';
import {
  DownOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Dropdown } from 'antd';
import { resolvePageLayoutConfig } from '../config';
import {
  createPageLayoutMenuIndex,
  getInitialPageLayoutOpenKeys,
  reconcilePageLayoutOpenKeys,
} from '../utils/menu';
import { readPageLayoutCollapsed, writePageLayoutCollapsed } from '../utils/storage';
import PageLayoutMenu from './Menu';
import PageLayoutMenuSearch from './MenuSearch';
import type { ReactElement, ReactNode } from 'react';
import type { PageLayoutAccount, PageLayoutConfig, PageLayoutShellProps } from '../types';
import '../index.less';

function joinClassNames(...classNames: Array<string | false | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function isRenderable(value: ReactNode): boolean {
  return value !== undefined && value !== null && typeof value !== 'boolean';
}

function isSameKeys(current: ReadonlyArray<string>, next: ReadonlyArray<string>) {
  return current.length === next.length && current.every((key, index) => key === next[index]);
}

function renderBrandLogo(brandLogo: PageLayoutConfig['brandLogo']) {
  if (typeof brandLogo === 'string') {
    return brandLogo ? <img className="page-layout-brand-image" src={brandLogo} alt="" /> : null;
  }
  return isRenderable(brandLogo) ? brandLogo : null;
}

function renderAccount(account: PageLayoutAccount): ReactElement {
  const hasMenu = Boolean(account.menuItems?.length);
  const icon = account.icon ?? <UserOutlined className="page-layout-account-icon" />;
  const suffixIcon =
    account.suffixIcon ??
    (hasMenu ? <DownOutlined className="page-layout-account-suffix" /> : null);
  const content = hasMenu ? (
    <button
      type="button"
      className="page-layout-account page-layout-account-button"
      aria-haspopup="menu"
    >
      {icon}
      <span className="page-layout-account-name">{account.name}</span>
      {suffixIcon}
    </button>
  ) : (
    <div className="page-layout-account">
      {icon}
      <span className="page-layout-account-name">{account.name}</span>
      {suffixIcon}
    </div>
  );

  if (!hasMenu) return content;

  return (
    <Dropdown menu={{ items: account.menuItems }} arrow placement="bottom" trigger={['click']}>
      {content}
    </Dropdown>
  );
}

/**
 * 当前项目 PageLayout 的展示 Shell。
 * 路由、权限、账户和平台接口仍由同一 PageLayout 模块负责，不进入组件库。
 */
function PageLayoutShell({
  menuItems,
  selectedKey,
  headerActions,
  headerTrailingActions,
  account,
  tabs,
  contentScroll = 'container',
  children,
  className,
  style,
  brandLogo,
  brandTitle,
  background,
  menuSearch,
  menuSearchPlaceholder,
  defaultOpenAll,
  defaultCollapsed,
  collapsedStorageKey,
  contentTransition,
}: PageLayoutShellProps) {
  const config = resolvePageLayoutConfig({
    brandLogo,
    brandTitle,
    background,
    menuSearch,
    menuSearchPlaceholder,
    defaultOpenAll,
    defaultCollapsed,
    collapsedStorageKey,
    contentTransition,
  });
  const openAll = config.defaultOpenAll === true;
  const storageKey = config.collapsedStorageKey ?? false;
  const menuIndex = useMemo(() => createPageLayoutMenuIndex(menuItems), [menuItems]);
  const [collapsed, setCollapsed] = useState(() =>
    readPageLayoutCollapsed(storageKey, config.defaultCollapsed === true),
  );
  const [openKeys, setOpenKeys] = useState(() =>
    getInitialPageLayoutOpenKeys(menuIndex, selectedKey, openAll),
  );

  useEffect(() => {
    setOpenKeys((current) => {
      const next = reconcilePageLayoutOpenKeys(menuIndex, current, selectedKey, openAll);
      return isSameKeys(current, next) ? current : next;
    });
  }, [menuIndex, openAll, selectedKey]);

  const actionNodes = Children.toArray([
    ...(headerActions ?? []),
    ...(headerTrailingActions ?? []),
  ]);
  const accountNode = account ? renderAccount(account) : null;
  const rootStyle = {
    background: config.background,
    ...style,
  };
  const hasBrandLogo =
    typeof config.brandLogo === 'string'
      ? config.brandLogo.length > 0
      : isRenderable(config.brandLogo);
  const hasBrandTitle = isRenderable(config.brandTitle);

  return (
    <div
      className={joinClassNames('page-layout', collapsed && 'is-collapsed', className)}
      style={rootStyle}
    >
      <header className="page-layout-header">
        <div className="page-layout-header-left">
          {(hasBrandLogo || hasBrandTitle) && (
            <div className="page-layout-brand">
              {hasBrandLogo && (
                <div className="page-layout-brand-logo">{renderBrandLogo(config.brandLogo)}</div>
              )}
              {hasBrandTitle && <div className="page-layout-brand-title">{config.brandTitle}</div>}
            </div>
          )}
          {config.menuSearch && (
            <PageLayoutMenuSearch
              menuItems={menuIndex.menuItems}
              menuIndex={menuIndex}
              placeholder={config.menuSearchPlaceholder}
            />
          )}
        </div>

        {(actionNodes.length > 0 || accountNode) && (
          <div className="page-layout-header-right">
            {actionNodes.map((action, index) => (
              <Fragment key={String((action as ReactElement).key ?? index)}>
                {index > 0 && <span className="page-layout-header-divider" aria-hidden="true" />}
                <div className="page-layout-header-action" data-action-index={index}>
                  {action}
                </div>
              </Fragment>
            ))}
            {accountNode && (
              <>
                {actionNodes.length > 0 && (
                  <span className="page-layout-header-divider" aria-hidden="true" />
                )}
                {accountNode}
              </>
            )}
          </div>
        )}
      </header>

      <div className="page-layout-main">
        <aside className="page-layout-sidebar" aria-label="侧边导航">
          <PageLayoutMenu
            menuItems={menuIndex.menuItems}
            menuIndex={menuIndex}
            selectedKey={selectedKey}
            openKeys={openKeys}
            openAll={openAll}
            collapsed={collapsed}
            onOpenKeysChange={setOpenKeys}
          />
          <div className="page-layout-collapse">
            <button
              type="button"
              className="page-layout-collapse-button"
              aria-label={collapsed ? '展开侧边菜单' : '收起侧边菜单'}
              aria-expanded={!collapsed}
              onClick={() => {
                setCollapsed((current) => {
                  const next = !current;
                  writePageLayoutCollapsed(storageKey, next);
                  return next;
                });
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>
        </aside>

        <main className="page-layout-content">
          {isRenderable(tabs) && <div className="page-layout-tabs">{tabs}</div>}
          <div
            className={joinClassNames(
              'page-layout-content-body',
              contentScroll === 'child' ? 'is-scroll-child' : 'is-scroll-container',
              config.contentTransition && 'has-transition',
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default PageLayoutShell;
