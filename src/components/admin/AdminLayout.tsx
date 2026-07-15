import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useIdleTimer } from '../../hooks/useIdleTimer';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  type: 'item';
  path: string;
  icon: string;
  label: string;
  badge?: number;
}

interface MenuGroup {
  type: 'group';
  icon: string;
  label: string;
  badge?: number;
  children: MenuItem[];
}

type MenuEntry = MenuItem | MenuGroup;

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const adminUsername = sessionStorage.getItem('admin_username') || '管理員';
  const [pendingMsgCount, setPendingMsgCount] = useState(0);
  const [pendingShipCount, setPendingShipCount] = useState(0);
  const shippingPaths = ['/admin/shipping', '/admin/shop-shipping'];
  const settingsPaths = ['/admin/settings', '/admin/users', '/admin/admins'];
  const productsPaths = ['/admin/products', '/admin/shop-products'];
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial: string[] = [];
    if (shippingPaths.includes(window.location.pathname)) initial.push('發貨管理');
    if (settingsPaths.includes(window.location.pathname)) initial.push('系統管理');
    if (productsPaths.includes(window.location.pathname)) initial.push('商品管理');
    return new Set(initial);
  });

  useEffect(() => {
    const fetchPendingMsgCount = async () => {
      try {
        const { count, error } = await supabase
          .from('contact_messages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (error) throw error;
        setPendingMsgCount(count ?? 0);
      } catch {
        setPendingMsgCount(0);
      }
    };
    fetchPendingMsgCount();
    const interval = setInterval(fetchPendingMsgCount, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  useEffect(() => {
    const fetchPendingShipCount = async () => {
      try {
        const { count, error } = await supabase
          .from('shipping_status')
          .select('record_id', { count: 'exact', head: true })
          .eq('status', 'pending');
        if (error) throw error;
        setPendingShipCount(count ?? 0);
      } catch {
        setPendingShipCount(0);
      }
    };
    fetchPendingShipCount();
    const interval = setInterval(fetchPendingShipCount, 15000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Auto-expand group when navigating to a child route, collapse when leaving
  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (shippingPaths.includes(location.pathname)) next.add('發貨管理');
      else next.delete('發貨管理');
      if (settingsPaths.includes(location.pathname)) next.add('系統管理');
      else next.delete('系統管理');
      if (productsPaths.includes(location.pathname)) next.add('商品管理');
      else next.delete('商品管理');
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleLogout = useCallback(() => {
    if (confirm('確定要登出嗎？')) {
      sessionStorage.removeItem('admin_logged_in');
      sessionStorage.removeItem('admin_username');
      sessionStorage.removeItem('admin_role');
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleIdleLogout = useCallback(() => {
    sessionStorage.removeItem('admin_logged_in');
    sessionStorage.removeItem('admin_username');
    sessionStorage.removeItem('admin_role');
    navigate('/admin/login?reason=idle');
  }, [navigate]);

  const { resetTimer } = useIdleTimer({
    enabled: true,
    onIdle: handleIdleLogout,
  });
  void resetTimer;

  const menuEntries: MenuEntry[] = [
    { type: 'item', path: '/admin/dashboard', icon: 'ri-dashboard-line', label: '儀表板' },
    {
      type: 'group',
      icon: 'ri-shopping-bag-line',
      label: '商品管理',
      children: [
        { type: 'item', path: '/admin/products', icon: 'ri-gift-line', label: '福袋商品' },
        { type: 'item', path: '/admin/shop-products', icon: 'ri-store-2-line', label: '商城商品' },
      ],
    },
    { type: 'item', path: '/admin/categories', icon: 'ri-price-tag-3-line', label: '分類管理' },
    { type: 'item', path: '/admin/draws', icon: 'ri-history-line', label: '抽獎紀錄' },
    { type: 'item', path: '/admin/winners', icon: 'ri-trophy-line', label: '中獎記錄' },
    {
      type: 'group',
      icon: 'ri-truck-line',
      label: '發貨管理',
      badge: pendingShipCount,
      children: [
        { type: 'item', path: '/admin/shipping', icon: 'ri-gift-2-line', label: '福袋發貨', badge: pendingShipCount },
        { type: 'item', path: '/admin/shop-shipping', icon: 'ri-store-2-line', label: '商城發貨' },
      ],
    },
    { type: 'item', path: '/admin/messages', icon: 'ri-mail-line', label: '聯絡訊息', badge: pendingMsgCount },
    {
      type: 'group',
      icon: 'ri-settings-3-line',
      label: '系統管理',
      children: [
        { type: 'item', path: '/admin/settings', icon: 'ri-settings-4-line', label: '系統設定' },
        { type: 'item', path: '/admin/users', icon: 'ri-user-3-line', label: '用戶管理' },
        { type: 'item', path: '/admin/admins', icon: 'ri-admin-line', label: '管理員帳號' },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // For top header title
  const allItems: MenuItem[] = menuEntries.flatMap((e) =>
    e.type === 'item' ? [e] : e.children
  );
  const activeItem = allItems.find((item) => isActive(item.path));

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 側邊欄 */}
      <aside
        className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col flex-shrink-0`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {isSidebarOpen && (
            <div className="flex items-center gap-3">
              <img
                src="https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/4fb725be38a8c1d83dfde3f8650bd7f1.png"
                alt="Card Train"
                className="h-8"
              />
              <span className="font-bold text-gray-800 text-sm">後台管理</span>
            </div>
          )}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <i className={`${isSidebarOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'} text-lg`}></i>
          </button>
        </div>

        {/* 選單 */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {menuEntries.map((entry) => {
            if (entry.type === 'item') {
              return (
                <button
                  key={entry.path}
                  onClick={() => navigate(entry.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isActive(entry.path)
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-rose-600'
                  }`}
                >
                  <i className={`${entry.icon} text-xl flex-shrink-0`}></i>
                  {isSidebarOpen && (
                    <span className="text-sm font-medium flex-1 text-left">{entry.label}</span>
                  )}
                  {entry.badge !== undefined && entry.badge > 0 && (
                    <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                      isActive(entry.path) ? 'bg-white/30 text-white' : 'bg-rose-500 text-white'
                    }`}>
                      {entry.badge}
                    </span>
                  )}
                </button>
              );
            }

            // Group
            const isGroupExpanded = expandedGroups.has(entry.label);
            const isGroupActive = entry.children.some((c) => isActive(c.path));

            return (
              <div key={entry.label}>
                {/* Group header */}
                <button
                  onClick={() => { if (isSidebarOpen) toggleGroup(entry.label); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    isGroupActive && !isGroupExpanded
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                      : isGroupActive
                      ? 'bg-rose-50 text-rose-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-rose-600'
                  }`}
                >
                  <i className={`${entry.icon} text-xl flex-shrink-0`}></i>
                  {isSidebarOpen && (
                    <>
                      <span className="text-sm font-medium flex-1 text-left">{entry.label}</span>
                      {entry.badge !== undefined && entry.badge > 0 && (
                        <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                          isGroupActive && !isGroupExpanded ? 'bg-white/30 text-white' : 'bg-rose-500 text-white'
                        }`}>
                          {entry.badge}
                        </span>
                      )}
                      <i className={`${isGroupExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} text-sm flex-shrink-0 transition-transform duration-200`}></i>
                    </>
                  )}
                </button>

                {/* Sub-menu items */}
                {isSidebarOpen && isGroupExpanded && (
                  <div className="mt-0.5 ml-3 pl-3 border-l-2 border-gray-100 space-y-0.5">
                    {entry.children.map((child) => (
                      <button
                        key={child.path}
                        onClick={() => navigate(child.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                          isActive(child.path)
                            ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-md'
                            : 'text-gray-500 hover:bg-gray-100 hover:text-rose-600'
                        }`}
                      >
                        <i className={`${child.icon} text-base flex-shrink-0`}></i>
                        <span className="text-sm font-medium flex-1 text-left">{child.label}</span>
                        {child.badge !== undefined && child.badge > 0 && (
                          <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                            isActive(child.path) ? 'bg-white/30 text-white' : 'bg-rose-500 text-white'
                          }`}>
                            {child.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* 登出 */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all whitespace-nowrap cursor-pointer"
          >
            <i className="ri-logout-box-line text-xl"></i>
            {isSidebarOpen && <span className="text-sm font-medium">登出</span>}
          </button>
        </div>
      </aside>

      {/* 主要內容區 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 頂部導覽列 */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-800">
              {activeItem?.label || 'Card Train 後台'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-full text-sm font-bold">
                {adminUsername.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">管理員</span>
                <span className="text-sm font-medium text-gray-800">{adminUsername}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <i className="ri-logout-box-line"></i>
              <span>登出</span>
            </button>
          </div>
        </header>

        {/* 頁面內容 */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
