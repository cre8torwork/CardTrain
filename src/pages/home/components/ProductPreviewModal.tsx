import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalizedProductName } from '../../../hooks/useProductStore';
import type { Product, Rarity } from '../../../hooks/useProductStore';

interface Props {
  product: Product;
  onDraw: () => void;
  onClose: () => void;
}

const rarityConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  C:  { label: 'C',  bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200' },
  B:  { label: 'B',  bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-200' },
  A:  { label: 'A',  bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200' },
  S:  { label: 'S',  bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200' },
  SS: { label: 'SS', bg: 'bg-gradient-to-r from-rose-100 via-pink-100 to-purple-100', text: 'text-rose-600', border: 'border-rose-200' },
};

const rarityOrder: Record<string, number> = {
  SS: 0, S: 1, A: 2, B: 3, C: 4,
};

const RARITY_ORDER: Rarity[] = ['C', 'B', 'A', 'S', 'SS'];

function getTopRarity(product: Product): Rarity {
  if (!product.prizes || product.prizes.length === 0) return 'N';
  return product.prizes.reduce<Rarity>((best, prize) => {
    return RARITY_ORDER.indexOf(prize.rarity) > RARITY_ORDER.indexOf(best) ? prize.rarity : best;
  }, 'N');
}

const rarityBadgeMap: Record<string, string> = {
  'SS': 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white',
  'S':  'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
  'A':  'bg-gradient-to-r from-violet-500 to-purple-500 text-white',
  'B':  'bg-gradient-to-r from-sky-400 to-cyan-500 text-white',
  'C':  'bg-gray-200 text-gray-600',
};

export default function ProductPreviewModal({ product, onDraw, onClose }: Props) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const isOpen = product.boardType === 'open';
  const topRarity = getTopRarity(product);
  const totalPrizes = product.prizes?.reduce((s, p) => s + p.quantity, 0) ?? 0;

  const sortedPrizes = product.prizes
    ? [...product.prizes].sort((a, b) => (rarityOrder[a.rarity] ?? 99) - (rarityOrder[b.rarity] ?? 99))
    : [];

  const soldPercent = product.totalSlots > 0
    ? Math.round((product.totalSlots - product.remaining) / product.totalSlots * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* 頂部大圖區 */}
        <div className="relative flex-shrink-0 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden"
          style={{ maxHeight: '340px' }}>
          <img
            src={imgError ? 'https://readdy.ai/api/search-image?query=mystery%20gift%20box%20elegant%20dark%20background%20product%20showcase&width=800&height=400&seq=preview-fallback&orientation=landscape' : product.image}
            alt={getLocalizedProductName(product)}
            className="w-full h-full object-contain"
            style={{ maxHeight: '340px', display: 'block' }}
            onError={() => setImgError(true)}
          />
          {/* 漸層遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors cursor-pointer backdrop-blur-sm"
          >
            <i className="ri-close-line text-xl"></i>
          </button>

          {/* 標籤群 */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-rose-500/90 text-white text-xs font-bold rounded-full backdrop-blur-sm">
              {product.category}
            </span>
            <span className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm flex items-center gap-1 ${
              isOpen ? 'bg-emerald-500/90 text-white' : 'bg-gray-700/80 text-white'
            }`}>
              <i className={isOpen ? 'ri-eye-line' : 'ri-eye-off-line'}></i>
              {isOpen ? t('board.open') : t('board.closed')}
            </span>
            {topRarity !== 'N' && (
              <span className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm ${rarityBadgeMap[topRarity]}`}>
                {t('rarity.highest')} {topRarity}
              </span>
            )}
            {product.isHot && (
              <span className="px-3 py-1 bg-orange-500/90 text-white text-xs font-bold rounded-full backdrop-blur-sm flex items-center gap-1">
                <i className="ri-fire-fill"></i>HOT
              </span>
            )}
            {product.isNew && (
              <span className="px-3 py-1 bg-teal-500/90 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                NEW
              </span>
            )}
          </div>

          {/* 底部商品名稱 */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <h2 className="text-xl font-bold text-white drop-shadow-lg leading-tight">{getLocalizedProductName(product)}</h2>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-rose-300 font-bold text-lg">{product.price.toLocaleString()} CTP / {t('common.unit')}</span>
              <span className="text-gray-300 text-sm">{t('common.remaining')} {product.remaining} {t('common.slots')}</span>
            </div>
          </div>
        </div>

        {/* 內容區（可滾動） */}
        <div className="flex-1 overflow-y-auto">
          {/* 銷售進度 */}
          <div className="px-5 pt-4 pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span className="font-medium">{t('product.preview.salesProgress')}</span>
              <span className="font-semibold text-rose-500">{t('product.preview.soldPercent', { n: soldPercent })}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-500"
                style={{ width: `${soldPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 text-xs text-gray-400">
              <span>{t('product.preview.totalSlots', { n: product.totalSlots })}</span>
              <span>{t('common.remaining')} <strong className="text-gray-600">{product.remaining}</strong> {t('common.slots')}</span>
            </div>
          </div>

          {/* 明盤：剩餘獎品列表 */}
          {isOpen && sortedPrizes.length > 0 ? (
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 flex items-center justify-center bg-emerald-100 rounded-lg">
                    <i className="ri-eye-line text-emerald-600 text-sm"></i>
                  </div>
                  <span className="font-bold text-gray-800 text-sm">{t('product.preview.remainingPrizes')}</span>
                </div>
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {t('product.preview.totalXItems', { n: totalPrizes })}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {sortedPrizes.map((prize) => {
                  const rc = rarityConfig[prize.rarity] ?? rarityConfig['N'];
                  return (
                    <div
                      key={prize.id}
                      className={`relative rounded-xl border-2 ${rc.border} overflow-hidden bg-white hover:shadow-md transition-shadow`}
                    >
                      <div className="w-full aspect-[3/4] bg-gray-50 overflow-hidden">
                        <img
                          src={prize.image}
                          alt={prize.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://readdy.ai/api/search-image?query=trading%20card%20game%20mystery%20card%20back%20design%20elegant&width=120&height=160&seq=prize-fallback-preview&orientation=portrait';
                          }}
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-gray-800 truncate leading-tight mb-1">{prize.name}</p>
                        <div className="flex items-center justify-between">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-bold ${rc.bg} ${rc.text}`}>
                            {rc.label}
                          </span>
                          <span className="text-xs text-gray-500">×{prize.quantity}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : isOpen && sortedPrizes.length === 0 ? (
            <div className="px-5 py-6 text-center text-gray-400">
              <i className="ri-inbox-2-line text-3xl mb-2 block"></i>
              <p className="text-sm">{t('product.preview.allDrawn')}</p>
            </div>
          ) : (
            /* 暗盤：不顯示獎品 */
            <div className="px-5 py-6">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-xl flex-shrink-0">
                  <i className="ri-eye-off-line text-gray-500 text-xl"></i>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 text-sm">{t('board.closed')}{t('common.detail')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('product.preview.closedDesc')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部操作按鈕 */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer text-sm"
          >
            {t('product.preview.back')}
          </button>
          <button
            onClick={onDraw}
            disabled={product.remaining <= 0}
            className={`flex-2 flex-grow-[2] py-3 rounded-xl font-bold transition-all shadow-md whitespace-nowrap cursor-pointer text-sm flex items-center justify-center gap-2 ${
              product.remaining <= 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 hover:shadow-lg'
            }`}
          >
            <i className="ri-dice-line text-base"></i>
            {product.remaining <= 0 ? t('product.preview.soldOut') : t('product.preview.drawNow')}
          </button>
        </div>
      </div>
    </div>
  );
}