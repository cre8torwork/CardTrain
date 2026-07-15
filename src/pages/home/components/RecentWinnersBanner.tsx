import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import { mockLeaderboardRecords } from '../../../mocks/leaderboard';

const RARITY_STYLES: Record<string, { text: string; bg: string; icon: string; border: string; glow: string }> = {
  SS: { text: 'text-rose-600',   bg: 'bg-rose-100',   icon: 'ri-vip-crown-fill',  border: 'border-rose-300',   glow: 'shadow-rose-200' },
  S:  { text: 'text-orange-500', bg: 'bg-orange-100', icon: 'ri-fire-fill',        border: 'border-orange-300', glow: 'shadow-orange-200' },
  A:  { text: 'text-violet-600', bg: 'bg-violet-100', icon: 'ri-star-fill',        border: 'border-violet-300', glow: 'shadow-violet-200' },
};

const DISPLAY_RARITIES = new Set(['SS', 'S', 'A']);

// ── 記憶體快取（模組層級單例，頁面切換不會消失）──
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 分鐘
interface WinnersCache {
  data: WinnerEntry[];
  fetchedAt: number;
}
let winnersCache: WinnersCache | null = null;

/** 供抽獎成功後主動清除快取，讓下次進首頁能拿到最新資料 */
export function invalidateWinnersCache() {
  winnersCache = null;
}

function getAvatarColor(name: string): string {
  const colors = [
    'from-rose-400 to-pink-500',
    'from-orange-400 to-amber-500',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-cyan-500',
    'from-violet-400 to-purple-500',
    'from-fuchsia-400 to-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

interface WinnerEntry {
  id: string;
  userName: string;
  productName: string;
  prizeName: string;
  rarity: string;
  drawnAt: string;
}

export default function RecentWinnersBanner() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [records, setRecords] = useState<WinnerEntry[]>([]);
  const [, setTicker] = useState(0);

  const timeAgo = (dateStr: string): string => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return t('draw.winners.secAgo', { n: diff });
    if (diff < 3600) return t('draw.winners.minAgo', { n: Math.floor(diff / 60) });
    if (diff < 86400) return t('draw.winners.hourAgo', { n: Math.floor(diff / 3600) });
    return t('draw.winners.dayAgo', { n: Math.floor(diff / 86400) });
  };

  useEffect(() => {
    loadWinners();
  }, []);

  const loadWinners = async () => {
    // 快取命中：距上次 fetch 未超過 TTL，直接用快取資料
    if (winnersCache && Date.now() - winnersCache.fetchedAt < CACHE_TTL_MS) {
      setRecords(winnersCache.data);
      return;
    }

    try {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('draw_records')
        .select(`
          id,
          product_name,
          prize_name,
          rarity,
          drawn_at,
          users (
            display_name
          )
        `)
        .eq('is_win', true)
        .in('rarity', Array.from(DISPLAY_RARITIES))
        .gte('drawn_at', twelveHoursAgo)
        .order('drawn_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedRecords: WinnerEntry[] = (data || []).map((record: any) => ({
        id: record.id,
        userName: record.users?.display_name || t('draw.winners.unknown'),
        productName: record.product_name,
        prizeName: record.prize_name,
        rarity: record.rarity,
        drawnAt: record.drawn_at,
      }));

      // 寫入快取
      winnersCache = { data: formattedRecords, fetchedAt: Date.now() };
      setRecords(formattedRecords);
    } catch (error) {
      console.warn('Failed to load winner records, using fallback:', error);
      // fetch 失敗時使用 mock 資料作為備用
      const fallbackRecords: WinnerEntry[] = mockLeaderboardRecords.map((r) => ({
        id: r.id,
        userName: r.userName,
        productName: r.productName,
        prizeName: r.prizeName,
        rarity: r.rarity,
        drawnAt: r.drawnAt,
      }));
      // 若仍有舊快取則優先沿用，否則用 mock 資料
      if (winnersCache) {
        setRecords(winnersCache.data);
      } else {
        setRecords(fallbackRecords);
      }
    }
  };

  useEffect(() => {
    if (records.length === 0) return;
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % records.length);
        setAnimating(false);
      }, 400);
    }, 4000);
    return () => clearInterval(interval);
  }, [records.length]);

  useEffect(() => {
    const tick = setInterval(() => setTicker(n => n + 1), 30000);
    return () => clearInterval(tick);
  }, []);

  if (!records.length) return null;

  const rec = records[currentIndex];
  const style = RARITY_STYLES[rec.rarity] ?? RARITY_STYLES['SSR'];
  const avatarGradient = getAvatarColor(rec.userName);

  return (
    <div className="bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3">

          {/* 左側標籤 */}
          <div className="flex items-center gap-1.5 flex-shrink-0 bg-white/20 backdrop-blur-sm text-white px-2.5 py-1 rounded-full border border-white/30">
            <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse flex-shrink-0"></span>
            <span className="text-xs font-bold whitespace-nowrap">{t('draw.winners.realtime')}</span>
          </div>

          {/* 動態內容 */}
          <div
            className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0"
            style={{
              opacity: animating ? 0 : 1,
              transform: animating ? 'translateY(-8px)' : 'translateY(0)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}
          >
            {/* 頭像 */}
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 shadow-md ring-2 ring-white/50`}>
              <span className="text-white text-xs font-bold">{rec.userName.charAt(0)}</span>
            </div>

            {/* 文字區塊 — 手機版分兩行 */}
            <div className="flex-1 min-w-0">
              {/* 第一行：用戶名 + 商品名 */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className="font-bold text-white text-sm leading-tight">{rec.userName}</span>
                <span className="text-white/70 text-xs">{t('draw.winners.in')}</span>
                <span className="text-white/90 text-xs font-medium truncate max-w-[100px] sm:max-w-none">{rec.productName}</span>
                <span className="text-white/70 text-xs">{t('draw.winners.drew')}</span>
              </div>
              {/* 第二行：獎品名稱 + 稀有度 */}
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${style.bg} ${style.text} ${style.border} shadow-sm`}>
                  <i className={`${style.icon} text-xs`}></i>
                  <span>{rec.rarity}</span>
                </div>
                <span className={`font-bold text-sm text-white drop-shadow`}>{rec.prizeName}</span>
                <span className="text-white/60 text-xs hidden sm:inline">{timeAgo(rec.drawnAt)}</span>
              </div>
            </div>

            {/* 時間（手機版隱藏，已在第二行顯示） */}
            <span className="text-white/70 text-xs flex-shrink-0 whitespace-nowrap hidden md:block">
              {timeAgo(rec.drawnAt)}
            </span>
          </div>

          {/* 進度點 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {Array.from({ length: Math.min(records.length, 6) }).map((_, i) => (
              <span
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === currentIndex % Math.min(records.length, 6)
                    ? 'w-4 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}