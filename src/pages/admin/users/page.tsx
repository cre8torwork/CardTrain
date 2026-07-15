import { useState, useMemo } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import PrivateRoute from '../../../components/admin/PrivateRoute';
import UserStatsCards from './components/UserStatsCards';
import UserTable from './components/UserTable';
import UserDetailModal from './components/UserDetailModal';
import AdjustPointsModal from './components/AdjustPointsModal';
import DeleteUserModal from './components/DeleteUserModal';
import { useAllUsers } from './hooks/useAllUsers';
import { EDGE_FUNCTIONS } from '../../../lib/edgeFunctions';
import type { AdminUser } from './hooks/useAllUsers';

const PAGE_SIZE = 15;

type SortKey = 'createdAt' | 'displayName' | 'status' | 'totalDraws' | 'totalSpent' | 'pointsBalance' | 'memberLevel';
type SortOrder = 'asc' | 'desc';

const MEMBER_LEVEL_RANK: Record<string, number> = {
  BEGINNER: 0,
  STANDARD: 1,
  ADVANCE: 2,
  EXPERT: 3,
  PREMIUM: 4,
  MASTER: 5,
  LEGEND: 6,
};

export default function AdminUsersPage() {
  const { users, loading, refresh } = useAllUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [adjustUser, setAdjustUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);

  const handleSort = (key: SortKey) => {
    if (key === sortBy) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    let result = [...users];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.favoritePokemon.toLowerCase().includes(q)
      );
    }
    if (selectedGender) {
      result = result.filter((u) => u.gender === selectedGender);
    }
    if (selectedStatus === 'suspended') {
      result = result.filter((u) => u.status === 'suspended');
    } else if (selectedStatus === 'active') {
      result = result.filter((u) => u.status !== 'suspended');
    } else if (selectedStatus === 'inactive') {
      result = result.filter((u) => {
        if (u.status === 'suspended') return false;
        if (!u.lastLoginAt) return false;
        const daysSince = (Date.now() - new Date(u.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince > 30;
      });
    }
    result.sort((a, b) => {
      const order = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'displayName':
          return a.displayName.localeCompare(b.displayName, 'zh-Hant') * order;
        case 'status': {
          const statusPriority: Record<string, number> = { active: 0, suspended: 2 };
          const aP = statusPriority[a.status] ?? 1;
          const bP = statusPriority[b.status] ?? 1;
          return (aP - bP) * order;
        }
        case 'totalDraws':
          return (a.totalDraws - b.totalDraws) * order;
        case 'totalSpent':
          return (a.totalSpent - b.totalSpent) * order;
        case 'pointsBalance':
          return (a.pointsBalance - b.pointsBalance) * order;
        case 'memberLevel':
          return ((MEMBER_LEVEL_RANK[a.memberLevel] ?? -1) - (MEMBER_LEVEL_RANK[b.memberLevel] ?? -1)) * order;
        case 'createdAt':
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * order;
      }
    });
    return result;
  }, [users, searchQuery, selectedGender, selectedStatus, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleFilterChange = () => setCurrentPage(1);

  const handleToggleStatus = async (user: AdminUser) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      const res = await fetch(EDGE_FUNCTIONS.adminOperations, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_user_status',
          userId: user.id,
          newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || '操作失敗');
      refresh();
    } catch (error) {
      console.error('切換用戶狀態失敗:', error);
    }
  };

  return (
    <PrivateRoute>
      <AdminLayout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 頁面標題 */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <i className="ri-user-3-line text-rose-500"></i>
              用戶管理
            </h2>
            <span className="text-sm text-gray-500 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
              共 <span className="font-bold text-rose-600">{users.length}</span> 位已註冊用戶
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
              <i className="ri-loader-4-line text-4xl animate-spin mb-3"></i>
              <p className="text-sm">載入用戶資料中...</p>
            </div>
          ) : (
            <>
              {/* 統計卡片 */}
              <UserStatsCards users={users} />

              {/* 篩選列 */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* 搜尋 */}
                  <div className="relative flex-1 min-w-[220px]">
                    <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input
                      type="text"
                      placeholder="搜尋用戶名稱、電郵或寶可夢卡..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); handleFilterChange(); }}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition"
                    />
                  </div>

                  {/* 性別篩選 */}
                  <select
                    value={selectedGender}
                    onChange={(e) => { setSelectedGender(e.target.value); handleFilterChange(); }}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 text-gray-600 cursor-pointer"
                  >
                    <option value="">全部性別</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>

                  {/* 狀態篩選 */}
                  <select
                    value={selectedStatus}
                    onChange={(e) => { setSelectedStatus(e.target.value); handleFilterChange(); }}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 text-gray-600 cursor-pointer"
                  >
                    <option value="">全部狀態</option>
                    <option value="active">正常</option>
                    <option value="suspended">已暫停</option>
                    <option value="inactive">未活躍（逾30日）</option>
                  </select>

                  {/* 排序下拉（與欄位點擊排序同步） */}
                  <select
                    value={`${sortBy}:${sortOrder}`}
                    onChange={(e) => {
                      const [key, order] = e.target.value.split(':') as [SortKey, SortOrder];
                      setSortBy(key);
                      setSortOrder(order);
                      handleFilterChange();
                    }}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 text-gray-600 cursor-pointer"
                  >
                    <option value="createdAt:desc">註冊時間（新→舊）</option>
                    <option value="createdAt:asc">註冊時間（舊→新）</option>
                    <option value="displayName:asc">用戶名稱（A→Z）</option>
                    <option value="displayName:desc">用戶名稱（Z→A）</option>
                    <option value="totalDraws:desc">抽獎次數（多→少）</option>
                    <option value="totalDraws:asc">抽獎次數（少→多）</option>
                    <option value="totalSpent:desc">總消費（高→低）</option>
                    <option value="totalSpent:asc">總消費（低→高）</option>
                    <option value="pointsBalance:desc">CTP 餘額（多→少）</option>
                    <option value="pointsBalance:asc">CTP 餘額（少→多）</option>
                    <option value="memberLevel:desc">會員等級（高→低）</option>
                    <option value="memberLevel:asc">會員等級（低→高）</option>
                    <option value="status:asc">狀態（正常優先）</option>
                    <option value="status:desc">狀態（暫停優先）</option>
                  </select>

                  {/* 重置 */}
                  {(searchQuery || selectedGender || selectedStatus || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedGender('');
                        setSelectedStatus('');
                        setSortBy('createdAt');
                        setSortOrder('desc');
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 text-sm text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-refresh-line"></i>
                      重置篩選
                    </button>
                  )}

                  <span className="ml-auto text-sm text-gray-400">
                    找到 <span className="font-semibold text-gray-700">{filtered.length}</span> 位用戶
                  </span>
                </div>
              </div>

              {/* 用戶列表 */}
              <UserTable
                users={paginated}
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={filtered.length}
                pageSize={PAGE_SIZE}
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
                onPageChange={setCurrentPage}
                onViewDetail={setSelectedUser}
                onAdjustPoints={setAdjustUser}
                onDeleteUser={setDeleteUser}
                onToggleStatus={handleToggleStatus}
              />
            </>
          )}
        </div>

        {/* 用戶詳情彈窗 */}
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        )}

        {/* 調整積分彈窗 */}
        {adjustUser && (
          <AdjustPointsModal
            user={adjustUser}
            onClose={() => setAdjustUser(null)}
            onSuccess={() => { refresh(); }}
          />
        )}

        {/* 刪除用戶彈窗 */}
        {deleteUser && (
          <DeleteUserModal
            user={deleteUser}
            onClose={() => setDeleteUser(null)}
            onSuccess={() => { refresh(); }}
          />
        )}
      </AdminLayout>
    </PrivateRoute>
  );
}