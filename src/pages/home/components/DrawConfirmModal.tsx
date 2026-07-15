import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Product, getLocalizedProductName } from '../../../hooks/useProductStore';

interface Props {
  product: Product;
  onConfirm: (drawCount: number) => void;
  onCancel: () => void;
  isLoading: boolean;
  showInsufficientPoints: boolean;
  onCloseInsufficientPoints: () => void;
  drawCount: number;
  onDrawCountChange: (count: number) => void;
  autoOpenPrizes?: boolean;
  // 折扣相關（可選）
  singleCost?: number;
  fiveCost?: number;
  memberDiscount?: number;
  fiveDrawDiscount?: number;
  memberLevelName?: string;
}

const rarityConfig: Record<string, { label: string; bg: string; text: string }> = {
  C:  { label: 'C',  bg: 'bg-gray-100',                                                   text: 'text-gray-600' },
  B:  { label: 'B',  bg: 'bg-sky-100',                                                    text: 'text-sky-700' },
  A:  { label: 'A',  bg: 'bg-violet-100',                                                 text: 'text-violet-700' },
  S:  { label: 'S',  bg: 'bg-amber-100',                                                  text: 'text-amber-700' },
  SS: { label: 'SS', bg: 'bg-gradient-to-r from-rose-100 via-pink-100 to-purple-100',     text: 'text-rose-600' },
};

const rarityOrder: Record<string, number> = {
  SS: 0,
  S:  1,
  A:  2,
  B:  3,
  C:  4,
};

