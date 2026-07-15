import { useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import PrivateRoute from '../../../components/admin/PrivateRoute';
import { useShippingRecords } from './hooks/useShippingRecords';
import ShippingStatsCards from './components/ShippingStatsCards';
import ShippingFilters from './components/ShippingFilters';
import ShippingTable from './components/ShippingTable';

export default function AdminShippingPage() {
  const {
    batches,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    filters,
    initialize,
    applyFilters,
    goToPage,
    updateShippingStatus,
  } = useShippingRecords();

  useEffect(() => {
    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PrivateRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">發貨管理</h1>
              <p className="text-sm text-gray-500 mt-1">
                管理所有會員的發貨申請，批量申請自動合併為同一批次顯示
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                共 <span className="font-bold text-rose-600">{totalCount}</span> 筆申請
              </span>
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                <i className="ri-information-line text-orange-500"></i>
                <span className="text-sm text-orange-700">只顯示已申請發貨或已發貨的獎品</span>
              </div>
            </div>
          </div>

          <ShippingStatsCards
            batches={batches}
            activeFilter={filters.activeFilter}
            onFilterChange={(v) => applyFilters({ ...filters, activeFilter: v as 'all' | 'pending' | 'shipped' })}
          />

          <ShippingFilters
            activeFilter={filters.activeFilter}
            onFilterChange={(v) => applyFilters({ ...filters, activeFilter: v as 'all' | 'pending' | 'shipped' })}
            searchQuery={filters.searchQuery}
            onSearchChange={(v) => applyFilters({ ...filters, searchQuery: v })}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <i className="ri-error-warning-fill text-red-500 text-lg flex-shrink-0 mt-0.5"></i>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-700">載入發貨記錄失敗</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
              <button
                onClick={() => initialize()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-refresh-line mr-1"></i>重試
              </button>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <i className="ri-loader-4-line text-4xl text-gray-300 animate-spin mb-4"></i>
              <p className="text-gray-500">載入中...</p>
            </div>
          ) : (
            <>
              <ShippingTable
                batches={batches}
                onUpdateStatus={updateShippingStatus}
              />

              {/* 分頁控制 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3">
                  <p className="text-sm text-gray-500">
                    第 <strong>{currentPage}</strong> / {totalPages} 頁，共 <strong>{totalCount}</strong> 筆申請
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => goToPage(1)}
                      disabled={currentPage === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <i className="ri-skip-back-line text-sm"></i>
                    </button>
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <i className="ri-arrow-left-s-line text-sm"></i>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                      .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === 'ellipsis' ? (
                          <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">…</span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => goToPage(item as number)}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              currentPage === item
                                ? 'bg-rose-500 text-white border-rose-500'
                                : 'border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500'
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <i className="ri-arrow-right-s-line text-sm"></i>
                    </button>
                    <button
                      onClick={() => goToPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <i className="ri-skip-forward-line text-sm"></i>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </AdminLayout>
    </PrivateRoute>
  );
}
