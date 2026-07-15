import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { supabase } from '../../../lib/supabase';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'completed';
}

type FilterStatus = 'all' | 'pending' | 'completed';

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: ContactMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        name: msg.name,
        email: msg.email,
        subject: msg.subject,
        message: msg.message,
        createdAt: msg.created_at,
        status: msg.status,
      }));

      setMessages(formatted);
    } catch (error) {
      console.error('載入訊息失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = messages.length;
  const pendingCount = messages.filter((m) => m.status === 'pending').length;
  const completedCount = messages.filter((m) => m.status === 'completed').length;

  const filtered = messages.filter((m) => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const handleToggleStatus = async (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg) return;

    const newStatus = msg.status === 'pending' ? 'completed' : 'pending';

    try {
      const { error } = await supabase
        .from('contact_messages')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
      );
    } catch (error) {
      console.error('更新狀態失敗:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMessages((prev) => prev.filter((m) => m.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (error) {
      console.error('刪除訊息失敗:', error);
    }
  };

  const handleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statsCards = [
    {
      label: '總訊息數',
      value: totalCount,
      icon: 'ri-mail-line',
      bg: 'bg-rose-50',
      iconColor: 'text-rose-500',
      border: 'border-rose-100',
    },
    {
      label: '未處理',
      value: pendingCount,
      icon: 'ri-mail-unread-line',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      border: 'border-amber-100',
    },
    {
      label: '已完成',
      value: completedCount,
      icon: 'ri-checkbox-circle-line',
      bg: 'bg-green-50',
      iconColor: 'text-green-500',
      border: 'border-green-100',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div>
          <h2 className="text-xl font-bold text-gray-800">聯絡訊息</h2>
          <p className="text-sm text-gray-500 mt-1">查看並管理客戶透過聯絡我們頁面發送的訊息</p>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-3 gap-4">
          {statsCards.map((card) => (
            <div
              key={card.label}
              className={`${card.bg} border ${card.border} rounded-xl p-5 flex items-center gap-4`}
            >
              <div className={`w-12 h-12 flex items-center justify-center rounded-lg bg-white shadow-sm`}>
                <i className={`${card.icon} text-2xl ${card.iconColor}`}></i>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 篩選器 */}
        <div className="flex items-center gap-2">
          {(['all', 'pending', 'completed'] as FilterStatus[]).map((s) => {
            const labels: Record<FilterStatus, string> = {
              all: '全部',
              pending: '未處理',
              completed: '已完成',
            };
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  filter === s
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500'
                }`}
              >
                {labels[s]}
                {s === 'pending' && pendingCount > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${filter === s ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-600'}`}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 訊息列表 */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <i className="ri-loader-4-line animate-spin text-5xl mb-3"></i>
              <p className="text-base font-medium">載入中...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400">
              <i className="ri-inbox-line text-5xl mb-3"></i>
              <p className="text-base font-medium">目前沒有訊息</p>
              <p className="text-sm mt-1">客戶透過聯絡我們頁面發送的訊息將顯示於此</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((msg) => (
                <div key={msg.id} className="transition-all">
                  {/* 訊息列 */}
                  <div
                    className={`flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      msg.status === 'pending' ? 'bg-amber-50/30' : ''
                    }`}
                    onClick={() => handleExpand(msg.id)}
                  >
                    {/* 狀態指示點 */}
                    <div className="mt-1 flex-shrink-0">
                      {msg.status === 'pending' ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 block"></span>
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400 block"></span>
                      )}
                    </div>

                    {/* 訊息資訊 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">{msg.name}</span>
                        <span className="text-gray-400 text-xs">{msg.email}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          msg.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {msg.status === 'pending' ? '未處理' : '已完成'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-700 mt-1">{msg.subject}</p>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{msg.message}</p>
                    </div>

                    {/* 時間 & 展開箭頭 */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <span className="text-xs text-gray-400">{formatDate(msg.createdAt)}</span>
                      <i className={`ri-arrow-${expandedId === msg.id ? 'up' : 'down'}-s-line text-gray-400 text-lg`}></i>
                    </div>
                  </div>

                  {/* 展開詳情 */}
                  {expandedId === msg.id && (
                    <div className="px-6 pb-5 bg-gray-50 border-t border-gray-100">
                      <div className="pt-4 space-y-4">
                        {/* 完整訊息 */}
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">訊息內容</p>
                          <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {msg.message}
                          </div>
                        </div>

                        {/* 聯絡資訊 */}
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">姓名</p>
                            <p className="font-medium text-gray-800">{msg.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Email</p>
                            <a href={`mailto:${msg.email}`} className="font-medium text-rose-500 hover:underline cursor-pointer">
                              {msg.email}
                            </a>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">發送時間</p>
                            <p className="font-medium text-gray-800">{formatDate(msg.createdAt)}</p>
                          </div>
                        </div>

                        {/* 操作按鈕 */}
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleStatus(msg.id); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                              msg.status === 'pending'
                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                          >
                            <i className={msg.status === 'pending' ? 'ri-checkbox-circle-line' : 'ri-refresh-line'}></i>
                            <span>{msg.status === 'pending' ? '標記為已完成' : '標記為未處理'}</span>
                          </button>
                          <a
                            href={`mailto:${msg.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all whitespace-nowrap cursor-pointer"
                          >
                            <i className="ri-reply-line"></i>
                            <span>回覆 Email</span>
                          </a>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 hover:bg-red-100 text-red-500 transition-all whitespace-nowrap cursor-pointer ml-auto"
                          >
                            <i className="ri-delete-bin-line"></i>
                            <span>刪除</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}