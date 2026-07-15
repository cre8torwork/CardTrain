import { BrowserRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider, useTranslation } from "react-i18next";
import i18n from "./i18n";
import { useEffect } from "react";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

const LANG_TO_HTML_LANG: Record<string, string> = {
  'zh-TW': 'zh-TW',
  'zh-CN': 'zh-CN',
  'ja': 'ja',
  'en': 'en',
};

function DynamicTitle() {
  const { t, i18n: i18nInstance } = useTranslation();

  useEffect(() => {
    const updateMeta = () => {
      const title = t('site.title');
      const description = t('site.description');
      const keywords = t('site.keywords');

      document.title = title;
      document.documentElement.lang = LANG_TO_HTML_LANG[i18nInstance.language] || i18nInstance.language;

      let metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = description;

      let metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.content = keywords;
    };
    updateMeta();
    i18nInstance.on('languageChanged', updateMeta);
    return () => {
      i18nInstance.off('languageChanged', updateMeta);
    };
  }, [t, i18nInstance]);

  return null;
}

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <DynamicTitle />
        <ScrollToTop />
        <AppRoutes />
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
