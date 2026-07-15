import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import PrivateRoute from '../../../components/admin/PrivateRoute';
import { useSettings } from '../../../hooks/useSettings';
import type { MemberLevelThresholds } from '../../../hooks/useSettings';
import { MEMBER_LEVELS } from '../../../hooks/useMemberLevel';

// ─── 會員等級中文名稱 ────────────────────────────────────────────
const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: '新手訓練家',
  STANDARD: '標準訓練家',
  ADVANCE:  '進階訓練家',
  EXPERT:   '專家訓練家',
  PREMIUM:  '尊貴訓練家',
  MASTER:   '大師訓練家',
  LEGEND:   '傳說訓練家',
};

// ─── 會員等級卡片樣式（對應 MemberCard） ────────────────────────
const CARD_STYLES: Record<string, {
  bg: string;
  border: string;
  shadow: string;
  rankColor: string;
  nameColor: string;
  subColor: string;
  progressBg: string;
  progressFill: string;
  discountBg: string;
  discountText: string;
  badgeBg: string;
  badgeText: string;
  icon: string;
  gradientStyle?: string;
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
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-600',
    icon: 'ri-seedling-line',
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
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    icon: 'ri-user-star-line',
    gradientStyle: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
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
    badgeBg: 'bg-white/20',
    badgeText: 'text-white',
    icon: 'ri-shield-star-line',
    gradientStyle: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)',
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
    badgeBg: 'bg-white/15',
    badgeText: 'text-violet-100',
    icon: 'ri-medal-2-line',
    gradientStyle: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #4c1d95 100%)',
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
    badgeBg: 'bg-black/20',
    badgeText: 'text-yellow-100',
    icon: 'ri-vip-diamond-line',
    gradientStyle: 'linear-gradient(135deg, #f59e0b 0%, #d97706 40%, #b45309 100%)',
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
    badgeBg: 'bg-yellow-400/20',
    badgeText: 'text-yellow-200',
    icon: 'ri-trophy-fill',
    gradientStyle: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)',
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
    badgeBg: 'bg-yellow-400/20',
    badgeText: 'text-yellow-200',
    icon: 'ri-sparkling-2-fill',
    gradientStyle: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)',
  },
};

// ─── 單個會員等級卡片元件 ────────────────────────────────────────
interface LevelCardDisplayProps {
  levelName: string;
  discount: number;
  threshold: number;
  isFixed?: boolean;
  isEditing?: boolean;
  editValue?: number;
  onEditChange?: (val: string) => void;
}

