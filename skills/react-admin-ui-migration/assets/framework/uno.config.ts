import { defineConfig, presetIcons, presetWind3 } from 'unocss';
import { unoThemeColors } from './config/theme.ts';

export default defineConfig({
  shortcuts: [
    ['app-page', 'min-h-full w-full'],
    ['app-flex-center', 'flex items-center justify-center'],
    ['app-font-medium', '[font-weight:var(--app-font-medium)]'],
    [
      'app-scrollbar-hide',
      '[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
    ],
  ],
  theme: {
    colors: unoThemeColors,
  },
  presets: [presetWind3(), presetIcons()],
});
