interface DeleteConfirmModalProps {
  productName: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteConfirmModal({
  productName,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Modal 標題 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-red-100 rounded-full">
              <i className="ri-error-warning-line text-red-600 text-xl"></i>
            </div>
            <h3 className="text-lg font-bold text-gray-800">確認刪除商品</h3>
          </div>
        </div>

        {/* Modal 內容 */}
        <div className="px-6 py-5">
          <p className="text-gray-600 leading-relaxed">
            您確定要刪除商品「<span className="font-semibold text-gray-800">{productName}</span>」嗎？
          </p>
          <p className="mt-2 text-sm text-red-600">此操作無法復原，請謹慎操作。</p>
        </div>

        {/* 按鈕區 */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors font-medium whitespace-nowrap"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium whitespace-nowrap"
          >
            確認刪除
          </button>
        </div>
      </div>
    </div>
  );
}