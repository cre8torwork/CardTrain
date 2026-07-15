import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import { usePointsStore } from '../../../hooks/usePointsStore';

interface PrizeItem {
  recordId: string;
  prizeName: string;
  prizeImage: string;
}

interface ShippingRequestModalProps {
  recordId?: string;
  prizeName?: string;
  prizeImage?: string;
  prizes?: PrizeItem[];
  userId: string;
  defaultRecipientName?: string;
  defaultPhone?: string;
  defaultFlatFloor?: string;
  defaultBuilding?: string;
  defaultStreet?: string;
  defaultDistrict?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface ShippingFormData {
  recipientName: string;
  phone: string;
  flatFloor: string;
  building: string;
  address: string;
  district: string;
}

const FALLBACK_IMAGE = 'https://static.readdy.ai/image/2995f7f91a6f0f981c46a3a4468d5de7/5250fa4331b28dcfbabf0d582e3bf142.png';

const SHIPPING_FEE = 30;

function ShippingRequestModal({
  recordId,
  prizeName,
  prizeImage,
  prizes,
  userId,
  defaultRecipientName = '',
  defaultPhone = '',
  defaultFlatFloor = '',
  defaultBuilding = '',
  defaultStreet = '',
  defaultDistrict = '',
  onSuccess,
  onCancel,
}: ShippingRequestModalProps) {
  const { t } = useTranslation();

  const prizeList: PrizeItem[] = prizes && prizes.length > 0
    ? prizes
    : recordId
      ? [{ recordId, prizeName: prizeName || '', prizeImage: prizeImage || '' }]
      : [];

  const [formData, setFormData] = useState<ShippingFormData>({
    recipientName: '',
    phone: '',
    flatFloor: '',
    building: '',
    address: '',
    district: '',
  });
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [currentPoints, setCurrentPoints] = useState<number | null>(null);

  const { getPoints, deductPoints } = usePointsStore();
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const loadUserData = async () => {
      try {
        const [userData, ptResult] = await Promise.all([
          supabase.from('users').select('display_name').eq('id', userId).maybeSingle(),
          getPoints(userId),
        ]);

        setCurrentPoints(ptResult.points);
        setFormData({
          recipientName: defaultRecipientName || userData.data?.display_name || '',
          phone: defaultPhone,
          flatFloor: defaultFlatFloor,
          building: defaultBuilding,
          address: defaultStreet,
          district: defaultDistrict,
        });
      } catch (err) {
        console.error('載入用戶資料失敗:', err);
        setFormData({
          recipientName: defaultRecipientName,
          phone: defaultPhone,
          flatFloor: defaultFlatFloor,
          building: defaultBuilding,
          address: defaultStreet,
          district: defaultDistrict,
        });
      } finally {
        setLoadingUserData(false);
      }
    };

    loadUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submittingRef.current) return;
    submittingRef.current = true;

    setPointsError(null);
    setLoading(true);

    if (!formData.recipientName.trim() || !formData.phone.trim() || !formData.address.trim() || !formData.district.trim()) {
      submittingRef.current = false;
      setLoading(false);
      return;
    }

