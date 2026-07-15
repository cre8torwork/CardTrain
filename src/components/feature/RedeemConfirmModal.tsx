import { useTranslation } from 'react-i18next';
import type { DrawRecord } from '../../hooks/useDrawHistory';
import { SafeHtml } from '../base/SafeHtml';

const POINTS_PER_CARD = 5;

interface RedeemConfirmModalProps {
  records: DrawRecord[];
  mode: 'single' | 'batch';
  getPoints: (record: DrawRecord) => number;
  onConfirm: (ids: string[]) => void;
  onCancel: () => void;
}

function RedeemConfirmModal({ records, mode, getPoints, onConfirm, onCancel }: RedeemConfirmModalProps) {
  const { t } = useTranslation();
  const totalPoints = records.reduce((sum, r) => sum + getPoints(r), 0);
  const hasPrizes = records.some((r) => r.isWin);
  const hasNaked = records.some((r) => !r.isWin);

  const titleText = hasPrizes && !hasNaked
    ? (mode === 'single' ? t('redeem.titleSinglePrize') : t('redeem.titleBatchPrize'))
    : hasPrizes && hasNaked
    ? t('redeem.titleMixed')
    : (mode === 'single' ? t('redeem.titleSingleNaked') : t('redeem.titleBatchNaked'));

  const summaryIcon = hasPrizes && !hasNaked ? 'ri-trophy-line' : 'ri-stack-line';
  const summaryLabel = hasPrizes && !hasNaked
    ? t('redeem.totalPrizes', { n: records.length })
    : hasNaked && !hasPrizes
    ? t('redeem.totalNakedCards', { n: records.length })
    : t('redeem.totalItems', { n: records.length });

  const handleConfirm = () => {
    onConfirm(records.map((r) => r.id));
  };

  const FALLBACK_IMAGE = 'https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/5250fa4331b28dcfbabf0d582e3bf142.png';

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'redeemModalIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 px-6 py-5 flex items-center gap-4 flex-shrink-0">
          <div className="w-12 h-12 flex items-center justify-center bg-white/30 rounded-full flex-shrink-0">
            <i className="ri-exchange-funds-fill text-2xl text-white"></i>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{titleText}</h3>
            <p className="text-white/80 text-xs mt-0.5">{t('redeem.irreversible')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          {/* Summary */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-amber-100 rounded-full">
                <i className={`${summaryIcon} text-xl text-amber-600`}></i>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">{summaryLabel}</p>
                {!hasPrizes && (
                  <p className="text-xs text-gray-400 mt-0.5">{t('redeem.perCardCTP', { n: POINTS_PER_CARD })}</p>
                )}
                {hasPrizes && (
                  <p className="text-xs text-gray-400 mt-0.5">{t('redeem.marketPriceDesc')}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-0.5">{t('redeem.pointsToEarn')}</p>
              <p className="text-2xl font-bold text-amber-500">
                +{totalPoints} <span className="text-base">CTP</span>
              </p>
            </div>
          </div>

          {/* Item list (max 5) */}
          {records.length > 0 && (
            <div className="mb-5 space-y-2 max-h-48 overflow-y-auto">
              {records.slice(0, 5).map((r) => {
                const pts = getPoints(r);
                const itemImg = r.isWin
                  ? (r.prizeImage || FALLBACK_IMAGE)
                  : 'https://readdy.ai/api/search-image?query=Pokemon%20TCG%20trading%20card%20game%20booster%20pack%20card%20back%20design%20classic%20pokeball%20pattern%20red%20white%20clean%20simple%20background%20high%20quality%20collectible%20card%20game&width=32&height=32&seq=naked-card-redeem-001&orientation=squarish';
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 bg-gray-200">
                      <img
                        src={itemImg}
                        alt={r.isWin ? r.prizeName || r.result : t('user.nakedCardAlt')}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">
                        {r.isWin ? (r.prizeName || r.result) : r.productName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-gray-400">{r.rarity}</span>
                        {r.isWin && (
                          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs font-bold bg-yellow-100 text-yellow-600">
                            <i className="ri-trophy-fill text-xs"></i>{t('status.win')}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-500 flex-shrink-0 whitespace-nowrap">
                      +{pts} CTP
                    </span>
                  </div>
                );
              })}
              {records.length > 5 && (
                <p className="text-xs text-center text-gray-400 py-1">
                  {t('redeem.moreItems', { n: records.length - 5 })}
                </p>
              )}
            </div>
          )}

          {/* Warning */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-start gap-2 mb-6">
            <i className="ri-error-warning-line text-orange-400 text-base flex-shrink-0 mt-0.5"></i>
            <SafeHtml html={t('redeem.warning')} />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-5 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-5 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-xl font-semibold text-sm hover:from-amber-500 hover:to-orange-500 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              <i className="ri-exchange-funds-line"></i>
              {t('redeem.confirmBtn', { n: totalPoints })}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes redeemModalIn {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

export default RedeemConfirmModal;