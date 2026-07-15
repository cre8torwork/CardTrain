import type { AdminDrawRecord, UserInfo } from '../hooks/useAllDrawRecords';

const RARITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  C:  { bg: 'bg-gray-100',    text: 'text-gray-600',    border: 'border-gray-200' },
  B:  { bg: 'bg-sky-50',      text: 'text-sky-600',     border: 'border-sky-200' },
  A:  { bg: 'bg-purple-50',   text: 'text-purple-600',  border: 'border-purple-200' },
  S:  { bg: 'bg-yellow-50',   text: 'text-yellow-600',  border: 'border-yellow-300' },
  SS: { bg: 'bg-rose-50',     text: 'text-rose-600',    border: 'border-rose-300' },
  N:  { bg: 'bg-slate-100',   text: 'text-slate-500',   border: 'border-slate-200' },
};

interface Props {
  records: AdminDrawRecord[];
  users: UserInfo[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function DrawRecordsTable({
  records, currentPage, totalPages, totalCount, pageSize, onPageChange,
}: Props) {
  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <i className="ri-list-check text-rose-500"></i>
          抽獎紀錄列表
        </h3>
        {totalCount > 0 && (
          <span className="text-xs text-gray-400">
            顯示第 {startIndex}–{endIndex} 筆，共 {totalCount} 筆
          </span>
        )}
      </div>

      {records.length === 0 ? (
        <div className="py-24 text-center text-gray-400">
          <div className="w-16 h-16 flex items-center justify-center mx-auto mb-3">
            <i className="ri-inbox-line text-5xl text-gray-300"></i>
          </div>
          <p className="text-sm">目前沒有符合條件的抽獎紀錄</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">用戶</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">商品</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">分類</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">抽中號碼</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">抽獎結果</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">稀有度</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">消費金額</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">推估市值</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap">抽獎時間</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((record) => {
                  const style = RARITY_STYLES[record.rarity] ?? RARITY_STYLES['C'];
                  return (
                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                      {/* 用戶 */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-rose-400 to-pink-500 rounded-full text-white text-xs font-bold flex-shrink-0">
                            {record.userDisplayName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate max-w-[100px]">{record.userDisplayName}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[100px]">{record.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      {/* 商品 */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            <img src={record.productImage} alt={record.productName} className="w-full h-full object-cover" />
                          </div>
                          <p className="text-gray-700 truncate max-w-[160px]">{record.productName}</p>
                        </div>
                      </td>
                      {/* 分類 */}
                      <td className="px-5 py-3">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
                          {record.productCategory}
                        </span>
                      </td>
                      {/* 抽中號碼 */}
                      <td className="px-5 py-3">
                        {record.slotNumbers && record.slotNumbers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {record.slotNumbers.map((num, idx) => (
                              <span key={idx} className="inline-flex items-center justify-center px-2 py-0.5 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded text-xs font-bold whitespace-nowrap">
                                #{num}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {/* 結果 */}
                      <td className="px-5 py-3">
                        <p className="text-gray-700 truncate max-w-[160px]">{record.result}</p>
                      </td>
                      {/* 稀有度 */}
                      <td className="px-5 py-3 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.bg} ${style.text} ${style.border} whitespace-nowrap`}>
                          {record.rarity}
                        </span>
                      </td>
                      {/* 消費金額 */}
                      <td className="px-5 py-3 text-right">
                        <span className="font-semibold text-gray-700 whitespace-nowrap">HK${record.price.toLocaleString()}</span>
                      </td>
                      {/* 推估市值 */}
                      <td className="px-5 py-3 text-right">
                        <span className="font-semibold text-rose-500 whitespace-nowrap">HK${record.estimatedValue.toLocaleString()}</span>
                      </td>
                      {/* 時間 */}
                      <td className="px-5 py-3 text-right">
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDateTime(record.drawnAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 分頁 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer whitespace-nowrap"
              >
                <i className="ri-arrow-left-s-line"></i>
              </button>
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => onPageChange(p as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition cursor-pointer whitespace-nowrap ${
                      currentPage === p
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer whitespace-nowrap"
              >
                <i className="ri-arrow-right-s-line"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}