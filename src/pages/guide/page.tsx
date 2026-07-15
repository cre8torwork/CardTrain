import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserAuth } from '../../hooks/useUserAuth';
import SiteHeader from '../../components/feature/SiteHeader';
import SiteFooter from '../../components/feature/SiteFooter';
import { MEMBER_LEVELS } from '../../hooks/useMemberLevel';

const SECTION_IDS = [
  { id: 'intro', labelKey: 'guide.intro', icon: 'ri-information-line' },
  { id: 'points', labelKey: 'guide.points', icon: 'ri-coin-line' },
  { id: 'how-to-draw', labelKey: 'guide.howToDraw', icon: 'ri-gift-line' },
  { id: 'board-type', labelKey: 'guide.boardType', icon: 'ri-eye-line' },
  { id: 'rarity', labelKey: 'guide.rarity', icon: 'ri-star-line' },
  { id: 'prize', labelKey: 'guide.prize', icon: 'ri-trophy-line' },
  { id: 'card-exchange', labelKey: 'guide.cardExchange', icon: 'ri-exchange-line' },
  { id: 'member-level', labelKey: 'guide.memberLevel', icon: 'ri-vip-crown-line' },
  { id: 'faq', labelKey: 'guide.faq', icon: 'ri-question-line' },
];

const LEVEL_CARD_STYLES: Record<string, {
  bg: string;
  nameColor: string;
  subColor: string;
  discountColor: string;
  border: string;
  icon: string;
  iconColor: string;
  badge: string;
}> = {
  BEGINNER: {
    bg: 'bg-white',
    border: 'border border-gray-200',
    nameColor: 'text-gray-700',
    subColor: 'text-gray-400',
    discountColor: 'text-gray-400',
    icon: 'ri-seedling-line',
    iconColor: 'text-gray-400',
    badge: 'bg-gray-100 text-gray-500',
  },
  STANDARD: {
    bg: '',
    border: 'border-0',
    nameColor: 'text-white',
    subColor: 'text-sky-100',
    discountColor: 'text-white',
    icon: 'ri-user-star-line',
    iconColor: 'text-white',
    badge: 'bg-sky-500 text-white',
  },
  ADVANCE: {
    bg: '',
    border: 'border-0',
    nameColor: 'text-white',
    subColor: 'text-emerald-100',
    discountColor: 'text-white',
    icon: 'ri-shield-star-line',
    iconColor: 'text-white',
    badge: 'bg-emerald-500 text-white',
  },
  EXPERT: {
    bg: '',
    border: 'border-0',
    nameColor: 'text-white',
    subColor: 'text-violet-200',
    discountColor: 'text-violet-100',
    icon: 'ri-medal-2-line',
    iconColor: 'text-white',
    badge: 'bg-violet-600 text-white',
  },
  PREMIUM: {
    bg: '',
    border: 'border-0',
    nameColor: 'text-white',
    subColor: 'text-yellow-200',
    discountColor: 'text-yellow-100',
    icon: 'ri-vip-diamond-line',
    iconColor: 'text-yellow-200',
    badge: 'bg-amber-500 text-white',
  },
  MASTER: {
    bg: '',
    border: 'border-0',
    nameColor: 'text-white',
    subColor: 'text-violet-300',
    discountColor: 'text-yellow-200',
    icon: 'ri-trophy-fill',
    iconColor: 'text-yellow-300',
    badge: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
  },
  LEGEND: {
    bg: '',
    border: 'border-0',
    nameColor: 'text-white',
    subColor: 'text-pink-200',
    discountColor: 'text-yellow-200',
    icon: 'ri-sparkling-2-fill',
    iconColor: 'text-yellow-300',
    badge: 'bg-gradient-to-r from-pink-500 to-violet-500 text-white',
  },
};

const LEVEL_BG_STYLES: Record<string, string> = {
  BEGINNER: '',
  STANDARD: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
  ADVANCE: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)',
  EXPERT: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #4c1d95 100%)',
  PREMIUM: 'linear-gradient(135deg, #f59e0b 0%, #d97706 40%, #b45309 100%)',
  MASTER: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
  LEGEND: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
};

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '新手訓練家',
  STANDARD: '標準訓練家',
  ADVANCE: '進階訓練家',
  EXPERT: '專家訓練家',
  PREMIUM: '尊貴訓練家',
  MASTER: '大師訓練家',
  LEGEND: '傳說訓練家',
};

