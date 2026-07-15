import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';

interface ProfileSettingsModalProps {
  userId: string;
  displayName: string;
  email: string;
  recipientName: string;
  contactPhone: string;
  shippingFlatFloor: string;
  shippingBuilding: string;
  shippingStreet: string;
  shippingDistrict: string;
  onClose: () => void;
  onSaved: (updated: {
    displayName: string;
    recipientName: string;
    contactPhone: string;
    shippingFlatFloor: string;
    shippingBuilding: string;
    shippingStreet: string;
    shippingDistrict: string;
  }) => void;
}

function ProfileSettingsModal({
  userId,
  displayName,
  email,
  recipientName,
  contactPhone,
  shippingFlatFloor,
  shippingBuilding,
  shippingStreet,
  shippingDistrict,
  onClose,
  onSaved,
}: ProfileSettingsModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    displayName,
    recipientName,
    contactPhone,
    shippingFlatFloor,
    shippingBuilding,
    shippingStreet,
    shippingDistrict,
  });
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.displayName.trim()) {
      setError(t('user.nicknameRequired'));
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          display_name: form.displayName.trim(),
          recipient_name: form.recipientName.trim(),
          contact_phone: form.contactPhone.trim(),
          shipping_flat_floor: form.shippingFlatFloor.trim(),
          shipping_building: form.shippingBuilding.trim(),
          shipping_street: form.shippingStreet.trim(),
          shipping_district: form.shippingDistrict.trim(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      setShowSuccess(true);
      setTimeout(() => {
        onSaved({
          displayName: form.displayName.trim(),
          recipientName: form.recipientName.trim(),
          contactPhone: form.contactPhone.trim(),
          shippingFlatFloor: form.shippingFlatFloor.trim(),
          shippingBuilding: form.shippingBuilding.trim(),
          shippingStreet: form.shippingStreet.trim(),
          shippingDistrict: form.shippingDistrict.trim(),
        });
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('更新個人資料失敗:', err);
      setError(t('user.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease]">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-[slideUp_0.3s_ease] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 成功覆蓋層 */}
        {showSuccess && (
          <div className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center z-10 animate-[fadeIn_0.3s_ease]">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <i className="ri-checkbox-circle-fill text-5xl text-green-500"></i>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-2">{t('user.saveSuccess')}</p>
            <p className="text-sm text-gray-500">{t('user.profileUpdated')}</p>
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full">
              <i className="ri-settings-3-line text-xl text-white"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{t('user.profileTitle')}</h3>
              <p className="text-xs text-white/80">{t('user.profileSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full text-white transition-all cursor-pointer disabled:opacity-50"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6 overflow-y-auto flex-1">
          {/* 帳號資訊區塊 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 flex items-center justify-center">
                <i className="ri-user-3-line text-rose-500 text-base"></i>
              </div>
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{t('user.accountInfo')}</h4>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('user.email')}
                </label>
                <input
                  type="text"
                  value={email}
                  disabled
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl bg-gray-50 text-gray-400 text-sm cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <i className="ri-lock-line"></i>
                  {t('user.emailLocked')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <i className="ri-user-smile-line text-rose-500"></i>
                  {t('user.nickname')}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  placeholder={t('user.nicknamePlaceholder')}
                  disabled={saving}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* 分隔線 */}
          <div className="border-t border-gray-100"></div>

          {/* 收貨資訊區塊 */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 flex items-center justify-center">
                <i className="ri-truck-line text-rose-500 text-base"></i>
              </div>
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">{t('user.shippingPreset')}</h4>
            </div>
            <p className="text-xs text-gray-400 mb-4 ml-8">{t('user.shippingPresetTip')}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <i className="ri-user-3-line text-rose-500"></i>
                  {t('user.recipientName')}
                </label>
                <input
                  type="text"
                  value={form.recipientName}
                  onChange={(e) => handleChange('recipientName', e.target.value)}
                  placeholder={t('user.recipientNamePlaceholder')}
                  disabled={saving}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <i className="ri-phone-line text-rose-500"></i>
                  {t('user.contactPhone')}
                </label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => handleChange('contactPhone', e.target.value)}
                  placeholder={t('user.contactPhonePlaceholder')}
                  disabled={saving}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                />
              </div>

              {/* 地址 4 個分欄位 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  <i className="ri-map-pin-line text-rose-500"></i>
                  {t('user.shippingAddress')}
                </label>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('user.flatFloor')}</label>
                      <input
                        type="text"
                        value={form.shippingFlatFloor}
                        onChange={(e) => handleChange('shippingFlatFloor', e.target.value)}
                        placeholder={t('user.flatFloorPlaceholder')}
                        disabled={saving}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('user.building')}</label>
                      <input
                        type="text"
                        value={form.shippingBuilding}
                        onChange={(e) => handleChange('shippingBuilding', e.target.value)}
                        placeholder={t('user.buildingPlaceholder')}
                        disabled={saving}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('user.street')}</label>
                    <input
                      type="text"
                      value={form.shippingStreet}
                      onChange={(e) => handleChange('shippingStreet', e.target.value)}
                      placeholder={t('user.streetPlaceholder')}
                      disabled={saving}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('user.district')}</label>
                    <input
                      type="text"
                      value={form.shippingDistrict}
                      onChange={(e) => handleChange('shippingDistrict', e.target.value)}
                      placeholder={t('user.districtPlaceholder')}
                      disabled={saving}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-rose-400 focus:outline-none transition-all text-sm disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <i className="ri-lightbulb-line text-amber-500 text-lg flex-shrink-0 mt-0.5"></i>
              <p className="text-xs text-amber-700 leading-relaxed">
                {t('user.shippingPresetNotice')}
              </p>
            </div>
          </div>

          {/* 錯誤提示 */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <i className="ri-error-warning-line text-red-500 flex-shrink-0"></i>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 按鈕 */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {t('user.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl font-semibold text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {saving ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  {t('user.saving')}
                </>
              ) : (
                <>
                  <i className="ri-save-line"></i>
                  {t('user.saveSettings')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

export default ProfileSettingsModal;