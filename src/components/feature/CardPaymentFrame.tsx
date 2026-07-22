import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CardPaymentForm from './CardPaymentForm';
import { EDGE_FUNCTIONS } from '../../lib/edgeFunctions';
import type { SignedCheckout } from '../../lib/checkout';

// Keeps the whole card checkout inside the site: the Secure Acceptance form posts
// into a same-page iframe instead of navigating the top-level window. CyberSource
// (and any 3-D Secure challenge) renders inside that iframe; checkout-response then
// postMessages the verified outcome back up, and we show our own confirmation UI.

const FRAME_NAME = 'cardtrain-payment-frame';
// Only trust messages from our own edge-function origin.
const FUNCTIONS_ORIGIN = new URL(EDGE_FUNCTIONS.checkoutResponse).origin;

export interface PaymentOutcome {
  category: 'success' | 'issuer' | 'retry';
  message: string;
  referenceNumber: string;
}

interface CardPaymentFrameProps extends SignedCheckout {
  amountLabel: string;
  onOutcome: (outcome: PaymentOutcome) => void;
}

export default function CardPaymentFrame({ endpoint, fields, amountLabel, onOutcome }: CardPaymentFrameProps) {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== FUNCTIONS_ORIGIN) return;
      let data = e.data;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { return; }
      }
      if (!data || data.source !== 'cardtrain-payment') return;
      setProcessing(false);
      onOutcome({
        category: data.category,
        message: data.message,
        referenceNumber: data.referenceNumber ?? '',
      });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onOutcome]);

  // Safety net: never spin forever if the result message never arrives.
  useEffect(() => {
    if (!processing) return;
    const timer = setTimeout(() => {
      onOutcome({ category: 'retry', message: t('checkout.timeout'), referenceNumber: '' });
    }, 180_000);
    return () => clearTimeout(timer);
  }, [processing, onOutcome, t]);

  return (
    <div className="space-y-3">
      {/* The form must stay MOUNTED across submit: unmounting it detaches the
          <form> before the browser performs the native POST, which silently
          cancels the submission. Hide it visually instead. */}
      <div className={processing ? 'hidden' : ''}>
        <CardPaymentForm
          endpoint={endpoint}
          fields={fields}
          amountLabel={amountLabel}
          target={FRAME_NAME}
          onSubmitted={() => setProcessing(true)}
        />
      </div>

      {processing && (
        <p className="flex items-center justify-center gap-2 text-sm text-gray-500 py-2">
          <i className="ri-loader-4-line animate-spin"></i>
          {t('buyPoints.preparingPayment')}
        </p>
      )}

      {/* Visible while processing so a 3-D Secure challenge can be completed in place. */}
      <iframe
        name={FRAME_NAME}
        title="Secure payment"
        className={processing ? 'w-full h-[420px] rounded-xl border border-gray-200' : 'hidden'}
      />
    </div>
  );
}
