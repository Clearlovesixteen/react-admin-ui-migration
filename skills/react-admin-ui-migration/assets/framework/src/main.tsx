import './polyfills';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, message } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import { getOS, setBaseToolsConfig } from '@base-web-kits/base-tools-web';
import BaseElement from '@gancao-web/base-element-react';
import { initializeRequest, requestApi, uploadFile } from '@/common/request';
import { env } from '@/common/env';
import { reLogin } from '@/hooks/useStoreUser';
import { sendLog } from '@/common/slsLog';
import Router from '@/router';
import 'uno.css';
import './global.less';

const os = getOS();
if (os === 'windows') document.documentElement.classList.add('is-windows');
if (os === 'ios' || os === 'macos') document.documentElement.classList.add('is-apple');
setBaseToolsConfig({
  toast: ({ msg, status }) => status === 'fail' ? message.error(msg) : message.success(msg),
  toLogin: reLogin,
  log: (level, data) => sendLog(data.name === 'request' ? 'request' : level === 'error' ? 'error' : 'action', data),
});
initializeRequest();
window.addEventListener('error', (event) => sendLog('error', event.error));
window.addEventListener('unhandledrejection', (event) => sendLog('error', event.reason));

// 保留 目标项目 的分页、空值、提交和滚动契约，不能用模板较少的默认值覆盖。
BaseElement.use({
  request: { http: (url, data, config) => requestApi({ url, data, ...config }), upload: uploadFile },
  file: { host: env.VITE_APP_HOST_FILE },
  list: {
    pageKey: 'pageNum', sizeKey: 'pageSize', listKey: 'list', totalKey: 'pageinfo.total',
    pageSize: 10, isFilterEmpty: false, isShowBtnTools: false,
    fitViewport: true, defaultCollapsed: true, layoutMode: 'grid', itemCol: 4, labelPosition: 'left',
    inset: true, itemBordered: true, colon: false, itemRight: 12, itemBottom: 14, padding: 0,
    btnsConfig: { align: 'left', type: 'default' },
  },
  table: { rowKey: 'id', operationAlign: 'left' },
});
createRoot(document.getElementById('root')!).render(
  <ConfigProvider locale={zhCN}><Router /></ConfigProvider>,
);