function LevelCardDisplay({ levelName, discount, threshold, isFixed, isEditing, editValue, onEditChange }: LevelCardDisplayProps) {
  const s = CARD_STYLES[levelName] ?? CARD_STYLES['BEGINNER'];
  const isColored = levelName !== 'BEGINNER';
  const isLegend = levelName === 'LEGEND';
  const isMaster = levelName === 'MASTER';
  const isPremium = levelName === 'PREMIUM';
  const isExpert = levelName === 'EXPERT';

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${s.border} ${s.shadow} ${s.bg}`}
      style={isColored && s.gradientStyle ? { background: s.gradientStyle } : {}}
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

      <div className="relative z-10 flex items-center gap-3 px-4 py-3.5">
        {/* 圖標 */}
        <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center ${
          isColored ? 'bg-white/20 border border-white/30' : 'bg-gray-100 border border-gray-200'
        }`}>
          <i className={`${s.icon} text-lg ${isColored ? 'text-white' : 'text-gray-400'}`}></i>
        </div>

        {/* 中間：等級名稱 + 中文名 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-black tracking-wider ${s.nameColor}`}
              style={isLegend ? {
                background: 'linear-gradient(90deg, #fbbf24, #ec4899, #8b5cf6, #fbbf24)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundSize: '200% auto',
                animation: 'textShimmer 3s linear infinite',
              } : {}}
            >
              {levelName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.badgeBg} ${s.badgeText}`}>
              {LEVEL_LABELS[levelName]}
            </span>
          </div>
          {/* 門檻顯示或編輯 */}
          <div className="mt-1.5">
            {isFixed ? (
              <p className={`text-xs ${s.subColor}`}>預設等級 · 無需充值積分</p>
            ) : isEditing && onEditChange !== undefined ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  step={5000}
                  value={editValue}
                  onChange={(e) => onEditChange(e.target.value)}
                  className="w-28 px-2.5 py-1 border-2 border-white/40 rounded-lg font-bold text-sm text-gray-800 focus:outline-none text-center bg-white"
                />
                <span className={`text-xs font-semibold ${s.subColor}`}>CTP</span>
              </div>
            ) : (
              <p className={`text-xs font-semibold ${s.subColor}`}>
                門檻：{threshold.toLocaleString()} CTP
              </p>
            )}
          </div>
        </div>

        {/* 右側：折扣 */}
        <div className={`flex-shrink-0 rounded-lg px-3 py-2 text-center ${s.discountBg}`}>
          {discount > 0 ? (
            <>
              <p className={`text-sm font-black leading-none ${s.discountText}`}>-{discount}%</p>
              <p className={`leading-none mt-0.5 ${s.discountText}`} style={{ fontSize: '9px' }}>折扣</p>
            </>
          ) : (
            <>
              <p className={`text-sm font-bold leading-none ${s.discountText}`}>—</p>
              <p className={`leading-none mt-0.5 ${s.discountText}`} style={{ fontSize: '9px' }}>折扣</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 5連抽折扣卡片 ───────────────────────────────────────────────
function FiveDrawDiscountCard() {
  const { settings, saving, updateFiveDrawDiscount } = useSettings();
  const [inputValue, setInputValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const fiveDrawDiscount = isEditing
    ? Math.max(0, Math.min(50, parseFloat(inputValue) || 0))
    : settings.fiveDrawDiscount;

  const previewPrice = 100;

  const handleEdit = () => {
    setInputValue(String(settings.fiveDrawDiscount));
    setIsEditing(true);
    setSaveStatus('idle');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue('');
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    const val = parseFloat(inputValue);
    if (isNaN(val) || val < 0 || val > 50) {
      setSaveStatus('error');
      return;
    }
    const ok = await updateFiveDrawDiscount(val);
    if (ok) {
      setSaveStatus('success');
      setIsEditing(false);
      setInputValue('');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center bg-rose-100 rounded-lg">
          <i className="ri-dice-5-line text-rose-600 text-lg"></i>
        </div>
        <div>
          <h3 className="font-bold text-gray-800">5連抽額外折扣</h3>
          <p className="text-xs text-gray-500">此折扣會與會員等級折扣疊加計算</p>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-1">目前5連抽折扣率</p>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); setSaveStatus('idle'); }}
                    className="w-32 pl-4 pr-8 py-2.5 border-2 border-rose-400 rounded-xl font-bold text-lg text-gray-800 focus:outline-none focus:border-rose-500 text-center"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                </div>
                <span className="text-xs text-gray-400">（0 ~ 50%）</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-4xl font-bold text-rose-500">
                  {settings.fiveDrawDiscount}<span className="text-xl ml-1">%</span>
                </span>
                {settings.fiveDrawDiscount === 0 ? (
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">未啟用</span>
                ) : (
                  <span className="px-2 py-1 bg-rose-100 text-rose-600 text-xs font-bold rounded-full">已啟用</span>
                )}
              </div>
            )}
            {saveStatus === 'error' && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <i className="ri-error-warning-line"></i>請輸入 0 ~ 50 之間的有效數值
              </p>
            )}
            {saveStatus === 'success' && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <i className="ri-checkbox-circle-line"></i>設定已儲存成功！
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button onClick={handleCancel} className="px-4 py-2 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer text-sm">取消</button>
                <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold hover:from-rose-600 hover:to-pink-600 transition-all whitespace-nowrap cursor-pointer disabled:opacity-60 text-sm flex items-center gap-2">
                  {saving ? <><i className="ri-loader-4-line animate-spin"></i>儲存中...</> : <><i className="ri-save-line"></i>儲存</>}
                </button>
              </>
            ) : (
              <button onClick={handleEdit} className="px-5 py-2 border-2 border-rose-400 text-rose-500 rounded-xl font-bold hover:bg-rose-50 transition-colors whitespace-nowrap cursor-pointer text-sm flex items-center gap-2">
                <i className="ri-edit-line"></i>修改
              </button>
            )}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <i className="ri-information-line text-amber-600 text-lg mt-0.5"></i>
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">折扣疊加計算說明</p>
              <p className="text-xs text-amber-700 leading-relaxed">5連抽折扣與會員等級折扣採用<strong>連乘疊加</strong>方式計算：</p>
              <p className="text-xs text-amber-700 mt-1 font-mono bg-amber-100 px-3 py-1.5 rounded-lg">
                實際費用 = 原價 × 5 × (1 - 5連抽折扣%) × (1 - 會員折扣%)
              </p>
              <p className="text-xs text-amber-600 mt-1.5">
                例：5連抽折扣 {fiveDrawDiscount}%，LEGEND 會員享 6% 折扣<br />
                → 先折 {fiveDrawDiscount}%，再折 6%，實際折扣約 {(100 - (100 - fiveDrawDiscount) * (100 - 6) / 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <i className="ri-vip-crown-line text-rose-500"></i>
            各會員等級 5連抽費用預覽
            <span className="text-xs text-gray-400 font-normal">（以每口 {previewPrice} CTP 為例）</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MEMBER_LEVELS.map((level) => {
              const original = previewPrice * 5;
              const afterFive = original * ((100 - fiveDrawDiscount) / 100);
              const final = Math.floor(afterFive * ((100 - level.discount) / 100));
              const saved = original - final;
              const totalDiscountPct = (saved / original * 100).toFixed(1);
              const s = CARD_STYLES[level.name] ?? CARD_STYLES['BEGINNER'];
              const isColored = level.name !== 'BEGINNER';
              return (
                <div
                  key={level.name}
                  className={`relative rounded-xl overflow-hidden ${s.border} ${s.shadow} ${s.bg} p-4`}
                  style={isColored && s.gradientStyle ? { background: s.gradientStyle } : {}}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className={`text-xs font-black tracking-wider ${s.nameColor}`}>{level.name}</span>
                      <p className={`text-xs ${s.subColor}`}>{LEVEL_LABELS[level.name]}</p>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {fiveDrawDiscount > 0 && <span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-bold">-{fiveDrawDiscount}%</span>}
                      {level.discount > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${s.badgeBg} ${s.badgeText}`}>-{level.discount}%</span>}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold ${s.nameColor}`}>{final.toLocaleString()}</span>
                    <span className={`text-xs ${s.subColor}`}>CTP</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-xs line-through ${s.subColor} opacity-60`}>{original.toLocaleString()} CTP</span>
                    {saved > 0 ? (
                      <span className="text-xs text-emerald-400 font-semibold">省 {saved} CTP ({totalDiscountPct}%)</span>
                    ) : (
                      <span className={`text-xs ${s.subColor} opacity-60`}>無折扣</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-gray-100">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <i className="ri-lightbulb-line text-amber-500"></i>常用折扣快速套用
          </h4>
          <div className="flex flex-wrap gap-2">
            {[0, 1, 2, 3, 5, 8, 10].map((pct) => (
              <button
                key={pct}
                onClick={async () => {
                  setSaveStatus('idle');
                  const ok = await updateFiveDrawDiscount(pct);
                  if (ok) { setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 3000); }
                }}
                disabled={saving || settings.fiveDrawDiscount === pct}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer border-2 ${
                  settings.fiveDrawDiscount === pct
                    ? 'border-rose-400 bg-rose-50 text-rose-600 cursor-default'
                    : 'border-gray-200 text-gray-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600'
                } disabled:opacity-50`}
              >
                {pct === 0 ? '無折扣 (0%)' : `${pct}% 折扣`}
                {settings.fiveDrawDiscount === pct && <i className="ri-check-line ml-1.5"></i>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 會員等級設定卡片 ────────────────────────────────────────────
function MemberLevelSettingsCard() {
  const { settings, saving, updateAllMemberLevelThresholds } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<MemberLevelThresholds>({ ...settings.memberLevelThresholds });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error' | 'invalid'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isEditing) {
      setEditValues({ ...settings.memberLevelThresholds });
    }
  }, [settings.memberLevelThresholds, isEditing]);

  const handleEdit = () => {
    setEditValues({ ...settings.memberLevelThresholds });
    setIsEditing(true);
    setSaveStatus('idle');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValues({ ...settings.memberLevelThresholds });
    setSaveStatus('idle');
  };

  const handleChange = (level: keyof MemberLevelThresholds, val: string) => {
    const num = parseInt(val, 10);
    setEditValues(prev => ({ ...prev, [level]: isNaN(num) ? 0 : num }));
    setSaveStatus('idle');
  };

  const validate = (): boolean => {
    const levels: (keyof MemberLevelThresholds)[] = ['STANDARD', 'ADVANCE', 'EXPERT', 'PREMIUM', 'MASTER', 'LEGEND'];
    for (let i = 0; i < levels.length; i++) {
      const curr = editValues[levels[i]];
      if (curr <= 0) {
        setErrorMsg(`${LEVEL_LABELS[levels[i]]}（${levels[i]}）的門檻必須大於 0`);
        return false;
      }
      if (i > 0 && curr <= editValues[levels[i - 1]]) {
        setErrorMsg(`${LEVEL_LABELS[levels[i]]}（${levels[i]}）的門檻必須大於 ${LEVEL_LABELS[levels[i-1]]}（${editValues[levels[i - 1]].toLocaleString()} CTP）`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) {
      setSaveStatus('invalid');
      return;
    }
    const ok = await updateAllMemberLevelThresholds(editValues);
    if (ok) {
      setSaveStatus('success');
      setIsEditing(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } else {
      setSaveStatus('error');
    }
  };

  const editableLevels: { key: keyof MemberLevelThresholds; name: string; discount: number }[] = [
    { key: 'STANDARD', name: 'STANDARD', discount: 1 },
    { key: 'ADVANCE',  name: 'ADVANCE',  discount: 2 },
    { key: 'EXPERT',   name: 'EXPERT',   discount: 3 },
    { key: 'PREMIUM',  name: 'PREMIUM',  discount: 4 },
    { key: 'MASTER',   name: 'MASTER',   discount: 5 },
    { key: 'LEGEND',   name: 'LEGEND',   discount: 6 },
  ];

  const currentThresholds = isEditing ? editValues : settings.memberLevelThresholds;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center bg-amber-100 rounded-lg">
            <i className="ri-vip-crown-2-line text-amber-600 text-lg"></i>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">會員等級升級門檻</h3>
            <p className="text-xs text-gray-500">設定各等級所需的 90 日內充值積分門檻</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={handleCancel} className="px-4 py-2 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer text-sm">取消</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition-all whitespace-nowrap cursor-pointer disabled:opacity-60 text-sm flex items-center gap-2">
                {saving ? <><i className="ri-loader-4-line animate-spin"></i>儲存中...</> : <><i className="ri-save-line"></i>儲存全部</>}
              </button>
            </>
          ) : (
            <button onClick={handleEdit} className="px-5 py-2 border-2 border-amber-400 text-amber-600 rounded-xl font-bold hover:bg-amber-50 transition-colors whitespace-nowrap cursor-pointer text-sm flex items-center gap-2">
              <i className="ri-edit-line"></i>修改門檻
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* 說明 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <i className="ri-information-line text-amber-500 text-lg mt-0.5"></i>
            <div>
              <p className="text-sm font-bold text-amber-800 mb-1">會員等級計算規則</p>
              <ul className="text-xs text-amber-700 space-y-1 leading-relaxed">
                <li>• 會員等級根據用戶<strong>過去 90 日內</strong>的充值積分總額計算</li>
                <li>• 每個等級的門檻必須<strong>由低至高遞增</strong>，不可相同或倒序</li>
                <li>• 新手訓練家（BEGINNER）為預設等級，無需充值積分，享有 0% 折扣</li>
                <li>• 修改門檻後，所有用戶的等級將在下次登入時自動重新計算</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 等級卡片列表 */}
        <div className="space-y-3">
          {/* BEGINNER（固定，不可修改） */}
          <LevelCardDisplay
            levelName="BEGINNER"
            discount={0}
            threshold={0}
            isFixed
          />

          {/* 可編輯等級 */}
          {editableLevels.map((lvl) => (
            <LevelCardDisplay
              key={lvl.key}
              levelName={lvl.name}
              discount={lvl.discount}
              threshold={currentThresholds[lvl.key]}
              isEditing={isEditing}
              editValue={editValues[lvl.key]}
              onEditChange={(val) => handleChange(lvl.key, val)}
            />
          ))}
        </div>

        {/* 狀態提示 */}
        {saveStatus === 'invalid' && (
          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <i className="ri-error-warning-line text-lg"></i>
            <p className="text-sm font-semibold">{errorMsg}</p>
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <i className="ri-error-warning-line text-lg"></i>
            <p className="text-sm font-semibold">儲存失敗，請稍後再試</p>
          </div>
        )}
        {saveStatus === 'success' && (
          <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <i className="ri-checkbox-circle-line text-lg"></i>
            <p className="text-sm font-semibold">會員等級門檻已成功更新！</p>
          </div>
        )}

        {/* 等級晉升路線圖 */}
        {!isEditing && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <i className="ri-bar-chart-line text-amber-500"></i>
              等級晉升路線圖
            </p>
            <div className="flex items-center gap-1 flex-wrap">
              <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                <i className="ri-seedling-line"></i> 新手訓練家
              </div>
              {editableLevels.map((lvl) => {
                const s = CARD_STYLES[lvl.name];
                return (
                  <div key={lvl.key} className="flex items-center gap-1">
                    <i className="ri-arrow-right-line text-gray-300 text-xs"></i>
                    <div
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white`}
                      style={s.gradientStyle ? { background: s.gradientStyle } : {}}
                    >
                      <i className={s.icon}></i>
                      {LEVEL_LABELS[lvl.name]}
                      <span className="opacity-70 ml-1">{currentThresholds[lvl.key].toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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

// ─── 主頁面 ──────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const { loading } = useSettings();

  return (
    <PrivateRoute>
      <AdminLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 flex items-center justify-center bg-rose-100 rounded-xl">
              <i className="ri-settings-3-line text-rose-600 text-xl"></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">系統設定</h2>
              <p className="text-sm text-gray-500">調整全站折扣、優惠及會員等級設定</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <i className="ri-loader-4-line text-4xl animate-spin"></i>
                <p className="text-sm">載入設定中...</p>
              </div>
            </div>
          ) : (
            <>
              <FiveDrawDiscountCard />
              <MemberLevelSettingsCard />
            </>
          )}
        </div>
      </AdminLayout>
    </PrivateRoute>
  );
}
