import { useState, useEffect, useMemo } from 'react';
import SiteHeader from '@/components/feature/SiteHeader';
import SiteFooter from '@/components/feature/SiteFooter';
import { useShopStore } from '@/hooks/useShopStore';
import type { ShopProduct, CartItem } from '@/hooks/useShopStore';
import { useUserAuth } from '@/hooks/useUserAuth';
import { usePointsStore } from '@/hooks/usePointsStore';
import { useCategoryStore } from '@/hooks/useCategoryStore';
import ShopCartDrawer from './components/ShopCartDrawer';
import ShopCheckoutModal from './components/ShopCheckoutModal';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function ShopPage() {
  const { products, loading, loadProducts } = useShopStore();
  const { currentUser, isLoggedIn } = useUserAuth();
  const { getPoints } = usePointsStore();
  const { categories: storeCategories, loadCategories, getLocalizedName } = useCategoryStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [userPoints, setUserPoints] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState(false);
  const [buyNowProduct, setBuyNowProduct] = useState<ShopProduct | null>(null);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [loadCategories, loadProducts]);

  useEffect(() => {
    if (currentUser) {
      getPoints(currentUser.id).then(({ points }) => setUserPoints(points));
    }
  }, [currentUser, getPoints]);

  const categories = useMemo(() => {
    const allCats = storeCategories.map((c) => c.name);
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    // 優先顯示 storeCategories 中有的，再補上 products 中但不在 storeCategories 的
    const merged = [...new Set([...allCats, ...cats])];
    return ['all', ...merged];
  }, [products, storeCategories]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (product: ShopProduct, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1200);
  };

  const handleBuyNow = (product: ShopProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setCartItems([{ product, quantity: 1 }]);
    setBuyNowProduct(product);
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleOrderSuccess = () => {
    setOrderSuccessMsg(true);
    if (currentUser) {
      getPoints(currentUser.id).then(({ points }) => setUserPoints(points));
    }
    setTimeout(() => setOrderSuccessMsg(false), 4000);
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activePage="shop" />

      {/* 頁面標題區 — 與福袋一覽保持一致 */}
      <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-10 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl text-white shadow-md">
                <i className="ri-store-2-fill text-xl"></i>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{t('shop.title')}</h1>
            </div>
            <p className="text-gray-500 text-sm pl-1 ml-13">{t('shop.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* 分類篩選列 — sticky，與福袋一覽一致 */}
      <div className="bg-white border-b sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* 分類 tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-6 py-2 rounded-full font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'all' ? t('shop.all') : getLocalizedName(cat)}
                </button>
              ))}
            </div>
            {/* 搜尋 + 購物車 */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative w-44">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  placeholder={t('shop.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg font-semibold text-sm hover:bg-rose-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-shopping-cart-2-fill"></i>
                {t('shop.cart')}
                {totalCartItems > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center bg-amber-400 text-white text-xs font-bold rounded-full">
                    {totalCartItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {selectedCategory !== 'all' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <i className="ri-filter-3-line text-rose-400"></i>
              <span>
                {t('shop.filterCount', { n: filteredProducts.length })}
              </span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                {getLocalizedName(selectedCategory)}
              </span>
              <button
                onClick={() => setSelectedCategory('all')}
                className="ml-1 text-xs text-gray-400 hover:text-rose-500 transition-colors cursor-pointer underline"
              >
                {t('shop.clearFilter')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success Toast */}
      {orderSuccessMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-green-500 text-white rounded-full shadow-lg text-sm font-semibold">
          <i className="ri-checkbox-circle-fill"></i>
          {t('shop.orderSuccess')}
        </div>
      )}

      {/* 商品列表 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <i className="ri-loader-4-line text-4xl text-gray-300 animate-spin"></i>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gray-100 mb-4">
              <i className="ri-store-2-line text-4xl text-gray-300"></i>
            </div>
            <p className="text-gray-500 font-medium">{t('shop.noProducts')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('shop.noProductsTip')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const inCart = cartItems.find((item) => item.product.id === product.id);
              const isOutOfStock = product.stock <= 0;
              const isAdded = addedProductId === product.id;

              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/shop/${product.id}`)}
                  className="bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group border border-gray-100 cursor-pointer"
                >
                  {/* 圖片 */}
                  <div className="relative overflow-hidden bg-gray-50" style={{ aspectRatio: '1' }}>
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className={`w-full h-full object-contain transition-transform duration-500 ${isOutOfStock ? 'grayscale opacity-60' : 'group-hover:scale-105'}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className="ri-image-line text-5xl text-gray-200"></i>
                      </div>
                    )}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="bg-white/95 px-6 py-3 rounded-full shadow-lg rotate-[-12deg]">
                          <span className="text-gray-800 font-black text-xl tracking-widest">{t('common.outOfStock')}</span>
                        </div>
                      </div>
                    )}
                    {product.isFeatured && !isOutOfStock && (
                      <div className="absolute top-2 left-2 px-2.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold rounded-full flex items-center gap-1">
                        <i className="ri-star-fill text-xs"></i>{t('shop.featured')}
                      </div>
                    )}
                    {product.category && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/90 text-gray-600 text-xs font-medium rounded-full">
                        {getLocalizedName(product.category)}
                      </div>
                    )}
                    {product.stock > 0 && product.stock <= 5 && (
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                        {t('shop.onlyLeftPieces', { n: product.stock })}
                      </div>
                    )}
                  </div>

                  {/* 資訊 */}
                  <div className="p-4 sm:p-5">
                    <h3 className={`text-sm sm:text-base font-bold mb-2 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] ${isOutOfStock ? 'text-gray-400' : 'text-gray-900'}`}>
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-gray-400 mb-3 line-clamp-1">{product.description}</p>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs text-gray-500">{t('shop.price')}</p>
                        <p className={`text-xl sm:text-2xl font-bold ${isOutOfStock ? 'text-gray-400' : 'text-rose-500'}`}>
                          {product.price.toLocaleString()} <span className="text-sm sm:text-base font-normal">CTP</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{t('shop.stock')}</p>
                        <p className={`text-sm sm:text-lg font-bold ${isOutOfStock ? 'text-gray-400' : 'text-gray-700'}`}>
                          {isOutOfStock ? '-' : product.stock} <span className="text-xs font-normal">{t('shop.stockUnit')}</span>
                        </p>
                      </div>
                    </div>

                    {inCart && (
                      <div className="flex items-center justify-between mb-3 px-2 py-1 bg-rose-50 rounded-lg">
                        <span className="text-xs text-rose-600 font-medium">{t('shop.inCart')}</span>
                        <span className="text-xs font-bold text-rose-600">{t('shop.inCartCount', { n: inCart.quantity })}</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => handleAddToCart(product, e)}
                        disabled={isOutOfStock}
                        className={`flex-1 py-2 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap border-2 ${
                          isOutOfStock
                            ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                            : isAdded
                            ? 'border-green-400 bg-green-50 text-green-600'
                            : 'border-rose-400 text-rose-500 hover:bg-rose-50'
                        }`}
                      >
                        {isAdded ? (
                          <span className="flex items-center justify-center gap-1">
                            <i className="ri-checkbox-circle-fill"></i>{t('shop.added')}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-1">
                            <i className="ri-shopping-cart-2-line"></i>{t('shop.addToCart')}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={(e) => handleBuyNow(product, e)}
                        disabled={isOutOfStock}
                        className={`flex-1 py-2 sm:py-3 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap ${
                          isOutOfStock
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 shadow-md hover:shadow-lg'
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1">
                          <i className="ri-flashlight-line"></i>{t('shop.buyNow')}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SiteFooter />

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

      {/* Buy Now Checkout */}
      {buyNowProduct && (
        <ShopCheckoutModal
          cartItems={[{ product: buyNowProduct, quantity: 1 }]}
          totalPoints={buyNowProduct.price}
          userPoints={userPoints}
          userId={currentUser?.id || ''}
          onClose={() => setBuyNowProduct(null)}
          onSuccess={() => {
            setBuyNowProduct(null);
            handleOrderSuccess();
          }}
        />
      )}
    </div>
  );
}