import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';

const PASSWORD_RULE_TESTS = [
  { id: 'length', key: 'login.passwordRule.length', test: (p: string) => p.length >= 8 },
  { id: 'upper', key: 'login.passwordRule.upper', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', key: 'login.passwordRule.lower', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', key: 'login.passwordRule.number', test: (p: string) => /[0-9]/.test(p) },
];

function PasswordStrengthIndicator({ password }: { password: string }) {
  const { t } = useTranslation();
  const results = useMemo(
    () => PASSWORD_RULE_TESTS.map((r) => ({ ...r, passed: r.test(password) })),
    [password]
  );
  const passedCount = results.filter((r) => r.passed).length;
  const strengthLabel = ['', t('login.passwordStrength.weak'), t('login.passwordStrength.fair'), t('login.passwordStrength.good'), t('login.passwordStrength.strong')][passedCount] || '';
  const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][passedCount] || '';
  const textColor = ['', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600'][passedCount] || '';

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= passedCount ? strengthColor : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${textColor}`}>{strengthLabel}</span>
      </div>
      <ul className="space-y-1">
        {results.map((r) => (
          <li
            key={r.id}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              r.passed ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            <i className={`text-sm ${r.passed ? 'ri-checkbox-circle-fill text-green-500' : 'ri-checkbox-blank-circle-line'}`}></i>
            {t(r.key)}
          </li>
        ))}
      </ul>
    </div>
  );
}

type PageState = 'loading' | 'invalid' | 'form' | 'success';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [invalidReason, setInvalidReason] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordRulesPassed = useMemo(
    () => PASSWORD_RULE_TESTS.every((r) => r.test(newPassword)),
    [newPassword]
  );

  const showInvalid = useCallback((reason?: string) => {
    setInvalidReason(reason || t('resetPassword.invalidDefault'));
    setPageState('invalid');
  }, [t]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const currentUrl = new URL(window.location.href);

        const code = currentUrl.searchParams.get('code');
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;

          if (exchangeError) {
            showInvalid(t('resetPassword.invalidVerifyFail', { msg: exchangeError.message }));
            return;
          }
          if (!data.session) {
            showInvalid();
            return;
          }
          window.history.replaceState(null, '', window.location.pathname);
          setPageState('form');
          return;
        }

        const hash = new URLSearchParams(window.location.hash.slice(1));
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const tokenType = hash.get('type');

        if (accessToken && tokenType === 'recovery') {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          if (cancelled) return;

          if (sessionError) {
            showInvalid();
            return;
          }
          window.history.replaceState(null, '', window.location.pathname);
          setPageState('form');
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (cancelled) return;

        if (sessionData.session) {
          setPageState('form');
          return;
        }

        showInvalid(t('resetPassword.invalidNoToken'));
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          showInvalid(t('resetPassword.invalidError', { msg }));
        }
      }
    };

    init();
    return () => { cancelled = true; };
  }, [showInvalid, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!passwordRulesPassed) {
      setError(t('resetPassword.weak'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.mismatch'));
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        if (updateError.message.includes('same password')) {
          setError(t('resetPassword.samePassword'));
        } else {
          setError(t('resetPassword.updateFail', { msg: updateError.message }));
        }
        return;
      }

      await supabase.auth.signOut();
      setPageState('success');
    } catch {
      setError(t('resetPassword.genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl mb-4 shadow-lg">
            <i className="ri-gift-line text-3xl text-white"></i>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent">
            Card Train
          </h1>
          <p className="text-gray-600 mt-2 text-sm">{t('resetPassword.platformDesc')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Loading */}
          {pageState === 'loading' && (
            <div className="p-10 text-center">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-loader-4-line text-3xl text-rose-500 animate-spin"></i>
              </div>
              <p className="text-gray-600 text-sm">{t('resetPassword.loading')}</p>
              <p className="text-gray-400 text-xs mt-2">{t('resetPassword.pleaseWait')}</p>
            </div>
          )}

          {/* Invalid link */}
          {pageState === 'invalid' && (
            <div className="p-10 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-error-warning-line text-3xl text-red-500"></i>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{t('resetPassword.invalidTitle')}</h2>
              <p className="text-sm text-gray-500 mb-6 whitespace-pre-line">
                {invalidReason || t('resetPassword.invalidDefault')}
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-red-700 transition-all shadow-md whitespace-nowrap cursor-pointer"
              >
                {t('resetPassword.backToLogin')}
              </button>
            </div>
          )}

          {/* Set new password form */}
          {pageState === 'form' && (
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">{t('resetPassword.newPassword')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('resetPassword.newPasswordDesc')}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('resetPassword.newPasswordLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="ri-lock-line text-gray-400 text-lg"></i>
                    </div>
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-sm ${
                        newPassword && !passwordRulesPassed ? 'border-orange-300' : 'border-gray-300'
                      }`}
                      placeholder={t('resetPassword.newPasswordPlaceholder')}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    >
                      <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-gray-400 text-lg hover:text-gray-600 transition-colors`}></i>
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={newPassword} />
                </div>

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    {t('resetPassword.confirmPasswordLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="ri-lock-line text-gray-400 text-lg"></i>
                    </div>
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-sm ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-red-300'
                          : 'border-gray-300'
                      }`}
                      placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                    >
                      <i className={`${showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-gray-400 text-lg hover:text-gray-600 transition-colors`}></i>
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <i className="ri-error-warning-line"></i>
                      {t('resetPassword.mismatch')}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <i className="ri-error-warning-line text-red-500 text-lg mt-0.5"></i>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-base"></i>
                      {t('resetPassword.updating')}
                    </>
                  ) : (
                    t('resetPassword.submit')
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Success */}
          {pageState === 'success' && (
            <div className="p-10 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-shield-check-line text-3xl text-green-500"></i>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{t('resetPassword.successTitle')}</h2>
              <p className="text-sm text-gray-500 mb-6 whitespace-pre-line">
                {t('resetPassword.successDesc')}
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-red-700 transition-all shadow-md whitespace-nowrap cursor-pointer"
              >
                {t('resetPassword.goLogin')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}