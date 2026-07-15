import type { WinnerRecord } from '../hooks/useWinnerRecords';

interface WinnerStatsCardsProps {
  records: WinnerRecord[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function WinnerStatsCards({ records, activeFilter, onFilterChange }: WinnerStatsCardsProps) {
  const totalWinners = records.length;
  const notRequestedCount = records.filter((r) => r.shippingStatus === 'not_requested').length;
  const pendingCount = records.filter((r) => r.shippingStatus === 'pending').length;
  const shippedCount = records.filter((r) => r.shippingStatus === 'shipped').length;

  const stats = [
    {
      label: '總中獎數',
      value: totalWinners,
      icon: 'ri-trophy-line',
      gradient: 'from-purple-500 to-indigo-600',
      filter: 'all',
    },
    {
      label: '未申請發貨',
      value: notRequestedCount,
      icon: 'ri-inbox-line',
      gradient: 'from-gray-500 to-slate-600',
      filter: 'not_requested',
    },
    {
      label: '待發貨',
      value: pendingCount,
      icon: 'ri-time-line',
      gradient: 'from-orange-500 to-amber-600',
      filter: 'pending',
    },
    {
      label: '已發貨',
      value: shippedCount,
      icon: 'ri-checkbox-circle-line',
      gradient: 'from-green-500 to-emerald-600',
      filter: 'shipped',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {stats.map((stat) => {
        const isActive = activeFilter === stat.filter;
        return (
          <div
            key={stat.filter}
            onClick={() => onFilterChange(stat.filter)}
            className={`bg-white rounded-xl border-2 p-6 transition-all cursor-pointer hover:shadow-lg ${
              isActive ? 'border-blue-500 shadow-md' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white`}>
                <i className={`${stat.icon} text-2xl`}></i>
              </div>
              {isActive && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full whitespace-nowrap">
                  篩選中
                </span>
              )}
            </div>
            <h3 className="text-sm text-gray-600 mb-1">{stat.label}</h3>
            <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}