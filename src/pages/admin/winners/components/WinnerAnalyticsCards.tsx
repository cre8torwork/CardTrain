import type { WinnerRecord } from '../hooks/useWinnerRecords';

interface WinnerAnalyticsCardsProps {
  records: WinnerRecord[];
}

export default function WinnerAnalyticsCards({ records }: WinnerAnalyticsCardsProps) {
  const totalWins = records.length;
  const totalMarketValue = records.reduce((sum, r) => sum + (r.marketPrice || 0), 0);

  const now = new Date();
  const thisMonthWins = records.filter((r) => {
    const d = new Date(r.drawTime);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  // Top product by win count
  const productCount: Record<string, number> = {};
  records.forEach((r) => {
    productCount[r.productName] = (productCount[r.productName] || 0) + 1;
  });
  const topProduct = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    {
      label: '總中獎次數',
      value: totalWins.toString(),
      icon: 'ri-trophy-line',
      gradient: 'from-rose-500 to-pink-600',
      sub: '所有時間',
    },
    {
      label: '本月中獎',
      value: thisMonthWins.toString(),
      icon: 'ri-calendar-check-line',
      gradient: 'from-violet-500 to-purple-600',
      sub: `${now.getMonth() + 1}月份`,
    },
    {
      label: '已派出市場總值',
      value: totalMarketValue > 0 ? `HK$${totalMarketValue.toLocaleString()}` : '—',
      icon: 'ri-price-tag-3-line',
      gradient: 'from-amber-500 to-orange-600',
      sub: '所有獎品合計',
    },
    {
      label: '最多中獎商品',
      value: topProduct ? topProduct[0] : '—',
      icon: 'ri-fire-line',
      gradient: 'from-teal-500 to-emerald-600',
      sub: topProduct ? `共 ${topProduct[1]} 次中獎` : '暫無數據',
      isLong: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white flex-shrink-0`}>
              <i className={`${stat.icon} text-2xl`}></i>
            </div>
          </div>
          <h3 className="text-sm text-gray-500 mb-1">{stat.label}</h3>
          <p className={`font-bold text-gray-800 mb-1 ${stat.isLong ? 'text-base leading-tight' : 'text-3xl'}`}>
            {stat.value}
          </p>
          <p className="text-xs text-gray-400">{stat.sub}</p>
        </div>
      ))}
    </div>
  );
}
