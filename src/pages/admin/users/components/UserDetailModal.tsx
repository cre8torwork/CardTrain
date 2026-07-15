import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { AdminUser } from '../hooks/useAllUsers';

interface Props {
  user: AdminUser | null;
  onClose: () => void;
}

const GENDER_LABEL: Record<string, string> = {
  male: '男',
  female: '女',
  other: '其他',
};

const RARITY_COLOR: Record<string, string> = {
  C:  'bg-gray-100 text-gray-600',
  B:  'bg-cyan-100 text-cyan-700',
  A:  'bg-violet-100 text-violet-700',
  S:  'bg-amber-100 text-amber-700',
  SS: 'bg-rose-100 text-rose-700',
};

const MEMBER_LEVEL_CONFIG: Record<string, { className: string }> = {
  BEGINNER: { className: 'bg-gray-100 text-gray-600' },
  STANDARD: { className: 'bg-blue-100 text-blue-700' },
  ADVANCE: { className: 'bg-green-100 text-green-700' },
  EXPERT: { className: 'bg-purple-100 text-purple-700' },
  PREMIUM: { className: 'bg-amber-100 text-amber-700' },
  MASTER: { className: 'bg-rose-100 text-rose-700' },
  LEGEND: { className: 'bg-gradient-to-r from-pink-500 to-violet-500 text-white' },
};

interface DrawRecord {
  id: string;
  productName: string;
  productCategory: string;
  price: number;
  result: string;
  rarity: string;
  estimatedValue: number;
  drawnAt: string;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function UserDetailModal({ user, onClose }: Props) {
  const [history, setHistory] = useState<DrawRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    setHistoryLoading(true);
    supabase
      .from('draw_records')
      .select('id, product_name, product_category, price, result, rarity, estimated_value, drawn_at')
      .eq('user_id', user.id)
      .order('drawn_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          console.error('載入抽獎紀錄失敗:', error);
          setHistory([]);
        } else {
          setHistory(
            (data || []).map((r: any) => ({
              id: r.id,
              productName: r.product_name || '',
              productCategory: r.product_category || '',
              price: r.price || 0,
              result: r.result || '',
              rarity: r.rarity || 'N',
              estimatedValue: r.estimated_value || 0,
              drawnAt: r.drawn_at,
            }))
          );
        }
        setHistoryLoading(false);
      });
  }, [user]);

  if (!user) return null;

  const levelConfig = MEMBER_LEVEL_CONFIG[user.memberLevel] || MEMBER_LEVEL_CONFIG.BEGINNER;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-pink-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 rounded-full text-white text-xl font-bold">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{user.displayName}</h3>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-2 text-center">
              <p className="text-xs text-gray-400">CTP 餘額</p>
              <p className="text-base font-bold text-rose-600">{user.pointsBalance.toLocaleString()} CTP</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* 基本資料 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">基本資料</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: '出生日期', value: formatDate(user.birthDate) },
                { label: '性別', value: GENDER_LABEL[user.gender] || user.gender || '—' },
                { label: '最喜愛寶可夢卡', value: user.favoritePokemon || '—' },
                { label: '註冊日期', value: formatDate(user.createdAt) },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  <p className="text-sm font-medium text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 抽獎統計 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">抽獎統計</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: '總抽獎次數', value: user.totalDraws.toLocaleString(), color: 'text-rose-600' },
                { label: '總消費金額', value: `HK$${user.totalSpent.toLocaleString()}`, color: 'text-emerald-600' },
                { label: 'SS/S 獲得', value: `${user.ssrCount} 次`, color: 'text-amber-600' },
                { label: '最後抽獎', value: user.lastDrawAt ? formatDate(user.lastDrawAt) : '尚未抽獎', color: 'text-gray-600' },
                { label: '90日購買積分', value: `${user.totalPurchasedPoints.toLocaleString()} CTP`, color: 'text-violet-600' },
                { 
                  label: '當前會員等級', 
                  value: user.memberLevel, 
                  color: 'text-gray-800',
                  badge: true,
                  badgeClass: levelConfig.className
                },
              ].map((item) => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                  {item.badge ? (
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${item.badgeClass}`}>
                      {item.value}
                    </span>
                  ) : (
                    <p className={`text-base font-bold ${item.color}`}>{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 最近抽獎紀錄 */}
          <div>
            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              最近抽獎紀錄
              <span className="ml-2 text-xs font-normal text-gray-400 normal-case">（最多顯示 20 筆）</span>
            </h4>

            {historyLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <i className="ri-loader-4-line text-2xl animate-spin mr-2"></i>
                <span className="text-sm">載入中...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <i className="ri-inbox-line text-3xl mb-2 block"></i>
                <p className="text-sm">尚無抽獎紀錄</p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">商品</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">結果</th>
                      <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500">稀有度</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">消費</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">時間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {history.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 text-gray-700 max-w-[140px] truncate">{r.productName}</td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-[160px] truncate">{r.result}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${RARITY_COLOR[r.rarity] ?? 'bg-gray-100 text-gray-600'}`}>
                            {r.rarity}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-700">HK${r.price}</td>
                        <td className="px-4 py-2.5 text-right text-gray-400 text-xs whitespace-nowrap">{formatDateTime(r.drawnAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}