import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { initializeSlotPool } from './useDrawHistory';
import { products as mockProducts } from '../mocks/products';
import i18n from '../i18n';

export type Rarity = 'SS' | 'S' | 'A' | 'B' | 'C' | 'N';

export interface Prize {
  id: string;
  name: string;
  image: string;
  quantity: number;
  rarity: Rarity;
  minRemaining?: number | null;
  marketPrice?: number | null;
}

export interface Product {
  id: number;
  name: string;
  nameZhTw?: string;
  nameZhCn?: string;
  nameEn?: string;
  nameJa?: string;
  category: string;
  price: number;
  totalSlots: number;
  remaining: number;
  image: string;
  isHot: boolean;
  isNew: boolean;
  prizes: Prize[];
  boardType: 'open' | 'closed';
}

// 根据前台语言获取商品名称
export function getLocalizedProductName(product: Product): string {
  if (!product) return '';
  const lang = i18n.language || 'zh-TW';
  const normalizedLang = lang.toLowerCase().replace(/_/g, '-');
  if (normalizedLang.includes('zh-cn') || normalizedLang.includes('zh-hans') || normalizedLang.includes('zh_cn')) return product.nameZhCn || product.name;
  if (normalizedLang.includes('en')) return product.nameEn || product.name;
  if (normalizedLang.includes('ja') || normalizedLang.includes('jp')) return product.nameJa || product.name;
  return product.nameZhTw || product.name;
}

// 上傳圖片到 Supabase Storage
async function uploadImage(file: string, path: string): Promise<string> {
  if (!file.startsWith('data:')) return file;
  try {
    const response = await fetch(file);
    const blob = await response.blob();
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(path, blob, { upsert: true, contentType: blob.type });
    if (error) throw new Error(`圖片上傳失敗: ${error.message}`);
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.error('uploadImage 錯誤:', err);
    throw err;
  }
}

async function deleteStorageImage(url: string): Promise<void> {
  if (!url.includes('supabase')) return;
  try {
    const path = url.split('/product-images/')[1];
    if (path) await supabase.storage.from('product-images').remove([path]);
  } catch (error) {
    console.error('刪除圖片失敗:', error);
  }
}

interface ProductStore {
  products: Product[];
  loaded: boolean;
  loading: boolean;
  loadProducts: () => Promise<void>;
  setProducts: (updater: Product[] | ((prev: Product[]) => Product[])) => void;
  addProduct: (productData: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: number, productData: Omit<Product, 'id'>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  updateStock: (id: number, newRemaining: number) => Promise<void>;
  batchUpdateStock: (updates: { productId: number; quantity: number }[]) => Promise<void>;
  deductPrize: (productId: number, prizeId: string) => Promise<void>;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  products: [],
  loaded: false,
  loading: false,

  loadProducts: async () => {
    const { loaded, loading } = get();
    // 已載入或正在載入中，跳過
    if (loaded || loading) return;

    set({ loading: true });
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: true });

      if (productsError) throw productsError;

      if (!productsData || productsData.length === 0) {
        set({ products: [], loaded: true, loading: false });
        return;
      }

      const productsWithPrizes = await Promise.all(
        productsData.map(async (p) => {
          const { data: prizesData } = await supabase
            .from('prizes')
            .select('*')
            .eq('product_id', p.id);

          return {
            id: p.id,
            name: p.name,
            nameZhTw: p.name_zh_tw || undefined,
            nameZhCn: p.name_zh_cn || undefined,
            nameEn: p.name_en || undefined,
            nameJa: p.name_ja || undefined,
            category: p.category,
            price: p.price,
            totalSlots: p.total_slots,
            remaining: p.remaining,
            image: p.image,
            isHot: p.is_hot,
            isNew: p.is_new,
            boardType: p.board_type as 'open' | 'closed',
            prizes: (prizesData || []).map((prize) => ({
              id: prize.id,
              name: prize.name,
              image: prize.image,
              quantity: prize.quantity,
              rarity: prize.rarity as Rarity,
              minRemaining: prize.min_remaining ?? null,
              marketPrice: prize.market_price ?? null,
            })),
          };
        })
      );

