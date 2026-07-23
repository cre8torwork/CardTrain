import { useEffect, useRef, useState } from 'react';
import { submitGooglePay } from '../../lib/checkout';

// Google Pay via CyberSource. Front-end is complete; the backend (Simple Order,
// paymentSolution 012, MID gphk088034609201) needs the P12 certs — until then the
// google-pay endpoint returns a pending result.
//
// TEST environment needs no Google merchant id; PRODUCTION needs a real
// `merchantId` from the Google Pay & Wallet Console.

const GATEWAY_MERCHANT_ID = 'gphk088034609201';
const GOOGLE_ENV: 'TEST' | 'PRODUCTION' = 'TEST';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { google?: any } }

const BASE_CARD = {
  type: 'CARD',
  parameters: {
    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
    allowedCardNetworks: ['VISA', 'MASTERCARD'],
  },
  tokenizationSpecification: {
    type: 'PAYMENT_GATEWAY',
    parameters: { gateway: 'cybersource', gatewayMerchantId: GATEWAY_MERCHANT_ID },
  },
};

interface GooglePayButtonProps {
  amountMinor: number; // HKD cents
  createOrder: () => Promise<string>; // returns the order id to pay
  onResult: (result: { ok: boolean; message: string }) => void;
}

function loadGooglePayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.payments?.api) return resolve();
    const existing = document.querySelector('script[data-gpay]');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
    const s = document.createElement('script');
    s.src = 'https://pay.google.com/gp/p/js/pay.js';
    s.async = true;
    s.dataset.gpay = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Pay'));
    document.head.appendChild(s);
  });
}

export default function GooglePayButton({ amountMinor, createOrder, onResult }: GooglePayButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadGooglePayScript()
      .then(async () => {
        if (cancelled) return;
        const client = new window.google.payments.api.PaymentsClient({ environment: GOOGLE_ENV });
        const isReady = await client.isReadyToPay({
          apiVersion: 2, apiVersionMinor: 0, allowedPaymentMethods: [BASE_CARD],
        });
        if (cancelled || !isReady.result || !containerRef.current) return;

        const button = client.createButton({
          buttonType: 'pay',
          buttonSizeMode: 'fill',
          onClick: async () => {
            try {
              const orderId = await createOrder();
              const paymentData = await client.loadPaymentData({
                apiVersion: 2, apiVersionMinor: 0,
                allowedPaymentMethods: [BASE_CARD],
                merchantInfo: { merchantName: 'Card Train' },
                transactionInfo: {
                  totalPriceStatus: 'FINAL',
                  totalPrice: (amountMinor / 100).toFixed(2),
                  currencyCode: 'HKD',
                  countryCode: 'HK',
                },
              });
              // CyberSource decryption: base64-encode the Google token blob.
              const token = window.btoa(paymentData.paymentMethodData.tokenizationData.token);
              const res = await submitGooglePay(orderId, token);
              onResult(res);
            } catch (e) {
              onResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
            }
          },
        });
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(button);
        setReady(true);
      })
      .catch(() => { if (!cancelled) setReady(false); });
    return () => { cancelled = true; };
  }, [amountMinor, createOrder, onResult]);

  return <div ref={containerRef} className={ready ? 'w-full' : 'hidden'} />;
}
