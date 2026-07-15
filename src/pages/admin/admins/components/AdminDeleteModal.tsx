import { useState } from 'react';
import { EDGE_FUNCTIONS } from '../../../../lib/edgeFunctions';

interface Admin {
  id: string;
  username: string;
}

interface AdminDeleteModalProps {
  admin: Admin;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminDeleteModal({ admin, onClose, onSuccess }: AdminDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(EDGE_FUNCTIONS.adminAuth, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_admin',
          adminId: admin.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || '刪除管理員失敗');
        setIsLoading(false);
        return;
      }

      onSuccess();
    } catch {
      setError('無法連線到伺服器');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">刪除管理員</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <i className="ri-close-line text-xl text-gray-500"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-error-warning-line text-2xl text-red-600"></i>
            </div>
            <div className="flex-1">
              <p className="text-gray-700 mb-2">
                確定要刪除管理員帳號 <span className="font-semibold text-gray-900">「{admin.username}」</span> 嗎？
              </p>
              <p className="text-sm text-red-600">
                此操作無法復原，請謹慎操作。
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2 mb-4">
              <i className="ri-error-warning-line text-lg"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  <span>刪除中...</span>
                </>
              ) : (
                <>
                  <i className="ri-delete-bin-line"></i>
                  <span>確認刪除</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}