export default function DrawConfirmModal({
  product,
  onConfirm,
  onCancel,
  isLoading,
  showInsufficientPoints,
  onCloseInsufficientPoints,
  drawCount,
  onDrawCountChange,
  autoOpenPrizes = false,
  singleCost,
  fiveCost,
  memberDiscount = 0,
  fiveDrawDiscount = 0,
  memberLevelName,
}: Props) {
  const { t } = useTranslation();
  const originalSingleCost = product.price;
  const originalFiveCost = product.price * 5;
  const actualSingleCost = singleCost ?? originalSingleCost;
  const actualFiveCost = fiveCost ?? originalFiveCost;
  const totalCost = drawCount === 1 ? actualSingleCost : actualFiveCost;
  const originalCost = drawCount === 1 ? originalSingleCost : originalFiveCost;
  const savedPoints = originalCost - totalCost;
  const isOpen = product.boardType === 'open';
  const [showPrizes, setShowPrizes] = useState(autoOpenPrizes);

  if (showInsufficientPoints) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white text-center">
            <div className="w-14 h-14 flex items-center justify-center mx-auto mb-3 bg-white/20 rounded-full">
              <i className="ri-error-warning-fill text-3xl"></i>
            </div>
            <h2 className="text-xl font-bold">{t('draw.confirm.insufficientTitle')}</h2>
            <p className="text-orange-100 text-sm mt-1">{t('draw.confirm.insufficientDesc')}</p>
          </div>
          <div className="p-6">
            <div className="bg-orange-50 rounded-xl p-4 mb-6 border border-orange-100">
              <p className="text-gray-700 text-center mb-2">
                {t('draw.confirm.needPoints')} <strong className="text-orange-600">{totalCost.toLocaleString()} CardTrain Points</strong>
              </p>
              <p className="text-gray-500 text-sm text-center">{t('draw.confirm.buyFirst')}</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/buy-points"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold hover:from-rose-600 hover:to-pink-600 transition-all shadow-md whitespace-nowrap flex items-center justify-center gap-2"
              >
                <i className="ri-coin-line"></i>{t('draw.confirm.goBuy')}
              </Link>
              <button
                onClick={() => { onCloseInsufficientPoints(); onCancel(); }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="ri-close-line"></i>{t('common.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 p-6 text-white text-center flex-shrink-0">
          <div className="w-14 h-14 flex items-center justify-center mx-auto mb-3 bg-white/20 rounded-full">
            <i className="ri-gift-2-fill text-3xl"></i>
          </div>
          <h2 className="text-xl font-bold">{t('draw.confirm.title')}</h2>
          <p className="text-rose-100 text-sm mt-1">{t('draw.confirm.subtitle')}</p>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Product Info */}
          <div className="flex gap-4 mb-5 bg-rose-50 rounded-xl p-4 border border-rose-100">
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              <img src={product.image} alt={getLocalizedProductName(product)} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-600 text-xs font-semibold rounded-full">
                  {product.category}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                  isOpen ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  <i className={isOpen ? 'ri-eye-line' : 'ri-eye-off-line'}></i>
                  {isOpen ? t('board.open') : t('board.closed')}
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900 line-clamp-2">{getLocalizedProductName(product)}</p>
              <p className="text-xs text-gray-500 mt-1">{t('common.remaining')} {product.remaining} {t('common.slots')}</p>
            </div>
          </div>

          {/* 明盤：剩餘獎品展開區 */}
          {isOpen && product.prizes && product.prizes.length > 0 && (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => setShowPrizes((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-semibold text-sm hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <i className="ri-eye-line text-base"></i>
                  {t('draw.confirm.viewPrizes', { n: product.prizes.reduce((s, p) => s + p.quantity, 0) })}
                </span>
                <i className={`ri-arrow-${showPrizes ? 'up' : 'down'}-s-line text-lg transition-transform`}></i>
              </button>

              {showPrizes && (
                <div className="mt-2 border border-emerald-200 rounded-xl overflow-hidden">
                  <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 flex items-center justify-between">
                    <p className="text-xs text-emerald-600 font-medium">{t('draw.confirm.unclaimedPrizes')}</p>
                    <span className="flex items-center gap-1 text-xs text-emerald-500 font-medium">
                      <i className="ri-sort-desc text-sm"></i>
                      {t('draw.confirm.sortedByRarity')}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                    {[...product.prizes]
                      .sort((a, b) => (rarityOrder[a.rarity] ?? 99) - (rarityOrder[b.rarity] ?? 99))
                      .map((prize) => {
                        const rc = rarityConfig[prize.rarity] ?? rarityConfig['C'];
                        return (
                          <div key={prize.id} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
                            <div className="w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                              <img
                                src={prize.image}
                                alt={prize.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/80x112?text=?'; }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{prize.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${rc.bg} ${rc.text}`}>
                                  {rc.label}
                                </span>
                                <span className="text-xs text-gray-500">{t('common.remaining')} {prize.quantity} {t('common.pieces')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 抽獎次數選擇 */}
          <div className="mb-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">{t('draw.confirm.selectCount')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => onDrawCountChange(1)}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all whitespace-nowrap cursor-pointer ${
                  drawCount === 1
                    ? 'border-rose-500 bg-rose-50 text-rose-600'
                    : 'border-gray-200 text-gray-500 hover:border-rose-300'
                }`}
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-base">{t('draw.confirm.singleDraw')}</span>
                  {memberDiscount > 0 ? (
                    <span className="text-xs font-normal">
                      <span className="line-through text-gray-400">{originalSingleCost.toLocaleString()}</span>
                      <span className="text-emerald-600 ml-1">{actualSingleCost.toLocaleString()} CTP</span>
                    </span>
                  ) : (
                    <span className="text-xs font-normal">{originalSingleCost.toLocaleString()} CTP</span>
                  )}
                </div>
              </button>
              {/* 5連抽：口數不足時禁用 */}
              {product.remaining >= 5 ? (
                <button
                  onClick={() => onDrawCountChange(5)}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all whitespace-nowrap cursor-pointer relative overflow-hidden ${
                    drawCount === 5
                      ? 'border-rose-500 bg-rose-50 text-rose-600'
                      : 'border-gray-200 text-gray-500 hover:border-rose-300'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-bl-lg font-bold">
                    {t('draw.confirm.recommended')}
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base">{t('draw.confirm.fiveDraw')}</span>
                    {(fiveDrawDiscount > 0 || memberDiscount > 0) ? (
                      <span className="text-xs font-normal">
                        <span className="line-through text-gray-400">{originalFiveCost.toLocaleString()}</span>
                        <span className="text-emerald-600 ml-1">{actualFiveCost.toLocaleString()} CTP</span>
                      </span>
                    ) : (
                      <span className="text-xs font-normal">{originalFiveCost.toLocaleString()} CTP</span>
                    )}
                  </div>
                </button>
              ) : (
                <div
                  className="flex-1 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 font-bold text-sm whitespace-nowrap cursor-not-allowed relative overflow-hidden"
                  title={t('draw.confirm.notEnoughSlots')}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-base text-gray-300">{t('draw.confirm.fiveDraw')}</span>
                    <span className="text-xs font-normal text-gray-400">{t('draw.confirm.notEnoughSlots')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 費用顯示 */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 mb-4">
            <span className="text-gray-600 font-medium">
              {drawCount === 1 ? t('draw.confirm.thisCost') : t('draw.confirm.fiveCost')}
            </span>
            <div className="text-right">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-rose-500">{totalCost.toLocaleString()} CTP</span>
                {savedPoints > 0 && (
                  <span className="text-xs text-gray-400 line-through">{originalCost.toLocaleString()} CTP</span>
                )}
              </div>
              {savedPoints > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 justify-end">
                  {drawCount === 5 && fiveDrawDiscount > 0 && (
                    <span className="text-xs text-rose-500 font-semibold bg-rose-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <i className="ri-dice-5-line"></i>{t('draw.confirm.fiveDiscount', { n: fiveDrawDiscount })}
                    </span>
                  )}
                  {memberDiscount > 0 && (
                    <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <i className="ri-vip-crown-line"></i>{memberLevelName ?? t('member.beginner')} -{memberDiscount}%
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{t('draw.confirm.saved', { n: savedPoints.toLocaleString() })}</span>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mb-5">
            {t('draw.confirm.randomNote')}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => onConfirm(drawCount)}
              disabled={isLoading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold hover:from-rose-600 hover:to-pink-600 transition-all shadow-md whitespace-nowrap cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <><i className="ri-loader-4-line animate-spin"></i>{t('draw.confirm.processing')}</>
              ) : (
                <><i className="ri-dice-line"></i>{drawCount === 1 ? t('draw.confirm.confirmSingle') : t('draw.confirm.confirmFive')}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}