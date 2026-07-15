import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import PrivateRoute from '@/components/admin/PrivateRoute';
import { useShopStore } from '@/hooks/useShopStore';
import type { ShopProduct } from '@/hooks/useShopStore';
import ShopProductModal from './components/ShopProductModal';

export default function AdminShopProductsPage() {
  const { products, loading, reloadProducts, addProduct, updateProduct, deleteProduct } = useShopStore();

  // 後台每次進入都強制重新載入（含下架商品）
  useEffect(() => {
    reloadProducts(true);
  }, [reloadProducts]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<ShopProduct | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const filteredProducts = products.filter((p) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (data: Omit<ShopProduct, 'id' | 'createdAt'>) => {
    if (editingProduct) {
      const ok = await updateProduct(editingProduct.id, data);
      if (ok) {
        showToast('商品已更新');
        setModalOpen(false);
        setEditingProduct(null);
      }
    } else {
      const ok = await addProduct(data);
      if (ok) {
        showToast('商品已新增');
        setModalOpen(false);
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const ok = await deleteProduct(deleteConfirm.id);
    if (ok) {
      showToast('商品已下架');
      setDeleteConfirm(null);
    }
  };

  const handleToggleActive = async (product: ShopProduct) => {
    await updateProduct(product.id, { isActive: !product.isActive });
    showToast(product.isActive ? '商品已下架' : '商品已上架');
  };

  const handleToggleFeatured = async (product: ShopProduct) => {
    await updateProduct(product.id, { isFeatured: !product.isFeatured });
    showToast(product.isFeatured ? '已取消精選' : '已設為精選，將顯示於首頁');
  };

  return (
    <PrivateRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">商城商品管理</h1>
              <p className="text-sm text-gray-500 mt-1">管理前台商品銷售頁的商品，以積分定價</p>
            </div>
            <button
              onClick={() => { setEditingProduct(null); setModalOpen(true); }}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-medium whitespace-nowrap cursor-pointer"
            >
              <i className="ri-add-line text-lg"></i>
              新增商品
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '全部商品', value: products.length, icon: 'ri-store-2-line', color: 'text-gray-600 bg-gray-50' },
              { label: '上架中', value: products.filter((p) => p.isActive).length, icon: 'ri-checkbox-circle-line', color: 'text-green-600 bg-green-50' },
              { label: '已下架', value: products.filter((p) => !p.isActive).length, icon: 'ri-close-circle-line', color: 'text-gray-400 bg-gray-50' },
              { label: '精選商品', value: products.filter((p) => p.isFeatured).length, icon: 'ri-star-line', color: 'text-amber-600 bg-amber-50' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${stat.color}`}>
                  <i className={`${stat.icon} text-xl`}></i>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-800">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="relative max-w-sm">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="搜尋商品名稱..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <i className="ri-loader-4-line text-4xl text-gray-300 animate-spin"></i>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <i className="ri-store-2-line text-5xl text-gray-200 mb-3"></i>
                <p className="text-gray-500">暫無商品，點擊「新增商品」開始吧</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">商品</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">分類</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">積分價格</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">庫存</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">精選首頁</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">狀態</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <i className="ri-image-line text-gray-300"></i>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800 max-w-[200px] truncate">{product.name}</p>
                              {product.description && (
                                <p className="text-xs text-gray-400 max-w-[200px] truncate">{product.description}</p>
                              )}
                              {product.isFeatured && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-600 text-xs font-bold rounded mt-0.5">
                                  <i className="ri-star-fill text-xs"></i>精選
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full whitespace-nowrap">
                            {product.category || '未分類'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-rose-500 whitespace-nowrap">
                            {product.price.toLocaleString()} CTP
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold whitespace-nowrap ${product.stock <= 5 ? 'text-red-500' : product.stock <= 20 ? 'text-amber-500' : 'text-green-600'}`}>
                            {product.stock} 件
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleFeatured(product)}
                            title={product.isFeatured ? '點擊取消精選' : '點擊設為精選（顯示於首頁）'}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all whitespace-nowrap ${
                              product.isFeatured
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-500'
                            }`}
                          >
                            <i className={product.isFeatured ? 'ri-star-fill' : 'ri-star-line'}></i>
                            {product.isFeatured ? '精選中' : '未精選'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(product)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                              product.isActive
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            <i className={product.isActive ? 'ri-checkbox-circle-fill' : 'ri-close-circle-line'}></i>
                            {product.isActive ? '上架中' : '已下架'}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setEditingProduct(product); setModalOpen(true); }}
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="編輯"
                            >
                              <i className="ri-edit-line text-lg"></i>
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(product)}
                              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="下架"
                            >
                              <i className="ri-delete-bin-line text-lg"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-xl shadow-lg text-sm font-medium">
            <i className="ri-checkbox-circle-fill text-green-400"></i>
            {toast}
          </div>
        )}

        {/* Product Modal */}
        {modalOpen && (
          <ShopProductModal
            product={editingProduct}
            onSave={handleSave}
            onClose={() => { setModalOpen(false); setEditingProduct(null); }}
          />
        )}

        {/* Delete Confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-500">
                  <i className="ri-delete-bin-line text-xl"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">確認下架商品</h3>
                  <p className="text-xs text-gray-500">此操作將把商品從前台隱藏</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                確定要下架「<strong>{deleteConfirm.name}</strong>」嗎？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors cursor-pointer whitespace-nowrap"
                >
                  確認下架
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </PrivateRoute>
  );
}
