import { request, uploadFile as uploadFileBase } from '@base-web-kits/base-tools-web';
import {
  setRequestConfig, requestGapi, requestHyperf, requestJava,
  requestUc as requestUcBase, uploadGapi, uploadOSSAdmin,
} from '@gancao-web/request';
import type { HostConfig, RequestConfig, RequestConfigGapi, UploadOptionGapi } from '@gancao-web/request';
import type { UploadTask } from '@base-web-kits/base-tools-web';
import type { BaseUploadConfig } from '@gancao-web/base-element-react';
import { getStateUser } from '@/hooks/useStoreUser';
import { env } from '@/common/env';

const hosts = (development: string, test: string, production: string): HostConfig => ({
  development, test, production, pre: production,
});
const gapiHost = hosts('/api', env.VITE_APP_HOST_GAPI_TEST, env.VITE_APP_HOST_GAPI_PROD);
const uploadHost = hosts('/gancaoapi', env.VITE_APP_HOST_GAPI_OUTER_TEST, env.VITE_APP_HOST_GAPI_OUTER_PROD);
const ucHost = hosts('/ucapi', env.VITE_APP_HOST_UC_TEST, env.VITE_APP_HOST_UC_PROD);
const javaHost = hosts('/clientapi', env.VITE_APP_HOST_JAVA_TEST, env.VITE_APP_HOST_JAVA_PROD);

/** 启动时配置唯一 SDK 执行链；身份回调在每次请求时读取，支持重新登录和换号。 */
export function initializeRequest() {
  setRequestConfig({
    request, uploadFile: uploadFileBase, env: env.VITE_APP_ENV, proxy: true, showLoading: false,
    header: () => {
      const { token, gapi_token, sso_token } = getStateUser();
      return { token, gapi_token, uc_token: sso_token };
    },
    data: () => {
      const { mid, username } = getStateUser();
      return { mid, m_name: username };
    },
  });
}

/** 无 url 的既有 package/class 调用保持 GAPI，业务 payload 不在框架层改写。 */
export function requestApi<T = any>(config: Omit<RequestConfig, 'AK'> & { AK?: RequestConfigGapi['AK'] }) {
  if (!config.url) return requestGapi<T>({ AK: env.VITE_APP_GAPI_AK, host: gapiHost, ...config });
  if (env.VITE_APP_API_MODE === 'gapis') return requestHyperf<T>({ AK: env.VITE_APP_GAPI_AK, ...config });
  return requestJava<T>({ name: 'requestJava', host: javaHost, ...config });
}

export function requestUc<T = any>(config: RequestConfig) {
  // SDK 只给对象 data 注入 sysId；无业务参数的应用列表也须发送空对象。
  return requestUcBase<T>({ ...config, data: config.data ?? {}, host: ucHost, sysId: env.VITE_APP_ID });
}

/** 主图、附件和 Braft 共用上传协议，组件回调支持进度与取消。 */
export async function uploadFile(config: BaseUploadConfig & UploadOptionGapi) {
  const { onProgress, setAbort, ...other } = config;
  const uploadConfig = {
    onTaskReady(task: UploadTask) {
      task.onProgressUpdate((event) => onProgress?.({ ...event, percent: event.progress }));
      setAbort?.(() => task.abort());
    },
  };
  const result = env.VITE_APP_API_MODE === 'java'
    ? await uploadOSSAdmin({ ...other, sysId: env.VITE_APP_ID }, uploadConfig)
    : await uploadGapi({ host: uploadHost, ...other }, uploadConfig);
  if (!result.url) throw new Error('上传未返回文件地址');
  return {
    ...result,
    // GAPI 的 name 是 OSS 对象名，文件 host 以目标应用配置为准。
    url: fileUrl(env.VITE_APP_API_MODE === 'gapis' && result.name ? result.name : result.url),
  };
}

export function fileUrl(path: string) {
  if (/^(https?:)?\/\//i.test(path)) return path;
  return env.VITE_APP_HOST_FILE.replace(/\/$/, '') + '/' + path.replace(/^\/+/, '');
}
