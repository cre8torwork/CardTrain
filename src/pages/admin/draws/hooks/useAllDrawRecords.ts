import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';

export interface UserInfo {
  id: string;
  email: string;
  displayName: string;
}

export interface AdminDrawRecord {
  id: string;
  productId: number;
  productName: string;
  productImage: string;
  productCategory: string;
  prizeName: string;
  prizeImage: string;
  rarity: string;
  price: number;
  estimatedValue: number;
  result: string;
  isWin: boolean;
  drawnAt: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  slotNumbers: number[];
}

export interface DrawFilters {
  searchQuery: string;
  selectedRarity: string;
  selectedUser: string;
  selectedCategory: string;
  dateFrom: string;
  dateTo: string;
}

const PAGE_SIZE = 15;

export function useAllDrawRecords() {
  const [records, setRecords] = useState<AdminDrawRecord[]>([]);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<DrawFilters>({
    searchQuery: '',
    selectedRarity: '',
    selectedUser: '',
    selectedCategory: '',
    dateFrom: '',
    dateTo: '',
  });

  // 載入用戶列表（只需一次，用於篩選下拉）
  const [usersLoaded, setUsersLoaded] = useState(false);

  const loadUsers = useCallback(async () => {
    if (usersLoaded) return;
    const { data } = await supabase
      .from('users')
      .select('id, email, display_name')
      .order('display_name');
    if (data) {
      setUsers(data.map((u: any) => ({ id: u.id, email: u.email, displayName: u.display_name })));
      setUsersLoaded(true);
    }
  }, [usersLoaded]);

  const loadRecords = useCallback(async (page: number, f: DrawFilters) => {
    try {
      setLoading(true);
      setError(null);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 建立查詢（伺服器端篩選）
      let query = supabase
        .from('draw_records')
        .select('*', { count: 'exact' })
        .order('drawn_at', { ascending: false })
        .range(from, to);

      if (f.selectedRarity) query = query.eq('rarity', f.selectedRarity);
      if (f.selectedUser) query = query.eq('user_id', f.selectedUser);
      if (f.selectedCategory) query = query.eq('product_category', f.selectedCategory);
      if (f.dateFrom) query = query.gte('drawn_at', f.dateFrom);
      if (f.dateTo) query = query.lte('drawn_at', f.dateTo + 'T23:59:59');
      if (f.searchQuery) {
        query = query.or(
          `product_name.ilike.%${f.searchQuery}%,prize_name.ilike.%${f.searchQuery}%,result.ilike.%${f.searchQuery}%`
        );
      }

      const { data: drawRecords, error: drawError, count } = await query;
      if (drawError) throw drawError;

      setTotalCount(count ?? 0);

      if (!drawRecords || drawRecords.length === 0) {
        setRecords([]);
        return;
      }

      // 只查詢本頁涉及的用戶
      const userIds = Array.from(new Set(drawRecords.map((r: any) => r.user_id).filter(Boolean)));
      let userMap: Record<string, { email: string; display_name: string }> = {};

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, display_name')
          .in('id', userIds);
        if (usersData) {
          usersData.forEach((u: any) => {
            userMap[u.id] = { email: u.email, display_name: u.display_name };
          });
        }
      }

      const formattedRecords: AdminDrawRecord[] = drawRecords.map((record: any) => {
        const userInfo = userMap[record.user_id];
        return {
          id: record.id,
          productId: record.product_id,
          productName: record.product_name || '（已刪除商品）',
          productImage: record.product_image || '',
          productCategory: record.product_category || '',
          prizeName: record.prize_name || '',
          prizeImage: record.prize_image || '',
          rarity: record.rarity || 'N',
          price: record.price || 0,
          estimatedValue: record.estimated_value || 0,
          result: record.result || (record.is_win ? record.prize_name || '中獎' : '裸卡'),
          isWin: record.is_win,
          drawnAt: record.drawn_at,
          userId: record.user_id,
          userDisplayName: userInfo?.display_name || '未知用戶',
          userEmail: userInfo?.email || '',
          slotNumbers: record.slot_numbers || [],
        };
      });

      setRecords(formattedRecords);
    } catch (err: any) {
      console.error('載入抽獎紀錄失敗:', err);
      setError(err.message || '載入失敗');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始載入
  const initialize = useCallback(() => {
    loadUsers();
    loadRecords(1, {
      searchQuery: '',
      selectedRarity: '',
      selectedUser: '',
      selectedCategory: '',
      dateFrom: '',
      dateTo: '',
    });
  }, [loadUsers, loadRecords]);

  const applyFilters = useCallback((newFilters: DrawFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    loadRecords(1, newFilters);
  }, [loadRecords]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    loadRecords(page, filters);
  }, [filters, loadRecords]);

  const refresh = useCallback(() => {
    loadRecords(currentPage, filters);
  }, [currentPage, filters, loadRecords]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    records,
    users,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    pageSize: PAGE_SIZE,
    filters,
    initialize,
    applyFilters,
    goToPage,
    refresh,
  };
}
