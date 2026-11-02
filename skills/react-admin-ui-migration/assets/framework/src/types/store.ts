/** Store 配置 */
export type StoreConfig<T> = {
  /** 命名空间 (区分不同store之间的广播和缓存) */
  name: string;
  /** 全局状态 */
  state: T;
  /** 是否持久化, 缓存到localStorage (默认不缓存) */
  isPersist?: boolean;
};
