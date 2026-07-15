import { useState } from 'react';
import { EDGE_FUNCTIONS } from '../../../../lib/edgeFunctions';

interface Admin {
  id: string;
  username: string;
}

interface AdminPasswordModalProps {
  admin: Admin;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminPasswordModal({ admin, onClose, onSuccess }: AdminPasswordModalProps) {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordRequirements = {
    minLength: formData.newPassword.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.newPassword),
    hasLowerCase: /[a-z]/.test(formData.newPassword),
    hasNumber: /[0-9]/.test(formData.newPassword)
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = formData.newPassword === formData.confirmPassword && formData.confirmPassword !== '';

  const getPasswordStrength = () => {
    const metCount = Object.values(passwordRequirements).filter(Boolean).length;
    if (metCount === 0) return { label: '', color: '' };
    if (metCount === 1) return { label: '弱', color: 'bg-red-500' };
    if (metCount === 2) return { label: '一般', color: 'bg-orange-500' };
    if (metCount === 3) return { label: '良好', color: 'bg-yellow-500' };
    return { label: '強', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!allRequirementsMet) {
      setError('密碼不符合複雜性要求');
      return;
    }

    if (!passwordsMatch) {
      setError('兩次輸入的密碼不一致');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(EDGE_FUNCTIONS.adminAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_password',
          adminId: admin.id,
          newPassword: formData.newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || '修改密碼失敗');
        setIsLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError('無法連線到伺服器');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">修改密碼</h2>
            <p className="text-sm text-gray-500 mt-1">管理員：{admin.username}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <i className="ri-close-line text-xl text-gray-500"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              新密碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all text-sm"
              placeholder="請輸入新密碼"
              disabled={isLoading}
              autoComplete="new-password"
            />

            {formData.newPassword && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${(Object.values(passwordRequirements).filter(Boolean).length / 4) * 100}%` }}
                    ></div>
                  </div>
                  {strength.label && (
                    <span className="text-xs font-medium text-gray-600">{strength.label}</span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 space-y-1.5">
              <div className={`flex items-center gap-2 text-xs ${passwordRequirements.minLength ? 'text-green-600' : 'text-gray-400'}`}>
                <i className={`${passwordRequirements.minLength ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}`}></i>
                <span>至少 8 個字元</span>
              </div>
              <div className={`flex items-center gap-2 text-xs ${passwordRequirements.hasUpperCase ? 'text-green-600' : 'text-gray-400'}`}>
                <i className={`${passwordRequirements.hasUpperCase ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}`}></i>
                <span>包含大寫字母（A-Z）</span>
              </div>
              <div className={`flex items-center gap-2 text-xs ${passwordRequirements.hasLowerCase ? 'text-green-600' : 'text-gray-400'}`}>
                <i className={`${passwordRequirements.hasLowerCase ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}`}></i>
                <span>包含小寫字母（a-z）</span>
              </div>
              <div className={`flex items-center gap-2 text-xs ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-400'}`}>
                <i className={`${passwordRequirements.hasNumber ? 'ri-checkbox-circle-fill' : 'ri-checkbox-blank-circle-line'}`}></i>
                <span>包含數字（0-9）</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              確認新密碼 <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all text-sm"
              placeholder="請再次輸入新密碼"
              disabled={isLoading}
              autoComplete="new-password"
            />
            {formData.confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <i className="ri-error-warning-line"></i>
                <span>兩次輸入的密碼不一致</span>
              </p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                <i className="ri-checkbox-circle-fill"></i>
                <span>密碼一致</span>
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <i className="ri-error-warning-line text-lg"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || !allRequirementsMet || !passwordsMatch}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:from-rose-600 hover:to-pink-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  <span>修改中...</span>
                </>
              ) : (
                <>
                  <i className="ri-check-line"></i>
                  <span>確認修改</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}