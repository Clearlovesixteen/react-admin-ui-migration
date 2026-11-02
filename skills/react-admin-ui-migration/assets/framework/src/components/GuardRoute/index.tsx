import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { sendLog } from '@/common/slsLog';

/**
 * 路由守卫
 */
const GuardRoute = (props: { children: JSX.Element }) => {
  const { children } = props;
  const location = useLocation();

  useEffect(() => {
    const to = window.location.href;
    sendLog('href', { to });
  }, [location.key]);

  return children;
};

export default GuardRoute;
