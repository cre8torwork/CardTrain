import { useState, useMemo } from 'react';

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

interface BatchRestockModalProps {
  products: Product[];
  onClose: () => void;
  onConfirm: (restockData: { productId: number; quantity: number }[]) => void;
}

export default function BatchRestockModal({ products, onClose, onConfirm }: BatchRestockModalProps) {
  const [restockData, setRestockData] = useState<{ [key: number]: string }>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('全部分類');

  // 獲取所有分類
  const categories = ['全部分類', ...Array.from(new Set(products.map((p) => p.category)))];

  // 篩選商品
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === '全部分類' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  // 處理數量變更
  const handleQuantityChange = (productId: number, value: string) => {
    setRestockData((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  // 處理提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validRestockData = Object.entries(restockData)
      .filter(([_, value]) => value && !isNaN(parseInt(value)) && parseInt(value) > 0)
      .map(([productId, value]) => ({
        productId: parseInt(productId),
        quantity: parseInt(value),
      }));

    if (validRestockData.length === 0) {
      alert('請至少輸入一項商品的補貨數量');
      return;
    }

    // 驗證補貨數量不超過最大值
    for (const item of validRestockData) {
      const product = products.find((p) => p.id === item.productId);
      if (product) {
        const maxRestock = product.totalSlots - product.remaining;
        if (item.quantity > maxRestock) {
          alert(`${product.name} 的補貨數量不可超過 ${maxRestock}`);
          return;
        }
      }
    }

    onConfirm(validRestockData);
  };

  // 計算已選擇的商品數量
  const selectedCount = Object.values(restockData).filter(
    (value) => value && !isNaN(parseInt(value)) && parseInt(value) > 0
  ).length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">批量補貨</h3>
            <p className="text-sm text-gray-500 mt-1">
              已選擇 {selectedCount} 項商品
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* 搜尋與篩選 */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="搜尋商品名稱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm whitespace-nowrap"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="space-y-3">
              {filteredProducts.map((product) => {
                const maxRestock = product.totalSlots - product.remaining;
                const currentValue = restockData[product.id] || '';
                const qty = currentValue ? parseInt(currentValue) : 0;

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 text-sm truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{product.category}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                        <span>
                          剩餘：<span className="font-medium">{product.remaining}</span>
                        </span>
                        <span>
                          總口數：<span className="font-medium">{product.totalSlots}</span>
                        </span>
                        <span className="text-amber-600">
                          最多可補：<span className="font-medium">{maxRestock}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={currentValue}
                        onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                        placeholder="補貨數量"
                        className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                        min="0"
                        max={maxRestock}
                      />
                      {qty > 0 && (
                        <div className="text-xs text-green-600 font-medium whitespace-nowrap">
                          → {product.remaining + qty}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                已選擇 <span className="font-bold text-gray-800">{selectedCount}</span> 項商品進行補貨
              </div>
            </div>
            <div className="flex items-center gap-3">
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
                確認批量補貨
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}