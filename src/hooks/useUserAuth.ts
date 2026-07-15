import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { EDGE_FUNCTIONS } from '../lib/edgeFunctions';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  displayName: string;
  birthDate: string;
  gender: string;
  favoritePokemon: string;
  createdAt: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  birthDate: string;
  gender: string;
  favoritePokemon: string;
}

export const useUserAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // 用來防止 onAuthStateChange 與 register 同時寫入 users 表
  const isRegistering = useRef(false);
  const isLoggingIn = useRef(false);

  // 從 Supabase 載入完整用戶資料
  const loadUserProfile = async (authUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentUser({
          id: data.id,
          email: data.email,
          displayName: data.display_name,
          birthDate: data.birth_date,
          gender: data.gender,
          favoritePokemon: data.favorite_pokemon,
          createdAt: data.created_at,
        });
      } else if (!isRegistering.current && !isLoggingIn.current) {
        // users 表沒有資料，且不在註冊/登入流程中，才自動建立基本資料
        const { error: upsertError } = await supabase.from('users').upsert({
          id: authUser.id,
          email: authUser.email ?? '',
          display_name: authUser.email?.split('@')[0] ?? '用戶',
          password_hash: 'supabase_auth_managed',
          birth_date: '',
          gender: '',
          favorite_pokemon: '',
        }, { onConflict: 'id' });

        if (!upsertError) {
          setCurrentUser({
            id: authUser.id,
            email: authUser.email ?? '',
            displayName: authUser.email?.split('@')[0] ?? '用戶',
            birthDate: '',
            gender: '',
            favoritePokemon: '',
            createdAt: new Date().toISOString(),
          });
        } else {
          console.error('自動建立用戶資料失敗:', upsertError);
          setCurrentUser(null);
        }
      }
    } catch (error) {
      console.error('載入用戶資料失敗:', error);
      setCurrentUser(null);
    }
  };

  // 監聽認證狀態變化
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserProfile(session.user).finally(() => setLoading(false));
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setLoading(false);
        // 清除所有瀏覽器歷史堆疊中的已登入狀態，防止按返回鍵恢復
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      if (session?.user) {
        // 若正在執行註冊或登入流程，跳過自動載入（由 register/login 函數自行處理）
        if (!isRegistering.current && !isLoggingIn.current) {
          loadUserProfile(session.user);
        }
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 註冊
  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string; needsEmailConfirmation?: boolean }> => {
    isRegistering.current = true;
    try {
      // 1. 使用 Supabase Auth 註冊
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already been registered') || authError.message.includes('User already registered')) {
          return { success: false, error: '此電郵地址已被註冊，請直接登入' };
        }
        if (authError.message.includes('rate limit') || authError.message.includes('email rate limit') || authError.status === 429) {
          return { success: false, error: '系統繁忙，請稍等 1 分鐘後再試' };
        }
        if (authError.message.includes('Password should be at least')) {
          return { success: false, error: '密碼至少需要 6 位字元' };
        }
        if (authError.message.includes('invalid email') || authError.message.includes('Invalid email')) {
          return { success: false, error: '電郵地址格式不正確' };
        }
        throw authError;
      }

      if (!authData.user) throw new Error('註冊失敗，請稍後再試');

      const userId = authData.user.id;

      // 2. 寫入 users 表（只有在有 session 或 identities 存在時才寫入）
      // 若需要電郵驗證，authData.session 為 null，但 user 存在
      const { error: upsertError } = await supabase.from('users').upsert({
        id: userId,
        email: data.email,
        display_name: data.displayName,
        password_hash: 'supabase_auth_managed',
        birth_date: data.birthDate,
        gender: data.gender,
        favorite_pokemon: data.favoritePokemon,
        mfa_enabled: true,
      }, { onConflict: 'id' });

      if (upsertError) {
        console.error('寫入用戶資料失敗:', upsertError);
        // 若沒有 session（需要電郵驗證），寫入失敗不阻止流程
        if (authData.session) throw upsertError;
      }

      // 3. 新增初始積分記錄（走 Edge Function，安全）
      if (authData.session) {
        const { data: existingPoints } = await supabase
          .from('points')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (!existingPoints) {
          // 走 Edge Function 確保安全（不讓前端直接寫入 points）
          await supabase.functions.invoke('user-points', {
            body: { action: 'add_initial_points' },
          });
        }
      }

      // 4. 判斷是否需要電郵驗證
      // authData.session 為 null 代表需要驗證電郵
      if (!authData.session) {
        return { success: true, needsEmailConfirmation: true };
      }

      // 5. 有 session，直接設定登入狀態
      setCurrentUser({
        id: userId,
        email: data.email,
        displayName: data.displayName,
        birthDate: data.birthDate,
        gender: data.gender,
        favoritePokemon: data.favoritePokemon,
        createdAt: new Date().toISOString(),
      });

      await supabase.auth.setSession(authData.session);

      return { success: true };
    } catch (error: any) {
      console.error('註冊失敗:', error);
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        return { success: false, error: '此電郵地址已被註冊，請直接登入' };
      }
      return {
        success: false,
        error: error.message || '註冊失敗，請稍後再試',
      };
    } finally {
      isRegistering.current = false;
    }
  };

  // 登入
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string; needsMfa?: boolean }> => {
    isLoggingIn.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('signInWithPassword result:', { data: data ? 'has data' : null, error: error ? error.message : null, errorStatus: error?.status, errorName: error?.name });

      if (error) {
        console.error('signInWithPassword error:', error);
        if (
          error.message.includes('Email not confirmed') ||
          error.message.includes('email not confirmed')
        ) {
          return { success: false, error: '電郵尚未驗證，請先到信箱點擊驗證連結後再登入' };
        }
        if (
          error.message === 'Invalid login credentials' ||
          error.message.includes('invalid_credentials')
        ) {
          return { success: false, error: '電子郵件或密碼錯誤' };
        }
        if (
          error.message.includes('rate limit') ||
          error.message.includes('too many requests') ||
          error.status === 429
        ) {
          return { success: false, error: 'RATE_LIMIT' };
        }
        throw error;
      }

      if (!data.user) {
        console.error('signInWithPassword success but no user');
        throw new Error('登入失敗');
      }

      console.log('signInWithPassword success, userId:', data.user.id);

      const userId = data.user.id;

      // 檢查 Email MFA 狀態
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('mfa_enabled, status, last_login_at')
        .eq('id', userId)
        .maybeSingle();

      console.log('users query result:', { userData, userError: userError?.message });

      if (userError) {
        console.error('users query error:', userError);
      }

      // 檢查是否被暫停
      if (userData?.status === 'suspended') {
        await supabase.auth.signOut({ scope: 'local' });
        setCurrentUser(null);
        return { success: false, error: '此帳號已被暫停，請聯繫管理員重新激活' };
      }

      // 檢查最後登入時間是否超過 30 日
      if (userData?.last_login_at) {
        const lastLogin = new Date(userData.last_login_at);
        const daysSinceLastLogin = (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastLogin > 30) {
          await supabase.from('users').update({ status: 'suspended' }).eq('id', userId);
          await supabase.auth.signOut({ scope: 'local' });
          setCurrentUser(null);
          return { success: false, error: '此帳號因超過 30 日未登入已被自動暫停，請聯繫管理員重新激活' };
        }
      }

      // 檢查 MFA 是否啟用
      if (userData?.mfa_enabled) {
        // 發送 email 驗證碼 - 使用直接 fetch 繞過 FunctionsClient 的 CORS/binding 問題
        const token = data.session?.access_token;
        const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;
        let sendError: any = null;
        let sendData: any = null;

        try {
          console.log('mfa-email: sending fetch to', EDGE_FUNCTIONS.mfaEmail);
          const response = await fetch(EDGE_FUNCTIONS.mfaEmail, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': anonKey,
            },
            body: JSON.stringify({ action: 'send_code' }),
          });
          sendData = await response.json();
          console.log('mfa-email fetch response:', { status: response.status, sendData });
          if (!response.ok) {
            sendError = new Error(sendData?.error || `伺服器錯誤 (HTTP ${response.status})`);
          }
        } catch (fetchErr: any) {
          sendError = fetchErr;
          console.error('mfa-email fetch error:', { message: fetchErr.message, name: fetchErr.name });
        }

        if (sendError || !sendData?.success) {
          const detail = sendData?.error || sendError?.message || String(sendError || '');
          console.error('mfa-email send_code FAILED — detail:', detail);
          // 強制清除所有 session 相關資料
          try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) { /* noop */ }
          // 手動清除 sessionStorage 中 Supabase token
          Object.keys(sessionStorage).forEach((key) => {
            if (key.startsWith('sb-')) sessionStorage.removeItem(key);
          });
          setCurrentUser(null);
          return { success: false, error: detail || '寄送驗證郵件失敗，請稍後再試' };
        }

        // 標記驗證碼已發送，避免 mfa-verify 頁面再次自動發送
        sessionStorage.setItem('mfa_code_sent', 'true');

        return { success: true, needsMfa: true };
      }

      // 無 MFA，直接登入
      const now = new Date().toISOString();

      if (userData) {
        await supabase.from('users').update({ last_login_at: now }).eq('id', userId);
      } else {
        await supabase.from('users').upsert({
          id: userId,
          email: email,
          display_name: email.split('@')[0] ?? '用戶',
          password_hash: 'supabase_auth_managed',
          birth_date: '',
          gender: '',
          favorite_pokemon: '',
          last_login_at: now,
          status: 'active',
          mfa_enabled: true,
        }, { onConflict: 'id' });
      }

      await loadUserProfile(data.user);

      return { success: true };
    } catch (error: any) {
      console.error('login catch error:', error);
      return {
        success: false,
        error: error.message || '登入失敗，請稍後再試',
      };
    } finally {
      isLoggingIn.current = false;
    }
  };

  // 登出
  const logout = async (): Promise<void> => {
    try {
      setCurrentUser(null);
      await supabase.auth.signOut({ scope: 'local' });
      // 清除 sessionStorage 中所有 Supabase 相關 token
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('sb-')) sessionStorage.removeItem(key);
      });
      window.history.replaceState(null, '', '/');
    } catch (error) {
      console.error('登出失敗:', error);
      setCurrentUser(null);
    }
  };

  return {
    currentUser,
    loading,
    isLoggedIn: !!currentUser,
    register,
    login,
    logout,
  };
};