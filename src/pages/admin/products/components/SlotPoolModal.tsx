import { useState, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';

interface SlotPoolModalProps {
  productId: number;
  productName: string;
  totalSlots: number;
  remaining: number;
  boardType: 'open' | 'closed';
  onClose: () => void;
}

interface SlotInfo {
  id: string;
  slotNumber: number;
  prizeId: string | null;
  prizeName: string | null;
  isDrawn: boolean;
  drawnBy: string | null;
  drawnAt: string | null;
}

export default function SlotPoolModal({
  productId,
  productName,
  totalSlots,
  remaining,
  boardType,
  onClose,
}: SlotPoolModalProps) {
  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    loadSlots();
  }, [productId]);

  const loadSlots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('draw_slots')
        .select('*')
        .eq('product_id', productId)
        .order('slot_number', { ascending: true });

      if (error) throw error;

      const slotInfos: SlotInfo[] = (data || []).map((slot: any) => ({
        id: slot.id,
        slotNumber: slot.slot_number,
        prizeId: slot.prize_id,
        prizeName: slot.prize_name,
        isDrawn: slot.is_drawn,
        drawnBy: slot.drawn_by,
        drawnAt: slot.drawn_at,
      }));

      setSlots(slotInfos);
    } catch (error) {
      console.error('載入號碼池失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSlotStyle = (slot: SlotInfo) => {
    if (slot.isDrawn) {
      return 'bg-gray-300 text-gray-500 cursor-not-allowed';
    }
    if (slot.prizeId !== null) {
      return boardType === 'open'
        ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white font-bold'
        : 'bg-gradient-to-br from-emerald-400 to-green-500 text-white';
    }
    return 'bg-gradient-to-br from-emerald-400 to-green-500 text-white';
  };

  const drawnCount = slots.filter(s => s.isDrawn).length;
  const prizeCount = slots.filter(s => s.prizeId !== null).length;
  const drawnPrizeCount = slots.filter(s => s.isDrawn && s.prizeId !== null).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-pink-50">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <i className="ri-grid-line text-rose-500"></i>
              號碼池管理
            </h3>
            <p className="text-sm text-gray-500 mt-1">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Stats */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">總口數</p>
              <p className="text-xl font-bold text-gray-800">{totalSlots}</p>
            </div>
            <div className="bg-white rounded-lg px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">獎品號碼</p>
              <p className="text-xl font-bold text-amber-600">{prizeCount}</p>
            </div>
            <div className="bg-white rounded-lg px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">已抽出</p>
              <p className="text-xl font-bold text-gray-600">{drawnCount}</p>
            </div>
            <div className="bg-white rounded-lg px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">已中獎</p>
              <p className="text-xl font-bold text-rose-600">{drawnPrizeCount}</p>
            </div>
            <div className="bg-white rounded-lg px-4 py-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">剩餘口數</p>
              <p className="text-xl font-bold text-green-600">{remaining}</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="px-6 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-400 to-green-500"></div>
              <span className="text-gray-600">未抽出{boardType === 'open' ? '普通號' : ''}</span>
            </div>
            {boardType === 'open' && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-amber-400 to-yellow-500"></div>
                <span className="text-gray-600">未抽出獎品號</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gray-300"></div>
              <span className="text-gray-600">已抽出</span>
            </div>
          </div>
        </div>

        {/* Slot Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <i className="ri-loader-4-line text-4xl text-gray-300 animate-spin"></i>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-20">
              <i className="ri-inbox-line text-5xl text-gray-300 mb-3"></i>
              <p className="text-gray-500">號碼池尚未初始化</p>
            </div>
          ) : (
            <div className="grid grid-cols-10 gap-2">
              {slots.map((slot) => (
                <div
                  key={slot.slotNumber}
                  className={`aspect-square rounded-lg flex items-center justify-center text-sm font-semibold transition-all ${getSlotStyle(slot)} ${
                    slot.isDrawn ? '' : 'hover:scale-105'
                  }`}
                  title={
                    slot.isDrawn
                      ? `#${slot.slotNumber} - 已抽出${slot.prizeName ? ` (${slot.prizeName})` : ''}`
                      : boardType === 'open' && slot.prizeName
                      ? `#${slot.slotNumber} - ${slot.prizeName}`
                      : `#${slot.slotNumber}`
                  }
                >
                  {slot.slotNumber}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
