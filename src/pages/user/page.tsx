import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUserAuth } from '../../hooks/useUserAuth';
import { useDrawHistory } from '../../hooks/useDrawHistory';
import { usePointsStore } from '../../hooks/usePointsStore';
import { useMemberLevel } from '../../hooks/useMemberLevel';
import SiteHeader from '../../components/feature/SiteHeader';
import SiteFooter from '../../components/feature/SiteFooter';
import { supabase } from '../../lib/supabase';
import RedeemConfirmModal from '../../components/feature/RedeemConfirmModal';
import ShippingRequestModal from './components/ShippingRequestModal';
import ProfileSettingsModal from './components/ProfileSettingsModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import RecentWinnersBanner from '../home/components/RecentWinnersBanner';
import type { ShopOrderRecord } from '../admin/shop-shipping/hooks/useShopOrders';

// 等級徽章樣式
const LEVEL_BADGE_STYLES: Record<string, {
  bg: string;
  text: string;
  border: string;
  icon: string;
  extra?: React.CSSProperties;
}> = {
  BEGINNER: { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200', icon: 'ri-seedling-line' },
  STANDARD: { bg: '', text: 'text-white', border: 'border-0', icon: 'ri-user-star-line', extra: { background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' } },
  ADVANCE:  { bg: '', text: 'text-white', border: 'border-0', icon: 'ri-shield-star-line', extra: { background: 'linear-gradient(135deg, #10b981, #0d9488)' } },
  EXPERT:   { bg: '', text: 'text-white', border: 'border-0', icon: 'ri-medal-2-line', extra: { background: 'linear-gradient(135deg, #7c3aed, #4c1d95)' } },
  PREMIUM:  { bg: '', text: 'text-white', border: 'border-0', icon: 'ri-vip-diamond-line', extra: { background: 'linear-gradient(135deg, #f59e0b, #b45309)' } },
  MASTER:   { bg: '', text: 'text-white', border: 'border-0', icon: 'ri-trophy-fill', extra: { background: 'linear-gradient(135deg, #1e1b4b, #4c1d95)' } },
  LEGEND:   { bg: '', text: 'text-white', border: 'border-0', icon: 'ri-sparkling-2-fill', extra: { background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' } },
};

// 縮小版會員卡樣式配置
const MINI_CARD_STYLES: Record<string, {
  bg: string;
  rankColor: string;
  nameColor: string;
  subColor: string;
  progressBg: string;
  progressFill: string;
  discountBg: string;
  discountText: string;
  border: string;
  shadow: string;
  icon: string;
  gradientStyle?: React.CSSProperties;
}> = {
  BEGINNER: {
    bg: 'bg-white', border: 'border border-gray-200', shadow: 'shadow-sm',
    rankColor: 'text-gray-400', nameColor: 'text-gray-700', subColor: 'text-gray-400',
    progressBg: 'bg-gray-100', progressFill: 'bg-gray-300',
    discountBg: 'bg-gray-100', discountText: 'text-gray-500', icon: 'ri-seedling-line',
  },
  STANDARD: {
    bg: '', border: 'border-0', shadow: 'shadow-md',
    rankColor: 'text-sky-200', nameColor: 'text-white', subColor: 'text-sky-200',
    progressBg: 'bg-white/20', progressFill: 'bg-white/80',
    discountBg: 'bg-white/20', discountText: 'text-white', icon: 'ri-user-star-line',
    gradientStyle: { background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)' },
  },
  ADVANCE: {
    bg: '', border: 'border-0', shadow: 'shadow-md',
    rankColor: 'text-emerald-100', nameColor: 'text-white', subColor: 'text-emerald-100',
    progressBg: 'bg-white/20', progressFill: 'bg-white/80',
    discountBg: 'bg-white/20', discountText: 'text-white', icon: 'ri-shield-star-line',
    gradientStyle: { background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #0d9488 100%)' },
  },
  EXPERT: {
    bg: '', border: 'border-0', shadow: 'shadow-lg',
    rankColor: 'text-violet-200', nameColor: 'text-white', subColor: 'text-violet-200',
    progressBg: 'bg-white/15', progressFill: 'bg-violet-200',
    discountBg: 'bg-white/15', discountText: 'text-violet-100', icon: 'ri-medal-2-line',
    gradientStyle: { background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 40%, #4c1d95 100%)' },
  },
  PREMIUM: {
    bg: '', border: 'border-0', shadow: 'shadow-xl',
    rankColor: 'text-yellow-200', nameColor: 'text-white', subColor: 'text-yellow-200',
    progressBg: 'bg-black/20', progressFill: 'bg-yellow-300',
    discountBg: 'bg-black/20', discountText: 'text-yellow-100', icon: 'ri-vip-diamond-line',
    gradientStyle: { background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 40%, #b45309 100%)' },
  },
  MASTER: {
    bg: '', border: 'border-0', shadow: 'shadow-2xl',
    rankColor: 'text-yellow-300', nameColor: 'text-white', subColor: 'text-violet-300',
    progressBg: 'bg-white/10', progressFill: 'bg-yellow-400',
    discountBg: 'bg-yellow-400/20', discountText: 'text-yellow-200', icon: 'ri-trophy-fill',
    gradientStyle: { background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' },
  },
  LEGEND: {
    bg: '', border: 'border-0', shadow: 'shadow-2xl',
    rankColor: 'text-pink-300', nameColor: 'text-white', subColor: 'text-pink-200',
    progressBg: 'bg-white/10', progressFill: 'bg-gradient-to-r from-yellow-400 to-pink-400',
    discountBg: 'bg-yellow-400/20', discountText: 'text-yellow-200', icon: 'ri-sparkling-2-fill',
    gradientStyle: { background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 40%, #24243e 100%)' },
  },
};

const LEVEL_LABEL_KEYS: Record<string, string> = {
  BEGINNER: 'member.beginner',
  STANDARD: 'member.standard',
  ADVANCE: 'member.advance',
  EXPERT: 'member.expert',
  PREMIUM: 'member.premium',
  MASTER: 'member.master',
  LEGEND: 'member.legend',
};

const RARITY_STYLE_BASES: Record<
  string,
  { bg: string; text: string; border: string; labelKey: string }
> = {
  C:  { bg: 'bg-gray-100',   text: 'text-gray-600',   border: 'border-gray-200',  labelKey: 'rarity.label.C' },
  B:  { bg: 'bg-sky-50',     text: 'text-sky-600',    border: 'border-sky-200',   labelKey: 'rarity.label.B' },
  A:  { bg: 'bg-purple-50',  text: 'text-purple-600', border: 'border-purple-200',labelKey: 'rarity.label.A' },
  S:  { bg: 'bg-yellow-50',  text: 'text-yellow-600', border: 'border-yellow-300',labelKey: 'rarity.label.S' },
  SS: { bg: 'bg-rose-50',    text: 'text-rose-600',   border: 'border-rose-300',  labelKey: 'rarity.label.SS' },
  N:  { bg: 'bg-slate-100',  text: 'text-slate-500',  border: 'border-slate-200', labelKey: 'rarity.label.N' },
};

const POINTS_PER_CARD = 5;

const POKEMON_AR_CARDS = [
  '皮卡丘 AR', '伊布 AR', '卡比獸 AR', '喵喵 AR', '可達鴨 AR',
  '傑尼龜 AR', '小火龍 AR', '妙蛙種子 AR', '波波 AR', '胖丁 AR',
  '夢幻 AR', '超夢 AR', '快龍 AR', '化石翼龍 AR', '菊草葉 AR',
  '火球鼠 AR', '水躍魚 AR', '皮丘 AR', '伊布 AR', '太陽伊布 AR',
  '月亮伊布 AR', '水伊布 AR', '雷伊布 AR', '火伊布 AR', '葉伊布 AR',
  '冰伊布 AR', '超能伊布 AR', '妖精伊布 AR', '小磁怪 AR', '頑皮熊貓 AR',
  '蚊香蝌蚪 AR', '可愛球 AR', '向日種子 AR', '毽子草 AR', '木木梟 AR',
  '火稚雞 AR', '泳圈小子 AR', '幸福蛋 AR', '勾魂眼 AR', '夢夢蝌蚪 AR',
  '小遺靈 AR', '小班 AR', '小拳石 AR', '小鋸鱷 AR', '小鋸鱷 AR',
];

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatTimestamp(ts: number | string): string {
  if (!ts) return '—';
  const d = new Date(typeof ts === 'number' ? ts : Number(ts));
  if (isNaN(d.getTime())) return String(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const FALLBACK_PRIZE_IMAGE = 'https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/5250fa4331b28dcfbabf0d582e3bf142.png';
const NAKED_CARD_IMAGE = 'https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/5250fa4331b28dcfbabf0d582e3bf142.png';

function UserPage() {
  const { t } = useTranslation();
  const { currentUser, isLoggedIn, loading, logout } = useUserAuth();
  const { history, updateRecord } = useDrawHistory(currentUser?.id ?? null);
  const { memberInfo } = useMemberLevel(currentUser?.id ?? '');
  const {
    currentPoints,
    setCurrentPoints,
    pointTransactions,
    setPointTransactions,
    setTotalSpent,
    getPoints,
    addPoints,
    redeemCardsForPoints,
    getTransactionHistory,
    getTotalSpent,
  } = usePointsStore();

  const navigate = useNavigate();
  const location = useLocation();

  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [shippingStatusCache, setShippingStatusCache] = useState<
    Record<string, { status: 'not_requested' | 'pending' | 'shipped'; shippedTime?: string; trackingNumber?: string }>
  >({});
  const [filterType, setFilterType] = useState<'all' | 'win' | 'naked' | 'redeemed'>('all');
  const [filterRarity, setFilterRarity] = useState<'all' | 'SS' | 'S' | 'A' | 'B' | 'C' | 'N'>('all');
  // 發貨申請 Tab 篩選狀態
  const [filterShippingType, setFilterShippingType] = useState<'all' | 'win' | 'naked'>('all');
  const [filterShippingStatus, setFilterShippingStatus] = useState<'all' | 'not_requested' | 'pending' | 'shipped'>('all');

  // 分頁狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50 | 100>(20);

  // Tab 狀態
  const [activeTab, setActiveTab] = useState<'history' | 'prizes' | 'points' | 'orders'>('history');

  // 商城訂單
  const [shopOrders, setShopOrders] = useState<ShopOrderRecord[]>([]);
  const [shopOrdersLoading, setShopOrdersLoading] = useState(false);

  const loadShopOrders = useCallback(async (userId: string) => {
    try {
      setShopOrdersLoading(true);
      const { data: ordersData, error } = await supabase
        .from('shop_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!ordersData || ordersData.length === 0) { setShopOrders([]); return; }
      const orderIds = ordersData.map((o: any) => o.id);
      const { data: itemsData } = await supabase.from('shop_order_items').select('*').in('order_id', orderIds);
      const itemsMap: Record<string, any[]> = {};
      (itemsData || []).forEach((item: any) => {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push(item);
      });
      const mapped: ShopOrderRecord[] = ordersData.map((o: any) => ({
        id: o.id, userId: o.user_id, userName: '', userEmail: '',
        totalPoints: o.total_points, status: o.status,
        recipientName: o.recipient_name || '', phone: o.phone || '',
        flatFloor: o.flat_floor || '', building: o.building || '',
        address: o.address || '', district: o.district || '',
        notes: o.notes || '', trackingNumber: o.tracking_number || '',
        shippedAt: o.shipped_at, createdAt: o.created_at,
        items: (itemsMap[o.id] || []).map((item: any) => ({
          id: item.id, productName: item.product_name, productImage: item.product_image,
          quantity: item.quantity, unitPrice: item.unit_price,
        })),
      }));
      setShopOrders(mapped);
    } catch (err) {
      console.error('載入商城訂單失敗:', err);
    } finally {
      setShopOrdersLoading(false);
    }
  }, []);

  // 裸卡選取狀態
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // 換分彈窗狀態
  const [redeemModal, setRedeemModal] = useState<{
    records: typeof history;
    mode: 'single' | 'batch';
  } | null>(null);

  // 換分成功提示
  const [redeemSuccess, setRedeemSuccess] = useState<{ count: number; points: number } | null>(null);

  // 發貨申請彈窗狀態
  const [shippingRequestModal, setShippingRequestModal] = useState<{
    prizes: { recordId: string; prizeName: string; prizeImage?: string }[];
  } | null>(null);

  // 中獎紀錄選取狀態
  const [selectedPrizeIds, setSelectedPrizeIds] = useState<Set<string>>(new Set());

  // 個人設定彈窗
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [profileShipping, setProfileShipping] = useState({
    recipientName: '',
    contactPhone: '',
    shippingFlatFloor: '',
    shippingBuilding: '',
    shippingStreet: '',
    shippingDistrict: '',
  });
  // 顯示用的暱稱（可被設定更新）
  const [displayNameOverride, setDisplayNameOverride] = useState<string | null>(null);

  // 載入用戶預設收貨資料
  const loadProfileShipping = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('users')
        .select('recipient_name, contact_phone, shipping_flat_floor, shipping_building, shipping_street, shipping_district')
        .eq('id', userId)
        .maybeSingle();
      if (data) {
        setProfileShipping({
          recipientName: data.recipient_name || '',
          contactPhone: data.contact_phone || '',
          shippingFlatFloor: data.shipping_flat_floor || '',
          shippingBuilding: data.shipping_building || '',
          shippingStreet: data.shipping_street || '',
          shippingDistrict: data.shipping_district || '',
        });
      }
    } catch (err) {
      console.error('載入收貨資料失敗:', err);
    }
  }, []);

  const loadPointsData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [ptResult, txns, spent] = await Promise.all([
        getPoints(currentUser.id),
        getTransactionHistory(currentUser.id),
        getTotalSpent(currentUser.id),
      ]);
      setCurrentPoints(ptResult.points);
      setPointTransactions(txns);
      setTotalSpent(spent);
    } catch (e) {
      console.error('載入積分資料失敗:', e);
    }
  }, [currentUser, getPoints, getTransactionHistory, getTotalSpent, setCurrentPoints, setPointTransactions, setTotalSpent]);

  const refreshShippingStatuses = useCallback(async () => {
    // Include ALL non-redeemed records (both winning prizes and naked cards)
    const shippableRecords = history.filter((r) => !r.redeemedForPoints);
    if (shippableRecords.length === 0) return;
    const ids = shippableRecords.map((r) => r.id);
    try {
      const { data } = await supabase
        .from('shipping_status')
        .select('record_id, status, shipped_time, tracking_number')
        .in('record_id', ids);

      const cache: Record<string, { status: 'not_requested' | 'pending' | 'shipped'; shippedTime?: string; trackingNumber?: string }> = {};
      shippableRecords.forEach((r) => { cache[r.id] = { status: 'not_requested' }; });
      (data || []).forEach((row: any) => {
        cache[row.record_id] = {
          status: row.status || 'not_requested',
          shippedTime: row.shipped_time,
          trackingNumber: row.tracking_number,
        };
      });
      setShippingStatusCache(cache);
    } catch (err) {
      console.error('載入寄送狀態失敗:', err);
    }
  }, [history]);

  useEffect(() => {
    loadPointsData();
  }, [loadPointsData]);

  useEffect(() => {
    if (currentUser?.id) {
      loadProfileShipping(currentUser.id);
    }
  }, [currentUser?.id, loadProfileShipping]);

  useEffect(() => {
    if (currentUser?.id && activeTab === 'orders') {
      loadShopOrders(currentUser.id);
    }
  }, [currentUser?.id, activeTab, loadShopOrders]);

  useEffect(() => {
    if (location.state && (location.state as { pointsRefresh?: boolean }).pointsRefresh) {
      loadPointsData();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, loadPointsData, navigate, location.pathname]);

  useEffect(() => {
    refreshShippingStatuses();
  }, [refreshShippingStatuses]);

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, loading, navigate]);

  const getRedeemPoints = useCallback((record: import('../../hooks/useDrawHistory').DrawRecord): number => {
    if (record.isWin) {
      return record.marketValue && record.marketValue > 0 ? record.marketValue : POINTS_PER_CARD;
    }
    return POINTS_PER_CARD;
  }, []);

  const handleRedeemConfirm = useCallback(
    async (ids: string[]) => {
      if (!currentUser) return;
      const redeemingRecords = history.filter((r) => ids.includes(r.id));
      try {
        const result = await redeemCardsForPoints(currentUser.id, ids);
        if (!result.success) {
          console.error(t('user.redeemFail') + ':', result.error);
          return;
        }
        // Edge Function 已處理所有標記，前端只需更新本地狀態
        ids.forEach((id) => updateRecord(id, { redeemedForPoints: true }));
        setRedeemModal(null);
        setSelectedCardIds(new Set());
        const totalPoints = result.totalPoints || redeemingRecords.reduce((sum, r) => sum + getRedeemPoints(r), 0);
        setRedeemSuccess({ count: ids.length, points: totalPoints });
        await loadPointsData();
        setTimeout(() => setRedeemSuccess(null), 3500);
      } catch (e) {
        console.error(t('user.redeemFail') + ':', e);
      }
    },
    [currentUser, redeemCardsForPoints, updateRecord, loadPointsData, history, getRedeemPoints]
  );

  const toggleSelectCard = useCallback((id: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleShippingRequestSuccess = useCallback(() => {
    setShippingRequestModal(null);
    setSelectedPrizeIds(new Set());
    setAddressRefreshKey((k) => k + 1);
    refreshShippingStatuses();
  }, [refreshShippingStatuses]);

  const handleBannerClick = () => {
    if (unRequestedPrizes.length > 0) {
      setShippingRequestModal({
        prizes: unRequestedPrizes.map((r) => ({
          recordId: r.id,
          prizeName: r.prizeName || r.result,
          prizeImage: r.prizeImage,
        })),
      });
    }
  };

  const handleProfileSaved = useCallback((updated: {
    displayName: string;
    recipientName: string;
    contactPhone: string;
    shippingFlatFloor: string;
    shippingBuilding: string;
    shippingStreet: string;
    shippingDistrict: string;
  }) => {
    setDisplayNameOverride(updated.displayName);
    setProfileShipping({
      recipientName: updated.recipientName,
      contactPhone: updated.contactPhone,
      shippingFlatFloor: updated.shippingFlatFloor,
      shippingBuilding: updated.shippingBuilding,
      shippingStreet: updated.shippingStreet,
      shippingDistrict: updated.shippingDistrict,
    });
  }, []);

  const handlePasswordChangeSuccess = useCallback(() => {}, []);

  // 資料過濾
  const filteredHistory = history.filter((record) => {
    const typeMatch =
      filterType === 'all' ? true
      : filterType === 'win' ? record.isWin
      : filterType === 'naked' ? !record.isWin && !record.redeemedForPoints
      : filterType === 'redeemed' ? record.redeemedForPoints
      : true;
    const rarityMatch = filterRarity === 'all' ? true : record.rarity === filterRarity;
    return typeMatch && rarityMatch;
  });

  const prizeRecords = history.filter((r) => r.isWin);
  const totalSSR = history.filter((r) => ['SS', 'S'].includes(r.rarity)).length;
  const nakedCardRecords = history.filter((r) => !r.isWin);
  const unredeemed = nakedCardRecords.filter((r) => !r.redeemedForPoints);

  const unRequestedPrizes = prizeRecords.filter((r) => {
    const status = shippingStatusCache[r.id];
    return (!status || status.status === 'not_requested') && !r.redeemedForPoints;
  });
  const hasUnRequestedShipping = unRequestedPrizes.length > 0 && !dismissedBanner;

  const currentDisplayName = displayNameOverride ?? currentUser?.displayName ?? '';

  // 分頁計算
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedHistory = filteredHistory.slice((safePage - 1) * pageSize, safePage * pageSize);

  // 篩選條件改變時重置到第一頁
  const handleFilterTypeChange = (val: typeof filterType) => {
    setFilterType(val);
    setCurrentPage(1);
  };
  const handleFilterRarityChange = (val: typeof filterRarity) => {
    setFilterRarity(val);
    setCurrentPage(1);
  };
  const handlePageSizeChange = (val: 10 | 20 | 50 | 100) => {
    setPageSize(val);
    setCurrentPage(1);
  };

  const allRedeemable = history.filter((r) => {
    if (r.redeemedForPoints) return false;
    const shippingStatus = shippingStatusCache[r.id]?.status;
    if (shippingStatus === 'pending' || shippingStatus === 'shipped') return false;
    return true;
  });

  // 當前篩選結果中可換分的紀錄
  const filteredRedeemable = filteredHistory.filter((r) => {
    if (r.redeemedForPoints) return false;
    const shippingStatus = shippingStatusCache[r.id]?.status;
    if (shippingStatus === 'pending' || shippingStatus === 'shipped') return false;
    return true;
  });

  // 計算已選取的總積分（支援裸卡 + 中獎）
  const selectedTotalPoints = history
    .filter((r) => selectedCardIds.has(r.id))
    .reduce((sum, r) => sum + getRedeemPoints(r), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <i className="ri-loader-4-line animate-spin text-4xl text-rose-400"></i>
          <p className="text-gray-500 text-sm">{t('user.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* 使用共用 Header */}
      <SiteHeader activePage="user" />

      {/* 即時中獎動態 Banner */}
      <RecentWinnersBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* 換分成功提示 */}
        {redeemSuccess && (
          <div
            className="mb-6 rounded-2xl overflow-hidden shadow-lg border-2 border-amber-300"
            style={{ animation: 'redeemSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 px-4 py-4 flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-white/30 rounded-full flex-shrink-0">
                <i className="ri-coin-fill text-xl text-white"></i>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">{t('user.redeemSuccess')}</p>
                <p className="text-white/90 text-xs">
                  {t('user.redeemSuccessDetail', { count: redeemSuccess.count, points: redeemSuccess.points })}
                </p>
              </div>
              <button
                onClick={() => setRedeemSuccess(null)}
                className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white cursor-pointer flex-shrink-0"
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
          </div>
        )}

        {/* 未申請發貨提醒橫幅 */}
        {hasUnRequestedShipping && (
          <div className="mb-6 rounded-2xl overflow-hidden shadow-lg border-2 border-orange-300">
            <div className="bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 px-4 py-4 flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center bg-white/30 rounded-full flex-shrink-0">
                <i className="ri-gift-2-fill text-xl text-white"></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-white font-bold text-sm">{t('user.congrats')}</span>
                  <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    {t('user.pendingItems', { n: unRequestedPrizes.length })}
                  </span>
                </div>
                <p className="text-white/90 text-xs mb-3">
                  {t('user.pendingDesc', { n: unRequestedPrizes.length })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBannerClick}
                    className="px-4 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-bold text-xs hover:from-rose-600 hover:to-pink-600 transition-all shadow whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                  >
                    <i className="ri-truck-line"></i>
                    {t('user.applyShipping')}
                  </button>
                  <button
                    onClick={() => setDismissedBanner(true)}
                    className="px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                  >
                    {t('user.later')}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setDismissedBanner(true)}
                className="w-7 h-7 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-all cursor-pointer flex-shrink-0"
              >
                <i className="ri-close-line text-sm"></i>
              </button>
            </div>
            <div className="bg-orange-100 px-4 py-2 flex items-center gap-2">
              <i className="ri-information-line text-orange-400 text-sm flex-shrink-0"></i>
              <p className="text-orange-600 text-xs">{t('user.shippingNote')}</p>
            </div>
          </div>
        )}

        {/* User Info Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-rose-100 p-4 sm:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-5 sm:gap-8">
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-rose-400 shadow-lg bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center">
                <i className="ri-user-3-fill text-4xl sm:text-5xl text-rose-400"></i>
              </div>
              <p className="text-xs text-gray-400 whitespace-nowrap">{t('user.joinDate', { date: formatDate(currentUser.createdAt ?? '') })}</p>
            </div>

            <div className="flex-1 w-full min-w-0">
              <div className="flex flex-col gap-3 mb-5">
                {/* 名字、電郵、會員卡 並排 */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="text-center sm:text-left min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-all">{currentDisplayName}</h2>
                    <p className="text-sm text-gray-400 mt-1 break-all">{currentUser.email}</p>
                    {memberInfo && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t(LEVEL_LABEL_KEYS[memberInfo.currentLevel.name] ?? 'member.beginner')}
                        {memberInfo.nextLevel && (
                          <span className="ml-2">
                            · {t('user.pointsToNext', { points: memberInfo.pointsToNextLevel.toLocaleString(), level: memberInfo.nextLevel.name })}
                          </span>
                        )}
                        {!memberInfo.nextLevel && <span className="ml-1 text-yellow-500 font-semibold">· {t('user.maxLevelBadge')}</span>}
                      </p>
                    )}
                  </div>

                  {/* 縮小版會員卡 */}
                  {memberInfo && (() => {
                    const lvl = memberInfo.currentLevel.name;
                    const cs = MINI_CARD_STYLES[lvl] ?? MINI_CARD_STYLES['BEGINNER'];
                    const isColored = lvl !== 'BEGINNER';
                    const isLegend = lvl === 'LEGEND';
                    const isMaster = lvl === 'MASTER';
                    const isPremium = lvl === 'PREMIUM';
                    const isExpert = lvl === 'EXPERT';
                    const { currentLevel, levelPoints, discount, nextLevel, progressPercent } = memberInfo;

                    return (
                      <div className="flex-shrink-0 w-full sm:w-56">
                        <div
                          className={`relative rounded-xl overflow-hidden ${cs.border} ${cs.shadow} ${cs.bg}`}
                          style={isColored && cs.gradientStyle ? cs.gradientStyle : {}}
                        >
                          {/* Legend 彩虹光暈 */}
                          {isLegend && (
                            <>
                              <div className="absolute inset-0 opacity-15" style={{
                                background: 'conic-gradient(from 0deg at 50% 50%, #ec4899, #8b5cf6, #06b6d4, #10b981, #f59e0b, #ec4899)',
                                animation: 'spin 12s linear infinite',
                                filter: 'blur(12px)',
                              }} />
                              <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, #ec4899, #fbbf24, #8b5cf6, #06b6d4, #fbbf24, #ec4899)' }} />
                              <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, #8b5cf6, #ec4899, #fbbf24, #ec4899, #8b5cf6)' }} />
                            </>
                          )}
                          {/* Master 旋轉光環 */}
                          {isMaster && (
                            <div className="absolute top-1/2 left-1/2 w-36 h-36 rounded-full opacity-10" style={{
                              background: 'conic-gradient(from 0deg, transparent, #fbbf24, transparent, #a78bfa, transparent)',
                              animation: 'cardSpin 8s linear infinite',
                              transform: 'translate(-50%, -50%)',
                            }} />
                          )}
                          {/* Premium 掃光 */}
                          {isPremium && (
                            <div className="absolute inset-0 opacity-25" style={{
                              background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)',
                              animation: 'shimmer 3s infinite',
                            }} />
                          )}
                          {/* Expert 星光 */}
                          {isExpert && [0,1,2,3].map(i => (
                            <div key={i} className="absolute w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{
                              top: `${15 + i * 22}%`, left: `${8 + i * 20}%`,
                              animationDelay: `${i * 0.3}s`, opacity: 0.5,
                            }} />
                          ))}
                          {/* 四角裝飾（Premium / Legend） */}
                          {(isPremium || isLegend) && (
                            <>
                              <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-yellow-300/70 rounded-tl" />
                              <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-yellow-300/70 rounded-tr" />
                              <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-yellow-300/70 rounded-bl" />
                              <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-yellow-300/70 rounded-br" />
                            </>
                          )}

                          <div className="relative z-10 flex items-center gap-2 px-3 py-2.5">
                            {/* 左側圖標 */}
                            <div className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center ${
                              isColored ? 'bg-white/20 border border-white/30' : 'bg-gray-100 border border-gray-200'
                            }`}>
                              <i className={`${cs.icon} text-sm ${isColored ? 'text-white' : 'text-gray-400'}`}></i>
                            </div>

                            {/* 中間：等級名稱 + 進度 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className={`text-xs font-medium ${cs.rankColor}`} style={{ fontSize: '9px' }}>RANK</span>
                                <span
                                  className={`text-xs font-black tracking-wider ${cs.nameColor}`}
                                  style={isLegend ? {
                                    background: 'linear-gradient(90deg, #fbbf24, #ec4899, #8b5cf6, #fbbf24)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundSize: '200% auto',
                                    animation: 'textShimmer 3s linear infinite',
                                    fontSize: '11px',
                                  } : { fontSize: '11px' }}
                                >
                                  {currentLevel.name}
                                </span>
                              </div>
                              <p className={`truncate ${cs.subColor}`} style={{ fontSize: '9px' }}>{t(LEVEL_LABEL_KEYS[currentLevel.name] ?? 'member.beginner')}</p>
                              {nextLevel && (
                                <div className="mt-1">
                                  <div className={`w-full h-0.5 rounded-full overflow-hidden ${cs.progressBg}`}>
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${cs.progressFill}`}
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                  <p className={`mt-0.5 ${cs.subColor}`} style={{ fontSize: '8px' }}>
                                    {levelPoints.toLocaleString()} / {nextLevel.requiredPoints.toLocaleString()} CTP
                                  </p>
                                </div>
                              )}
                              {!nextLevel && (
                                <p className={`mt-0.5 ${cs.subColor}`} style={{ fontSize: '8px' }}>
                                  {t('user.maxLevel')} · {levelPoints.toLocaleString()} CTP
                                </p>
                              )}
                            </div>

                            {/* 右側：折扣 */}
                            <div className={`flex-shrink-0 rounded-lg px-1.5 py-1 text-center ${cs.discountBg}`}>
                              {discount > 0 ? (
                                <>
                                  <p className={`font-black leading-none ${cs.discountText}`} style={{ fontSize: '10px' }}>-{discount}%</p>
                                  <p className={`leading-none mt-0.5 ${cs.discountText}`} style={{ fontSize: '8px' }}>{t('user.discount')}</p>
                                </>
                              ) : (
                                <>
                                  <p className={`font-bold leading-none ${cs.discountText}`} style={{ fontSize: '10px' }}>—</p>
                                  <p className={`leading-none mt-0.5 ${cs.discountText}`} style={{ fontSize: '8px' }}>{t('user.discount')}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex flex-wrap gap-2 justify-center md:justify-start">

                  <div className="px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap flex items-center gap-1.5 bg-green-500 text-white shadow-sm">
                    <i className="ri-shield-check-line"></i>
                    雙重認證（已啟用）
                  </div>
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-semibold text-sm hover:bg-purple-200 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="ri-lock-password-line"></i>
                    {t('user.changePassword')}
                  </button>
                  <button
                    onClick={() => setShowProfileSettings(true)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                  >
                    <i className="ri-settings-3-line"></i>
                    {t('user.settings')}
                  </button>
                </div>
              </div>

              {/* Points Balance */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 mb-5 border-2 border-yellow-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full shadow-md flex-shrink-0">
                      <i className="ri-coin-fill text-xl text-white"></i>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">{t('user.pointsBalance')}</p>
                      <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                        {currentPoints.toLocaleString()} <span className="text-base sm:text-lg text-gray-500">CTP</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {unredeemed.length > 0 && (
                      <button
                        onClick={() => setRedeemModal({ records: unredeemed, mode: 'batch' })}
                        className="flex-1 sm:flex-none px-3 py-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-lg font-semibold text-xs sm:text-sm hover:from-amber-500 hover:to-orange-500 transition-all shadow whitespace-nowrap cursor-pointer flex items-center justify-center gap-1"
                      >
                        <i className="ri-exchange-funds-line"></i>
                        <span className="hidden sm:inline">{t('user.redeemAll', { n: getRedeemPoints(unredeemed[0]) })}</span>
                        <span className="sm:hidden">{t('user.redeemMobile')}</span>
                      </button>
                    )}

                  </div>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-3 sm:p-4 text-center border border-rose-100">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center mx-auto mb-1.5">
                    <i className="ri-dice-line text-xl sm:text-2xl text-rose-500"></i>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{history.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{t('user.totalDraws')}</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-3 sm:p-4 text-center border border-yellow-100">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center mx-auto mb-1.5">
                    <i className="ri-star-fill text-xl sm:text-2xl text-yellow-500"></i>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalSSR}</p>
                  <p className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{t('user.totalSSR')}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-3 sm:p-4 text-center border border-purple-100">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center mx-auto mb-1.5">
                    <i className="ri-trophy-line text-xl sm:text-2xl text-purple-500"></i>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{prizeRecords.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{t('user.prizeCount')}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-3 sm:p-4 text-center border border-amber-100">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center mx-auto mb-1.5">
                    <i className="ri-stack-line text-xl sm:text-2xl text-amber-500"></i>
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{nakedCardRecords.length}</p>
                  <p className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{t('user.nakedCardCount')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab 切換 */}
        <div className="mb-6 bg-white rounded-xl p-1 shadow border border-rose-100 flex overflow-x-auto">
          {(['history', 'prizes', 'orders', 'points'] as const).map((tab) => {
            const labels = {
              history: t('user.tab.history'),
              prizes: t('user.tab.prizes'),
              orders: t('user.tab.orders'),
              points: t('user.tab.points'),
            };
            const icons = { history: 'ri-history-line', prizes: 'ri-truck-line', orders: 'ri-shopping-bag-line', points: 'ri-coin-line' };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <i className={icons[tab]}></i>
                  {labels[tab]}
                </span>
              </button>
            );
          })}
        </div>

        {/* 抽獎紀錄 */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-lg border border-rose-100 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <i className="ri-history-line text-rose-500"></i>
                {t('user.history.title')}
                <span className="text-sm font-normal text-gray-400">{t('user.history.count', { n: history.length })}</span>
              </h3>
              {selectedCardIds.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-amber-600 font-semibold whitespace-nowrap">
                    {t('user.selectedCount', { n: selectedCardIds.size, points: selectedTotalPoints })}
                  </span>
                  <button
                    onClick={() => {
                      const toRedeem = allRedeemable.filter((r) => selectedCardIds.has(r.id));
                      if (toRedeem.length > 0) setRedeemModal({ records: toRedeem, mode: 'batch' });
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-lg font-semibold text-xs hover:from-amber-500 hover:to-orange-500 transition-all shadow whitespace-nowrap cursor-pointer flex items-center justify-center gap-1"
                  >
                    <i className="ri-exchange-funds-line"></i>
                    <span className="hidden sm:inline">{t('user.redeemBtn', { n: selectedTotalPoints })}</span>
                    <span className="sm:hidden">{t('user.redeemMobile')}</span>
                  </button>
                </div>
              )}
            </div>

            {/* 篩選工具列 */}
            <div className="px-4 sm:px-6 py-3 border-b border-gray-100 bg-gray-50/60">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1 flex-shrink-0">
                    <i className="ri-filter-3-line"></i>{t('user.filter.type')}
                  </span>
                  {([
                    { key: 'all', label: t('user.filter.type.all'), icon: 'ri-apps-line' },
                    { key: 'win', label: t('user.filter.type.win'), icon: 'ri-trophy-fill' },
                    { key: 'naked', label: t('user.filter.type.naked'), icon: 'ri-stack-line' },
                    { key: 'redeemed', label: t('user.filter.type.redeemed'), icon: 'ri-checkbox-circle-fill' },
                  ] as const).map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => handleFilterTypeChange(key)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        filterType === key
                          ? 'bg-rose-500 text-white shadow-sm'
                          : 'bg-white text-gray-500 border border-gray-200 hover:border-rose-300 hover:text-rose-500'
                      }`}
                    >
                      <i className={icon}></i>{label}
                    </button>
                  ))}
                  {/* 全選按鈕：放在分類篩選旁邊，更直觀 */}

                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1 flex-shrink-0">
                    <i className="ri-star-line"></i>{t('user.filter.rarity')}
                  </span>
                  {([
                    { key: 'all', label: t('user.filter.type.all'), color: 'bg-gray-100 text-gray-600 border-gray-200', active: 'bg-rose-500 text-white' },
                    { key: 'SS', label: 'SS', color: 'bg-rose-50 text-rose-600 border-rose-200', active: 'bg-rose-500 text-white' },
                    { key: 'S',  label: 'S',  color: 'bg-amber-50 text-amber-600 border-amber-200', active: 'bg-amber-500 text-white' },
                    { key: 'A',  label: 'A',  color: 'bg-purple-50 text-purple-600 border-purple-200', active: 'bg-purple-500 text-white' },
                    { key: 'B',  label: 'B',  color: 'bg-sky-50 text-sky-600 border-sky-200', active: 'bg-sky-500 text-white' },
                    { key: 'C',  label: 'C',  color: 'bg-gray-50 text-gray-500 border-gray-200', active: 'bg-gray-400 text-white' },
                    { key: 'N',  label: 'N',  color: 'bg-slate-50 text-slate-500 border-slate-200', active: 'bg-slate-400 text-white' },
                  ] as const).map(({ key, label, color, active }) => (
                    <button
                      key={key}
                      onClick={() => handleFilterRarityChange(key)}
                      className={`px-2 py-0.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap cursor-pointer ${
                        filterRarity === key ? active + ' shadow-sm border-transparent' : color
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(filterType !== 'all' || filterRarity !== 'all') && (
                      <>
                        <span className="text-xs text-gray-400">
                          {t('user.filter.showing', { filtered: filteredHistory.length, total: history.length })}
                        </span>
                        <button
                          onClick={() => { handleFilterTypeChange('all'); handleFilterRarityChange('all'); }}
                          className="inline-flex items-center gap-1.5 px-5 py-2 border border-rose-300 text-rose-500 rounded-lg text-sm font-semibold hover:bg-rose-50 transition-all whitespace-nowrap cursor-pointer"
                        >
                          <i className="ri-refresh-line"></i>{t('user.filter.clear')}
                        </button>
                      </>
                    )}
                  </div>
                  {/* 每頁顯示數量 */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-gray-400 whitespace-nowrap">{t('user.perPage')}</span>
                    {([10, 20, 50, 100] as const).map((n) => (
                      <button
                        key={n}
                        onClick={() => handlePageSizeChange(n)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap cursor-pointer ${
                          pageSize === n
                            ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-rose-300 hover:text-rose-500'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="text-xs text-gray-400 whitespace-nowrap">{t('user.perPageUnit')}</span>
                  </div>
                </div>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-inbox-line text-5xl text-gray-300"></i>
                </div>
                <p className="text-sm mb-4">{t('user.noHistory')}</p>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg font-semibold text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow"
                >
                  <i className="ri-gift-2-line"></i>{t('user.noHistoryTip')}
                </Link>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <div className="w-14 h-14 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-search-line text-4xl text-gray-300"></i>
                </div>
                <p className="text-sm mb-3">{t('user.noFilterResults')}</p>
                <button
                  onClick={() => { handleFilterTypeChange('all'); handleFilterRarityChange('all'); }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 border border-rose-300 text-rose-500 rounded-lg text-sm font-semibold hover:bg-rose-50 transition-all whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-refresh-line"></i>{t('user.filter.clear')}
                </button>
              </div>
            ) : (
              <>
                {/* 表格 Header Row（全選 checkbox） */}
                {filteredRedeemable.length > 0 && (() => {
                  const pageRedeemable = pagedHistory.filter((r) => {
                    if (r.redeemedForPoints) return false;
                    const s = shippingStatusCache[r.id]?.status;
                    return s !== 'pending' && s !== 'shipped';
                  });
                  const allPageSelected = pageRedeemable.length > 0 && pageRedeemable.every((r) => selectedCardIds.has(r.id));
                  const somePageSelected = pageRedeemable.some((r) => selectedCardIds.has(r.id));
                  return (
                    <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 bg-gray-50 border-b border-gray-100">
                      <div
                        onClick={() => {
                          if (allPageSelected) {
                            setSelectedCardIds((prev) => {
                              const next = new Set(prev);
                              pageRedeemable.forEach((r) => next.delete(r.id));
                              return next;
                            });
                          } else {
                            setSelectedCardIds((prev) => {
                              const next = new Set(prev);
                              pageRedeemable.forEach((r) => next.add(r.id));
                              return next;
                            });
                          }
                        }}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
                          allPageSelected
                            ? 'bg-amber-400 border-amber-400'
                            : somePageSelected
                            ? 'bg-amber-100 border-amber-400'
                            : 'border-gray-300 hover:border-amber-400'
                        }`}
                        title={allPageSelected ? t('user.deselectAll') : t('user.selectAll')}
                      >
                        {allPageSelected && <i className="ri-check-line text-white text-xs"></i>}
                        {!allPageSelected && somePageSelected && <i className="ri-subtract-line text-amber-500 text-xs"></i>}
                      </div>
                      <span className="text-xs text-gray-400 select-none">
                        {allPageSelected
                          ? t('user.selectAllPageSelected', { n: pageRedeemable.length })
                          : somePageSelected
                          ? t('user.selectSomePage', { n: pageRedeemable.filter((r) => selectedCardIds.has(r.id)).length, total: pageRedeemable.length })
                          : t('user.selectAllPage', { n: pageRedeemable.length })
                        }
                      </span>
                      {totalPages > 1 && filteredRedeemable.length > pageRedeemable.length && (
                        <button
                          onClick={() => {
                            const allSelected = filteredRedeemable.every((r) => selectedCardIds.has(r.id));
                            if (allSelected) {
                              setSelectedCardIds((prev) => {
                                const next = new Set(prev);
                                filteredRedeemable.forEach((r) => next.delete(r.id));
                                return next;
                              });
                            } else {
                              setSelectedCardIds((prev) => {
                                const next = new Set(prev);
                                filteredRedeemable.forEach((r) => next.add(r.id));
                                return next;
                              });
                            }
                          }}
                          className="text-xs text-amber-600 hover:text-amber-700 underline underline-offset-2 cursor-pointer whitespace-nowrap"
                        >
                          {filteredRedeemable.every((r) => selectedCardIds.has(r.id))
                            ? t('user.deselectAllFiltered', { n: filteredRedeemable.length })
                            : t('user.selectAllFiltered', { n: filteredRedeemable.length })
                          }
                        </button>
                      )}
                    </div>
                  );
                })()}
                <div className="divide-y divide-gray-50">
                  {pagedHistory.map((record) => {
                    const style = RARITY_STYLE_BASES[record.rarity] ?? RARITY_STYLE_BASES['C'];
                    const isNakedCard = !record.isWin;
                    const isWinRecord = record.isWin;
                    const isRedeemed = record.redeemedForPoints;
                    const isSelected = selectedCardIds.has(record.id);
                    const displayImage = record.isWin
                      ? (record.prizeImage || FALLBACK_PRIZE_IMAGE)
                      : NAKED_CARD_IMAGE;
                    const displayAlt = record.isWin ? record.prizeName || record.result : t('user.nakedCardAlt');
                    const nakedCardName = t('user.nakedCardName');
                    // Can show redeem button: not yet redeemed AND no active shipping request
                    const hasShippingRequest = ['pending', 'shipped'].includes(shippingStatusCache[record.id]?.status ?? '');
                    const canRedeem = !isRedeemed && !hasShippingRequest && (isNakedCard || isWinRecord);
                    const recordPoints = getRedeemPoints(record);
                    return (
                      <div
                        key={record.id}
                        className={`flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-amber-50' : ''}`}
                      >
                        {/* Checkbox: for naked cards AND winning prizes that haven't been redeemed */}
                        {canRedeem ? (
                          <div
                            onClick={() => toggleSelectCard(record.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
                              isSelected ? 'bg-amber-400 border-amber-400' : 'border-gray-300 hover:border-amber-400'
                            }`}
                          >
                            {isSelected && <i className="ri-check-line text-white text-xs"></i>}
                          </div>
                        ) : (
                          <div className="w-5 flex-shrink-0" />
                        )}

                        <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                          <img
                            src={displayImage}
                            alt={displayAlt}
                            loading="lazy"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src !== FALLBACK_PRIZE_IMAGE) {
                                target.src = FALLBACK_PRIZE_IMAGE;
                              }
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                              {record.isWin ? record.prizeName || record.result : nakedCardName}
                            </p>
                            <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-bold border flex-shrink-0 ${style.bg} ${style.text} ${style.border}`}>
                              {record.rarity}
                            </span>
                            {isWinRecord && !isRedeemed && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-600 border border-orange-200 flex-shrink-0">
                                <i className="ri-trophy-fill text-yellow-500 text-xs"></i>{t('user.winBadge')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {record.productName}
                          </p>
                          <p className="text-xs text-gray-400 truncate hidden sm:block">
                            {formatDateTime(record.drawnAt)}
                          </p>
                        </div>

                        {/* 換分按鈕：裸卡 OR 中獎獎品，且尚未換分且無發貨申請 */}
                        {canRedeem && (
                          <button
                            onClick={() => setRedeemModal({ records: [record], mode: 'single' })}
                            className="ml-1 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-lg font-semibold text-xs hover:from-amber-500 hover:to-orange-500 transition-all shadow whitespace-nowrap cursor-pointer flex items-center gap-1 flex-shrink-0"
                          >
                            <i className="ri-exchange-funds-line"></i>
                            <span className="hidden sm:inline">{t('user.redeemBtn', { n: recordPoints })}</span>
                            <span className="sm:hidden">{t('user.redeemMobile')}</span>
                          </button>
                        )}
                        {/* 已申請發貨標記（不可換分） */}
                        {!isRedeemed && hasShippingRequest && (
                          <div className="ml-1 px-2 py-1.5 bg-sky-50 text-sky-500 border border-sky-200 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 flex-shrink-0">
                            <i className="ri-truck-line text-sky-400"></i>
                            <span className="hidden sm:inline">
                              {shippingStatusCache[record.id]?.status === 'shipped' ? t('user.shippedBadge') : t('user.shippingInProgress')}
                            </span>
                          </div>
                        )}
                        {/* 已換分標記 */}
                        {isRedeemed && (
                          <div className="ml-1 px-2 py-1.5 bg-gray-100 text-gray-400 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1 flex-shrink-0">
                            <i className="ri-coin-fill text-amber-400"></i>
                            <span className="hidden sm:inline">+{recordPoints} CTP</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 分頁控制列 */}
                {totalPages > 1 && (
                  <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-gray-400 whitespace-nowrap">
                      {t('user.pageInfo', { current: safePage, total: totalPages, count: filteredHistory.length })}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={safePage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
                        title={t('user.firstPage')}
                      >
                        <i className="ri-skip-back-line"></i>
                      </button>
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
                        title={t('user.prevPage')}
                      >
                        <i className="ri-arrow-left-s-line"></i>
                      </button>

                      {/* 頁碼按鈕 */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                        .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((item, idx) =>
                          item === 'ellipsis' ? (
                            <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-xs">…</span>
                          ) : (
                            <button
                              key={item}
                              onClick={() => setCurrentPage(item as number)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                safePage === item
                                  ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                  : 'border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-500'
                              }`}
                            >
                              {item}
                            </button>
                          )
                        )}

                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={safePage === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
                        title={t('user.nextPage')}
                      >
                        <i className="ri-arrow-right-s-line"></i>
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={safePage === totalPages}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer text-sm"
                        title={t('user.lastPage')}
                      >
                        <i className="ri-skip-forward-line"></i>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {nakedCardRecords.length > 0 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-amber-50/50">
                <div className="flex items-start gap-2 text-amber-700">
                  <i className="ri-information-line text-amber-500 text-sm flex-shrink-0"></i>
                  <p className="text-xs">
                    {t('user.nakedCardTip', { n: POINTS_PER_CARD, count: unredeemed.length, total: unredeemed.length * POINTS_PER_CARD })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 發貨申請 */}
        {activeTab === 'prizes' && (() => {
          // All records that can have shipping (not yet redeemed for points)
          const allShippable = history.filter((r) => !r.redeemedForPoints);
          const nakedShippable = allShippable.filter((r) => !r.isWin);
          const winShippable = allShippable.filter((r) => r.isWin);

          // Stats
          const notRequestedCount = allShippable.filter((r) => {
            const s = shippingStatusCache[r.id];
            return !s || s.status === 'not_requested';
          }).length;
          const pendingCount = allShippable.filter((r) => shippingStatusCache[r.id]?.status === 'pending').length;
          const shippedCount = allShippable.filter((r) => shippingStatusCache[r.id]?.status === 'shipped').length;

          // Apply filters
          const filteredShippable = allShippable.filter((r) => {
            const typeOk =
              filterShippingType === 'all' ? true
              : filterShippingType === 'win' ? r.isWin
              : !r.isWin;
            const statusOk =
              filterShippingStatus === 'all' ? true
              : filterShippingStatus === 'not_requested' ? (!shippingStatusCache[r.id] || shippingStatusCache[r.id].status === 'not_requested')
              : shippingStatusCache[r.id]?.status === filterShippingStatus;
            return typeOk && statusOk;
          });

          const notRequestedShippable = allShippable.filter((r) => {
            const s = shippingStatusCache[r.id];
            return !s || s.status === 'not_requested';
          });

          return (
            <div>
              {/* 標題列 */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <i className="ri-truck-fill text-rose-500 text-xl"></i>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">{t('user.shipping.title')}</h3>
                  <span className="text-sm font-normal text-gray-400">{t('user.shipping.count', { n: allShippable.length })}</span>
                </div>

                {notRequestedShippable.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedPrizeIds.size > 0 && (
                      <span className="text-xs text-rose-600 font-semibold whitespace-nowrap">
                        {t('user.shipping.selected', { n: selectedPrizeIds.size })}
                      </span>
                    )}
                    {selectedPrizeIds.size > 0 && (
                      <button
                        onClick={() => {
                          const selected = allShippable.filter(
                            (r) => selectedPrizeIds.has(r.id) &&
                              (!shippingStatusCache[r.id] || shippingStatusCache[r.id].status === 'not_requested')
                          );
                          if (selected.length > 0) {
                            setShippingRequestModal({
                              prizes: selected.map((r) => ({
                                recordId: r.id,
                                prizeName: r.isWin ? (r.prizeName || r.result) : t('user.nakedCardName'),
                                prizeImage: r.isWin ? r.prizeImage : NAKED_CARD_IMAGE,
                              })),
                            });
                          }
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold text-xs hover:from-rose-600 hover:to-pink-600 transition-all shadow whitespace-nowrap cursor-pointer flex items-center gap-1.5"
                      >
                        <i className="ri-truck-line"></i>
                        {t('user.shipping.batchRequest')}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const ids = notRequestedShippable.map((r) => r.id);
                        if (selectedPrizeIds.size === ids.length) {
                          setSelectedPrizeIds(new Set());
                        } else {
                          setSelectedPrizeIds(new Set(ids));
                        }
                      }}
                      className="px-3 py-1.5 border-2 border-rose-300 text-rose-600 rounded-xl font-semibold text-xs hover:bg-rose-50 transition-all whitespace-nowrap cursor-pointer"
                    >
                      {selectedPrizeIds.size === notRequestedShippable.length ? t('user.shipping.deselectAll') : t('user.shipping.selectAll')}
                    </button>
                  </div>
                )}
              </div>

              {/* 統計欄 */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div
                  onClick={() => setFilterShippingStatus(filterShippingStatus === 'not_requested' ? 'all' : 'not_requested')}
                  className={`rounded-xl p-3 text-center border-2 cursor-pointer transition-all ${
                    filterShippingStatus === 'not_requested'
                      ? 'bg-orange-50 border-orange-400'
                      : 'bg-white border-gray-100 hover:border-orange-300'
                  }`}
                >
                  <p className="text-xl font-bold text-orange-500">{notRequestedCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('user.shipping.notRequested')}</p>
                </div>
                <div
                  onClick={() => setFilterShippingStatus(filterShippingStatus === 'pending' ? 'all' : 'pending')}
                  className={`rounded-xl p-3 text-center border-2 cursor-pointer transition-all ${
                    filterShippingStatus === 'pending'
                      ? 'bg-sky-50 border-sky-400'
                      : 'bg-white border-gray-100 hover:border-sky-300'
                  }`}
                >
                  <p className="text-xl font-bold text-sky-500">{pendingCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('user.shipping.pending')}</p>
                </div>
                <div
                  onClick={() => setFilterShippingStatus(filterShippingStatus === 'shipped' ? 'all' : 'shipped')}
                  className={`rounded-xl p-3 text-center border-2 cursor-pointer transition-all ${
                    filterShippingStatus === 'shipped'
                      ? 'bg-green-50 border-green-400'
                      : 'bg-white border-gray-100 hover:border-green-300'
                  }`}
                >
                  <p className="text-xl font-bold text-green-500">{shippedCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('user.shipping.shipped')}</p>
                </div>
              </div>

              {/* 篩選列 */}
              <div className="bg-white rounded-xl px-4 py-3 mb-4 border border-gray-100 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1 flex-shrink-0">
                      <i className="ri-filter-3-line"></i>{t('user.shipping.filter.type')}
                    </span>
                    {([
                      { key: 'all', label: t('user.filter.type.all'), icon: 'ri-apps-line' },
                      { key: 'win', label: t('user.shipping.filter.win'), icon: 'ri-trophy-fill' },
                      { key: 'naked', label: t('user.filter.type.naked'), icon: 'ri-stack-line' },
                    ] as const).map(({ key, label, icon }) => (
                      <button
                        key={key}
                        onClick={() => setFilterShippingType(key)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                          filterShippingType === key
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:border-rose-300 hover:text-rose-500'
                        }`}
                      >
                        <i className={icon}></i> {label}
                      </button>
                    ))}
                    {(filterShippingType !== 'all' || filterShippingStatus !== 'all') && (
                      <button
                        onClick={() => { setFilterShippingType('all'); setFilterShippingStatus('all'); }}
                        className="ml-1 flex items-center gap-1 text-xs text-gray-400 hover:text-rose-500 cursor-pointer whitespace-nowrap"
                      >
                        <i className="ri-close-circle-line"></i>{t('user.shipping.clearFilter')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 列表主體 */}
              {allShippable.length === 0 ? (
                <div className="bg-white rounded-2xl shadow border border-rose-100 py-24 text-center">
                  <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <i className="ri-inbox-2-line text-5xl text-gray-300"></i>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{t('user.shipping.noItems')}</p>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg font-semibold text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow"
                  >
                    <i className="ri-gift-2-line"></i>{t('user.shipping.noItemsTip')}
                  </Link>
                </div>
              ) : filteredShippable.length === 0 ? (
                <div className="bg-white rounded-2xl shadow border border-rose-100 py-16 text-center">
                  <div className="w-14 h-14 flex items-center justify-center mx-auto mb-3">
                    <i className="ri-search-line text-4xl text-gray-300"></i>
                  </div>
                  <p className="text-gray-400 text-sm mb-3">{t('user.shipping.noFilterResults')}</p>
                  <button
                    onClick={() => { setFilterShippingType('all'); setFilterShippingStatus('all'); }}
                    className="inline-flex items-center gap-1.5 px-5 py-2 border border-rose-300 text-rose-500 rounded-lg text-sm font-semibold hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    <i className="ri-refresh-line"></i>{t('user.filter.clear')}
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border border-rose-100 overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {filteredShippable.map((record) => {
                      const rarityStyle = RARITY_STYLE_BASES[record.rarity] ?? RARITY_STYLE_BASES['C'];
                      const shippingInfo = shippingStatusCache[record.id] ?? { status: 'not_requested' };
                      const isNotRequested = shippingInfo.status === 'not_requested';
                      const isPending = shippingInfo.status === 'pending';
                      const isShipped = shippingInfo.status === 'shipped';
                      const isSelected = selectedPrizeIds.has(record.id);
                      const displayImage = record.isWin ? (record.prizeImage || FALLBACK_PRIZE_IMAGE) : NAKED_CARD_IMAGE;
                      const displayName = record.isWin ? (record.prizeName || record.result) : t('user.nakedCardName');

                      return (
                        <div
                          key={`${record.id}-${addressRefreshKey}`}
                          className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-rose-50' : ''}`}
                        >
                          {/* Checkbox (only for not-requested) */}
                          {isNotRequested ? (
                            <div
                              onClick={() => {
                                setSelectedPrizeIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(record.id)) next.delete(record.id);
                                  else next.add(record.id);
                                  return next;
                                });
                              }}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${
                                isSelected ? 'bg-rose-500 border-rose-500' : 'border-gray-300 hover:border-rose-400'
                              }`}
                            >
                              {isSelected && <i className="ri-check-line text-white text-xs"></i>}
                            </div>
                          ) : (
                            <div className="w-5 flex-shrink-0" />
                          )}

                          {/* 圖片 */}
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                            <img
                              src={displayImage}
                              alt={displayName}
                              loading="lazy"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const t = e.currentTarget;
                                if (t.src !== FALLBACK_PRIZE_IMAGE) t.src = FALLBACK_PRIZE_IMAGE;
                              }}
                            />
                          </div>

                          {/* 資訊 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              {record.isWin ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-600 border border-orange-200">
                                  <i className="ri-trophy-fill text-yellow-500 text-xs"></i>{t('user.winBadge')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  <i className="ri-stack-line text-slate-400 text-xs"></i>{t('user.nakedBadge')}
                                </span>
                              )}
                              <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-bold border flex-shrink-0 ${rarityStyle.bg} ${rarityStyle.text} ${rarityStyle.border}`}>
                                {record.rarity}
                              </span>
                              <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{displayName}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs text-gray-400 truncate">{record.productName}</p>
                              <span className="text-gray-200 text-xs hidden sm:inline">·</span>
                              <p className="text-xs text-gray-400 truncate hidden sm:block">{formatDateTime(record.drawnAt)}</p>
                            </div>
                          </div>

                          {/* 發貨狀態 chip */}
                          <div className="flex-shrink-0 hidden sm:block">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isShipped ? 'bg-green-100 text-green-600'
                              : isPending ? 'bg-sky-100 text-sky-600'
                              : 'bg-orange-50 text-orange-500 border border-orange-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                isShipped ? 'bg-green-400' : isPending ? 'bg-sky-400 animate-pulse' : 'bg-orange-400'
                              }`}></span>
                              {isShipped ? t('user.shippedBadge') : isPending ? t('user.pendingBadge') : t('user.notRequestedBadge')}
                            </span>
                            {isShipped && shippingInfo.trackingNumber && (
                              <p className="text-xs text-gray-500 mt-1 text-right max-w-[120px] truncate">
                                {t('user.shipping.tracking', { number: shippingInfo.trackingNumber })}
                              </p>
                            )}
                          </div>

                          {/* 動作按鈕 */}
                          {isNotRequested && (
                            <button
                              onClick={() => {
                                setShippingRequestModal({
                                  prizes: [{
                                    recordId: record.id,
                                    prizeName: displayName,
                                    prizeImage: displayImage,
                                  }],
                                });
                              }}
                              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-semibold text-sm transition-all shadow cursor-pointer whitespace-nowrap"
                            >
                              <i className="ri-truck-line"></i>
                              <span className="hidden sm:inline">{t('user.shipping.request')}</span>
                              <span className="sm:hidden">{t('user.shipping.requestMobile')}</span>
                            </button>
                          )}
                          {isPending && (
                            <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-500 rounded-xl text-xs font-semibold whitespace-nowrap border border-sky-200">
                              <i className="ri-time-line"></i>
                              <span className="hidden sm:inline">{t('user.shipping.processing')}</span>
                            </div>
                          )}
                          {isShipped && (
                            <div className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-500 rounded-xl text-xs font-semibold whitespace-nowrap border border-green-200">
                              <i className="ri-checkbox-circle-fill"></i>
                              <span className="hidden sm:inline">{t('user.shippedBadge')}</span>
                            </div>
                          )}
                          {/* Mobile status dot */}
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 sm:hidden ${
                            isShipped ? 'bg-green-400' : isPending ? 'bg-sky-400 animate-pulse' : 'bg-orange-400'
                          }`}></div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 底部浮動批量操作列 */}
              {selectedPrizeIds.size > 0 && activeTab === 'prizes' && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[slideUpFloat_0.3s_cubic-bezier(0.34,1.56,0.64,1)_both]">
                  <div className="flex items-center gap-3 bg-gray-900 text-white rounded-2xl px-5 py-3.5 shadow-2xl border border-white/10">
                    <div className="w-8 h-8 flex items-center justify-center bg-rose-500 rounded-full flex-shrink-0">
                      <i className="ri-checkbox-circle-fill text-white text-sm"></i>
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {t('user.shipping.selected', { n: selectedPrizeIds.size })}
                    </span>
                    <div className="w-px h-5 bg-white/20 flex-shrink-0"></div>
                    <button
                      onClick={() => {
                        const selected = allShippable.filter(
                          (r) => selectedPrizeIds.has(r.id) &&
                            (!shippingStatusCache[r.id] || shippingStatusCache[r.id].status === 'not_requested')
                        );
                        if (selected.length > 0) {
                          setShippingRequestModal({
                            prizes: selected.map((r) => ({
                              recordId: r.id,
                              prizeName: r.isWin ? (r.prizeName || r.result) : t('user.nakedCardName'),
                              prizeImage: r.isWin ? r.prizeImage : NAKED_CARD_IMAGE,
                            })),
                          });
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-semibold text-sm transition-all shadow cursor-pointer whitespace-nowrap"
                    >
                      <i className="ri-truck-line"></i>
                      {t('user.shipping.batchRequest')}
                    </button>
                    <button
                      onClick={() => setSelectedPrizeIds(new Set())}
                      className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all cursor-pointer flex-shrink-0"
                    >
                      <i className="ri-close-line text-sm"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* 我的訂單 */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-lg border border-rose-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <i className="ri-shopping-bag-line text-rose-500"></i>
                {t('user.orders.title')}
                <span className="text-sm font-normal text-gray-400">{t('user.orders.count', { n: shopOrders.length })}</span>
              </h3>
              <Link
                to="/shop"
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-500 rounded-lg font-semibold text-sm hover:bg-rose-100 transition-colors whitespace-nowrap"
              >
                <i className="ri-store-2-line"></i>
                {t('user.orders.goShop')}
              </Link>
            </div>

            {shopOrdersLoading ? (
              <div className="flex items-center justify-center py-16">
                <i className="ri-loader-4-line text-4xl text-gray-300 animate-spin"></i>
              </div>
            ) : shopOrders.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-shopping-bag-line text-5xl text-gray-300"></i>
                </div>
                <p className="text-sm mb-4">{t('user.orders.noOrders')}</p>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg font-semibold text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow"
                >
                  <i className="ri-store-2-line"></i>{t('user.orders.goShopNow')}
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {shopOrders.map((order) => {
                  const addrParts = [order.flatFloor, order.building, order.address, order.district].filter(Boolean);
                  const isShipped = order.status === 'shipped';
                  const isPending = order.status === 'pending';
                  return (
                    <div key={order.id} className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Product thumbnails */}
                        <div className="flex -space-x-2 flex-shrink-0 mt-0.5">
                          {order.items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="w-10 h-10 rounded-lg border-2 border-white overflow-hidden bg-gray-100 flex-shrink-0">
                              {item.productImage
                                ? <img src={item.productImage} alt={item.productName} loading="lazy" className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center"><i className="ri-image-line text-gray-300 text-sm"></i></div>
                              }
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
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isShipped ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              <i className={isShipped ? 'ri-checkbox-circle-fill' : 'ri-time-fill'}></i>
                              {isShipped ? t('user.orders.status.shipped') : t('user.orders.status.pending')}
                            </span>
                            <span className="text-xs text-gray-400">{formatDateTime(order.createdAt)}</span>
                          </div>
                          <div className="space-y-0.5 mb-2">
                            {order.items.map((item, i) => (
                              <p key={i} className="text-sm text-gray-700">
                                <span className="font-medium">{item.productName}</span>
                                <span className="text-gray-400 ml-1">× {item.quantity}</span>
                                <span className="text-rose-500 ml-2 text-xs">{(item.unitPrice * item.quantity).toLocaleString()} CTP</span>
                              </p>
                            ))}
                          </div>
                          {addrParts.length > 0 && (
                            <p className="text-xs text-gray-400 flex items-center gap-1">
                              <i className="ri-map-pin-line text-teal-400"></i>
                              {order.recipientName && <span className="font-medium text-gray-500">{order.recipientName}・</span>}
                              {addrParts.join('，')}
                            </p>
                          )}
                          {isShipped && order.trackingNumber && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <i className="ri-truck-line text-green-400"></i>
                              {t('user.orders.tracking')}：<span className="font-mono font-semibold">{order.trackingNumber}</span>
                            </p>
                          )}
                        </div>

                        {/* Total */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-base font-bold text-rose-500">{order.totalPoints.toLocaleString()} CTP</p>
                          <p className="text-xs text-gray-400 mt-0.5">{t('user.itemCount', { n: order.items.reduce((s, i) => s + i.quantity, 0) })}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 積分紀錄 */}
        {activeTab === 'points' && (
          <div className="bg-white rounded-2xl shadow-lg border border-rose-100 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-100">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                <i className="ri-coin-line text-yellow-500"></i>
                {t('user.points.title')}
                <span className="text-sm font-normal text-gray-400">{t('user.points.count', { n: pointTransactions.length })}</span>
              </h3>
            </div>

            {pointTransactions.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <div className="w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <i className="ri-inbox-line text-5xl text-gray-300"></i>
                </div>
                <p className="text-sm mb-4">{t('user.points.noRecords')}</p>
                <Link
                  to="/buy-points"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-lg font-semibold text-sm hover:from-amber-500 hover:to-orange-500 transition-all shadow"
                >
                  <i className="ri-coin-line"></i>{t('user.points.noRecordsTip')}
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {pointTransactions.map((transaction) => {
                  const isPurchase = transaction.type === 'purchase';
                  const isRedeem = transaction.type === 'redeem';
                  return (
                    <div key={transaction.id} className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors">
                      <div className={`w-10 h-10 sm:w-12 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isPurchase ? 'bg-green-100' : isRedeem ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        <i className={`text-xl sm:text-2xl ${
                          isPurchase ? 'ri-add-circle-fill text-green-500'
                          : isRedeem ? 'ri-exchange-funds-fill text-amber-500'
                          : 'ri-subtract-fill text-red-500'
                        }`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{transaction.description}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{formatTimestamp(transaction.timestamp)}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold sm:hidden ${
                          isPurchase ? 'bg-green-100 text-green-600'
                          : isRedeem ? 'bg-amber-100 text-amber-600'
                          : 'bg-red-100 text-red-600'
                        }`}>
                          {isPurchase ? t('user.points.type.purchase') : isRedeem ? t('user.points.type.redeem') : t('user.points.type.draw')}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0 hidden sm:block">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          isPurchase ? 'bg-green-100 text-green-600'
                          : isRedeem ? 'bg-amber-100 text-amber-600'
                          : 'bg-red-100 text-red-600'
                        }`}>
                          {isPurchase ? t('user.points.type.purchase') : isRedeem ? t('user.points.type.redeem') : t('user.points.type.draw')}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-1">
                        <p className={`text-base sm:text-lg font-bold ${transaction.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} CTP
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <SiteFooter />

      {redeemModal && (
        <RedeemConfirmModal
          records={redeemModal.records}
          mode={redeemModal.mode}
          getPoints={getRedeemPoints}
          onConfirm={handleRedeemConfirm}
          onCancel={() => setRedeemModal(null)}
        />
      )}

      {shippingRequestModal && currentUser && (
        <ShippingRequestModal
          prizes={shippingRequestModal.prizes}
          userId={currentUser.id}
          defaultRecipientName={profileShipping.recipientName}
          defaultPhone={profileShipping.contactPhone}
          defaultFlatFloor={profileShipping.shippingFlatFloor}
          defaultBuilding={profileShipping.shippingBuilding}
          defaultStreet={profileShipping.shippingStreet}
          defaultDistrict={profileShipping.shippingDistrict}
          onSuccess={handleShippingRequestSuccess}
          onCancel={() => setShippingRequestModal(null)}
        />
      )}

      {showProfileSettings && currentUser && (
        <ProfileSettingsModal
          userId={currentUser.id}
          displayName={currentDisplayName}
          email={currentUser.email}
          recipientName={profileShipping.recipientName}
          contactPhone={profileShipping.contactPhone}
          shippingFlatFloor={profileShipping.shippingFlatFloor}
          shippingBuilding={profileShipping.shippingBuilding}
          shippingStreet={profileShipping.shippingStreet}
          shippingDistrict={profileShipping.shippingDistrict}
          onClose={() => setShowProfileSettings(false)}
          onSaved={handleProfileSaved}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal
          onClose={() => setShowChangePassword(false)}
          onSuccess={handlePasswordChangeSuccess}
        />
      )}

      <style>{`
        @keyframes redeemSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideUpFloat {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes textShimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes cardSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}

export default UserPage;
