import { useState } from 'react';

interface ShipOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (trackingNumber: string) => void;
  prizeName: string;
  userName: string;
  addressSummary: string;
}

export default function ShipOrderModal({
  isOpen,
  onClose,
  onConfirm,
  prizeName,
  userName,
  addressSummary,
}: ShipOrderModalProps) {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!trackingNumber.trim()) {
      alert('請輸入運輸單號');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(trackingNumber.trim());
      setTrackingNumber('');
      onClose();
    } catch (error) {
      console.error('發貨失敗:', error);
      alert('發貨失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTrackingNumber('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* 標題區 */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full">
                <i className="ri-truck-line text-white text-xl"></i>
              </div>
              <h2 className="text-xl font-bold text-white">確認發貨</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>
        </div>

        {/* 內容區 */}
        <div className="p-6 space-y-5">
          {/* 獎品資訊 */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-2">
              <i className="ri-gift-line text-green-600 text-lg mt-0.5"></i>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">獎品名稱</p>
                <p className="text-sm font-semibold text-gray-800">{prizeName}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <i className="ri-user-line text-green-600 text-lg mt-0.5"></i>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">中獎者</p>
                <p className="text-sm font-semibold text-gray-800">{userName}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <i className="ri-map-pin-line text-green-600 text-lg mt-0.5"></i>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">收件地址</p>
                <p className="text-sm text-gray-700 leading-relaxed">{addressSummary}</p>
              </div>
            </div>
          </div>

          {/* 運輸單號輸入 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              運輸單號 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="請輸入運輸單號"
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-2">
              <i className="ri-information-line mr-1"></i>
              請輸入物流公司提供的運輸單號，用戶將可在前台查看
            </p>
          </div>
        </div>

        {/* 按鈕區 */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !trackingNumber.trim()}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
          >
            {isSubmitting ? (
              <>
                <i className="ri-loader-4-line animate-spin"></i>
                處理中...
              </>
            ) : (
              <>
                <i className="ri-check-line"></i>
                確認發貨
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}