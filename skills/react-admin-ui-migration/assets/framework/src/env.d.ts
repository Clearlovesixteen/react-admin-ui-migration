/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_APP_ID: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_ICON: string;
  readonly VITE_APP_ENV: 'development' | 'test' | 'pre' | 'production';
  readonly VITE_APP_API_MODE: 'gapis' | 'java';
  readonly VITE_APP_GAPI_AK: '0' | '6' | '7' | '8' | '11' | '14';
  readonly VITE_APP_AUTH_OPEN: '0' | '1';
  readonly VITE_APP_ROUTE_KEEPALIVE: '0' | '1';
  readonly VITE_APP_ROUTE_TABS: '0' | '1';
  readonly VITE_APP_ROUTER_MODE: 'hash' | 'history';
  readonly VITE_APP_HOST_AUTH: string;
  readonly VITE_APP_HOST_LOGOUT: string;
  readonly VITE_APP_HOST_FILE: string;
  readonly VITE_APP_WEBSITE_URL: string;
  readonly VITE_APP_LOGIN_URL: string;
  readonly VITE_APP_LOGIN_GAPI_BY_JAVA: '0' | '1';
  readonly VITE_APP_PERMISSION_URL: string;
  readonly VITE_APP_HOST_GAPI_TEST: string;
  readonly VITE_APP_HOST_GAPI_PROD: string;
  readonly VITE_APP_HOST_GAPI_OUTER_TEST: string;
  readonly VITE_APP_HOST_GAPI_OUTER_PROD: string;
  readonly VITE_APP_HOST_UC_TEST: string;
  readonly VITE_APP_HOST_UC_PROD: string;
  readonly VITE_APP_HOST_JAVA_TEST: string;
  readonly VITE_APP_HOST_JAVA_PROD: string;
}
