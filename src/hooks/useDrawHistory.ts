import { useState, useCallback, useEffect } from 'react';
import type { Rarity } from './useProductStore';
import { supabase } from '../lib/supabase';

export interface DrawRecord {
  id: string;
  productId: number;
  productName: string;
  productCategory: string;
  productImage: string;
  price: number;
  drawnAt: string;
  result: string;
  rarity: Rarity;
  estimatedValue: number;
  isWin: boolean;
  prizeImage: string;
  prizeName?: string;
  redeemedForPoints?: boolean;
  userId: string;
  slotNumbers?: number[];
  marketValue?: number;
}

const DEFAULT_CONSOLATION_IMAGE = 'https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/5250fa4331b28dcfbabf0d582e3bf142.png';

async function uploadImageToStorage(base64Image: string, fileName: string): Promise<string> {
  try {
    const base64Data = base64Image.split(',')[1];
    const mimeType = base64Image.match(/data:(.*?);/)?.[1] || 'image/png';
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    const fileExt = mimeType.split('/')[1];
    const filePath = `draw-images/${fileName}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, blob, { upsert: true });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('上傳圖片失敗:', error);
    return base64Image;
  }
}

/**
 * 號碼池初始化函數
 * 為福袋建立號碼池，隨機分配獎品號碼
 */
export async function initializeSlotPool(
  productId: number,
  totalSlots: number,
  prizes: Array<{ id: string; name: string; quantity: number; rarity: Rarity; minRemaining?: number | null; marketPrice?: number | null }>
): Promise<void> {
  try {
    // 1. 清空舊的號碼池
    await supabase.from('draw_slots').delete().eq('product_id', productId);

    // 2. 建立號碼池：1~totalSlots
    const allNumbers = Array.from({ length: totalSlots }, (_, i) => i + 1);
    
    // 3. 隨機打亂號碼
    const shuffledNumbers = [...allNumbers].sort(() => Math.random() - 0.5);

    // 4. 分配獎品號碼
    const slots: Array<{
      product_id: number;
      slot_number: number;
      prize_id: string | null;
      prize_name: string | null;
      prize_rarity: Rarity | null;
      prize_market_price: number | null;
      prize_min_remaining: number | null;
      is_drawn: boolean;
    }> = [];

    let currentIndex = 0;

    // 為每個獎品分配對應數量的號碼
    for (const prize of prizes) {
      for (let i = 0; i < prize.quantity; i++) {
        if (currentIndex >= totalSlots) break;
        
        slots.push({
          product_id: productId,
          slot_number: shuffledNumbers[currentIndex],
          prize_id: prize.id,
          prize_name: prize.name,
          prize_rarity: prize.rarity,
          prize_market_price: prize.marketPrice || null,
          prize_min_remaining: prize.minRemaining || null,
          is_drawn: false,
        });
        
        currentIndex++;
      }
    }

    // 剩餘號碼為未中獎號碼
    for (let i = currentIndex; i < totalSlots; i++) {
      slots.push({
        product_id: productId,
        slot_number: shuffledNumbers[i],
        prize_id: null,
        prize_name: null,
        prize_rarity: null,
        prize_market_price: null,
        prize_min_remaining: null,
        is_drawn: false,
      });
    }

    // 5. 批量插入號碼池
    const { error } = await supabase.from('draw_slots').insert(slots);
    if (error) throw error;

    console.log(`✅ 號碼池初始化完成：產品 ${productId}，總口數 ${totalSlots}，獎品號碼 ${currentIndex} 個`);
  } catch (error) {
    console.error('號碼池初始化失敗:', error);
    throw error;
  }
}

/**
 * 號碼池抽獎邏輯
 */
export async function generateDrawResultFromSlots(
  productId: number,
  productName: string,
  productCategory: string,
  productImage: string,
  price: number,
  prizes: Array<{ id: string; name: string; image: string; quantity: number; rarity: Rarity; minRemaining?: number | null; marketPrice?: number | null }> = [],
  totalSlots: number = 100,
  currentRemaining: number = 0,
  drawCount: number = 1,
  userId: string
): Promise<DrawRecord[]> {
  try {
    // 1. 從 draw_slots 表中查詢未被抽出的號碼
    let { data: availableSlots, error: fetchError } = await supabase
      .from('draw_slots')
      .select('*')
      .eq('product_id', productId)
      .eq('is_drawn', false)
      .order('slot_number', { ascending: true });

    if (fetchError) throw fetchError;

    // ✅ 自動初始化：如果號碼池是空的但商品還有剩餘口數，自動建立號碼池
    if ((!availableSlots || availableSlots.length === 0) && currentRemaining > 0 && prizes.length > 0) {
      console.log(`[自動初始化] 產品 ${productId} 號碼池為空，自動初始化...`);
      await initializeSlotPool(
        productId,
        totalSlots,
        prizes.map((p) => ({
          id: p.id,
          name: p.name,
          quantity: p.quantity,
          rarity: p.rarity,
          minRemaining: p.minRemaining ?? null,
          marketPrice: p.marketPrice ?? null,
        }))
      );

      // 重新查詢號碼池（以當前剩餘口數為準，標記已抽出的號碼）
      const alreadyDrawnCount = totalSlots - currentRemaining;
      if (alreadyDrawnCount > 0) {
        // 將前 alreadyDrawnCount 個號碼標記為已抽出（模擬已抽的歷史）
        const { data: slotsToMark } = await supabase
          .from('draw_slots')
          .select('id')
          .eq('product_id', productId)
          .eq('is_drawn', false)
          .order('slot_number', { ascending: true })
          .limit(alreadyDrawnCount);

        if (slotsToMark && slotsToMark.length > 0) {
          await supabase
            .from('draw_slots')
            .update({ is_drawn: true })
            .in('id', slotsToMark.map((s) => s.id));
        }
      }

      // 重新查詢可用號碼
      const { data: refreshedSlots, error: refreshError } = await supabase
        .from('draw_slots')
        .select('*')
        .eq('product_id', productId)
        .eq('is_drawn', false)
        .order('slot_number', { ascending: true });

      if (refreshError) throw refreshError;
      availableSlots = refreshedSlots;
    }

    if (!availableSlots || availableSlots.length === 0) {
      throw new Error('沒有可用的號碼，福袋已售罄');
    }

    // 2. 根據 minRemaining 過濾號碼：只有當剩餘口數 < minRemaining 時，該獎品號碼才可被抽中
    const eligibleSlots = availableSlots.filter((slot) => {
      if (!slot.prize_id) return true; // 未中獎號碼永遠可抽

      // 如果獎品有 minRemaining 限制，且當前剩餘口數 >= minRemaining，則該號碼不可抽
      if (slot.prize_min_remaining != null && currentRemaining >= slot.prize_min_remaining) {
        return false;
      }

      return true;
    });

    if (eligibleSlots.length < drawCount) {
      throw new Error(`剩餘可抽號碼不足 ${drawCount} 個`);
    }

    // 3. 保底機制：計算剩餘獎品號碼數
    const remainingPrizeSlots = eligibleSlots.filter(slot => slot.prize_id !== null).length;
    const isGuaranteedWin = remainingPrizeSlots > 0 && currentRemaining <= remainingPrizeSlots;

    // 4. 隨機抽取 N 個號碼
    const shuffled = [...eligibleSlots].sort(() => Math.random() - 0.5);
    let selectedSlots = shuffled.slice(0, drawCount);

    // 5. 保底邏輯：如果觸發保底且沒抽中任何獎品，強制至少包含一個獎品號碼
    if (isGuaranteedWin) {
      const hasWin = selectedSlots.some(slot => slot.prize_id !== null);
      if (!hasWin) {
        const prizeSlots = eligibleSlots.filter(slot => slot.prize_id !== null);
        if (prizeSlots.length > 0) {
          const randomPrizeSlot = prizeSlots[Math.floor(Math.random() * prizeSlots.length)];
          selectedSlots[0] = randomPrizeSlot;
        }
      }
    }

    // 6. 標記這些號碼為已抽出
    const slotIds = selectedSlots.map(s => s.id);
    const { error: updateError } = await supabase
      .from('draw_slots')
      .update({
        is_drawn: true,
        drawn_by: userId,
        drawn_at: new Date().toISOString()
      })
      .in('id', slotIds);

    if (updateError) throw updateError;

    // 7. 更新商品剩餘口數
    const newRemaining = currentRemaining - drawCount;
    await supabase
      .from('products')
      .update({ remaining: newRemaining })
      .eq('id', productId);

    // 8. 生成抽獎結果記錄
    const results: DrawRecord[] = selectedSlots.map((slot) => {
      const isWin = slot.prize_id !== null;
      let prizeName = '';
      let prizeImage = DEFAULT_CONSOLATION_IMAGE;
      let result = '獲得隨機 Pokémon AR裸卡';
      let rarity: Rarity = 'C';
      let marketValue = 0;

      if (isWin) {
        prizeName = slot.prize_name || '';
        prizeImage = prizes.find(p => p.id === slot.prize_id)?.image || DEFAULT_CONSOLATION_IMAGE;
        rarity = slot.prize_rarity as Rarity;
        marketValue = slot.prize_market_price || 0;
        result = `🎉 恭喜中獎！獲得 ${prizeName}`;
      } else {
        rarity = 'N' as Rarity;
      }

      return {
        id: `draw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId,
        productName,
        productCategory,
        productImage,
        price,
        drawnAt: new Date().toISOString(),
        result,
        rarity,
        estimatedValue: marketValue,
        isWin,
        prizeImage,
        prizeName,
        userId,
        slotNumbers: [slot.slot_number],
        marketValue,
      };
    });

    return results;
  } catch (error) {
    console.error('號碼池抽獎失敗:', error);
    throw error;
  }
}

