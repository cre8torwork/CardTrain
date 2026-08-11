import { useCallback, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteHeader from '../../components/feature/SiteHeader';
import SiteFooter from '../../components/feature/SiteFooter';
import CardPaymentFrame, { type PaymentOutcome } from '../../components/feature/CardPaymentFrame';
import ApplePayButton from '../../components/feature/ApplePayButton';
import GooglePayButton from '../../components/feature/GooglePayButton';
import { signCheckout, type SignedCheckout, type CardNetworkChoice } from '../../lib/checkout';

// In-site checkout page. Both Buy Points and the shop card flow navigate here with
// a server-signed order; card entry, 3-D Secure and the confirmation all happen on
// this page — the customer is never redirected off the site (the card fields post
// direct to CyberSource inside the page's payment iframe).

// Apple Pay / Google Pay are HIDDEN until their backend is live. Both rails need
// the PHP Simple Order gateway (P12 certs + a host); until then the buttons would
// render and then fail with 503 — a dead payment button, which GPAP's Website
// Review flags. Alipay/WeChat (OAPM) are unaffected; they render elsewhere.
// Re-enable with VITE_ENABLE_WALLETS=true — no code change needed.
const WALLETS_ENABLED = import.meta.env.VITE_ENABLE_WALLETS === 'true';

export interface CheckoutState {
  orderId: string;
  /** Optional: pre-signed fields. Omitted now — we sign once the network is picked. */
  checkout?: SignedCheckout;
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
  // Visa/Mastercard and UnionPay are separate merchant accounts, so the customer
  // picks first and we sign against that merchant only.
  const [network, setNetwork] = useState<CardNetworkChoice | null>(null);
  const [signed, setSigned] = useState<SignedCheckout | null>(state?.checkout ?? null);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState('');

  const chooseNetwork = async (n: CardNetworkChoice) => {
    setNetwork(n);
    setSignError('');
    if (!state) return;
    setSigning(true);
    try {
      setSigned(await signCheckout(state.orderId, n));
    } catch (e) {
      setSigned(null);
      setSignError(e instanceof Error ? e.message : String(e));
    } finally {
      setSigning(false);
    }
  };

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
              {/* Visa/Mastercard and UnionPay are separate CyberSource merchant
                  accounts (…200 and …204), so the customer chooses first and we
                  sign against that merchant only. */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">{t('checkout.choosePaymentCard')}</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'visa' as const, label: t('checkout.visaMastercard'), icons: ['ri-visa-line text-blue-600', 'ri-mastercard-line text-red-500'] },
                    { id: 'unionpay' as const, label: t('checkout.unionPay'), icons: ['ri-bank-card-2-line text-blue-500'] },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => chooseNetwork(opt.id)}
                      disabled={signing}
                      className={`px-3 py-3 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 ${
                        network === opt.id
                          ? 'border-rose-400 bg-rose-50 text-rose-600'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1.5 text-lg mb-1">
                        {opt.icons.map((c) => <i key={c} className={c}></i>)}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {signing && (
                <p className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2">
                  <i className="ri-loader-4-line animate-spin"></i>{t('buyPoints.preparingPayment')}
                </p>
              )}

              {signError && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  <i className="ri-error-warning-line flex-shrink-0"></i>{signError}
                </div>
              )}

              {signed && !signing && (
                <CardPaymentFrame
                  endpoint={signed.endpoint}
                  fields={signed.fields}
                  amountLabel={state.amountLabel}
                  network={network ?? 'visa'}
                  onOutcome={setOutcome}
                />
              )}

              {WALLETS_ENABLED && (
                <>
                  <div className="flex items-center gap-3 text-xs text-gray-300">
                    <span className="flex-1 h-px bg-gray-100" />or<span className="flex-1 h-px bg-gray-100" />
                  </div>
                  <div className="space-y-2">
                    <ApplePayButton amountMinor={state.amountMinor} createOrder={reuseOrder} onResult={handleWalletResult} />
                    <GooglePayButton amountMinor={state.amountMinor} createOrder={reuseOrder} onResult={handleWalletResult} />
                  </div>
                </>
              )}

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
