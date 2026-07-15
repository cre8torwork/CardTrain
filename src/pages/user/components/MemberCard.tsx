import { useMemberLevel } from '../../../hooks/useMemberLevel';

interface MemberCardProps {
  userId: string;
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '新手訓練家',
  STANDARD: '標準訓練家',
  ADVANCE: '進階訓練家',
  EXPERT: '專家訓練家',
  PREMIUM: '尊貴訓練家',
  MASTER: '大師訓練家',
  LEGEND: '傳說訓練家',
};

// ── 各等級卡片樣式配置 ──────────────────────────────────────────

const CARD_STYLES: Record<string, {
  bg: string;
  rankColor: string;
  nameColor: string;
  subColor: string;
  progressBg: string;
  progressFill: string;
  discountBg: string;
  discountText: string;
  border: string;
  shadow: string;
  icon: string;
  extra?: string;
}> = {
  BEGINNER: {
    bg: 'bg-white',
    border: 'border border-gray-200',
    shadow: 'shadow-sm',
    rankColor: 'text-gray-400',
    nameColor: 'text-gray-700',
    subColor: 'text-gray-400',
    progressBg: 'bg-gray-100',
    progressFill: 'bg-gray-300',
    discountBg: 'bg-gray-100',
    discountText: 'text-gray-500',
    icon: 'ri-seedling-line',
    extra: '',
  },
  STANDARD: {
    bg: '',
    border: 'border-0',
    shadow: 'shadow-md',
    rankColor: 'text-sky-200',
    nameColor: 'text-white',
    subColor: 'text-sky-200',
    progressBg: 'bg-white/20',
    progressFill: 'bg-white/80',
    discountBg: 'bg-white/20',
    discountText: 'text-white',
    icon: 'ri-user-star-line',
    extra: 'background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
  },
  ADVANCE: {
    bg: '',
    border: 'border-0',
    shadow: 'shadow-md',
    rankColor: 'text-emerald-100',
    nameColor: 'text-white',
    subColor: 'text-emerald-100',
    progressBg: 'bg-white/20',
    progressFill: 'bg-white/80',
    discountBg: 'bg-white/20',
    discountText: 'text-white',
    icon: 'ri-shield-star-line',
    extra: 'background: linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)',
  },
  EXPERT: {
    bg: '',
    border: 'border-0',
    shadow: 'shadow-lg',
    rankColor: 'text-violet-200',
    nameColor: 'text-white',
    subColor: 'text-violet-200',
    progressBg: 'bg-white/15',
    progressFill: 'bg-violet-200',
    discountBg: 'bg-white/15',
    discountText: 'text-violet-100',
    icon: 'ri-medal-2-line',
    extra: 'background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #4c1d95 100%)',
  },
  PREMIUM: {
    bg: '',
    border: 'border-0',
    shadow: 'shadow-xl',
    rankColor: 'text-yellow-200',
    nameColor: 'text-white',
    subColor: 'text-yellow-200',
    progressBg: 'bg-black/20',
    progressFill: 'bg-yellow-300',
    discountBg: 'bg-black/20',
    discountText: 'text-yellow-100',
    icon: 'ri-vip-diamond-line',
    extra: 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 40%, #b45309 100%)',
  },
  MASTER: {
    bg: '',
    border: 'border-0',
    shadow: 'shadow-2xl',
    rankColor: 'text-yellow-300',
    nameColor: 'text-white',
    subColor: 'text-violet-300',
    progressBg: 'bg-white/10',
    progressFill: 'bg-yellow-400',
    discountBg: 'bg-yellow-400/20',
    discountText: 'text-yellow-200',
    icon: 'ri-trophy-fill',
    extra: 'background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
  },
  LEGEND: {
    bg: '',
    border: 'border-0',
    shadow: 'shadow-2xl',
    rankColor: 'text-pink-300',
    nameColor: 'text-white',
    subColor: 'text-pink-200',
    progressBg: 'bg-white/10',
    progressFill: 'bg-gradient-to-r from-yellow-400 to-pink-400',
    discountBg: 'bg-yellow-400/20',
    discountText: 'text-yellow-200',
    icon: 'ri-sparkling-2-fill',
    extra: 'background: linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
  },
};

