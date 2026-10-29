export type PageLayoutApplicationItem = {
  key: string;
  name: string;
  url: string;
  icon?: string;
};

function text(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  return String(value).trim() || undefined;
}

function webUrl(value: unknown): string | undefined {
  const result = text(value);
  return result && /^(https?:)?\/\/[^\s]+$/i.test(result) ? result : undefined;
}

/** 接收目标请求层已解包的数据；格式异常应进入错误态，不能伪装成无应用。 */
export function normalizePageLayoutApplications(value: unknown): PageLayoutApplicationItem[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as { list?: unknown }).list)
      ? (value as { list: unknown[] }).list
      : undefined;
  if (!list) throw new Error('应用列表响应格式异常');

  const seen = new Set<string>();
  const applications = list.reduce<PageLayoutApplicationItem[]>((result, item) => {
    if (!item || typeof item !== 'object') return result;
    const entry = item as Record<string, unknown>;
    const name = text(entry.sysName ?? entry.name);
    const url = webUrl(entry.sysUrl ?? entry.url);
    const key = text(entry.key ?? entry.id ?? entry.sysId ?? url);
    if (!key || !name || !url || seen.has(key)) return result;
    seen.add(key);
    result.push({ key, name, url, icon: webUrl(entry.icon) });
    return result;
  }, []);
  if (list.length && !applications.length) throw new Error('应用列表中没有有效的应用地址');
  return applications;
}
