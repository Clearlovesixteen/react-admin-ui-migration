import { compareVersions, isAppVersion } from '../../common/appVersion.js';

/** 单实例检查链；外部平台参数只用于隔离验证，不读取业务接口或身份。 */
export function watchAppVersion({ url, currentVersion, env, onUpdate, enabled = true }, platform = globalThis) {
  if (!enabled || !url) return () => {};
  let disposed = false;
  let active = null;
  let latest = null;
  const check = async () => {
    if (disposed || platform.document.visibilityState === 'hidden' || active) return;
    const request = new AbortController();
    active = request;
    const timeout = platform.setTimeout(() => request.abort(), 10_000);
    try {
      const target = new URL(url, platform.location.href);
      target.searchParams.set('_t', String(Date.now()));
      const response = await platform.fetch(target, { cache: 'no-store', signal: request.signal });
      if (!response.ok) return;
      const data = await response.json();
      if (disposed || request.signal.aborted || !isAppVersion(data) || data.env !== env
        || compareVersions(data.version, currentVersion) <= 0
        || (latest && compareVersions(data.version, latest.version) < 0)) return;
      latest = data;
      onUpdate(data);
    } catch {
      // 断网、超时或错误响应保持已有提示，下个周期再试，不影响业务请求。
    } finally {
      platform.clearTimeout(timeout);
      active = null;
    }
  };
  void check();
  const interval = platform.setInterval(check, 60_000);
  platform.document.addEventListener('visibilitychange', check);
  platform.addEventListener('online', check);
  return () => {
    disposed = true;
    platform.clearInterval(interval);
    active?.abort();
    platform.document.removeEventListener('visibilitychange', check);
    platform.removeEventListener('online', check);
  };
}
