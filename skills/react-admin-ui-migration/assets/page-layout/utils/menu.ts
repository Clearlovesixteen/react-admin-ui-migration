import type { PageLayoutMenuItem, PageLayoutMenuLabel } from '../types';

export type PageLayoutMenuIndex = {
  /** 已移除重复 key 的稳定菜单树。 */
  menuItems: PageLayoutMenuItem[];
  nodeByKey: Map<string, PageLayoutMenuItem>;
  ancestorKeysByKey: Map<string, string[]>;
  parentKeys: string[];
  effectiveDisabledKeys: Set<string>;
  duplicateKeys: string[];
};

export type CreatePageLayoutMenuIndexOptions = {
  /** 测试或宿主可接管重复 key 报告；传入后不再调用 console.warn。 */
  onDuplicateKey?: (key: string) => void;
};

export type PageLayoutMenuSearchItem = {
  key: string;
  label: PageLayoutMenuLabel;
  labelText: string;
  fullLabel: string;
  searchText: string;
  onClick: () => void;
};

function isDevelopment() {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: { NODE_ENV?: string } };
  };
  return runtime.process?.env?.NODE_ENV !== 'production';
}

function reportDuplicateKey(key: string, options?: CreatePageLayoutMenuIndexOptions) {
  if (options?.onDuplicateKey) {
    options.onDuplicateKey(key);
  } else if (isDevelopment()) {
    globalThis.console.warn(`[PageLayout] duplicate menu key ignored: ${key}`);
  }
}

/**
 * 建立菜单索引并保留每个 key 第一次出现的节点。
 * 后续重复节点连同其子树一并忽略，避免 React key 告警和选中状态歧义。
 */
export function createPageLayoutMenuIndex(
  menuItems: ReadonlyArray<PageLayoutMenuItem>,
  options?: CreatePageLayoutMenuIndexOptions,
): PageLayoutMenuIndex {
  const seenKeys = new Set<string>();
  const duplicateKeys: string[] = [];

  function normalize(items: ReadonlyArray<PageLayoutMenuItem>): PageLayoutMenuItem[] {
    const result: PageLayoutMenuItem[] = [];

    for (const item of items) {
      if (seenKeys.has(item.key)) {
        duplicateKeys.push(item.key);
        reportDuplicateKey(item.key, options);
        continue;
      }
      seenKeys.add(item.key);

      const normalizedChildren = normalize(item.children ?? []);
      const { children: _children, ...node } = item;
      result.push(
        normalizedChildren.length
          ? {
              ...node,
              children: normalizedChildren,
            }
          : node,
      );
    }

    return result;
  }

  const normalizedMenuItems = normalize(menuItems);
  const nodeByKey = new Map<string, PageLayoutMenuItem>();
  const ancestorKeysByKey = new Map<string, string[]>();
  const parentKeys: string[] = [];
  const effectiveDisabledKeys = new Set<string>();

  function indexItems(
    items: ReadonlyArray<PageLayoutMenuItem>,
    ancestorKeys: string[] = [],
    ancestorDisabled = false,
  ) {
    for (const item of items) {
      const disabled = ancestorDisabled || item.disabled === true;
      nodeByKey.set(item.key, item);
      ancestorKeysByKey.set(item.key, ancestorKeys);
      if (disabled) effectiveDisabledKeys.add(item.key);

      if (item.children?.length) {
        parentKeys.push(item.key);
        indexItems(item.children, [...ancestorKeys, item.key], disabled);
      }
    }
  }

  indexItems(normalizedMenuItems);

  return {
    menuItems: normalizedMenuItems,
    nodeByKey,
    ancestorKeysByKey,
    parentKeys,
    effectiveDisabledKeys,
    duplicateKeys,
  };
}

/** ReactNode 不一定是文本，复杂标签只使用调用方显式提供的 keyword。 */
export function getPageLayoutMenuLabelText(item: PageLayoutMenuItem): string {
  if (typeof item.label === 'string' || typeof item.label === 'number') {
    return String(item.label);
  }

  return item.keywords?.find((keyword) => keyword.trim())?.trim() ?? '';
}

