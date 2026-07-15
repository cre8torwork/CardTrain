import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import PrivateRoute from '../../../components/admin/PrivateRoute';
import DrawRecordsTable from './components/DrawRecordsTable';
import DrawStatsCards from './components/DrawStatsCards';
import DrawFilters from './components/DrawFilters';
import { useAllDrawRecords } from './hooks/useAllDrawRecords';
import type { DrawFilters as DrawFiltersType } from './hooks/useAllDrawRecords';

export default function AdminDrawsPage() {
  const {
    records,
    users,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    pageSize,
    filters,
    initialize,
    applyFilters,
    goToPage,
    refresh,
  } = useAllDrawRecords();

  // 本地篩選狀態（即時更新 UI，按下搜尋或 blur 才送出）
  const [localFilters, setLocalFilters] = useState<DrawFiltersType>(filters);

  useEffect(() => {
    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (partial: Partial<DrawFiltersType>) => {
    const next = { ...localFilters, ...partial };
    setLocalFilters(next);
    applyFilters(next);
  };

  const categories = Array.from(
    new Set(records.map((r) => r.productCategory).filter(Boolean))
  );

  return (
    <PrivateRoute>
      <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <i className="ri-history-line text-rose-500"></i>
              抽獎紀錄查詢
            </h2>
            <span className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
              共 <span className="font-bold text-rose-600">{totalCount}</span> 筆紀錄
            </span>
          </div>

          {error ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-red-50 mb-4">
                <i className="ri-error-warning-line text-3xl text-red-400"></i>
              </div>
              <p className="text-gray-600 font-semibold mb-1">載入失敗</p>
              <p className="text-sm text-gray-400 mb-4">{error}</p>
              <button
                onClick={refresh}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-semibold hover:bg-rose-600 transition-colors cursor-pointer whitespace-nowrap"
              >
                重新載入
              </button>
            </div>
          ) : (
            <>
              <DrawStatsCards records={records} />

              <DrawFilters
                searchQuery={localFilters.searchQuery}
                setSearchQuery={(v) => handleFilterChange({ searchQuery: v })}
                selectedRarity={localFilters.selectedRarity}
                setSelectedRarity={(v) => handleFilterChange({ selectedRarity: v })}
                selectedUser={localFilters.selectedUser}
                setSelectedUser={(v) => handleFilterChange({ selectedUser: v })}
                selectedCategory={localFilters.selectedCategory}
                setSelectedCategory={(v) => handleFilterChange({ selectedCategory: v })}
                dateFrom={localFilters.dateFrom}
                setDateFrom={(v) => handleFilterChange({ dateFrom: v })}
                dateTo={localFilters.dateTo}
                setDateTo={(v) => handleFilterChange({ dateTo: v })}
                users={users}
                categories={categories}
                filteredCount={totalCount}
              />

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <i className="ri-loader-4-line text-4xl animate-spin"></i>
                    <p className="text-sm">載入中...</p>
                  </div>
                </div>
              ) : (
                <DrawRecordsTable
                  records={records}
                  users={users}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  pageSize={pageSize}
                  onPageChange={goToPage}
                />
              )}
            </>
          )}
        </div>
      </AdminLayout>
    </PrivateRoute>
  );
}
