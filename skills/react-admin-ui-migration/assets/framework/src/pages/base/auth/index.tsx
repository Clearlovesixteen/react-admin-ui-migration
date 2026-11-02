import { useEffect, useRef, useState } from 'react';
import { Alert, Button, message } from 'antd';
import menus from '@/router/menus';
import { useStoreAuth } from '@/hooks/useStoreAuth';
import { apiAuthSave } from './api';
import { buildPermissionList } from './permissions';

/** 保留旧权限页进入后同步的行为；验收必须 mock 写接口，不访问真实同步页。 */
export default function AuthUpload() {
  const [auth] = useStoreAuth();
  const [loading, setLoading] = useState(false);
  const permissions = buildPermissionList(menus, auth.menuAuth);
  const started = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    if (auth.status !== 'ready' || started.current) return;
    started.current = true;
    void saveRef.current();
  }, [auth.status]);
  async function save() {
    setLoading(true);
    try {
      await apiAuthSave(permissions);
      message.success('权限同步成功');
    } catch {
      // SDK 已展示失败原因，保持预览并允许再次提交。
    } finally {
      setLoading(false);
    }
  }
  return <section className="admin-auth-upload">
    <Alert type="info" message="本地菜单权限同步" />
    <pre>{JSON.stringify(permissions, null, 2)}</pre>
    <Button type="primary" loading={loading} onClick={() => void save()}>同步权限</Button>
  </section>;
}
