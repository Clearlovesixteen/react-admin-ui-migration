import { useEffect, useState } from 'react';
import { Button, Modal } from 'antd';
import { currentEnv, currentVersion, manifestUrl } from 'virtual:app-version';
import { compareVersions } from '@/common/appVersion.js';
import type { AppVersion } from '@/common/appVersion.js';
import { watchAppVersion } from './check.js';

/** 项目级发布提示，不进入通用 PageLayout Shell 或组件库。 */
export default function VersionUpdate() {
  const [latest, setLatest] = useState<AppVersion | null>(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => watchAppVersion({
    url: manifestUrl, currentVersion, env: currentEnv,
    enabled: !import.meta.env.DEV, onUpdate: setLatest,
  }), []);
  const required = latest !== null && compareVersions(currentVersion, latest.minVersion) < 0;
  const refresh = () => window.location.reload();
  return <>
    {latest && !required && <Button type="ghost" danger size="small" onClick={() => setConfirming(true)}>更新</Button>}
    <Modal
      title="系统更新" open={latest !== null && (required || confirming)}
      closable={!required} maskClosable={!required} keyboard={!required} zIndex={10000}
      onOk={refresh} onCancel={() => setConfirming(false)} okText="立即更新" cancelText="取消"
      footer={required ? <Button type="primary" onClick={refresh}>立即更新</Button> : undefined}
    >
      系统已更新至 {latest?.version}，刷新后可使用新功能<br />刷新将丢失未保存的内容
    </Modal>
  </>;
}
