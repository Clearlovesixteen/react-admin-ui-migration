import { useMemo, useState } from 'react';
import PageLayoutMenuIcon from './MenuIcon';
import { Popover } from 'antd';
import {
  createPageLayoutMenuIndex,
  getPageLayoutMenuLabelText,
  togglePageLayoutOpenKey,
} from '../utils/menu';
import type { PageLayoutMenuIndex } from '../utils/menu';
import type { PageLayoutMenuItem } from '../types';

export type PageLayoutMenuProps = {
  menuItems: PageLayoutMenuItem[];
  menuIndex?: PageLayoutMenuIndex;
  selectedKey?: string;
  openKeys: string[];
  openAll: boolean;
  collapsed: boolean;
  onOpenKeysChange: (keys: string[]) => void;
};

function PageLayoutMenu({
  menuItems,
  menuIndex,
  selectedKey,
  openKeys,
  openAll,
  collapsed,
  onOpenKeysChange,
}: PageLayoutMenuProps) {
  const [popupOpenKey, setPopupOpenKey] = useState<string>();
  const resolvedIndex = useMemo(
    () => menuIndex ?? createPageLayoutMenuIndex(menuItems),
    [menuIndex, menuItems],
  );
  const openKeySet = useMemo(() => new Set(openKeys), [openKeys]);
  const selectedAncestorSet = useMemo(
    () => new Set(resolvedIndex.ancestorKeysByKey.get(selectedKey ?? '') ?? []),
    [resolvedIndex, selectedKey],
  );

  function renderMenuItems(
    items: ReadonlyArray<PageLayoutMenuItem>,
    level: number,
    isPopup = false,
  ) {
    return (
      <div
        className={`page-layout-menu-level page-layout-menu-level-${level} ${
          isPopup ? 'is-popup' : ''
        }`}
        role={level === 1 ? 'tree' : 'group'}
      >
        {items.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const isOpen = isPopup || openKeySet.has(item.key);
          const isExpanded = collapsed && level === 1 ? popupOpenKey === item.key : isOpen;
          const isSelected = !hasChildren && selectedKey === item.key;
          const isSelectedBranch = isSelected || selectedAncestorSet.has(item.key);
          const isDisabled = resolvedIndex.effectiveDisabledKeys.has(item.key);
          const labelText = getPageLayoutMenuLabelText(item) || item.key;
          const icon =
            item.icon ??
            (level === 1 ? (
              <PageLayoutMenuIcon name="gc-quanbuyingyong" />
            ) : level >= 3 ? (
              <span className="page-layout-menu-dot" aria-hidden="true" />
            ) : null);

          const button = (
            <button
              type="button"
              className={`page-layout-menu-button ${hasChildren ? 'has-children' : 'is-leaf'} ${
                isOpen && hasChildren ? 'is-open' : ''
              } ${isSelected ? 'is-selected' : ''} ${isSelectedBranch ? 'has-selected-child' : ''}`}
              data-page-layout-menu-key={item.key}
              data-menu-level={level}
              disabled={isDisabled}
              aria-current={isSelected ? 'page' : undefined}
              aria-expanded={hasChildren ? isExpanded : undefined}
              aria-label={collapsed && level === 1 ? labelText : undefined}
              role="treeitem"
              onKeyDown={(event) => {
                // 折叠菜单的 Popover 是受控浮层；Ant Popover 不会自动响应 Escape。
                // 在触发器和浮层内任意菜单项上按 Escape 都只关闭浮层，不改变 openKeys。
                if (collapsed && event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  setPopupOpenKey(undefined);
                }
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (isDisabled) return;

                if (hasChildren) {
                  if (collapsed && level === 1) {
                    setPopupOpenKey(popupOpenKey === item.key ? undefined : item.key);
                    return;
                  }
                  if (!isPopup) {
                    onOpenKeysChange(
                      togglePageLayoutOpenKey(resolvedIndex, openKeys, item.key, openAll),
                    );
                  }
                  return;
                }

                item.onClick?.();
                if (isPopup) setPopupOpenKey(undefined);
              }}
            >
              <span className="page-layout-menu-button-main">
                {icon}
                <span className="page-layout-menu-label">{item.label}</span>
                {hasChildren && (
                  <PageLayoutMenuIcon name="gc-down" className="page-layout-menu-expand-icon" />
                )}
              </span>
            </button>
          );

          const itemContent = (
            <div
              key={item.key}
              className={`page-layout-menu-item ${isSelectedBranch ? 'is-selected-branch' : ''}`}
            >
              {button}
              {hasChildren &&
                isOpen &&
                (!collapsed || level !== 1) &&
                renderMenuItems(item.children ?? [], level + 1, isPopup)}
            </div>
          );

          if (!collapsed || level !== 1) return itemContent;

          return (
            <Popover
              key={item.key}
              placement="rightTop"
              trigger={['hover', 'focus', 'click']}
              overlayClassName="page-layout-menu-popup"
              open={popupOpenKey === item.key}
              onOpenChange={(open) => setPopupOpenKey(open ? item.key : undefined)}
              content={
                hasChildren ? (
                  renderMenuItems(item.children ?? [], level + 1, true)
                ) : (
                  <span className="page-layout-menu-popup-label">{item.label}</span>
                )
              }
            >
              <div className="page-layout-menu-collapsed-trigger">{itemContent}</div>
            </Popover>
          );
        })}
      </div>
    );
  }

  return (
    <nav className={`page-layout-menu ${collapsed ? 'is-collapsed' : ''}`} aria-label="主菜单">
      {renderMenuItems(resolvedIndex.menuItems, 1)}
    </nav>
  );
}

export default PageLayoutMenu;
