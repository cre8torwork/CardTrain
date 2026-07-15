import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProductStore, getLocalizedProductName } from '../../hooks/useProductStore';
import { useUserAuth } from '../../hooks/useUserAuth';
import { useCategoryStore } from '../../hooks/useCategoryStore';
import { useShopStore } from '../../hooks/useShopStore';
import { useProductSort } from '../../hooks/useProductSort';
import RecentWinnersBanner from './components/RecentWinnersBanner';
import SiteHeader from '../../components/feature/SiteHeader';
import SiteFooter from '../../components/feature/SiteFooter';
import type { Product, Rarity } from '../../hooks/useProductStore';

const RARITY_ORDER: Rarity[] = ['SS', 'S', 'A', 'B', 'C'];

function getTopRarity(product: Product): Rarity {
  if (!product.prizes || product.prizes.length === 0) return 'C';
  return product.prizes.reduce<Rarity>((best, prize) => {
    return RARITY_ORDER.indexOf(prize.rarity) < RARITY_ORDER.indexOf(best) ? prize.rarity : best;
  }, 'C');
}

const rarityBadgeMap: Record<string, string> = {
  'SS': 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white',
  'S':  'bg-gradient-to-r from-amber-400 to-yellow-500 text-white',
  'A':  'bg-gradient-to-r from-violet-500 to-purple-500 text-white',
  'B':  'bg-gradient-to-r from-sky-400 to-cyan-500 text-white',
  'C':  'bg-gray-200 text-gray-600',
};

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { products, loadProducts } = useProductStore();
  const { isLoggedIn } = useUserAuth();
  const { loadCategories, getLocalizedName } = useCategoryStore();
  const { products: shopProducts, loadProducts: loadShopProducts } = useShopStore();
  const { sortedActiveProducts } = useProductSort(products);

  useEffect(() => {
    loadCategories();
    loadProducts();
    loadShopProducts();
  }, [loadCategories, loadProducts, loadShopProducts]);

  const featuredProducts = sortedActiveProducts.slice(0, 4);

  const featuredShopProducts = shopProducts
    .filter((p) => p.isFeatured && p.isActive)
    .slice(0, 4);

  const handleProductClick = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activePage="home" />
      <RecentWinnersBanner />

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <img
                src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
                alt="Card Train"
                className="w-24 h-24 object-contain"
              />
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 mb-4">
              {t('hero.title')}<span className="text-rose-500">{t('hero.title.highlight')}</span>！
            </h1>
            <p className="text-base sm:text-xl text-gray-600 mb-8">
              {t('hero.subtitle')}
            </p>
            <div className="flex items-center justify-center flex-wrap gap-3 mb-8">
              <div className="flex items-center space-x-2 bg-white px-6 py-3 rounded-full">
                <i className="ri-shield-check-fill text-rose-500 text-xl"></i>
                <span className="font-semibold text-gray-700 whitespace-nowrap">{t('hero.badge.safe')}</span>
              </div>
              <div className="flex items-center space-x-2 bg-white px-6 py-3 rounded-full">
                <i className="ri-truck-fill text-rose-500 text-xl"></i>
                <span className="font-semibold text-gray-700 whitespace-nowrap">{t('hero.badge.ship')}</span>
              </div>
              <div className="flex items-center space-x-2 bg-white px-6 py-3 rounded-full">
                <i className="ri-star-fill text-rose-500 text-xl"></i>
                <span className="font-semibold text-gray-700 whitespace-nowrap">{t('hero.badge.rate')}</span>
              </div>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-bold text-lg hover:from-rose-600 hover:to-pink-600 transition-all whitespace-nowrap"
            >
              <i className="ri-gift-2-fill text-xl"></i>
              {t('hero.cta')}
            </Link>
          </div>
        </div>
      </div>

      {/* Hot Lucky Bags */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('products.hot')}</h2>
            <p className="text-gray-500 text-sm mt-1">{t('products.hotDesc')}</p>
          </div>
          <Link
            to="/products"
            className="flex items-center gap-2 px-5 py-2.5 border-2 border-rose-400 text-rose-500 rounded-full font-semibold hover:bg-rose-50 transition-colors whitespace-nowrap text-sm"
          >
            {t('products.viewAll')}
            <i className="ri-arrow-right-line"></i>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {featuredProducts.map((product) => {
            const isSoldOut = product.remaining <= 0;
            const isOpen = product.boardType === 'open';
            const topRarity = getTopRarity(product);
            return (
              <div
                key={product.id}
                className={`bg-white rounded-xl overflow-hidden group border border-gray-100 ${isSoldOut ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-rose-200 transition-all duration-300'}`}
                onClick={() => !isSoldOut && handleProductClick(product)}
              >
                <div className="relative overflow-hidden w-full" style={{ aspectRatio: '1' }}>
                  <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-50">
                    <img
                      src={product.image}
                      alt={getLocalizedProductName(product)}
                      loading="lazy"
                      className={`w-full h-full object-contain transition-transform duration-500 ${isSoldOut ? 'grayscale' : 'group-hover:scale-105'}`}
                    />
                  </div>
                  {isSoldOut && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="bg-white/95 px-3 py-1.5 sm:px-6 sm:py-3 rounded-full rotate-[-12deg]">
                        <span className="text-gray-800 font-black text-sm sm:text-xl tracking-widest">{t('products.soldOutBadge')}</span>
                      </div>
                    </div>
                  )}
                  {!isSoldOut && product.isHot && (
                    <div className="absolute top-2 left-2 bg-gradient-to-r from-red-500 to-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center space-x-1">
                      <i className="ri-fire-fill"></i>
                      <span className="hidden sm:inline">{t('common.hot')}</span>
                    </div>
                  )}
                  {!isSoldOut && product.isNew && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">{t('common.new')}</div>
                  )}
                  {!isSoldOut && (
                    <div className={`absolute bottom-3 left-3 flex px-2.5 py-1 rounded-full text-xs font-bold items-center gap-1 ${isOpen ? 'bg-emerald-500/90 text-white' : 'bg-gray-700/80 text-white'}`}>
                      <i className={`text-xs ${isOpen ? 'ri-eye-line' : 'ri-eye-off-line'}`}></i>
                      <span>{isOpen ? t('board.open') : t('board.closed')}</span>
                    </div>
                  )}
                  {!isSoldOut && (
                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-xs text-gray-600 whitespace-nowrap">{t('common.remaining')} {product.remaining} {t('common.slots')}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-3 sm:p-5 flex flex-col justify-between min-w-0">
                  <div className="mb-1.5 sm:mb-2 flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${isSoldOut ? 'bg-gray-100 text-gray-400' : 'bg-rose-50 text-rose-600'}`}>
                      {getLocalizedName(product.category)}
                    </span>
                    {topRarity !== 'C' && (
                      <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${rarityBadgeMap[topRarity] || 'bg-gray-100 text-gray-500'}`}>
                        {t('rarity.highest')} {topRarity}
                      </span>
                    )}
                  </div>

                  <h3 className={`text-sm sm:text-base font-bold mb-1.5 sm:mb-2 line-clamp-2 sm:min-h-[3rem] ${isSoldOut ? 'text-gray-400' : 'text-gray-900'}`}>
                    {getLocalizedProductName(product)}
                  </h3>

                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div>
                      <p className="text-xs text-gray-500 whitespace-nowrap">{t('products.perDraw')}</p>
                      <p className={`text-lg sm:text-2xl font-bold ${isSoldOut ? 'text-gray-400' : 'text-rose-500'}`}>
                        {product.price.toLocaleString()} <span className="text-sm sm:text-base">{t('common.points')}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 whitespace-nowrap">{t('common.remaining')}</p>
                      <p className="text-sm sm:text-lg font-bold text-gray-700">
                        {isSoldOut ? '-' : product.remaining} <span className="text-xs font-normal">{t('common.slots')}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mb-2 sm:mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isSoldOut ? 'bg-gray-400' : 'bg-gradient-to-r from-rose-500 to-pink-500'}`}
                        style={{ width: `${isSoldOut ? 100 : (product.totalSlots - product.remaining) / product.totalSlots * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); if (!isSoldOut) handleProductClick(product); }}
                    disabled={isSoldOut}
                    className={`w-full py-2 sm:py-3 rounded-lg font-bold transition-all whitespace-nowrap text-sm sm:text-base ${
                      isSoldOut
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 cursor-pointer'
                    }`}
                  >
                    {isSoldOut ? (
                      <span className="flex items-center justify-center gap-2">
                        <i className="ri-checkbox-circle-line"></i>{t('products.soldOutBadge')}
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-1.5">
                        <i className="ri-search-eye-line"></i>{t('products.viewDetails')}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-10 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full font-bold hover:from-rose-600 hover:to-pink-600 transition-all whitespace-nowrap"
          >
            <i className="ri-gift-2-line"></i>
            {t('hero.cta.viewAll')}
          </Link>
        </div>
      </div>

      {/* Hot Shop Products */}
      {featuredShopProducts.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('shop.hotProducts')}</h2>
                <p className="text-gray-500 text-sm mt-1">{t('shop.hotProductsDesc')}</p>
              </div>
              <Link
                to="/shop"
                className="flex items-center gap-2 px-5 py-2.5 border-2 border-amber-400 text-amber-600 rounded-full font-semibold hover:bg-amber-50 transition-colors whitespace-nowrap text-sm"
              >
                {t('shop.goShop')}
                <i className="ri-arrow-right-line"></i>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {featuredShopProducts.map((product) => {
                const isSoldOut = product.stock <= 0;
                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-xl overflow-hidden border border-amber-100 hover:border-amber-300 transition-all duration-300 group ${isSoldOut ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={() => !isSoldOut && navigate(`/shop/${product.id}`)}
                  >
                    <div className="relative overflow-hidden w-full" style={{ aspectRatio: '1' }}>
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className={`w-full h-full object-contain transition-transform duration-500 ${isSoldOut ? 'grayscale' : 'group-hover:scale-105'}`}
                      />
                      {isSoldOut && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <div className="bg-white/95 px-4 py-1.5 rounded-full rotate-[-12deg]">
                            <span className="text-gray-800 font-black text-base tracking-widest">{t('common.outOfStock')}</span>
                          </div>
                        </div>
                      )}
                      {!isSoldOut && (
                        <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                          <i className="ri-store-2-line text-xs"></i>
                          <span>{t('shop.shopTag')}</span>
                        </div>
                      )}
                      {product.stock > 0 && product.stock <= 10 && (
                        <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                          {t('shop.onlyLeft', { n: product.stock })}
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      {product.category && (
                        <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-semibold rounded-full mb-2">
                          {getLocalizedName(product.category)}
                        </span>
                      )}
                      <h3 className={`text-sm font-bold mb-3 line-clamp-2 min-h-[2.5rem] ${isSoldOut ? 'text-gray-400' : 'text-gray-900'}`}>
                        {product.name}
                      </h3>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">{t('shop.price')}</p>
                          <p className={`text-xl font-bold ${isSoldOut ? 'text-gray-400' : 'text-amber-500'}`}>
                            {product.price.toLocaleString()} <span className="text-sm font-normal">{t('common.points')}</span>
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (!isSoldOut) navigate(`/shop/${product.id}`); }}
                          disabled={isSoldOut}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                            isSoldOut
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 cursor-pointer'
                          }`}
                        >
                          {isSoldOut ? t('common.outOfStock') : t('shop.buyNow')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-10">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-10 py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full font-bold hover:from-amber-500 hover:to-orange-600 transition-all whitespace-nowrap"
              >
                <i className="ri-store-2-line"></i>
                {t('shop.goShopping')}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div id="features" className="bg-gradient-to-br from-gray-50 to-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">{t('features.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-shield-check-line text-3xl text-white"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('features.safe.title')}</h3>
              <p className="text-gray-600">{t('features.safe.desc')}</p>
            </div>
            <div className="bg-white p-8 rounded-xl text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-truck-line text-3xl text-white"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('features.ship.title')}</h3>
              <p className="text-gray-600">{t('features.ship.desc')}</p>
            </div>
            <div className="bg-white p-8 rounded-xl text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-percent-line text-3xl text-white"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t('features.rate.title')}</h3>
              <p className="text-gray-600">{t('features.rate.desc')}</p>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}