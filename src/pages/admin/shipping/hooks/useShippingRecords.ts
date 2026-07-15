import { useState, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import { EDGE_FUNCTIONS } from '../../../../lib/edgeFunctions';

export interface ShippingRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  productName: string;
  prizeName: string;
  prizeImage: string;
  drawTime: string;
  shippingStatus: 'pending' | 'shipped';
  shippedTime?: string;
  trackingNumber?: string;
  marketPrice?: number;
  isWin: boolean;
}

export interface ShippingAddress {
  recipientName: string;
  phone: string;
  flatFloor: string;
  building: string;
  address: string;
  district: string;
  notes: string;
}

export interface ShippingBatch {
  batchKey: string;
  userId: string;
  userName: string;
  userEmail: string;
  address: ShippingAddress | null;
  items: ShippingRecord[];
  batchStatus: 'pending' | 'shipped' | 'mixed';
  totalMarketPrice: number;
  latestTime: string;
}

export interface ShippingFiltersState {
  activeFilter: 'all' | 'pending' | 'shipped';
  searchQuery: string;
}

const PAGE_SIZE = 30; // shipping_status 每頁筆數（批次合併後顯示數量會更少）

function makeBatchKey(userId: string, addr: ShippingAddress | null): string {
  if (!addr) return `${userId}|no-address`;
  return `${userId}|${addr.recipientName}|${addr.phone}|${addr.flatFloor}|${addr.building}|${addr.address}|${addr.district}`;
}

function groupIntoBatches(
  records: ShippingRecord[],
  addressMap: Record<string, ShippingAddress | null>
): ShippingBatch[] {
  const batchMap: Record<string, ShippingBatch> = {};

  records.forEach((record) => {
    const addr = addressMap[record.id] ?? null;
    const key = makeBatchKey(record.userId, addr);

    if (!batchMap[key]) {
      batchMap[key] = {
        batchKey: key,
        userId: record.userId,
        userName: record.userName,
        userEmail: record.userEmail,
        address: addr,
        items: [],
        batchStatus: 'pending',
        totalMarketPrice: 0,
        latestTime: record.drawTime,
      };
    }

    batchMap[key].items.push(record);
    batchMap[key].totalMarketPrice += record.marketPrice ?? 0;
    if (record.drawTime > batchMap[key].latestTime) {
      batchMap[key].latestTime = record.drawTime;
    }
  });

  Object.values(batchMap).forEach((batch) => {
    const statuses = new Set(batch.items.map((i) => i.shippingStatus));
    if (statuses.size === 1) {
      batch.batchStatus = [...statuses][0] as 'pending' | 'shipped';
    } else {
      batch.batchStatus = 'mixed';
    }
  });

  const order = { pending: 0, mixed: 1, shipped: 2 };
  return Object.values(batchMap).sort((a, b) => {
    const orderDiff = order[a.batchStatus] - order[b.batchStatus];
    if (orderDiff !== 0) return orderDiff;
    return b.latestTime.localeCompare(a.latestTime);
  });
}

