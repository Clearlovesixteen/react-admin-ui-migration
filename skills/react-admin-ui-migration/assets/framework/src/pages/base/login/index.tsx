import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Spin } from 'antd';
import { exchangeLoginCode, apiManagerInfo } from './api';
import { beginSsoLogin, readLoginParams } from './navigation';
import { getStateUser, setStateUser } from '@/hooks/useStoreUser';
import { getRouteUrl, href } from '@/common/util';
import { env } from '@/common/env';
import './index.less';

/** 目标项目 SSO 回调页：成功后清除 code 并恢复原业务深链，失败提供明确重试。 */
export default function Login() {
  const started = useRef(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const { code, from } = readLoginParams();
    if (!code && getStateUser().token) {
      href(from, { replace: true });
      return;
    }
    if (!code) {
      beginSsoLogin(from);
      return;
    }
    async function login() {
      try {
        const result = await exchangeLoginCode(code!);
        if (!result.token || !result.sso_token) throw new Error('登录信息不完整');
        setStateUser(result);
        // 旧 目标项目 会补充管理员 email；失败不阻断已成功的 SSO。
        if (env.VITE_APP_API_MODE === 'gapis') {
          await apiManagerInfo().then((info) => setStateUser({ email: info?.email })).catch(() => {});
        }
        window.location.replace(getRouteUrl(from));
      } catch {
        setError(true);
      }
    }
    void login();
  }, []);
  return (
    <main className="admin-login">
      {error ? (
        <Alert type="error" message="登录失败，请重新登录" showIcon
          action={<Button onClick={() => beginSsoLogin(readLoginParams().from)}>重新登录</Button>} />
      ) : <Spin size="large" tip="登录中，请稍后…" />}
    </main>
  );
}
