import { useState, useRef, useEffect } from 'react';
import type { AdminUser } from '../hooks/useAllUsers';

type SortKey = 'createdAt' | 'displayName' | 'status' | 'totalDraws' | 'totalSpent' | 'pointsBalance' | 'memberLevel';
type SortOrder = 'asc' | 'desc';

interface Props {
  users: AdminUser[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  sortBy: SortKey;
  sortOrder: SortOrder;
  onSort: (key: SortKey) => void;
  onPageChange: (page: number) => void;
  onViewDetail: (user: AdminUser) => void;
  onAdjustPoints: (user: AdminUser) => void;
  onDeleteUser: (user: AdminUser) => void;
  onToggleStatus: (user: AdminUser) => void;
}

const GENDER_LABEL: Record<string, string> = {
  male: '男',
  female: '女',
  other: '其他',
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

interface SortableColumn {
  key: SortKey;
  label: string;
}

const SORTABLE_COLUMNS: SortableColumn[] = [
  { key: 'displayName', label: '用戶' },
  { key: 'status', label: '狀態' },
  { key: 'totalDraws', label: '抽獎次數' },
  { key: 'totalSpent', label: '總消費' },
  { key: 'pointsBalance', label: 'CTP 餘額' },
  { key: 'memberLevel', label: '會員等級' },
];

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function getDaysSince(iso: string | null): string {
  if (!iso) return '從未登入';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  return `${days} 天前`;
}

function getSortIcon(key: SortKey, activeKey: SortKey, activeOrder: SortOrder): string {
  if (key !== activeKey) return 'ri-arrow-up-down-line';
  return activeOrder === 'asc' ? 'ri-sort-asc' : 'ri-sort-desc';
}

export default function UserTable({
  users,
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onViewDetail,
  onAdjustPoints,
  onDeleteUser,
  onToggleStatus,
}: Props) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalCount);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdownId(null);
      }
    }
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const toggleExpand = (userId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(users.map((u) => u.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const allExpanded = users.length > 0 && users.every((u) => expandedIds.has(u.id));

  const renderSortableTh = (key: SortKey, label: string, textAlign: string) => {
    const isActive = sortBy === key;
    return (
      <th
        className={`${textAlign} px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-rose-600 hover:bg-rose-50/50 transition-colors group`}
        onClick={() => onSort(key)}
      >
        <span className="inline-flex items-center gap-1.5">
          {label}
          <i
            className={`${getSortIcon(key, sortBy, sortOrder)} text-[11px] transition-colors ${
              isActive ? 'text-rose-500' : 'text-gray-300 group-hover:text-rose-400'
            }`}
          ></i>
        </span>
      </th>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 工具列 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/50">
        <p className="text-xs text-gray-400">
          顯示第 <span className="font-medium text-gray-600">{start}</span>–<span className="font-medium text-gray-600">{end}</span> 筆，共 <span className="font-medium text-gray-600">{totalCount}</span> 筆
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {expandedIds.size > 0 ? `${expandedIds.size} 行已展開` : '點擊行可展開詳細資料'}
          </span>
          <button
            onClick={allExpanded ? collapseAll : expandAll}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className={`${allExpanded ? 'ri-contract-up-down-line' : 'ri-expand-up-down-line'} text-sm`}></i>
            {allExpanded ? '收合全部' : '展開全部'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-10 px-3 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider"></th>
              {renderSortableTh('displayName', '用戶', 'text-left')}
              {renderSortableTh('status', '狀態', 'text-center')}
              {renderSortableTh('totalDraws', '抽獎次數', 'text-center')}
              {renderSortableTh('totalSpent', '總消費', 'text-right')}
              {renderSortableTh('pointsBalance', 'CTP 餘額', 'text-right')}
              {renderSortableTh('memberLevel', '會員等級', 'text-center')}
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-gray-400">
                  <i className="ri-user-search-line text-4xl mb-3 block"></i>
                  <p>找不到符合條件的用戶</p>
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const levelConfig = MEMBER_LEVEL_CONFIG[user.memberLevel] || MEMBER_LEVEL_CONFIG.BEGINNER;
                const isSuspended = user.status === 'suspended';
                const isExpanded = expandedIds.has(user.id);
                const daysSinceLastLogin = getDaysSince(user.lastLoginAt);
                const daysSinceLoginNum = user.lastLoginAt
                  ? Math.floor((Date.now() - new Date(user.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                const isInactive = daysSinceLoginNum !== null && daysSinceLoginNum > 30;

                return (
                  <>
                    {/* 主行 */}
                    <tr
                      key={user.id}
                      className={`transition-colors cursor-pointer ${isSuspended ? 'bg-red-50/30 hover:bg-red-100/40' : 'hover:bg-rose-50/30'}`}
                    >
                      {/* 展開按鈕 */}
                      <td className="px-3 py-4 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(user.id); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <i className={`${isExpanded ? 'ri-arrow-down-s-line' : 'ri-arrow-right-s-line'} text-base transition-transform`}></i>
                        </button>
                      </td>

                      {/* 用戶 */}
                      <td className="px-4 py-3.5" onClick={() => toggleExpand(user.id)}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 flex items-center justify-center bg-gradient-to-br rounded-full text-white text-xs font-bold shrink-0 ${isSuspended ? 'from-gray-400 to-gray-500' : 'from-rose-400 to-pink-500'}`}>
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium truncate ${isSuspended ? 'text-gray-400' : 'text-gray-800'}`}>
                              {user.displayName}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* 狀態 */}
                      <td className="px-4 py-3.5 text-center" onClick={() => toggleExpand(user.id)}>
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">
                            <i className="ri-forbid-2-line text-xs"></i>
                            已暫停
                          </span>
                        ) : isInactive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-600">
                            <i className="ri-alert-line text-xs"></i>
                            未活躍
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-600">
                            <i className="ri-check-line text-xs"></i>
                            正常
                          </span>
                        )}
                      </td>

                      {/* 抽獎次數 */}
                      <td className="px-4 py-3.5 text-center" onClick={() => toggleExpand(user.id)}>
                        <span className={`font-semibold ${isSuspended ? 'text-gray-400' : 'text-gray-800'}`}>{user.totalDraws}</span>
                      </td>

                      {/* 總消費 */}
                      <td className="px-4 py-3.5 text-right font-medium text-emerald-600" onClick={() => toggleExpand(user.id)}>
                        HK${user.totalSpent.toLocaleString()}
                      </td>

                      {/* CTP 餘額 */}
                      <td className="px-4 py-3.5 text-right" onClick={() => toggleExpand(user.id)}>
                        <span className={`font-bold ${isSuspended ? 'text-gray-400' : 'text-rose-500'}`}>
                          {user.pointsBalance.toLocaleString()} CTP
                        </span>
                      </td>

                      {/* 會員等級 */}
                      <td className="px-4 py-3.5 text-center" onClick={() => toggleExpand(user.id)}>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${levelConfig.className}`}>
                          {user.memberLevel}
                        </span>
                      </td>

                      {/* 操作 */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onToggleStatus(user)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                              isSuspended
                                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                            }`}
                          >
                            <i className={isSuspended ? 'ri-play-circle-line' : 'ri-pause-circle-line'}></i>
                            {isSuspended ? '激活' : '暫停'}
                          </button>

                          <div className="relative" ref={openDropdownId === user.id ? dropdownRef : undefined}>
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                openDropdownId === user.id
                                  ? 'bg-rose-100 text-rose-600'
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              <i className="ri-more-2-fill"></i>
                            </button>

                            {openDropdownId === user.id && (
                              <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-gray-200 shadow-lg z-30 py-1 overflow-hidden">
                                <button
                                  onClick={() => { setOpenDropdownId(null); onViewDetail(user); }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer text-left"
                                >
                                  <i className="ri-eye-line"></i>
                                  查看詳情
                                </button>
                                <button
                                  onClick={() => { setOpenDropdownId(null); onAdjustPoints(user); }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer text-left"
                                >
                                  <i className="ri-coin-line"></i>
                                  調整積分
                                </button>
                                <div className="border-t border-gray-100 my-1"></div>
                                <button
                                  onClick={() => { setOpenDropdownId(null); onDeleteUser(user); }}
                                  className="w-full flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer text-left"
                                >
                                  <i className="ri-delete-bin-line"></i>
                                  刪除用戶
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* 展開詳細資料 */}
                    {isExpanded && (
                      <tr key={`${user.id}-detail`} className={`${isSuspended ? 'bg-red-50/10' : 'bg-rose-50/20'}`}>
                        <td></td>
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">性別</span>
                              <span className="text-sm text-gray-700 font-medium">
                                {GENDER_LABEL[user.gender] || user.gender || '—'}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">最喜愛寶可夢卡</span>
                              <span className="text-sm text-gray-700 font-medium truncate max-w-[160px]">
                                {user.favoritePokemon || '—'}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">最後登入</span>
                              <span className={`text-sm font-medium ${isInactive && !isSuspended ? 'text-amber-600' : isSuspended ? 'text-red-400' : 'text-gray-700'}`}>
                                {formatDate(user.lastLoginAt)}
                              </span>
                              <span className={`text-[11px] ${isInactive && !isSuspended ? 'text-amber-500' : isSuspended ? 'text-red-300' : 'text-gray-400'}`}>
                                {daysSinceLastLogin}
                              </span>
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">90日購買積分</span>
                              <span className="text-sm text-amber-600 font-semibold">
                                {user.totalPurchasedPoints.toLocaleString()} CTP
                              </span>
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">註冊日期</span>
                              <span className="text-sm text-gray-500">
                                {formatDate(user.createdAt)}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-500">
            顯示第 <span className="font-medium text-gray-700">{start}</span>–<span className="font-medium text-gray-700">{end}</span> 筆，共 <span className="font-medium text-gray-700">{totalCount}</span> 筆
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <i className="ri-skip-back-line text-sm"></i>
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <i className="ri-arrow-left-s-line text-sm"></i>
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    currentPage === page
                      ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-white hover:text-rose-600'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <i className="ri-arrow-right-s-line text-sm"></i>
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-white hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <i className="ri-skip-forward-line text-sm"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}