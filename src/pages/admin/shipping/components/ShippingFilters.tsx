interface ShippingFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function ShippingFilters({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: ShippingFiltersProps) {
  const filters = [
    { value: 'all', label: '全部', icon: 'ri-list-check' },
    { value: 'pending', label: '待發貨', icon: 'ri-time-line' },
    { value: 'shipped', label: '已發貨', icon: 'ri-checkbox-circle-line' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <i className="ri-filter-3-line text-gray-400 text-lg"></i>
          <span className="text-sm font-medium text-gray-600">狀態：</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onFilterChange(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeFilter === filter.value
                  ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <i className={filter.icon}></i>
              {filter.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索會員名稱、獎品名稱..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
