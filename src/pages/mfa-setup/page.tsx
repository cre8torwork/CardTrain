import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function MfaSetupPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }

      setEmail(session.user.email || '');
      setIsLoading(false);
    };
    checkSession();
  }, [navigate]);

  const handleDone = () => {
    const redirectTo = sessionStorage.getItem('mfa_redirect_to') || '/';
    sessionStorage.removeItem('mfa_redirect_to');
    navigate(redirectTo, { replace: true });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    sessionStorage.removeItem('mfa_redirect_to');
    navigate('/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 flex items-center justify-center">
        <i className="ri-loader-4-line animate-spin text-3xl text-rose-300"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 overflow-hidden shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img
              src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
              alt="Card Train Logo"
              className="w-full h-full object-contain"
            />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">安全設定</h1>
          <p className="text-sm text-gray-500 mt-2">
            此平台已強制啟用雙重認證
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <i className="ri-shield-check-line text-3xl text-green-500"></i>
            </div>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Email 雙重認證已啟用
            </h2>
            <p className="text-sm text-gray-500">
              每次登入時，系統將發送 6 位驗證碼至您的信箱，確保帳號安全
            </p>
            {email && (
              <p className="text-xs text-gray-400 mt-2 truncate">
                驗證碼將寄送至：{email}
              </p>
            )}
          </div>

          {/* 強制啟用標示 */}
          <div className="flex items-center justify-center gap-2 mb-6 py-3 px-4 bg-green-50 border border-green-200 rounded-xl">
            <i className="ri-shield-check-line text-green-500"></i>
            <span className="text-sm font-semibold text-green-700">雙重認證已強制啟用</span>
          </div>

          {/* 安全提示 */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-6">
            <i className="ri-information-line text-amber-500 text-sm mt-0.5 shrink-0"></i>
            <p className="text-xs text-amber-700">
              雙重認證可大幅提升帳號安全性。啟用後，即使密碼外洩，他人也無法登入你的帳號。
            </p>
          </div>

          <button
            onClick={handleDone}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold text-sm hover:from-rose-600 hover:to-pink-700 transition-colors shadow cursor-pointer"
          >
            前往首頁
          </button>

          {/* 底部登出選項 */}
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              登出並返回登入頁
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}