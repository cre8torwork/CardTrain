import { useEffect, useState } from 'react';
import { validateApplePayMerchant, submitApplePay } from '../../lib/checkout';

// Apple Pay via CyberSource. Front-end is complete; two server calls are pending
// certificates: merchant validation (Merchant Identity cert) and token submission
// (Simple Order, paymentSolution 001, MID gphk088034609202, P12). The button only
// appears in Safari on a device with a provisioned card.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { ApplePaySession?: any } }

interface ApplePayButtonProps {
  amountMinor: number; // HKD cents
  createOrder: () => Promise<string>;
  onResult: (result: { ok: boolean; message: string }) => void;
}

export default function ApplePayButton({ amountMinor, createOrder, onResult }: ApplePayButtonProps) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    try {
      setAvailable(!!window.ApplePaySession && window.ApplePaySession.canMakePayments());
    } catch {
      setAvailable(false);
    }
  }, []);

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

  if (!available) return null;

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
