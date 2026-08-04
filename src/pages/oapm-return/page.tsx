import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteHeader from '../../components/feature/SiteHeader';
import SiteFooter from '../../components/feature/SiteFooter';
import { consumeOapmPendingOrder, queryOapmOrder } from '../../lib/checkout';

// Landing page for OAPM's return_url. Order state comes only from oapm-notify
// (already applied by the time the customer gets here, in the common case) or
// oapm-query, which this page polls as the fallback. We never infer an outcome
// from the browser alone.
//
// Note (corrected 2026-08-04): earlier assumed return_url carries no parameters
// (per EFT's docs). A live redirect showed EFT actually appends the full signed
// trade_status_sync payload as query params here — same shape as the notify
// webhook. Not read yet (would need the same signature verification as notify to
// be trustworthy, not just presence) — polling oapm-query is correct and safe as
// is; this would only be a latency improvement, not a correctness fix.

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10; // ~30s — covers the common "notify already landed" case

type Phase = 'checking' | 'paid' | 'declined' | 'pending' | 'missing';

export default function OapmReturnPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('checking');
  const pendingRef = useRef(consumeOapmPendingOrder());

  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending) {
      setPhase('missing');
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      try {
        const { status } = await queryOapmOrder(pending.orderId);
        if (cancelled) return;
        if (status === 'paid') return setPhase('paid');
        if (status === 'declined' || status === 'error') return setPhase('declined');
        if (attempts >= MAX_POLLS) return setPhase('pending');
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        if (attempts >= MAX_POLLS) setPhase('pending');
        else setTimeout(poll, POLL_INTERVAL_MS);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  const pending = pendingRef.current;

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        {phase === 'checking' && (
          <>
            <i className="ri-loader-4-line animate-spin text-4xl text-rose-400"></i>
            <p className="mt-4 text-gray-600">{t('oapm.return.checking')}</p>
          </>
        )}
        {phase === 'paid' && (
          <>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-emerald-100 text-emerald-600">
              <i className="ri-checkbox-circle-fill text-3xl"></i>
            </div>
            <p className="text-gray-700">{t('oapm.return.paid')}</p>
            <button
              onClick={() => navigate(pending?.successTo ?? '/user')}
              className="mt-6 px-8 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold cursor-pointer whitespace-nowrap"
            >
              {t('buyPoints.goToUser')}
            </button>
          </>
        )}
        {phase === 'declined' && (
          <>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-100 text-red-600">
              <i className="ri-error-warning-fill text-3xl"></i>
            </div>
            <p className="text-gray-700">{t('oapm.return.declined')}</p>
            <Link
              to="/buy-points"
              className="inline-block mt-6 px-8 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold whitespace-nowrap"
            >
              {t('checkout.back')}
            </Link>
          </>
        )}
        {phase === 'pending' && (
          <>
            <i className="ri-time-line text-4xl text-amber-500"></i>
            <p className="mt-4 text-gray-700">{t('oapm.return.pending')}</p>
            <Link
              to="/user"
              className="inline-block mt-6 px-8 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold whitespace-nowrap"
            >
              {t('buyPoints.goToUser')}
            </Link>
          </>
        )}
        {phase === 'missing' && (
          <>
            <i className="ri-question-line text-4xl text-gray-300"></i>
            <p className="mt-4 text-gray-500">{t('checkout.missing')}</p>
            <Link
              to="/buy-points"
              className="inline-block mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold whitespace-nowrap"
            >
              {t('checkout.back')}
            </Link>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
