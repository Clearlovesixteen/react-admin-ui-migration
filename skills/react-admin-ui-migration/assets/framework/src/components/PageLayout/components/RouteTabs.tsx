import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAliveController } from 'react-activation';
import { BaseTabs } from '@gancao-web/base-element-react';
import { useRouteHistory, removeRoute } from '@/hooks/useRouteHistory';
import { href } from '@/common/util';

/**
 * 最近访问的路由
 * 1. 显示最近访问的路由
 * 2. 点击会恢复最近访问的路由
 * 3. 相同路径,不同参数会覆盖最近的路由参数 (只存在一条相同路径记录)
 * 4. 与路由缓存无关 (无论是否开启缓存都会保持访问记录)
 */
const RouteTabs = (props: { className?: string }) => {
  const location = useLocation();
  const { dropScope, refreshScope } = useAliveController();
  const [routeHistory] = useRouteHistory();
  const len = routeHistory.routes.length;
  const curPath = location.pathname;
  const routeEffectRef = useRef({ locationSearch: location.search, refreshScope, routeHistory });
  routeEffectRef.current = { locationSearch: location.search, refreshScope, routeHistory };

  // 参数不一样,则刷新缓存 (路由页面会先触发useActivate,再执行useEffect)
  useEffect(() => {
    const { locationSearch, refreshScope, routeHistory } = routeEffectRef.current;
    const curHistory = routeHistory.routes.find((item) => item.path === curPath);
    if (curHistory && curHistory.search !== locationSearch) {
      refreshScope(curPath); // https://github.com/CJY0208/react-activation/blob/master/README_CN.md
    }
  }, [curPath, location.search]);

  // 无路由则不渲染
  if (len === 0) return null;

  // 路由项
  const items = routeHistory.routes.map((item) => ({ label: item.name, value: item.path }));

  return (
    <BaseTabs
      {...props}
      type="editable-card"
      hideAdd
      size="small"
      activeKey={curPath}
      lib={items}
      draggable
      onChange={(key) => {
        // 恢复最近访问的路由记录
        const route = routeHistory.routes.find((item) => item.path === key);
        if (route) href(`${route.path}${route.search || ''}`, { state: route.state });
      }}
      onEdit={(targetKey, action) => {
        if (action === 'remove') {
          const path = targetKey as string;
          const newRoutes = removeRoute(path); // 移除路由
          dropScope(path); // 移除keepalive缓存
          // 删除当前路由,返回前一页 (不采用history.back否则可能会重复打开已关闭的页面)
          if (newRoutes && path === curPath) {
            const last = newRoutes[newRoutes.length - 1];
            href(last ? last.path + last.search : '/welcome', { state: last?.state });
          }
        }
      }}
    />
  );
};

export default RouteTabs;
