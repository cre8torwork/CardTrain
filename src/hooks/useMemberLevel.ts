import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { MemberLevelThresholds } from './useSettings';

export interface MemberLevel {
  name: 'BEGINNER' | 'STANDARD' | 'ADVANCE' | 'EXPERT' | 'PREMIUM' | 'MASTER' | 'LEGEND';
  requiredPoints: number;
  discount: number;
}

// 靜態基礎定義（折扣率不變，門檻可由設定覆蓋）
export const MEMBER_LEVELS: MemberLevel[] = [
  { name: 'BEGINNER', requiredPoints: 0, discount: 0 },
  { name: 'STANDARD', requiredPoints: 50000, discount: 1 },
  { name: 'ADVANCE', requiredPoints: 100000, discount: 2 },
  { name: 'EXPERT', requiredPoints: 150000, discount: 3 },
  { name: 'PREMIUM', requiredPoints: 250000, discount: 4 },
  { name: 'MASTER', requiredPoints: 500000, discount: 5 },
  { name: 'LEGEND', requiredPoints: 1000000, discount: 6 },
];

/**
 * 根據動態門檻設定生成會員等級陣列
 */
export function buildMemberLevels(thresholds?: MemberLevelThresholds): MemberLevel[] {
  if (!thresholds) return MEMBER_LEVELS;
  return [
    { name: 'BEGINNER', requiredPoints: 0, discount: 0 },
    { name: 'STANDARD', requiredPoints: thresholds.STANDARD, discount: 1 },
    { name: 'ADVANCE', requiredPoints: thresholds.ADVANCE, discount: 2 },
    { name: 'EXPERT', requiredPoints: thresholds.EXPERT, discount: 3 },
    { name: 'PREMIUM', requiredPoints: thresholds.PREMIUM, discount: 4 },
    { name: 'MASTER', requiredPoints: thresholds.MASTER, discount: 5 },
    { name: 'LEGEND', requiredPoints: thresholds.LEGEND, discount: 6 },
  ];
}

export interface MemberLevelInfo {
  currentLevel: MemberLevel;
  levelPoints: number;
  discount: number;
  nextLevel: MemberLevel | null;
  progressPercent: number;
  pointsToNextLevel: number;
}

/**
 * 根據積分計算會員等級（純函數，供後台復用）
 */
export function getMemberLevel(points: number, levels?: MemberLevel[]): MemberLevel {
  const lvls = levels || MEMBER_LEVELS;
  for (let i = lvls.length - 1; i >= 0; i--) {
    if (points >= lvls[i].requiredPoints) {
      return lvls[i];
    }
  }
  return lvls[0];
}

/**
 * 計算會員等級完整資訊
 */
export function calculateMemberLevelInfo(points: number, levels?: MemberLevel[]): MemberLevelInfo {
  const lvls = levels || MEMBER_LEVELS;
  const currentLevel = getMemberLevel(points, lvls);
  const currentIndex = lvls.findIndex(l => l.name === currentLevel.name);
  const nextLevel = currentIndex < lvls.length - 1 ? lvls[currentIndex + 1] : null;

  let progressPercent = 100;
  let pointsToNextLevel = 0;

  if (nextLevel) {
    const currentLevelPoints = currentLevel.requiredPoints;
    const nextLevelPoints = nextLevel.requiredPoints;
    const pointsInCurrentLevel = points - currentLevelPoints;
    const pointsNeededForNextLevel = nextLevelPoints - currentLevelPoints;
    progressPercent = Math.min(100, (pointsInCurrentLevel / pointsNeededForNextLevel) * 100);
    pointsToNextLevel = nextLevelPoints - points;
  }

  return {
    currentLevel,
    levelPoints: points,
    discount: currentLevel.discount,
    nextLevel,
    progressPercent,
    pointsToNextLevel,
  };
}

/**
 * Hook：查詢用戶 90 日內購買積分並計算會員等級
 */
export function useMemberLevel(userId: string | null) {
  const [memberInfo, setMemberInfo] = useState<MemberLevelInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setMemberInfo(null);
      setLoading(false);
      return;
    }

    loadMemberLevel();
  }, [userId]);

  const loadMemberLevel = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // 計算 90 天前的日期
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // 查詢 90 日內的購買積分
      const { data, error } = await supabase
        .from('points')
        .select('amount, type')
        .eq('user_id', userId)
        .in('type', ['purchase', 'admin_add'])
        .gte('created_at', ninetyDaysAgo.toISOString());

      if (error) throw error;

      const totalPurchasedPoints = (data || []).reduce(
        (sum: number, row: { amount: number; type: string }) => sum + row.amount,
        0
      );

      // 嘗試從 site_settings 讀取動態門檻
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', [
          'member_level_standard',
          'member_level_advance',
          'member_level_expert',
          'member_level_premium',
          'member_level_master',
          'member_level_legend',
        ]);

      let dynamicLevels = MEMBER_LEVELS;
      if (settingsData && settingsData.length > 0) {
        const thresholds: MemberLevelThresholds = {
          STANDARD: 50000,
          ADVANCE: 100000,
          EXPERT: 150000,
          PREMIUM: 250000,
          MASTER: 500000,
          LEGEND: 1000000,
        };
        settingsData.forEach((row: { key: string; value: string }) => {
          const val = parseInt(row.value, 10);
          if (row.key === 'member_level_standard') thresholds.STANDARD = val;
          else if (row.key === 'member_level_advance') thresholds.ADVANCE = val;
          else if (row.key === 'member_level_expert') thresholds.EXPERT = val;
          else if (row.key === 'member_level_premium') thresholds.PREMIUM = val;
          else if (row.key === 'member_level_master') thresholds.MASTER = val;
          else if (row.key === 'member_level_legend') thresholds.LEGEND = val;
        });
        dynamicLevels = buildMemberLevels(thresholds);
      }

      const info = calculateMemberLevelInfo(totalPurchasedPoints, dynamicLevels);
      setMemberInfo(info);
    } catch (error) {
      console.error('載入會員等級失敗:', error);
      setMemberInfo(calculateMemberLevelInfo(0));
    } finally {
      setLoading(false);
    }
  };

  return {
    memberInfo,
    loading,
    refresh: loadMemberLevel,
  };
}
