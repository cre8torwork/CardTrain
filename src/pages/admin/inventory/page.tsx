import { useState, useMemo, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import PrivateRoute from '../../../components/admin/PrivateRoute';
import { useProductStore } from '../../../hooks/useProductStore';
import RestockModal from './components/RestockModal';
import BatchRestockModal from './components/BatchRestockModal';
import { supabase } from '../../../lib/supabase';
import { useUserAuth } from '../../../hooks/useUserAuth';

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

interface InventoryLog {
  id: string;
  productId: number;
  productName: string;
  action: string;
  quantity: number;
  timestamp: string;
  operator: string;
}

export default function AdminInventory() {
  const { products, updateStock, batchUpdateStock } = useProductStore();
  const { currentUser } = useUserAuth();
  const [selectedProduct, setSelectedProduct] = useState<ReturnType<typeof useProductStore>['products'][number] | null>(null);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [isBatchRestockModalOpen, setIsBatchRestockModalOpen] = useState(false);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('全部分類');

  // 載入庫存紀錄
  useEffect(() => {
    loadInventoryLogs();
  }, []);

  const loadInventoryLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedLogs: InventoryLog[] = (data || []).map((log: any) => ({
        id: log.id,
        productId: log.product_id,
        productName: log.product_name,
        action: log.action,
        quantity: log.quantity,
        timestamp: new Date(log.created_at).toLocaleString('zh-TW', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        operator: log.operator,
      }));

      setInventoryLogs(formattedLogs);
    } catch (error) {
      console.error('載入庫存紀錄失敗:', error);
    }
  };

  // 計算庫存狀態
  const getStockStatus = (remaining: number, total: number) => {
    if (remaining === 0) return { label: '已完售', color: 'text-gray-500 bg-gray-100' };
    const percentage = (remaining / total) * 100;
    if (percentage > 50) return { label: '充足', color: 'text-green-600 bg-green-50' };
    if (percentage >= 20) return { label: '偏低', color: 'text-amber-600 bg-amber-50' };
    return { label: '緊張', color: 'text-red-600 bg-red-50' };
  };

  // 計算庫存百分比
  const getStockPercentage = (remaining: number, total: number) => Math.round((remaining / total) * 100);

  // 獲取進度條顏色
  const getProgressColor = (percentage: number) => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage >= 20) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // 篩選商品
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === '全部分類' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  // 低庫存商品（剩餘口數 < 20%）
  const lowStockProducts = useMemo(() => {
    return products.filter((product) => (product.remaining / product.totalSlots) * 100 < 20);
  }, [products]);

  // 獲取所有分類
  const categories = ['全部分類', ...Array.from(new Set(products.map((p) => p.category)))];

  // 處理快速補貨
  const handleQuickRestock = (product: typeof products[number]) => {
    setSelectedProduct(product);
    setIsRestockModalOpen(true);
  };

  // 確認補貨
  const handleRestockConfirm = async (quantity: number) => {
    if (!selectedProduct) return;
    const newRemaining = Math.min(selectedProduct.remaining + quantity, selectedProduct.totalSlots);
    await updateStock(selectedProduct.id, newRemaining);

    // 儲存補貨紀錄到 Supabase
    try {
      const operatorName = currentUser?.displayName || currentUser?.email || '管理員';
      
      await supabase.from('inventory_logs').insert({
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        action: '補貨',
        quantity,
        operator: operatorName,
      });

      // 重新載入紀錄
      await loadInventoryLogs();
    } catch (error) {
      console.error('儲存補貨紀錄失敗:', error);
    }

    setIsRestockModalOpen(false);
    setSelectedProduct(null);
  };

  // 處理批量補貨
  const handleBatchRestockConfirm = async (restockData: { productId: number; quantity: number }[]) => {
    await batchUpdateStock(restockData);

    // 批量儲存補貨紀錄到 Supabase
    try {
      const operatorName = currentUser?.displayName || currentUser?.email || '管理員';
      
      const logs = restockData.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          product_id: item.productId,
          product_name: product?.name || '',
          action: '批量補貨',
          quantity: item.quantity,
          operator: operatorName,
        };
      });

      await supabase.from('inventory_logs').insert(logs);

      // 重新載入紀錄
      await loadInventoryLogs();
    } catch (error) {
      console.error('儲存批量補貨紀錄失敗:', error);
    }

    setIsBatchRestockModalOpen(false);
  };

  return (
    <PrivateRoute>
      <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 頁面標題與操作 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">庫存管理</h2>
              <p className="text-sm text-gray-500 mt-1">管理商品庫存與補貨作業</p>
            </div>
            <button
              onClick={() => setIsBatchRestockModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <i className="ri-stack-line text-lg"></i>
              <span className="font-medium">批量補貨</span>
            </button>
          </div>

          {/* 低庫存警示區 */}
          {lowStockProducts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-red-100 rounded-lg flex-shrink-0">
                  <i className="ri-error-warning-line text-red-600 text-xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-800 mb-2">低庫存警示</h3>
                  <p className="text-sm text-red-700 mb-3">
                    以下 {lowStockProducts.length} 項商品庫存不足 20%，請盡快補貨
                  </p>
                  <div className="space-y-2">
                    {lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded" />
                          <div>
                            <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500">剩餘 {product.remaining} / {product.totalSlots} 口</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleQuickRestock(product)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm whitespace-nowrap"
                        >
                          立即補貨
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 搜尋與篩選 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
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
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 庫存總覽表格 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      商品資訊
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      分類
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      總口數
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      已售出
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      剩餘口數
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      庫存進度
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const sold = product.totalSlots - product.remaining;
                    const percentage = getStockPercentage(product.remaining, product.totalSlots);
                    const status = getStockStatus(product.remaining, product.totalSlots);
                    const progressColor = getProgressColor(percentage);

                    return (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{product.name}</p>
                              <p className="text-xs text-gray-500">ID: {product.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">{product.category}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-800">
                            {product.totalSlots}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-medium text-gray-800">{sold}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-bold text-gray-800">
                            {product.remaining}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>{percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full ${progressColor} transition-all duration-300`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}
                          >
                            {product.remaining === 0 && <i className="ri-checkbox-circle-fill mr-1"></i>}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleQuickRestock(product)}
                            className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:shadow-md transition-all text-sm whitespace-nowrap"
                          >
                            補貨
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 庫存變更紀錄 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-800">庫存變更紀錄</h3>
              <p className="text-sm text-gray-500 mt-1">最近的庫存操作歷史</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      商品名稱
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      操作類型
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      數量
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      操作人員
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inventoryLogs.slice(0, 10).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{log.timestamp}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-800">{log.productName}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-600">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-green-600">+{log.quantity}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-600">{log.operator}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 快速補貨 Modal */}
        {isRestockModalOpen && selectedProduct && (
          <RestockModal
            product={selectedProduct}
            onClose={() => {
              setIsRestockModalOpen(false);
              setSelectedProduct(null);
            }}
            onConfirm={handleRestockConfirm}
          />
        )}

        {/* 批量補貨 Modal */}
        {isBatchRestockModalOpen && (
          <BatchRestockModal
            products={products}
            onClose={() => setIsBatchRestockModalOpen(false)}
            onConfirm={handleBatchRestockConfirm}
          />
        )}
      </AdminLayout>
    </PrivateRoute>
  );
}