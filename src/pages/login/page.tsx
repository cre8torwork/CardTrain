import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserAuth } from '../../hooks/useUserAuth';
import { supabase } from '../../lib/supabase';

// Password rules - labels resolved at render time via hook
const PASSWORD_RULE_TESTS = [
  { id: 'length', key: 'login.passwordRule.length', test: (p: string) => p.length >= 8 },
  { id: 'upper', key: 'login.passwordRule.upper', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', key: 'login.passwordRule.lower', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', key: 'login.passwordRule.number', test: (p: string) => /[0-9]/.test(p) },
];

function PasswordStrengthIndicator({ password }: { password: string }) {
  const { t } = useTranslation();
  const results = useMemo(() => PASSWORD_RULE_TESTS.map(r => ({ ...r, passed: r.test(password) })), [password]);
  const passedCount = results.filter(r => r.passed).length;
  const strengthLabel = ['', t('login.passwordStrength.weak'), t('login.passwordStrength.fair'), t('login.passwordStrength.good'), t('login.passwordStrength.strong')][passedCount] || '';
  const strengthColor = ['', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'][passedCount] || '';
  const textColor = ['', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600'][passedCount] || '';
  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= passedCount ? strengthColor : 'bg-gray-200'}`} />
          ))}
        </div>
        <span className={`text-xs font-medium ${textColor}`}>{strengthLabel}</span>
      </div>
      <ul className="space-y-1">
        {results.map(r => (
          <li key={r.id} className={`flex items-center gap-1.5 text-xs transition-colors ${r.passed ? 'text-green-600' : 'text-gray-400'}`}>
            <i className={`text-sm ${r.passed ? 'ri-checkbox-circle-fill text-green-500' : 'ri-checkbox-blank-circle-line'}`}></i>
            {t(r.key)}
          </li>
        ))}
      </ul>
    </div>
  );
}

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 分鐘
const LOCK_KEY = 'login_lock';

// ── 忘記密碼冷卻設定 ──
const FORGOT_COOLDOWN_SEC = 60; // 冷卻秒數
const FORGOT_COOLDOWN_KEY = 'forgot_pw_cooldown_until'; // localStorage key（存冷卻截止時間戳）

// ... existing code ...

interface LockData {
  attempts: number;
  lockedUntil: number | null;
}

function getLockData(email: string): LockData {
  try {
    const raw = localStorage.getItem(`${LOCK_KEY}_${email}`);
    if (!raw) return { attempts: 0, lockedUntil: null };
    return JSON.parse(raw) as LockData;
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function setLockData(email: string, data: LockData) {
  localStorage.setItem(`${LOCK_KEY}_${email}`, JSON.stringify(data));
}

function clearLockData(email: string) {
  localStorage.removeItem(`${LOCK_KEY}_${email}`);
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  function formatCountdown(ms: number): string {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min} ${t('common.minute')} ${sec.toString().padStart(2, '0')} ${t('common.second')}`;
  }

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login, register } = useUserAuth();

  // 登入表單狀態
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // 鎖定狀態
  const [remainingAttempts, setRemainingAttempts] = useState<number>(MAX_ATTEMPTS);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState('');

  // 計算當前鎖定狀態
  const refreshLockState = useCallback((email: string) => {
    if (!email) {
      setIsLocked(false);
      setRemainingAttempts(MAX_ATTEMPTS);
      return;
    }
    const data = getLockData(email);
    if (data.lockedUntil && Date.now() < data.lockedUntil) {
      setIsLocked(true);
      setRemainingAttempts(0);
    } else {
      if (data.lockedUntil && Date.now() >= data.lockedUntil) {
        // 鎖定已過期，清除
        clearLockData(email);
        setIsLocked(false);
        setRemainingAttempts(MAX_ATTEMPTS);
      } else {
        setIsLocked(false);
        setRemainingAttempts(MAX_ATTEMPTS - data.attempts);
      }
    }
  }, []);

  // 當 email 改變時重新計算鎖定狀態
  useEffect(() => {
    refreshLockState(loginEmail);
  }, [loginEmail, refreshLockState]);

  // 鎖定倒數計時
  useEffect(() => {
    if (!isLocked || !loginEmail) return;
    const tick = () => {
      const data = getLockData(loginEmail);
      if (!data.lockedUntil) return;
      const remaining = data.lockedUntil - Date.now();
      if (remaining <= 0) {
        clearLockData(loginEmail);
        setIsLocked(false);
        setRemainingAttempts(MAX_ATTEMPTS);
        setLockCountdown('');
        setLoginError('');
      } else {
        setLockCountdown(formatCountdown(remaining));
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isLocked, loginEmail]);

  // 忘記密碼狀態
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // ── 忘記密碼冷卻計時器 ──
  const [forgotCooldownSec, setForgotCooldownSec] = useState<number>(0);

  // 初始化：從 localStorage 讀取剩餘冷卻時間
  useEffect(() => {
    const raw = localStorage.getItem(FORGOT_COOLDOWN_KEY);
    if (raw) {
      const until = parseInt(raw, 10);
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining > 0) {
        setForgotCooldownSec(remaining);
      } else {
        localStorage.removeItem(FORGOT_COOLDOWN_KEY);
      }
    }
  }, []);

  // 冷卻倒數計時
  useEffect(() => {
    if (forgotCooldownSec <= 0) return;
    const timer = setInterval(() => {
      setForgotCooldownSec((prev) => {
        if (prev <= 1) {
          localStorage.removeItem(FORGOT_COOLDOWN_KEY);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [forgotCooldownSec]);

  // 啟動冷卻
  const startForgotCooldown = useCallback(() => {
    const until = Date.now() + FORGOT_COOLDOWN_SEC * 1000;
    localStorage.setItem(FORGOT_COOLDOWN_KEY, String(until));
    setForgotCooldownSec(FORGOT_COOLDOWN_SEC);
  }, []);

  // 註冊表單狀態
  const [registerDisplayName, setRegisterDisplayName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerBirthDate, setRegisterBirthDate] = useState('');
  const [registerGender, setRegisterGender] = useState('');
  const [registerFavoritePokemon, setRegisterFavoritePokemon] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [registerSuccessEmail, setRegisterSuccessEmail] = useState('');

  const passwordRulesPassed = useMemo(() => PASSWORD_RULE_TESTS.every(r => r.test(registerPassword)), [registerPassword]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // 檢查是否被鎖定
    const lockData = getLockData(loginEmail);
    if (lockData.lockedUntil && Date.now() < lockData.lockedUntil) {
      setIsLocked(true);
      return;
    }

    setLoginLoading(true);
    try {
      const trimmedEmail = loginEmail.trim();
      const result = await login(trimmedEmail, loginPassword);
      console.log('Login result:', result);
      if (result.success) {
        clearLockData(trimmedEmail);
        // 檢查是否需要 MFA 驗證
        if (result.needsMfa) {
          sessionStorage.setItem('mfa_redirect_to', '/');
          navigate('/mfa-verify');
          setLoginLoading(false);
          return;
        }
        // 重置 iOS Safari 的自動縮放，避免跳回首頁時頁面被放大
        const metaViewport = document.querySelector('meta[name="viewport"]');
        if (metaViewport) {
          metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0');
          setTimeout(() => {
            metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
          }, 300);
        }
        navigate('/');
      } else {
        console.error('Login failed:', result.error);
        // 如果是 Rate Limit 錯誤，不增加 localStorage 嘗試次數
        if (result.error === 'RATE_LIMIT') {
          setLoginError('登入太頻繁，請稍後 1 分鐘再試');
        } else {
          // 記錄失敗次數
          const current = getLockData(trimmedEmail);
          const newAttempts = current.attempts + 1;
          if (newAttempts >= MAX_ATTEMPTS) {
            const lockedUntil = Date.now() + LOCK_DURATION_MS;
            setLockData(trimmedEmail, { attempts: newAttempts, lockedUntil });
            setIsLocked(true);
            setRemainingAttempts(0);
            setLoginError(t('login.errorLock'));
          } else {
            setLockData(trimmedEmail, { attempts: newAttempts, lockedUntil: null });
            setRemainingAttempts(MAX_ATTEMPTS - newAttempts);
            setLoginError(result.error || t('login.loginFail'));
          }
        }
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotCooldownSec > 0) return;
    setForgotError('');
    setForgotLoading(true);
    try {
      // 無論電郵是否存在，都呼叫 resetPasswordForEmail
      // Supabase 只會對已存在的帳號發送郵件，但我們統一顯示相同訊息（防止帳號枚舉攻擊）
      const redirectUrl = `${window.location.origin}/reset-password`;
      await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: redirectUrl,
      });
      // 無論成功與否，一律顯示已發送（安全考量）
      setForgotSent(true);
      startForgotCooldown();
    } catch {
      // 同樣顯示已發送，不洩露錯誤細節
      setForgotSent(true);
      startForgotCooldown();
    } finally {
      setForgotLoading(false);
    }
  };

  // 重新發送（成功畫面使用）
  const handleResendForgot = async () => {
    if (forgotCooldownSec > 0) return;
    setForgotLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: redirectUrl,
      });
      startForgotCooldown();
    } catch {
      startForgotCooldown();
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    if (!passwordRulesPassed) {
      setRegisterError(t('login.passwordWeak'));
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setRegisterError(t('login.passwordMismatch'));
      return;
    }
    if (!registerGender) {
      setRegisterError(t('login.genderRequired'));
      return;
    }
    setRegisterLoading(true);
    try {
      const result = await register({
        email: registerEmail,
        password: registerPassword,
        displayName: registerDisplayName,
        birthDate: registerBirthDate,
        gender: registerGender,
        favoritePokemon: registerFavoritePokemon,
      });
      if (result.success) {
        setRegisterSuccessEmail(registerEmail);
        setRegisterSuccess(true);
      } else {
        setRegisterError(result.error || t('login.registerFail'));
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* 返回首頁 */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <i className="ri-arrow-left-line text-base"></i>
            {t('login.backToHome')}
          </button>
        </div>

        {/* Logo 區域 */}
        <div className="text-center mb-8">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 overflow-hidden shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
          >
            <img
              src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
              alt="Card Train Logo"
              className="w-full h-full object-contain"
            />
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-red-600 bg-clip-text text-transparent">
            Card Train
          </h1>
          <p className="text-gray-600 mt-2 text-sm">{t('login.platformDesc')}</p>
        </div>

        {/* 卡片 */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* ── 忘記密碼 ── */}
          {activeTab === 'forgot' && (
            <div className="p-8">
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setForgotSent(false); setForgotError(''); setForgotEmail(''); }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-600 transition-colors mb-6 cursor-pointer"
              >
                <i className="ri-arrow-left-line text-base"></i>
                {t('login.forgotBack')}
              </button>

              {forgotSent ? (
                <div className="text-center">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="ri-mail-check-line text-3xl text-green-500"></i>
                  </div>
                  <h2 className="text-lg font-bold text-gray-800 mb-2">{t('login.forgotSent')}</h2>
                  <p className="text-sm text-gray-500 mb-1">{t('login.forgotSentDesc')}</p>
                  <p className="text-xs text-gray-400 mb-6">{t('login.forgotExpire')}<br />{t('login.forgotSpam')}</p>

                  {/* 重新發送區域 */}
                  <div className="mb-4">
                    {forgotCooldownSec > 0 ? (
                      <div className="flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <i className="ri-time-line text-gray-400 text-base"></i>
                        <span className="text-sm text-gray-500">{t('login.forgotCooldown', { n: forgotCooldownSec })}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendForgot}
                        disabled={forgotLoading}
                        className="w-full py-2.5 border border-rose-300 text-rose-600 font-medium rounded-lg hover:bg-rose-50 transition-all text-sm whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {forgotLoading ? (
                          <>
                            <i className="ri-loader-4-line animate-spin text-base"></i>
                            {t('login.forgotSending')}
                          </>
                        ) : (
                          <>
                            <i className="ri-send-plane-line text-base"></i>
                            {t('login.forgotResend')}
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('login'); setForgotSent(false); setForgotEmail(''); }}
                    className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-red-700 transition-all shadow-md whitespace-nowrap cursor-pointer"
                  >
                    {t('login.forgotBack')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800">{t('login.forgotPageTitle')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('login.forgotSubtitle')}</p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div>
                      <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">{t('login.email')}</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <i className="ri-mail-line text-gray-400 text-lg"></i>
                        </div>
                        <input
                          id="forgot-email"
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-base"
                          placeholder={t('login.emailPlaceholder')}
                          required
                        />
                      </div>
                    </div>

                    {forgotError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <i className="ri-error-warning-line text-red-500 text-lg mt-0.5"></i>
                        <p className="text-sm text-red-600">{forgotError}</p>
                      </div>
                    )}

                    {/* 安全提示 */}
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <i className="ri-shield-line text-amber-500 text-lg mt-0.5 shrink-0"></i>
                      <p className="text-xs text-amber-700">{t('login.securityNote')}</p>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading || forgotCooldownSec > 0}
                      className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-base"></i>
                          {t('login.forgotSending')}
                        </>
                      ) : forgotCooldownSec > 0 ? (
                        <>
                          <i className="ri-time-line text-base"></i>
                          {t('login.forgotCooldown', { n: forgotCooldownSec })}
                        </>
                      ) : t('login.forgotSendLink')}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* ── 登入 / 註冊 Tab ── */}
          {activeTab !== 'forgot' && (
            <>
              <div className="flex border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setLoginError(''); }}
                  className={`flex-1 py-4 text-sm font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'login'
                      ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t('login.title')}
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('register'); setRegisterError(''); }}
                  className={`flex-1 py-4 text-sm font-semibold transition-all whitespace-nowrap ${
                    activeTab === 'register'
                      ? 'text-rose-600 border-b-2 border-rose-600 bg-rose-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {t('login.register')}
                </button>
              </div>

              {/* 登入表單 */}
              {activeTab === 'login' && (
                <form onSubmit={handleLogin} className="p-8">
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-2">{t('login.email')}</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <i className="ri-mail-line text-gray-400 text-lg"></i>
                        </div>
                        <input
                          id="login-email"
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-base"
                          placeholder={t('login.emailPlaceholder')}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">{t('login.password')}</label>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <i className="ri-lock-line text-gray-400 text-lg"></i>
                        </div>
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-base"
                          placeholder={t('login.passwordPlaceholder')}
                          required
                          disabled={isLocked}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
                          <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-gray-400 text-lg hover:text-gray-600 transition-colors`}></i>
                        </button>
                      </div>
                    </div>

                    {/* 密碼欄位下方：忘記密碼連結 */}
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => { setActiveTab('forgot'); setForgotEmail(loginEmail); }}
                        className="text-xs text-rose-500 hover:text-rose-700 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {t('login.forgotPasswordLink')}
                      </button>
                    </div>

                    {/* 剩餘嘗試次數提示 */}
                    {loginError && !isLocked && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <i className="ri-error-warning-line text-red-500 text-lg mt-0.5"></i>
                        <p className="text-sm text-red-600">{loginError}</p>
                      </div>
                    )}

                    {/* 剩餘嘗試次數提示（無 loginError 時才顯示） */}
                    {!isLocked && !loginError && remainingAttempts < MAX_ATTEMPTS && remainingAttempts > 0 && (
                      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <i className="ri-alert-line text-amber-500 text-lg mt-0.5 shrink-0"></i>
                        <p className="text-sm text-amber-700">{t('login.remainingAttempts', { n: remainingAttempts })}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loginLoading || isLocked}
                      className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loginLoading ? (
                        <>
                          <i className="ri-loader-4-line animate-spin text-base"></i>
                          {t('login.loggingIn')}
                        </>
                      ) : isLocked ? (
                        <>
                          <i className="ri-lock-line text-base"></i>
                          {t('login.locked')}
                        </>
                      ) : t('login.loginBtn')}
                    </button>
                  </div>
                </form>
              )}

              {/* 註冊表單 */}
              {activeTab === 'register' && (
                <>
                  {registerSuccess ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-mail-check-line text-3xl text-green-500"></i>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">{t('login.verifyTitle')}</h3>
                      <p className="text-sm text-gray-600 mb-1">{t('login.verifySentTo')}</p>
                      <p className="text-sm font-semibold text-rose-600 mb-4 break-all">{registerSuccessEmail}</p>
                      <p className="text-sm text-gray-500 mb-6">
                        {t('login.verifyInstruction')}<br />
                        {t('login.verifySpamCheck')}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setRegisterSuccess(false);
                          setActiveTab('login');
                          setLoginEmail(registerSuccessEmail);
                        }}
                        className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-red-700 transition-all shadow-md whitespace-nowrap cursor-pointer"
                      >
                        {t('login.goLogin')}
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleRegister} className="p-8">
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.displayName')}</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <i className="ri-user-line text-gray-400 text-lg"></i>
                            </div>
                            <input id="register-name" type="text" value={registerDisplayName} onChange={(e) => setRegisterDisplayName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-base" placeholder={t('login.displayNamePlaceholder')} required />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.email')}</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <i className="ri-mail-line text-gray-400 text-lg"></i>
                            </div>
                            <input id="register-email" type="email" value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-base" placeholder={t('login.emailPlaceholder')} required />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="register-birthdate" className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.birthDate')}</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <i className="ri-cake-line text-gray-400 text-lg"></i>
                            </div>
                            <input id="register-birthdate" type="date" value={registerBirthDate} onChange={(e) => setRegisterBirthDate(e.target.value)} max={new Date().toISOString().split('T')[0]} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-base" required />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.gender')}</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'male', label: t('login.gender.male'), icon: 'ri-men-line' },
                              { value: 'female', label: t('login.gender.female'), icon: 'ri-women-line' },
                              { value: 'other', label: t('login.gender.other'), icon: 'ri-user-line' },
                            ].map((opt) => (
                              <button key={opt.value} type="button" onClick={() => setRegisterGender(opt.value)} className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${registerGender === opt.value ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-gray-300 text-gray-600 hover:border-rose-300 hover:bg-rose-50/50'}`}>
                                <i className={`${opt.icon} text-base`}></i>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label htmlFor="register-pokemon" className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.favoriteCard')}</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <i className="ri-star-smile-line text-gray-400 text-lg"></i>
                            </div>
                            <input id="register-pokemon" type="text" value={registerFavoritePokemon} onChange={(e) => setRegisterFavoritePokemon(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-base" placeholder={t('login.favoriteCardPlaceholder')} required />
                          </div>
                        </div>
                        <div>
                          <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.password')}</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <i className="ri-lock-line text-gray-400 text-lg"></i>
                            </div>
                            <input id="register-password" type={showPassword ? 'text' : 'password'} value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} className={`w-full pl-10 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-base ${registerPassword && !passwordRulesPassed ? 'border-orange-300' : 'border-gray-300'}`} placeholder={t('login.passwordPlaceholder')} required />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
                              <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-gray-400 text-lg hover:text-gray-600 transition-colors`}></i>
                            </button>
                          </div>
                          <PasswordStrengthIndicator password={registerPassword} />
                        </div>
                        <div>
                          <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.confirmPassword')}</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <i className="ri-lock-line text-gray-400 text-lg"></i>
                            </div>
                            <input id="register-confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={registerConfirmPassword} onChange={(e) => setRegisterConfirmPassword(e.target.value)} className={`w-full pl-10 pr-12 py-2.5 border rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all text-base ${registerConfirmPassword && registerConfirmPassword !== registerPassword ? 'border-red-300' : 'border-gray-300'}`} placeholder={t('login.confirmPasswordPlaceholder')} required />
                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
                              <i className={`${showConfirmPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-gray-400 text-lg hover:text-gray-600 transition-colors`}></i>
                            </button>
                          </div>
                          {registerConfirmPassword && registerConfirmPassword !== registerPassword && (
                            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                              <i className="ri-error-warning-line"></i>
                              {t('login.passwordMismatch')}
                            </p>
                          )}
                        </div>
                        {registerError && (
                          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <i className="ri-error-warning-line text-red-500 text-lg mt-0.5"></i>
                            <p className="text-sm text-red-600">{registerError}</p>
                          </div>
                        )}
                        <button type="submit" disabled={registerLoading} className="w-full py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold rounded-lg hover:from-rose-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                          {registerLoading ? (
                            <>
                              <i className="ri-loader-4-line animate-spin text-base"></i>
                              {t('login.registering')}
                            </>
                          ) : t('login.registerBtn')}
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          {t('login.termsAgree')}
        </p>
      </div>
    </div>
  );
}
