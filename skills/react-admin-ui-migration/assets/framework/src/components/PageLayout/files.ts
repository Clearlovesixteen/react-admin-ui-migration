import { requestUc } from '@/common/request';
import { env } from '@/common/env';

export type PageLayoutFileItem = { key: string; name: string; time?: string; url?: string };
export type PageLayoutFileQuery = { pageNum: number; pageSize: number; keyword?: string };
export type PageLayoutFilePage = { list: PageLayoutFileItem[]; total: number };
type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

/** 格式异常应进入重试状态，不能把未接好的接口转换成“暂无文件”。 */
export function normalizeFilePage(value: unknown): PageLayoutFilePage {
  const data = record(value) ? value : undefined;
  const source = Array.isArray(value) ? value : data && [data.list, data.records, data.rows, data.dataList].find(Array.isArray);
  if (!Array.isArray(source)) throw new Error('文件中心响应格式异常');
  const list: PageLayoutFileItem[] = source.filter(record).flatMap((row, index) => {
    const name = text(row.fileName ?? row.name);
    if (!name) return [];
    const rawUrl = text(row.url);
    const url = /^(https?:)?\/\//i.test(rawUrl) ? rawUrl : undefined;
    return [{ key: text(row.id) || url || name + '-' + index, name, url, time: text(row.time) || undefined }];
  });
  const pageinfo = data && record(data.pageinfo) ? data.pageinfo : undefined;
  const rawTotal = data?.total ?? data?.count ?? pageinfo?.total ?? list.length;
  const total = Number(rawTotal);
  if (!Number.isFinite(total) || total < 0) throw new Error('文件中心总数格式异常');
  return { list, total };
}

export async function requestPageLayoutFiles(query: PageLayoutFileQuery) {
  const keyword = query.keyword?.trim() || undefined;
  const result = await requestUc({
    url: '/file/cross/export/page-list',
    data: { appId: env.VITE_APP_ID, status: 0, pageNum: query.pageNum, pageSize: query.pageSize, keyword, fileName: keyword },
  });
  return normalizeFilePage(result);
}
