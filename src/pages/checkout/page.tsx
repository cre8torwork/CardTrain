import { useCallback, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteHeader from '../../components/feature/SiteHeader';
import SiteFooter from '../../components/feature/SiteFooter';
import CardPaymentFrame, { type PaymentOutcome } from '../../components/feature/CardPaymentFrame';
import ApplePayButton from '../../components/feature/ApplePayButton';
import GooglePayButton from '../../components/feature/GooglePayButton';
import type { SignedCheckout } from '../../lib/checkout';

// In-site checkout page. Both Buy Points and the shop card flow navigate here with
// a server-signed order; card entry, 3-D Secure and the confirmation all happen on
// this page — the customer is never redirected off the site (the card fields post
// direct to CyberSource inside the page's payment iframe).

export interface CheckoutState {
  orderId: string;
  checkout: SignedCheckout;
  amountMinor: number;
  amountLabel: string;
  lines: { label: string; value: string }[];
  successTo?: string;
}

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = (useLocation().state ?? null) as CheckoutState | null;
  const [outcome, setOutcome] = useState<PaymentOutcome | null>(null);

  const orderId = state?.orderId;
  const reuseOrder = useCallback(() => Promise.resolve(orderId!), [orderId]);
  const handleWalletResult = useCallback(
    (r: { ok: boolean; message: string }) => {
      setOutcome(r.ok
        ? { category: 'success', message: r.message, referenceNumber: '' }
        : { category: 'retry', message: r.message, referenceNumber: '' });
    },
    [],
  );

  if (!state) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <i className="ri-shopping-cart-line text-5xl text-gray-300"></i>
          <p className="mt-4 text-gray-500">{t('checkout.missing')}</p>
          <Link to="/buy-points" className="inline-block mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold">
            {t('checkout.back')}
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <i className="ri-lock-line"></i>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{t('checkout.title')}</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {/* Order summary */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-semibold mb-2">{t('buyPoints.orderSummary')}</p>
            <div className="space-y-1.5">
              {state.lines.map((l, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-500">{l.label}</span>
                  <span className="font-semibold text-gray-800">{l.value}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
              <span className="text-sm text-gray-500">{t('buyPoints.totalAmount')}</span>
              <span className="font-bold text-gray-900 text-lg">{state.amountLabel}</span>
            </div>
          </div>

          {outcome ? (
            <div className="text-center py-4">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${outcome.category === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                <i className={`text-3xl ${outcome.category === 'success' ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}`}></i>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{outcome.message}</p>
              <button
                onClick={() => navigate(outcome.category === 'success' ? (state.successTo ?? '/user') : -1 as never)}
                className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm cursor-pointer"
              >
                {outcome.category === 'success' ? t('buyPoints.goToUser') : t('checkout.back')}
              </button>
            </div>
          ) : (
            <>
              <CardPaymentFrame
                endpoint={state.checkout.endpoint}
                fields={state.checkout.fields}
                amountLabel={state.amountLabel}
                onOutcome={setOutcome}
              />

              <div className="flex items-center gap-3 text-xs text-gray-300">
                <span className="flex-1 h-px bg-gray-100" />or<span className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-2">
                <ApplePayButton amountMinor={state.amountMinor} createOrder={reuseOrder} onResult={handleWalletResult} />
                <GooglePayButton amountMinor={state.amountMinor} createOrder={reuseOrder} onResult={handleWalletResult} />
              </div>

              <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 text-center">
                <i className="ri-shield-check-line text-emerald-500"></i>
                {t('checkout.onSiteNote')}
              </p>
            </>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
