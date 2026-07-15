import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// 使用 sessionStorage 儲存 session：
// - 關閉分頁或瀏覽器視窗後 session 自動消失，需重新登入
// - 防止透過書籤、瀏覽器歷史記錄繞過登入
// - 同一瀏覽器的不同分頁各自獨立，互不影響
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: true,
    flowType: 'implicit',
    autoRefreshToken: true,
    persistSession: true,
    storage: window.sessionStorage,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          birth_date: string;
          gender: string;
          favorite_pokemon: string;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          birth_date: string;
          gender: string;
          favorite_pokemon: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          birth_date?: string;
          gender?: string;
          favorite_pokemon?: string;
          created_at?: string;
        };
      };
    };
  };
};
