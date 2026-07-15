import { useState, useRef } from 'react';

interface ShipOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (trackingNumber: string) => Promise<void>;
  items: { prizeName: string; prizeImage: string }[];
  userName: string;
  addressSummary: string;
}

export default function ShipOrderModal({
  isOpen,
  onClose,
  onConfirm,
  items,
  userName,
  addressSummary,
}: ShipOrderModalProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  if (!isOpen) return null;

  const isBatch = items.length > 1;

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      await onConfirm(trackingNumber.trim());
      setTrackingNumber('');
      onClose();
    } catch {
      // ignore
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full">
              <i className="ri-send-plane-fill text-white text-lg"></i>
            </div>
            <div>
              <h3 className="text-white font-bold text-base">確認發貨</h3>
              <p className="text-white/80 text-xs">
                {isBatch ? `共 ${items.length} 件獎品` : '填寫運輸單號'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* 收件人資訊 */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2">
              <i className="ri-user-3-line text-gray-500 text-sm"></i>
              <span className="text-sm font-semibold text-gray-800">{userName}</span>
            </div>
            <div className="flex items-start gap-2">
              <i className="ri-map-pin-line text-gray-400 text-sm flex-shrink-0 mt-0.5"></i>
              <span className="text-xs text-gray-500">{addressSummary || '尚未填寫地址'}</span>
            </div>
          </div>

          {/* 獎品清單 */}
          <div>
            <p className="text-xs text-gray-500 font-medium mb-2 flex items-center gap-1">
              <i className="ri-gift-2-line text-rose-400"></i>
              {isBatch ? `本批次獎品（${items.length} 件）` : '獎品'}
            </p>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-orange-50 rounded-xl px-3 py-2 border border-orange-100">
                  <span className="text-xs text-orange-400 font-bold w-5 flex-shrink-0">{idx + 1}</span>
                  <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-orange-100">
                    {item.prizeImage ? (
                      <img src={item.prizeImage} alt={item.prizeName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className="ri-gift-line text-orange-300 text-sm"></i>
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 truncate flex-1">{item.prizeName}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 運輸單號 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              運輸單號
              <span className="text-gray-400 font-normal ml-1 text-xs">（選填，可留空）</span>
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="輸入運輸單號..."
              disabled={loading}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400 transition-colors disabled:bg-gray-50"
            />
            {isBatch && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                <i className="ri-information-line"></i>
                此運輸單號將套用至本批次全部 {items.length} 件獎品
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow cursor-pointer disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
          >
            {loading ? (
              <><i className="ri-loader-4-line animate-spin"></i>處理中...</>
            ) : (
              <><i className="ri-send-plane-fill"></i>{isBatch ? `確認發貨（${items.length} 件）` : '確認發貨'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
