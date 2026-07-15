import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CartItem } from '@/hooks/useShopStore';
import ShopCheckoutModal from './ShopCheckoutModal';

interface ShopCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  userPoints: number;
  userId: string;
  onOrderSuccess: () => void;
}

export default function ShopCartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  userPoints,
  userId,
  onOrderSuccess,
}: ShopCartDrawerProps) {
  const { t } = useTranslation();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const totalPoints = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const canAfford = userPoints >= totalPoints;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <i className="ri-shopping-cart-2-fill text-sm"></i>
            </div>
            <h2 className="text-base font-bold text-gray-800">{t('shop.cart.title')}</h2>
            {totalItems > 0 && (
              <span className="px-2 py-0.5 bg-rose-500 text-white text-xs font-bold rounded-full">
                {totalItems}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-red-50 whitespace-nowrap"
              >
                {t('shop.cart.clear')}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gray-100 mb-4">
                <i className="ri-shopping-cart-2-line text-4xl text-gray-300"></i>
              </div>
              <p className="text-gray-500 font-medium">{t('shop.cart.empty')}</p>
              <p className="text-gray-400 text-sm mt-1">{t('shop.cart.emptyTip')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                    {item.product.image ? (
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className="ri-image-line text-gray-300 text-2xl"></i>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.product.name}</p>
                    <p className="text-xs text-rose-500 font-bold mt-0.5">
                      {item.product.price.toLocaleString()} {t('shop.cart.perItem')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <i className="ri-subtract-line text-xs"></i>
                      </button>
                      <span className="text-sm font-bold text-gray-800 w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-500 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <i className="ri-add-line text-xs"></i>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <i className="ri-close-line text-sm"></i>
                    </button>
                    <p className="text-sm font-bold text-gray-800">
                      {(item.product.price * item.quantity).toLocaleString()} CTP
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 bg-white">
            {/* Points info */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t('shop.cart.myPoints')}</span>
              <span className="text-sm font-semibold text-gray-700">{userPoints.toLocaleString()} CTP</span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">{t('shop.cart.total')}</span>
              <span className="text-lg font-bold text-rose-500">{totalPoints.toLocaleString()} CTP</span>
            </div>
            {!canAfford && (
              <p className="text-xs text-red-500 mb-3 flex items-center gap-1">
                <i className="ri-error-warning-line"></i>
                {t('shop.cart.insufficient', { n: (totalPoints - userPoints).toLocaleString() })}
              </p>
            )}
            {canAfford && (
              <p className="text-xs text-gray-400 mb-3">
                {t('shop.cart.remaining', { n: (userPoints - totalPoints).toLocaleString() })}
              </p>
            )}
            <button
              onClick={() => setCheckoutOpen(true)}
              disabled={!canAfford || !userId}
              className="w-full py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 hover:shadow-lg"
            >
              {!userId ? t('shop.cart.loginFirst') : !canAfford ? t('shop.cart.insufficientPoints') : t('shop.cart.checkout')}
            </button>
          </div>
        )}
      </div>

      {checkoutOpen && (
        <ShopCheckoutModal
          cartItems={cartItems}
          totalPoints={totalPoints}
          userPoints={userPoints}
          userId={userId}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            setCheckoutOpen(false);
            onClearCart();
            onClose();
            onOrderSuccess();
          }}
        />
      )}
    </>
  );
}