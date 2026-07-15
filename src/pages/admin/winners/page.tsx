import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../../components/admin/AdminLayout';
import PrivateRoute from '../../../components/admin/PrivateRoute';
import { useWinnerRecords } from './hooks/useWinnerRecords';
import WinnerAnalyticsCards from './components/WinnerAnalyticsCards';
import WinnerRecordsTable from './components/WinnerRecordsTable';

export default function AdminWinnersPage() {
  const {
    records,
    loading,
    totalCount,
    currentPage,
    totalPages,
    filters,
    productOptions,
    initialize,
    applyFilters,
    goToPage,
  } = useWinnerRecords();

  const navigate = useNavigate();

  useEffect(() => {
    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusOptions = [
    { value: 'all', label: '全部狀態' },
    { value: 'not_requested', label: '未申請發貨' },
    { value: 'pending', label: '待發貨' },
    { value: 'shipped', label: '已發貨' },
  ];

  const sortOptions = [
    { value: 'newest', label: '最新抽獎' },
    { value: 'oldest', label: '最早抽獎' },
    { value: 'value_desc', label: '市場價格（高→低）' },
  ];

  return (
    <PrivateRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">中獎記錄</h1>
              <p className="text-sm text-gray-500 mt-1">查看所有會員的中獎情況及統計數據</p>
            </div>
            <button
              onClick={() => navigate('/admin/shipping')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-truck-line"></i>
              前往發貨管理
            </button>
          </div>

          <WinnerAnalyticsCards records={records} />

          {/* 篩選工具列 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => applyFilters({ ...filters, searchQuery: e.target.value })}
                  placeholder="搜索會員名稱、Email、獎品名稱..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <select
                  value={filters.filterProduct}
                  onChange={(e) => applyFilters({ ...filters, filterProduct: e.target.value })}
                  className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white appearance-none cursor-pointer"
                >
                  <option value="all">全部商品</option>
                  {productOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
              </div>

              <div className="relative">
                <select
                  value={filters.filterStatus}
                  onChange={(e) => applyFilters({ ...filters, filterStatus: e.target.value })}
                  className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white appearance-none cursor-pointer"
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
              </div>

              <div className="relative">
                <select
                  value={filters.sortBy}
                  onChange={(e) => applyFilters({ ...filters, sortBy: e.target.value as 'newest' | 'oldest' | 'value_desc' })}
                  className="pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white appearance-none cursor-pointer"
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-500 whitespace-nowrap">
                <i className="ri-list-check text-gray-400"></i>
                共 <span className="font-semibold text-gray-700">{totalCount}</span> 筆
              </div>

              {(filters.searchQuery || filters.filterProduct !== 'all' || filters.filterStatus !== 'all') && (
                <button
                  onClick={() => applyFilters({ ...filters, searchQuery: '', filterProduct: 'all', filterStatus: 'all' })}
                  className="px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1"
                >
                  <i className="ri-close-circle-line"></i>
                  清除篩選
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <i className="ri-loader-4-line text-4xl text-gray-300 animate-spin mb-4"></i>
              <p className="text-gray-500">載入中...</p>
            </div>
          ) : (
            <>
              <WinnerRecordsTable records={records} />

              {/* 分頁控制 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-3">
                  <p className="text-sm text-gray-500">
                    第 <strong>{currentPage}</strong> / {totalPages} 頁，共 <strong>{totalCount}</strong> 筆
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
