import menus from './menus';
import type { RouteMenu } from '@/types/route';
const routes: RouteMenu[] = [
  { path: '/', component: () => import('@/pages/base/login'), meta: { auth: false } },
  { component: () => import('@/components/PageLayout'), children: [
    { path: '/welcome', component: () => import('@/pages/base/welcome') },
    { path: '/auth', component: () => import('@/pages/base/auth') },
    ...menus,
  ] },
  { path: '/403', component: () => import('@/pages/base/403') },
  { path: '*', component: () => import('@/pages/base/404'), meta: { auth: false } },
];
export default routes;
