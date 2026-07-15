interface DeleteCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  categoryName: string;
  productCount: number;
}

export const DeleteCategoryModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  categoryName,
  productCount 
}: DeleteCategoryModalProps) => {
  if (!isOpen) return null;

  const canDelete = productCount === 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100 mb-4">
            <i className="ri-error-warning-line text-2xl text-red-600"></i>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {canDelete ? '確認刪除分類' : '無法刪除分類'}
          </h3>
          
          {canDelete ? (
            <p className="text-gray-600 mb-6">
              確定要刪除「{categoryName}」分類嗎？此操作無法復原。
            </p>
          ) : (
            <div className="text-gray-600 mb-6">
              <p className="mb-2">
                無法刪除「{categoryName}」分類，因為此分類下還有 <strong className="text-red-600">{productCount}</strong> 個商品。
              </p>
              <p className="text-sm text-gray-500">
                請先將這些商品移至其他分類或刪除後，再刪除此分類。
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              {canDelete ? '取消' : '知道了'}
            </button>
            {canDelete && (
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
              >
                確認刪除
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};