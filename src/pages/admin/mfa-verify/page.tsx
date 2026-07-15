import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyTotp } from '../../../lib/totp';

const MFA_TIMEOUT_MINUTES = 5;

export default function AdminMfaVerify() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminInfo, setAdminInfo] = useState<{ username: string; mfa_secret: string } | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const raw = sessionStorage.getItem('admin_mfa_pending');
    if (!raw) {
      navigate('/admin/login', { replace: true });
      return;
    }
    try {
      const pending = JSON.parse(raw);
      if (Date.now() - pending.timestamp > MFA_TIMEOUT_MINUTES * 60 * 1000) {
        sessionStorage.removeItem('admin_mfa_pending');
        navigate('/admin/login', { replace: true });
        return;
      }
      if (!pending.mfa_secret) {
        sessionStorage.removeItem('admin_mfa_pending');
        navigate('/admin/login', { replace: true });
        return;
      }
      setAdminInfo({ username: pending.username, mfa_secret: pending.mfa_secret });
    } catch {
      sessionStorage.removeItem('admin_mfa_pending');
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = code.split('');
    newCode[index] = value.slice(-1);
    const newCodeStr = newCode.join('').slice(0, 6);
    setCode(newCodeStr);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      setCode(pasted.padEnd(6, ''));
      const nextIndex = Math.min(pasted.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('請輸入完整的 6 位驗證碼');
      return;
    }
    if (!adminInfo?.mfa_secret) {
      setError('驗證資訊已過期，請重新登入');
      return;
    }

    const raw = sessionStorage.getItem('admin_mfa_pending');
    if (!raw) return;
    const pending = JSON.parse(raw);

    setIsLoading(true);
    setError('');

    try {
      const isValid = await verifyTotp(adminInfo.mfa_secret, code);
      if (!isValid) {
        setError('驗證碼不正確，請重試');
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem('admin_logged_in', 'true');
      sessionStorage.setItem('admin_mfa_enabled', 'true');
      sessionStorage.setItem('admin_username', pending.username);
      sessionStorage.setItem('admin_role', pending.role || '');
      // 儲存 admin_id 供後台操作驗證使用
      if (pending.adminId) sessionStorage.setItem('admin_id', pending.adminId);
      const pendingId = sessionStorage.getItem('admin_id_pending');
      if (pendingId) { sessionStorage.setItem('admin_id', pendingId); sessionStorage.removeItem('admin_id_pending'); }
      sessionStorage.removeItem('admin_mfa_pending');

      navigate('/admin/dashboard', { replace: true });
    } catch {
      setError('驗證失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem('admin_mfa_pending');
    navigate('/admin/login', { replace: true });
  };

  if (!adminInfo) return null;

  const codeDigits = Array.from({ length: 6 }, (_, i) => code[i] || '');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
            alt="Card Train Logo"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">雙重認證</h1>
          <p className="text-sm text-gray-500 mt-2">
            請輸入驗證器應用程式中的 6 位驗證碼
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center">
              <i className="ri-shield-keyhole-line text-3xl text-rose-500"></i>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500 mb-6">
            帳號 <span className="font-semibold text-gray-700">{adminInfo.username}</span> 已啟用雙重認證
          </p>

          <div className="flex items-center justify-center gap-3 mb-6" onPaste={handlePaste}>
            {codeDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none ${
                  digit
                    ? 'border-rose-400 bg-rose-50 text-rose-600'
                    : 'border-gray-200 bg-gray-50 text-gray-700'
                } focus:border-rose-500 focus:ring-2 focus:ring-rose-200`}
                disabled={isLoading}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-5">
              <i className="ri-error-warning-line text-red-500 text-lg mt-0.5"></i>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={isLoading || code.length !== 6}
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                驗證中...
              </>
            ) : (
              <>
                <i className="ri-shield-check-line"></i>
                驗證
              </>
            )}
          </button>

          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="w-full mt-3 py-2.5 text-sm text-gray-500 hover:text-rose-600 transition-colors cursor-pointer"
          >
            返回登入
          </button>
        </div>
      </div>
    </div>
  );
}