/** 只把实际可点击且未被自身/祖先禁用的叶子暴露给菜单搜索。 */
export function createPageLayoutMenuSearchItems(
  index: PageLayoutMenuIndex,
): PageLayoutMenuSearchItem[] {
  const result: PageLayoutMenuSearchItem[] = [];

  function visit(items: ReadonlyArray<PageLayoutMenuItem>, parentLabels: string[] = []) {
    for (const item of items) {
      const labelText = getPageLayoutMenuLabelText(item);
      const labels = labelText ? [...parentLabels, labelText] : parentLabels;

      if (item.children?.length) {
        visit(item.children, labels);
        continue;
      }

      if (index.effectiveDisabledKeys.has(item.key) || typeof item.onClick !== 'function') {
        continue;
      }

      const fullLabel = labels.join(' > ');
      const searchText = [fullLabel, ...(item.keywords ?? [])].join('\n').toLocaleLowerCase();
      result.push({
        key: item.key,
        label: item.label,
        labelText,
        fullLabel,
        searchText,
        onClick: item.onClick,
      });
    }
  }

  visit(index.menuItems);
  return result;
}

export function filterPageLayoutMenuSearchItems(
  items: ReadonlyArray<PageLayoutMenuSearchItem>,
  keyword: string,
): PageLayoutMenuSearchItem[] {
  return items.filter((item) => isPageLayoutMenuSearchMatch(item.searchText, keyword));
}

export function isPageLayoutMenuSearchMatch(searchText: string, keyword: string): boolean {
  const normalizedKeyword = keyword.trim().toLocaleLowerCase();
  return !normalizedKeyword || searchText.includes(normalizedKeyword);
}

function normalizeParentKeys(index: PageLayoutMenuIndex, keys: ReadonlyArray<string>): string[] {
  const parentKeySet = new Set(index.parentKeys);
  return [...new Set(keys.filter((key) => parentKeySet.has(key)))];
}

function getSelectedAncestorKeys(index: PageLayoutMenuIndex, selectedKey?: string): string[] {
  if (!selectedKey || !index.nodeByKey.has(selectedKey)) return [];
  return normalizeParentKeys(index, index.ancestorKeysByKey.get(selectedKey) ?? []);
}

export function getInitialPageLayoutOpenKeys(
  index: PageLayoutMenuIndex,
  selectedKey: string | undefined,
  defaultOpenAll: boolean,
): string[] {
  return defaultOpenAll ? [...index.parentKeys] : getSelectedAncestorKeys(index, selectedKey);
}

/** 路由切换时定位选中项；找不到选中项时保留用户已有展开状态。 */
export function reconcilePageLayoutOpenKeys(
  index: PageLayoutMenuIndex,
  currentOpenKeys: ReadonlyArray<string>,
  selectedKey: string | undefined,
  openAll: boolean,
): string[] {
  const current = normalizeParentKeys(index, currentOpenKeys);
  if (!selectedKey || !index.nodeByKey.has(selectedKey)) return current;

  const ancestorKeys = getSelectedAncestorKeys(index, selectedKey);
  return openAll ? normalizeParentKeys(index, [...current, ...ancestorKeys]) : ancestorKeys;
}

/**
 * 单开模式保留目标完整祖先链；多开模式只增减目标分支。
 * 关闭父级时同步移除所有后代 open key，避免隐藏状态残留。
 */
export function togglePageLayoutOpenKey(
  index: PageLayoutMenuIndex,
  currentOpenKeys: ReadonlyArray<string>,
  targetKey: string,
  openAll: boolean,
): string[] {
  const current = normalizeParentKeys(index, currentOpenKeys);
  if (!index.parentKeys.includes(targetKey)) return current;

  if (current.includes(targetKey)) {
    return current.filter(
      (key) => key !== targetKey && !(index.ancestorKeysByKey.get(key) ?? []).includes(targetKey),
    );
  }

  const targetPath = [...getSelectedAncestorKeys(index, targetKey), targetKey];
  return openAll
    ? normalizeParentKeys(index, [...current, ...targetPath])
    : normalizeParentKeys(index, targetPath);
}
