import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserAuth } from '../../hooks/useUserAuth';
import { useIdleTimer } from '../../hooks/useIdleTimer';

interface SiteHeaderProps {
  activePage?: 'home' | 'products' | 'guide' | 'user' | 'contact' | 'terms' | 'privacy' | 'shop' | 'buyPoints';
}

const LANGUAGES = [
  { code: 'zh-TW', label: '繁體中文', shortLabel: '繁' },
  { code: 'zh-CN', label: '简体中文', shortLabel: '简' },
  { code: 'ja', label: '日本語', shortLabel: '日' },
  { code: 'en', label: 'English', shortLabel: 'EN' },
];

export default function SiteHeader({ activePage }: SiteHeaderProps) {
  const { isLoggedIn, currentUser, logout } = useUserAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setLangMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const handleLogout = useCallback(async () => {
    await logout();
    closeMobileMenu();
    navigate('/');
  }, [logout, navigate]);

  const handleIdleLogout = useCallback(async () => {
    await logout();
    navigate('/login?reason=idle');
  }, [logout, navigate]);

  const { resetTimer } = useIdleTimer({
    enabled: isLoggedIn,
    onIdle: handleIdleLogout,
  });

  void resetTimer;

  return (
    <>
      <header className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3" onClick={closeMobileMenu}>
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                <img
                  src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
                  alt="Card Train Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg font-bold whitespace-nowrap">Card Train</span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className={`transition-colors whitespace-nowrap ${activePage === 'home' ? 'font-bold border-b-2 border-white pb-0.5' : 'hover:text-rose-100'}`}>
                {t('nav.home')}
              </Link>
              <Link to="/products" className={`transition-colors whitespace-nowrap ${activePage === 'products' ? 'font-bold border-b-2 border-white pb-0.5' : 'hover:text-rose-100'}`}>
                {t('nav.list')}
              </Link>
              <Link to="/shop" className={`transition-colors whitespace-nowrap ${activePage === 'shop' ? 'font-bold border-b-2 border-white pb-0.5' : 'hover:text-rose-100'}`}>
                {t('nav.shop')}
              </Link>
              <Link to="/buy-points" className={`transition-colors whitespace-nowrap ${activePage === 'buyPoints' ? 'font-bold border-b-2 border-white pb-0.5' : 'hover:text-rose-100'}`}>
                {t('nav.buyPoints')}
              </Link>
              <Link to={isLoggedIn ? '/user' : '/login'} className={`transition-colors whitespace-nowrap ${activePage === 'user' ? 'font-bold border-b-2 border-white pb-0.5' : 'hover:text-rose-100'}`}>
                {t('nav.history')}
              </Link>
            </nav>

            {/* Right: Language + Auth */}
            <div className="flex items-center space-x-2">
              {/* Language Switcher */}
              <div className="relative hidden md:block">
                <button
                  onClick={() => setLangMenuOpen(!langMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-global-line text-base"></i>
                  <span>{currentLang.shortLabel}</span>
                  <i className={`ri-arrow-down-s-line text-sm transition-transform duration-200 ${langMenuOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {langMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl z-50 overflow-hidden border border-gray-100" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors cursor-pointer whitespace-nowrap ${
                            i18n.language === lang.code
                              ? 'bg-rose-50 text-rose-600 font-semibold'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {i18n.language === lang.code && <i className="ri-check-line text-rose-500 text-sm"></i>}
                          {i18n.language !== lang.code && <span className="w-4 inline-block"></span>}
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Auth Buttons */}
              {isLoggedIn ? (
                <div className="hidden md:flex items-center gap-2">
                  <Link
                    to="/user"
                    className="flex items-center gap-2 px-4 py-2 bg-white text-rose-500 rounded-lg font-semibold hover:bg-rose-50 transition-colors whitespace-nowrap"
                  >
                    <i className="ri-user-line"></i>
                    {currentUser?.displayName || t('nav.mypage')}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-logout-box-r-line"></i>
                    {t('nav.logout')}
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:flex items-center gap-2 px-6 py-2 bg-white text-rose-500 rounded-lg font-semibold hover:bg-rose-50 transition-colors whitespace-nowrap"
                >
                  <i className="ri-login-box-line"></i>
                  {t('nav.login')}
                </Link>
              )}

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                aria-label="Open menu"
              >
                <i className={`text-2xl transition-all duration-200 ${mobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'}`}></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={closeMobileMenu} />
      )}

      {/* Mobile Slide Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Menu Top */}
        <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-white flex items-center justify-center">
              <img
                src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
                alt="Card Train Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-base font-bold text-white whitespace-nowrap">Card Train</span>
          </div>
          <button
            onClick={closeMobileMenu}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-white"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Language Switcher (Mobile) */}
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1">
            <i className="ri-global-line"></i>
            {t('lang.switch')}
          </p>
          <div className="flex gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  i18n.language === lang.code
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {lang.shortLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Auth Block */}
        <div className="px-5 py-4 border-b border-gray-100">
          {isLoggedIn ? (
            <div className="flex flex-col gap-2">
              <Link
                to="/user"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 p-3 bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-rose-400 to-pink-500 rounded-full text-white">
                  <i className="ri-user-line text-lg"></i>
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{currentUser?.displayName || t('nav.mypage')}</p>
                  <p className="text-xs text-gray-500">{t('nav.mypage')}</p>
                </div>
                <i className="ri-arrow-right-s-line text-gray-400 ml-auto"></i>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-logout-box-r-line"></i>
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={closeMobileMenu}
              className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold hover:from-rose-600 hover:to-pink-600 transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-login-box-line"></i>
              {t('nav.login')} / {t('nav.register')}
            </Link>
          )}
        </div>

        {/* Nav Links */}
        <nav className="px-4 py-3 flex flex-col gap-1">
          {[
            { to: '/', icon: 'ri-home-4-line', label: t('nav.home'), page: 'home', color: 'bg-rose-100 text-rose-500' },
            { to: '/products', icon: 'ri-gift-2-line', label: t('nav.list'), page: 'products', color: 'bg-pink-100 text-pink-500' },
            { to: '/shop', icon: 'ri-store-2-line', label: t('nav.shop'), page: 'shop', color: 'bg-orange-100 text-orange-500' },
            { to: '/buy-points', icon: 'ri-coin-line', label: t('nav.buyPoints'), page: 'buyPoints', color: 'bg-amber-100 text-amber-500' },
            { to: isLoggedIn ? '/user' : '/login', icon: 'ri-history-line', label: t('nav.history'), page: 'user', color: 'bg-purple-100 text-purple-500' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer ${
                activePage === item.page ? 'bg-rose-50 text-rose-600 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${item.color}`}>
                <i className={item.icon}></i>
              </div>
              <span>{item.label}</span>
              {activePage === item.page && <i className="ri-checkbox-blank-circle-fill text-rose-400 text-xs ml-auto"></i>}
            </Link>
          ))}
        </nav>

        {/* Bottom Social */}
        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 mb-3 text-center">{t('footer.follow')}</p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://www.instagram.com/card.train/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
            >
              <i className="ri-instagram-line text-base"></i>
              Instagram
            </a>
            <a
              href="https://www.youtube.com/@CardTrain"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
            >
              <i className="ri-youtube-line text-base"></i>
              YouTube
            </a>
          </div>
        </div>
      </div>
    </>
  );
}