export async function loadDrawHistory(userId: string): Promise<DrawRecord[]> {
  try {
    const { data, error } = await supabase
      .from('draw_records')
      .select('*')
      .eq('user_id', userId)
      .order('drawn_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(record => ({
      id: record.id,
      productId: record.product_id,
      productName: record.product_name,
      productCategory: record.product_category,
      productImage: record.product_image,
      price: record.price,
      drawnAt: record.drawn_at,
      result: record.result,
      rarity: record.is_win ? (record.rarity as Rarity) : ('N' as Rarity),
      estimatedValue: record.estimated_value,
      isWin: record.is_win,
      prizeImage: record.prize_image,
      prizeName: record.prize_name,
      redeemedForPoints: record.redeemed_for_points,
      userId: record.user_id,
      slotNumbers: record.slot_numbers || [],
      marketValue: record.market_value || 0,
    }));
  } catch (error) {
    console.error('載入抽獎紀錄失敗:', error);
    return [];
  }
}

export function useDrawHistory(userId: string | null) {
  const [history, setHistory] = useState<DrawRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    loadDrawHistory(userId).then(records => {
      setHistory(records);
      setLoading(false);
    });
  }, [userId]);

  const addRecord = useCallback(
    async (record: DrawRecord) => {
      if (!userId) return;

      try {
        let productImageUrl = record.productImage;
        let prizeImageUrl = record.prizeImage;

        if (record.productImage.startsWith('data:')) {
          productImageUrl = await uploadImageToStorage(
            record.productImage,
            `product_${record.id}`
          );
        }

        if (record.prizeImage.startsWith('data:')) {
          prizeImageUrl = await uploadImageToStorage(
            record.prizeImage,
            `prize_${record.id}`
          );
        }

        const { error } = await supabase.from('draw_records').insert({
          id: record.id,
          user_id: userId,
          product_id: record.productId,
          product_name: record.productName,
          product_category: record.productCategory,
          product_image: productImageUrl,
          price: record.price,
          drawn_at: record.drawnAt,
          result: record.result,
          rarity: record.rarity,
          estimated_value: record.estimatedValue,
          is_win: record.isWin,
          prize_image: prizeImageUrl,
          prize_name: record.prizeName,
          redeemed_for_points: record.redeemedForPoints || false,
          slot_numbers: record.slotNumbers || [],
          market_value: record.marketValue || 0,
        });

        if (error) throw error;

        setHistory(prev => [{ ...record, productImage: productImageUrl, prizeImage: prizeImageUrl }, ...prev]);
      } catch (error) {
        console.error('新增抽獎紀錄失敗:', error);
      }
    },
    [userId]
  );

  const updateRecord = useCallback(
    async (recordId: string, updates: Partial<DrawRecord>) => {
      if (!userId) return;

      try {
        const dbUpdates: Record<string, unknown> = {};
        if (updates.redeemedForPoints !== undefined) dbUpdates.redeemed_for_points = updates.redeemedForPoints;
        if (updates.result !== undefined) dbUpdates.result = updates.result;
        if (updates.prizeName !== undefined) dbUpdates.prize_name = updates.prizeName;
        if (updates.prizeImage !== undefined) dbUpdates.prize_image = updates.prizeImage;

        const { error } = await supabase
          .from('draw_records')
          .update(dbUpdates)
          .eq('id', recordId)
          .eq('user_id', userId);

        if (error) throw error;

        setHistory(prev => prev.map(r => r.id === recordId ? { ...r, ...updates } : r));
      } catch (error) {
        console.error('更新抽獎紀錄失敗:', error);
      }
    },
    [userId]
  );

  return { history, addRecord, updateRecord, loading };
}