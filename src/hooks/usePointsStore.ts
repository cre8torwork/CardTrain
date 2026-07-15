import { useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PointTransaction {
  id: string;
  type: 'purchase' | 'draw' | 'redeem' | 'shop' | 'shipping' | 'initial' | 'admin_add' | 'admin_deduct';
  amount: number;
  timestamp: number;
  description: string;
}

// ──── Edge Function 通用呼叫 ────
async function callUserPointsEdge(action: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('user-points', {
    body: { action, ...body },
  });
  if (error) throw error;
  // data is the parsed JSON body from the Edge Function response
  return data as { success?: boolean; error?: string; [key: string]: unknown };
}

export const usePointsStore = () => {
  const [currentPoints, setCurrentPoints] = useState<number>(0);
  const [pointTransactions, setPointTransactions] = useState<PointTransaction[]>([]);
  const [totalSpent, setTotalSpent] = useState<number>(0);

  const getPoints = async (userId: string): Promise<{ success: boolean; points: number }> => {
    try {
      const { data, error } = await supabase
        .from('points')
        .select('amount')
        .eq('user_id', userId);

      if (error) throw error;
      if (!data || data.length === 0) {
        return { success: true, points: 0 };
      }

      const total = data.reduce((sum: number, row: { amount: number }) => sum + row.amount, 0);
      return { success: true, points: total };
    } catch (error) {
      console.error('查詢積分失敗:', error);
      return { success: false, points: 0 };
    }
  };

  // ──── 卡片兌換積分（走 Edge Function，原子化驗證 + 寫入） ────
  const redeemCardsForPoints = async (
    userId: string,
    recordIds: string[]
  ): Promise<{ success: boolean; error?: string; totalPoints?: number }> => {
    if (!recordIds || recordIds.length === 0) {
      return { success: false, error: '沒有選擇兌換卡片' };
    }
    try {
      const result = await callUserPointsEdge('redeem_cards', { recordIds });
      if (result.success) {
        return { success: true, totalPoints: (result as any).totalPoints };
      }
      return { success: false, error: result.error || '兌換失敗' };
    } catch (error: any) {
      console.error('兌換積分失敗:', error);
      // 嘗試從 error 物件中解析 Edge Function 回傳的錯誤
      if (error?.context) {
        try {
          const ctx = JSON.parse(error.context);
          return { success: false, error: ctx.error || '兌換失敗' };
        } catch { /* fall through */ }
      }
      return { success: false, error: error?.message || '兌換失敗，請稍後再試' };
    }
  };

  // ──── 原子化扣除積分（走 Edge Function） ────
  const deductPoints = async (
    userId: string,
    amount: number,
    type: string = 'draw',
    description: string = '扣除積分',
    idempotencyKey?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (amount <= 0) return { success: false, error: '扣除金額必須大於 0' };
    try {
      const result = await callUserPointsEdge('deduct_points', {
        amount,
        type,
        description,
        idempotencyKey,
      });
      if (result.success) return { success: true };
      return { success: false, error: result.error || '扣除失敗' };
    } catch (error: any) {
      console.error('扣除積分失敗:', error);
      if (error?.context) {
        try {
          const ctx = JSON.parse(error.context);
          return { success: false, error: ctx.error || '扣除失敗' };
        } catch { /* fall through */ }
      }
      return { success: false, error: error?.message || '扣除失敗，請稍後再試' };
    }
  };

  // ──── 初始化積分記錄（走 Edge Function） ────
  const addInitialPoints = async (userId: string): Promise<boolean> => {
    try {
      const result = await callUserPointsEdge('add_initial_points', {});
      return !!result.success;
    } catch (error) {
      console.error('初始化積分記錄失敗:', error);
      return false;
    }
  };

  // ──── 棄用：addPoints — 保留給管理員後台用，前端用戶操作請用 redeemCardsForPoints ────
  const addPoints = async (userId: string, amount: number, description: string = '購買積分'): Promise<boolean> => {
    console.error('⚠️ addPoints() 已被棄用，請改用 redeemCardsForPoints() 或 Edge Function');
    if (amount <= 0) return false;
    try {
      const { error } = await supabase.from('points').insert({
        user_id: userId,
        type: 'purchase',
        amount,
        description,
      });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('增加積分失敗:', error);
      return false;
    }
  };

  const getTransactionHistory = async (userId: string): Promise<PointTransaction[]> => {
    try {
      const { data, error } = await supabase
        .from('points')
        .select('id, type, amount, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((row: { id: string; type: string; amount: number; description: string; created_at: string }) => ({
        id: row.id,
        type: row.type as PointTransaction['type'],
        amount: row.amount,
        timestamp: new Date(row.created_at).getTime(),
        description: row.description,
      }));
    } catch (error) {
      console.error('查詢交易記錄失敗:', error);
      return [];
    }
  };

  const getTotalSpent = async (userId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('points')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'draw');
      if (error) throw error;
      return (data || []).reduce((sum: number, row: { amount: number }) => sum + Math.abs(row.amount), 0);
    } catch {
      return 0;
    }
  };

  const getTotalPurchased = async (userId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('points')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'purchase');
      if (error) throw error;
      return (data || []).reduce((sum: number, row: { amount: number }) => sum + row.amount, 0);
    } catch {
      return 0;
    }
  };

  return {
    currentPoints,
    setCurrentPoints,
    pointTransactions,
    setPointTransactions,
    totalSpent,
    setTotalSpent,
    getPoints,
    addPoints, // 棄用，保留相容
    redeemCardsForPoints,
    deductPoints,
    addInitialPoints,
    getTransactionHistory,
    getTotalSpent,
    getTotalPurchased,
  };
};