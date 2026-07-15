import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Rarity } from '../../../hooks/useProductStore';

interface Props {
  isVisible: boolean;
  drawCount: number;
  topRarity?: Rarity | 'none';
  onComplete?: () => void;
}

// ── 粒子工廠 ──────────────────────────────────────────────
function makeParticles(count: number, colors: string[]) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 40,
    delay: Math.random() * 0.8,
    duration: 1.4 + Math.random() * 1.2,
    size: 5 + Math.random() * 12,
    color: colors[Math.floor(Math.random() * colors.length)],
    angle: Math.random() * 360,
  }));
}

const SS_PARTICLES  = makeParticles(60, ['#f43f5e','#ec4899','#a855f7','#8b5cf6','#f59e0b','#ffffff']);
const S_PARTICLES   = makeParticles(45, ['#fbbf24','#f59e0b','#fcd34d','#fde047','#fff7ed','#fb923c']);
const A_PARTICLES   = makeParticles(35, ['#a855f7','#c084fc','#e879f9','#f0abfc','#d946ef','#ffffff']);
const B_PARTICLES   = makeParticles(28, ['#38bdf8','#7dd3fc','#0ea5e9','#22d3ee','#67e8f9','#ffffff']);
const C_PARTICLES   = makeParticles(22, ['#34d399','#6ee7b7','#10b981','#a7f3d0','#059669','#ffffff']);
const NONE_PARTICLES= makeParticles(14, ['#94a3b8','#cbd5e1','#e2e8f0','#f1f5f9']);

type AnimTexts = { shake: string; burst: string; reveal: string };

