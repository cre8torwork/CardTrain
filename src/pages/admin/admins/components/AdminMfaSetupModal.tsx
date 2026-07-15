import { useState, useEffect, useRef } from 'react';
import { EDGE_FUNCTIONS } from '../../../../lib/edgeFunctions';
import { generateSecret, verifyTotp, generateOtpAuthUri, getQrCodeUrl } from '../../../../lib/totp';

interface AdminMfaSetupModalProps {
  adminId: string;
  adminUsername: string;
  currentlyEnabled: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminMfaSetupModal({
  adminId,
  adminUsername,
  currentlyEnabled,
  onClose,
  onSuccess,
}: AdminMfaSetupModalProps) {
  const [step, setStep] = useState<'confirm_disable' | 'setup' | 'verify' | 'success' | 'disabled_success'>(
    currentlyEnabled ? 'confirm_disable' : 'setup'
  );
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copyMsg, setCopyMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 'setup' && !secret) {
      const newSecret = generateSecret();
      setSecret(newSecret);
      const otpauthUri = generateOtpAuthUri(newSecret, 'CardTrain', 'CardTrain');
      setQrCodeUrl(getQrCodeUrl(otpauthUri, 200));
    }
    if (step === 'verify') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step, secret, adminUsername]);

  const handleSetupVerify = async () => {
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('請輸入完整的 6 位數驗證碼');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const isValid = await verifyTotp(secret, code);
      if (!isValid) {
        setError('驗證碼不正確，請確認驗證器應用程式的時間設定正確');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(EDGE_FUNCTIONS.adminAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_mfa',
          adminId,
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

  const handleDisable = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(EDGE_FUNCTIONS.adminAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_mfa',
          adminId,
          mfa_secret: null,
          mfa_enabled: false,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || '關閉失敗');
      }

      setStep('disabled_success');
    } catch {
      setError('關閉失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopyMsg('已複製！');
      setTimeout(() => setCopyMsg(''), 2000);
    });
  };

  const handleDone = () => {
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">雙重認證設定</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="px-6 py-6">
          {step === 'confirm_disable' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <i className="ri-shield-flash-line text-3xl text-amber-500"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">關閉雙重認證</h3>
              <p className="text-sm text-gray-500 mb-2">
                確定要為 <span className="font-semibold text-gray-700">{adminUsername}</span> 關閉雙重認證嗎？
              </p>
              <p className="text-xs text-red-500 mb-6">關閉後帳號安全性將會降低</p>
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <i className="ri-error-warning-line text-red-500 text-sm mt-0.5"></i>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer">取消</button>
                <button onClick={handleDisable} disabled={isLoading} className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-medium text-sm hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer">
                  {isLoading ? <><i className="ri-loader-4-line animate-spin"></i>處理中...</> : '確認關閉'}
                </button>
              </div>
            </div>
          )}

          {step === 'setup' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-bold text-sm">1</div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">掃描 QR Code</p>
                  <p className="text-xs text-gray-400">使用 Google Authenticator 或任何支援 TOTP 的驗證器應用程式掃描</p>
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48 rounded-xl border border-gray-200" />
              </div>

              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 mb-2">或手動輸入金鑰：</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono break-all select-all">{secret}</code>
                  <button onClick={handleCopySecret} className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-rose-500 hover:border-rose-300 transition-colors cursor-pointer whitespace-nowrap">{copyMsg || '複製'}</button>
                </div>
              </div>

              <button onClick={() => setStep('verify')} className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold text-sm hover:from-rose-600 hover:to-pink-700 transition-colors cursor-pointer">
                下一步：輸入驗證碼
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-bold text-sm">2</div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">輸入驗證碼</p>
                  <p className="text-xs text-gray-400">請輸入驗證器應用程式顯示的 6 位驗證碼</p>
                </div>
              </div>

              <div className="mb-4">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => { const val = e.target.value.replace(/\D/g, '').slice(0, 6); setCode(val); }}
                  placeholder="000000"
                  className="w-full px-4 py-3 text-center text-2xl font-bold tracking-[0.5em] border-2 border-gray-200 rounded-xl focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <i className="ri-error-warning-line text-red-500 text-sm mt-0.5"></i>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('setup')} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors cursor-pointer">上一步</button>
                <button onClick={handleSetupVerify} disabled={isLoading || code.length !== 6} className="flex-1 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold text-sm hover:from-rose-600 hover:to-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 cursor-pointer">
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
              <h3 className="text-lg font-bold text-gray-800 mb-2">雙重認證已啟用</h3>
              <p className="text-sm text-gray-500 mb-6">{adminUsername} 的雙重認證已成功啟用。</p>
              <button onClick={handleDone} className="w-full py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg font-semibold text-sm hover:from-rose-600 hover:to-pink-700 transition-colors cursor-pointer">完成</button>
            </div>
          )}

          {step === 'disabled_success' && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <i className="ri-shield-line text-3xl text-gray-400"></i>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">雙重認證已關閉</h3>
              <p className="text-sm text-gray-500 mb-6">{adminUsername} 的雙重認證已關閉。</p>
              <button onClick={handleDone} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors cursor-pointer">完成</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}