      set({ products: productsWithPrizes, loaded: true, loading: false });
    } catch (error) {
      console.warn('載入商品失敗，使用 mock 資料:', error);
      set({ products: mockProducts, loaded: true, loading: false });
    }
  },

  setProducts: (updater) => {
    set((state) => ({
      products: typeof updater === 'function' ? updater(state.products) : updater,
    }));
  },

  addProduct: async (productData) => {
    try {
      // 1. 上傳圖片到 Storage
      const mainImageUrl = await uploadImage(productData.image, `product_${Date.now()}_main.jpg`);

      const prizesWithUrls = await Promise.all(
        productData.prizes.map(async (prize) => {
          const prizeImageUrl = await uploadImage(
            prize.image,
            `prize_${prize.id}_${Date.now()}.jpg`
          );
          return { ...prize, image: prizeImageUrl };
        })
      );

      // 2. 透過 Edge Function 繞過 RLS 插入商品、獎品與號碼池
      const adminId = sessionStorage.getItem('admin_id');
      const { data: result, error: invokeError } = await supabase.functions.invoke('admin-data', {
        body: {
          action: 'add_full_product',
          adminId,
          productData: {
            name: productData.name,
            name_zh_tw: productData.nameZhTw || null,
            name_zh_cn: productData.nameZhCn || null,
            name_en: productData.nameEn || null,
            name_ja: productData.nameJa || null,
            category: productData.category,
            price: productData.price,
            total_slots: productData.totalSlots,
            remaining: productData.totalSlots,
            image: mainImageUrl,
            is_hot: productData.isHot,
            is_new: productData.isNew,
            board_type: productData.boardType,
            market_price: productData.marketPrice || null,
          },
          prizes: prizesWithUrls.map((prize) => ({
            id: prize.id,
            name: prize.name,
            image: prize.image,
            quantity: prize.quantity,
            rarity: prize.rarity,
            min_remaining: prize.minRemaining ?? null,
            market_price: prize.marketPrice ?? null,
          })),
          totalSlots: productData.totalSlots,
        },
      });

      if (invokeError) throw invokeError;
      if (!result?.success) throw new Error(result?.error || '新增商品失敗');

      const insertedProduct = result.product;

      const newProduct: Product = {
        id: insertedProduct.id,
        name: insertedProduct.name,
        nameZhTw: insertedProduct.name_zh_tw || undefined,
        nameZhCn: insertedProduct.name_zh_cn || undefined,
        nameEn: insertedProduct.name_en || undefined,
        nameJa: insertedProduct.name_ja || undefined,
        category: insertedProduct.category,
        price: insertedProduct.price,
        totalSlots: insertedProduct.total_slots,
        remaining: insertedProduct.remaining,
        image: mainImageUrl,
        isHot: insertedProduct.is_hot,
        isNew: insertedProduct.is_new,
        boardType: insertedProduct.board_type as 'open' | 'closed',
        prizes: prizesWithUrls,
      };

      set((state) => ({ products: [...state.products, newProduct] }));
    } catch (error) {
      console.error('新增商品失敗:', error);
      throw error;
    }
  },

  updateProduct: async (id, productData) => {
    const { products } = get();
    try {
      const oldProduct = products.find((p) => p.id === id);
      const mainImageUrl = await uploadImage(productData.image, `product_${id}_main_${Date.now()}.jpg`);

      const { error: productError } = await supabase
        .from('products')
        .update({
          name: productData.name,
          name_zh_tw: productData.nameZhTw || null,
          name_zh_cn: productData.nameZhCn || null,
          name_en: productData.nameEn || null,
          name_ja: productData.nameJa || null,
          category: productData.category,
          price: productData.price,
          total_slots: productData.totalSlots,
          remaining: productData.remaining,
          image: mainImageUrl,
          is_hot: productData.isHot,
          is_new: productData.isNew,
          board_type: productData.boardType,
        })
        .eq('id', id);

      if (productError) throw productError;

      if (oldProduct?.image && oldProduct.image !== mainImageUrl) {
        await deleteStorageImage(oldProduct.image);
      }

      const { data: oldPrizes } = await supabase.from('prizes').select('*').eq('product_id', id);

      const prizesWithUrls = await Promise.all(
        productData.prizes.map(async (prize) => {
          const prizeImageUrl = await uploadImage(
            prize.image,
            `product_${id}_prize_${prize.id}_${Date.now()}.jpg`
          );
          return { ...prize, image: prizeImageUrl };
        })
      );

      if (oldPrizes) {
        for (const oldPrize of oldPrizes) {
          const newPrize = prizesWithUrls.find((p) => p.id === oldPrize.id);
          if (!newPrize || newPrize.image !== oldPrize.image) {
            await deleteStorageImage(oldPrize.image);
          }
        }
      }

      await supabase.from('prizes').delete().eq('product_id', id);

      for (const prize of prizesWithUrls) {
        const { error: prizeError } = await supabase.from('prizes').insert({
          id: prize.id,
          product_id: id,
          name: prize.name,
          image: prize.image,
          quantity: prize.quantity,
          rarity: prize.rarity,
          min_remaining: prize.minRemaining ?? null,
          market_price: prize.marketPrice ?? null,
        });
        if (prizeError) throw prizeError;
      }

      await initializeSlotPool(
        id,
        productData.totalSlots,
        prizesWithUrls.map((prize) => ({
          id: prize.id,
          name: prize.name,
          quantity: prize.quantity,
          rarity: prize.rarity,
          minRemaining: prize.minRemaining ?? null,
          marketPrice: prize.marketPrice ?? null,
        }))
      );

      const updatedProduct: Product = {
        id,
        name: productData.name,
        nameZhTw: productData.nameZhTw,
        nameZhCn: productData.nameZhCn,
        nameEn: productData.nameEn,
        nameJa: productData.nameJa,
        category: productData.category,
        price: productData.price,
        totalSlots: productData.totalSlots,
        remaining: productData.remaining,
        image: mainImageUrl,
        isHot: productData.isHot,
        isNew: productData.isNew,
        boardType: productData.boardType,
        prizes: prizesWithUrls,
      };

      set((state) => ({
        products: state.products.map((p) => (p.id === id ? updatedProduct : p)),
      }));
    } catch (error) {
      console.error('更新商品失敗:', error);
      throw error;
    }
  },

  deleteProduct: async (id) => {
    const { products } = get();
    try {
      const product = products.find((p) => p.id === id);
      if (product?.image) await deleteStorageImage(product.image);

      const { data: prizes } = await supabase.from('prizes').select('*').eq('product_id', id);
      if (prizes) {
        for (const prize of prizes) await deleteStorageImage(prize.image);
      }

      await supabase.from('prizes').delete().eq('product_id', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;

      set((state) => ({ products: state.products.filter((p) => p.id !== id) }));
    } catch (error) {
      console.error('刪除商品失敗:', error);
      throw error;
    }
  },

  updateStock: async (id, newRemaining) => {
    try {
      const { error } = await supabase.from('products').update({ remaining: newRemaining }).eq('id', id);
      if (error) throw error;
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? { ...p, remaining: newRemaining } : p)),
      }));
    } catch (error) {
      console.error('更新庫存失敗:', error);
      throw error;
    }
  },

  batchUpdateStock: async (updates) => {
    const { products } = get();
    try {
      for (const update of updates) {
        const product = products.find((p) => p.id === update.productId);
        if (product) {
          const newRemaining = Math.min(product.remaining + update.quantity, product.totalSlots);
          await supabase.from('products').update({ remaining: newRemaining }).eq('id', update.productId);
        }
      }
      set((state) => ({
        products: state.products.map((p) => {
          const update = updates.find((u) => u.productId === p.id);
          if (update) return { ...p, remaining: Math.min(p.remaining + update.quantity, p.totalSlots) };
          return p;
        }),
      }));
    } catch (error) {
      console.error('批量更新庫存失敗:', error);
      throw error;
    }
  },

  deductPrize: async (productId, prizeId) => {
    try {
      const { data: prize } = await supabase
        .from('prizes')
        .select('quantity')
        .eq('product_id', productId)
        .eq('id', prizeId)
        .single();

      if (!prize) throw new Error('找不到獎品');
      const newQuantity = prize.quantity - 1;

      if (newQuantity <= 0) {
        await supabase.from('prizes').delete().eq('product_id', productId).eq('id', prizeId);
      } else {
        await supabase.from('prizes').update({ quantity: newQuantity }).eq('product_id', productId).eq('id', prizeId);
      }

      set((state) => ({
        products: state.products.map((p) => {
          if (p.id !== productId) return p;
          const updatedPrizes = p.prizes
            .map((prize) => (prize.id === prizeId ? { ...prize, quantity: prize.quantity - 1 } : prize))
            .filter((prize) => prize.quantity > 0);
          return { ...p, prizes: updatedPrizes };
        }),
      }));
    } catch (error) {
      console.error('扣除獎品失敗:', error);
      throw error;
    }
  },
}));