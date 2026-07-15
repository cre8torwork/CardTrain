import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';

export interface ShippingAddress {
  recipientName: string;
  phone: string;
  flatFloor: string;
  building: string;
  address: string;
  district: string;
  notes: string;
}

export async function getShippingAddress(recordId: string): Promise<ShippingAddress | null> {
  try {
    const { data, error } = await supabase
      .from('shipping_addresses')
      .select('*')
      .eq('record_id', recordId)
      .maybeSingle();

    if (error) throw error;
    
    if (data) {
      return {
        recipientName: data.recipient_name,
        phone: data.phone,
        flatFloor: data.flat_floor || '',
        building: data.building || '',
        address: data.address,
        district: data.district || '',
        notes: data.notes || '',
      };
    }
  } catch (error) {
    console.error('讀取收件地址失敗:', error);
  }
  return null;
}

export async function saveShippingAddress(recordId: string, address: ShippingAddress): Promise<void> {
  try {
    const { error } = await supabase
      .from('shipping_addresses')
      .upsert({
        record_id: recordId,
        recipient_name: address.recipientName,
        phone: address.phone,
        flat_floor: address.flatFloor,
        building: address.building,
        address: address.address,
        city: '',
        district: address.district,
        postal_code: '',
        notes: address.notes,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (error) {
    console.error('儲存收件地址失敗:', error);
    throw error;
  }
}

interface ShippingAddressModalProps {
  recordId: string;
  prizeName: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ShippingAddressModal({
  recordId,
  prizeName,
  onClose,
  onSaved,
}: ShippingAddressModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<ShippingAddress>({
    recipientName: '',
    phone: '',
    flatFloor: '',
    building: '',
    address: '',
    district: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAddress = async () => {
      const existing = await getShippingAddress(recordId);
      if (existing) {
        setForm(existing);
      }
    };
    loadAddress();
  }, [recordId]);

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validate = () => {
    if (!form.recipientName.trim()) return t('user.shippingAddr.errorNameRequired');
    if (!form.phone.trim()) return t('user.shippingAddr.errorPhoneRequired');
    if (!form.address.trim()) return t('user.shippingAddr.errorStreetRequired');
    if (!form.district.trim()) return t('user.shippingAddr.errorDistrictRequired');
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    try {
      const body = new URLSearchParams();
      body.append('recordId', recordId);
      body.append('prizeName', prizeName);
      body.append('recipientName', form.recipientName);
      body.append('phone', form.phone);
      body.append('flatFloor', form.flatFloor);
      body.append('building', form.building);
      body.append('address', form.address);
      body.append('district', form.district);
      body.append('notes', form.notes);

      await fetch('https://readdy.ai/api/form/d6o4ph539lnhn4hh14cg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      await saveShippingAddress(recordId, form);
      setSubmitted(true);
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1500);
    } catch {
      setError(t('user.shippingAddr.errorSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-rose-500 to-pink-500 text-white px-6 py-5 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                <i className="ri-map-pin-2-fill"></i>
                {t('user.shippingAddr.title')}
              </h2>
              <p className="text-rose-100 text-xs mt-1 truncate max-w-[280px]">{t('user.shippingAddr.prize', { name: prizeName })}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-lg"></i>
            </button>
          </div>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 flex items-center justify-center bg-green-100 rounded-full mb-4">
              <i className="ri-checkbox-circle-fill text-4xl text-green-500"></i>
            </div>
            <p className="text-lg font-bold text-gray-800 mb-1">{t('user.shippingAddr.saved')}</p>
            <p className="text-sm text-gray-500">{t('user.shippingAddr.savedDesc')}</p>
          </div>
        ) : (
          <form
            data-readdy-form
            onSubmit={handleSubmit}
            className="px-6 py-6 space-y-4 overflow-y-auto flex-1"
          >
            {/* 收件人 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('user.shippingAddr.recipientName')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="recipientName"
                value={form.recipientName}
                onChange={(e) => handleChange('recipientName', e.target.value)}
                placeholder={t('user.shippingAddr.recipientNamePlaceholder')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition"
              />
            </div>

            {/* 聯絡電話 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('user.shippingAddr.phone')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder={t('user.shippingAddr.phonePlaceholder')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition"
              />
            </div>

            {/* 地址欄位 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('user.shippingModal.address')} <span className="text-rose-500">*</span>
              </label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('user.shippingAddr.flatFloor')}</label>
                    <input
                      type="text"
                      name="flatFloor"
                      value={form.flatFloor}
                      onChange={(e) => handleChange('flatFloor', e.target.value)}
                      placeholder={t('user.shippingAddr.flatFloorPlaceholder')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">{t('user.shippingAddr.building')}</label>
                    <input
                      type="text"
                      name="building"
                      value={form.building}
                      onChange={(e) => handleChange('building', e.target.value)}
                      placeholder={t('user.shippingAddr.buildingPlaceholder')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('user.shippingAddr.street')} <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder={t('user.shippingAddr.streetPlaceholder')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('user.shippingAddr.district')} <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    name="district"
                    value={form.district}
                    onChange={(e) => handleChange('district', e.target.value)}
                    placeholder={t('user.shippingAddr.districtPlaceholder')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* 備註 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                {t('user.shippingAddr.notes')}
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder={t('user.shippingAddr.notesPlaceholder')}
                rows={2}
                maxLength={500}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-400 focus:border-transparent outline-none transition resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{form.notes.length}/500</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <i className="ri-error-warning-line text-red-500"></i>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-200 transition-all whitespace-nowrap cursor-pointer"
              >
                {t('user.shippingAddr.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-lg font-semibold text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow whitespace-nowrap cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin"></i>
                    {t('user.shippingAddr.submitting')}
                  </>
                ) : (
                  <>
                    <i className="ri-send-plane-fill"></i>
                    {t('user.shippingAddr.submit')}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}