import { useState } from 'react';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  totalSlots: number;
  remaining: number;
  image: string;
  isHot: boolean;
  isNew: boolean;
}

interface RestockModalProps {
  product: Product;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export default function RestockModal({ product, onClose, onConfirm }: RestockModalProps) {
  const [quantity, setQuantity] = useState<string>('');
  const [error, setError] = useState('');

  const maxRestock = product.totalSlots - product.remaining;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(quantity);

    if (!quantity || isNaN(qty)) {
      setError('請輸入補貨數量');
      return;
    }

    if (qty <= 0) {
      setError('補貨數量必須大於 0');
      return;
    }

    if (qty > maxRestock) {
      setError(`補貨數量不可超過 ${maxRestock}（總口數 - 剩餘口數）`);
      return;
    }

    onConfirm(qty);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">快速補貨</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 商品資訊 */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <img
              src={product.image}
              alt={product.name}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 text-sm mb-1">{product.name}</h4>
              <p className="text-xs text-gray-500 mb-2">{product.category}</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-600">
                  總口數：<span className="font-medium text-gray-800">{product.totalSlots}</span>
                </span>
                <span className="text-gray-600">
                  剩餘：<span className="font-medium text-gray-800">{product.remaining}</span>
                </span>
              </div>
            </div>
          </div>

          {/* 補貨數量輸入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              補貨數量 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder={`最多可補貨 ${maxRestock} 口`}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
              min="1"
              max={maxRestock}
            />
            <p className="text-xs text-gray-500 mt-1">
              最多可補貨 {maxRestock} 口（總口數 - 剩餘口數）
            </p>
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>

          {/* 補貨後預覽 */}
          {quantity && !isNaN(parseInt(quantity)) && parseInt(quantity) > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <i className="ri-information-line text-green-600"></i>
                <span className="text-sm font-medium text-green-800">補貨後預覽</span>
              </div>
              <div className="text-sm text-green-700">
                剩餘口數將從 <span className="font-bold">{product.remaining}</span> 增加至{' '}
                <span className="font-bold">
                  {Math.min(product.remaining + parseInt(quantity), product.totalSlots)}
                </span>
              </div>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-medium whitespace-nowrap"
            >
              確認補貨
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}