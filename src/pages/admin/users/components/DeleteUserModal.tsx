import { useState } from 'react';
import type { AdminUser } from '../hooks/useAllUsers';

interface Props {
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteUserModal({ user, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(
        'https://cdsrzczbnbhlmiebxzfb.supabase.co/functions/v1/delete-user',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || '刪除失敗');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '刪除失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-rose-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-red-500 to-rose-600 rounded-xl text-white">
              <i className="ri-user-unfollow-line text-xl"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">刪除用戶</h3>
              <p className="text-xs text-gray-500">此操作無法復原</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 用戶資訊 */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
            <div className="w-11 h-11 flex items-center justify-center bg-gradient-to-br from-rose-400 to-pink-500 rounded-full text-white text-base font-bold shrink-0">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-800">{user.displayName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* 警告說明 */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-red-700 flex items-center gap-1.5">
              <i className="ri-error-warning-line"></i>
              刪除後將永久移除以下所有資料：
            </p>
            <ul className="text-sm text-red-600 space-y-1 pl-5 list-disc">
              <li>用戶帳號及登入資格</li>
              <li>所有抽獎紀錄（共 {user.totalDraws} 筆）</li>
              <li>積分餘額（{user.pointsBalance.toLocaleString()} CTP）</li>
              <li>收貨地址及出貨紀錄</li>
            </ul>
          </div>

          {/* 錯誤提示 */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
              <i className="ri-error-warning-line shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleDelete}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><i className="ri-loader-4-line animate-spin"></i> 刪除中...</>
              ) : (
                <><i className="ri-delete-bin-line"></i> 確認刪除</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
