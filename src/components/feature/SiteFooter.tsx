import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserAuth } from '../../hooks/useUserAuth';
import { useNavigate, useLocation } from 'react-router-dom';

export default function SiteFooter() {
  const { isLoggedIn } = useUserAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const handleFaqClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (location.pathname === '/guide') {
      const el = document.getElementById('faq');
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 140;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    } else {
      navigate('/guide');
      setTimeout(() => {
        const el = document.getElementById('faq');
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 140;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }, 400);
    }
  };

  return (
    <footer className="bg-rose-50 text-gray-700 py-12 border-t border-rose-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-rose-100 flex items-center justify-center">
                <img
                  src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
                  alt="Card Train Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 leading-tight">Card Train</p>
                <p className="text-xs text-rose-500 leading-tight">火車卡</p>
              </div>
            </div>
            <p className="text-gray-500 text-sm">{t('footer.tagline')}</p>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-gray-900">{t('footer.service')}</h4>
            <ul className="space-y-2 text-gray-500">
              <li><Link to="/products" className="hover:text-rose-500 transition-colors">{t('footer.service.list')}</Link></li>
              <li><Link to="/shop" className="hover:text-rose-500 transition-colors">{t('footer.service.shop')}</Link></li>
              <li><Link to="/buy-points" className="hover:text-rose-500 transition-colors">{t('footer.service.points')}</Link></li>
              <li><Link to={isLoggedIn ? '/user' : '/login'} className="hover:text-rose-500 transition-colors">{t('footer.service.history')}</Link></li>
              <li><Link to="/guide" className="hover:text-rose-500 transition-colors">{t('footer.service.guide')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-gray-900">{t('footer.support')}</h4>
            <ul className="space-y-2 text-gray-500">
              <li>
                <a href="/guide#faq" onClick={handleFaqClick} className="hover:text-rose-500 transition-colors cursor-pointer">
                  {t('footer.support.faq')}
                </a>
              </li>
              <li><Link to="/contact" className="hover:text-rose-500 transition-colors">{t('footer.support.contact')}</Link></li>
              <li><Link to="/terms" className="hover:text-rose-500 transition-colors">{t('footer.support.terms')}</Link></li>
              <li><Link to="/privacy" className="hover:text-rose-500 transition-colors">{t('footer.support.privacy')}</Link></li>
              <li><Link to="/shipping-policy" className="hover:text-rose-500 transition-colors">{t('footer.support.shipping')}</Link></li>
              <li><Link to="/refund-policy" className="hover:text-rose-500 transition-colors">{t('footer.support.refund')}</Link></li>
            </ul>
          </div>

          {/* Follow */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-gray-900">{t('footer.follow')}</h4>
            <div className="flex space-x-3">
              <a
                href="https://www.instagram.com/card.train/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-rose-100 hover:bg-rose-200 rounded-lg flex items-center justify-center transition-colors text-rose-500"
              >
                <i className="ri-instagram-fill text-xl"></i>
              </a>
              <a
                href="https://www.youtube.com/@CardTrain"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-rose-100 hover:bg-rose-200 rounded-lg flex items-center justify-center transition-colors text-rose-500"
              >
                <i className="ri-youtube-fill text-xl"></i>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-rose-200 pt-8 flex flex-col md:flex-row items-center justify-between">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">{t('footer.copyright')}</p>
          <a
            href="https://readdy.ai/?ref=logo"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-rose-500 text-sm transition-colors"
          >
            {t('footer.poweredBy')}
          </a>
        </div>
      </div>
    </footer>
  );
}