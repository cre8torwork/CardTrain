import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/hooks/useProductStore';

/**
 * 查詢每個 product_id 最近一次抽獎時間，
 * 並根據此排序 products：
 * 1. 已完售 (remaining <= 0) 的隱藏
 * 2. 有人抽過的按最近 drawn_at 降序排前面
 * 3. 沒人抽過的按 id 降序排後面
 */
export function useProductSort(products: Product[]) {
  const [lastDrawnMap, setLastDrawnMap] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (products.length === 0) {
      setLoading(false);
      return;
    }

    const fetchLastDrawn = async () => {
      try {
        const { data, error } = await supabase
          .from('draw_records')
          .select('product_id, drawn_at')
          .order('drawn_at', { ascending: false })
          .limit(500);

        if (error) {
          // 靜默處理：draw_records 表可能不存在或無法訪問
          // 不影響產品列表正常顯示
          setLastDrawnMap({});
          return;
        }

        // 每個 product_id 只保留最新一筆
        const map: Record<number, string> = {};
        for (const row of (data ?? [])) {
          if (!map[row.product_id]) {
            map[row.product_id] = row.drawn_at;
          }
        }
        setLastDrawnMap(map);
      } catch {
        // 靜默處理 Supabase 連線失敗
        // 產品列表仍會按 id 降序正常顯示
        setLastDrawnMap({});
      } finally {
        setLoading(false);
      }
    };

    fetchLastDrawn();
  }, [products.length]);

  // 過濾已完售，並排序
  const sortedActiveProducts = [...products]
    .filter((p) => p.remaining > 0)
    .sort((a, b) => {
      const aTime = lastDrawnMap[a.id];
      const bTime = lastDrawnMap[b.id];

      // 兩者都有抽獎紀錄 → 按最近時間降序
      if (aTime && bTime) {
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      }
      // 只有 a 有 → a 排前
      if (aTime && !bTime) return -1;
      // 只有 b 有 → b 排前
      if (!aTime && bTime) return 1;
      // 兩者都沒有 → 按 id 降序（新的在前）
      return b.id - a.id;
    });

  return { sortedActiveProducts, loading };
}