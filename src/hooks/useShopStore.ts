import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { mockShopProducts } from '../mocks/shopProducts';

export interface ShopProduct {
  id: string;
  name: string;
  description: string;
  price: number; // CTP points price
  hkdPriceMinor?: number | null; // HKD retail price in cents for card purchase; null = card disabled
  image: string;
  images: string[];
  category: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface CartItem {
  product: ShopProduct;
  quantity: number;
}

export interface ShopOrder {
  id: string;
  userId: string;
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
  items: ShopOrderItem[];
}

export interface ShopOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  unitPrice: number;
}

function mapProduct(row: any): ShopProduct {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: row.price,
    hkdPriceMinor: row.hkd_price_minor ?? null,
    image: row.image || '',
    images: row.images || [],
    category: row.category || '',
    stock: row.stock,
    isActive: row.is_active,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

interface ShopStore {
  products: ShopProduct[];
  loaded: boolean;
  loading: boolean;
  // 前台只載入 active 商品；後台需要 includeInactive=true
  loadProducts: (includeInactive?: boolean) => Promise<void>;
  // 後台強制重新載入（繞過快取）
  reloadProducts: (includeInactive?: boolean) => Promise<void>;
  addProduct: (data: Omit<ShopProduct, 'id' | 'createdAt'>) => Promise<boolean>;
  updateProduct: (id: string, data: Partial<Omit<ShopProduct, 'id' | 'createdAt'>>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
}

export const useShopStore = create<ShopStore>((set, get) => ({
  products: [],
  loaded: false,
  loading: false,

  loadProducts: async (includeInactive = false) => {
    const { loaded, loading } = get();
    // 前台：已載入過就直接用快取，不重複 fetch
    if (!includeInactive && (loaded || loading)) return;
    // 後台（includeInactive=true）：每次都重新載入以確保資料最新
    if (includeInactive) {
      await get().reloadProducts(true);
      return;
    }

    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ products: (data || []).map(mapProduct), loaded: true, loading: false });
    } catch (err) {
      console.warn('載入商城商品失敗，使用 mock 資料:', err);
      set({ products: mockShopProducts, loaded: true, loading: false });
    }
  },

  reloadProducts: async (includeInactive = false) => {
    set({ loading: true });
    try {
      let query = supabase
        .from('shop_products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ products: (data || []).map(mapProduct), loaded: true, loading: false });
    } catch (err) {
      console.warn('重新載入商城商品失敗，使用 mock 資料:', err);
      set({ products: mockShopProducts, loaded: true, loading: false });
    }
  },

  addProduct: async (data) => {
    try {
      const { error } = await supabase.from('shop_products').insert({
        name: data.name,
        description: data.description,
        price: data.price,
        hkd_price_minor: data.hkdPriceMinor ?? null,
        image: data.image,
        images: data.images || [],
        category: data.category,
        stock: data.stock,
        is_active: data.isActive,
        is_featured: data.isFeatured,
        sort_order: data.sortOrder,
      });
      if (error) throw error;
      await get().reloadProducts(true);
      return true;
    } catch (err) {
      console.error('新增商品失敗:', err);
      return false;
    }
  },

  updateProduct: async (id, data) => {
    try {
      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.hkdPriceMinor !== undefined) updateData.hkd_price_minor = data.hkdPriceMinor;
      if (data.image !== undefined) updateData.image = data.image;
      if (data.images !== undefined) updateData.images = data.images;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.stock !== undefined) updateData.stock = data.stock;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;
      if (data.isFeatured !== undefined) updateData.is_featured = data.isFeatured;
      if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase.from('shop_products').update(updateData).eq('id', id);
      if (error) throw error;
      await get().reloadProducts(true);
      return true;
    } catch (err) {
      console.error('更新商品失敗:', err);
      return false;
    }
  },

  deleteProduct: async (id) => {
    try {
      const { error } = await supabase.from('shop_products').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      await get().reloadProducts(true);
      return true;
    } catch (err) {
      console.error('刪除商品失敗:', err);
      return false;
    }
  },
}));

// 獨立的下單函數（走 Edge Function，原子化驗證庫存 + 扣積分 + 建立訂單）
export async function placeShopOrder(
  userId: string,
  cartItems: CartItem[],
  shippingInfo: {
    recipientName: string;
    phone: string;
    flatFloor: string;
    building: string;
    address: string;
    district: string;
    notes: string;
  }
): Promise<{ success: boolean; orderId?: string; error?: string; currentBalance?: number; required?: number }> {
  try {
    const { data: result, error: invokeError } = await supabase.functions.invoke('user-points', {
      body: {
        action: 'place_shop_order',
        cartItems: cartItems.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          productImage: item.product.image,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        shippingInfo: {
          recipientName: shippingInfo.recipientName,
          phone: shippingInfo.phone,
          flatFloor: shippingInfo.flatFloor,
          building: shippingInfo.building,
          address: shippingInfo.address,
          district: shippingInfo.district,
          notes: shippingInfo.notes,
        },
      },
    });

    if (invokeError) {
      // Edge Function 可能回傳業務錯誤在 context 中
      if (invokeError?.context) {
        try {
          const ctx = JSON.parse(invokeError.context);
          return { success: false, error: ctx.error || '下單失敗', currentBalance: ctx.currentBalance, required: ctx.required };
        } catch { /* fall through */ }
      }
      throw invokeError;
    }

    const responseData = result as { success: boolean; orderId?: string; error?: string; currentBalance?: number; required?: number };

    if (!responseData.success) {
      return {
        success: false,
        error: responseData.error || '下單失敗',
        currentBalance: responseData.currentBalance,
        required: responseData.required,
      };
    }

    // 下單後讓 store 重新載入最新庫存
    const { reloadProducts } = useShopStore.getState();
    await reloadProducts(false);

    return { success: true, orderId: responseData.orderId };
  } catch (err: any) {
    console.error('下單失敗:', err);
    return { success: false, error: err.message || '下單失敗' };
  }
}