export default function DrawAnimationOverlay({ isVisible, drawCount, topRarity = 'none', onComplete }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<'shake' | 'burst' | 'reveal'>('shake');
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const rarityKey = (topRarity as string).toLowerCase();
  const texts: AnimTexts = {
    shake: t(`draw.animation.${rarityKey}.shake`),
    burst: t(`draw.animation.${rarityKey}.burst`),
    reveal: t(`draw.animation.${rarityKey}.reveal`),
  };

  const cfg = (() => {
    const particles = {
      ss: SS_PARTICLES, s: S_PARTICLES, a: A_PARTICLES, b: B_PARTICLES, c: C_PARTICLES, none: NONE_PARTICLES,
    }[rarityKey] ?? NONE_PARTICLES;

    const configs: Record<string, {
      bgFrom: string; bgVia: string; bgTo: string; overlayColor: string; glowColor: string;
      iconBg: string; iconGlow: string; beams: number; beamColor: string; ringCount: number; duration: { burst: number; reveal: number; complete: number };
    }> = {
      ss: {
        bgFrom: 'from-purple-900', bgVia: 'via-pink-900', bgTo: 'to-rose-900',
        overlayColor: 'rgba(168,85,247,0.25)', glowColor: '#ec4899',
        iconBg: 'linear-gradient(135deg,#f43f5e,#ec4899,#a855f7,#6366f1)',
        iconGlow: '0 0 80px 20px rgba(236,72,153,0.9)',
        beams: 8, beamColor: 'rgba(236,72,153,0.7)', ringCount: 3,
        duration: { burst: 600, reveal: 1300, complete: 1700 },
      },
      s: {
        bgFrom: 'from-yellow-900', bgVia: 'via-orange-900', bgTo: 'to-amber-900',
        overlayColor: 'rgba(251,191,36,0.2)', glowColor: '#fbbf24',
        iconBg: 'linear-gradient(135deg,#fbbf24,#f59e0b,#ef4444)',
        iconGlow: '0 0 60px 15px rgba(251,191,36,0.85)',
        beams: 6, beamColor: 'rgba(251,191,36,0.7)', ringCount: 2,
        duration: { burst: 550, reveal: 1150, complete: 1550 },
      },
      a: {
        bgFrom: 'from-purple-900', bgVia: 'via-violet-900', bgTo: 'to-fuchsia-900',
        overlayColor: 'rgba(168,85,247,0.2)', glowColor: '#a855f7',
        iconBg: 'linear-gradient(135deg,#a855f7,#c084fc,#e879f9)',
        iconGlow: '0 0 50px 12px rgba(168,85,247,0.8)',
        beams: 4, beamColor: 'rgba(168,85,247,0.6)', ringCount: 2,
        duration: { burst: 500, reveal: 1050, complete: 1400 },
      },
      b: {
        bgFrom: 'from-sky-900', bgVia: 'via-cyan-900', bgTo: 'to-blue-900',
        overlayColor: 'rgba(56,189,248,0.18)', glowColor: '#38bdf8',
        iconBg: 'linear-gradient(135deg,#38bdf8,#0ea5e9,#6366f1)',
        iconGlow: '0 0 40px 10px rgba(56,189,248,0.75)',
        beams: 4, beamColor: 'rgba(56,189,248,0.55)', ringCount: 1,
        duration: { burst: 480, reveal: 980, complete: 1320 },
      },
      c: {
        bgFrom: 'from-emerald-900', bgVia: 'via-teal-900', bgTo: 'to-green-900',
        overlayColor: 'rgba(52,211,153,0.18)', glowColor: '#34d399',
        iconBg: 'linear-gradient(135deg,#34d399,#10b981,#059669)',
        iconGlow: '0 0 35px 8px rgba(52,211,153,0.7)',
        beams: 3, beamColor: 'rgba(52,211,153,0.5)', ringCount: 1,
        duration: { burst: 450, reveal: 920, complete: 1250 },
      },
      none: {
        bgFrom: 'from-gray-900', bgVia: 'via-slate-900', bgTo: 'to-zinc-900',
        overlayColor: 'rgba(148,163,184,0.12)', glowColor: '#94a3b8',
        iconBg: 'linear-gradient(135deg,#64748b,#475569,#334155)',
        iconGlow: '0 0 25px 5px rgba(148,163,184,0.5)',
        beams: 0, beamColor: 'transparent', ringCount: 0,
        duration: { burst: 400, reveal: 850, complete: 1150 },
      },
    };
    return { ...(configs[rarityKey] ?? configs['none']), particles };
  })();

  const isHighRarity = topRarity === 'SS' || topRarity === 'S';

  useEffect(() => {
    if (!isVisible) {
      setPhase('shake');
      setProgress(0);
      return;
    }
    setPhase('shake');
    setProgress(0);

    const { burst, reveal, complete } = cfg.duration;

    const t1 = setTimeout(() => { setPhase('burst'); setProgress(40); }, burst);
    const t2 = setTimeout(() => { setPhase('reveal'); setProgress(80); }, reveal);
    const t3 = setTimeout(() => { setProgress(100); }, complete);
    const t4 = setTimeout(() => { onCompleteRef.current?.(); }, complete + 200);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [isVisible, topRarity]);

  if (!isVisible) return null;

  const showParticles = phase === 'burst' || phase === 'reveal';

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center bg-gradient-to-br ${cfg.bgFrom} ${cfg.bgVia} ${cfg.bgTo} backdrop-blur-md`}>

      {/* 背景光暈 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at center, ${cfg.overlayColor} 0%, transparent 70%)` }}
      />

      {/* SS 彩虹掃光背景 */}
      {topRarity === 'SS' && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{ animation: 'rainbowBg 3s linear infinite', background: 'linear-gradient(135deg,#f43f5e,#ec4899,#a855f7,#3b82f6,#10b981,#f59e0b,#f43f5e)', backgroundSize: '400% 400%' }}
        />
      )}

      {/* 粒子爆炸 */}
      {showParticles && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {cfg.particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: '-12px',
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size * 1.5}px ${p.color}`,
                animation: `particleFall ${p.duration}s ${p.delay * 0.25}s ease-in forwards`,
              }}
            />
          ))}
        </div>
      )}

      {/* 光束 */}
      {cfg.beams > 0 && showParticles && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
          {Array.from({ length: cfg.beams }).map((_, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                width: '2px',
                height: '120vh',
                background: `linear-gradient(to bottom, ${cfg.beamColor}, transparent)`,
                transformOrigin: 'top center',
                transform: `rotate(${(360 / cfg.beams) * i}deg)`,
                animation: `beamSweep 1.5s ${i * 0.08}s ease-out forwards`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* 擴散光環 */}
      {cfg.ringCount > 0 && phase === 'burst' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {Array.from({ length: cfg.ringCount }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border-2"
              style={{
                width: 80,
                height: 80,
                borderColor: cfg.glowColor,
                animation: `ringExpand 1s ${i * 0.2}s ease-out forwards`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* 中央動畫 */}
      <div className="relative flex flex-col items-center gap-6 z-10">

        {/* 主圖示 */}
        <div className="relative flex items-center justify-center">
          {/* 外光暈 */}
          <div
            className="absolute rounded-full"
            style={{
              width: isHighRarity ? 260 : 200,
              height: isHighRarity ? 260 : 200,
              background: `radial-gradient(circle, ${cfg.overlayColor.replace('0.', '0.4').replace('0.18','0.35').replace('0.12','0.2')} 0%, transparent 70%)`,
              animation: phase === 'burst' ? 'glowPulse 0.6s ease-out' : 'glowFloat 2s ease-in-out infinite',
            }}
          />

          {/* 圖示本體 */}
          <div
            style={{
              animation:
                phase === 'shake'
                  ? 'bagShake 0.1s ease-in-out infinite'
                  : phase === 'burst'
                  ? isHighRarity ? 'bagBurstBig 0.55s ease-out forwards' : 'bagBurst 0.45s ease-out forwards'
                  : 'bagFloat 1.2s ease-in-out infinite',
            }}
          >
            <div
              className="rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden"
              style={{
                width: isHighRarity ? 112 : 96,
                height: isHighRarity ? 112 : 96,
                background: cfg.iconBg,
                boxShadow: phase === 'burst' ? cfg.iconGlow : cfg.iconGlow.replace(/rgba\(([^)]+)\)/, 'rgba($1)').replace(/0\.\d+\)$/, '0.4)'),
                transition: 'box-shadow 0.3s',
              }}
            >
              {/* SS 彩虹掃光 */}
              {topRarity === 'SS' && (
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)', animation: 'iconShine 1.5s ease-in-out infinite' }}
                />
              )}
              <i className="ri-gift-2-fill text-white relative z-10" style={{ fontSize: isHighRarity ? 60 : 52 }} />
            </div>
          </div>

          {/* 星爆 */}
          {showParticles && topRarity !== 'none' && (
            <div className="absolute" style={{ width: 240, height: 240, top: -60, left: -60 }}>
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    top: '50%',
                    left: '50%',
                    fontSize: isHighRarity ? 22 + (i % 3) * 8 : 16 + (i % 3) * 6,
                    color: topRarity === 'SS'
                      ? ['#f43f5e','#ec4899','#a855f7','#3b82f6','#10b981','#f59e0b'][i % 6]
                      : cfg.glowColor,
                    transform: `rotate(${deg}deg) translateY(${isHighRarity ? -110 : -85}px) translateX(-50%)`,
                    animation: `starPop 0.6s ${i * 0.05}s ease-out both`,
                  }}
                >
                  ✦
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 進度條 */}
        <div className="w-60 bg-white/15 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: topRarity === 'SS'
                ? 'linear-gradient(90deg,#f43f5e,#ec4899,#a855f7,#f59e0b)'
                : `linear-gradient(90deg, ${cfg.glowColor}, white)`,
              boxShadow: `0 0 10px ${cfg.glowColor}`,
            }}
          />
        </div>

        {/* 文字 */}
        <div className="text-center">
          <p className="text-white text-xl font-bold tracking-widest drop-shadow-lg">
            {phase === 'shake' && texts.shake}
            {phase === 'burst' && texts.burst}
            {phase === 'reveal' && (drawCount > 1 ? t('draw.animation.multiReveal', { n: drawCount }) : texts.reveal)}
          </p>
          <p className="text-white/50 text-sm mt-1">
            {drawCount > 1 ? t('draw.animation.multiDraw', { n: drawCount }) : t('draw.animation.singleDraw')}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bagShake {
          0%, 100% { transform: rotate(-9deg) scale(1.06); }
          50% { transform: rotate(9deg) scale(1.06); }
        }
        @keyframes bagBurst {
          0% { transform: scale(1) rotate(0deg); }
          35% { transform: scale(1.55) rotate(6deg); }
          65% { transform: scale(0.88) rotate(-4deg); }
          100% { transform: scale(1.12) rotate(0deg); }
        }
        @keyframes bagBurstBig {
          0% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(1.75) rotate(8deg); }
          60% { transform: scale(0.82) rotate(-6deg); }
          100% { transform: scale(1.18) rotate(0deg); }
        }
        @keyframes bagFloat {
          0%, 100% { transform: translateY(0px) scale(1.12); }
          50% { transform: translateY(-10px) scale(1.12); }
        }
        @keyframes particleFall {
          0% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          80% { opacity: 0.6; }
          100% { transform: translateY(115vh) rotate(900deg) scale(0.3); opacity: 0; }
        }
        @keyframes beamSweep {
          0% { opacity: 0; transform: rotate(var(--r,0deg)) scaleY(0); }
          40% { opacity: 0.9; transform: rotate(var(--r,0deg)) scaleY(1); }
          100% { opacity: 0; transform: rotate(var(--r,0deg)) scaleY(1.3); }
        }
        @keyframes ringExpand {
          0% { opacity: 0.9; transform: scale(0.5); }
          100% { opacity: 0; transform: scale(8); }
        }
        @keyframes glowPulse {
          0% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }
        @keyframes glowFloat {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }
        @keyframes starPop {
          0% { opacity: 0; transform: rotate(var(--r,0deg)) translateY(-20px) translateX(-50%) scale(0); }
          55% { opacity: 1; transform: rotate(var(--r,0deg)) translateY(-90px) translateX(-50%) scale(1.3); }
          100% { opacity: 0.7; transform: rotate(var(--r,0deg)) translateY(-90px) translateX(-50%) scale(1); }
        }
        @keyframes rainbowBg {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes iconShine {
          0% { transform: translateX(-100%) skewX(-20deg); }
          100% { transform: translateX(200%) skewX(-20deg); }
        }
      `}</style>
    </div>
  );
}