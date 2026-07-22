import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CartItem } from '@/hooks/useShopStore';
import { placeShopOrder } from '@/hooks/useShopStore';
import { createShopCardOrder, signCheckout } from '@/lib/checkout';

interface ShopCheckoutModalProps {
  cartItems: CartItem[];
  totalPoints: number;
  userPoints: number;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface ShippingForm {
  recipientName: string;
  phone: string;
  flatFloor: string;
  building: string;
  address: string;
  district: string;
  notes: string;
}

const DISTRICTS = [
  '香港島 - 中西區', '香港島 - 灣仔區', '香港島 - 東區', '香港島 - 南區',
  '九龍 - 油尖旺區', '九龍 - 深水埗區', '九龍 - 九龍城區', '九龍 - 黃大仙區', '九龍 - 觀塘區',
  '新界 - 葵青區', '新界 - 荃灣區', '新界 - 屯門區', '新界 - 元朗區',
  '新界 - 北區', '新界 - 大埔區', '新界 - 沙田區', '新界 - 西貢區', '新界 - 離島區',
];

export default function ShopCheckoutModal({
  cartItems,
  totalPoints,
  userPoints,
  userId,
  onClose,
  onSuccess,
}: ShopCheckoutModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState<ShippingForm>({
    recipientName: '',
    phone: '',
    flatFloor: '',
    building: '',
    address: '',
    district: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'points' | 'card'>('points');
  const [cardBusy, setCardBusy] = useState(false);

  const cardAvailable = cartItems.every((i) => i.product.hkdPriceMinor != null);
  const hkdTotalMinor = cartItems.reduce((s, i) => s + (i.product.hkdPriceMinor ?? 0) * i.quantity, 0);
  const hkdTotalLabel = `HK$ ${(hkdTotalMinor / 100).toFixed(2)}`;

  const handleChange = (field: keyof ShippingForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validate = () => {
    if (!form.recipientName.trim()) return t('shop.checkout.validateName');
    if (!form.phone.trim()) return t('shop.checkout.validatePhone');
    if (!form.address.trim()) return t('shop.checkout.validateAddress');
    if (!form.district) return t('shop.checkout.validateDistrict');
    return '';
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError('');

    const result = await placeShopOrder(userId, cartItems, form);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } else {
      setError(result.error || t('shop.checkout.submitError'));
    }
    setSubmitting(false);
  };

  const handleCardCheckout = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setCardBusy(true);
    setError('');
    try {
      const orderId = await createShopCardOrder(
        cartItems.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        form,
      );
      const signed = await signCheckout(orderId);
      // Hand off to the in-site /checkout page (card entry + 3DS happen there).
      navigate('/checkout', {
        state: {
          orderId,
          checkout: signed,
          amountMinor: hkdTotalMinor,
          amountLabel: hkdTotalLabel,
          lines: cartItems.map((i) => ({
            label: `${i.product.name} × ${i.quantity}`,
            value: `HK$ ${(((i.product.hkdPriceMinor ?? 0) * i.quantity) / 100).toFixed(2)}`,
          })),
          successTo: '/user',
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCardBusy(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center">
          <div className="w-20 h-20 flex items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
            <i className="ri-checkbox-circle-fill text-4xl text-green-500"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{t('shop.checkout.success')}</h3>
          <p className="text-gray-500 text-sm">{t('shop.checkout.successDesc', { n: totalPoints.toLocaleString() })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-rose-50 text-rose-500">
              <i className="ri-truck-line text-sm"></i>
            </div>
            <h3 className="text-base font-bold text-gray-800">{t('shop.checkout.title')}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Order Summary */}
          <div className="bg-rose-50 rounded-xl p-4">
            <p className="text-xs text-rose-600 font-semibold mb-2">{t('shop.checkout.orderSummary')}</p>
            <div className="space-y-1.5">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate flex-1 mr-2">{item.product.name} × {item.quantity}</span>
                  <span className="text-rose-600 font-semibold whitespace-nowrap">{(item.product.price * item.quantity).toLocaleString()} CTP</span>
                </div>
              ))}
            </div>
            <div className="border-t border-rose-200 mt-2 pt-2 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800">{t('shop.checkout.total')}</span>
              <span className="text-base font-bold text-rose-500">{totalPoints.toLocaleString()} CTP</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-500">{t('shop.checkout.remainingAfter')}</span>
              <span className="text-xs font-semibold text-gray-600">{(userPoints - totalPoints).toLocaleString()} CTP</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">{t('shop.checkout.paymentMethod')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setPaymentMethod('points'); setError(''); }}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${paymentMethod === 'points' ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                {t('shop.checkout.payWithPoints')}<br /><span className="text-xs font-normal">{totalPoints.toLocaleString()} CTP</span>
              </button>
              <button
                type="button"
                onClick={() => { if (cardAvailable) { setPaymentMethod('card'); setError(''); } }}
                disabled={!cardAvailable}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${paymentMethod === 'card' ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                {t('shop.checkout.payByCard')}<br /><span className="text-xs font-normal">{cardAvailable ? hkdTotalLabel : t('shop.checkout.cardUnavailable')}</span>
              </button>
            </div>
          </div>

          {/* Shipping Form */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1">
              <i className="ri-map-pin-line text-rose-400"></i>
              {t('shop.checkout.shippingInfo')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('shop.checkout.recipientName')} {t('shop.checkout.required')}</label>
                <input
                  type="text"
                  value={form.recipientName}
                  onChange={(e) => handleChange('recipientName', e.target.value)}
                  placeholder={t('shop.checkout.recipientNamePH')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('shop.checkout.phone')} {t('shop.checkout.required')}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder={t('shop.checkout.phonePH')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('shop.checkout.flatFloor')}</label>
                <input
                  type="text"
                  value={form.flatFloor}
                  onChange={(e) => handleChange('flatFloor', e.target.value)}
                  placeholder={t('shop.checkout.flatFloorPH')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('shop.checkout.building')}</label>
                <input
                  type="text"
                  value={form.building}
                  onChange={(e) => handleChange('building', e.target.value)}
                  placeholder={t('shop.checkout.buildingPH')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">{t('shop.checkout.address')} {t('shop.checkout.required')}</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder={t('shop.checkout.addressPH')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">{t('shop.checkout.district')} {t('shop.checkout.required')}</label>
                <select
                  value={form.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent cursor-pointer"
                >
                  <option value="">{t('shop.checkout.districtPH')}</option>
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">{t('shop.checkout.notes')}</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder={t('shop.checkout.notesPH')}
                  rows={2}
                  maxLength={200}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <i className="ri-error-warning-line flex-shrink-0"></i>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                {t('shop.checkout.cancel')}
              </button>
              {paymentMethod === 'card' ? (
                <button
                  onClick={handleCardCheckout}
                  disabled={cardBusy || !cardAvailable}
                  className="flex-grow py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm hover:from-rose-600 hover:to-pink-600 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {cardBusy ? (
                    <span className="flex items-center justify-center gap-2"><i className="ri-loader-4-line animate-spin"></i>{t('shop.checkout.processing')}</span>
                  ) : (
                    t('shop.checkout.payByCardAmount', { amount: hkdTotalLabel })
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-grow py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm hover:from-rose-600 hover:to-pink-600 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2"><i className="ri-loader-4-line animate-spin"></i>{t('shop.checkout.processing')}</span>
                  ) : (
                    t('shop.checkout.confirm', { n: totalPoints.toLocaleString() })
                  )}
                </button>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}