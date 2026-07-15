import AdminLayout from '../../../components/admin/AdminLayout';
import PrivateRoute from '../../../components/admin/PrivateRoute';
import { useProductStore } from '../../../hooks/useProductStore';
import { useCategoryStore } from '../../../hooks/useCategoryStore';
import { useMemo } from 'react';

export default function AdminDashboard() {
  const { products, loaded } = useProductStore();
  const { getLocalizedName } = useCategoryStore();

  // 計算統計數據
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalSlots = products.reduce((sum, p) => sum + p.totalSlots, 0);
    const totalRemaining = products.reduce((sum, p) => sum + p.remaining, 0);
    const totalSold = totalSlots - totalRemaining;
    const hotProducts = products.filter(p => p.isHot).length;
    return { totalProducts, totalSlots, totalRemaining, totalSold, hotProducts };
  }, [products]);

  // 計算各分類商品數量
  const categoryStats = useMemo(() => {
    const categories: Record<string, number> = {};
    products.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, count]) => ({
      name,
      displayName: getLocalizedName(name),
      count,
      percentage: products.length > 0 ? (count / products.length) * 100 : 0,
    }));
  }, [products, getLocalizedName]);

  // 庫存警示商品（剩餘口數低於 20%）
  const lowStockProducts = useMemo(() => {
    return products
      .filter(p => p.totalSlots > 0 && (p.remaining / p.totalSlots) < 0.2)
      .sort((a, b) => (a.remaining / a.totalSlots) - (b.remaining / b.totalSlots));
  }, [products]);

  // 最新商品
  const latestProducts = useMemo(() => {
    return products.filter(p => p.isNew).slice(0, 5);
  }, [products]);

  const categoryColors = [
    'from-rose-500 to-pink-600',
    'from-purple-500 to-indigo-600',
    'from-teal-500 to-emerald-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-sky-600',
  ];

  return (
    <PrivateRoute>
      <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">儀表板</h2>

          {!loaded ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <i className="ri-loader-4-line text-4xl animate-spin"></i>
                <p className="text-sm">載入資料中...</p>
              </div>
            </div>
          ) : (
            <>
              {/* 統計卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">商品總數</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.totalProducts}</p>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg">
                      <i className="ri-shopping-bag-line text-2xl text-white"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">總庫存口數</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.totalSlots.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                      <i className="ri-stack-line text-2xl text-white"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">已售出口數</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.totalSold.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg">
                      <i className="ri-shopping-cart-line text-2xl text-white"></i>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">熱門商品數</p>
                      <p className="text-3xl font-bold text-gray-800">{stats.hotProducts}</p>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
                      <i className="ri-fire-line text-2xl text-white"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* 分類統計與庫存警示 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 各分類商品數量 */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="ri-pie-chart-line text-rose-600"></i>
                    各分類商品數量
                  </h3>
                  <div className="space-y-4">
                    {categoryStats.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">尚無分類資料</p>
                    ) : (
                      categoryStats.map((cat, index) => (
                        <div key={cat.name}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">{cat.displayName}</span>
                            <span className="text-sm text-gray-500">{cat.count} 項商品</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${categoryColors[index % categoryColors.length]} rounded-full transition-all duration-500`}
                              style={{ width: `${cat.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 庫存警示 */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="ri-alert-line text-amber-600"></i>
                    庫存警示
                    <span className="text-xs font-normal text-gray-500">（剩餘 &lt; 20%）</span>
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {lowStockProducts.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <i className="ri-checkbox-circle-line text-4xl mb-2"></i>
                        <p className="text-sm">目前沒有低庫存商品</p>
                      </div>
                    ) : (
                      lowStockProducts.map(product => {
                        const percentage = (product.remaining / product.totalSlots) * 100;
                        return (
                          <div key={product.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-red-600 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-600 whitespace-nowrap">
                                  {product.remaining}/{product.totalSlots}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* 最新商品 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <i className="ri-flashlight-line text-rose-600"></i>
                  最新商品
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {latestProducts.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-gray-400">
                      <i className="ri-inbox-line text-4xl mb-2"></i>
                      <p className="text-sm">目前沒有最新商品</p>
                    </div>
                  ) : (
                    latestProducts.map(product => (
                      <div key={product.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="relative mb-3">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-40 object-cover rounded-lg"
                          />
                          {product.isNew && (
                            <span className="absolute top-2 right-2 px-2 py-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold rounded-full">
                              NEW
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-gray-800 mb-2 line-clamp-2 h-10">{product.name}</h4>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{getLocalizedName(product.category)}</span>
                          <span className="font-bold text-rose-600">HK$ {product.price}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </AdminLayout>
    </PrivateRoute>
  );
}