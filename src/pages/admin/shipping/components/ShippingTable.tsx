import { useState, useCallback } from 'react';
import type { ShippingBatch, ShippingAddress } from '../hooks/useShippingRecords';
import ShipOrderModal from './ShipOrderModal';

interface ShippingTableProps {
  batches: ShippingBatch[];
  onUpdateStatus: (recordIds: string[], status: 'pending' | 'shipped', trackingNumber?: string) => Promise<void>;
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-TW', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatAddressOnly(a: ShippingAddress) {
  return [a.flatFloor, a.building, a.address, a.district].filter(Boolean).join('，');
}

function formatFullAddress(a: ShippingAddress) {
  const lines: string[] = [];
  if (a.recipientName) lines.push(`收件人：${a.recipientName}`);
  if (a.phone) lines.push(`電話：${a.phone}`);
  if (a.flatFloor) lines.push(`單位/樓層：${a.flatFloor}`);
  if (a.building) lines.push(`大廈：${a.building}`);
  if (a.address) lines.push(`街道：${a.address}`);
  if (a.district) lines.push(`地區：${a.district}`);
  if (a.notes) lines.push(`備註：${a.notes}`);
  return lines.join('\n');
}

function AddressDetailModal({
  address,
  userName,
  onClose,
}: {
  address: ShippingAddress;
  userName: string;
  onClose: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = useCallback(async (text: string, key: string) => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement('textarea');
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1800);
  }, []);

  const fields = [
    [{ label: '收件人姓名', value: address.recipientName, key: 'rName' }, { label: '聯絡電話', value: address.phone, key: 'phone' }],
    [{ label: '單位/樓層', value: address.flatFloor, key: 'flat' }, { label: '大廈名稱/座數', value: address.building, key: 'bldg' }],
    [{ label: '街道門牌', value: address.address, key: 'street' }, { label: '地區', value: address.district, key: 'dist' }],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <i className="ri-map-pin-2-fill text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">收件地址</h3>
              <p className="text-xs text-gray-400">{userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>
        <div className="px-6 py-5 space-y-3">
          {fields.map((row, ri) => (
            <div key={ri} className="grid grid-cols-2 gap-3">
              {row.map((field) => (
                <div key={field.key} className="bg-gray-50 rounded-xl px-3 py-2.5 group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">{field.label}</p>
                    <button onClick={() => copy(field.value, field.key)} className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-gray-200">
                      {copiedField === field.key ? <i className="ri-check-line text-xs text-green-500"></i> : <i className="ri-file-copy-line text-xs text-gray-400"></i>}
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{field.value || '—'}</p>
                </div>
              ))}
            </div>
          ))}
          {address.notes && (
            <div className="bg-amber-50 rounded-xl px-3 py-2.5 group">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-amber-600 font-medium">備註</p>
                <button onClick={() => copy(address.notes, 'notes')} className="w-6 h-6 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-amber-100">
                  {copiedField === 'notes' ? <i className="ri-check-line text-xs text-green-500"></i> : <i className="ri-file-copy-line text-xs text-amber-400"></i>}
                </button>
              </div>
              <p className="text-sm text-amber-800">{address.notes}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => copy(formatAddressOnly(address), 'addrOnly')}
            className="flex-1 py-2 rounded-lg text-sm font-medium cursor-pointer flex items-center justify-center gap-1.5 border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors whitespace-nowrap"
          >
            {copiedField === 'addrOnly' ? <><i className="ri-check-line text-green-500"></i>已複製</> : <><i className="ri-map-pin-line"></i>複製地址</>}
          </button>
          <button
            onClick={() => copy(formatFullAddress(address), 'allInfo')}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            {copiedField === 'allInfo' ? <><i className="ri-check-line text-green-300"></i>已複製</> : <><i className="ri-file-copy-2-line"></i>複製全部</>}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer whitespace-nowrap">
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ShippingTable({ batches, onUpdateStatus }: ShippingTableProps) {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [addressModal, setAddressModal] = useState<{ address: ShippingAddress; userName: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
  const [shipModal, setShipModal] = useState<{
    isOpen: boolean;
    recordIds: string[];
    items: { prizeName: string; prizeImage: string }[];
    userName: string;
    addressSummary: string;
  } | null>(null);

  const toggleExpand = useCallback((key: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleMarkShipped = (batch: ShippingBatch, singleRecordId?: string) => {
    const targetIds = singleRecordId
      ? [singleRecordId]
      : batch.items.filter((i) => i.shippingStatus === 'pending').map((i) => i.id);
    const targetItems = targetIds.map((id) => {
      const item = batch.items.find((i) => i.id === id)!;
      return { prizeName: item.prizeName, prizeImage: item.prizeImage };
    });
    const addr = batch.address;
    const addressSummary = addr
      ? [addr.flatFloor, addr.building, addr.address, addr.district].filter(Boolean).join(', ')
      : '尚未填寫';
    setShipModal({ isOpen: true, recordIds: targetIds, items: targetItems, userName: batch.userName, addressSummary });
  };

  const handleRevertPending = async (recordIds: string[]) => {
    if (confirm('確定要將選定獎品改回「待發貨」狀態嗎？')) {
      await onUpdateStatus(recordIds, 'pending');
    }
  };

  const handleShipConfirm = async (trackingNumber: string) => {
    if (!shipModal) return;
    await onUpdateStatus(shipModal.recordIds, 'shipped', trackingNumber);
    setShipModal(null);
  };

  const getStatusBadge = (status: 'pending' | 'shipped' | 'mixed') => {
    if (status === 'pending') return { className: 'bg-orange-100 text-orange-700', icon: 'ri-time-fill', text: '待發貨' };
    if (status === 'shipped') return { className: 'bg-green-100 text-green-700', icon: 'ri-checkbox-circle-fill', text: '已發貨' };
    return { className: 'bg-amber-100 text-amber-700', icon: 'ri-git-branch-line', text: '部分已發貨' };
  };

  if (batches.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <i className="ri-truck-line text-6xl text-gray-300 mb-4"></i>
        <p className="text-gray-500">目前沒有符合條件的發貨申請</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {batches.map((batch) => {
          const isExpanded = expandedBatches.has(batch.batchKey);
          const statusBadge = getStatusBadge(batch.batchStatus);
          const isBatch = batch.items.length > 1;
          const pendingCount = batch.items.filter((i) => i.shippingStatus === 'pending').length;
          const shippedCount = batch.items.filter((i) => i.shippingStatus === 'shipped').length;

          return (
            <div key={batch.batchKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Batch Header */}
              <div
                className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'border-b border-gray-100' : ''}`}
                onClick={() => toggleExpand(batch.batchKey)}
              >
                {/* Expand icon */}
                <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 flex-shrink-0 transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                  <i className="ri-arrow-right-s-line text-lg"></i>
                </div>

                {/* Prize thumbnails (show up to 3) */}
                <div className="flex -space-x-2 flex-shrink-0">
                  {batch.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="w-10 h-10 rounded-lg border-2 border-white overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.prizeImage ? (
                        <img src={item.prizeImage} alt={item.prizeName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <i className="ri-gift-line text-gray-300 text-sm"></i>
                        </div>
                      )}
                    </div>
                  ))}
                  {batch.items.length > 3 && (
                    <div className="w-10 h-10 rounded-lg border-2 border-white bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-gray-500">+{batch.items.length - 3}</span>
                    </div>
                  )}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{batch.userName}</span>
                    <span className="text-xs text-gray-400">{batch.userEmail}</span>
                    {isBatch && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-full text-xs font-bold text-rose-600 whitespace-nowrap">
                        <i className="ri-stack-line"></i>批量 {batch.items.length} 件
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {batch.address ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); setAddressModal({ address: batch.address!, userName: batch.userName }); }}
                        className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 transition-colors cursor-pointer"
                      >
                        <i className="ri-map-pin-line"></i>
                        <span className="truncate max-w-xs">{[batch.address.flatFloor, batch.address.building, batch.address.address, batch.address.district].filter(Boolean).join('，')}</span>
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1"><i className="ri-map-pin-line"></i>尚未填寫地址</span>
                    )}
                    <span className="text-xs text-gray-400">{formatDate(batch.latestTime)}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  {batch.totalMarketPrice > 0 && (
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-gray-400">總市場價值</p>
                      <p className="text-sm font-bold text-amber-600">HK${batch.totalMarketPrice.toLocaleString()}</p>
                    </div>
                  )}
                  {isBatch && (
                    <div className="text-right hidden md:block">
                      <p className="text-xs text-gray-400">進度</p>
                      <p className="text-sm font-semibold text-gray-700">
                        <span className="text-green-600">{shippedCount}</span>
                        <span className="text-gray-400"> / {batch.items.length}</span>
                      </p>
                    </div>
                  )}
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${statusBadge.className}`}>
                    <i className={`${statusBadge.icon} mr-1`}></i>
                    {statusBadge.text}
                  </span>
                </div>

                {/* Batch actions */}
                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {pendingCount > 0 && (
                    <button
                      onClick={() => handleMarkShipped(batch)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-md transition-all whitespace-nowrap cursor-pointer"
                    >
                      <i className="ri-send-plane-fill mr-1"></i>
                      {isBatch && pendingCount < batch.items.length
                        ? `發貨剩餘 ${pendingCount} 件`
                        : isBatch ? `全部發貨` : '標記已發貨'}
                    </button>
                  )}
                  {batch.batchStatus === 'shipped' && (
                    <button
                      onClick={() => handleRevertPending(batch.items.map((i) => i.id))}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all whitespace-nowrap cursor-pointer"
                    >
                      <i className="ri-arrow-go-back-line mr-1"></i>撤回
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded: individual prize rows */}
              {isExpanded && (
                <div className="divide-y divide-gray-50">
                  {batch.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 px-5 py-3 bg-gray-50/60 hover:bg-gray-50 transition-colors">
                      {/* Indent indicator */}
                      <div className="w-7 flex-shrink-0 flex justify-center">
                        <div className="w-0.5 h-full bg-gray-200 rounded-full"></div>
                      </div>

                      {/* Image */}
                      <div
                        className="relative group cursor-pointer flex-shrink-0"
                        onClick={() => setPreviewImage({ url: item.prizeImage, name: item.prizeName })}
                      >
                        <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden bg-white group-hover:scale-105 transition-transform">
                          {item.prizeImage ? (
                            <img src={item.prizeImage} alt={item.prizeName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className="ri-gift-line text-gray-300 text-lg"></i>
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                          <i className="ri-zoom-in-line text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm"></i>
                        </div>
                      </div>

                      {/* Prize info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.isWin ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-600 border border-orange-200 flex-shrink-0">
                              <i className="ri-trophy-fill text-yellow-500 text-xs"></i>中獎
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex-shrink-0">
                              <i className="ri-playing-cards-line text-slate-400 text-xs"></i>裸卡
                            </span>
                          )}
                          <p className="text-sm font-medium text-gray-800 truncate">{item.prizeName}</p>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{item.productName}</p>
                      </div>

                      {/* Market price */}
                      {item.marketPrice ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-700 whitespace-nowrap flex-shrink-0">
                          HK${item.marketPrice.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 flex-shrink-0">—</span>
                      )}

                      {/* Individual status */}
                      <div className="flex-shrink-0 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          item.shippingStatus === 'shipped'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          <i className={`${item.shippingStatus === 'shipped' ? 'ri-checkbox-circle-fill' : 'ri-time-fill'} mr-1`}></i>
                          {item.shippingStatus === 'shipped' ? '已發貨' : '待發貨'}
                        </span>
                        {item.shippedTime && (
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.shippedTime)}</p>
                        )}
                        {item.trackingNumber && (
                          <p className="text-xs font-mono text-gray-600 mt-0.5">{item.trackingNumber}</p>
                        )}
                      </div>

                      {/* Individual actions */}
                      <div className="flex-shrink-0">
                        {item.shippingStatus === 'pending' && (
                          <button
                            onClick={() => handleMarkShipped(batch, item.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <i className="ri-send-plane-fill mr-1"></i>發貨
                          </button>
                        )}
                        {item.shippingStatus === 'shipped' && (
                          <button
                            onClick={() => handleRevertPending([item.id])}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <i className="ri-arrow-go-back-line mr-1"></i>撤回
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 收件地址彈窗 */}
      {addressModal && (
        <AddressDetailModal
          address={addressModal.address}
          userName={addressModal.userName}
          onClose={() => setAddressModal(null)}
        />
      )}

      {/* 圖片預覽 */}
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
          </div>
        </div>
      )}

      {/* 發貨確認彈窗 */}
      {shipModal && (
        <ShipOrderModal
          isOpen={shipModal.isOpen}
          onClose={() => setShipModal(null)}
          onConfirm={handleShipConfirm}
          items={shipModal.items}
          userName={shipModal.userName}
          addressSummary={shipModal.addressSummary}
        />
      )}
    </>
  );
}
