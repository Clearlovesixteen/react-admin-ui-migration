import { requestApi } from '@/common/request';
import { env } from '@/common/env';
import type { StateUser } from '@/hooks/useStoreUser';

export type LoginResult = {
  token: string; sso_token: string; mid: number | string; phone: string; nick_name: string;
};

/** mid:null 避免全局旧身份参与授权 code 兑换。 */
export function apiLoginGapi(code: string) {
  return requestApi<LoginResult>({
    data: {
      mid: null, auth_code: code, client_id: env.VITE_APP_ID,
      package: 'igc_base.user_pub.admin.sso', class: 'AUTH_MANAGE_LOGIN',
    },
    toastError: false,
  });
}

export function apiManagerInfo() {
  return requestApi<{ email?: string }>({
    data: { package: 'igc_base.user_pub.admin.client_opt', class: 'GET_MANGER_INFO' },
    toastError: false,
  });
}

/** Java 后台保留独立登录响应适配；目标项目 当前仍走 GAPI。 */
export async function exchangeLoginCode(code: string): Promise<StateUser> {
  if (env.VITE_APP_API_MODE === 'gapis') {
    const result = await apiLoginGapi(code);
    return {
      token: result.token, sso_token: result.sso_token,
      gapi_token: result.token, mid: result.mid, gapi_mid: result.mid,
      username: result.nick_name, phone: result.phone,
    };
  }
  const result = await requestApi<{
    token: string; ucToken?: string; id?: number; name?: string; phone?: string;
    user?: { id: number; userNick: string; phone: string; email?: string };
  }>({ url: env.VITE_APP_LOGIN_URL, data: { code, clientId: env.VITE_APP_ID }, toastError: false });
  const ssoToken = result.ucToken || result.token;
  const gapi = env.VITE_APP_LOGIN_GAPI_BY_JAVA === '1'
    ? await requestApi<{ mid: number; token: string }>({
        data: {
          mid: null, access_token: ssoToken, client_id: env.VITE_APP_ID,
          package: 'igc_base.user_pub.admin.sso', class: 'MANAGE_LOGIN_BY_ACCESS_TOKEN',
        },
        toastError: false,
      })
    : { mid: 0, token: '' };
  return {
    token: result.token, sso_token: ssoToken, gapi_token: gapi.token, gapi_mid: gapi.mid,
    mid: result.user?.id ?? result.id ?? 0,
    username: result.user?.userNick ?? result.name ?? '',
    phone: result.user?.phone ?? result.phone ?? '', email: result.user?.email,
  };
}
