import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { EDGE_FUNCTIONS } from '../../lib/edgeFunctions';

export default function MfaVerifyPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 共用的 fetch helper
  const callMfa = async (action: string, params?: Record<string, string>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const anonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(EDGE_FUNCTIONS.mfaEmail, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ action, ...params }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || `伺服器錯誤 (HTTP ${response.status})`);
    }
    return data;
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }
      setEmail(session.user.email || '');

      // 只有當 login 流程沒有發送過驗證碼時，才自動發送（避免重複發送）
      const alreadySent = sessionStorage.getItem('mfa_code_sent') === 'true';
      if (alreadySent) {
        sessionStorage.removeItem('mfa_code_sent');
      } else {
        try {
          await callMfa('send_code');
        } catch (e: any) {
          setError(e.message || '寄送驗證郵件失敗，請稍後再試');
        }
      }

      inputRefs.current[0]?.focus();
    };
    init();
  }, [navigate]);

  // 重新發送冷卻計時
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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

    setIsLoading(true);
    setError('');

    try {
      await callMfa('verify_code', { code });

      // MFA 驗證成功
      const redirectTo = sessionStorage.getItem('mfa_redirect_to') || '/';
      sessionStorage.removeItem('mfa_redirect_to');
      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      setError(e.message || '驗證碼不正確，請重試');
      setCode('');
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      await callMfa('send_code');
      setResendCooldown(60);
    } catch (e: any) {
      setError(e.message || '重新寄送失敗，請稍後再試');
    }
  };

  const handleCancel = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    // 手動清除 sessionStorage
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith('sb-')) sessionStorage.removeItem(key);
    });
    sessionStorage.removeItem('mfa_redirect_to');
    navigate('/login', { replace: true });
  };

  const codeDigits = Array.from({ length: 6 }, (_, i) => code[i] || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 overflow-hidden shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img
              src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
              alt="Card Train Logo"
              className="w-full h-full object-contain"
            />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">雙重認證</h1>
          <p className="text-sm text-gray-500 mt-2">
            已發送 6 位驗證碼至您的信箱
          </p>
          {email && (
            <p className="text-xs text-gray-400 mt-1 truncate max-w-xs mx-auto">
              {email}
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center">
              <i className="ri-mail-check-line text-3xl text-rose-500"></i>
            </div>
          </div>

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
            className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-red-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <i className="ri-loader-4-line animate-spin text-base"></i>
                驗證中...
              </>
            ) : (
              <>
                <i className="ri-shield-check-line text-base"></i>
                驗證
              </>
            )}
          </button>

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="text-sm text-rose-500 hover:text-rose-700 transition-colors disabled:text-gray-400 cursor-pointer"
            >
              {resendCooldown > 0 ? `重新寄送 (${resendCooldown}s)` : '重新寄送驗證碼'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="text-sm text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              取消並重新登入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}