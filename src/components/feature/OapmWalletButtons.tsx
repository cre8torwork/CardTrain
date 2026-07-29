import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createOapmCheckout,
  detectOapmPayScene,
  rememberOapmPendingOrder,
  type OapmWallet,
} from '../../lib/checkout';

interface OapmWalletButtonsProps {
  /** Creates (or re-derives) the order to pay and returns its id. May throw (e.g. validation). */
  createOrder: () => Promise<string>;
  /** Where /oapm-return sends the customer after a confirmed payment. */
  successTo: string;
  className?: string;
}

const WALLETS: { id: OapmWallet; labelKey: string; icon: string }[] = [
  { id: 'ALIPAYHK', labelKey: 'oapm.alipayHk', icon: 'ri-alipay-line' },
  { id: 'ALIPAYCN', labelKey: 'oapm.alipayCn', icon: 'ri-alipay-line' },
  { id: 'WECHATCN', labelKey: 'oapm.wechatPay', icon: 'ri-wechat-pay-line' },
];

/**
 * Alipay HK / Alipay CN / WeChat Pay via OAPM. Unlike the card + Apple/Google Pay
 * flows, this redirects the whole browser to a QR/wallet page (pay_apptrade) —
 * there is no in-site confirmation. We remember which order we're paying
 * (sessionStorage, since return_url carries no state — design spec §4, §6) and let
 * /oapm-return poll it once the customer comes back.
 */
export default function OapmWalletButtons({ createOrder, successTo, className }: OapmWalletButtonsProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<OapmWallet | null>(null);
  const [error, setError] = useState('');

  const handlePay = async (wallet: OapmWallet) => {
    setBusy(wallet);
    setError('');
    try {
      const orderId = await createOrder();
      const payScene = detectOapmPayScene();
      const { payApptrade } = await createOapmCheckout(orderId, wallet, payScene);
      rememberOapmPendingOrder({ orderId, successTo });
      window.location.href = payApptrade;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-2">
        {WALLETS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => handlePay(w.id)}
            disabled={busy !== null}
            className="flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-rose-300 hover:bg-rose-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy === w.id ? (
              <i className="ri-loader-4-line animate-spin text-lg"></i>
            ) : (
              <i className={`${w.icon} text-lg`}></i>
            )}
            {t(w.labelKey)}
          </button>
        ))}
      </div>
      {error && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <i className="ri-error-warning-line flex-shrink-0"></i>
          {error}
        </div>
      )}
    </div>
  );
}
