import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EDGE_FUNCTIONS } from '../../../lib/edgeFunctions';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!formData.username.trim() || !formData.password.trim()) {
      setError('請輸入帳號和密碼');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(EDGE_FUNCTIONS.adminAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          username: formData.username.trim(),
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (response.status === 429) {
          setError('嘗試次數過多，請稍等 1 分鐘後再試');
        } else {
          setError(result.error || '帳號或密碼錯誤');
        }
        setIsLoading(false);
        return;
      }

      const { admin } = result;

      // MFA 檢查
      if (admin.mfa_enabled) {
        sessionStorage.setItem('admin_mfa_pending', JSON.stringify({
          adminId: admin.id,
          username: admin.username,
          mfa_secret: admin.mfa_secret,
          role: admin.role || '',
          timestamp: Date.now(),
        }));
        // 預先存 admin_id 供 mfa-verify 後使用
        sessionStorage.setItem('admin_id_pending', admin.id);
        navigate('/admin/mfa-verify');
        setIsLoading(false);
        return;
      }

      // 尚未設定 MFA → 強制導向 MFA 設定頁面
      sessionStorage.setItem('admin_mfa_pending', JSON.stringify({
        adminId: admin.id,
        username: admin.username,
        role: admin.role || '',
        timestamp: Date.now(),
      }));
      sessionStorage.setItem('admin_id_pending', admin.id);
      navigate('/admin/mfa-setup');
      setIsLoading(false);
      return;
    } catch {
      setError('無法連線到伺服器，請檢查網絡連接');
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
            alt="Card Train Logo"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">Card Train 後台管理系統</h1>
          <p className="text-sm text-gray-500 mt-2">管理員登入</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                管理員帳號
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                autoComplete="username"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="請輸入管理員帳號"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密碼
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all text-sm"
                placeholder="請輸入密碼"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <i className="ri-error-warning-line text-lg"></i>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-3 rounded-lg font-medium hover:from-rose-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  <span>登入中...</span>
                </>
              ) : (
                <>
                  <i className="ri-login-box-line"></i>
                  <span>登入</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              僅限授權管理員登入 · 密碼經安全雜湊處理
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-rose-600 transition-colors flex items-center gap-1 mx-auto whitespace-nowrap"
          >
            <i className="ri-arrow-left-line"></i>
            <span>返回首頁</span>
          </button>
        </div>
      </div>
    </div>
  );
}