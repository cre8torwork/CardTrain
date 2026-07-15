import { useMemo } from 'react';
import type { AdminUser } from '../hooks/useAllUsers';

interface Props {
  users: AdminUser[];
}

export default function UserStatsCards({ users }: Props) {
  const stats = useMemo(() => {
    const total = users.length;
    const totalDraws = users.reduce((sum, u) => sum + u.totalDraws, 0);
    const totalRevenue = users.reduce((sum, u) => sum + u.totalSpent, 0);
    const activeUsers = users.filter((u) => u.totalDraws > 0).length;
    const avgDraws = total > 0 ? (totalDraws / total).toFixed(1) : '0';
    const now = new Date();
    const thisMonth = users.filter((u) => {
      const d = new Date(u.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    
    // 計算高級會員數（PREMIUM 及以上）
    const premiumMembers = users.filter((u) => 
      ['PREMIUM', 'MASTER', 'LEGEND'].includes(u.memberLevel)
    ).length;

    // 已暫停用戶數
    const suspendedCount = users.filter((u) => u.status === 'suspended').length;

    // 未活躍用戶（最後登入超過 30 日，但尚未被暫停）
    const inactiveCount = users.filter((u) => {
      if (u.status === 'suspended') return false;
      if (!u.lastLoginAt) return false;
      const daysSince = (Date.now() - new Date(u.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 30;
    }).length;
    
    return { total, totalDraws, totalRevenue, activeUsers, avgDraws, thisMonth, premiumMembers, suspendedCount, inactiveCount };
  }, [users]);

  const cards = [
    {
      label: '總註冊用戶',
      value: stats.total.toLocaleString(),
      sub: `本月新增 ${stats.thisMonth} 人`,
      icon: 'ri-user-3-line',
      gradient: 'from-rose-500 to-pink-600',
      subColor: 'text-rose-500',
    },
    {
      label: '活躍用戶',
      value: stats.activeUsers.toLocaleString(),
      sub: `佔總用戶 ${stats.total > 0 ? ((stats.activeUsers / stats.total) * 100).toFixed(0) : 0}%`,
      icon: 'ri-user-heart-line',
      gradient: 'from-emerald-500 to-teal-600',
      subColor: 'text-emerald-500',
    },
    {
      label: '已暫停用戶',
      value: stats.suspendedCount.toLocaleString(),
      sub: stats.inactiveCount > 0 ? `另有 ${stats.inactiveCount} 人未活躍` : '所有帳號均正常',
      icon: 'ri-user-forbid-line',
      gradient: 'from-red-500 to-rose-600',
      subColor: 'text-red-500',
    },
    {
      label: '用戶總消費',
      value: `HK$${stats.totalRevenue.toLocaleString()}`,
      sub: `平均每人 HK$${stats.total > 0 ? Math.round(stats.totalRevenue / stats.total).toLocaleString() : 0}`,
      icon: 'ri-money-dollar-circle-line',
      gradient: 'from-amber-500 to-orange-500',
      subColor: 'text-amber-500',
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
          <p className={`text-xs mt-1 ${card.subColor}`}>{card.sub}</p>
        </div>
      ))}
    </div>
  );
}