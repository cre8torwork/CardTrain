import { useState, useMemo, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import PrivateRoute from '../../../components/admin/PrivateRoute';
import { useProductStore, Product } from '../../../hooks/useProductStore';
import { useCategoryStore } from '../../../hooks/useCategoryStore';
import ProductModal from './components/ProductModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import SlotPoolModal from './components/SlotPoolModal';
import { supabase } from '../../../lib/supabase';

interface WinnerRecord {
  winnerName: string;
  winnerEmail: string;
  prizeName: string;
  drawnAt: string;
  prizeImage: string;
}

export default function AdminProducts() {
  const { products, loadProducts, addProduct, updateProduct, deleteProduct } = useProductStore();
  const { categories, loadCategories } = useCategoryStore();
  
  useEffect(() => {
    loadCategories();
    loadProducts();
  }, [loadCategories, loadProducts]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('全部');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [allDrawRecords, setAllDrawRecords] = useState<any[]>([]);
  const [slotPoolModal, setSlotPoolModal] = useState<{ productId: number; productName: string; totalSlots: number; remaining: number; boardType: 'open' | 'closed' } | null>(null);

  const categoryNames = ['全部', ...categories.map(cat => cat.name)];

  // 從 Supabase 載入所有中獎紀錄
  useEffect(() => {
    loadDrawRecords();
  }, [products]);

  const loadDrawRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('draw_records')
        .select(`
          *,
          users (
            id,
            email,
            display_name
          )
        `)
        .eq('is_win', true);

      if (error) throw error;
      setAllDrawRecords(data || []);
    } catch (error) {
      console.error('載入中獎紀錄失敗:', error);
      setAllDrawRecords([]);
    }
  };

  // 計算每個商品的中獎資訊
  const productWinners = useMemo(() => {
    const winnersMap = new Map<number, WinnerRecord[]>();

    allDrawRecords.forEach((record: any) => {
      if (record.is_win && record.prize_name) {
        const existing = winnersMap.get(record.product_id) || [];
        
        existing.push({
          winnerName: record.users?.display_name || '未知用戶',
          winnerEmail: record.users?.email || '',
          prizeName: record.prize_name,
          drawnAt: record.drawn_at,
          prizeImage: record.prize_image,
        });
        winnersMap.set(record.product_id, existing);
      }
    });

    return winnersMap;
  }, [allDrawRecords]);

  // 篩選商品
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory === '全部' || product.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // 新增商品
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    setSaveError('');
    setIsSaving(true);
    try {
      await addProduct(productData);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('新增商品失敗:', error);
      setSaveError(error.message || '新增商品失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  // 編輯商品
  const handleEditProduct = async (productData: Omit<Product, 'id'>) => {
    if (!editingProduct) return;
    setSaveError('');
    setIsSaving(true);
    try {
      await updateProduct(editingProduct.id, productData);
      setEditingProduct(null);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('更新商品失敗:', error);
      setSaveError(error.message || '更新商品失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  // 刪除商品
  const handleDeleteProduct = () => {
    if (!deletingProduct) return;
    deleteProduct(deletingProduct.id);
    setDeletingProduct(null);
    setIsDeleteModalOpen(false);
  };

  // 開啟編輯 Modal
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  // 開啟刪除確認 Modal
  const openDeleteModal = (product: Product) => {
    setDeletingProduct(product);
    setIsDeleteModalOpen(true);
  };

  // 關閉 Modal
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingProduct(null);
  };

  // 切換展開/收合中獎者清單
  const toggleExpand = (productId: number) => {
    setExpandedProductId(expandedProductId === productId ? null : productId);
  };

  // 格式化時間
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };



  return (
    <PrivateRoute>
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          {/* 頁面標題與新增按鈕 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">商品管理</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <i className="ri-add-line text-lg"></i>
              <span className="font-medium">新增商品</span>
            </button>
          </div>

          {/* 搜尋與篩選區 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4">
              {/* 搜尋框 */}
              <div className="flex-1 min-w-[280px]">
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg"></i>
                  <input
                    type="text"
                    placeholder="搜尋商品名稱..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* 分類篩選 */}
              <div className="w-48">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm cursor-pointer"
                >
                  {categoryNames.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* 清除篩選 */}
              {(searchTerm || selectedCategory !== '全部') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('全部');
                  }}
                  className="px-4 py-2.5 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="ri-close-line"></i>
                  <span className="text-sm">清除篩選</span>
                </button>
              )}
            </div>

            {/* 搜尋結果統計 */}
            <div className="mt-3 text-sm text-gray-500">
              共找到 <span className="font-semibold text-gray-700">{filteredProducts.length}</span> 件商品
            </div>
          </div>

          {/* 商品列表表格 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      商品圖片
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      商品名稱
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      分類
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      價格
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      總口數
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      剩餘口數
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      已抽出
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      標籤
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                        <i className="ri-inbox-line text-4xl mb-2 block text-gray-300"></i>
                        <p>沒有找到符合條件的商品</p>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => {
                      const winners = productWinners.get(product.id) || [];
                      const totalPrizes = product.prizes?.reduce((sum, p) => sum + p.quantity, 0) || 0;
                      const isSoldOut = product.remaining <= 0;
                      const isExpanded = expandedProductId === product.id;

                      return (
                        <>
                          <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="w-16 h-20 flex items-center justify-center">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-800 max-w-xs truncate">
                                {product.name}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium whitespace-nowrap">
                                {product.category}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                                HK$ {product.price}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-600 whitespace-nowrap">{product.totalSlots}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-sm font-medium whitespace-nowrap ${
                                  product.remaining / product.totalSlots < 0.2
                                    ? 'text-red-600'
                                    : product.remaining / product.totalSlots < 0.5
                                    ? 'text-amber-600'
                                    : 'text-green-600'
                                }`}
                              >
                                {product.remaining}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {winners.length > 0 ? (
                                <button
                                  onClick={() => toggleExpand(product.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <i className="ri-trophy-line"></i>
                                  <span>{winners.length} 件</span>
                                  {isExpanded ? <i className="ri-arrow-up-s-line text-xs"></i> : <i className="ri-arrow-down-s-line text-xs"></i>}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5 flex-wrap">
                                {/* 明盤/暗盤標籤 */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${
                                  product.boardType === 'open'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                  <i className={product.boardType === 'open' ? 'ri-eye-line' : 'ri-eye-off-line'}></i>
                                  {product.boardType === 'open' ? '明盤' : '暗盤'}
                                </span>
                                {isSoldOut && (
                                  <span className="inline-flex px-2 py-0.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded text-xs font-bold whitespace-nowrap">
                                    已完售
                                  </span>
                                )}
                                {product.isHot && (
                                  <span className="inline-flex px-2 py-0.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded text-xs font-bold whitespace-nowrap">
                                    HOT
                                  </span>
                                )}
                                {product.isNew && (
                                  <span className="inline-flex px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded text-xs font-bold whitespace-nowrap">
                                    NEW
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setSlotPoolModal({ productId: product.id, productName: product.name, totalSlots: product.totalSlots, remaining: product.remaining, boardType: product.boardType })}
                                  className="w-8 h-8 flex items-center justify-center text-purple-600 hover:bg-purple-50 rounded-lg transition-colors whitespace-nowrap"
                                  title="查看號碼池"
                                >
                                  <i className="ri-grid-line text-lg"></i>
                                </button>
                                <button
                                  onClick={() => openEditModal(product)}
                                  className="w-8 h-8 flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
                                  title="編輯"
                                >
                                  <i className="ri-edit-line text-lg"></i>
                                </button>
                                <button
                                  onClick={() => openDeleteModal(product)}
                                  className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                                  title="刪除"
                                >
                                  <i className="ri-delete-bin-line text-lg"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {/* 展開的中獎者清單 */}
                          {isExpanded && winners.length > 0 && (
                            <tr>
                              <td colSpan={9} className="px-4 py-4 bg-amber-50/30">
                                <div className="ml-20">
                                  <div className="flex items-center gap-2 mb-3">
                                    <i className="ri-trophy-fill text-amber-600"></i>
                                    <h4 className="text-sm font-semibold text-gray-800">中獎者清單</h4>
                                  </div>
                                  <div className="space-y-2">
                                    {winners.map((winner, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-4 p-3 bg-white rounded-lg border border-amber-200"
                                      >
                                        <img
                                          src={winner.prizeImage}
                                          alt={winner.prizeName}
                                          className="w-12 h-16 object-cover rounded"
                                        />
                                        <div className="flex-1">
                                          <div className="text-sm font-medium text-gray-800">
                                            {winner.prizeName}
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1">
                                            中獎者：{winner.winnerName}
                                            {winner.winnerEmail && (
                                              <span className="ml-2">({winner.winnerEmail})</span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          {formatDate(winner.drawnAt)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 新增/編輯商品 Modal */}
        {isModalOpen && (
          <ProductModal
            product={editingProduct}
            categories={categoryNames.filter((c) => c !== '全部')}
            onSave={editingProduct ? handleEditProduct : handleAddProduct}
            onClose={closeModal}
            error={saveError}
            isSaving={isSaving}
          />
        )}

        {/* 刪除確認 Modal */}
        {isDeleteModalOpen && deletingProduct && (
          <DeleteConfirmModal
            productName={deletingProduct.name}
            onConfirm={handleDeleteProduct}
            onClose={closeDeleteModal}
          />
        )}

        {/* 號碼池管理 Modal */}
        {slotPoolModal && (
          <SlotPoolModal
            productId={slotPoolModal.productId}
            productName={slotPoolModal.productName}
            totalSlots={slotPoolModal.totalSlots}
            remaining={slotPoolModal.remaining}
            boardType={slotPoolModal.boardType}
            onClose={() => setSlotPoolModal(null)}
          />
        )}
      </AdminLayout>
    </PrivateRoute>
  );
}