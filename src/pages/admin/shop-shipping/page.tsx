import { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import PrivateRoute from '@/components/admin/PrivateRoute';
import { useShopOrders } from './hooks/useShopOrders';
import type { ShopOrderRecord } from './hooks/useShopOrders';

function formatDate(d: string) {
  return new Date(d).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface ShipModalState {
  orderId: string;
  userName: string;
  items: { productName: string; productImage: string; quantity: number }[];
  addressSummary: string;
}

function ShipModal({ data, onConfirm, onClose }: { data: ShipModalState; onConfirm: (tracking: string) => void; onClose: () => void }) {
  const [tracking, setTracking] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800">確認發貨</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"><i className="ri-close-line text-lg"></i></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            {data.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-gray-100 flex-shrink-0">
                  {item.productImage ? <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><i className="ri-image-line text-gray-300"></i></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-400">× {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-600"><span className="font-medium">收件人：</span>{data.userName}</div>
          <div className="text-sm text-gray-600"><span className="font-medium">地址：</span>{data.addressSummary}</div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">追蹤號碼（選填）</label>
            <input type="text" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="請輸入快遞追蹤號碼" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 cursor-pointer whitespace-nowrap">取消</button>
          <button onClick={async () => { setSaving(true); await onConfirm(tracking); setSaving(false); }} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm hover:shadow-md cursor-pointer disabled:opacity-60 whitespace-nowrap">
            {saving ? <span className="flex items-center justify-center gap-1"><i className="ri-loader-4-line animate-spin"></i>處理中</span> : '確認發貨'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminShopShippingPage() {
  const { orders, loading, updateOrderStatus } = useShopOrders();
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'shipped'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [shipModal, setShipModal] = useState<ShipModalState | null>(null);

  const filtered = orders.filter((o) => {
    const matchFilter = activeFilter === 'all' || o.status === activeFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || o.userName.toLowerCase().includes(q) || o.userEmail.toLowerCase().includes(q) || o.recipientName.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const shippedCount = orders.filter((o) => o.status === 'shipped').length;

  const openShipModal = (order: ShopOrderRecord) => {
    const addrParts = [order.flatFloor, order.building, order.address, order.district].filter(Boolean);
    setShipModal({
      orderId: order.id,
      userName: order.recipientName || order.userName,
      items: order.items,
      addressSummary: addrParts.join('，') || '尚未填寫',
    });
  };

  const handleShipConfirm = async (tracking: string) => {
    if (!shipModal) return;
    await updateOrderStatus(shipModal.orderId, 'shipped', tracking);
    setShipModal(null);
  };

  return (
    <PrivateRoute>
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">商城訂單發貨</h1>
              <p className="text-sm text-gray-500 mt-1">管理會員直接購買商品的發貨訂單</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-200 rounded-lg">
              <i className="ri-store-2-line text-rose-500"></i>
              <span className="text-sm text-rose-700 font-medium">商城訂單</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: '全部訂單', value: orders.length, filter: 'all' as const, color: 'border-gray-200 bg-white', textColor: 'text-gray-800' },
              { label: '待發貨', value: pendingCount, filter: 'pending' as const, color: 'border-orange-200 bg-orange-50', textColor: 'text-orange-600' },
              { label: '已發貨', value: shippedCount, filter: 'shipped' as const, color: 'border-green-200 bg-green-50', textColor: 'text-green-600' },
            ].map((stat) => (
              <button key={stat.filter} onClick={() => setActiveFilter(stat.filter)} className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${stat.color} ${activeFilter === stat.filter ? 'ring-2 ring-rose-400' : ''}`}>
                <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="relative max-w-sm">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input type="text" placeholder="搜尋用戶名稱、電郵..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400" />
            </div>
          </div>

          {/* Orders */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <i className="ri-loader-4-line text-4xl text-gray-300 animate-spin mb-4"></i>
              <p className="text-gray-500">載入中...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <i className="ri-shopping-bag-line text-5xl text-gray-200 mb-3"></i>
              <p className="text-gray-500">暫無符合條件的訂單</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => {
                const addrParts = [order.flatFloor, order.building, order.address, order.district].filter(Boolean);
                return (
                  <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Product thumbnails */}
                      <div className="flex -space-x-2 flex-shrink-0">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="w-10 h-10 rounded-lg border-2 border-white overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.productImage ? <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><i className="ri-image-line text-gray-300 text-sm"></i></div>}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-10 h-10 rounded-lg border-2 border-white bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-gray-500">+{order.items.length - 3}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-800">{order.userName}</span>
                          <span className="text-xs text-gray-400">{order.userEmail}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 rounded-full text-xs font-bold text-rose-600 whitespace-nowrap">
                            <i className="ri-store-2-line"></i>{order.items.length} 件商品
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {addrParts.length > 0 ? (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <i className="ri-map-pin-line text-teal-500"></i>
                              {order.recipientName && <span className="font-medium">{order.recipientName}・</span>}
                              {addrParts.join('，')}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">尚未填寫地址</span>
                          )}
                          <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-xs font-bold text-rose-500">{order.totalPoints.toLocaleString()} CTP</span>
                          {order.items.map((item, i) => (
                            <span key={i} className="text-xs text-gray-400 ml-2">{item.productName} ×{item.quantity}</span>
                          ))}
                        </div>
                      </div>

                      {/* Status + Actions */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${order.status === 'shipped' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          <i className={order.status === 'shipped' ? 'ri-checkbox-circle-fill' : 'ri-time-fill'}></i>
                          {order.status === 'shipped' ? '已發貨' : '待發貨'}
                        </span>
                        {order.status === 'pending' && (
                          <button onClick={() => openShipModal(order)} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-md transition-all whitespace-nowrap cursor-pointer">
                            <i className="ri-send-plane-fill mr-1"></i>發貨
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <div className="text-right">
                            {order.trackingNumber && <p className="text-xs font-mono text-gray-600">{order.trackingNumber}</p>}
                            {order.shippedAt && <p className="text-xs text-gray-400">{formatDate(order.shippedAt)}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {shipModal && (
          <ShipModal data={shipModal} onConfirm={handleShipConfirm} onClose={() => setShipModal(null)} />
        )}
      </AdminLayout>
    </PrivateRoute>
  );
}
