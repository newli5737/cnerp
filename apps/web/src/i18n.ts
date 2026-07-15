import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import viCommon from './locales/vi/common.json';
import zhCommon from './locales/zh/common.json';
import viAuth from './locales/vi/auth.json';
import zhAuth from './locales/zh/auth.json';

const saved = localStorage.getItem('cnerp_lang') || 'vi';

void i18n.use(initReactI18next).init({
  resources: {
    vi: { common: viCommon, auth: viAuth },
    zh: { common: zhCommon, auth: zhAuth },
  },
  lng: saved,
  fallbackLng: 'vi',
  ns: ['common', 'auth'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
