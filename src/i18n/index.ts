import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import messages from './local/index';

i18n
  .use(initReactI18next)
  .init({
    lng: 'ja',
    fallbackLng: 'ja',
    debug: false,
    resources: messages,
    interpolation: {
      escapeValue: false,
      prefix: '{',
      suffix: '}',
    },
  });

export default i18n;