import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface MemberLevelThresholds {
  STANDARD: number;
  ADVANCE: number;
  EXPERT: number;
  PREMIUM: number;
  MASTER: number;
  LEGEND: number;
}

export interface SiteSettings {
  fiveDrawDiscount: number;
  memberLevelThresholds: MemberLevelThresholds;
}

const DEFAULT_THRESHOLDS: MemberLevelThresholds = {
  STANDARD: 50000,
  ADVANCE: 100000,
  EXPERT: 150000,
  PREMIUM: 250000,
  MASTER: 500000,
  LEGEND: 1000000,
};

const DEFAULT_SETTINGS: SiteSettings = {
  fiveDrawDiscount: 0,
  memberLevelThresholds: DEFAULT_THRESHOLDS,
};

const EDGE_FUNCTION_URL =
  'https://cdsrzczbnbhlmiebxzfb.supabase.co/functions/v1/update-site-settings';

export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value');

      if (error) throw error;

      const parsed: SiteSettings = {
        fiveDrawDiscount: 0,
        memberLevelThresholds: { ...DEFAULT_THRESHOLDS },
      };

      (data || []).forEach((row: { key: string; value: string }) => {
        if (row.key === 'five_draw_discount') {
          parsed.fiveDrawDiscount = parseFloat(row.value) || 0;
        } else if (row.key === 'member_level_standard') {
          parsed.memberLevelThresholds.STANDARD = parseInt(row.value, 10) || DEFAULT_THRESHOLDS.STANDARD;
        } else if (row.key === 'member_level_advance') {
          parsed.memberLevelThresholds.ADVANCE = parseInt(row.value, 10) || DEFAULT_THRESHOLDS.ADVANCE;
        } else if (row.key === 'member_level_expert') {
          parsed.memberLevelThresholds.EXPERT = parseInt(row.value, 10) || DEFAULT_THRESHOLDS.EXPERT;
        } else if (row.key === 'member_level_premium') {
          parsed.memberLevelThresholds.PREMIUM = parseInt(row.value, 10) || DEFAULT_THRESHOLDS.PREMIUM;
        } else if (row.key === 'member_level_master') {
          parsed.memberLevelThresholds.MASTER = parseInt(row.value, 10) || DEFAULT_THRESHOLDS.MASTER;
        } else if (row.key === 'member_level_legend') {
          parsed.memberLevelThresholds.LEGEND = parseInt(row.value, 10) || DEFAULT_THRESHOLDS.LEGEND;
        }
      });

      setSettings(parsed);
    } catch (error) {
      console.error('載入設定失敗:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateSetting = useCallback(
    async (key: string, value: string): Promise<boolean> => {
      try {
        setSaving(true);
        const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';
        const res = await fetch(EDGE_FUNCTION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
          },
          body: JSON.stringify({ key, value }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '更新失敗');
        }

        await loadSettings();
        return true;
      } catch (error) {
        console.error('更新設定失敗:', error);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [loadSettings]
  );

  const updateFiveDrawDiscount = useCallback(
    (discount: number) => updateSetting('five_draw_discount', String(discount)),
    [updateSetting]
  );

  const updateMemberLevelThreshold = useCallback(
    async (level: keyof MemberLevelThresholds, points: number): Promise<boolean> => {
      const keyMap: Record<keyof MemberLevelThresholds, string> = {
        STANDARD: 'member_level_standard',
        ADVANCE: 'member_level_advance',
        EXPERT: 'member_level_expert',
        PREMIUM: 'member_level_premium',
        MASTER: 'member_level_master',
        LEGEND: 'member_level_legend',
      };
      return updateSetting(keyMap[level], String(points));
    },
    [updateSetting]
  );

  const updateAllMemberLevelThresholds = useCallback(
    async (thresholds: MemberLevelThresholds): Promise<boolean> => {
      const keyMap: Record<keyof MemberLevelThresholds, string> = {
        STANDARD: 'member_level_standard',
        ADVANCE: 'member_level_advance',
        EXPERT: 'member_level_expert',
        PREMIUM: 'member_level_premium',
        MASTER: 'member_level_master',
        LEGEND: 'member_level_legend',
      };

      try {
        setSaving(true);
        const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || '';
        const entries = Object.entries(thresholds) as [keyof MemberLevelThresholds, number][];

        for (const [level, points] of entries) {
          const res = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: anonKey,
            },
            body: JSON.stringify({ key: keyMap[level], value: String(points) }),
          });
          if (!res.ok) throw new Error('更新失敗');
        }

        await loadSettings();
        return true;
      } catch (error) {
        console.error('批量更新會員等級門檻失敗:', error);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [loadSettings]
  );

  return {
    settings,
    loading,
    saving,
    updateFiveDrawDiscount,
    updateMemberLevelThreshold,
    updateAllMemberLevelThresholds,
    refresh: loadSettings,
  };
}

export function calcFiveDrawCost(
  price: number,
  fiveDrawDiscount: number,
  memberDiscount: number
): number {
  const afterFiveDraw = price * 5 * ((100 - fiveDrawDiscount) / 100);
  const afterMember = afterFiveDraw * ((100 - memberDiscount) / 100);
  return Math.floor(afterMember);
}

export function calcSingleDrawCost(
  price: number,
  memberDiscount: number
): number {
  return Math.floor(price * ((100 - memberDiscount) / 100));
}
