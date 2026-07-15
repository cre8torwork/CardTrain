import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SiteHeader from '@/components/feature/SiteHeader';
import SiteFooter from '@/components/feature/SiteFooter';
import { useShopStore } from '@/hooks/useShopStore';
import type { ShopProduct, CartItem } from '@/hooks/useShopStore';
import { useUserAuth } from '@/hooks/useUserAuth';
import { usePointsStore } from '@/hooks/usePointsStore';
import { useCategoryStore } from '@/hooks/useCategoryStore';
import ShopCartDrawer from '@/pages/shop/components/ShopCartDrawer';
import ShopCheckoutModal from '@/pages/shop/components/ShopCheckoutModal';
import { useTranslation } from 'react-i18next';

export default function ShopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, loading, loadProducts } = useShopStore();
  const { currentUser, isLoggedIn } = useUserAuth();
  const { getPoints } = usePointsStore();
  const { getLocalizedName } = useCategoryStore();
  const { t } = useTranslation();

  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [buyNowOpen, setBuyNowOpen] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // 所有圖片列表（封面 + 其他）
  const allImages: string[] = product
    ? (() => {
        const imgs = product.images && product.images.length > 0
          ? product.images
          : product.image ? [product.image] : [];
        return imgs;
      })()
    : [];

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!loading && products.length > 0 && id) {
      const found = products.find((p) => p.id === id);
      if (found) {
        setProduct(found);
        setSelectedImage(found.image || (found.images?.[0] ?? ''));
      }
    }
  }, [products, loading, id]);

  const loadUserPoints = useCallback(async () => {
    if (currentUser) {
      const { points } = await getPoints(currentUser.id);
      setUserPoints(points);
    }
  }, [currentUser, getPoints]);

  useEffect(() => {
    loadUserPoints();
  }, [loadUserPoints]);

  // 燈箱鍵盤控制
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i + 1) % allImages.length);
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i - 1 + allImages.length) % allImages.length);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, allImages.length]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    if (!product) return;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(existing.quantity + quantity, product.stock);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    if (!product) return;
    setCartItems([{ product, quantity }]);
    setBuyNowOpen(true);
  };

  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setCartItems((prev) =>
        prev.map((item) => item.product.id === productId ? { ...item, quantity: qty } : item)
      );
    }
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleOrderSuccess = () => {
    setOrderSuccessMsg(true);
    loadUserPoints();
    setTimeout(() => setOrderSuccessMsg(false), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader activePage="shop" />
        <div className="flex items-center justify-center py-40">
          <i className="ri-loader-4-line text-5xl text-gray-300 animate-spin"></i>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader activePage="shop" />
        <div className="flex flex-col items-center justify-center py-40 text-center">
          <div className="w-24 h-24 flex items-center justify-center rounded-full bg-gray-100 mb-6">
            <i className="ri-store-2-line text-5xl text-gray-300"></i>
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">{t('shopDetail.notFound')}</h2>
          <p className="text-gray-400 text-sm mb-6">{t('shopDetail.notFoundDesc')}</p>
          <button
            onClick={() => navigate('/shop')}
            className="px-6 py-2.5 bg-rose-500 text-white rounded-lg font-semibold hover:bg-rose-600 transition-colors cursor-pointer whitespace-nowrap"
          >
            {t('shopDetail.backToShop')}
          </button>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const canAfford = userPoints >= product.price * quantity;
  const maxQty = Math.min(product.stock, 99);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activePage="shop" />

      {/* Success Toast */}
      {orderSuccessMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-green-500 text-white rounded-full shadow-lg text-sm font-semibold">
          <i className="ri-checkbox-circle-fill"></i>
          {t('shopDetail.successMsg')}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <button onClick={() => navigate('/shop')} className="hover:text-rose-500 transition-colors cursor-pointer whitespace-nowrap">
            {t('shopDetail.breadcrumbShop')}
          </button>
          <i className="ri-arrow-right-s-line"></i>
          {product.category && (
            <>
              <span className="hover:text-rose-500 transition-colors cursor-pointer" onClick={() => navigate('/shop')}>
                {getLocalizedName(product.category)}
              </span>
              <i className="ri-arrow-right-s-line"></i>
            </>
          )}
          <span className="text-gray-600 truncate max-w-xs">{product.name}</span>
        </nav>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Left: Images */}
          <div className="space-y-3">
            {/* Main Image */}
            <div
              className="relative w-full rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 cursor-zoom-in"
              style={{ aspectRatio: '1' }}
              onClick={() => {
                const idx = allImages.indexOf(selectedImage);
                openLightbox(idx >= 0 ? idx : 0);
              }}
            >
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-all duration-300 ${isOutOfStock ? 'grayscale opacity-60' : 'hover:scale-105'}`}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="ri-image-line text-7xl text-gray-200"></i>
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="bg-white/95 px-6 py-2 rounded-full text-gray-700 font-bold text-base border border-gray-200">
                    {t('shopDetail.outOfStock')}
                  </span>
                </div>
              )}
              {product.isFeatured && !isOutOfStock && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold rounded-full">
                  {t('shopDetail.featured')}
                </div>
              )}
              {/* 放大提示 */}
              <div className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center bg-white/80 rounded-full text-gray-500">
                <i className="ri-zoom-in-line text-sm"></i>
              </div>
            </div>

            {/* 縮圖列 */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((url, idx) => (
                  <button
                    key={url}
                    onClick={() => setSelectedImage(url)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImage === url
                        ? 'border-rose-500 ring-2 ring-rose-200'
                        : 'border-gray-200 hover:border-rose-300'
                    }`}
                  >
                    <img src={url} alt={t('shopDetail.imageAlt', { n: idx + 1 })} loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {allImages.length > 1 && (
              <p className="text-xs text-gray-400 text-center">
                {t('shopDetail.imgCount', { n: allImages.length })}
              </p>
            )}
          </div>

          {/* Right: Info */}
          <div className="flex flex-col">
            {product.category && (
              <span className="inline-block px-3 py-1 bg-rose-50 text-rose-500 text-xs font-semibold rounded-full mb-3 w-fit">
                {getLocalizedName(product.category)}
              </span>
            )}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 leading-tight">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-3xl font-bold text-rose-500">
                {product.price.toLocaleString()}
              </span>
              <span className="text-lg text-rose-400 font-medium">CTP</span>
            </div>

            {/* Stock status */}
            <div className="flex items-center gap-2 mb-5">
              {isOutOfStock ? (
                <span className="flex items-center gap-1.5 text-sm text-red-500 font-semibold">
                  <i className="ri-close-circle-line"></i>{t('shopDetail.outOfStock')}
                </span>
              ) : product.stock <= 10 ? (
                <span className="flex items-center gap-1.5 text-sm text-amber-600 font-semibold">
                  <i className="ri-error-warning-line"></i>{t('shopDetail.lowStock', { n: product.stock })}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-semibold">
                  <i className="ri-checkbox-circle-line"></i>{t('shopDetail.inStock', { n: product.stock })}
                </span>
              )}
            </div>

            {product.description && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {isLoggedIn && (
              <div className="flex items-center justify-between p-3 bg-rose-50 rounded-xl mb-5 border border-rose-100">
                <span className="text-sm text-gray-600">{t('shopDetail.myPoints')}</span>
                <span className="text-base font-bold text-rose-500">{userPoints.toLocaleString()} CTP</span>
              </div>
            )}

            {!isOutOfStock && (
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-semibold text-gray-700">{t('shopDetail.qty')}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <i className="ri-subtract-line"></i>
                  </button>
                  <span className="w-10 text-center text-base font-bold text-gray-800">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty}
                    className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-500 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <i className="ri-add-line"></i>
                  </button>
                </div>
                <span className="text-sm text-gray-400">
                  {t('shopDetail.subtotal')}：<strong className="text-rose-500">{(product.price * quantity).toLocaleString()} CTP</strong>
                </span>
              </div>
            )}

            {isLoggedIn && !isOutOfStock && !canAfford && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl mb-4">
                <i className="ri-error-warning-line flex-shrink-0 text-red-600"></i>
                <span className="text-sm text-red-600 flex-1">{t('shopDetail.insufficientPoints', { n: (product.price * quantity - userPoints).toLocaleString() })}</span>
                <Link to="/buy-points" className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg font-bold text-xs hover:from-rose-600 hover:to-pink-600 transition-all shadow whitespace-nowrap">
                  <i className="ri-coin-line mr-1"></i>{t('shopDetail.recharge')}
                </Link>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 border-2 ${
                  isOutOfStock
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                    : addedToCart
                    ? 'border-green-400 bg-green-50 text-green-600'
                    : 'border-rose-400 text-rose-500 hover:bg-rose-50'
                }`}
              >
                {addedToCart ? (
                  <><i className="ri-checkbox-circle-fill"></i>{t('shopDetail.addedToCart')}</>
                ) : (
                  <><i className="ri-shopping-cart-2-line"></i>{t('shopDetail.addToCart')}</>
                )}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock || (isLoggedIn && !canAfford)}
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 ${
                  isOutOfStock || (isLoggedIn && !canAfford)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 hover:shadow-lg'
                }`}
              >
                <i className="ri-flashlight-line"></i>
                {isOutOfStock ? t('shopDetail.outOfStock') : t('shopDetail.buyNow')}
              </button>
            </div>

            {totalCartItems > 0 && (
              <button
                onClick={() => setCartOpen(true)}
                className="mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-shopping-cart-2-fill text-rose-500"></i>
                {t('shopDetail.viewCart', { n: totalCartItems })}
              </button>
            )}

            <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 flex items-center justify-center">
                  <i className="ri-shield-check-line text-emerald-500 text-xl"></i>
                </div>
                <span className="text-xs text-gray-500 text-center">{t('shopDetail.authentic')}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 flex items-center justify-center">
                  <i className="ri-truck-line text-rose-500 text-xl"></i>
                </div>
                <span className="text-xs text-gray-500 text-center">{t('shopDetail.fastShip')}</span>
              </div>
              <div className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 flex items-center justify-center">
                  <i className="ri-customer-service-2-line text-amber-500 text-xl"></i>
                </div>
                <span className="text-xs text-gray-500 text-center">{t('shopDetail.support')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />

      {/* 燈箱 Lightbox */}
      {lightboxOpen && allImages.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* 關閉按鈕 */}
          <button
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <i className="ri-close-line text-xl"></i>
          </button>

          {/* 左箭頭 */}
          {allImages.length > 1 && (
            <button
              className="absolute left-4 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + allImages.length) % allImages.length); }}
            >
              <i className="ri-arrow-left-s-line text-2xl"></i>
            </button>
          )}

          {/* 主圖 */}
          <div
            className="max-w-4xl max-h-[85vh] w-full mx-16 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={allImages[lightboxIndex]}
              alt={`${product.name} - 圖片 ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>

          {/* 右箭頭 */}
          {allImages.length > 1 && (
            <button
              className="absolute right-4 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % allImages.length); }}
            >
              <i className="ri-arrow-right-s-line text-2xl"></i>
            </button>
          )}

          {/* 頁碼 + 縮圖列 */}
          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3">
            <p className="text-white/60 text-sm">{t('shopDetail.imgOf', { cur: lightboxIndex + 1, total: allImages.length })}</p>
            {allImages.length > 1 && (
              <div className="flex gap-2">
                {allImages.map((url, idx) => (
                  <button
                    key={url}
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(idx); }}
                    className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      idx === lightboxIndex ? 'border-white' : 'border-white/30 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      <ShopCartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={() => setCartItems([])}
        userPoints={userPoints}
        userId={currentUser?.id || ''}
        onOrderSuccess={handleOrderSuccess}
      />

      {buyNowOpen && (
        <ShopCheckoutModal
          cartItems={[{ product, quantity }]}
          totalPoints={product.price * quantity}
          userPoints={userPoints}
          userId={currentUser?.id || ''}
          onClose={() => setBuyNowOpen(false)}
          onSuccess={() => {
            setBuyNowOpen(false);
            handleOrderSuccess();
          }}
        />
      )}
    </div>
  );
}