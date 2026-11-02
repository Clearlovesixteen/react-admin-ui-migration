import React, { Suspense, lazy } from 'react';
import { AliveScope } from 'react-activation';
import { Route, Routes, unstable_HistoryRouter as HistoryRouter } from 'react-router-dom';
import { basename, history } from './history';
import routes from './routes';
import type { RouteMenu } from '@/types/route';
import AuthRoute from '@/components/AuthRoute';
import GuardRoute from '@/components/GuardRoute';
import RouteLoadBoundary from '@/components/RouteLoadBoundary';

// 保留 Route 标签及权限/缓存层级；在模块初始化时生成，保持 lazy 类型稳定。
const getRoutes = (routes: RouteMenu[] = [], parentKey = 'route'): React.ReactElement[] => {
  return routes.flatMap((item, index) => {
    // 同一页面可挂在不同路径；无 path 的布局/分组用树中位置标识，不用组件函数作为 key。
    const key = item.path || `${parentKey}-${index}`;
    // 菜单分组不对应页面，继续展开其子菜单生成路由。
    if (!item.component) return item.children ? getRoutes(item.children, key) : [];

    const Page = lazy(item.component);
    const element = (
      <AuthRoute route={item}>
        <RouteLoadBoundary key={key}>
          <Suspense fallback={null}>
            <Page />
          </Suspense>
        </RouteLoadBoundary>
      </AuthRoute>
    );
    if (item.children?.length) {
      // 嵌套路由的父路由 (不可设置path)
      return [
        <Route key={key} element={element}>
          {getRoutes(item.children, key)}
        </Route>,
      ];
    } else {
      // 非嵌套路由 或 子路由 (需设置path)
      const guard = <GuardRoute>{element}</GuardRoute>;

      return [<Route key={key} path={item.path} element={guard} />];
    }
  });
};

const routeElements = getRoutes(routes);

// 跳转路由: 统一使用 common/util 的 href
// 接收参数: 使用工具库的 getUrlParam, 代替 useSearchParams
const Router = () => {
  return (
    <HistoryRouter
      basename={basename}
      future={{ v7_startTransition: true, v7_relativeSplatPath: false }}
      history={history}
    >
      <AliveScope>
        <Routes>{routeElements}</Routes>
      </AliveScope>
    </HistoryRouter>
  );
};

export default Router;
