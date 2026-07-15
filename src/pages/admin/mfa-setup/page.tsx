import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { EDGE_FUNCTIONS } from '../../../lib/edgeFunctions';
import { generateSecret, verifyTotp, generateOtpAuthUri, getQrCodeUrl } from '../../../lib/totp';

const MFA_TIMEOUT_MINUTES = 5;

export default function AdminMfaSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'loading' | 'setup' | 'verify' | 'success'>('loading');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminInfo, setAdminInfo] = useState<{ adminId: string; username: string; role: string } | null>(null);
  const [copyMsg, setCopyMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

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
      setAdminInfo({ adminId: pending.adminId, username: pending.username, role: pending.role || '' });

      const newSecret = generateSecret();
      setSecret(newSecret);
      const otpauthUri = generateOtpAuthUri(newSecret, 'CardTrain', 'CardTrain');
      setQrCodeUrl(getQrCodeUrl(otpauthUri, 200));
      setStep('setup');
    } catch {
      sessionStorage.removeItem('admin_mfa_pending');
      navigate('/admin/login', { replace: true });
    }
  }, [navigate]);

  const handleVerify = async () => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('請輸入完整的 6 位數驗證碼');
      return;
    }
    if (!adminInfo) return;

    setIsLoading(true);
    setError('');
    try {
      const isValid = await verifyTotp(secret, code);
      if (!isValid) {
        setError('驗證碼不正確，請確認驗證器應用程式的時間設定正確');
        setCode('');
        inputRef.current?.focus();
        setIsLoading(false);
        return;
      }

      const response = await fetch(EDGE_FUNCTIONS.adminAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_mfa',
          adminId: adminInfo.adminId,
          mfa_secret: secret,
          mfa_enabled: true,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '設定失敗');
      }

      setStep('success');
    } catch {
      setError('設定失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = () => {
    const raw = sessionStorage.getItem('admin_mfa_pending');
    if (raw) {
      try {
        const pending = JSON.parse(raw);
        sessionStorage.setItem('admin_logged_in', 'true');
        sessionStorage.setItem('admin_mfa_enabled', 'true');
        sessionStorage.setItem('admin_username', pending.username);
        sessionStorage.setItem('admin_role', pending.role || '');
        // 儲存 admin_id 供後台操作驗證使用
        if (pending.adminId) sessionStorage.setItem('admin_id', pending.adminId);
        const pendingId = sessionStorage.getItem('admin_id_pending');
        if (pendingId) { sessionStorage.setItem('admin_id', pendingId); sessionStorage.removeItem('admin_id_pending'); }
      } catch { /* ignore */ }
    }
    sessionStorage.removeItem('admin_mfa_pending');
    navigate('/admin/dashboard', { replace: true });
  };

  const handleCancel = () => {
    sessionStorage.removeItem('admin_mfa_pending');
    navigate('/admin/login', { replace: true });
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopyMsg('已複製！');
      setTimeout(() => setCopyMsg(''), 2000);
    });
  };

  if (step === 'loading' || !adminInfo) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
            alt="Card Train Logo"
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-800">安全設定</h1>
          <p className="text-sm text-gray-500 mt-2">
            為保護管理員帳號安全，請設定雙重認證
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 'setup' && (
            <div>
              <div className="flex items-center justify-center mb-6">
                <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center">
                  <i className="ri-qr-code-line text-2xl text-rose-500"></i>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 mb-4">
                管理員 <span className="font-semibold text-gray-700">{adminInfo.username}</span>，請完成雙重認證設定
              </p>

              <div className="text-center mb-3">
                <h2 className="text-lg font-bold text-gray-800">步驟 1：掃描 QR Code</h2>
                <p className="text-sm text-gray-500 mt-1">
                  使用 Google Authenticator 或任何支援 TOTP 的驗證器應用程式掃描
                </p>
              </div>

              <div className="flex justify-center mb-4">
                <img
                  src={qrCodeUrl}
                  alt="MFA QR Code"
                  className="w-48 h-48 rounded-xl border-2 border-gray-100"
                />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-500 mb-2">或手動輸入金鑰：</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono break-all select-all">{secret}</code>
                  <button
                    onClick={handleCopySecret}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-rose-500 hover:border-rose-300 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {copyMsg || '複製'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setStep('verify'); setTimeout(() => inputRef.current?.focus(), 100); }}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold text-sm hover:from-rose-600 hover:to-pink-700 transition-colors shadow cursor-pointer"
              >
                下一步：輸入驗證碼
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div>
              <div className="flex items-center justify-center mb-6">
                <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center">
                  <i className="ri-shield-keyhole-line text-2xl text-rose-500"></i>
                </div>
              </div>

              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-gray-800">步驟 2：輸入驗證碼</h2>
                <p className="text-sm text-gray-500 mt-1">
                  請輸入驗證器應用程式顯示的 6 位驗證碼以完成設定
                </p>
              </div>

              <div className="mb-5">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setCode(val);
                  }}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] border-2 border-gray-200 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-5">
                  <i className="ri-error-warning-line text-red-500 text-sm mt-0.5"></i>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setCode(''); setError(''); setStep('setup'); }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  上一步
                </button>
                <button
                  onClick={handleVerify}
                  disabled={isLoading || code.length !== 6}
                  className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold text-sm hover:from-rose-600 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isLoading ? <><i className="ri-loader-4-line animate-spin"></i>驗證中...</> : '確認驗證'}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <i className="ri-shield-check-line text-3xl text-green-500"></i>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">雙重認證已啟用！</h2>
              <p className="text-sm text-gray-500 mb-1">管理員帳號已受到雙重認證保護</p>
              <p className="text-xs text-gray-400 mb-6">下次登入時將需要輸入驗證器應用程式中的驗證碼</p>
              <button
                onClick={handleDone}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold text-sm hover:from-rose-600 hover:to-pink-700 transition-colors shadow cursor-pointer"
              >
                進入後台
              </button>
            </div>
          )}

          {step !== 'success' && (
            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <button
                onClick={handleCancel}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                返回登入頁
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}