export function useShippingRecords() {
  const [records, setRecords] = useState<ShippingRecord[]>([]);
  const [batches, setBatches] = useState<ShippingBatch[]>([]);
  const [addressMap, setAddressMap] = useState<Record<string, ShippingAddress | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<ShippingFiltersState>({
    activeFilter: 'all',
    searchQuery: '',
  });

  const loadRecords = useCallback(async (page: number, f: ShippingFiltersState) => {
    try {
      setLoading(true);
      setError(null);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // 伺服器端篩選狀態
      let statusQuery = supabase
        .from('shipping_status')
        .select('record_id, status, shipped_time, tracking_number', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (f.activeFilter === 'pending') {
        statusQuery = statusQuery.eq('status', 'pending');
      } else if (f.activeFilter === 'shipped') {
        statusQuery = statusQuery.eq('status', 'shipped');
      } else {
        statusQuery = statusQuery.in('status', ['pending', 'shipped']);
      }

      const { data: shippingRows, error: shipErr, count } = await statusQuery;

      if (shipErr) {
        console.error('shipping_status query error:', shipErr);
        throw shipErr;
      }
      setTotalCount(count ?? 0);

      if (!shippingRows || shippingRows.length === 0) {
        setRecords([]);
        setBatches([]);
        setAddressMap({});
        return;
      }

      const recordIds = shippingRows.map((s: any) => s.record_id);

      const [drawResult, addrResult] = await Promise.all([
        supabase
          .from('draw_records')
          .select('*, users(id, email, display_name)')
          .in('id', recordIds)
          .order('drawn_at', { ascending: false }),
        supabase
          .from('shipping_addresses')
          .select('*')
          .in('record_id', recordIds),
      ]);

      if (drawResult.error) {
        console.error('draw_records query error:', drawResult.error);
        throw drawResult.error;
      }

      const shippingMap: Record<string, any> = {};
      shippingRows.forEach((s: any) => { shippingMap[s.record_id] = s; });

      const newAddressMap: Record<string, ShippingAddress | null> = {};
      (addrResult.data || []).forEach((row: any) => {
        newAddressMap[row.record_id] = {
          recipientName: row.recipient_name || '',
          phone: row.phone || '',
          flatFloor: row.flat_floor || '',
          building: row.building || '',
          address: row.address || '',
          district: row.district || '',
          notes: row.notes || '',
        };
      });

      let newRecords: ShippingRecord[] = (drawResult.data || []).map((record: any) => {
        const shipping = shippingMap[record.id];
        return {
          id: record.id,
          userId: record.user_id,
          userName: record.users?.display_name || '未知用戶',
          userEmail: record.users?.email || '',
          productName: record.product_name || '',
          prizeName: record.is_win ? (record.prize_name || '未知獎品') : '隨機 Pokémon AR裸卡',
          prizeImage: record.prize_image || record.product_image || '',
          drawTime: record.drawn_at,
          shippingStatus: shipping?.status as 'pending' | 'shipped',
          shippedTime: shipping?.shipped_time,
          trackingNumber: shipping?.tracking_number,
          marketPrice: record.market_value,
          isWin: record.is_win ?? false,
        };
      });

      // 前端搜尋（用戶名/email/獎品名）
      if (f.searchQuery) {
        const q = f.searchQuery.toLowerCase();
        newRecords = newRecords.filter(
          (r) =>
            r.userName.toLowerCase().includes(q) ||
            r.userEmail.toLowerCase().includes(q) ||
            r.prizeName.toLowerCase().includes(q) ||
            r.productName.toLowerCase().includes(q)
        );
      }

      setRecords(newRecords);
      setAddressMap(newAddressMap);
      setBatches(groupIntoBatches(newRecords, newAddressMap));
    } catch (error) {
      console.error('載入發貨記錄失敗:', error);
      setError(error instanceof Error ? error.message : '載入發貨記錄失敗');
      setRecords([]);
      setBatches([]);
      setAddressMap({});
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const initialize = useCallback(() => {
    setError(null);
    loadRecords(1, { activeFilter: 'all', searchQuery: '' });
  }, [loadRecords]);

  const applyFilters = useCallback((newFilters: ShippingFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setError(null);
    loadRecords(1, newFilters);
  }, [loadRecords]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    setError(null);
    loadRecords(page, filters);
  }, [filters, loadRecords]);

  const updateShippingStatus = useCallback(async (
    recordIds: string[],
    status: 'pending' | 'shipped',
    trackingNumber?: string
  ) => {
    const now = new Date().toISOString();
    const adminId = sessionStorage.getItem('admin_id');
    if (adminId) {
      // 走 Edge Function（有 service role 權限）
      const res = await fetch(EDGE_FUNCTIONS.adminData, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_shipping',
          adminId,
          recordIds,
          status,
          trackingNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || '更新發貨狀態失敗');
    } else {
      // fallback：直接用 supabase（需要 RLS 許可）
      const updates = recordIds.map((recordId) => ({
        record_id: recordId,
        status,
        shipped_time: status === 'shipped' ? now : null,
        ...(status === 'shipped' && trackingNumber ? { tracking_number: trackingNumber } : {}),
      }));
      const { error } = await supabase.from('shipping_status').upsert(updates);
      if (error) throw error;
    }

    setRecords((prev) => {
      const updated = prev.map((r) =>
        recordIds.includes(r.id)
          ? {
              ...r,
              shippingStatus: status,
              shippedTime: status === 'shipped' ? now : undefined,
              trackingNumber: status === 'shipped' ? trackingNumber : undefined,
            }
          : r
      );
      setBatches(groupIntoBatches(updated, addressMap));
      return updated;
    });
  }, [addressMap]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return {
    records,
    batches,
    addressMap,
    loading,
    totalCount,
    currentPage,
    totalPages,
    pageSize: PAGE_SIZE,
    filters,
    initialize,
    applyFilters,
    goToPage,
    updateShippingStatus,
    refreshRecords: () => loadRecords(currentPage, filters),
    error,
  };
}