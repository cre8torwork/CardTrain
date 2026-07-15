import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SiteHeader from '../../components/feature/SiteHeader';
import SiteFooter from '../../components/feature/SiteFooter';

interface ShippingSection {
  id: string;
  title: string;
  content: string[];
}

export default function ShippingPolicyPage() {
  const { t } = useTranslation();
  const sections = t('shipping.sections', { returnObjects: true }) as ShippingSection[];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activePage="shipping" />

      {/* Hero */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-4">{t('shipping.title')}</h1>
          <p className="text-lg text-amber-50">{t('shipping.subtitle')}</p>
          <p className="mt-4 text-sm text-amber-100">{t('shipping.lastUpdated')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="sticky top-24 bg-gray-50 rounded-lg p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">{t('shipping.toc')}</h3>
              <nav className="space-y-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block text-sm text-gray-600 hover:text-orange-500 transition-colors py-1"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="prose prose-lg max-w-none">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-6 mb-8 rounded-r-lg">
                <p className="text-sm text-amber-900 leading-relaxed">
                  <strong>{t('shipping.scope')}</strong> — {t('shipping.subtitle')}
                </p>
              </div>

              {sections.map((section, index) => (
                <section key={section.id} id={section.id} className="mb-12 scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-orange-400">
                    {index + 1}. {section.title}
                  </h2>
                  <div className="space-y-4">
                    {section.content.map((paragraph, idx) => (
                      <p key={idx} className="text-gray-700 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              ))}

              <div className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500 text-center">
                  {t('shipping.footer')}
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}