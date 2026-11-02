import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Alert, Button, Spin } from 'antd';
import { KeepAlive, useAliveController } from 'react-activation';
import { useStoreUser } from '@/hooks/useStoreUser';
import { useStoreAuth, loadAuth } from '@/hooks/useStoreAuth';
import { isAuthOpen, keepAlive } from '@/common/env';
import menus from '@/router/menus';
import { findMenuByPath, hasMenuAccess } from '@/router/menuMetadata';
import type { RouteMenu } from '@/types/route';

/** 登录、角色与缓存各自受控，关闭角色过滤不会关闭登录，也不会等待权限 API。 */
export default function AuthRoute({ children, route }: { children: JSX.Element; route: RouteMenu }) {
  const [user] = useStoreUser();
  const [auth] = useStoreAuth(route.meta?.auth !== false);
  const location = useLocation();
  const { dropScope } = useAliveController();
  const menu = findMenuByPath(menus, route.path || '');
  const cached = Boolean(menu && !location.state && (route.keepAlive ?? keepAlive));
  useEffect(() => {
    if (menu && !cached && route.path) void dropScope(route.path);
  }, [cached, menu, route.path, dropScope]);
  if (route.meta?.auth === false) return children;
  if (!user.token) {
    return <Navigate to={'/?from=' + encodeURIComponent(location.pathname + location.search)} replace />;
  }
  if (isAuthOpen && (menu || route.meta?.auth)) {
    if (auth.status === 'error') {
      return <Alert type="error" message="权限加载失败" action={<Button onClick={() => void loadAuth(true)}>重试</Button>} />;
    }
    if (auth.owner !== String(user.mid) + ':' + user.token || auth.status !== 'ready') {
      return <Spin className="admin-route-loading" />;
    }
    if (menu && !hasMenuAccess(menus, route.path!, auth.menuAuth)) return <Navigate to="/403" replace />;
    if (route.meta?.auth && !auth.btnAuth.some((row) => row.code === route.meta?.auth)) {
      return <Navigate to="/403" replace />;
    }
  }
  if (cached) {
    return <KeepAlive cacheKey={route.path} name={route.path}><div className="ka-scroll">{children}</div></KeepAlive>;
  }
  return children;
}
