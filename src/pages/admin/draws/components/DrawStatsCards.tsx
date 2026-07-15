import { useMemo } from 'react';
import type { AdminDrawRecord } from '../hooks/useAllDrawRecords';

interface Props {
  records: AdminDrawRecord[];
}

export default function DrawStatsCards({ records }: Props) {
  const stats = useMemo(() => {
    const total = records.length;
    const totalRevenue = records.reduce((sum, r) => sum + r.price, 0);
    const ssCount = records.filter((r) => ['SS', 'S'].includes(r.rarity)).length;
    const aCount = records.filter((r) => r.rarity === 'A').length;
    const uniqueUsers = new Set(records.map((r) => r.userId)).size;
    const ssRate = total > 0 ? ((ssCount / total) * 100).toFixed(1) : '0.0';
    return { total, totalRevenue, ssCount, aCount, uniqueUsers, ssRate };
  }, [records]);

  const cards = [
    {
      label: '總抽獎次數',
      value: stats.total.toLocaleString(),
      icon: 'ri-dice-line',
      gradient: 'from-rose-500 to-pink-600',
      bg: 'bg-rose-50',
      text: 'text-rose-600',
    },
    {
      label: '總收益',
      value: `HK$${stats.totalRevenue.toLocaleString()}`,
      icon: 'ri-money-dollar-circle-line',
      gradient: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    {
      label: '參與用戶數',
      value: stats.uniqueUsers.toLocaleString(),
      icon: 'ri-user-line',
      gradient: 'from-amber-500 to-orange-600',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
    },
    {
      label: 'SS/S 出現次數',
      value: stats.ssCount.toLocaleString(),
      icon: 'ri-star-fill',
      gradient: 'from-purple-500 to-indigo-600',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      sub: `出現率 ${stats.ssRate}%`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500">{card.label}</p>
            <div className={`w-10 h-10 flex items-center justify-center bg-gradient-to-br ${card.gradient} rounded-lg`}>
              <i className={`${card.icon} text-xl text-white`}></i>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{card.value}</p>
          {card.sub && <p className={`text-xs mt-1 ${card.text}`}>{card.sub}</p>}
        </div>
      ))}
    </div>
  );
}
