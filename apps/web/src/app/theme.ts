import type { ThemeConfig } from 'antd';

export const cnerpTheme: ThemeConfig = {
  token: {
    colorPrimary: '#0f4c81',
    colorInfo: '#0f4c81',
    colorSuccess: '#1a7f5a',
    colorWarning: '#c47d0e',
    colorError: '#c0392b',
    borderRadius: 10,
    fontFamily:
      "'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif",
    colorBgLayout: '#eef2f7',
  },
  components: {
    Layout: {
      siderBg: '#0b1f33',
      headerBg: '#ffffff',
      bodyBg: '#eef2f7',
    },
    Menu: {
      darkItemBg: '#0b1f33',
      darkSubMenuItemBg: '#081829',
      darkItemSelectedBg: '#0f4c81',
      darkItemHoverBg: '#123456',
    },
    Card: { borderRadiusLG: 12 },
    Button: { borderRadius: 8, controlHeight: 40 },
    Input: { borderRadius: 8, controlHeight: 40 },
  },
};
