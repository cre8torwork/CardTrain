import { useState } from 'react';
import { EDGE_FUNCTIONS } from '../../../../lib/edgeFunctions';
import type { AdminUser } from '../hooks/useAllUsers';

interface Props {
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = 'add' | 'deduct';

export default function AdjustPointsModal({ user, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<Mode>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const parsedAmount = parseInt(amount, 10);
  const isValid = !isNaN(parsedAmount) && parsedAmount > 0;
  const resultBalance =
    isValid
      ? mode === 'add'
        ? user.pointsBalance + parsedAmount
        : user.pointsBalance - parsedAmount
      : user.pointsBalance;
  const willGoNegative = mode === 'deduct' && isValid && resultBalance < 0;

  const handleSubmit = async () => {
    if (!isValid) {
      setError('請輸入有效的積分數量（正整數）');
      return;
    }
    if (willGoNegative) {
      setError(`扣除後餘額將為負數，目前餘額僅 ${user.pointsBalance.toLocaleString()} CTP`);
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const adjustedAmount = mode === 'add' ? parsedAmount : -parsedAmount;
      const res = await fetch(EDGE_FUNCTIONS.adminOperations, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_points',
          userId: user.id,
          amount: adjustedAmount,
          description: reason.trim() || (mode === 'add' ? '管理員手動增加積分' : '管理員手動扣除積分'),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || '操作失敗');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || '操作失敗，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  const quickAmounts = [100, 500, 1000, 5000, 10000];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-white">
              <i className="ri-coin-line text-xl"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">手動調整積分</h3>
              <p className="text-xs text-gray-500">{user.displayName}（{user.email}）</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* 目前餘額 */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">目前 CTP 餘額</span>
            <span className="text-lg font-bold text-rose-600">{user.pointsBalance.toLocaleString()} CTP</span>
          </div>

          {/* 增加 / 扣除 切換 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">操作類型</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setMode('add'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer whitespace-nowrap ${
                  mode === 'add'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-emerald-300'
                }`}
              >
                <i className="ri-add-circle-line text-base"></i>
                增加積分
              </button>
              <button
                onClick={() => { setMode('deduct'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer whitespace-nowrap ${
                  mode === 'deduct'
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-rose-300'
                }`}
              >
                <i className="ri-indeterminate-circle-line text-base"></i>
                扣除積分
              </button>
            </div>
          </div>

          {/* 快速選擇 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">快速選擇</p>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  onClick={() => { setAmount(String(q)); setError(''); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                    amount === String(q)
                      ? mode === 'add'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {q.toLocaleString()} CTP
                </button>
              ))}
            </div>
          </div>

          {/* 自訂數量 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">自訂數量</p>
            <div className="relative">
              <input
                type="number"
                min="1"
                placeholder="輸入積分數量..."
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(''); }}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">CTP</span>
            </div>
          </div>

          {/* 備註原因 */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">備註原因 <span className="text-gray-400 font-normal">（選填）</span></p>
            <input
              type="text"
              placeholder="例如：活動獎勵、補償積分..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={100}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 transition"
            />
          </div>

          {/* 調整後預覽 */}
          {isValid && (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between border ${
              willGoNegative
                ? 'bg-rose-50 border-rose-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <span className="text-sm text-gray-600">調整後餘額</span>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${mode === 'add' ? 'text-emerald-600' : 'text-rose-500'} font-medium`}>
                  {mode === 'add' ? `+${parsedAmount.toLocaleString()}` : `-${parsedAmount.toLocaleString()}`} CTP
                </span>
                <span className="text-gray-400">→</span>
                <span className={`text-base font-bold ${willGoNegative ? 'text-rose-600' : 'text-gray-800'}`}>
                  {resultBalance.toLocaleString()} CTP
                </span>
              </div>
            </div>
          )}

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
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !isValid || willGoNegative}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                mode === 'add'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                  : 'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700'
              }`}
            >
              {submitting ? (
                <><i className="ri-loader-4-line animate-spin"></i> 處理中...</>
              ) : (
                <><i className={mode === 'add' ? 'ri-add-circle-line' : 'ri-indeterminate-circle-line'}></i>
                  確認{mode === 'add' ? '增加' : '扣除'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
