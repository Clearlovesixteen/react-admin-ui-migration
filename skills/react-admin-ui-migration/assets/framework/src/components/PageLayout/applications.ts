import { requestUc } from '@/common/request';
import { normalizePageLayoutApplications } from './utils/applications';

/** 应用列表沿用 目标项目 的真实 UC 鉴权和严格响应转换。 */
export async function requestPageLayoutApplications() {
  const data = await requestUc({ url: '/user/system/getAllSys' });
  return normalizePageLayoutApplications(data);
}
