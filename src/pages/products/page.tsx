import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useProductStore, getLocalizedProductName } from '../../hooks/useProductStore';
import { useCategoryStore } from '../../hooks/useCategoryStore';
import { useProductSort } from '../../hooks/useProductSort';
import SiteHeader from '../../components/feature/SiteHeader';
import SiteFooter from '../../components/feature/SiteFooter';
import RecentWinnersBanner from '../home/components/RecentWinnersBanner';
import type { Product, Rarity } from '../../hooks/useProductStore';

const rarityBadgeMap: Record<string, string> = {
  'SS': 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white',
  'S':  'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
  'A':  'bg-gradient-to-r from-violet-500 to-purple-500 text-white',
  'B':  'bg-gradient-to-r from-sky-400 to-cyan-500 text-white',
  'C':  'bg-gray-200 text-gray-600',
};

const RARITY_ORDER: Rarity[] = ['C', 'B', 'A', 'S', 'SS'];

function getTopRarity(product: Product): Rarity {
  if (!product.prizes || product.prizes.length === 0) return 'N';
  return product.prizes.reduce<Rarity>((best, prize) => {
    return RARITY_ORDER.indexOf(prize.rarity) > RARITY_ORDER.indexOf(best) ? prize.rarity : best;
  }, 'N');
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { products, loadProducts } = useProductStore();
  const { categories: storeCategories, loadCategories, getLocalizedName } = useCategoryStore();
  const { sortedActiveProducts } = useProductSort(products);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [loadCategories, loadProducts]);

  const categories = [t('products.cat.all'), ...storeCategories.map(cat => cat.name)];
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    setSelectedCategory(t('products.cat.all'));
  }, [t]);

  const allCategory = t('products.cat.all');

  const filteredProducts = sortedActiveProducts.filter(product =>
    selectedCategory === allCategory || selectedCategory === '' || product.category === selectedCategory
  );

  const handleProductClick = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activePage="products" />
      <RecentWinnersBanner />

      {/* Header */}
      <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-10 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl text-white">
              <i className="ri-gift-2-fill text-xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{t('products.title')}</h1>
          </div>
          <p className="text-gray-500 text-sm ml-13 pl-1">{t('products.hotDesc')}</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white border-b sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3 overflow-x-auto pb-1">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === allCategory ? category : getLocalizedName(category)}
              </button>
            ))}
          </div>

          {selectedCategory !== allCategory && selectedCategory !== '' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <i className="ri-filter-3-line text-rose-400"></i>
              <span>
                {t('common.total')} <strong className="text-rose-500">{filteredProducts.length}</strong> {t('products.foundCount', { n: filteredProducts.length }).replace(String(filteredProducts.length), '')}
              </span>
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                {getLocalizedName(selectedCategory)}
              </span>
              <button
                onClick={() => setSelectedCategory(allCategory)}
                className="ml-1 text-xs text-gray-400 hover:text-rose-500 transition-colors cursor-pointer underline"
              >
                {t('products.filterActive')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <div className="w-16 h-16 flex items-center justify-center mb-4">
              <i className="ri-inbox-2-line text-5xl"></i>
            </div>
            <p className="text-lg font-semibold mb-2">{t('products.noResults')}</p>
            <p className="text-sm mb-6">{t('products.noResultsTip')}</p>
            <button
              onClick={() => setSelectedCategory(allCategory)}
              className="px-6 py-2 bg-rose-500 text-white rounded-lg font-semibold hover:bg-rose-600 transition-colors cursor-pointer whitespace-nowrap"
            >
              {t('products.clearFilters')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
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
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                        {t('common.new')}
                      </div>
                    )}
                    {!isSoldOut && product.remaining / product.totalSlots < 0.1 && (
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center space-x-1 animate-pulse">
                        <i className="ri-alarm-warning-fill"></i>
                        <span className="hidden sm:inline">{t('products.almostSoldOut')}</span>
                      </div>
                    )}
                    {!isSoldOut && (
                      <div className={`absolute bottom-3 left-3 flex px-2.5 py-1 rounded-full text-xs font-bold items-center gap-1 ${isOpen ? 'bg-emerald-500/90 text-white' : 'bg-gray-700/80 text-white'}`}>
                        <i className={isOpen ? 'ri-eye-line' : 'ri-eye-off-line'}></i>
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
                      {topRarity !== 'N' && (
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
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{t('products.sales')}</span>
                        <span>{isSoldOut ? '100%' : `${Math.round((product.totalSlots - product.remaining) / product.totalSlots * 100)}%`}</span>
                      </div>
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
        )}
      </div>

      <SiteFooter />
    </div>
  );
}