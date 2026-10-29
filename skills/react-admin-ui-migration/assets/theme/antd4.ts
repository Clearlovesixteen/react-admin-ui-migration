// 应用颜色真源
const colors = {
  primary: '#2d75d2',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1f2937',
    900: '#0f172a',
  },
};

// 自定义 Ant Design 主题
const antdThemeVars = {
  'primary-color': colors.primary,
  'link-color': colors.primary,
  'success-color': colors.success,
  'warning-color': colors.warning,
  'error-color': colors.error,
  'border-radius-base': '6px',
  'border-radius-sm': '4px',
  'modal-border-radius': '8px',
  'modal-header-padding-vertical': '24px',
  'modal-header-padding-horizontal': '24px',
  'modal-header-border-width': '0',
  'modal-header-title-font-size': '20px',
  'modal-header-title-line-height': '28px',
  'modal-heading-color': colors.gray[800],
  'modal-body-padding': '0 24px 8px',
  'modal-footer-padding-vertical': '24px',
  'modal-footer-padding-horizontal': '24px',
  'modal-footer-border-width': '0',
  'drawer-header-padding': '16px 20px',
  'drawer-title-font-size': '18px',
  'drawer-footer-padding-vertical': '16px',
  'drawer-footer-padding-horizontal': '20px',
};

// 全局 Less 变量
export const lessThemeVars = {
  ...antdThemeVars,
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  ...Object.fromEntries(Object.entries(colors.gray).map(([key, value]) => [`gray-${key}`, value])),
};