function MemberCard({ userId }: MemberCardProps) {
  const { memberInfo, loading } = useMemberLevel(userId);

  if (loading) {
    return (
      <div className="rounded-xl bg-gray-100 animate-pulse h-20" />
    );
  }

  if (!memberInfo) return null;

  const { currentLevel, levelPoints, discount, nextLevel, progressPercent, pointsToNextLevel } = memberInfo;
  const style = CARD_STYLES[currentLevel.name] ?? CARD_STYLES['BEGINNER'];
  const isColored = currentLevel.name !== 'BEGINNER';

  // 特殊裝飾
  const isLegend = currentLevel.name === 'LEGEND';
  const isMaster = currentLevel.name === 'MASTER';
  const isPremium = currentLevel.name === 'PREMIUM';
  const isExpert = currentLevel.name === 'EXPERT';

  return (
    <div>
      {/* 小型橫向會員卡 */}
      <div
        className={`relative rounded-xl overflow-hidden ${style.border} ${style.shadow} ${style.bg}`}
        style={isColored ? { [style.extra!.split(':')[0].trim()]: style.extra!.split(':').slice(1).join(':').trim() } : {}}
      >
        {/* Legend 彩虹光暈 */}
        {isLegend && (
          <>
            <div className="absolute inset-0 opacity-15" style={{
              background: 'conic-gradient(from 0deg at 50% 50%, #ec4899, #8b5cf6, #06b6d4, #10b981, #f59e0b, #ec4899)',
              animation: 'spin 12s linear infinite',
              filter: 'blur(15px)',
            }} />
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #ec4899, #fbbf24, #8b5cf6, #06b6d4, #fbbf24, #ec4899)' }} />
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #8b5cf6, #ec4899, #fbbf24, #ec4899, #8b5cf6)' }} />
          </>
        )}
        {/* Master 旋轉光環 */}
        {isMaster && (
          <div className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full opacity-10" style={{
            background: 'conic-gradient(from 0deg, transparent, #fbbf24, transparent, #a78bfa, transparent)',
            animation: 'cardSpin 8s linear infinite',
            transform: 'translate(-50%, -50%)',
          }} />
        )}
        {/* Premium 掃光 */}
        {isPremium && (
          <div className="absolute inset-0 opacity-25" style={{
            background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
            animation: 'shimmer 3s infinite',
          }} />
        )}
        {/* Expert 星光 */}
        {isExpert && [0,1,2,3,4].map(i => (
          <div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-pulse" style={{
            top: `${15 + i * 18}%`, left: `${8 + i * 18}%`,
            animationDelay: `${i * 0.3}s`, opacity: 0.5,
          }} />
        ))}

        {/* 四角裝飾（Premium / Legend） */}
        {(isPremium || isLegend) && (
          <>
            <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t border-l border-yellow-300/70 rounded-tl" />
            <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t border-r border-yellow-300/70 rounded-tr" />
            <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b border-l border-yellow-300/70 rounded-bl" />
            <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b border-r border-yellow-300/70 rounded-br" />
          </>
        )}

        <div className="relative z-10 flex items-center gap-3 px-4 py-3">
          {/* 左側圖標 */}
          <div className={`w-9 h-9 flex-shrink-0 rounded-full flex items-center justify-center ${
            isColored ? 'bg-white/20 border border-white/30' : 'bg-gray-100 border border-gray-200'
          }`}>
            <i className={`${style.icon} text-lg ${isColored ? 'text-white' : 'text-gray-400'}`}></i>
          </div>

          {/* 中間：等級名稱 + 積分 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`text-xs font-medium ${style.rankColor}`}>RANK</span>
              <span className={`text-sm font-black tracking-wider ${style.nameColor} ${
                isLegend ? 'legend-text' : ''
              }`}
                style={isLegend ? {
                  background: 'linear-gradient(90deg, #fbbf24, #ec4899, #8b5cf6, #fbbf24)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundSize: '200% auto',
                  animation: 'textShimmer 3s linear infinite',
                } : {}}
              >
                {currentLevel.name}
              </span>
            </div>
            <p className={`text-xs ${style.subColor} truncate`}>{LEVEL_LABELS[currentLevel.name]}</p>

            {/* 進度條（有下一等級時顯示） */}
            {nextLevel && (
              <div className="mt-1.5">
                <div className={`w-full h-1 rounded-full overflow-hidden ${style.progressBg}`}>
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${style.progressFill}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className={`text-xs mt-0.5 ${style.subColor}`} style={{ fontSize: '10px' }}>
                  {levelPoints.toLocaleString()} / {nextLevel.requiredPoints.toLocaleString()} CTP → {nextLevel.name}
                </p>
              </div>
            )}
            {!nextLevel && (
              <p className={`text-xs mt-0.5 ${style.subColor}`} style={{ fontSize: '10px' }}>
                最高等級 · {levelPoints.toLocaleString()} CTP
              </p>
            )}
          </div>

          {/* 右側：折扣 */}
          <div className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-center ${style.discountBg}`}>
            {discount > 0 ? (
              <>
                <p className={`text-xs font-black leading-none ${style.discountText}`}>-{discount}%</p>
                <p className={`leading-none mt-0.5 ${style.discountText}`} style={{ fontSize: '9px' }}>折扣</p>
              </>
            ) : (
              <>
                <p className={`text-xs font-bold leading-none ${style.discountText}`}>—</p>
                <p className={`leading-none mt-0.5 ${style.discountText}`} style={{ fontSize: '9px' }}>折扣</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 升級提示 */}
      {nextLevel && (
        <p className="text-xs text-gray-400 mt-1.5 px-1">
          再購買 <strong className="text-rose-500">{pointsToNextLevel.toLocaleString()} CTP</strong> 即可升級至 <strong className="text-gray-600">{nextLevel.name}</strong>（-{nextLevel.discount}% 折扣）
        </p>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes textShimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes cardSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default MemberCard;
