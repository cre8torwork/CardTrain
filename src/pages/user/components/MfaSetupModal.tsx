import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface MfaSetupModalProps {
  onClose: () => void;
}

export default function MfaSetupModal({ onClose }: MfaSetupModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);

  useEffect(() => {
    initCheck();
  }, []);

  const initCheck = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setEmail(session.user.email || '');
      }

      const { data: userData } = await supabase
        .from('users')
        .select('mfa_enabled')
        .eq('id', session?.user?.id || '')
        .maybeSingle();

      setMfaEnabled(userData?.mfa_enabled ?? true);
    } catch {
      setMfaEnabled(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center py-12">
            <i className="ri-loader-4-line animate-spin text-3xl text-gray-300"></i>
          </div>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <i className="ri-shield-check-line text-3xl text-green-500"></i>
            </div>
          </div>

          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Email 雙重認證已啟用
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              此平台已強制啟用雙重認證。每次登入時，系統將發送 6 位驗證碼至您的信箱，確保帳號安全。
            </p>
            {email && (
              <p className="text-xs text-gray-400">
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
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}