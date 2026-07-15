import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';

export interface WinnerRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  productId: string;
  productName: string;
  prizeId: string;
  prizeName: string;
  prizeImage: string;
  drawTime: string;
  shippingStatus: 'not_requested' | 'pending' | 'shipped';
  shippedTime?: string;
  trackingNumber?: string;
  marketPrice?: number;
}

export interface WinnerFilters {
  searchQuery: string;
  filterProduct: string;
  filterStatus: string;
  sortBy: 'newest' | 'oldest' | 'value_desc';
}

const PAGE_SIZE = 15;

export function useWinnerRecords() {
  const [records, setRecords] = useState<WinnerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<WinnerFilters>({
    searchQuery: '',
    filterProduct: 'all',
    filterStatus: 'all',
    sortBy: 'newest',
  });
  const [productOptions, setProductOptions] = useState<string[]>([]);

  const loadRecords = useCallback(async (page: number, f: WinnerFilters) => {
    try {
      setLoading(true);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 排序方向（value_desc 需要在 DB 層排序）
      const ascending = f.sortBy === 'oldest';
      const orderCol = f.sortBy === 'value_desc' ? 'market_value' : 'drawn_at';

      let query = supabase
        .from('draw_records')
        .select('*', { count: 'exact' })
        .eq('is_win', true)
        .order(orderCol, { ascending })
        .range(from, to);

      if (f.filterProduct !== 'all') query = query.eq('product_name', f.filterProduct);
      if (f.searchQuery) {
        query = query.or(
          `prize_name.ilike.%${f.searchQuery}%,product_name.ilike.%${f.searchQuery}%`
        );
      }

      const { data: drawRecords, error: drawError, count } = await query;
      if (drawError) throw drawError;

      setTotalCount(count ?? 0);

      if (!drawRecords || drawRecords.length === 0) {
        setRecords([]);
        return;
      }

      // 只查本頁用戶
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

      // 只查本頁 shipping_status
      const recordIds = drawRecords.map((r: any) => r.id);
      const { data: shippingData } = await supabase
        .from('shipping_status')
        .select('record_id, status, shipped_time, tracking_number')
        .in('record_id', recordIds);

      const shippingMap: Record<string, { status: string; shipped_time?: string; tracking_number?: string }> = {};
      (shippingData || []).forEach((s: any) => {
        shippingMap[s.record_id] = {
          status: s.status,
          shipped_time: s.shipped_time,
          tracking_number: s.tracking_number,
        };
      });

      let winnerRecords: WinnerRecord[] = drawRecords.map((record: any) => {
        const shipping = shippingMap[record.id];
        const userInfo = userMap[record.user_id];
        const status = shipping?.status || 'not_requested';
        return {
          id: record.id,
          userId: record.user_id,
          userName: userInfo?.display_name || '未知用戶',
          userEmail: userInfo?.email || '',
          productId: String(record.product_id),
          productName: record.product_name || '（已刪除商品）',
          prizeId: record.id,
          prizeName: record.prize_name || '未知獎品',
          prizeImage: record.prize_image || record.product_image || '',
          drawTime: record.drawn_at,
          shippingStatus: status as 'not_requested' | 'pending' | 'shipped',
          shippedTime: shipping?.shipped_time,
          trackingNumber: shipping?.tracking_number,
          marketPrice: record.market_value,
        };
      });

      // 用戶名搜尋（DB 無法直接 join，在前端補充過濾）
      if (f.searchQuery) {
        const q = f.searchQuery.toLowerCase();
        winnerRecords = winnerRecords.filter(
          (r) =>
            r.userName.toLowerCase().includes(q) ||
            r.userEmail.toLowerCase().includes(q) ||
            r.prizeName.toLowerCase().includes(q) ||
            r.productName.toLowerCase().includes(q)
        );
      }

      // 發貨狀態在前端過濾（shipping_status 是獨立表）
      if (f.filterStatus !== 'all') {
        winnerRecords = winnerRecords.filter((r) => r.shippingStatus === f.filterStatus);
      }

      setRecords(winnerRecords);
    } catch (error) {
      console.error('載入中獎紀錄失敗:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 載入商品選項（只需一次）
  const loadProductOptions = useCallback(async () => {
    const { data } = await supabase
      .from('draw_records')
      .select('product_name')
      .eq('is_win', true)
      .order('product_name');
    if (data) {
      const unique = Array.from(new Set(data.map((r: any) => r.product_name).filter(Boolean)));
      setProductOptions(unique);
    }
  }, []);

  const initialize = useCallback(() => {
    loadProductOptions();
    loadRecords(1, {
      searchQuery: '',
      filterProduct: 'all',
      filterStatus: 'all',
      sortBy: 'newest',
    });
  }, [loadProductOptions, loadRecords]);

  const applyFilters = useCallback((newFilters: WinnerFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    loadRecords(1, newFilters);
  }, [loadRecords]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    loadRecords(page, filters);
  }, [filters, loadRecords]);

  const updateShippingStatus = useCallback(async (
    recordId: string,
    status: 'pending' | 'shipped',
    trackingNumber?: string
  ) => {
    const updateData: any = {
      record_id: recordId,
      status,
      shipped_time: status === 'shipped' ? new Date().toISOString() : null,
    };
    if (status === 'shipped' && trackingNumber) {
      updateData.tracking_number = trackingNumber;
    }
    const { error } = await supabase.from('shipping_status').upsert(updateData);
    if (error) throw error;

    setRecords((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? {
              ...record,
              shippingStatus: status,
              shippedTime: status === 'shipped' ? new Date().toISOString() : undefined,
              trackingNumber: status === 'shipped' ? trackingNumber : undefined,
            }
          : record
      )
    );
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    records,
    loading,
    totalCount,
    currentPage,
    totalPages,
    pageSize: PAGE_SIZE,
    filters,
    productOptions,
    initialize,
    applyFilters,
    goToPage,
    updateShippingStatus,
    refreshRecords: () => loadRecords(currentPage, filters),
  };
}
