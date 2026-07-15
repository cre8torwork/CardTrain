import { useState } from 'react';
import type { WinnerRecord } from '../hooks/useWinnerRecords';

interface WinnerRecordsTableProps {
  records: WinnerRecord[];
}

export default function WinnerRecordsTable({ records }: WinnerRecordsTableProps) {
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_requested': return { className: 'bg-gray-100 text-gray-500', icon: 'ri-inbox-line', text: '未申請發貨' };
      case 'pending': return { className: 'bg-orange-100 text-orange-700', icon: 'ri-time-fill', text: '待發貨' };
      case 'shipped': return { className: 'bg-green-100 text-green-700', icon: 'ri-checkbox-circle-fill', text: '已發貨' };
      default: return { className: 'bg-gray-100 text-gray-500', icon: 'ri-question-line', text: '未知' };
    }
  };

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <i className="ri-trophy-line text-6xl text-gray-300 mb-4"></i>
        <p className="text-gray-500">目前沒有符合條件的中獎記錄</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">獎品資訊</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">所屬商品</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">中獎會員</th>
                <th className="px-5 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">市場價格</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">抽獎時間</th>
                <th className="px-5 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">發貨狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((record, idx) => {
                const statusBadge = getStatusBadge(record.shippingStatus);
                return (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="text-sm text-gray-400 font-mono">{idx + 1}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="relative group cursor-pointer flex-shrink-0"
                          onClick={() => setPreviewImage({ url: record.prizeImage, name: record.prizeName })}
                        >
                          <img
                            src={record.prizeImage}
                            alt={record.prizeName}
                            className="w-14 h-14 object-cover rounded-lg border border-gray-200 group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-all flex items-center justify-center">
                            <i className="ri-zoom-in-line text-white opacity-0 group-hover:opacity-100 transition-opacity"></i>
                          </div>
                        </div>
                        <p className="font-medium text-gray-800 text-sm">{record.prizeName}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-700">{record.productName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-800">{record.userName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{record.userEmail}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {record.marketPrice ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <i className="ri-price-tag-3-line text-amber-600 text-xs"></i>
                          <span className="font-bold text-amber-700 text-sm whitespace-nowrap">
                            HK${record.marketPrice.toLocaleString()}
                          </span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-600">{formatDate(record.drawTime)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge.className}`}>
                        <i className={`${statusBadge.icon} mr-1`}></i>
                        {statusBadge.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-2xl w-full mx-4 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
            <div className="bg-white rounded-2xl overflow-hidden w-full">
              <img src={previewImage.url} alt={previewImage.name} className="w-full max-h-[70vh] object-contain" />
            </div>
            <p className="mt-4 text-white text-sm font-medium">{previewImage.name}</p>
            <p className="mt-1 text-white/50 text-xs">點擊外部或按 ESC 關閉</p>
          </div>
        </div>
      )}
    </>
  );
}
