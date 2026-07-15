import type { UserInfo } from '../hooks/useAllDrawRecords';

const RARITIES = ['C', 'B', 'A', 'S', 'SS'];

interface Props {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedRarity: string;
  setSelectedRarity: (v: string) => void;
  selectedUser: string;
  setSelectedUser: (v: string) => void;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  users: UserInfo[];
  categories: string[];
  filteredCount: number;
}

export default function DrawFilters({
  searchQuery, setSearchQuery,
  selectedRarity, setSelectedRarity,
  selectedUser, setSelectedUser,
  selectedCategory, setSelectedCategory,
  dateFrom, setDateFrom,
  dateTo, setDateTo,
  users, categories, filteredCount,
}: Props) {
  const hasFilter = searchQuery || selectedRarity || selectedUser || selectedCategory || dateFrom || dateTo;

  const handleReset = () => {
    setSearchQuery('');
    setSelectedRarity('');
    setSelectedUser('');
    setSelectedCategory('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <i className="ri-filter-3-line text-rose-500"></i>
          篩選條件
        </h3>
        {hasFilter && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <i className="ri-refresh-line"></i>
            清除篩選
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 關鍵字搜尋 */}
        <div className="relative">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
          <input
            type="text"
            placeholder="搜尋商品名稱或卡牌名稱..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition"
          />
        </div>

        {/* 稀有度 */}
        <select
          value={selectedRarity}
          onChange={(e) => setSelectedRarity(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition cursor-pointer"
        >
          <option value="">全部稀有度</option>
          {RARITIES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {/* 用戶 */}
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition cursor-pointer"
        >
          <option value="">全部用戶</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.displayName}（{u.email}）</option>
          ))}
        </select>

        {/* 商品分類 */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition cursor-pointer"
        >
          <option value="">全部分類</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* 開始日期 */}
        <div className="relative">
          <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-400">開始日期</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition cursor-pointer"
          />
        </div>

        {/* 結束日期 */}
        <div className="relative">
          <label className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-400">結束日期</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition cursor-pointer"
          />
        </div>
      </div>

      {hasFilter && (
        <p className="text-xs text-gray-500">
          篩選結果：共 <span className="font-bold text-rose-600">{filteredCount}</span> 筆紀錄
        </p>
      )}
    </div>
  );
}