export default function GuidePage() {
  const { isLoggedIn } = useUserAuth();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState('intro');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const sections = SECTION_IDS.map(s => ({ ...s, label: t(s.labelKey) }));

  const rarities = [
    { label: 'SS', color: 'from-rose-500 via-pink-500 to-purple-500', text: 'text-white', desc: t('rarity.desc.SS') },
    { label: 'S',  color: 'from-orange-400 to-amber-400',             text: 'text-white', desc: t('rarity.desc.S') },
    { label: 'A',  color: 'from-violet-500 to-purple-500',            text: 'text-white', desc: t('rarity.desc.A') },
    { label: 'B',  color: 'from-sky-400 to-blue-400',                 text: 'text-white', desc: t('rarity.desc.B') },
    { label: 'C',  color: 'from-gray-300 to-gray-400',                text: 'text-gray-700', desc: t('rarity.desc.C') },
  ];

  const faqs = [
    { q: t('guide.faq.q1'), a: t('guide.faq.a1') },
    { q: t('guide.faq.q2'), a: t('guide.faq.a2') },
    { q: t('guide.faq.q3'), a: t('guide.faq.a3') },
    { q: t('guide.faq.q4'), a: t('guide.faq.a4') },
    { q: t('guide.faq.q5'), a: t('guide.faq.a5') },
    { q: t('guide.faq.q6'), a: t('guide.faq.a6') },
    { q: t('guide.faq.q7'), a: t('guide.faq.a7') },
    { q: t('guide.faq.q8'), a: t('guide.faq.a8') },
  ];

  const scrollTo = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      const offset = 140;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader activePage="guide" />

      {/* Hero */}
      <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-12 border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
            <i className="ri-book-open-line text-3xl text-white"></i>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{t('guide.title')}</h1>
          <p className="text-lg text-gray-500">{t('guide.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-28 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-rose-500 to-pink-500">
                <p className="text-white font-bold text-sm">{t('guide.toc')}</p>
              </div>
              <nav className="p-2">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollTo(s.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap mb-0.5 ${
                      activeSection === s.id
                        ? 'bg-rose-50 text-rose-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="w-5 h-5 flex items-center justify-center">
                      <i className={`${s.icon} text-base`}></i>
                    </div>
                    {s.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0 space-y-12">

            {/* 平台介紹 */}
            <section id="intro" data-section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center bg-rose-100 rounded-xl">
                  <i className="ri-information-line text-rose-500 text-xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('guide.intro.title')}</h2>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-8 border border-rose-100">
                <p className="text-gray-700 text-base leading-relaxed mb-4">
                  {t('guide.intro.p1')}
                </p>
                <p className="text-gray-700 text-base leading-relaxed mb-4">
                  {t('guide.intro.p2')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  {[
                    { icon: 'ri-shield-check-fill', color: 'text-emerald-500', title: t('guide.intro.authentic'), desc: t('guide.intro.authenticDesc') },
                    { icon: 'ri-truck-fill', color: 'text-sky-500', title: t('guide.intro.fastShip'), desc: t('guide.intro.fastShipDesc') },
                    { icon: 'ri-customer-service-2-fill', color: 'text-rose-500', title: t('guide.intro.service'), desc: t('guide.intro.serviceDesc') },
                  ].map((item) => (
                    <div key={item.title} className="bg-white rounded-xl p-5 shadow-sm border border-white">
                      <div className="w-10 h-10 flex items-center justify-center mb-3">
                        <i className={`${item.icon} text-2xl ${item.color}`}></i>
                      </div>
                      <p className="font-bold text-gray-900 mb-1">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 點數說明 */}
            <section id="points">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center bg-amber-100 rounded-xl">
                  <i className="ri-coin-line text-amber-500 text-xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('guide.points.title')}</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
                  <p className="text-gray-700 leading-relaxed">
                    {t('guide.points.p1')}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: 'ri-bank-card-line', color: 'bg-rose-100 text-rose-500', title: t('guide.points.buy'), desc: t('guide.points.buyDesc') },
                    { icon: 'ri-exchange-line', color: 'bg-orange-100 text-orange-500', title: t('guide.points.redeem'), desc: t('guide.points.redeemDesc') },
                    { icon: 'ri-gift-2-line', color: 'bg-emerald-100 text-emerald-500', title: t('guide.points.event'), desc: t('guide.points.eventDesc') },
                    { icon: 'ri-vip-crown-line', color: 'bg-purple-100 text-purple-500', title: t('guide.points.reward'), desc: t('guide.points.rewardDesc') },
                  ].map((item) => (
                    <div key={item.title} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm flex gap-4">
                      <div className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg ${item.color}`}>
                        <i className={`${item.icon} text-xl`}></i>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 mb-1">{item.title}</p>
                        <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3">
                  <i className="ri-error-warning-line text-rose-500 text-xl flex-shrink-0 mt-0.5"></i>
                  <p className="text-sm text-rose-700">{t('guide.points.notice')}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <i className="ri-time-line text-amber-500 text-xl flex-shrink-0 mt-0.5"></i>
                  <p className="text-sm text-amber-700">{t('guide.points.validity')}</p>
                </div>
              </div>
            </section>

            {/* 如何抽獎 */}
            <section id="how-to-draw">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center bg-pink-100 rounded-xl">
                  <i className="ri-gift-line text-pink-500 text-xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('guide.howToDraw.title')}</h2>
              </div>
              <div className="space-y-4">
                {[
                  { step: '01', title: t('guide.howToDraw.step1'), desc: t('guide.howToDraw.step1Desc'), icon: 'ri-user-line', color: 'from-rose-400 to-pink-400' },
                  { step: '02', title: t('guide.howToDraw.step2'), desc: t('guide.howToDraw.step2Desc'), icon: 'ri-coin-line', color: 'from-amber-400 to-orange-400' },
                  { step: '03', title: t('guide.howToDraw.step3'), desc: t('guide.howToDraw.step3Desc'), icon: 'ri-store-2-line', color: 'from-emerald-400 to-teal-400' },
                  { step: '04', title: t('guide.howToDraw.step4'), desc: t('guide.howToDraw.step4Desc'), icon: 'ri-numbers-line', color: 'from-sky-400 to-blue-400' },
                  { step: '05', title: t('guide.howToDraw.step5'), desc: t('guide.howToDraw.step5Desc'), icon: 'ri-movie-line', color: 'from-violet-400 to-purple-400' },
                  { step: '06', title: t('guide.howToDraw.step6'), desc: t('guide.howToDraw.step6Desc'), icon: 'ri-trophy-line', color: 'from-rose-400 to-red-400' },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-5 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-14 h-14 flex-shrink-0 rounded-2xl bg-gradient-to-br ${item.color} flex flex-col items-center justify-center shadow-md`}>
                      <span className="text-white text-xs font-bold leading-none">STEP</span>
                      <span className="text-white text-lg font-black leading-none">{item.step}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`${item.icon} text-gray-400`}></i>
                        <p className="font-bold text-gray-900">{item.title}</p>
                      </div>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 明盤 / 暗盤 */}
            <section id="board-type">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center bg-teal-100 rounded-xl">
                  <i className="ri-eye-line text-teal-500 text-xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('guide.board.title')}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-emerald-500 rounded-xl">
                      <i className="ri-eye-line text-white text-xl"></i>
                    </div>
                    <div>
                      <p className="font-bold text-emerald-800 text-lg">{t('guide.board.open.title')}</p>
                      <span className="text-xs bg-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{t('guide.board.open.subtitle')}</span>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-emerald-800 mb-5">
                    <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 flex-shrink-0"></i>{t('guide.board.open.desc1')}</li>
                    <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 flex-shrink-0"></i>{t('guide.board.open.desc2')}</li>
                    <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 flex-shrink-0"></i>{t('guide.board.open.desc3')}</li>
                    <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 flex-shrink-0"></i>{t('guide.board.open.desc4')}</li>
                  </ul>

                  {/* 具體操作說明 */}
                  <div className="bg-white border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <i className="ri-cursor-line"></i>
                      {t('guide.board.open.stepTitle')}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-emerald-500 text-white text-xs font-bold rounded-full">1</div>
                        <p className="text-sm text-gray-700 leading-relaxed">{t('guide.board.open.step1')}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-emerald-500 text-white text-xs font-bold rounded-full">2</div>
                        <p className="text-sm text-gray-700 leading-relaxed">{t('guide.board.open.step2')}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-emerald-500 text-white text-xs font-bold rounded-full">3</div>
                        <p className="text-sm text-gray-700 leading-relaxed">{t('guide.board.open.step3')}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2">
                      <i className="ri-lightbulb-line text-emerald-500 text-sm flex-shrink-0"></i>
                      <p className="text-xs text-emerald-700">{t('guide.board.open.tipFull')}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-gray-700 rounded-xl">
                      <i className="ri-eye-off-line text-white text-xl"></i>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-lg">{t('guide.board.closed.title')}</p>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold">{t('guide.board.closed.subtitle')}</span>
                    </div>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 flex-shrink-0"></i>{t('guide.board.closed.desc1')}</li>
                    <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 flex-shrink-0"></i>{t('guide.board.closed.desc2')}</li>
                    <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 flex-shrink-0"></i>{t('guide.board.closed.desc3')}</li>
                    <li className="flex items-start gap-2"><i className="ri-check-line mt-0.5 flex-shrink-0"></i>{t('guide.board.closed.desc4')}</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 稀有度說明 */}
            <section id="rarity">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center bg-yellow-100 rounded-xl">
                  <i className="ri-star-line text-yellow-500 text-xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('guide.rarity.title')}</h2>
              </div>
              <div className="space-y-3">
                {rarities.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-14 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-gradient-to-r ${r.color}`}>
                      <span className={`text-xs font-black tracking-wider ${r.text}`}>{r.label}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{r.desc}</p>
                    </div>
                    {idx === 0 && (
                      <span className="text-xs bg-rose-100 text-rose-600 px-2 py-1 rounded-full font-semibold whitespace-nowrap">{t('guide.rarity.highest')}</span>
                    )}
                    {idx === rarities.length - 1 && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-semibold whitespace-nowrap">{t('guide.rarity.redeemable')}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
                <i className="ri-lightbulb-line text-yellow-500 text-xl flex-shrink-0 mt-0.5"></i>
                <p className="text-sm text-yellow-800">{t('guide.rarity.tipFull')}</p>
              </div>
            </section>

            {/* 獎品獲取 */}
            <section id="prize">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center bg-rose-100 rounded-xl">
                  <i className="ri-trophy-line text-rose-500 text-xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('guide.prize.title')}</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="ri-map-pin-line text-rose-500"></i>
                    {t('guide.prize.address')}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">
                    {t('guide.prize.address.desc')}
                  </p>
                  <div className="bg-rose-50 rounded-lg p-3 text-sm text-rose-700 flex gap-2">
                    <i className="ri-error-warning-line flex-shrink-0 mt-0.5"></i>
                    <span>{t('guide.prize.address.warn')}</span>
                  </div>
                </div>

                {/* 運費說明卡片 */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="ri-coin-line text-amber-500"></i>
                    {t('guide.prize.fee.title')}
                    <span className="ml-2 px-2.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full border border-amber-300">{t('guide.prize.fee.important')}</span>
                  </h3>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 flex-shrink-0 flex flex-col items-center justify-center bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl shadow-md">
                      <i className="ri-coin-fill text-white text-2xl"></i>
                    </div>
                    <div>
                      <p className="text-lg font-black text-amber-800 mb-1">{t('guide.prize.fee.each')}</p>
                      <p className="text-sm text-amber-700 leading-relaxed">
                        {t('guide.prize.fee.eachDesc')}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {[
                      { icon: 'ri-checkbox-multiple-line', color: 'bg-amber-100 text-amber-600', title: t('guide.prize.fee.batch'), desc: t('guide.prize.fee.batchDesc') },
                      { icon: 'ri-wallet-3-line', color: 'bg-orange-100 text-orange-600', title: t('guide.prize.fee.points'), desc: t('guide.prize.fee.pointsDesc') },
                    ].map((item) => (
                      <div key={item.title} className="bg-white rounded-xl p-4 border border-amber-100 flex gap-3">
                        <div className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg ${item.color}`}>
                          <i className={`${item.icon} text-lg`}></i>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm mb-1">{item.title}</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white border border-amber-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <i className="ri-list-check-2"></i>
                      {t('guide.prize.fee.steps')}
                    </p>
                    <div className="space-y-2.5">
                      {[
                        { step: '1', text: t('guide.prize.fee.step1') },
                        { step: '2', text: t('guide.prize.fee.step2') },
                        { step: '3', text: t('guide.prize.fee.step3') },
                        { step: '4', text: t('guide.prize.fee.step4') },
                        { step: '5', text: t('guide.prize.fee.step5') },
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-3">
                          <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-amber-400 text-white text-xs font-bold rounded-full">{item.step}</div>
                          <p className="text-xs text-gray-700 leading-relaxed">{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 bg-amber-100 rounded-lg px-3 py-2.5">
                    <i className="ri-lightbulb-flash-line text-amber-600 text-sm flex-shrink-0"></i>
                    <p className="text-xs text-amber-800"><strong>{t('guide.prize.fee.hint')}：</strong>{t('guide.prize.fee.hintDesc')}</p>
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="ri-truck-line text-sky-500"></i>
                    {t('guide.prize.shipping.title')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { icon: 'ri-check-double-line', color: 'text-emerald-500', title: t('guide.prize.shipping.confirm'), desc: t('guide.prize.shipping.pack') },
                      { icon: 'ri-box-3-line', color: 'text-amber-500', title: t('guide.prize.shipping.pack'), desc: t('guide.prize.shipping.packDesc') },
                      { icon: 'ri-home-4-line', color: 'text-rose-500', title: t('guide.prize.shipping.deliver'), desc: t('guide.prize.shipping.deliverDesc') },
                    ].map((item) => (
                      <div key={item.title} className="text-center p-4 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 flex items-center justify-center mx-auto mb-2">
                          <i className={`${item.icon} text-2xl ${item.color}`}></i>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm mb-1">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="ri-history-line text-purple-500"></i>
                    {t('guide.prize.history.title')}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {t('guide.prize.historyDesc')}
                  </p>
                </div>
              </div>
            </section>

            {/* 裸卡換分 */}
            <section id="card-exchange">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center bg-orange-100 rounded-xl">
                  <i className="ri-exchange-line text-orange-500 text-xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('guide.exchange.title')}</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 flex items-center justify-center bg-orange-500 rounded-xl shadow-md">
                      <i className="ri-poker-clubs-line text-white text-2xl"></i>
                    </div>
                    <div>
                      <p className="font-bold text-orange-900 text-lg">{t('guide.exchange.perCard')}</p>
                      <p className="text-sm text-orange-700">{t('guide.exchange.pokemonLabel')}</p>
                    </div>
                  </div>
                  <p className="text-sm text-orange-800 leading-relaxed">
                    {t('guide.exchange.desc')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: 'ri-hand-coin-line', color: 'bg-rose-100 text-rose-500', title: t('guide.exchange.single'), desc: t('guide.exchange.singleDesc') },
                    { icon: 'ri-checkbox-multiple-line', color: 'bg-amber-100 text-amber-500', title: t('guide.exchange.multi'), desc: t('guide.exchange.multiDesc') },
                    { icon: 'ri-stack-line', color: 'bg-emerald-100 text-emerald-500', title: t('guide.exchange.all'), desc: t('guide.exchange.allDesc') },
                  ].map((item) => (
                    <div key={item.title} className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                      <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${item.color} mb-3`}>
                        <i className={`${item.icon} text-xl`}></i>
                      </div>
                      <p className="font-bold text-gray-900 mb-2">{item.title}</p>
                      <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3">
                  <i className="ri-information-line text-gray-500 text-xl flex-shrink-0 mt-0.5"></i>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• {t('guide.exchange.irreversible')}</p>
                    <p>• {t('guide.exchange.marked')}</p>
                    <p>• {t('guide.exchange.pokemonOnly')}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 會員等級 ── */}
            <section id="member-level">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center bg-amber-100 rounded-xl">
                  <i className="ri-vip-crown-line text-amber-500 text-xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('guide.member.title')}</h2>
              </div>

              <div className="space-y-6">
                {/* 說明卡片 */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl shadow-md">
                      <i className="ri-vip-crown-fill text-white text-2xl"></i>
                    </div>
                    <div>
                      <p className="font-bold text-amber-900 text-lg mb-1">{t('guide.member.what')}</p>
                      <p className="text-sm text-amber-800 leading-relaxed">
                        {t('guide.member.whatDesc')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: 'ri-calendar-check-line', color: 'bg-amber-100 text-amber-600', title: t('guide.member.calcPeriod'), desc: t('guide.member.calcPeriodDesc') },
                      { icon: 'ri-refresh-line', color: 'bg-orange-100 text-orange-600', title: t('guide.member.dynamic'), desc: t('guide.member.dynamicDesc') },
                      { icon: 'ri-percent-line', color: 'bg-rose-100 text-rose-600', title: t('guide.member.discount'), desc: t('guide.member.discountDesc') },
                    ].map((item) => (
                      <div key={item.title} className="bg-white rounded-xl p-3 border border-amber-100 flex gap-2.5">
                        <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg ${item.color}`}>
                          <i className={`${item.icon} text-base`}></i>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-xs mb-0.5">{item.title}</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 等級卡片列表 */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                    <i className="ri-list-check text-gray-400"></i>
                    {t('guide.member.levelList')}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {MEMBER_LEVELS.map((level, idx) => {
                      const s = LEVEL_CARD_STYLES[level.name];
                      const bgStyle = LEVEL_BG_STYLES[level.name];
                      const isColored = level.name !== 'BEGINNER';
                      const isLast = idx === MEMBER_LEVELS.length - 1;
                      return (
                        <div
                          key={level.name}
                          className={`relative rounded-xl overflow-hidden ${s.border} shadow-sm flex items-center gap-3 px-4 py-3 ${s.bg}`}
                          style={isColored ? { background: bgStyle } : {}}
                        >
                          {/* Legend 頂部彩虹線 */}
                          {level.name === 'LEGEND' && (
                            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #ec4899, #fbbf24, #8b5cf6, #06b6d4, #fbbf24, #ec4899)' }} />
                          )}
                          {/* 圖標 */}
                          <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center ${
                            isColored ? 'bg-white/20 border border-white/30' : 'bg-gray-100 border border-gray-200'
                          }`}>
                            <i className={`${s.icon} text-lg ${s.iconColor}`}></i>
                          </div>
                          {/* 名稱 + 副標 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-black tracking-wider ${s.nameColor}`}
                                style={level.name === 'LEGEND' ? {
                                  background: 'linear-gradient(90deg, #fbbf24, #ec4899, #8b5cf6, #fbbf24)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  backgroundSize: '200% auto',
                                } : {}}
                              >{level.name}</span>
                              {isLast && <i className="ri-sparkling-2-fill text-yellow-400 text-xs animate-pulse"></i>}
                            </div>
                            <p className={`text-xs ${s.subColor}`}>{t('member.' + level.name.toLowerCase())}</p>
                            <p className={`text-xs mt-0.5 ${s.subColor} opacity-80`}>
                              {level.requiredPoints === 0 ? t('guide.member.startLevel') : t('guide.member.required', { points: level.requiredPoints.toLocaleString() })}
                            </p>
                          </div>
                          {/* 折扣徽章 */}
                          <div className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-center ${
                            isColored ? 'bg-white/20' : 'bg-gray-100'
                          }`}>
                            {level.discount > 0 ? (
                              <>
                                <p className={`text-sm font-black leading-none ${s.discountColor}`}>-{level.discount}%</p>
                                <p className={`text-xs leading-none mt-0.5 ${s.subColor}`}>{t('member.discount')}</p>
                              </>
                            ) : (
                              <>
                                <p className={`text-sm font-bold leading-none ${s.discountColor}`}>—</p>
                                <p className={`text-xs leading-none mt-0.5 ${s.subColor}`}>{t('member.discount')}</p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 注意事項 */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-3">
                  <i className="ri-information-line text-gray-500 text-xl flex-shrink-0 mt-0.5"></i>
                  <div className="text-sm text-gray-600 space-y-1.5">
                    <p>• {t('guide.member.notice.p1')}</p>
                    <p>• {t('guide.member.notice.p2')}</p>
                    <p>• {t('guide.member.notice.p3')}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 常見問題 */}
            <section id="faq">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 flex items-center justify-center bg-violet-100 rounded-xl">
                  <i className="ri-question-line text-violet-500 text-xl"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('guide.faq.title')}</h2>
              </div>
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-semibold text-gray-900 pr-4">{faq.q}</span>
                      <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                        <i className={`ri-arrow-down-s-line text-gray-400 text-xl transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`}></i>
                      </div>
                    </button>
                    {openFaq === idx && (
                      <div className="px-6 pb-5 border-t border-gray-50">
                        <p className="text-sm text-gray-600 leading-relaxed pt-4">{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="mt-8 bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-8 text-center text-white">
                <i className="ri-customer-service-2-line text-4xl mb-3 block"></i>
                <h3 className="text-xl font-bold mb-2">{t('guide.cta.title')}</h3>
                <p className="text-rose-100 mb-5 text-sm">{t('guide.cta.desc')}</p>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <Link
                    to="/"
                    className="px-6 py-2.5 bg-white text-rose-500 rounded-lg font-semibold hover:bg-rose-50 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-home-line mr-2"></i>
                    {t('guide.cta.home')}
                  </Link>
                  <Link
                    to={isLoggedIn ? '/user' : '/login'}
                    className="px-6 py-2.5 bg-white/20 text-white border border-white/40 rounded-lg font-semibold hover:bg-white/30 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-user-line mr-2"></i>
                    {t('guide.cta.user')}
                  </Link>
                </div>
              </div>
            </section>

          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
