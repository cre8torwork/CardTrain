interface WinnerFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function WinnerFilters({ activeFilter, onFilterChange }: WinnerFiltersProps) {
  const filters = [
    { value: 'all', label: '全部', icon: 'ri-list-check' },
    { value: 'not_requested', label: '未申請發貨', icon: 'ri-inbox-line' },
    { value: 'pending', label: '待發貨', icon: 'ri-time-line' },
    { value: 'shipped', label: '已發貨', icon: 'ri-checkbox-circle-line' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-3">
        <i className="ri-filter-3-line text-gray-400 text-lg"></i>
        <span className="text-sm font-medium text-gray-600">篩選狀態：</span>
        <div className="flex gap-2 flex-wrap">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onFilterChange(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
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
      </div>
    </div>
  );
}