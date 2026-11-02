import { env } from '@/common/env';

type LogType = 'error' | 'request' | 'action' | 'href';
type LogSink = (event: { type: LogType; message?: string; path: string; time: string }) => void;
let sink: LogSink | undefined;

/** 日志仅允许白名单字段；供应商可由部署注入，不传用户 Store、header 或请求正文。 */
export function setLogSink(next: LogSink) {
  sink = next;
}

export function sendLog(type: LogType, value: unknown) {
  const message = value instanceof Error ? value.name : undefined;
  const path = window.location.hash.split('?')[0] || window.location.pathname;
  const event = { type, message, path, time: new Date().toISOString() };
  if (sink) sink(event);
  else if (env.DEV && type === 'error') console.error(event);
}
