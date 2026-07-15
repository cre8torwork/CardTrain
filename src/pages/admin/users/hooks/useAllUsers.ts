import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { getMemberLevel } from '../../../../hooks/useMemberLevel';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  birthDate: string;
  gender: string;
  favoritePokemon: string;
  totalDraws: number;
  totalSpent: number;
  ssrCount: number;
  lastDrawAt: string | null;
  pointsBalance: number;
  totalPurchasedPoints: number;
  memberLevel: string;
  lastLoginAt: string | null;
  status: string;
}

// 計入會員等級的積分類型：付款充值 + 管理員手動給予
// 排除：draw_spend（抽獎消費）、draw_refund（抽獎退款）、item_exchange（物品兌換積分）等
const QUALIFYING_POINT_TYPES = ['purchase', 'admin_add'];

export function useAllUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);

      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          *,
          draw_records (
            price,
            rarity,
            drawn_at
          ),
          points (
            amount,
            type,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedUsers: AdminUser[] = (usersData || []).map((user: any) => {
        const drawRecords = user.draw_records || [];
        const totalDraws = drawRecords.length;
        const totalSpent = drawRecords.reduce((sum: number, r: any) => sum + (r.price || 0), 0);
        const ssrCount = drawRecords.filter((r: any) =>
          ['SS', 'S'].includes(r.rarity)
        ).length;

        const sortedRecords = [...drawRecords].sort(
          (a: any, b: any) => new Date(b.drawn_at).getTime() - new Date(a.drawn_at).getTime()
        );
        const lastDrawAt = sortedRecords.length > 0 ? sortedRecords[0].drawn_at : null;

        const pointsBalance = (user.points || []).reduce(
          (sum: number, p: any) => sum + (p.amount || 0),
          0
        );

        // 計算 90 日內「購買充值」及「管理員給予」的積分總和
        // 不計算抽獎所獲得物品兌換的積分
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const totalPurchasedPoints = (user.points || [])
          .filter((p: any) => {
            if (!QUALIFYING_POINT_TYPES.includes(p.type)) return false;
            const createdAt = new Date(p.created_at);
            return createdAt >= ninetyDaysAgo;
          })
          .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

        // 修復：getMemberLevel 返回 MemberLevel 物件，需取 .name 屬性
        const memberLevelObj = getMemberLevel(totalPurchasedPoints);
        const memberLevel = memberLevelObj.name;

        return {
          id: user.id,
          email: user.email,
          displayName: user.display_name || '',
          createdAt: user.created_at,
          birthDate: user.birth_date || '',
          gender: user.gender || '',
          favoritePokemon: user.favorite_pokemon || '',
          totalDraws,
          totalSpent,
          ssrCount,
          lastDrawAt,
          pointsBalance,
          totalPurchasedPoints,
          memberLevel,
          lastLoginAt: user.last_login_at || null,
          status: user.status || 'active',
        };
      });

      setUsers(formattedUsers);
    } catch (error) {
      console.error('載入用戶資料失敗:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return { users, loading, refresh: loadUsers };
}
