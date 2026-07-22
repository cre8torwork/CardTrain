import { useEffect, useState } from 'react';
import { validateApplePayMerchant, submitApplePay } from '../../lib/checkout';

// Apple Pay via CyberSource. Front-end is complete; two server calls are pending
// certificates: merchant validation (Merchant Identity cert) and token submission
// (Simple Order, paymentSolution 001, MID gphk088034609202, P12).
//
// Availability is FEATURE-DETECTED, never browser-sniffed — Apple Pay on the web is
// NOT Safari-only. Since iOS 16 it works in third-party browsers on iOS/iPadOS
// (Chrome, Edge, Firefox — all iOS browsers use WebKit), and Apple has since
// extended it to desktop third-party browsers too. Feature detection means this
// button lights up wherever Apple Pay is genuinely usable, without us maintaining
// a browser list.
//
// It requires a SECURE CONTEXT: `ApplePaySession` is not exposed over plain http,
// so the button will not appear on the http:// dev server even on a supported
// device. Test over HTTPS (deploy or a tunnel).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { ApplePaySession?: any } }

interface ApplePayButtonProps {
  amountMinor: number; // HKD cents
  createOrder: () => Promise<string>;
  onResult: (result: { ok: boolean; message: string }) => void;
}

export default function ApplePayButton({ amountMinor, createOrder, onResult }: ApplePayButtonProps) {
  const [available, setAvailable] = useState(false);
  const [diag, setDiag] = useState('');

  useEffect(() => {
    let ok = false;
    let reason: string;
    try {
      if (typeof window.ApplePaySession === 'undefined') {
        reason = 'ApplePaySession undefined — this browser/OS does not expose Apple Pay JS (or the page is not a secure context)';
      } else if (!window.ApplePaySession.canMakePayments()) {
        reason = 'ApplePaySession present but canMakePayments() = false — device cannot pay with Apple Pay';
      } else {
        ok = true;
        reason = 'available';
      }
    } catch (e) {
      reason = `detection threw: ${e instanceof Error ? e.message : String(e)}`;
    }
    setAvailable(ok);
    setDiag(`secureContext=${window.isSecureContext} · ${reason}`);
  }, []);

  // Append ?paydebug=1 to the URL to see why the button is hidden on a device.
  const debug =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('paydebug');

  const handleClick = async () => {
    const AP = window.ApplePaySession;
    const paymentRequest = {
      countryCode: 'HK',
      currencyCode: 'HKD',
      supportedNetworks: ['visa', 'masterCard'],
      merchantCapabilities: ['supports3DS'],
      total: { label: 'Card Train', amount: (amountMinor / 100).toFixed(2) },
    };

    let orderId: string;
    try {
      orderId = await createOrder();
    } catch (e) {
      onResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
      return;
    }

    const session = new AP(3, paymentRequest);

    session.onvalidatemerchant = async (event: { validationURL: string }) => {
      try {
        const merchantSession = await validateApplePayMerchant(event.validationURL);
        session.completeMerchantValidation(merchantSession);
      } catch (e) {
        session.abort();
        onResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
      }
    };

    session.onpaymentauthorized = async (event: { payment: { token: unknown } }) => {
      const res = await submitApplePay(orderId, event.payment.token);
      session.completePayment(res.ok ? AP.STATUS_SUCCESS : AP.STATUS_FAILURE);
      onResult(res);
    };

    session.oncancel = () => { /* user dismissed the sheet */ };

    session.begin();
  };

  if (!available) {
    return debug ? (
      <p className="text-[11px] leading-snug text-gray-400 break-words">Apple Pay hidden — {diag}</p>
    ) : null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Pay with Apple Pay"
      className="w-full h-11 rounded-lg bg-black text-white font-medium flex items-center justify-center gap-1.5 hover:bg-gray-900 transition-colors"
    >
      <i className="ri-apple-fill text-lg"></i> Pay
    </button>
  );
}
