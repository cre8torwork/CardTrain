import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DrawRecord } from '../../../hooks/useDrawHistory';
import { Rarity } from '../../../hooks/useProductStore';
import { useUserAuth } from '../../../hooks/useUserAuth';
import { usePointsStore } from '../../../hooks/usePointsStore';
import { useDrawHistory } from '../../../hooks/useDrawHistory';
import RedeemConfirmModal from '../../../components/feature/RedeemConfirmModal';
import { SafeHtml } from '../../../components/base/SafeHtml';

interface Props {
  records: DrawRecord[];
  onClose: () => void;
  onDrawAgain: (count: 1 | 5) => void;
  onViewRecords: () => void;
  remainingSlots?: number;
}

interface FlipCardProps {
  record: DrawRecord;
  delay: number;
  index: number;
}

const RARITY_CONFIG: Record<Rarity, {
  borderClass: string;
  glowClass: string;
  labelBg: string;
  labelText: string;
  hasStarBurst: boolean;
  hasRainbowEffect: boolean;
  hasShake: boolean;
  outerGlowStyle?: React.CSSProperties;
  cornerAccentClass?: string;
}> = {
  SS: { borderClass: 'border-transparent', glowClass: 'shadow-2xl', labelBg: 'bg-gradient-to-r from-purple-200 via-pink-200 to-rose-200', labelText: 'text-purple-700', hasStarBurst: true, hasRainbowEffect: true, hasShake: true, outerGlowStyle: { boxShadow: '0 0 0 3px transparent, 0 0 20px 4px rgba(244,63,94,0.5), 0 0 40px 8px rgba(168,85,247,0.3)' }, cornerAccentClass: 'from-rose-400 via-purple-400 to-pink-400' },
  S:  { borderClass: 'border-yellow-400', glowClass: 'shadow-2xl shadow-yellow-300', labelBg: 'bg-gradient-to-r from-yellow-100 to-orange-100', labelText: 'text-yellow-700', hasStarBurst: true, hasRainbowEffect: false, hasShake: false, outerGlowStyle: { boxShadow: '0 0 0 3px #facc15, 0 0 16px 4px rgba(250,204,21,0.5), 0 0 32px 8px rgba(251,146,60,0.25)' }, cornerAccentClass: 'from-yellow-400 via-orange-400 to-amber-400' },
  A:  { borderClass: 'border-purple-400', glowClass: 'shadow-xl shadow-purple-300', labelBg: 'bg-gradient-to-r from-purple-100 to-pink-100', labelText: 'text-purple-600', hasStarBurst: false, hasRainbowEffect: false, hasShake: false, outerGlowStyle: { boxShadow: '0 0 0 2px #c084fc, 0 0 12px 3px rgba(192,132,252,0.45), 0 0 24px 6px rgba(236,72,153,0.2)' }, cornerAccentClass: 'from-purple-400 via-pink-400 to-fuchsia-400' },
  B:  { borderClass: 'border-sky-400', glowClass: 'shadow-lg shadow-sky-200', labelBg: 'bg-gradient-to-r from-sky-100 to-cyan-100', labelText: 'text-sky-600', hasStarBurst: false, hasRainbowEffect: false, hasShake: false, outerGlowStyle: { boxShadow: '0 0 0 2px #38bdf8, 0 0 10px 3px rgba(56,189,248,0.4), 0 0 20px 5px rgba(34,211,238,0.2)' }, cornerAccentClass: 'from-sky-400 via-cyan-400 to-blue-400' },
  C:  { borderClass: 'border-emerald-400', glowClass: 'shadow-lg shadow-emerald-200', labelBg: 'bg-gradient-to-r from-emerald-100 to-teal-100', labelText: 'text-emerald-600', hasStarBurst: false, hasRainbowEffect: false, hasShake: false, outerGlowStyle: { boxShadow: '0 0 0 2px #34d399, 0 0 8px 2px rgba(52,211,153,0.35), 0 0 16px 4px rgba(20,184,166,0.15)' }, cornerAccentClass: 'from-emerald-400 via-teal-400 to-green-400' },
};

// 市場價換積分比例：1元 = 1CTP
const MARKET_PRICE_TO_POINTS_RATIO = 1;

