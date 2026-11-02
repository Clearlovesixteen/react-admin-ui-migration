import type { PageLayoutConfig } from './types';

export type PageLayoutDefaultConfig = Required<
  Pick<
    PageLayoutConfig,
    | 'menuSearch'
    | 'menuSearchPlaceholder'
    | 'defaultOpenAll'
    | 'defaultCollapsed'
    | 'collapsedStorageKey'
    | 'contentTransition'
  >
>;

/** 单一正式 Layout 的内置行为默认值。 */
export const defaultPageLayoutConfig: Readonly<PageLayoutDefaultConfig> = Object.freeze({
  menuSearch: true,
  menuSearchPlaceholder: '快捷查找功能',
  defaultOpenAll: false,
  defaultCollapsed: false,
  collapsedStorageKey: false,
  contentTransition: true,
});

const pageLayoutConfigKeys: ReadonlyArray<keyof PageLayoutConfig> = Object.freeze([
  'brandLogo',
  'brandTitle',
  'background',
  'menuSearch',
  'menuSearchPlaceholder',
  'defaultOpenAll',
  'defaultCollapsed',
  'collapsedStorageKey',
  'contentTransition',
]);

/**
 * Layout 只属于当前项目，不再进入 BaseElement 全局配置。
 * undefined 继承项目默认值；false、0 和空字符串仍是明确覆盖值。
 */
export function resolvePageLayoutConfig(config: PageLayoutConfig = {}): PageLayoutConfig {
  const result: PageLayoutConfig = { ...defaultPageLayoutConfig };

  for (const key of pageLayoutConfigKeys) {
    const value = config[key];
    if (value !== undefined) Object.assign(result, { [key]: value });
  }

  return result;
}
