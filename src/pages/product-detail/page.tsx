import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProductStore, getLocalizedProductName } from '../../hooks/useProductStore';
import { useUserAuth } from '../../hooks/useUserAuth';
import { useDrawHistory, generateDrawResultFromSlots, DrawRecord } from '../../hooks/useDrawHistory';
import { usePointsStore } from '../../hooks/usePointsStore';
import { useMemberLevel } from '../../hooks/useMemberLevel';
import { useSettings, calcFiveDrawCost, calcSingleDrawCost } from '../../hooks/useSettings';
import { useCategoryStore } from '../../hooks/useCategoryStore';
import { invalidateWinnersCache } from '../home/components/RecentWinnersBanner';
import SiteHeader from '../../components/feature/SiteHeader';
import SiteFooter from '../../components/feature/SiteFooter';
import DrawAnimationOverlay from '../home/components/DrawAnimationOverlay';
import DrawResultModal from '../home/components/DrawResultModal';
import DrawConfirmModal from '../home/components/DrawConfirmModal';
import type { Product, Rarity } from '../../hooks/useProductStore';
import { useTranslation } from 'react-i18next';

const RARITY_ORDER: Rarity[] = ['SS', 'S', 'A', 'B', 'C'];

const rarityConfig: Record<string, { label: string; bg: string; text: string; border: string; glow: string }> = {
  SS: { label: 'SS', bg: 'bg-gradient-to-r from-purple-100 via-pink-100 to-rose-100', text: 'text-purple-700', border: 'border-purple-300', glow: 'shadow-purple-200' },
  S:  { label: 'S',  bg: 'bg-gradient-to-r from-yellow-100 to-orange-100', text: 'text-yellow-700', border: 'border-yellow-300', glow: 'shadow-yellow-200' },
  A:  { label: 'A',  bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-200', glow: 'shadow-violet-100' },
  B:  { label: 'B',  bg: 'bg-sky-100',    text: 'text-sky-700',    border: 'border-sky-200',  glow: 'shadow-sky-100' },
  C:  { label: 'C',  bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200', glow: '' },
};

const rarityBadgeMap: Record<string, string> = {
  'SS': 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white',
  'S':  'bg-gradient-to-r from-amber-400 to-yellow-500 text-white',
  'A':  'bg-gradient-to-r from-violet-500 to-purple-500 text-white',
  'B':  'bg-gradient-to-r from-sky-400 to-cyan-500 text-white',
  'C':  'bg-gray-200 text-gray-600',
};

function getTopRarity(product: Product): Rarity {
  if (!product.prizes || product.prizes.length === 0) return 'C';
  return product.prizes.reduce<Rarity>((best, prize) => {
    return RARITY_ORDER.indexOf(prize.rarity) < RARITY_ORDER.indexOf(best) ? prize.rarity : best;
  }, 'C');
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, loadProducts, updateStock, deductPrize } = useProductStore();
  const { isLoggedIn, currentUser } = useUserAuth();
  const { addRecord } = useDrawHistory(currentUser?.id ?? null);
  const { getPoints, deductPoints } = usePointsStore();
  const { memberInfo } = useMemberLevel(currentUser?.id ?? null);
  const { settings } = useSettings();
  const { getLocalizedName } = useCategoryStore();
  const { t } = useTranslation();

  const [drawCount, setDrawCount] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawResults, setDrawResults] = useState<DrawRecord[]>([]);
  const [showInsufficientPoints, setShowInsufficientPoints] = useState(false);
  const [animationRarity, setAnimationRarity] = useState<Rarity | 'none'>('none');
  const [pendingDrawCount, setPendingDrawCount] = useState(1);
  const [imgError, setImgError] = useState(false);
  const pendingResultsRef = useRef<DrawRecord[]>([]);
  // 同步鎖：防止快速重複點擊
  const isDrawingLockRef = useRef(false);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const product = products.find(p => p.id === Number(id));

  const canFiveDraw = (product?.remaining ?? 0) >= 5;

  // 計算折扣
  const memberDiscount = memberInfo?.discount ?? 0;
  const fiveDrawDiscount = settings.fiveDrawDiscount;

  const singleCost = product ? calcSingleDrawCost(product.price, memberDiscount) : 0;
  const fiveCost = product ? calcFiveDrawCost(product.price, fiveDrawDiscount, memberDiscount) : 0;
  const totalCost = drawCount === 5 ? fiveCost : singleCost;
  const originalCost = product ? product.price * drawCount : 0;
  const savedPoints = originalCost - totalCost;

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  useEffect(() => {
    if (!canFiveDraw && drawCount === 5) {
      setDrawCount(1);
    }
  }, [canFiveDraw, drawCount]);

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex flex-col items-center justify-center py-24 text-gray-400">
          <div className="w-20 h-20 flex items-center justify-center mb-4">
            <i className="ri-inbox-2-line text-6xl"></i>
          </div>
          <p className="text-xl font-bold mb-2 text-gray-600">{t('product.notFound')}</p>
          <p className="text-sm mb-6">{t('product.notFoundDesc')}</p>
          <Link
            to="/products"
            className="px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold hover:from-rose-600 hover:to-pink-600 transition-all shadow-md whitespace-nowrap"
          >
            {t('product.backToList')}
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const isSoldOut = product.remaining <= 0;
  const isOpen = product.boardType === 'open';
  const topRarity = getTopRarity(product);
  const soldPercent = product.totalSlots > 0
    ? Math.round((product.totalSlots - product.remaining) / product.totalSlots * 100)
    : 0;
  
  // 按稀有度分組獎品
  const prizesByRarity: Record<Rarity, typeof product.prizes> = {
    SS: [],
    S: [],
    A: [],
    B: [],
    C: [],
  };
  
  if (product.prizes) {
    product.prizes.forEach(prize => {
      if (prizesByRarity[prize.rarity]) {
        prizesByRarity[prize.rarity].push(prize);
      }
    });
  }
  
  const totalPrizes = product.prizes?.reduce((s, p) => s + p.quantity, 0) ?? 0;

  const handleDraw = async (overrideCount?: number) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    const actualCount = overrideCount ?? drawCount;
    // 同步鎖判斷，防止 React state 批次更新前被重複觸發
    if (isSoldOut || isDrawing || isDrawingLockRef.current) return;
    isDrawingLockRef.current = true;
    setIsConfirmLoading(true);

    const cost = actualCount === 5
      ? calcFiveDrawCost(product!.price, fiveDrawDiscount, memberDiscount)
      : calcSingleDrawCost(product!.price, memberDiscount);

    const { success: ptSuccess, points: currentPoints } = await getPoints(currentUser!.id);
    if (!ptSuccess) {
      // 查詢失敗，顯示提示讓用戶重試
      setShowInsufficientPoints(true);
      setIsConfirmLoading(false);
      isDrawingLockRef.current = false;
      return;
    }
    if (currentPoints < cost) {
      setShowInsufficientPoints(true);
      setIsConfirmLoading(false);
      isDrawingLockRef.current = false;
      return;
    }

    const discountDesc = [];
    if (actualCount === 5 && fiveDrawDiscount > 0) discountDesc.push(t('product.fiveDiscount', { n: fiveDrawDiscount }));
    if (memberDiscount > 0) discountDesc.push(t('product.memberDiscountLabel', { n: memberDiscount }));
    const desc = discountDesc.length > 0
      ? t('product.drawCostDesc', { desc: discountDesc.join('、') })
      : t('product.drawCostNoDiscount');

    const result = await deductPoints(currentUser!.id, cost, desc);
    if (!result.success) {
      setShowInsufficientPoints(true);
      setIsConfirmLoading(false);
      isDrawingLockRef.current = false;
      return;
    }

    // 扣款成功，關閉確認彈窗，開始動畫
    setShowConfirmModal(false);
    setIsConfirmLoading(false);

    try {
      const records = await generateDrawResultFromSlots(
        product!.id,
        product!.name,
        product!.category,
        product!.image,
        product!.price,
        product!.prizes || [],
        product!.totalSlots,
        product!.remaining,
        actualCount,
        currentUser!.id
      );

      for (const record of records) {
        await addRecord(record);
      }

      // 有新中獎紀錄時，清除 RecentWinnersBanner 快取，讓下次進首頁能即時顯示
      const hasNewWin = records.some(r => r.isWin);
      if (hasNewWin) invalidateWinnersCache();

      await updateStock(product!.id, Math.max(0, product!.remaining - actualCount));

      for (const record of records) {
        if (record.isWin && product!.boardType === 'open' && record.prizeName) {
          const hitPrize = product!.prizes?.find(p => p.name === record.prizeName);
          if (hitPrize) {
            await deductPrize(product!.id, hitPrize.id);
          }
        }
      }

      // 只從中獎記錄中找最高稀有度，排除裸卡（isWin=false 的 rarity 為 'N'，不在 RARITY_ORDER 中）
      const winRecords = records.filter(r => r.isWin);
      const topRarityResult = winRecords.reduce<Rarity>((best, rec) => {
        const recIdx = RARITY_ORDER.indexOf(rec.rarity);
        const bestIdx = RARITY_ORDER.indexOf(best);
        return recIdx !== -1 && recIdx < bestIdx ? rec.rarity : best;
      }, 'C');

      const hasWin = winRecords.length > 0;

      pendingResultsRef.current = records;
      setPendingDrawCount(actualCount);
      setAnimationRarity(hasWin ? topRarityResult : 'none');
      setIsDrawing(true);
    } catch (error) {
      console.error(t('product.drawFail') + ':', error);
      await deductPoints(currentUser!.id, -cost, t('product.drawFailRefund'));
      isDrawingLockRef.current = false;
    }
  };

  const handleAnimationComplete = () => {
    setIsDrawing(false);
    setDrawResults(pendingResultsRef.current);
    pendingResultsRef.current = [];
    // 動畫結束後才釋放鎖，讓開獎彈窗接手
    isDrawingLockRef.current = false;
  };

  const handleCloseResult = () => {
    setDrawResults([]);
  };

  const handleViewRecords = () => {
    setDrawResults([]);
    navigate('/user');
  };

  const handleDrawAgain = (count: 1 | 5) => {
    setDrawResults([]);
    setDrawCount(count);
    // 短暫延遲讓結果彈窗關閉動畫完成，再打開確認彈窗
    setTimeout(() => {
      setShowInsufficientPoints(false);
      setShowConfirmModal(true);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activePage="products" />

      {/* 麵包屑 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link to="/" className="hover:text-rose-500 transition-colors whitespace-nowrap">{t('product.breadcrumb.home')}</Link>
            <i className="ri-arrow-right-s-line text-gray-300"></i>
            <Link to="/products" className="hover:text-rose-500 transition-colors whitespace-nowrap">{t('product.breadcrumb.list')}</Link>
            <i className="ri-arrow-right-s-line text-gray-300"></i>
            <span className="text-gray-800 font-medium truncate max-w-xs">{getLocalizedProductName(product)}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">

          {/* 左側：商品圖片 */}
          <div className="flex flex-col gap-4">
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl cursor-zoom-in"
              style={{ minHeight: 400 }}
              onClick={() => setLightboxOpen(true)}
            >
              <img
                src={imgError
                  ? 'https://readdy.ai/api/search-image?query=mystery%20gift%20box%20elegant%20dark%20background%20product%20showcase&width=800&height=800&seq=detail-fallback&orientation=squarish'
                  : product.image}
                alt={getLocalizedProductName(product)}
                className="w-full h-full object-contain"
                style={{ minHeight: 400, maxHeight: 560, display: 'block' }}
                onError={() => setImgError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

              <div className="absolute top-4 left-4 flex flex-wrap gap-2 pointer-events-none">
                <span className="px-3 py-1 bg-rose-500/90 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                  {getLocalizedName(product.category)}
                </span>
                <span className={`px-3 py-1 text-xs font-bold rounded-full backdrop-blur-sm flex items-center gap-1 ${
                  isOpen ? 'bg-emerald-500/90 text-white' : 'bg-gray-700/80 text-white'
                }`}>
                  <i className={isOpen ? 'ri-eye-line' : 'ri-eye-off-line'}></i>
                  {isOpen ? t('board.open') : t('board.closed')}
                </span>
                {topRarity !== 'C' && (
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
                {isSoldOut && (
                  <span className="px-3 py-1 bg-gray-700/90 text-white text-xs font-bold rounded-full backdrop-blur-sm">
                    {t('product.soldOut')}
                  </span>
                )}
              </div>

              {isSoldOut && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                  <div className="bg-white/95 px-8 py-4 rounded-full shadow-xl rotate-[-8deg]">
                    <span className="text-gray-800 font-black text-2xl tracking-widest">{t('product.soldOut')}</span>
                  </div>
                </div>
              )}

              {/* 放大提示 */}
              <div className="absolute bottom-3 right-3 w-9 h-9 flex items-center justify-center bg-black/40 text-white rounded-full backdrop-blur-sm pointer-events-none">
                <i className="ri-zoom-in-line text-base"></i>
              </div>
            </div>

            {/* 銷售進度 */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-gray-700">{t('product.salesProgress')}</span>
                <span className="font-bold text-rose-500">{t('product.soldPercent', { n: soldPercent })}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-700"
                  style={{ width: `${soldPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                <span>{t('product.totalSlots', { n: product.totalSlots })}</span>
                <span>{t('product.remaining')} <strong className="text-gray-600 text-sm">{product.remaining}</strong> {t('product.slotUnit')}</span>
              </div>
            </div>
          </div>

          {/* 右側：商品資訊 + 抽獎 */}
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-tight mb-3">{getLocalizedProductName(product)}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-rose-500">{product.price.toLocaleString()}</span>
                  <span className="text-base text-rose-400 font-semibold">{t('product.ptPerDraw')}</span>
                </div>
                {memberDiscount > 0 && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1">
                    <i className="ri-vip-crown-line"></i>
                    {t('product.memberDiscount', { name: memberInfo?.currentLevel.name, n: memberDiscount })}
                  </span>
                )}
                <div className="flex items-center gap-1.5 text-gray-500 text-sm">
                  <i className="ri-stack-line text-gray-400"></i>
                  <span>{t('product.remaining')} <strong className="text-gray-700">{product.remaining}</strong> {t('product.slotUnit')}</span>
                </div>
              </div>
            </div>

            {/* 資訊卡片 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-rose-50 rounded-xl p-3 text-center border border-rose-100">
                <div className="w-8 h-8 flex items-center justify-center mx-auto mb-1.5 bg-rose-100 rounded-lg">
                  <i className="ri-price-tag-3-line text-rose-500"></i>
                </div>
                <p className="text-xs text-gray-500 mb-0.5">{t('product.pricePerDraw')}</p>
                <p className="text-sm font-bold text-rose-600">{product.price.toLocaleString()} CTP</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
                <div className="w-8 h-8 flex items-center justify-center mx-auto mb-1.5 bg-amber-100 rounded-lg">
                  <i className="ri-trophy-line text-amber-500"></i>
                </div>
                <p className="text-xs text-gray-500 mb-0.5">{t('product.highestRarity')}</p>
                <p className="text-sm font-bold text-amber-600">{topRarity}</p>
              </div>
              <div className={`rounded-xl p-3 text-center border ${isOpen ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className={`w-8 h-8 flex items-center justify-center mx-auto mb-1.5 rounded-lg ${isOpen ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                  <i className={`${isOpen ? 'ri-eye-line text-emerald-500' : 'ri-eye-off-line text-gray-500'}`}></i>
                </div>
                <p className="text-xs text-gray-500 mb-0.5">{t('product.boardType')}</p>
                <p className={`text-sm font-bold ${isOpen ? 'text-emerald-600' : 'text-gray-600'}`}>{isOpen ? t('board.open') : t('board.closed')}</p>
              </div>
            </div>

            {/* 積分不足提示 */}
            {showInsufficientPoints && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 flex items-center justify-center bg-orange-100 rounded-lg flex-shrink-0">
                  <i className="ri-error-warning-line text-orange-500 text-lg"></i>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-orange-700 text-sm">{t('product.insufficientPoints')}</p>
                  <p className="text-xs text-orange-600 mt-0.5">{t('product.insufficientDesc', { cost: totalCost.toLocaleString() })}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link
                    to="/buy-points"
                    className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold text-xs hover:from-rose-600 hover:to-pink-600 transition-all shadow whitespace-nowrap"
                  >
                    <i className="ri-coin-line mr-1"></i>{t('product.buyPoints')}
                  </Link>
                  <button
                    onClick={() => setShowInsufficientPoints(false)}
                    className="w-7 h-7 flex items-center justify-center text-orange-400 hover:text-orange-600 cursor-pointer"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                </div>
              </div>
            )}

            {/* 抽獎次數選擇 */}
            {!isSoldOut && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2.5">{t('product.selectCount')}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDrawCount(1)}
                    className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all cursor-pointer relative overflow-hidden ${
                      drawCount === 1
                        ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-md shadow-rose-100'
                        : 'border-gray-200 text-gray-500 hover:border-rose-300 bg-white'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <i className="ri-dice-line text-xl"></i>
                      <span className="text-base">{t('product.singleDraw')}</span>
                      {memberDiscount > 0 ? (
                        <span className="text-xs font-normal">
                          <span className="line-through text-gray-400">{product!.price.toLocaleString()}</span>
                          <span className="text-emerald-600 ml-1">{singleCost.toLocaleString()} CTP</span>
                        </span>
                      ) : (
                        <span className="text-xs font-normal opacity-70">{product!.price.toLocaleString()} CTP</span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => canFiveDraw && setDrawCount(5)}
                    disabled={!canFiveDraw}
                    className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all relative overflow-hidden ${
                      !canFiveDraw
                        ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        : drawCount === 5
                        ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-md shadow-rose-100 cursor-pointer'
                        : 'border-gray-200 text-gray-500 hover:border-rose-300 bg-white cursor-pointer'
                    }`}
                  >
                    {canFiveDraw && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs px-2.5 py-1 rounded-bl-xl font-bold">
                        {t('product.recommended')}
                      </div>
                    )}
                    <div className="flex flex-col items-center gap-1">
                      <i className="ri-dice-5-line text-xl"></i>
                      <span className="text-base">{t('product.fiveDraw')}</span>
                      {canFiveDraw ? (
                        (fiveDrawDiscount > 0 || memberDiscount > 0) ? (
                          <span className="text-xs font-normal">
                            <span className="line-through text-gray-400">{(product!.price * 5).toLocaleString()}</span>
                            <span className="text-emerald-600 ml-1">{fiveCost.toLocaleString()} CTP</span>
                          </span>
                        ) : (
                          <span className="text-xs font-normal opacity-70">{(product!.price * 5).toLocaleString()} CTP</span>
                        )
                      ) : (
                        <span className="text-xs font-normal text-gray-400">{t('product.notEnoughSlots')}</span>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* 費用顯示 */}
            {!isSoldOut && (
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4 border border-gray-100">
                <div>
                  <p className="text-xs text-gray-500">{t('product.thisCost')}</p>
                  {savedPoints > 0 ? (
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <p className="text-2xl font-bold text-rose-500">{totalCost.toLocaleString()} <span className="text-base">CTP</span></p>
                      <span className="text-xs text-gray-400 line-through">{originalCost.toLocaleString()} CTP</span>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-rose-500 mt-0.5">{totalCost.toLocaleString()} <span className="text-base">CTP</span></p>
                  )}
                  {savedPoints > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {drawCount === 5 && fiveDrawDiscount > 0 && (
                        <span className="text-xs text-rose-500 font-semibold bg-rose-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <i className="ri-dice-5-line"></i>{t('product.fiveDiscount', { n: fiveDrawDiscount })}
                        </span>
                      )}
                      {memberDiscount > 0 && (
                        <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <i className="ri-vip-crown-line"></i>{t('product.memberDiscount', { name: memberInfo?.currentLevel?.name, n: memberDiscount })}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{t('product.saved', { n: savedPoints.toLocaleString() })}</span>
                    </div>
                  )}
                </div>
                {isLoggedIn && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{t('product.drawCount')}</p>
                    <p className="text-lg font-bold text-gray-700 mt-0.5">{drawCount} {t('common.unit')}</p>
                  </div>
                )}
              </div>
            )}

            {/* 抽獎按鈕 */}
            <button
              onClick={() => {
                if (!isLoggedIn) { navigate('/login'); return; }
                if (isSoldOut || isDrawing) return;
                setShowInsufficientPoints(false);
                setShowConfirmModal(true);
              }}
              disabled={isSoldOut || isDrawing}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg whitespace-nowrap cursor-pointer flex items-center justify-center gap-3 ${
                isSoldOut
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                  : isDrawing
                  ? 'bg-gradient-to-r from-rose-400 to-pink-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 hover:shadow-xl active:scale-95'
              }`}
            >
              {isSoldOut ? (
                <><i className="ri-checkbox-circle-line text-xl"></i>{t('product.soldOut')}</>
              ) : isDrawing ? (
                <><i className="ri-loader-4-line animate-spin text-xl"></i>{t('product.drawing')}</>
              ) : (
                <><i className="ri-gift-2-fill text-xl"></i>{drawCount === 1 ? t('product.drawNow') : t('product.fiveDrawNow')}</>
              )}
            </button>

            {!isLoggedIn && (
              <p className="text-center text-sm text-gray-400">
                <Link to="/login" className="text-rose-500 font-semibold hover:underline">{t('product.loginLink')}</Link> {t('product.loginToDraw')}
              </p>
            )}

            <p className="text-xs text-gray-400 text-center">
              {t('product.randomNote')}
            </p>
          </div>
        </div>

        {/* 獎品一覽區塊 */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${isOpen ? 'bg-emerald-100' : 'bg-gray-100'}`}>
              <i className={`text-xl ${isOpen ? 'ri-eye-line text-emerald-600' : 'ri-eye-off-line text-gray-500'}`}></i>
            </div>
            <div>
              <h2 className="font-bold text-gray-700 text-lg">
                {isOpen ? t('product.prizeList') : t('product.closedBoard')}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {isOpen
                  ? t('product.openBoardDesc')
                  : t('product.closedBoardDesc')
                }
              </p>
            </div>
          </div>

          {/* 明盤：按稀有度分組顯示獎品 */}
          {isOpen && (
            <div className="space-y-8">
              {RARITY_ORDER.map(rarity => {
                const prizes = prizesByRarity[rarity];
                if (!prizes || prizes.length === 0) return null;
                
                const rc = rarityConfig[rarity];
                
                return (
                  <div key={rarity} className="space-y-4">
                    {/* 稀有度標題 */}
                    <div className="flex items-center gap-3">
                      <div className={`px-4 py-2 rounded-xl ${rc.bg} ${rc.border} border-2 flex items-center gap-2`}>
                        <i className="ri-trophy-line text-lg"></i>
                        <span className={`font-bold text-base ${rc.text}`}>{t('product.rarityLevel', { rarity: rc.label })}</span>
                        <span className={`text-xs ${rc.text} opacity-70`}>{t('product.prizeTypes', { n: prizes.length })}</span>
                      </div>
                    </div>
                    
                    {/* 獎品卡片列表 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {prizes.map((prize) => {
                        const marketValue = prize.marketPrice || 0;
                        return (
                          <div
                            key={prize.id}
                            className={`bg-white rounded-xl border-2 ${rc.border} ${rc.glow} shadow-md overflow-hidden hover:shadow-lg transition-all`}
                          >
                            <div className="relative aspect-[3/4] bg-gray-100">
                              <img
                                src={prize.image}
                                alt={prize.name}
                                loading="lazy"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/300x400?text=?'; }}
                              />
                              {prize.quantity === 0 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <span className="bg-white/90 px-4 py-2 rounded-full text-gray-800 font-bold text-sm">
                                    {t('product.drawnOut')}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <p className="text-sm font-bold text-gray-800 line-clamp-2 mb-1">{prize.name}</p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">{t('common.remaining')} {prize.quantity} {t('common.pieces')}</span>
                                {marketValue > 0 && (
                                  <span className="text-amber-600 font-bold">HK$ {marketValue.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* 無獎品提示 */}
              {Object.values(prizesByRarity).every(arr => arr.length === 0) && (
                <div className="text-center py-12 text-gray-400">
                  <i className="ri-inbox-line text-5xl mb-3 block"></i>
                  <p className="text-sm">{t('product.noPrizeInfo')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <SiteFooter />

      {/* 圖片燈箱 */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <i className="ri-close-line text-xl"></i>
          </button>
          <div
            className="max-w-2xl w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imgError
                ? 'https://readdy.ai/api/search-image?query=mystery%20gift%20box%20elegant%20dark%20background%20product%20showcase&width=800&height=800&seq=detail-fallback&orientation=squarish'
                : product.image}
              alt={getLocalizedProductName(product)}
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
          <p className="absolute bottom-5 left-0 right-0 text-center text-white/50 text-sm">{t('product.clickToClose')}</p>
        </div>
      )}

      <DrawAnimationOverlay
        isVisible={isDrawing}
        drawCount={pendingDrawCount}
        topRarity={animationRarity}
        onComplete={handleAnimationComplete}
      />

      {drawResults.length > 0 && (
        <DrawResultModal
          records={drawResults}
          onClose={handleCloseResult}
          onDrawAgain={handleDrawAgain}
          onViewRecords={handleViewRecords}
          remainingSlots={product?.remaining ?? 0}
        />
      )}

      {/* 抽獎確認彈窗 */}
      {showConfirmModal && product && (
        <DrawConfirmModal
          product={product}
          drawCount={drawCount}
          onDrawCountChange={setDrawCount}
          onConfirm={(confirmedCount) => {
            setDrawCount(confirmedCount);
            handleDraw(confirmedCount);
          }}
          onCancel={() => {
            setShowConfirmModal(false);
            setShowInsufficientPoints(false);
          }}
          isLoading={isConfirmLoading}
          showInsufficientPoints={showInsufficientPoints}
          onCloseInsufficientPoints={() => {
            setShowInsufficientPoints(false);
            setShowConfirmModal(false);
          }}
          singleCost={singleCost}
          fiveCost={fiveCost}
          memberDiscount={memberDiscount}
          fiveDrawDiscount={fiveDrawDiscount}
          memberLevelName={memberInfo?.currentLevel?.name}
        />
      )}
    </div>
  );
}