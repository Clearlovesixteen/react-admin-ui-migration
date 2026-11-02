/** 菜单组件 */
export type RouteMenu = {
  /** 名称 */
  name?: string;
  /** 图标 */
  icon?: React.ReactNode;
  /** 路由 */
  path?: string;
  /** 路由编码: 管理后台根据此编码分配权限, 默认根据path自动生成 (若path变动,想保持原来分配的权限,则设置为原来的code即可) */
  code?: string;
  /** 路由重定向 */
  redirect?: string;
  /** 路由组件加载函数：() => import(页面路径)，由路由入口统一包装 lazy。 */
  component?: () => Promise<{ default: React.ComponentType<any> }>;
  /** 子菜单 */
  children?: RouteMenu[];
  /**
   * 是否缓存, 默认false (文档 https://github.com/CJY0208/react-activation/blob/master/README_CN.md )
   * 当开启缓存后, 首次进入页面会触发一次useEffect, 再次显示页面时,都仅触发useActivate
   * 注: 1. 路由参数不一样,默认会刷新缓存,useEffect会再次触发; 2. 如需使用useActivate,则需setTimeout才能取到dom和ref; 3. 路由state不会缓存,因为无法及时更新
   */
  keepAlive?: boolean;
  /** 参数 */
  meta?: {
    /** 权限名称 (menus之外的不是菜单路由,通过按钮权限控制; 若路由需免登录,则设置false) */
    auth?: string | false;
  };
};