function FlipCard({ record, delay, index }: FlipCardProps) {
  const { t } = useTranslation();
  const [flipped, setFlipped] = useState(false);
  const rarity = record.rarity || 'C';
  const config = RARITY_CONFIG[rarity];

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const isWin = record.isWin;

  return (
    <div className="relative" style={{ perspective: 600 }}>
      {/* 外框光暈層（翻牌後才顯示） */}
      {isWin && flipped && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none z-10"
          style={{
            ...(config.hasRainbowEffect
              ? { animation: 'rainbowGlow 3s linear infinite', borderRadius: 12 }
              : { ...config.outerGlowStyle, borderRadius: 12 }),
          }}
        />
      )}

      <div
        style={{
          transition: 'transform 0.6s cubic-bezier(0.4,0,0.2,1)',
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          position: 'relative',
          width: '100%',
          paddingBottom: '150%',
        }}
      >
        {/* 正面（未翻） */}
        <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
          <div className="w-full h-full bg-gradient-to-br from-rose-400 via-pink-500 to-purple-500 flex flex-col items-center justify-center gap-2">
            <i className="ri-question-mark text-white" style={{ fontSize: 32 }}></i>
            <span className="text-white text-xs font-bold opacity-80">#{index + 1}</span>
          </div>
        </div>

        {/* 背面（翻開後） */}
        <div
          className={`absolute inset-0 rounded-xl overflow-hidden ${isWin ? 'border-2' : 'border border-gray-200'} ${isWin && !config.hasRainbowEffect ? config.borderClass : ''}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            ...(isWin && config.hasRainbowEffect
              ? { border: '2px solid transparent', backgroundClip: 'padding-box' }
              : {}),
          }}
        >
          {/* 彩虹外框（SS） */}
          {isWin && config.hasRainbowEffect && (
            <div
              className="absolute inset-0 rounded-xl pointer-events-none z-20"
              style={{ padding: 2, background: 'linear-gradient(135deg, #f43f5e, #ec4899, #a855f7, #3b82f6, #10b981, #f59e0b)', animation: 'rainbowBorder 3s linear infinite' }}
            />
          )}

          <div className="w-full h-full bg-gray-50 relative">
            <img
              src={isWin ? record.prizeImage : 'https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/5250fa4331b28dcfbabf0d582e3bf142.png'}
              alt={isWin ? record.prizeName : t('share.randomNaked')}
              className="w-full h-full object-cover"
            />
            {/* 中獎光效疊層 */}
            {isWin && (
              <div className="absolute inset-0 pointer-events-none">
                <div className={`absolute inset-0 bg-gradient-to-t ${config.hasRainbowEffect ? 'from-purple-400/20 via-transparent to-rose-400/10' : 'from-black/10 to-transparent'}`} />
              </div>
            )}
          </div>

          {/* 稀有度角標 */}
          {isWin && (
            <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-md text-xs font-bold shadow-md ${config.labelBg} ${config.labelText}`} style={{ fontSize: 9 }}>
              {rarity}
            </div>
          )}

          {/* 角落裝飾光點（S/SS） */}
          {isWin && config.hasStarBurst && (
            <>
              <div className={`absolute top-0 left-0 w-3 h-3 rounded-br-lg bg-gradient-to-br ${config.cornerAccentClass} opacity-80`} />
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-tl-lg bg-gradient-to-tl ${config.cornerAccentClass} opacity-80`} />
            </>
          )}
        </div>
      </div>

      {/* 稀有度標籤 */}
      <div className={`mt-1.5 px-1 py-1 text-center text-xs font-bold rounded-lg ${isWin ? config.labelBg : 'bg-gray-100'} ${isWin ? config.labelText : 'text-gray-400'}`}>
        {isWin ? (
          <span className="flex items-center justify-center gap-0.5">
            <i className="ri-trophy-fill text-yellow-500" style={{ fontSize: 10 }}></i>
            <span style={{ fontSize: 10 }}>{rarity}</span>
          </span>
        ) : (
          <span style={{ fontSize: 10 }}>{t('share.nakedCard')}</span>
        )}
      </div>
    </div>
  );
}

// ── 市場價換積分確認彈窗 ──────────────────────────────────────────────
interface MarketPriceRedeemModalProps {
  record: DrawRecord;
  onConfirm: () => void;
  onCancel: () => void;
}

function MarketPriceRedeemModal({ record, onConfirm, onCancel, t }: MarketPriceRedeemModalProps & { t: (key: string, opts?: Record<string, unknown>) => string }) {
  const marketValue = record.marketValue || 0;
  const pointsToGet = Math.floor(marketValue * MARKET_PRICE_TO_POINTS_RATIO);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
        style={{ animation: 'modalSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-amber-100 rounded-lg">
              <i className="ri-exchange-funds-line text-amber-600 text-lg"></i>
            </div>
            <span className="font-bold text-gray-900 text-base">{t('draw.result.marketRedeemTitle')}</span>
          </div>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer transition-colors">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="mb-4 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-amber-200">
            <div className="flex items-center gap-3 mb-3">
              <img
                src={record.prizeImage}
                alt={record.prizeName}
                className="w-16 h-16 object-cover rounded-lg border-2 border-amber-300 shadow-md"
              />
              <div className="flex-1">
                <p className="font-bold text-gray-900 text-sm mb-1">{record.prizeName}</p>
                <p className="text-xs text-gray-500">{record.productName}</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-amber-200">
              <span className="text-xs text-gray-600">{t('draw.result.marketPrice')}</span>
              <span className="text-lg font-bold text-amber-600">HK$ {marketValue.toLocaleString()}</span>
            </div>
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 flex items-center justify-center bg-sky-100 rounded-lg">
                <i className="ri-information-line text-sky-600 text-sm"></i>
              </div>
              <span className="text-xs font-bold text-gray-700">{t('draw.result.marketRedeemRules')}</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              <SafeHtml html={t('draw.result.marketRedeemRulesDesc', { ratio: MARKET_PRICE_TO_POINTS_RATIO })} />
            </p>
          </div>

          <div className="mb-5 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">{t('draw.result.marketRedeemYouGet')}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-emerald-600">{pointsToGet.toLocaleString()}</span>
                <span className="text-sm text-emerald-500 font-semibold">CTP</span>
              </div>
            </div>
          </div>

          <div className="mb-5 p-3 bg-orange-50 rounded-xl border border-orange-200 flex items-start gap-2">
            <div className="w-5 h-5 flex items-center justify-center bg-orange-100 rounded-lg flex-shrink-0 mt-0.5">
              <i className="ri-alert-line text-orange-600 text-xs"></i>
            </div>
            <p className="text-xs text-orange-700 leading-relaxed">
              <SafeHtml html={t('draw.result.marketRedeemNote')} />
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer text-sm"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md whitespace-nowrap cursor-pointer text-sm"
            >
              <i className="ri-check-line mr-1"></i>{t('draw.result.marketRedeemConfirm')}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── 分享面板 ──────────────────────────────────────────────
interface SharePanelProps {
  records: DrawRecord[];
  onClose: () => void;
}

function SharePanel({ records, onClose, t }: SharePanelProps & { t: (key: string, opts?: Record<string, unknown>) => string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [imgDataUrl, setImgDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [igHint, setIgHint] = useState(false);

  const winRecords = records.filter(r => r.isWin);
  const isSingleShare = records.length === 1;

  const topRarity = winRecords.length > 0
    ? winRecords.reduce<Rarity>((b, r) => {
        const o: Rarity[] = ['C', 'B', 'A', 'S', 'SS'];
        return o.indexOf(r.rarity) > o.indexOf(b) ? r.rarity : b;
      }, 'C')
    : 'C';

  const shareText = winRecords.length > 0
    ? isSingleShare
      ? t('share.socialSingle', { rarity: winRecords[0].rarity, prize: winRecords[0].prizeName || winRecords[0].result })
      : t('share.socialMulti', { count: winRecords.length, rarity: topRarity })
    : t('share.socialNone');

  // 用純 Canvas API 繪製分享卡片，完全不依賴 DOM 截圖
  const generateImage = useCallback(async (): Promise<string | null> => {
    try {
      const W = 960, H = isSingleShare ? 560 : 800;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 圓角矩形 helper
      const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      // 載入圖片 helper（帶 CORS）
      const loadImg = (src: string): Promise<HTMLImageElement> =>
        new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => {
            // 失敗時用空白圖
            const fallback = new Image();
            resolve(fallback);
          };
          img.src = src;
        });

      // 漸層背景
      const GRADIENTS: Record<Rarity, [string, string]> = {
        SS: ['#a855f7', '#f43f5e'],
        S:  ['#f59e0b', '#f97316'],
        A:  ['#8b5cf6', '#ec4899'],
        B:  ['#0ea5e9', '#06b6d4'],
        C:  ['#10b981', '#14b8a6'],
      };
      const [c1, c2] = winRecords.length > 0 ? GRADIENTS[topRarity] : ['#f43f5e', '#a855f7'];
      const grad = ctx.createLinearGradient(0, 0, W, 200);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);

      // 白色背景
      ctx.fillStyle = '#ffffff';
      roundRect(0, 0, W, H, 24);
      ctx.fill();

      // 頂部 banner
      ctx.fillStyle = grad;
      ctx.beginPath();
      roundRect(0, 0, W, 180, 24);
      ctx.fill();
      // 底部兩角補方形
      ctx.fillRect(0, 156, W, 24);

      // Banner 文字
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (let i = 0; i < 20; i++) {
        for (let j = 0; j < 10; j++) {
          ctx.beginPath();
          ctx.arc(i * 52 + 10, j * 20 + 10, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      const titleText = winRecords.length > 0
        ? isSingleShare ? t('share.wonRarity', { rarity: topRarity }) : t('share.wonXTimes', { n: winRecords.length })
        : isSingleShare ? t('share.drawResult') : t('share.fiveResult');
      ctx.fillText(titleText, W / 2, 90);

      ctx.font = '20px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const subText = records[0]?.productName || t('share.cardTrain');
      ctx.fillText(subText, W / 2, 128);

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText(t('share.cardTrain'), W / 2, 158);

      // 內容區
      if (isSingleShare) {
        const rec = records[0];
        // 左側圖片
        const imgSrc = rec.isWin ? rec.prizeImage : 'https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/5250fa4331b28dcfbabf0d582e3bf142.png';
        const prizeImg = await loadImg(imgSrc);
        const imgX = 60, imgY = 210, imgW = 220, imgH = 300;
        ctx.save();
        roundRect(imgX, imgY, imgW, imgH, 16);
        ctx.clip();
        if (prizeImg.width > 0) {
          ctx.drawImage(prizeImg, imgX, imgY, imgW, imgH);
        } else {
          ctx.fillStyle = '#f3f4f6';
          ctx.fillRect(imgX, imgY, imgW, imgH);
        }
        ctx.restore();
        // 圖片邊框
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 2;
        roundRect(imgX, imgY, imgW, imgH, 16);
        ctx.stroke();

        // 右側文字
        const tx = 340;
        if (rec.isWin) {
          // 稀有度 badge
          const BADGE_COLORS: Record<Rarity, string> = { SS: '#a855f7', S: '#f59e0b', A: '#8b5cf6', B: '#0ea5e9', C: '#10b981' };
          ctx.fillStyle = BADGE_COLORS[rec.rarity] || '#6b7280';
          roundRect(tx, 220, 80, 32, 16);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`★ ${rec.rarity}`, tx + 16, 241);

          ctx.fillStyle = '#111827';
          ctx.font = 'bold 28px sans-serif';
          const prizeName = rec.prizeName || rec.result || '';
          // 自動換行
          const maxW = W - tx - 60;
          const words = prizeName.split('');
          let line = '', lineY = 290;
          for (const ch of words) {
            const test = line + ch;
            if (ctx.measureText(test).width > maxW && line) {
              ctx.fillText(line, tx, lineY);
              line = ch;
              lineY += 38;
            } else {
              line = test;
            }
          }
          ctx.fillText(line, tx, lineY);

          if (rec.marketValue && rec.marketValue > 0) {
            ctx.fillStyle = '#d97706';
            ctx.font = 'bold 24px sans-serif';
            ctx.fillText(`HK$ ${rec.marketValue.toLocaleString()}`, tx, lineY + 50);
            ctx.fillStyle = '#9ca3af';
            ctx.font = '16px sans-serif';
            ctx.fillText(t('share.marketPriceLabel'), tx, lineY + 76);
          }
        } else {
          ctx.fillStyle = '#4f46e5';
          roundRect(tx, 220, 100, 32, 16);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(t('share.consolation'), tx + 16, 241);
          ctx.fillStyle = '#374151';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText(t('share.randomNaked'), tx, 300);
          ctx.fillStyle = '#6b7280';
          ctx.font = '16px sans-serif';
          ctx.fillText(t('share.keepGoing'), tx, 340);
        }
      } else {
        // 5連抽：卡片網格
        const cardW = 140, cardH = 190, gap = 20;
        const totalW = 5 * cardW + 4 * gap;
        const startX = (W - totalW) / 2;
        const startY = 200;

        for (let i = 0; i < records.length; i++) {
          const rec = records[i];
          const cx = startX + i * (cardW + gap);
          const cy = startY;
          const imgSrc = rec.isWin ? rec.prizeImage : 'https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/5250fa4331b28dcfbabf0d582e3bf142.png';
          const prizeImg = await loadImg(imgSrc);

          ctx.save();
          roundRect(cx, cy, cardW, cardH, 10);
          ctx.clip();
          if (prizeImg.width > 0) {
            ctx.drawImage(prizeImg, cx, cy, cardW, cardH);
          } else {
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(cx, cy, cardW, cardH);
          }
          ctx.restore();

          ctx.strokeStyle = rec.isWin ? (GRADIENTS[rec.rarity]?.[0] || '#e5e7eb') : '#e5e7eb';
          ctx.lineWidth = rec.isWin ? 3 : 1.5;
          roundRect(cx, cy, cardW, cardH, 10);
          ctx.stroke();

          // 稀有度標籤
          const BADGE_COLORS: Record<Rarity, string> = { SS: '#a855f7', S: '#f59e0b', A: '#8b5cf6', B: '#0ea5e9', C: '#10b981' };
          ctx.fillStyle = rec.isWin ? (BADGE_COLORS[rec.rarity] || '#6b7280') : '#6b7280';
          roundRect(cx + 4, cy + cardH - 28, cardW - 8, 22, 6);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 13px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(rec.isWin ? rec.rarity : t('share.nakedCard'), cx + cardW / 2, cy + cardH - 12);
        }

        // 中獎獎品列表
        if (winRecords.length > 0) {
          const listY = startY + cardH + 40;
          ctx.fillStyle = '#fffbeb';
          roundRect(60, listY, W - 120, winRecords.length * 36 + 50, 14);
          ctx.fill();
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 2;
          roundRect(60, listY, W - 120, winRecords.length * 36 + 50, 14);
          ctx.stroke();

          ctx.fillStyle = '#d97706';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(t('share.wonPrizes'), 84, listY + 30);

          winRecords.forEach((r, idx) => {
            const BADGE_COLORS: Record<Rarity, string> = { SS: '#a855f7', S: '#f59e0b', A: '#8b5cf6', B: '#0ea5e9', C: '#10b981' };
            ctx.fillStyle = '#374151';
            ctx.font = '16px sans-serif';
            ctx.fillText(`• ${r.prizeName || r.result}`, 84, listY + 58 + idx * 36);
            ctx.fillStyle = BADGE_COLORS[r.rarity] || '#6b7280';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(r.rarity, 84 + ctx.measureText(`• ${r.prizeName || r.result}`).width + 10, listY + 58 + idx * 36);
          });
        }
      }

      // 底部浮水印
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, H - 48, W, 48);
      ctx.strokeStyle = '#f3f4f6';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H - 48);
      ctx.lineTo(W, H - 48);
      ctx.stroke();

      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(new Date().toLocaleDateString(t('share.dateLocale'), { year: 'numeric', month: 'long', day: 'numeric' }), 24, H - 18);
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('cardtrain.com', W - 24, H - 18);

      return canvas.toDataURL('image/png');
    } catch (err) {
      console.warn('Canvas draw error:', err);
      return null;
    }
  }, [records, isSingleShare, winRecords, topRarity, t]);

  // 生成截圖
  useEffect(() => {
    setStatus('loading');
    generateImage().then(url => {
      if (url) { setImgDataUrl(url); setStatus('done'); }
      else setStatus('error');
    }).catch(() => setStatus('error'));
  }, [generateImage]);

  const handleDownload = async () => {
    const url = imgDataUrl || await generateImage();
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `cardtrain_result_${Date.now()}.png`;
    a.click();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShareLine = () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareWhatsApp = async () => {
    const url = imgDataUrl || await generateImage();
    if (url && typeof navigator !== 'undefined' && navigator.share) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], 'cardtrain_result.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ text: shareText, files: [file] });
          return;
        }
      } catch {
        // fallback
      }
    }
    const text = encodeURIComponent(`${shareText}\n\n${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareInstagram = async () => {
    const url = imgDataUrl || await generateImage();
    if (url && typeof navigator !== 'undefined' && navigator.share) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const file = new File([blob], 'cardtrain_result.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ text: shareText, files: [file] });
          return;
        }
      } catch {
        // fallback
      }
    }
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `cardtrain_result_${Date.now()}.png`;
      a.click();
    }
    try { await navigator.clipboard.writeText(shareText); } catch { /* ignore */ }
    setIgHint(true);
    setTimeout(() => setIgHint(false), 4000);
    setTimeout(() => { window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer'); }, 300);
  };

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      if (imgDataUrl) {
        const res = await fetch(imgDataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'cardtrain_result.png', { type: 'image/png' });
        await navigator.share({ title: t('share.nativeTitle'), text: shareText, files: [file] });
      } else {
        await navigator.share({ title: t('share.nativeTitle'), text: shareText, url: window.location.href });
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
        style={{ animation: 'modalSlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center bg-rose-50 rounded-lg">
              <i className="ri-share-line text-rose-500"></i>
            </div>
            <span className="font-bold text-gray-900 text-base">{t('draw.result.shareTitle')}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer transition-colors">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">{t('draw.result.sharePreview')}</p>
            <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center min-h-[120px]">
              {status === 'loading' && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="w-6 h-6 border-2 border-rose-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-gray-400">{t('draw.result.shareGenerating')}</span>
                </div>
              )}
              {status === 'done' && imgDataUrl && (
                <img src={imgDataUrl} alt={t('share.imagePreviewAlt')} className="w-full rounded-xl" />
              )}
              {status === 'error' && (
                <div className="text-xs text-gray-400 py-6 text-center">
                  <i className="ri-image-line text-2xl block mb-1"></i>
                  {t('draw.result.shareFailed')}
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 font-medium">{t('draw.result.shareText')}</p>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 leading-relaxed border border-gray-100">
              {shareText}
            </div>
          </div>

          {igHint && (
            <div className="mb-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 flex items-center gap-2" style={{ animation: 'fadeInUp 0.3s both' }}>
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                <i className="ri-information-line text-pink-500 text-sm"></i>
              </div>
              <p className="text-xs text-pink-700 font-medium">{t('draw.result.shareIgHint')}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-md whitespace-nowrap cursor-pointer"
            >
              <i className="ri-download-2-line"></i>{t('draw.result.shareDownload')}
            </button>
            <button
              onClick={handleCopyText}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap cursor-pointer border-2 ${copied ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
            >
              <i className={copied ? 'ri-check-line' : 'ri-file-copy-line'}></i>
              {copied ? t('draw.result.shareCopied') : t('draw.result.shareCopy')}
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <button onClick={handleShareLine} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-[#06C755]/10 hover:bg-[#06C755]/20 text-[#06C755] font-bold text-xs transition-all cursor-pointer whitespace-nowrap">
              <div className="w-8 h-8 flex items-center justify-center bg-[#06C755] rounded-lg"><i className="ri-line-fill text-white text-lg"></i></div>
              LINE
            </button>
            <button onClick={handleShareTwitter} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-gray-900/5 hover:bg-gray-900/10 text-gray-900 font-bold text-xs transition-all cursor-pointer whitespace-nowrap">
              <div className="w-8 h-8 flex items-center justify-center bg-gray-900 rounded-lg"><i className="ri-twitter-x-fill text-white text-lg"></i></div>
              X
            </button>
            <button onClick={handleShareFacebook} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] font-bold text-xs transition-all cursor-pointer whitespace-nowrap">
              <div className="w-8 h-8 flex items-center justify-center bg-[#1877F2] rounded-lg"><i className="ri-facebook-fill text-white text-lg"></i></div>
              Facebook
            </button>
            <button onClick={handleShareInstagram} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold text-xs transition-all cursor-pointer whitespace-nowrap">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}><i className="ri-instagram-fill text-white text-lg"></i></div>
              IG
            </button>
            <button onClick={handleShareWhatsApp} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] font-bold text-xs transition-all cursor-pointer whitespace-nowrap">
              <div className="w-8 h-8 flex items-center justify-center bg-[#25D366] rounded-lg"><i className="ri-whatsapp-fill text-white text-lg"></i></div>
              WA
            </button>
          </div>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 font-semibold text-sm transition-all cursor-pointer whitespace-nowrap"
            >
              <i className="ri-share-forward-line"></i>{t('draw.result.shareMore')}
            </button>
          )}
        </div>

      </div>

      <style>{`
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── 主元件 ────────────────────────────────────────────────
export default function DrawResultModal({ records, onClose, onDrawAgain, onViewRecords, remainingSlots = 0 }: Props) {
  const { t } = useTranslation();
  const isSingle = records.length === 1;
  const record = records[0];
  const [revealed, setRevealed] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // 防重複點擊：再抽按鈕 loading 鎖
  const [drawAgainLoading, setDrawAgainLoading] = useState<false | 1 | 5>(false);

  // 福袋剩餘口數不足5時，禁用5連抽按鈕
  const canFiveDrawAgain = remainingSlots >= 5;

  const handleDrawAgainClick = (count: 1 | 5) => {
    if (drawAgainLoading !== false) return;
    if (count === 5 && !canFiveDrawAgain) return;
    setDrawAgainLoading(count);
    onDrawAgain(count);
  };

  // 換分相關（裸卡）
  const { currentUser } = useUserAuth();
  const { redeemCardsForPoints } = usePointsStore();
  const [redeemedIds, setRedeemedIds] = useState<Set<string>>(new Set());
  const [redeemTarget, setRedeemTarget] = useState<DrawRecord[] | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);

  // 市場價換積分相關
  const [marketPriceRedeemTarget, setMarketPriceRedeemTarget] = useState<DrawRecord | null>(null);
  const [marketPriceRedeemLoading, setMarketPriceRedeemLoading] = useState(false);

  const POINTS_PER_CARD = 5;

  const handleRedeemConfirm = async (ids: string[]) => {
    if (!currentUser || redeemLoading) return;
    const toRedeem = records.filter(r => ids.includes(r.id) && !r.isWin && !redeemedIds.has(r.id));
    if (toRedeem.length === 0) return;
    setRedeemLoading(true);
    try {
      const result = await redeemCardsForPoints(currentUser.id, toRedeem.map(r => r.id));
      if (!result.success) {
        console.error('兌換失敗:', result.error);
        return;
      }
      setRedeemedIds(prev => {
        const next = new Set(prev);
        ids.forEach(id => next.add(id));
        return next;
      });
    } finally {
      setRedeemLoading(false);
      setRedeemTarget(null);
    }
  };

  const handleMarketPriceRedeemConfirm = async () => {
    if (!currentUser || !marketPriceRedeemTarget || marketPriceRedeemLoading) return;
    setMarketPriceRedeemLoading(true);
    try {
      const result = await redeemCardsForPoints(currentUser.id, [marketPriceRedeemTarget.id]);
      if (!result.success) {
        console.error('市場價兌換失敗:', result.error);
        return;
      }
      setRedeemedIds(prev => {
        const next = new Set(prev);
        next.add(marketPriceRedeemTarget.id);
        return next;
      });
    } finally {
      setMarketPriceRedeemLoading(false);
      setMarketPriceRedeemTarget(null);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 300);
    return () => clearTimeout(t);
  }, []);

  // ── 再抽按鈕（共用） ──
  const renderDrawAgainButtons = () => (
    <div className="flex gap-2">
      <button
        onClick={() => handleDrawAgainClick(1)}
        disabled={drawAgainLoading !== false}
        className={`flex-1 py-2.5 rounded-xl font-bold transition-all shadow-md whitespace-nowrap text-sm ${
          drawAgainLoading === 1
            ? 'bg-rose-300 text-white cursor-not-allowed'
            : drawAgainLoading !== false
            ? 'bg-rose-200 text-white cursor-not-allowed'
            : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 cursor-pointer'
        }`}
      >
        {drawAgainLoading === 1
          ? <><i className="ri-loader-4-line animate-spin mr-1"></i>{t('draw.result.processing')}</>
          : <><i className="ri-dice-line mr-1"></i>{t('draw.result.drawAgainSingle')}</>
        }
      </button>
      <button
        onClick={() => handleDrawAgainClick(5)}
        disabled={drawAgainLoading !== false || !canFiveDrawAgain}
        title={!canFiveDrawAgain ? t('draw.result.fiveSlotsInsufficient') : undefined}
        className={`flex-1 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap text-sm ${
          !canFiveDrawAgain
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : drawAgainLoading === 5
            ? 'bg-purple-300 text-white cursor-not-allowed shadow-md'
            : drawAgainLoading !== false
            ? 'bg-purple-200 text-white cursor-not-allowed shadow-md'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 cursor-pointer shadow-md'
        }`}
      >
        {drawAgainLoading === 5
          ? <><i className="ri-loader-4-line animate-spin mr-1"></i>{t('draw.result.processing')}</>
          : !canFiveDrawAgain
          ? <><i className="ri-dice-5-line mr-1"></i>{t('draw.result.drawAgainFive')} <span className="text-xs font-normal opacity-60">（{t('draw.result.drawAgainFiveDisabled')}）</span></>
          : <><i className="ri-dice-5-line mr-1"></i>{t('draw.result.drawAgainFive')}</>
        }
      </button>
    </div>
  );

  // ── 單抽結果 ──
  if (isSingle) {
    const isWin = record.isWin;
    const rarity = record.rarity || 'C';
    const config = RARITY_CONFIG[rarity];
    const isRedeemed = redeemedIds.has(record.id) || record.redeemedForPoints;
    const marketValue = record.marketValue || 0;

    return (
      <>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={onClose}
        >
          {isWin && config.hasRainbowEffect && revealed && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: 4 + Math.random() * 8,
                    height: 4 + Math.random() * 8,
                    background: ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#f59e0b'][Math.floor(Math.random() * 6)],
                    animation: `rainbowPulse ${1 + Math.random() * 2}s ${Math.random() * 0.5}s ease-in-out infinite`,
                  }}
                />
              ))}
            </div>
          )}

          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto overflow-hidden relative my-auto flex flex-col max-h-[95vh]"
            style={{
              animation: isWin && config.hasShake
                ? 'modalSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both, modalShake 0.5s 0.4s ease-in-out'
                : 'modalSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900 shadow-md transition-all cursor-pointer">
              <i className="ri-close-line text-lg"></i>
            </button>

            {isWin ? (
              <div className={`p-5 text-center relative overflow-hidden flex-shrink-0 ${
                rarity === 'SS' ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500'
                : rarity === 'S' ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-500'
                : rarity === 'A' ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600'
                : rarity === 'B' ? 'bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600'
                : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600'
              }`}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative">
                  <div className="text-4xl mb-2" style={{ animation: 'bounceIn 0.6s 0.2s both' }}>
                    {config.hasRainbowEffect ? '🌈' : config.hasStarBurst ? '✨' : rarity === 'C' ? '💚' : '🎉'}
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    {config.hasRainbowEffect ? t('draw.result.superRareSS', { rarity }) : t('draw.result.congrats')}
                  </h2>
                  <p className="text-white/90 text-xs">
                    {config.hasRainbowEffect ? t('draw.result.rareDesc') : t('draw.result.awesomeDesc')}
                  </p>
                </div>
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(config.hasStarBurst ? 12 : 6)].map((_, i) => (
                    <div key={i} className="absolute text-white/40 text-xl" style={{ top: `${10 + i * 15}%`, left: `${5 + i * 16}%`, animation: `twinkle ${1 + i * 0.3}s ${i * 0.2}s ease-in-out infinite` }}>✦</div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-5 text-center bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 flex-shrink-0">
                <div className="text-3xl mb-1.5" style={{ animation: 'bounceIn 0.5s both' }}>🎴</div>
                <h2 className="text-lg font-bold text-white">{t('draw.result.drawResult')}</h2>
              </div>
            )}

            <div className="p-4 overflow-y-auto flex-1">
              <div className="mb-4 relative" style={{ perspective: 800 }}>
                {isWin && config.hasStarBurst && revealed && (
                  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="absolute text-yellow-400" style={{ top: '50%', left: '50%', fontSize: 24, animation: `starBurst 0.8s ${i * 0.1}s ease-out both`, transform: `rotate(${i * 45}deg)` }}>★</div>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    transition: 'transform 0.7s cubic-bezier(0.4,0,0.2,1)',
                    transformStyle: 'preserve-3d',
                    transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    position: 'relative',
                    width: '100%',
                    paddingBottom: '70%',
                  }}
                >
                  <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ backfaceVisibility: 'hidden' }}>
                    <div className="w-full h-full bg-gradient-to-br from-rose-400 via-pink-500 to-purple-500 flex flex-col items-center justify-center gap-3">
                      <i className="ri-gift-2-fill text-white" style={{ fontSize: 48 }}></i>
                      <span className="text-white text-base font-bold opacity-80">{t('draw.result.revealing')}</span>
                    </div>
                  </div>
                  <div
                    className={`absolute inset-0 rounded-xl overflow-hidden shadow-2xl ${isWin ? config.hasRainbowEffect ? 'border-4' : `border-4 ${config.borderClass}` : 'border-2 border-indigo-300'} ${isWin ? config.glowClass : ''}`}
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      ...(isWin && config.hasRainbowEffect ? { borderImage: 'linear-gradient(135deg, #f43f5e, #ec4899, #a855f7, #3b82f6, #10b981, #f59e0b) 1', animation: 'rainbowBorder 3s linear infinite' } : {}),
                    }}
                  >
                    <div className="w-full h-full bg-gray-50">
                      <img
                        src={isWin ? record.prizeImage : 'https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/5250fa4331b28dcfbabf0d582e3bf142.png'}
                        alt={isWin ? record.result : t('share.randomNaked')}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {isWin && (
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow-lg ${config.labelBg} ${config.labelText}`}>
                        <i className="ri-trophy-fill mr-1"></i>{rarity}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`text-center rounded-xl p-3 border-2 mb-3 ${isWin ? `${config.labelBg} ${config.borderClass}` : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-indigo-200'}`}
                style={{ animation: revealed ? 'fadeInUp 0.4s 0.5s both' : 'none' }}
              >
                {!isWin && (
                  <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-xs font-bold mb-1.5">
                    <i className="ri-gift-line mr-1"></i>{t('draw.result.consolation')}
                  </div>
                )}
                <p className="text-sm font-bold text-gray-900 mb-0.5">
                  {isWin ? record.result : t('draw.result.gotNakedCard')}
                </p>
                <p className="text-xs text-gray-500">{record.productName}</p>
                {isWin && marketValue > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-amber-200">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs text-gray-600">{t('draw.result.marketPrice')}</span>
                      <span className="text-base font-bold text-amber-600">HK$ {marketValue.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 市場價換積分按鈕（中獎時） */}
              {isWin && marketValue > 0 && (
                <div className="mb-2.5" style={{ animation: revealed ? 'fadeInUp 0.4s 0.6s both' : 'none' }}>
                  {isRedeemed ? (
                    <div className="w-full py-2.5 rounded-xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 font-bold text-sm flex items-center justify-center gap-2">
                      <i className="ri-check-double-line text-emerald-500"></i>
                      {t('draw.result.redeemed')} +{Math.floor(marketValue * MARKET_PRICE_TO_POINTS_RATIO)} CTP
                    </div>
                  ) : (
                    <button
                      onClick={() => setMarketPriceRedeemTarget(record)}
                      disabled={marketPriceRedeemLoading}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-sm hover:from-amber-500 hover:to-orange-500 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <i className="ri-exchange-funds-line"></i>
                      {t('draw.result.marketRedeemBtn', { n: Math.floor(marketValue * MARKET_PRICE_TO_POINTS_RATIO) })}
                    </button>
                  )}
                </div>
              )}

              {/* 裸卡換分按鈕（未中獎時） */}
              {!isWin && (
                <div className="mb-2.5" style={{ animation: revealed ? 'fadeInUp 0.4s 0.6s both' : 'none' }}>
                  {isRedeemed ? (
                    <div className="w-full py-2.5 rounded-xl bg-amber-50 border-2 border-amber-200 text-amber-600 font-bold text-sm flex items-center justify-center gap-2">
                      <i className="ri-check-double-line text-amber-500"></i>
                      {t('draw.result.redeemed')} +{POINTS_PER_CARD} CTP
                    </div>
                  ) : (
                    <button
                      onClick={() => setRedeemTarget([record])}
                      disabled={redeemLoading}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 text-white font-bold text-sm hover:from-amber-500 hover:to-orange-500 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <i className="ri-exchange-funds-line"></i>
                      {t('draw.result.nakedRedeemBtn', { n: POINTS_PER_CARD })}
                    </button>
                  )}
                </div>
              )}

              {/* 分享按鈕 */}
              <button
                onClick={() => setShowShare(true)}
                className="w-full mb-2.5 py-2.5 rounded-xl border-2 border-dashed border-rose-300 text-rose-500 font-bold text-sm hover:bg-rose-50 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                style={{ animation: revealed ? 'fadeInUp 0.4s 0.7s both' : 'none' }}
              >
                <i className="ri-share-line"></i>{t('draw.result.shareBtn')}
              </button>

              {/* 底部按鈕 */}
              <div className="flex flex-col gap-2">
                {renderDrawAgainButtons()}
                <button onClick={onViewRecords} disabled={drawAgainLoading !== false} className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  <i className="ri-history-line mr-1"></i>{t('draw.result.viewRecords')}
                </button>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes modalSlideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes modalShake { 0%, 100% { transform: translateX(0) scale(1); } 10%, 30%, 50%, 70%, 90% { transform: translateX(-4px) scale(1.02); } 20%, 40%, 60%, 80% { transform: translateX(4px) scale(1.02); } }
            @keyframes bounceIn { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(1); } }
            @keyframes twinkle { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 0.8; transform: scale(1.2); } }
            @keyframes starBurst { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0) rotate(var(--r, 0deg)); } 50% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -50%) translateY(-100px) scale(1.5) rotate(var(--r, 0deg)); } }
            @keyframes rainbowPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.5); } }
            @keyframes rainbowBorder { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
            @keyframes rainbowGlow { 0% { box-shadow: 0 0 0 3px transparent, 0 0 20px 6px rgba(244,63,94,0.6), 0 0 40px 10px rgba(168,85,247,0.35); filter: hue-rotate(0deg); } 50% { box-shadow: 0 0 0 3px transparent, 0 0 24px 8px rgba(59,130,246,0.6), 0 0 48px 12px rgba(16,185,129,0.35); } 100% { box-shadow: 0 0 0 3px transparent, 0 0 20px 6px rgba(244,63,94,0.6), 0 0 40px 10px rgba(168,85,247,0.35); filter: hue-rotate(360deg); } }
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
        </div>

        {showShare && <SharePanel records={records} onClose={() => setShowShare(false)} t={t} />}

        {redeemTarget && (
          <RedeemConfirmModal
            records={redeemTarget}
            mode="single"
            onConfirm={handleRedeemConfirm}
            onCancel={() => setRedeemTarget(null)}
          />
        )}

        {marketPriceRedeemTarget && (
          <MarketPriceRedeemModal
            record={marketPriceRedeemTarget}
            onConfirm={handleMarketPriceRedeemConfirm}
            onCancel={() => setMarketPriceRedeemTarget(null)}
            t={t}
          />
        )}
      </>
    );
  }

  // ── 5連抽結果 ──
  const winCount = records.filter(r => r.isWin).length;
  const nakedCards = records.filter(r => !r.isWin);
  const unredeemedNaked = nakedCards.filter(r => !redeemedIds.has(r.id) && !r.redeemedForPoints);
  const allNakedRedeemed = nakedCards.length > 0 && unredeemedNaked.length === 0;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-auto overflow-hidden relative my-auto flex flex-col max-h-[95vh]"
          style={{ animation: 'modalSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-gray-900 shadow-md transition-all cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>

          <div className={`p-5 text-center relative overflow-hidden flex-shrink-0 ${winCount > 0 ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-rose-500' : 'bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500'}`}>
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
            <div className="relative">
              <div className="text-3xl mb-1" style={{ animation: 'bounceIn 0.5s both' }}>{winCount > 0 ? '🎉' : '🎴'}</div>
              <h2 className="text-xl font-bold text-white">{winCount > 0 ? t('draw.result.fiveWin', { n: winCount }) : t('draw.result.fiveResult')}</h2>
              <p className="text-white/80 text-xs mt-1">{t('draw.result.totalCost', { n: records[0].price * 5 })}</p>
            </div>
          </div>

          <div className="p-5 overflow-y-auto flex-1">
            {/* 卡片翻牌區 */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {records.map((r, idx) => (
                <div key={r.id} className="flex flex-col gap-1">
                  <FlipCard record={r} delay={200 + idx * 250} index={idx} />
                  {!r.isWin ? (
                    <div className="text-center">
                      {redeemedIds.has(r.id) || r.redeemedForPoints ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded-full text-xs font-bold whitespace-nowrap">
                          <i className="ri-check-line text-xs"></i>{t('draw.result.redeemed')}
                        </span>
                      ) : (
                        <button
                          onClick={() => setRedeemTarget([r])}
                          disabled={redeemLoading}
                          className="w-full px-1 py-1 bg-amber-400 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                        >
                          {t('user.redeemMobile')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      {redeemedIds.has(r.id) || r.redeemedForPoints ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-full text-xs font-bold whitespace-nowrap">
                          <i className="ri-check-line text-xs"></i>{t('draw.result.redeemed')}
                        </span>
                      ) : (r.marketValue || 0) > 0 ? (
                        <button
                          onClick={() => setMarketPriceRedeemTarget(r)}
                          disabled={marketPriceRedeemLoading}
                          className="w-full px-1 py-1 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                        >
                          {t('user.redeemMobile')}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {winCount > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-200 mb-4" style={{ animation: 'fadeInUp 0.4s 1.5s both' }}>
                <p className="text-xs font-bold text-orange-600 mb-2 flex items-center gap-1">
                  <i className="ri-trophy-fill text-yellow-500"></i>{t('draw.result.winPrizes')}
                </p>
                {records.filter(r => r.isWin).map((r, idx) => {
                  const rarity = r.rarity || 'C';
                  const config = RARITY_CONFIG[rarity];
                  const marketValue = r.marketValue || 0;
                  return (
                    <div key={idx} className="text-sm font-semibold text-gray-800 flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span>• {r.prizeName || r.result}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${config.labelBg} ${config.labelText}`}>{rarity}</span>
                      </div>
                      {marketValue > 0 && (
                        <span className="text-xs text-amber-600 font-bold">HK$ {marketValue.toLocaleString()}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* 裸卡批量換分區 */}
            {nakedCards.length > 0 && (
              <div className="mb-4 rounded-xl border-2 border-amber-200 bg-amber-50 p-3" style={{ animation: 'fadeInUp 0.4s 1.6s both' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 flex items-center justify-center bg-amber-100 rounded-lg">
                      <i className="ri-stack-line text-amber-600 text-sm"></i>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-700">
                        {t('draw.result.nakedCards', { n: nakedCards.length })}
                        {unredeemedNaked.length > 0 && (
                          <span className="ml-1 text-amber-500">（{t('draw.result.nakedRedeemable', { n: unredeemedNaked.length })}）</span>
                        )}
                      </p>
                      <p className="text-xs text-amber-500">{t('draw.result.eachXCTP', { n: POINTS_PER_CARD })}</p>
                    </div>
                  </div>
                  {allNakedRedeemed ? (
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-200 text-amber-700 rounded-lg text-xs font-bold whitespace-nowrap">
                      <i className="ri-check-double-line"></i>{t('draw.result.allRedeemed')}
                    </div>
                  ) : (
                    <button
                      onClick={() => setRedeemTarget(unredeemedNaked)}
                      disabled={redeemLoading || unredeemedNaked.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-exchange-funds-line"></i>
                      {t('draw.result.redeemAll', { n: unredeemedNaked.length * POINTS_PER_CARD })}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 分享按鈕 */}
            <button
              onClick={() => setShowShare(true)}
              className="w-full mb-3 py-2.5 rounded-xl border-2 border-dashed border-rose-300 text-rose-500 font-bold text-sm hover:bg-rose-50 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              style={{ animation: 'fadeInUp 0.4s 1.8s both' }}
            >
              <i className="ri-share-line"></i>{t('draw.result.shareDrawResult')}
            </button>

            {/* 底部按鈕 */}
            <div className="flex flex-col gap-2">
              {renderDrawAgainButtons()}
              <button onClick={onViewRecords} disabled={drawAgainLoading !== false} className="w-full py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                <i className="ri-history-line mr-1"></i>{t('draw.result.viewRecords')}
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes modalSlideUp { from { opacity: 0; transform: translateY(40px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes bounceIn { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(1); } }
          @keyframes fadeInUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes rainbowBorder { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
          @keyframes rainbowGlow { 0% { box-shadow: 0 0 0 3px transparent, 0 0 20px 6px rgba(244,63,94,0.6), 0 0 40px 10px rgba(168,85,247,0.35); filter: hue-rotate(0deg); } 50% { box-shadow: 0 0 0 3px transparent, 0 0 24px 8px rgba(59,130,246,0.6), 0 0 48px 12px rgba(16,185,129,0.35); } 100% { box-shadow: 0 0 0 3px transparent, 0 0 20px 6px rgba(244,63,94,0.6), 0 0 40px 10px rgba(168,85,247,0.35); filter: hue-rotate(360deg); } }
        `}</style>
      </div>

      {showShare && <SharePanel records={records} onClose={() => setShowShare(false)} t={t} />}

      {redeemTarget && (
        <RedeemConfirmModal
          records={redeemTarget}
          mode={redeemTarget.length === 1 ? 'single' : 'batch'}
          onConfirm={handleRedeemConfirm}
          onCancel={() => setRedeemTarget(null)}
        />
      )}

      {marketPriceRedeemTarget && (
        <MarketPriceRedeemModal
          record={marketPriceRedeemTarget}
          onConfirm={handleMarketPriceRedeemConfirm}
          onCancel={() => setMarketPriceRedeemTarget(null)}
          t={t}
        />
      )}
    </>
  );
}
