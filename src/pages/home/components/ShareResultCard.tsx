import { forwardRef } from 'react';
import { DrawRecord } from '../../../hooks/useDrawHistory';
import { Rarity } from '../../../hooks/useProductStore';

interface Props {
  records: DrawRecord[];
  t: (key: string, options?: Record<string, unknown>) => string;
}

const RARITY_CONFIG: Record<Rarity, { bg: string; text: string; label: string }> = {
  C:  { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'C' },
  B:  { bg: 'bg-sky-100',    text: 'text-sky-600',    label: 'B' },
  A:  { bg: 'bg-violet-100', text: 'text-violet-600', label: 'A' },
  S:  { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'S' },
  SS: { bg: 'bg-rose-100',   text: 'text-rose-700',   label: 'SS' },
};

const RARITY_GRADIENT: Record<Rarity, string> = {
  C:  'from-gray-400 to-gray-500',
  B:  'from-sky-400 to-cyan-500',
  A:  'from-violet-500 to-purple-500',
  S:  'from-amber-400 to-orange-500',
  SS: 'from-rose-500 via-pink-500 to-purple-500',
};

const ShareResultCard = forwardRef<HTMLDivElement, Props>(({ records, t }, ref) => {
  const isSingle = records.length === 1;
  const record = records[0];
  const winRecords = records.filter(r => r.isWin);
  const topRarity = winRecords.length > 0
    ? winRecords.reduce<Rarity>((best, r) => {
        const order: Rarity[] = ['C', 'B', 'A', 'S', 'SS'];
        return order.indexOf(r.rarity) > order.indexOf(best) ? r.rarity : best;
      }, 'C')
    : 'C';

  const gradient = winRecords.length > 0 ? RARITY_GRADIENT[topRarity] : 'from-rose-500 via-pink-500 to-purple-500';

  return (
    <div
      ref={ref}
      style={{ width: 480, fontFamily: 'sans-serif', background: '#fff' }}
      className="rounded-2xl overflow-hidden shadow-2xl"
    >
      {/* 頂部漸層 Banner */}
      <div className={`bg-gradient-to-r ${gradient} p-6 text-center relative overflow-hidden`}>
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        />
        <div className="relative">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img
              src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
              alt="Card Train"
              style={{ width: 28, height: 28, objectFit: 'contain', background: '#fff', borderRadius: 6, padding: 2 }}
            />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, opacity: 0.9 }}>{t('share.cardTrain')}</span>
          </div>
          <div style={{ fontSize: 36, marginBottom: 4 }}>
            {winRecords.length > 0 ? (topRarity === 'SS' ? '🌈' : '🎉') : '🎴'}
          </div>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 4 }}>
            {winRecords.length > 0
              ? isSingle
                ? t('share.wonRarity', { rarity: topRarity })
                : t('share.wonXTimes', { n: winRecords.length })
              : isSingle ? t('share.drawResult') : t('share.fiveResult')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
            {record.productName}
          </div>
        </div>
      </div>

      {/* 內容區 */}
      <div style={{ padding: '20px 24px 24px', background: '#fff' }}>
        {isSingle ? (
          /* 單抽：大圖展示 */
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 120, height: 160, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '2px solid #f3f4f6', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <img
                src={record.isWin ? record.prizeImage : 'https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/5250fa4331b28dcfbabf0d582e3bf142.png'}
                alt={record.isWin ? record.prizeName : t('share.nakedCard')}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              {record.isWin ? (
                <>
                  <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 8 }}
                    className={`${RARITY_CONFIG[record.rarity].bg} ${RARITY_CONFIG[record.rarity].text}`}
                  >
                    ★ {record.rarity}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#111', marginBottom: 6, lineHeight: 1.4 }}>
                    {record.prizeName || record.result}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {record.productCategory}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 8, background: '#e0e7ff', color: '#4338ca' }}>
                    {t('share.consolation')}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>
                    {t('share.randomNaked')}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{t('share.keepGoing')}</div>
                </>
              )}
            </div>
          </div>
        ) : (
          /* 5連抽：卡片網格 */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
              {records.map((r, idx) => {
                const cfg = RARITY_CONFIG[r.rarity];
                return (
                  <div key={idx} style={{ textAlign: 'center' }}>
                    <div style={{ borderRadius: 8, overflow: 'hidden', border: '2px solid #f3f4f6', marginBottom: 4, aspectRatio: '2/3' }}>
                      <img
                        src={r.isWin ? r.prizeImage : 'https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/5250fa4331b28dcfbabf0d582e3bf142.png'}
                        alt={r.isWin ? r.prizeName : t('share.nakedCard')}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div
                      style={{ fontSize: 10, fontWeight: 700, padding: '2px 4px', borderRadius: 4 }}
                      className={`${cfg.bg} ${cfg.text}`}
                    >
                      {r.isWin ? r.rarity : t('share.nakedCard')}
                    </div>
                  </div>
                );
              })}
            </div>
            {winRecords.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 6 }}>{t('share.wonPrizes')}</div>
                {winRecords.map((r, idx) => {
                  const cfg = RARITY_CONFIG[r.rarity];
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>• {r.prizeName || r.result}</span>
                      <span
                        style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4 }}
                        className={`${cfg.bg} ${cfg.text}`}
                      >
                        {r.rarity}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 底部浮水印 */}
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>
            {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <div style={{ fontSize: 11, color: '#f43f5e', fontWeight: 700 }}>
            cardtrain.com
          </div>
        </div>
      </div>
    </div>
  );
});

ShareResultCard.displayName = 'ShareResultCard';
export default ShareResultCard;