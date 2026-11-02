import { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { env, isAuthOpen, showRouteTabs } from '@/common/env';
import { href, getRouteUrl } from '@/common/util';
import { logout, useStoreUser } from '@/hooks/useStoreUser';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { addRoute } from '@/hooks/useRouteHistory';
import menus from '@/router/menus';
import { findMenuByPath, mergeMenuMetadata } from '@/router/menuMetadata';
import PageLayoutShell from './components/PageLayoutShell';
import RouteTabs from './components/RouteTabs';
import PageLayoutFileCenter from './components/FileCenter';
import { buildLayoutMenu, getSelectedMenuKey } from './routes';
import { requestPageLayoutApplications } from './applications';
import { requestPageLayoutFiles } from './files';
import type { MenuNavigation } from './routes';
import { renderRouteIcon } from './routeIcon';
import './project.less';
import './file-center.less';

function navigate({ path, target }: MenuNavigation) {
  if (target && target !== '_self') window.open(getRouteUrl(path), target, 'noopener,noreferrer');
  else href(path);
}

/** 项目适配器连接 Router/Store；保留已验证的展示 Shell 和所有 UI 修复。 */
export default function PageLayout() {
  const location = useLocation();
  const [user] = useStoreUser();
  const [auth] = useStoreAuth();
  const menuItems = useMemo(() => {
    const routes = mergeMenuMetadata(menus, auth.menuAuth);
    const access = Object.fromEntries(auth.menuAuth.map((row) => [row.code, true]));
    if (isAuthOpen) {
      function defaults(items: typeof menus) {
        for (const item of items) {
          if (item.code && !(item.code in access)) access[item.code] = false;
          if (item.children) defaults(item.children);
        }
      }
      defaults(menus);
    }
    return buildLayoutMenu(routes, access, navigate, renderRouteIcon);
  }, [auth.menuAuth]);
  useEffect(() => {
    if (!showRouteTabs) return;
    const menu = findMenuByPath(menus, location.pathname);
    if (menu?.name && menu.path) addRoute({
      path: menu.path, name: menu.name, search: location.search, state: location.state,
    });
  }, [location.key, location.pathname, location.search, location.state]);
  return (
    <PageLayoutShell
      menuItems={menuItems}
      selectedKey={getSelectedMenuKey(menuItems, location.pathname)}
      brandLogo={env.BASE_URL + env.VITE_APP_ICON}
      brandTitle={env.VITE_APP_NAME}
      background="linear-gradient(180deg, #eaf0fc 0%, #f2f5f7 100%)"
      defaultCollapsed={window.innerWidth < 768}
      collapsedStorageKey={false}
      applicationPanel={{ loadApplications: requestPageLayoutApplications }}
      headerActions={[<PageLayoutFileCenter key="files" loadFiles={requestPageLayoutFiles} />]}
      account={{ name: user.username, menuItems: [{ key: 'logout', label: '退出登录', onClick: logout }] }}
      tabs={showRouteTabs ? <RouteTabs /> : undefined}
      contentScroll={findMenuByPath(menus, location.pathname)?.component ? 'child' : 'container'}
    >
      <Outlet />
    </PageLayoutShell>
  );
}