    try {
      const { points: latestPoints } = await getPoints(userId);
      setCurrentPoints(latestPoints);
      if (latestPoints < SHIPPING_FEE) {
        setPointsError(t('user.shippingModal.pointsError', { fee: SHIPPING_FEE, points: latestPoints }));
        submittingRef.current = false;
        setLoading(false);
        return;
      }

      const deductResult = await deductPoints(
        userId,
        SHIPPING_FEE,
        t('user.shippingFeeDesc').replace('30', String(SHIPPING_FEE)),
      );

      if (!deductResult.success) {
        setPointsError(deductResult.error || '扣除運費失敗，請稍後再試。');
        submittingRef.current = false;
        setLoading(false);
        return;
      }

      const addressRows = prizeList.map((p) => ({
        record_id: p.recordId,
        recipient_name: formData.recipientName.trim(),
        phone: formData.phone.trim(),
        flat_floor: formData.flatFloor.trim(),
        building: formData.building.trim(),
        address: formData.address.trim(),
        city: '',
        district: formData.district.trim(),
        postal_code: '',
        notes: '',
        updated_at: new Date().toISOString(),
      }));

      const statusRows = prizeList.map((p) => ({
        record_id: p.recordId,
        status: 'pending',
      }));

      const { error: addressError } = await supabase
        .from('shipping_addresses')
        .upsert(addressRows, { onConflict: 'record_id' });

      if (addressError) throw addressError;

      const { error: statusError } = await supabase
        .from('shipping_status')
        .upsert(statusRows, { onConflict: 'record_id' });

      if (statusError) throw statusError;

      setShowSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error('提交發貨申請失敗:', err);
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ShippingFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isMultiple = prizeList.length > 1;
  const hasEnoughPoints = currentPoints === null || currentPoints >= SHIPPING_FEE;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease]">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-[slideUp_0.3s_ease] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 成功提示覆蓋層 */}
        {showSuccess && (
          <div className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center z-10 animate-[fadeIn_0.3s_ease]">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <i className="ri-checkbox-circle-fill text-5xl text-green-500"></i>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-2">{t('user.shippingModal.successTitle')}</p>
            <p className="text-sm text-gray-500">
              {isMultiple ? t('user.shippingModal.successMultiple', { n: prizeList.length }) : t('user.shippingModal.successSingle')}
            </p>
            <p className="text-xs text-rose-500 mt-2 font-semibold">{t('user.shippingModal.successDeducted', { fee: SHIPPING_FEE })}</p>
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full">
              <i className="ri-truck-line text-xl text-white"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('user.shippingModal.title')}</h3>
              <p className="text-xs text-white/80">
                {isMultiple ? t('user.shippingModal.multipleTitle', { n: prizeList.length }) : t('user.shippingModal.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* 獎品清單 */}
        <div className="px-6 py-4 bg-gradient-to-br from-yellow-50 to-orange-50 border-b-2 border-yellow-200">
          {isMultiple ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-600 border border-orange-300">
                  <i className="ri-trophy-fill text-yellow-500"></i>
                  {t('user.shippingModal.batchBadge', { n: prizeList.length })}
                </span>
              </div>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {prizeList.map((p, idx) => (
                  <div key={p.recordId} className="flex items-center gap-3 bg-white rounded-xl px-3 py-2 shadow-sm">
                    <span className="text-xs text-gray-400 font-bold w-5 flex-shrink-0">{idx + 1}</span>
                    <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <img
                        src={p.prizeImage || FALLBACK_IMAGE}
                        alt={p.prizeName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== FALLBACK_IMAGE) target.src = FALLBACK_IMAGE;
                        }}
                      />
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate flex-1">{p.prizeName}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-white shadow-md">
                <img
                  src={prizeList[0]?.prizeImage || FALLBACK_IMAGE}
                  alt={prizeList[0]?.prizeName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== FALLBACK_IMAGE) target.src = FALLBACK_IMAGE;
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-600 border border-orange-300">
                    <i className="ri-trophy-fill text-yellow-500"></i>
                    {t('user.shippingModal.winBadge')}
                  </span>
                </div>
                <p className="text-base font-bold text-gray-900 truncate">{prizeList[0]?.prizeName}</p>
              </div>
            </div>
          )}
        </div>

        {/* 表單 */}
        {loadingUserData ? (
          <div className="px-6 py-12 flex flex-col items-center gap-3">
            <i className="ri-loader-4-line animate-spin text-3xl text-rose-400"></i>
            <p className="text-sm text-gray-400">{t('user.shippingModal.loading')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <i className="ri-user-3-line text-rose-500"></i>
                  {t('user.shippingModal.recipientName')}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => handleChange('recipientName', e.target.value)}
                  placeholder={t('user.shippingModal.recipientNamePlaceholder')}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <i className="ri-phone-line text-rose-500"></i>
                  {t('user.shippingModal.phone')}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder={t('user.shippingModal.phonePlaceholder')}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <i className="ri-map-pin-line text-rose-500"></i>
                  {t('user.shippingModal.address')}
                  <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('user.shippingModal.flatFloor')}</label>
                      <input
                        type="text"
                        value={formData.flatFloor}
                        onChange={(e) => handleChange('flatFloor', e.target.value)}
                        placeholder={t('user.shippingModal.flatFloorPlaceholder')}
                        disabled={loading}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('user.shippingModal.building')}</label>
                      <input
                        type="text"
                        value={formData.building}
                        onChange={(e) => handleChange('building', e.target.value)}
                        placeholder={t('user.shippingModal.buildingPlaceholder')}
                        disabled={loading}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('user.shippingModal.street')} <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder={t('user.shippingModal.streetPlaceholder')}
                      required
                      disabled={loading}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('user.shippingModal.district')} <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => handleChange('district', e.target.value)}
                      placeholder={t('user.shippingModal.districtPlaceholder')}
                      required
                      disabled={loading}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {isMultiple && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <i className="ri-information-line text-amber-500 text-lg flex-shrink-0 mt-0.5"></i>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {t('user.shippingModal.batchTip', { n: prizeList.length })}
                  </p>
                </div>
              )}

              {/* 積分不足錯誤提示 */}
              {pointsError && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl px-4 py-3 flex items-start gap-3">
                  <i className="ri-error-warning-fill text-red-500 text-lg flex-shrink-0 mt-0.5"></i>
                  <p className="text-sm text-red-600 font-semibold">{pointsError}</p>
                </div>
              )}

              {/* 運費積分提醒 */}
              <div className={`border-2 rounded-xl px-4 py-4 flex items-start gap-3 ${hasEnoughPoints ? 'bg-rose-50 border-rose-200' : 'bg-red-50 border-red-300'}`}>
                <div className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${hasEnoughPoints ? 'bg-rose-100' : 'bg-red-100'}`}>
                  <i className={`ri-coin-line text-base ${hasEnoughPoints ? 'text-rose-500' : 'text-red-500'}`}></i>
                </div>
                <div>
                  <p className={`text-sm font-bold mb-1 flex items-center gap-1.5 ${hasEnoughPoints ? 'text-rose-700' : 'text-red-700'}`}>
                    <i className={`ri-error-warning-fill ${hasEnoughPoints ? 'text-rose-500' : 'text-red-500'}`}></i>
                    {t('user.shippingModal.feeTitle')}
                  </p>
                  <p className={`text-xs leading-relaxed ${hasEnoughPoints ? 'text-rose-600' : 'text-red-600'}`}>
                    {t('user.shippingModal.feeDesc', { fee: SHIPPING_FEE })}
                    {currentPoints !== null && (
                      <span className="ml-1">
                        {t('user.shippingModal.feeBalance', { points: currentPoints.toLocaleString() })}
                        {hasEnoughPoints
                          ? t('user.shippingModal.feeAfter', { remaining: (currentPoints - SHIPPING_FEE).toLocaleString() })
                          : t('user.shippingModal.feeInsufficient')}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <i className="ri-information-line text-sky-500 text-lg flex-shrink-0 mt-0.5"></i>
                <p className="text-xs text-sky-700 leading-relaxed">
                  {t('user.shippingModal.note')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50"
              >
                {t('user.shippingModal.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading || !hasEnoughPoints}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    {t('user.shippingModal.submitting')}
                  </>
                ) : (
                  <>
                    <i className="ri-check-line"></i>
                    {isMultiple ? t('user.shippingModal.submitMultiple', { n: prizeList.length }) : t('user.shippingModal.submit')}
                    <span className="text-white/80 text-xs font-normal ml-1">(-{SHIPPING_FEE} CTP)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export default ShippingRequestModal;