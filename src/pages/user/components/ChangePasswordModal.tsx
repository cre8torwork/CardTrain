import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';

interface ChangePasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

function ChangePasswordModal({ onClose, onSuccess }: ChangePasswordModalProps) {
  const { t } = useTranslation();

  const PASSWORD_REQUIREMENTS: PasswordRequirement[] = useMemo(() => [
    { label: t('user.changePwd.requirementLength'), test: (pwd) => pwd.length >= 8 },
    { label: t('user.changePwd.requirementUpper'), test: (pwd) => /[A-Z]/.test(pwd) },
    { label: t('user.changePwd.requirementLower'), test: (pwd) => /[a-z]/.test(pwd) },
    { label: t('user.changePwd.requirementDigit'), test: (pwd) => /[0-9]/.test(pwd) },
  ], [t]);

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
    if (!password) return { level: 0, label: '', color: '' };
    const passed = PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length;
    if (passed === 4) return { level: 4, label: t('user.changePwd.strengthStrong'), color: 'bg-green-500' };
    if (passed === 3) return { level: 3, label: t('user.changePwd.strengthGood'), color: 'bg-blue-500' };
    if (passed === 2) return { level: 2, label: t('user.changePwd.strengthFair'), color: 'bg-yellow-500' };
    return { level: 1, label: t('user.changePwd.strengthWeak'), color: 'bg-red-500' };
  };

  const passwordStrength = getPasswordStrength(form.newPassword);
  const allRequirementsMet = PASSWORD_REQUIREMENTS.every((req) => req.test(form.newPassword));
  const passwordsMatch = form.newPassword && form.confirmPassword && form.newPassword === form.confirmPassword;
  const passwordsDontMatch = form.confirmPassword && form.newPassword !== form.confirmPassword;

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.currentPassword.trim()) {
      setError(t('user.changePwd.errorCurrentRequired'));
      return;
    }

    if (!form.newPassword.trim()) {
      setError(t('user.changePwd.errorNewRequired'));
      return;
    }

    if (!allRequirementsMet) {
      setError(t('user.changePwd.errorComplexity'));
      return;
    }

    if (!passwordsMatch) {
      setError(t('user.changePwd.errorMismatch'));
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError(t('user.changePwd.errorSame'));
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error(t('user.changePwd.errorNoUser'));
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: form.currentPassword,
      });

      if (signInError) {
        setError(t('user.changePwd.errorWrongPassword'));
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: form.newPassword,
      });

      if (updateError) throw updateError;

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('修改密碼失敗:', err);
      setError(err.message || t('user.changePwd.errorGeneric'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease]">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 成功覆蓋層 */}
        {showSuccess && (
          <div className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center z-10 animate-[fadeIn_0.3s_ease]">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <i className="ri-checkbox-circle-fill text-5xl text-green-500"></i>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-2">{t('user.changePwd.successTitle')}</p>
            <p className="text-sm text-gray-500">{t('user.changePwd.successDesc')}</p>
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full">
              <i className="ri-lock-password-line text-xl text-white"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('user.changePwd.title')}</h3>
              <p className="text-xs text-white/80">{t('user.changePwd.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {/* 目前密碼 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <i className="ri-lock-line text-rose-500"></i>
              {t('user.changePwd.currentPassword')}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={form.currentPassword}
                onChange={(e) => handleChange('currentPassword', e.target.value)}
                placeholder={t('user.changePwd.currentPasswordPlaceholder')}
                disabled={saving}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className={showCurrentPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
              </button>
            </div>
          </div>

          {/* 分隔線 */}
          <div className="border-t border-gray-100"></div>

          {/* 新密碼 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <i className="ri-lock-password-line text-rose-500"></i>
              {t('user.changePwd.newPassword')}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={form.newPassword}
                onChange={(e) => handleChange('newPassword', e.target.value)}
                placeholder={t('user.changePwd.newPasswordPlaceholder')}
                disabled={saving}
                className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className={showNewPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
              </button>
            </div>

            {/* 密碼強度條 */}
            {form.newPassword && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500">{t('user.changePwd.passwordStrength')}</span>
                  <span className={`text-xs font-bold ${
                    passwordStrength.level === 4 ? 'text-green-600'
                    : passwordStrength.level === 3 ? 'text-blue-600'
                    : passwordStrength.level === 2 ? 'text-yellow-600'
                    : 'text-red-600'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-all ${
                        level <= passwordStrength.level ? passwordStrength.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 密碼要求清單 */}
            <div className="mt-3 space-y-1.5">
              {PASSWORD_REQUIREMENTS.map((req, index) => {
                const met = req.test(form.newPassword);
                return (
                  <div key={index} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      met ? 'bg-green-500' : 'bg-gray-200'
                    }`}>
                      {met && <i className="ri-check-line text-white text-xs"></i>}
                    </div>
                    <span className={`text-xs transition-colors ${
                      met ? 'text-green-600 font-medium' : 'text-gray-500'
                    }`}>
                      {req.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 確認新密碼 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
              <i className="ri-lock-password-line text-rose-500"></i>
              {t('user.changePwd.confirmPassword')}
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder={t('user.changePwd.confirmPasswordPlaceholder')}
                disabled={saving}
                className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none transition-all text-sm disabled:bg-gray-50 ${
                  passwordsDontMatch
                    ? 'border-red-300 focus:border-red-400'
                    : passwordsMatch
                    ? 'border-green-300 focus:border-green-400'
                    : 'border-gray-200 focus:border-rose-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className={showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
              </button>
            </div>
            {passwordsDontMatch && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <i className="ri-error-warning-line"></i>
                {t('user.changePwd.notMatch')}
              </p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                <i className="ri-checkbox-circle-line"></i>
                {t('user.changePwd.match')}
              </p>
            )}
          </div>

          {/* 錯誤提示 */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <i className="ri-error-warning-line text-red-500 flex-shrink-0"></i>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 安全提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <i className="ri-information-line text-blue-500 text-lg flex-shrink-0 mt-0.5"></i>
            <div className="text-xs text-blue-700 leading-relaxed space-y-1">
              <p className="font-semibold">{t('user.changePwd.securityTitle')}</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>{t('user.changePwd.security0')}</li>
                <li>{t('user.changePwd.security1')}</li>
                <li>{t('user.changePwd.security2')}</li>
              </ul>
            </div>
          </div>

          {/* 按鈕 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {t('user.changePwd.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !allRequirementsMet || !passwordsMatch || !form.currentPassword}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {saving ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  {t('user.changePwd.saving')}
                </>
              ) : (
                <>
                  <i className="ri-check-line"></i>
                  {t('user.changePwd.confirm')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export default ChangePasswordModal;