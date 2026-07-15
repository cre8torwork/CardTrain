import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { EDGE_FUNCTIONS } from '@/lib/edgeFunctions';

export interface ShopOrderRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  totalPoints: number;
  status: 'pending' | 'shipped' | 'cancelled';
  recipientName: string;
  phone: string;
  flatFloor: string;
  building: string;
  address: string;
  district: string;
  notes: string;
  trackingNumber: string;
  shippedAt?: string;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    productImage: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export function useShopOrders() {
  const [orders, setOrders] = useState<ShopOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data: ordersData, error: ordersError } = await supabase
        .from('shop_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      const orderIds = ordersData.map((o: any) => o.id);
      const userIds = [...new Set(ordersData.map((o: any) => o.user_id))];

      const [itemsResult, usersResult] = await Promise.all([
        supabase.from('shop_order_items').select('*').in('order_id', orderIds),
        supabase.from('users').select('id, email, display_name').in('id', userIds),
      ]);

      const itemsMap: Record<string, any[]> = {};
      (itemsResult.data || []).forEach((item: any) => {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push(item);
      });

      const usersMap: Record<string, any> = {};
      (usersResult.data || []).forEach((u: any) => { usersMap[u.id] = u; });

      const mapped: ShopOrderRecord[] = ordersData.map((o: any) => ({
        id: o.id,
        userId: o.user_id,
        userName: usersMap[o.user_id]?.display_name || '未知用戶',
        userEmail: usersMap[o.user_id]?.email || '',
        totalPoints: o.total_points,
        status: o.status,
        recipientName: o.recipient_name || '',
        phone: o.phone || '',
        flatFloor: o.flat_floor || '',
        building: o.building || '',
        address: o.address || '',
        district: o.district || '',
        notes: o.notes || '',
        trackingNumber: o.tracking_number || '',
        shippedAt: o.shipped_at,
        createdAt: o.created_at,
        items: (itemsMap[o.id] || []).map((item: any) => ({
          id: item.id,
          productName: item.product_name,
          productImage: item.product_image,
          quantity: item.quantity,
          unitPrice: item.unit_price,
        })),
      }));

      setOrders(mapped);
    } catch (err) {
      console.error('載入商城訂單失敗:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const updateOrderStatus = async (orderId: string, status: 'shipped' | 'pending', trackingNumber?: string) => {
    try {
      const adminId = sessionStorage.getItem('admin_id');
      if (adminId) {
        // 走 Edge Function（有 service role 權限）
        const res = await fetch(EDGE_FUNCTIONS.adminData, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_shop_order',
            adminId,
            orderId,
            status,
            trackingNumber,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || '更新失敗');
      } else {
        // fallback
        const updateData: any = {
          status,
          updated_at: new Date().toISOString(),
        };
        if (status === 'shipped') {
          updateData.shipped_at = new Date().toISOString();
          if (trackingNumber) updateData.tracking_number = trackingNumber;
        }
        const { error } = await supabase.from('shop_orders').update(updateData).eq('id', orderId);
        if (error) throw error;
      }
      await loadOrders();
    } catch (err) {
      console.error('更新訂單狀態失敗:', err);
      throw err;
    }
  };

  return { orders, loading, updateOrderStatus, refreshOrders: loadOrders };
}
