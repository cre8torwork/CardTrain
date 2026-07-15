import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserAuth } from '../../hooks/useUserAuth';
import { usePointsStore } from '../../hooks/usePointsStore';
import SiteHeader from '../../components/feature/SiteHeader';
import SiteFooter from '../../components/feature/SiteFooter';

interface PointsPackage {
  id: string;
  hkd: number;
  ctp: number;
  popular: boolean;
  bestValue: boolean;
}

const POINTS_PACKAGES: PointsPackage[] = [
  { id: 'pkg-50', hkd: 50, ctp: 500, popular: false, bestValue: false },
  { id: 'pkg-100', hkd: 100, ctp: 1000, popular: false, bestValue: false },
  { id: 'pkg-300', hkd: 300, ctp: 3000, popular: true, bestValue: false },
  { id: 'pkg-500', hkd: 500, ctp: 5000, popular: false, bestValue: false },
  { id: 'pkg-1000', hkd: 1000, ctp: 10000, popular: false, bestValue: true },
  { id: 'pkg-3000', hkd: 3000, ctp: 30000, popular: false, bestValue: false },
  { id: 'pkg-5000', hkd: 5000, ctp: 50000, popular: false, bestValue: false },
];

const FAQ_ITEMS = [
  { q: 'buyPoints.faq.q1', a: 'buyPoints.faq.a1' },
  { q: 'buyPoints.faq.q2', a: 'buyPoints.faq.a2' },
  { q: 'buyPoints.faq.q3', a: 'buyPoints.faq.a3' },
  { q: 'buyPoints.faq.q4', a: 'buyPoints.faq.a4' },
  { q: 'buyPoints.faq.q5', a: 'buyPoints.faq.a5' },
];

const GLOBAL_PAYMENTS_URL = 'https://go.globalpayments.com/en-hk/all-solutions';

