import type { ShippingBatch } from '../hooks/useShippingRecords';

interface ShippingStatsCardsProps {
  batches: ShippingBatch[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export default function ShippingStatsCards({ batches, activeFilter, onFilterChange }: ShippingStatsCardsProps) {
  const pendingBatches = batches.filter((b) => b.batchStatus === 'pending' || b.batchStatus === 'mixed');
  const shippedBatches = batches.filter((b) => b.batchStatus === 'shipped');
  const totalBatches = batches.length;

  const pendingItemsCount = batches.reduce((sum, b) => sum + b.items.filter((i) => i.shippingStatus === 'pending').length, 0);
  const totalPendingValue = batches
    .flatMap((b) => b.items.filter((i) => i.shippingStatus === 'pending'))
    .reduce((sum, i) => sum + (i.marketPrice ?? 0), 0);

  const stats = [
    {
      label: '全部發貨申請',
      value: totalBatches,
      subValue: `共 ${batches.reduce((s, b) => s + b.items.length, 0)} 件獎品`,
      icon: 'ri-truck-line',
      gradient: 'from-rose-500 to-pink-600',
      filter: 'all',
    },
    {
      label: '待處理批次',
      value: pendingBatches.length,
      subValue: pendingItemsCount > 0
        ? `${pendingItemsCount} 件 · HK$${totalPendingValue.toLocaleString()}`
        : '等待處理',
      icon: 'ri-time-line',
      gradient: 'from-orange-500 to-amber-600',
      filter: 'pending',
    },
    {
      label: '已完成批次',
      value: shippedBatches.length,
      subValue: '全部已發貨',
      icon: 'ri-checkbox-circle-line',
      gradient: 'from-green-500 to-emerald-600',
      filter: 'shipped',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
      {stats.map((stat) => {
        const isActive = activeFilter === stat.filter;
        return (
          <div
            key={stat.filter}
            onClick={() => onFilterChange(stat.filter)}
            className={`bg-white rounded-xl border-2 p-5 transition-all cursor-pointer hover:shadow-md ${
              isActive ? 'border-rose-400 shadow-md' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white`}>
                <i className={`${stat.icon} text-2xl`}></i>
              </div>
              {isActive && (
                <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded-full whitespace-nowrap">篩選中</span>
              )}
            </div>
            <h3 className="text-sm text-gray-500 mb-1">{stat.label}</h3>
            <p className="text-3xl font-bold text-gray-800 mb-1">{stat.value}</p>
            <p className="text-xs text-gray-400">{stat.subValue}</p>
          </div>
        );
      })}
    </div>
  );
}
