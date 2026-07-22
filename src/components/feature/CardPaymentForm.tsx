import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { detectCardType, type SignedCheckout } from '../../lib/checkout';
import SecureBadges from './SecureBadges';

interface CardPaymentFormProps extends SignedCheckout {
  amountLabel: string; // e.g. "HK$ 300"
  /** Name of the iframe to post into, so the top-level page never navigates away. */
  target?: string;
  /** Called once validation passes and the native cross-origin POST is about to fire. */
  onSubmitted?: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 11 }, (_, i) => String(CURRENT_YEAR + i));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

/**
 * Secure Acceptance (Silent Order POST) card form. The signed fields are hidden
 * inputs; the customer's card fields post DIRECTLY to CyberSource (cross-origin),
 * so card data never touches our servers. On submit the browser leaves for
 * CyberSource, which returns to our checkout-response receipt endpoint.
 */
export default function CardPaymentForm({ endpoint, fields, amountLabel, target, onSubmitted }: CardPaymentFormProps) {
  const { t } = useTranslation();
  const [number, setNumber] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [cvn, setCvn] = useState('');
  const [error, setError] = useState('');

  const cardType = detectCardType(number) ?? '';
  const expiry = month && year ? `${month}-${year}` : ''; // CyberSource wants MM-yyyy

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (!cardType) {
      e.preventDefault();
      setError(t('buyPoints.cardUnsupported'));
      return;
    }
    if (!expiry || cvn.length < 3) {
      e.preventDefault();
      setError(t('buyPoints.cardIncomplete'));
      return;
    }
    // Otherwise allow the native cross-origin POST to CyberSource (into `target`).
    onSubmitted?.();
  };

  const input = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent';

  return (
    <form method="POST" action={endpoint} target={target} onSubmit={handleSubmit} className="space-y-3 text-left">
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="hidden" name="card_type" value={cardType} />
      <input type="hidden" name="card_expiry_date" value={expiry} />

      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('buyPoints.cardNumber')}</label>
        <input
          name="card_number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="4000 0000 0000 0000"
          value={number}
          onChange={(e) => { setNumber(e.target.value); setError(''); }}
          className={input}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('buyPoints.cardMonth')}</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={`${input} cursor-pointer`}>
            <option value="">MM</option>
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('buyPoints.cardYear')}</label>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={`${input} cursor-pointer`}>
            <option value="">YYYY</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('buyPoints.cardCvn')}</label>
          <input
            name="card_cvn"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            maxLength={4}
            value={cvn}
            onChange={(e) => { setCvn(e.target.value.replace(/\D/g, '')); setError(''); }}
            className={input}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <i className="ri-error-warning-line flex-shrink-0"></i>{error}
        </div>
      )}

      {/* 3-D Secure programme marks, close to the CHECKOUT button (GPAP requirement) */}
      <SecureBadges className="pt-1" />

      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg whitespace-nowrap cursor-pointer"
      >
        <i className="ri-lock-line text-lg"></i>
        {t('buyPoints.payAmount', { amount: amountLabel })}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <i className="ri-shield-check-line text-emerald-500"></i>
        {t('buyPoints.securedByCybersource')}
      </p>
    </form>
  );
}
