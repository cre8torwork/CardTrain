import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { mockCategories } from '../mocks/categories';
import i18n from '../i18n';

export interface Category {
  id: string;
  name: string;
  nameZhCn: string;
  nameEn: string;
  nameJa: string;
  createdAt: string;
}

interface CategoryInput {
  name: string;
  name_zh_cn?: string;
  name_en?: string;
  name_ja?: string;
}

interface CategoryStore {
  categories: Category[];
  loadCategories: () => Promise<void>;
  addCategory: (input: CategoryInput) => Promise<{ success: boolean; message?: string }>;
  updateCategory: (id: string, input: CategoryInput) => Promise<{ success: boolean; message?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; message?: string }>;
  getCategoryProductCount: (categoryName: string) => Promise<number>;
  getLocalizedName: (categoryName: string) => string;
}

const DEFAULT_CATEGORIES = [
  { name: '寶可夢卡', name_zh_cn: '宝可梦卡', name_en: 'Pokemon Cards', name_ja: 'ポケモンカード' },
  { name: '航海王卡', name_zh_cn: '航海王卡', name_en: 'One Piece Cards', name_ja: 'ワンピースカード' },
  { name: '遊戲王卡', name_zh_cn: '游戏王卡', name_en: 'Yu-Gi-Oh! Cards', name_ja: '遊戯王カード' },
];

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],

  loadCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // 資料庫為空，插入預設分類
        for (const cat of DEFAULT_CATEGORIES) {
          await supabase.from('categories').insert({
            name: cat.name,
            name_zh_cn: cat.name_zh_cn,
            name_en: cat.name_en,
            name_ja: cat.name_ja,
          });
        }

        // 重新載入
        const { data: newData } = await supabase
          .from('categories')
          .select('*')
          .order('created_at', { ascending: true });

        set({
          categories: (newData || []).map((c) => ({
            id: c.id,
            name: c.name,
            nameZhCn: c.name_zh_cn || c.name,
            nameEn: c.name_en || c.name,
            nameJa: c.name_ja || c.name,
            createdAt: c.created_at,
          })),
        });
      } else {
        set({
          categories: data.map((c) => ({
            id: c.id,
            name: c.name,
            nameZhCn: c.name_zh_cn || c.name,
            nameEn: c.name_en || c.name,
            nameJa: c.name_ja || c.name,
            createdAt: c.created_at,
          })),
        });
      }
    } catch (error) {
      console.warn('載入分類失敗，使用 mock 資料:', error);
      set({ categories: mockCategories });
    }
  },

  addCategory: async (input: CategoryInput) => {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { success: false, message: '分類名稱不可為空白' };
    }

    const { categories } = get();
    if (categories.some((cat) => cat.name === trimmedName)) {
      return { success: false, message: '分類名稱已存在' };
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: trimmedName,
          name_zh_cn: input.name_zh_cn?.trim(),
          name_en: input.name_en?.trim(),
          name_ja: input.name_ja?.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      const newCategory: Category = {
        id: data.id,
        name: data.name,
        nameZhCn: data.name_zh_cn || data.name,
        nameEn: data.name_en || data.name,
        nameJa: data.name_ja || data.name,
        createdAt: data.created_at,
      };

      set({ categories: [...categories, newCategory] });
      return { success: true };
    } catch (error) {
      console.error('新增分類失敗:', error);
      return { success: false, message: '新增分類失敗' };
    }
  },

  updateCategory: async (id: string, input: CategoryInput) => {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return { success: false, message: '分類名稱不可為空白' };
    }

    const { categories } = get();
    if (categories.some((cat) => cat.id !== id && cat.name === trimmedName)) {
      return { success: false, message: '分類名稱已存在' };
    }

    try {
      const { error } = await supabase
        .from('categories')
        .update({
          name: trimmedName,
          name_zh_cn: input.name_zh_cn?.trim() || null,
          name_en: input.name_en?.trim() || null,
          name_ja: input.name_ja?.trim() || null,
        })
        .eq('id', id);

      if (error) throw error;

      set({
        categories: categories.map((cat) =>
          cat.id === id
            ? {
                ...cat,
                name: trimmedName,
                nameZhCn: input.name_zh_cn?.trim() || trimmedName,
                nameEn: input.name_en?.trim() || trimmedName,
                nameJa: input.name_ja?.trim() || trimmedName,
              }
            : cat
        ),
      });
      return { success: true };
    } catch (error) {
      console.error('更新分類失敗:', error);
      return { success: false, message: '更新分類失敗' };
    }
  },

  deleteCategory: async (id: string) => {
    const { categories, getCategoryProductCount } = get();
    const category = categories.find((cat) => cat.id === id);
    if (!category) {
      return { success: false, message: '找不到該分類' };
    }

    const productCount = await getCategoryProductCount(category.name);
    if (productCount > 0) {
      return { success: false, message: `此分類下有 ${productCount} 個商品，無法刪除` };
    }

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);

      if (error) throw error;

      set({ categories: categories.filter((cat) => cat.id !== id) });
      return { success: true };
    } catch (error) {
      console.error('刪除分類失敗:', error);
      return { success: false, message: '刪除分類失敗' };
    }
  },

  getCategoryProductCount: async (categoryName: string) => {
    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category', categoryName);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      console.error('計算商品數量失敗:', error);
      return 0;
    }
  },

  getLocalizedName: (categoryName: string) => {
    const { categories } = get();
    const cat = categories.find(c => c.name === categoryName);
    if (!cat) return categoryName;

    const lang = i18n.language || 'zh-TW';
    const normalizedLang = lang.toLowerCase().replace(/_/g, '-');
    if (normalizedLang.includes('zh-cn') || normalizedLang.includes('zh-hans') || normalizedLang.includes('zh_cn')) return cat.nameZhCn || cat.name;
    if (normalizedLang.includes('en')) return cat.nameEn || cat.name;
    if (normalizedLang.includes('ja') || normalizedLang.includes('jp')) return cat.nameJa || cat.name;
    return cat.name;
  },
}));