export default function BuyPointsPage() {
  const { t } = useTranslation();
  const { isLoggedIn, currentUser, loading } = useUserAuth();
  const navigate = useNavigate();
  const { getPoints } = usePointsStore();

  const [selectedPackage, setSelectedPackage] = useState<PointsPackage | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (currentUser) {
      getPoints(currentUser.id).then(({ points }) => setCurrentPoints(points));
    }
  }, [currentUser, getPoints]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <i className="ri-loader-4-line animate-spin text-4xl text-rose-400"></i>
          <p className="text-gray-500 text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const handleSelectPackage = (pkg: PointsPackage) => {
    setSelectedPackage(pkg);
    setQuantity(1);
  };

  const handleProceedPayment = () => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    if (!selectedPackage) return;
    setShowPaymentModal(true);
  };

  const totalCTP = selectedPackage ? selectedPackage.ctp * quantity : 0;
  const totalHKD = selectedPackage ? selectedPackage.hkd * quantity : 0;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-pink-500 to-purple-500">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-white/5 blur-3xl"></div>
          <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full bg-yellow-300/10 blur-2xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/15 rounded-full text-white/90 text-sm font-semibold mb-6 backdrop-blur-sm border border-white/10">
            <i className="ri-coin-fill text-yellow-300"></i>
            HK$1 = 10 CTP
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight">
            {t('buyPoints.heroTitle')}
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t('buyPoints.heroDesc')}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-xl text-white text-sm backdrop-blur-sm border border-white/10">
              <i className="ri-shield-check-line text-emerald-300"></i>
              {t('buyPoints.securePayment')}
            </div>
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-xl text-white text-sm backdrop-blur-sm border border-white/10">
              <i className="ri-flashlight-line text-yellow-300"></i>
              {t('buyPoints.instantDelivery')}
            </div>
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 rounded-xl text-white text-sm backdrop-blur-sm border border-white/10">
              <i className="ri-customer-service-2-line text-sky-300"></i>
              {t('buyPoints.support24h')}
            </div>
          </div>
        </div>
      </section>

      {/* Current Points Banner */}
      {isLoggedIn && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
          <div className="bg-white rounded-2xl shadow-lg border border-rose-100 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full shadow-md flex-shrink-0">
                <i className="ri-coin-fill text-xl text-white"></i>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('buyPoints.currentBalance')}</p>
                <p className="text-xl font-bold text-gray-900">
                  {currentPoints !== null ? currentPoints.toLocaleString() : '—'} <span className="text-sm text-gray-500">CTP</span>
                </p>
              </div>
            </div>
            <Link
              to="/user"
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-500 rounded-lg font-semibold text-sm hover:bg-rose-100 transition-colors whitespace-nowrap"
            >
              <i className="ri-user-line"></i>
              {t('buyPoints.goToUser')}
            </Link>
          </div>
        </div>
      )}

      {/* Points Packages */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{t('buyPoints.selectPlan')}</h2>
          <p className="text-gray-500 max-w-xl mx-auto">{t('buyPoints.selectPlanDesc')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {POINTS_PACKAGES.map((pkg) => {
            const isSelected = selectedPackage?.id === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => handleSelectPackage(pkg)}
                className={`relative rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'border-rose-500 bg-rose-50/50 shadow-lg shadow-rose-100 scale-[1.02]'
                    : 'border-gray-100 bg-white hover:border-rose-200 hover:shadow-md'
                }`}
              >
                {/* Popular / Best Value tags */}
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold rounded-full whitespace-nowrap shadow-md">
                    <i className="ri-fire-fill mr-1"></i>{t('buyPoints.popular')}
                  </div>
                )}
                {pkg.bestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full whitespace-nowrap shadow-md">
                    <i className="ri-vip-crown-fill mr-1"></i>{t('buyPoints.bestValue')}
                  </div>
                )}

                <div className={`text-center ${(pkg.popular || pkg.bestValue) ? 'mt-4' : ''}`}>
                  <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                    {pkg.ctp.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">CTP</p>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">{t('buyPoints.price')}</p>
                      <p className="text-xl font-bold text-gray-900">HK$ {pkg.hkd.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">HK$1 = 10 CTP</p>
                      <p className="text-sm font-bold text-emerald-600">
                        {pkg.ctp.toLocaleString()} CTP
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quantity selector for selected package */}
                {isSelected && (
                  <div className="mt-4 flex items-center justify-between bg-rose-50 rounded-xl px-3 py-2">
                    <span className="text-xs font-semibold text-gray-600">{t('buyPoints.quantity')}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setQuantity(Math.max(1, quantity - 1)); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-rose-500 transition-colors cursor-pointer text-sm font-bold"
                      >
                        <i className="ri-subtract-line"></i>
                      </button>
                      <span className="w-8 text-center font-bold text-gray-800 text-sm">{quantity}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setQuantity(Math.min(99, quantity + 1)); }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-rose-500 transition-colors cursor-pointer text-sm font-bold"
                      >
                        <i className="ri-add-line"></i>
                      </button>
                    </div>
                  </div>
                )}

                <button
                  className={`mt-4 w-full py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                      : 'bg-gray-50 text-gray-600 hover:bg-rose-50 hover:text-rose-500 border border-gray-100'
                  }`}
                >
                  {isSelected ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <i className="ri-checkbox-circle-fill"></i>{t('buyPoints.selected')}
                    </span>
                  ) : (
                    t('buyPoints.select')
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center space-y-3">
          {selectedPackage && (
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              <span>{selectedPackage.ctp.toLocaleString()} CTP × {quantity}</span>
              <span className="text-gray-300">|</span>
              <span className="font-semibold text-gray-700">
                {t('buyPoints.subtotal', { hkd: totalHKD.toLocaleString(), ctp: totalCTP.toLocaleString() })}
              </span>
            </div>
          )}
          <button
            onClick={handleProceedPayment}
            disabled={!selectedPackage}
            className={`inline-flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-lg whitespace-nowrap transition-all shadow-lg ${
              selectedPackage
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 hover:shadow-xl active:scale-95 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
            }`}
          >
            <i className="ri-bank-card-line text-xl"></i>
            {selectedPackage
              ? t('buyPoints.payNow', { hkd: totalHKD.toLocaleString(), ctp: totalCTP.toLocaleString() })
              : t('buyPoints.selectPackageFirst')}
          </button>
          {!isLoggedIn && (
            <p className="text-sm text-gray-400 mt-4">
              <Link to="/login" className="text-rose-500 font-semibold hover:underline">{t('nav.login')}</Link>
              {' '}{t('buyPoints.loginFirst')}
            </p>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-to-b from-rose-50/50 to-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{t('buyPoints.howItWorks')}</h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t('buyPoints.howItWorksDesc')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { step: '01', icon: 'ri-shopping-cart-2-line', title: 'buyPoints.step1Title', desc: 'buyPoints.step1Desc', color: 'bg-rose-100 text-rose-600' },
              { step: '02', icon: 'ri-bank-card-line', title: 'buyPoints.step2Title', desc: 'buyPoints.step2Desc', color: 'bg-amber-100 text-amber-600' },
              { step: '03', icon: 'ri-flashlight-line', title: 'buyPoints.step3Title', desc: 'buyPoints.step3Desc', color: 'bg-emerald-100 text-emerald-600' },
            ].map((item) => (
              <div key={item.step} className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.color} mb-4`}>
                  <i className={`${item.icon} text-xl`}></i>
                </div>
                <div className="absolute top-4 right-4 text-4xl font-black text-gray-100 select-none">{item.step}</div>
                <h3 className="font-bold text-gray-800 mb-2">{t(item.title)}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{t(item.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Info */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-3xl p-6 sm:p-10 border border-gray-100">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold mb-4">
                <i className="ri-secure-payment-line"></i>
                {t('buyPoints.paymentMethod')}
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">{t('buyPoints.paymentTitle')}</h3>
              <p className="text-gray-500 mb-6 leading-relaxed">{t('buyPoints.paymentDesc')}</p>
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm">
                  <i className="ri-visa-line text-blue-600 text-xl"></i>
                  <span className="text-gray-600">Visa</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm">
                  <i className="ri-mastercard-line text-red-500 text-xl"></i>
                  <span className="text-gray-600">Mastercard</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm">
                  <i className="ri-bank-card-2-line text-blue-400 text-xl"></i>
                  <span className="text-gray-600">UnionPay</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 text-sm">
                  <i className="ri-apple-line text-gray-800 text-xl"></i>
                  <span className="text-gray-600">Apple Pay</span>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-white rounded-3xl shadow-md border border-gray-100">
              <i className="ri-secure-payment-fill text-7xl text-emerald-500"></i>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-rose-50/30 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: 'ri-shield-check-line', title: 'buyPoints.feature1Title', desc: 'buyPoints.feature1Desc', color: 'bg-emerald-100 text-emerald-600' },
              { icon: 'ri-flashlight-line', title: 'buyPoints.feature2Title', desc: 'buyPoints.feature2Desc', color: 'bg-amber-100 text-amber-600' },
              { icon: 'ri-history-line', title: 'buyPoints.feature3Title', desc: 'buyPoints.feature3Desc', color: 'bg-sky-100 text-sky-600' },
              { icon: 'ri-customer-service-2-line', title: 'buyPoints.feature4Title', desc: 'buyPoints.feature4Desc', color: 'bg-rose-100 text-rose-600' },
            ].map((feat) => (
              <div key={feat.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${feat.color} mx-auto mb-3`}>
                  <i className={`${feat.icon} text-lg`}></i>
                </div>
                <h4 className="font-bold text-gray-800 mb-1 text-sm">{t(feat.title)}</h4>
                <p className="text-xs text-gray-500 leading-relaxed">{t(feat.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{t('buyPoints.faqTitle')}</h2>
          <p className="text-gray-500">{t('buyPoints.faqDesc')}</p>
        </div>
        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-800 text-sm sm:text-base pr-4">{t(item.q)}</span>
                <i className={`ri-arrow-down-s-line text-gray-400 transition-transform duration-200 flex-shrink-0 ${openFaq === idx ? 'rotate-180' : ''}`}></i>
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">
                  {t(item.a)}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Payment Modal */}
      {showPaymentModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={() => setShowPaymentModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-[fadeInUp_0.3s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer text-gray-400"
            >
              <i className="ri-close-line text-lg"></i>
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 flex items-center justify-center bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl mx-auto mb-4">
                <i className="ri-coin-fill text-3xl text-rose-500"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{t('buyPoints.orderSummary')}</h3>
              <p className="text-sm text-gray-500">{t('buyPoints.orderSummaryDesc')}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('buyPoints.packageLabel')}</span>
                <span className="font-semibold text-gray-800">{selectedPackage.ctp.toLocaleString()} CTP</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('buyPoints.quantityLabel')}</span>
                <span className="font-semibold text-gray-800">{quantity}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
                <span className="text-gray-500">{t('buyPoints.totalReceive')}</span>
                <span className="font-bold text-emerald-600">{totalCTP.toLocaleString()} CTP</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between">
                <span className="text-gray-500 text-sm">{t('buyPoints.totalAmount')}</span>
                <span className="font-bold text-gray-900 text-lg">HK$ {totalHKD.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 pt-1">
                <span>{t('buyPoints.exchangeRate')}</span>
                <span>HK$1 = 10 CTP</span>
              </div>
            </div>

            <a
              href={GLOBAL_PAYMENTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg whitespace-nowrap cursor-pointer"
            >
              <i className="ri-bank-card-line text-lg"></i>
              {t('buyPoints.payWithGlobalPayments')}
            </a>

            <p className="text-xs text-gray-400 text-center mt-4">{t('buyPoints.redirectNote')}</p>

            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full mt-3 py-2.5 text-gray-500 font-semibold text-sm hover:text-gray-700 cursor-pointer transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      <SiteFooter />

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}