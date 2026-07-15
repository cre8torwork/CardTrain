import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import type { WinnerRecord } from '../hooks/useWinnerRecords';
import ShipOrderModal from './ShipOrderModal';

interface ShippingAddress {
  recipientName: string;
  phone: string;
  flatFloor: string;
  building: string;
  address: string;
  district: string;
  notes: string;
}

interface WinnerTableProps {
  records: WinnerRecord[];
  onUpdateStatus: (recordId: string, status: 'pending' | 'shipped', trackingNumber?: string) => void;
}

export default function WinnerTable({ records, onUpdateStatus }: WinnerTableProps) {
  const [addressMap, setAddressMap] = useState<Record<string, ShippingAddress | null>>({});
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [addressModal, setAddressModal] = useState<{ address: ShippingAddress; userName: string } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [shipModalData, setShipModalData] = useState<{
    isOpen: boolean;
    recordId: string;
    prizeName: string;
    userName: string;
    addressSummary: string;
  } | null>(null);

  useEffect(() => {
    if (records.length === 0) return;
    const recordIds = records.map(r => r.id);
    supabase
      .from('shipping_addresses')
      .select('*')
      .in('record_id', recordIds)
      .then(({ data, error }) => {
        if (error) { console.error('讀取收件地址失敗:', error); return; }
        const map: Record<string, ShippingAddress | null> = {};
        (data || []).forEach((row: any) => {
          map[row.record_id] = {
            recipientName: row.recipient_name || '',
            phone: row.phone || '',
            flatFloor: row.flat_floor || '',
            building: row.building || '',
            address: row.address || '',
            district: row.district || '',
            notes: row.notes || '',
          };
        });
        setAddressMap(map);
      });
  }, [records]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImage(null);
        setAddressModal(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const handleStatusChange = (recordId: string, currentStatus: string) => {
    if (currentStatus === 'pending') {
      const record = records.find(r => r.id === recordId);
      if (!record) return;
      const address = addressMap[recordId];
      const addressSummary = address
        ? [address.flatFloor, address.building, address.address, address.district].filter(Boolean).join(', ')
        : '尚未填寫';
      setShipModalData({ isOpen: true, recordId, prizeName: record.prizeName, userName: record.userName, addressSummary });
    } else if (currentStatus === 'shipped') {
      if (confirm('確定要將此獎品改回「待發貨」狀態嗎？')) {
        onUpdateStatus(recordId, 'pending');
      }
    }
  };

  const handleShipConfirm = async (trackingNumber: string) => {
    if (!shipModalData) return;
    await onUpdateStatus(shipModalData.recordId, 'shipped', trackingNumber);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_requested': return { className: 'bg-gray-100 text-gray-600', icon: 'ri-inbox-line', text: '未申請發貨' };
      case 'pending': return { className: 'bg-orange-100 text-orange-700', icon: 'ri-time-fill', text: '待發貨' };
      case 'shipped': return { className: 'bg-green-100 text-green-700', icon: 'ri-checkbox-circle-fill', text: '已發貨' };
      default: return { className: 'bg-gray-100 text-gray-600', icon: 'ri-question-line', text: '未知狀態' };
    }
  };

  const copyToClipboard = useCallback(async (text: string, fieldKey: string) => {
    if (!text || text === '—') return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 1800);
    }
  }, []);

  const formatFullAddress = useCallback((addr: ShippingAddress): string => {
    const lines: string[] = [];
    if (addr.recipientName) lines.push(`收件人：${addr.recipientName}`);
    if (addr.phone) lines.push(`電話：${addr.phone}`);
    if (addr.flatFloor) lines.push(`單位/樓層：${addr.flatFloor}`);
    if (addr.building) lines.push(`大廈：${addr.building}`);
    if (addr.address) lines.push(`街道：${addr.address}`);
    if (addr.district) lines.push(`地區：${addr.district}`);
    if (addr.notes) lines.push(`備註：${addr.notes}`);
    return lines.join('\n');
  }, []);

  const formatAddressOnly = useCallback((addr: ShippingAddress): string => {
    return [addr.flatFloor, addr.building, addr.address, addr.district]
      .filter(Boolean)
      .join('，');
  }, []);

  if (records.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <i className="ri-inbox-line text-6xl text-gray-300 mb-4"></i>
        <p className="text-gray-500">目前沒有符合條件的中獎紀錄</p>
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">獎品資訊</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">所屬商品</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">中獎者</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">獎品市場價格</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">收件地址</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">抽獎時間</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">發貨狀態</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">運輸單號</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((record) => {
                const address = addressMap[record.id] ?? null;
                const statusBadge = getStatusBadge(record.shippingStatus);
                const hasAddress = address !== null && address !== undefined;
                return (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative group cursor-pointer flex-shrink-0" onClick={() => setPreviewImage({ url: record.prizeImage, name: record.prizeName })}>
                          <img src={record.prizeImage} alt={record.prizeName} className="w-16 h-16 object-cover rounded-lg border border-gray-200 transition-transform duration-200 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-all duration-200 flex items-center justify-center">
                            <i className="ri-zoom-in-line text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></i>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{record.prizeName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-800">{record.productName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{record.userName}</p>
                        <p className="text-xs text-gray-500 mt-1">{record.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {record.marketPrice !== undefined && record.marketPrice !== null ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
                          <i className="ri-price-tag-3-line text-amber-600 text-sm"></i>
                          <span className="font-bold text-amber-700 whitespace-nowrap">HK$ {record.marketPrice.toLocaleString()}</span>
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {hasAddress ? (
                        <button
                          onClick={() => setAddressModal({ address: address!, userName: record.userName })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <i className="ri-map-pin-line"></i>
                          查看地址
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-400 cursor-not-allowed whitespace-nowrap">
                          <i className="ri-map-pin-line"></i>
                          尚未填寫
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{formatDate(record.drawTime)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge.className}`}>
                          <i className={`${statusBadge.icon} mr-1`}></i>
                          {statusBadge.text}
                        </span>
                        {record.shippedTime && (
                          <p className="text-xs text-gray-500 mt-1">{formatDate(record.shippedTime)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.trackingNumber ? (
                        <div className="flex items-center gap-2">
                          <i className="ri-truck-line text-green-600"></i>
                          <span className="text-sm font-mono text-gray-800">{record.trackingNumber}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {record.shippingStatus === 'pending' && (
                        <button onClick={() => handleStatusChange(record.id, record.shippingStatus)} className="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg">
                          <i className="ri-send-plane-fill mr-1"></i>標記已發貨
                        </button>
                      )}
                      {record.shippingStatus === 'shipped' && (
                        <button onClick={() => handleStatusChange(record.id, record.shippingStatus)} className="px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer bg-gray-100 text-gray-600 hover:bg-gray-200">
                          <i className="ri-arrow-go-back-line mr-1"></i>改回待發貨
                        </button>
                      )}
                      {record.shippingStatus === 'not_requested' && (
                        <span className="text-xs text-gray-400 italic">等待用戶申請</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 圖片放大預覽 */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-2xl w-full mx-4 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer">
              <i className="ri-close-line text-xl"></i>
            </button>
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full">
              <img src={previewImage.url} alt={previewImage.name} className="w-full max-h-[70vh] object-contain" />
            </div>
            <p className="mt-4 text-white text-sm font-medium text-center px-4">{previewImage.name}</p>
            <p className="mt-1 text-white/50 text-xs">點擊外部區域或按 ESC 關閉</p>
          </div>
        </div>
      )}

      {/* 收件地址彈窗 */}
      {addressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setAddressModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <i className="ri-map-pin-2-fill text-sm"></i>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">收件地址</h3>
                  <p className="text-xs text-gray-400">{addressModal.userName}</p>
                </div>
              </div>
              <button onClick={() => setAddressModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-3">
              {/* 收件人 + 電話 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">收件人姓名</p>
                    <button
                      onClick={() => copyToClipboard(addressModal.address.recipientName, 'recipientName')}
                      className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-gray-200"
                      title="複製"
                    >
                      {copiedField === 'recipientName'
                        ? <i className="ri-check-line text-xs text-green-500"></i>
                        : <i className="ri-file-copy-line text-xs text-gray-400"></i>}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{addressModal.address.recipientName || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">聯絡電話</p>
                    <button
                      onClick={() => copyToClipboard(addressModal.address.phone, 'phone')}
                      className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-gray-200"
                      title="複製"
                    >
                      {copiedField === 'phone'
                        ? <i className="ri-check-line text-xs text-green-500"></i>
                        : <i className="ri-file-copy-line text-xs text-gray-400"></i>}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{addressModal.address.phone || '—'}</p>
                </div>
              </div>

              {/* 單位 + 大廈 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">單位/樓層</p>
                    <button
                      onClick={() => copyToClipboard(addressModal.address.flatFloor, 'flatFloor')}
                      className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-gray-200"
                      title="複製"
                    >
                      {copiedField === 'flatFloor'
                        ? <i className="ri-check-line text-xs text-green-500"></i>
                        : <i className="ri-file-copy-line text-xs text-gray-400"></i>}
                    </button>
                  </div>
                  <p className="text-sm text-gray-800">{addressModal.address.flatFloor || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">大廈名稱/座數</p>
                    <button
                      onClick={() => copyToClipboard(addressModal.address.building, 'building')}
                      className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-gray-200"
                      title="複製"
                    >
                      {copiedField === 'building'
                        ? <i className="ri-check-line text-xs text-green-500"></i>
                        : <i className="ri-file-copy-line text-xs text-gray-400"></i>}
                    </button>
                  </div>
                  <p className="text-sm text-gray-800">{addressModal.address.building || '—'}</p>
                </div>
              </div>

              {/* 街道 + 地區 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">街道門牌</p>
                    <button
                      onClick={() => copyToClipboard(addressModal.address.address, 'street')}
                      className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-gray-200"
                      title="複製"
                    >
                      {copiedField === 'street'
                        ? <i className="ri-check-line text-xs text-green-500"></i>
                        : <i className="ri-file-copy-line text-xs text-gray-400"></i>}
                    </button>
                  </div>
                  <p className="text-sm text-gray-800">{addressModal.address.address || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5 group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">地區</p>
                    <button
                      onClick={() => copyToClipboard(addressModal.address.district, 'district')}
                      className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-gray-200"
                      title="複製"
                    >
                      {copiedField === 'district'
                        ? <i className="ri-check-line text-xs text-green-500"></i>
                        : <i className="ri-file-copy-line text-xs text-gray-400"></i>}
                    </button>
                  </div>
                  <p className="text-sm text-gray-800">{addressModal.address.district || '—'}</p>
                </div>
              </div>

              {/* 備註 */}
              {addressModal.address.notes && (
                <div className="bg-amber-50 rounded-xl px-3 py-2.5 group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-amber-600 font-medium">備註</p>
                    <button
                      onClick={() => copyToClipboard(addressModal.address.notes, 'notes')}
                      className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-amber-100"
                      title="複製"
                    >
                      {copiedField === 'notes'
                        ? <i className="ri-check-line text-xs text-green-500"></i>
                        : <i className="ri-file-copy-line text-xs text-amber-400"></i>}
                    </button>
                  </div>
                  <p className="text-sm text-amber-800">{addressModal.address.notes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => copyToClipboard(formatAddressOnly(addressModal.address), 'addressOnly')}
                className="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100"
              >
                {copiedField === 'addressOnly'
                  ? <><i className="ri-check-line text-green-500"></i>已複製地址</>
                  : <><i className="ri-map-pin-line"></i>複製地址</>}
              </button>
              <button
                onClick={() => copyToClipboard(formatFullAddress(addressModal.address), 'all')}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-900 text-white"
              >
                {copiedField === 'all'
                  ? <><i className="ri-check-line text-green-300"></i>已複製全部</>
                  : <><i className="ri-file-copy-2-line"></i>複製全部資料</>}
              </button>
              <button onClick={() => setAddressModal(null)} className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap">
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 發貨確認彈窗 */}
      {shipModalData && (
        <ShipOrderModal
          isOpen={shipModalData.isOpen}
          onClose={() => setShipModalData(null)}
          onConfirm={handleShipConfirm}
          prizeName={shipModalData.prizeName}
          userName={shipModalData.userName}
          addressSummary={shipModalData.addressSummary}
        />
      )}
    </>
  );
}