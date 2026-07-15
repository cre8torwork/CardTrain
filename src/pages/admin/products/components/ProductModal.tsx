import { useState, useEffect, useRef, useCallback } from 'react';
import { useCategoryStore } from '../../../../hooks/useCategoryStore';
import { supabase } from '../../../../lib/supabase';

type Rarity = 'SS' | 'S' | 'A' | 'B' | 'C';

interface Prize {
  id: string;
  name: string;
  image: string;
  quantity: number;
  rarity: Rarity;
  minRemaining?: number | null;
  marketPrice?: number; // 市場價格
}

interface Product {
  id: number;
  name: string;
  nameZhTw?: string;
  nameZhCn?: string;
  nameEn?: string;
  nameJa?: string;
  category: string;
  price: number;
  totalSlots: number;
  remaining: number;
  image: string;
  isHot: boolean;
  isNew: boolean;
  prizes?: Prize[];
  boardType: 'open' | 'closed';
  marketPrice?: number; // 福袋市場價格
}

interface ProductModalProps {
  product: Product | null;
  categories: string[];
  onSave: (product: Omit<Product, 'id'>) => void | Promise<void>;
  onClose: () => void;
  error?: string;
  isSaving?: boolean;
}

// 圖片上傳元件
interface ImageUploaderProps {
  value: string;
  onChange: (dataUrl: string) => void;
  error?: string;
  label: string;
  required?: boolean;
  aspectClass?: string;
}

function ImageUploader({ value, onChange, error, label, required, aspectClass = 'h-36' }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) onChange(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {value ? (
        <div className={`relative w-full ${aspectClass} border-2 border-gray-200 rounded-xl overflow-hidden group cursor-pointer`}
          onClick={() => inputRef.current?.click()}
        >
          <img
            src={value}
            alt="預覽"
            className="w-full h-full object-contain bg-gray-50"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="px-3 py-1.5 bg-white text-gray-800 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <i className="ri-upload-2-line"></i> 重新上傳
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition-colors whitespace-nowrap flex items-center gap-1"
            >
              <i className="ri-delete-bin-line"></i> 移除
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`w-full ${aspectClass} border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
            dragging
              ? 'border-rose-400 bg-rose-50'
              : error
              ? 'border-red-300 bg-red-50 hover:border-red-400'
              : 'border-gray-300 bg-gray-50 hover:border-rose-400 hover:bg-rose-50'
          }`}
        >
          <div className={`w-10 h-10 flex items-center justify-center rounded-full ${dragging ? 'bg-rose-100' : 'bg-gray-100'}`}>
            <i className={`ri-image-add-line text-xl ${dragging ? 'text-rose-500' : 'text-gray-400'}`}></i>
          </div>
          <div className="text-center">
            <p className={`text-sm font-medium ${dragging ? 'text-rose-600' : 'text-gray-500'}`}>
              {dragging ? '放開以上傳圖片' : '點擊或拖曳上傳圖片'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">支援 JPG、PNG、GIF、WebP</p>
          </div>
        </div>
      )}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function ProductModal({ product, categories, onSave, onClose, error, isSaving }: ProductModalProps) {
  const { getLocalizedName, categories: storeCategories } = useCategoryStore();
  const categoryOptions = storeCategories.map(cat => ({ name: cat.name, displayName: cat.name }));

  const [formData, setFormData] = useState({
    name: '',
    nameZhTw: '',
    nameZhCn: '',
    nameEn: '',
    nameJa: '',
    category: product?.category || categories[0] || '',
    price: 0,
    totalSlots: 0,
    remaining: 0,
    image: '',
    isHot: false,
    isNew: false,
    boardType: 'open' as 'open' | 'closed',
    marketPrice: 0,
  });

  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 編輯模式：新增獎品到號碼池（彈窗）
  const [showAddPrizeModal, setShowAddPrizeModal] = useState(false);
  const [addPrizeForm, setAddPrizeForm] = useState({ name: '', image: '', rarity: 'A' as Rarity, marketPrice: '' });
  const [addPrizeLoading, setAddPrizeLoading] = useState(false);
  const [addPrizeMsg, setAddPrizeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        nameZhTw: product.nameZhTw || '',
        nameZhCn: product.nameZhCn || '',
        nameEn: product.nameEn || '',
        nameJa: product.nameJa || '',
        category: product.category,
        price: product.price,
        totalSlots: product.totalSlots,
        remaining: product.remaining,
        image: product.image,
        isHot: product.isHot,
        isNew: product.isNew,
        boardType: product.boardType ?? 'open',
        marketPrice: product.marketPrice ?? 0,
      });
      setPrizes(product.prizes || []);
    }
  }, [product]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = '請輸入商品名稱';
    if (!formData.category) newErrors.category = '請選擇商品分類';
    if (formData.price <= 0) newErrors.price = '價格必須大於 0';
    if (formData.totalSlots <= 0) newErrors.totalSlots = '總口數必須大於 0';
    // 剩餘口數由系統管理，新增時自動設為總口數
    if (!formData.image) newErrors.image = '請上傳商品圖片';

    if (prizes.length === 0) {
      newErrors.prizes = '至少需要新增一個獎品';
    } else {
      const totalPrizeQuantity = prizes.reduce((sum, prize) => sum + prize.quantity, 0);
      if (totalPrizeQuantity > formData.totalSlots) {
        newErrors.prizes = `獎品號碼總數 (${totalPrizeQuantity}) 不可超過總口數 (${formData.totalSlots})`;
      }
      prizes.forEach((prize, index) => {
        if (!prize.name.trim()) newErrors[`prize_name_${index}`] = '請輸入獎品名稱';
        if (!prize.image) newErrors[`prize_image_${index}`] = '請上傳獎品圖片';
        if (prize.quantity <= 0) newErrors[`prize_quantity_${index}`] = '號碼數量必須大於 0';
        if (!prize.marketPrice || prize.marketPrice <= 0) newErrors[`prize_market_price_${index}`] = '市場價格必須大於 0';
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const remaining = product ? formData.remaining : formData.totalSlots;
      await onSave({ ...formData, remaining, prizes });
    }
  };

  // sync category default when categories load
  useEffect(() => {
    if (!product && !formData.category && categoryOptions.length > 0) {
      setFormData(prev => ({ ...prev, category: categoryOptions[0].name }));
    }
  }, [categoryOptions.length]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleAddPrize = () => {
    if (product) {
      // 編輯模式：開啟新增獎品至號碼池的彈窗
      setAddPrizeForm({ name: '', image: '', rarity: 'A', marketPrice: '' });
      setAddPrizeMsg(null);
      setShowAddPrizeModal(true);
    } else {
      // 新增模式：在表單中加一列
      const newPrize: Prize = {
        id: `prize_${Date.now()}_${Math.random()}`,
        name: '',
        image: '',
        quantity: 1,
        rarity: 'C',
        minRemaining: null,
        marketPrice: 0,
      };
      setPrizes([...prizes, newPrize]);
    }
  };

  const handleRemovePrize = (id: string) => {
    setPrizes(prizes.filter((prize) => prize.id !== id));
    const index = prizes.findIndex((p) => p.id === id);
    if (index !== -1) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`prize_name_${index}`];
        delete newErrors[`prize_image_${index}`];
        delete newErrors[`prize_quantity_${index}`];
        delete newErrors[`prize_market_price_${index}`];
        return newErrors;
      });
    }
  };

  const handlePrizeChange = (id: string, field: keyof Prize, value: string | number) => {
    setPrizes(
      prizes.map((prize) =>
        prize.id === id ? { ...prize, [field]: value } : prize
      )
    );
    const index = prizes.findIndex((p) => p.id === id);
    if (index !== -1) {
      const errorKey = `prize_${field}_${index}`;
      if (errors[errorKey]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          delete newErrors.prizes;
          return newErrors;
        });
      }
    }
  };

  // 編輯模式：新增獎品並取代一個剩餘非中獎號碼
  const handleAddPrizeToPool = async () => {
    if (!product) return;
    setAddPrizeMsg(null);

    if (!addPrizeForm.name.trim()) {
      setAddPrizeMsg({ type: 'error', text: '請輸入獎品名稱' });
      return;
    }
    if (!addPrizeForm.image.trim()) {
      setAddPrizeMsg({ type: 'error', text: '請上傳獎品圖片' });
      return;
    }

    try {
      setAddPrizeLoading(true);

      // 查詢剩餘未抽出的非中獎號碼
      const { data: nonPrizeSlots, error: fetchErr } = await supabase
        .from('draw_slots')
        .select('id, slot_number')
        .eq('product_id', product.id)
        .eq('is_drawn', false)
        .is('prize_id', null);

      if (fetchErr) throw fetchErr;
      if (!nonPrizeSlots || nonPrizeSlots.length === 0) {
        setAddPrizeMsg({ type: 'error', text: '目前沒有可替換的剩餘非中獎號碼' });
        return;
      }

      // 隨機選一個
      const target = nonPrizeSlots[Math.floor(Math.random() * nonPrizeSlots.length)];
      const prizeId = `prize_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const marketPriceVal = addPrizeForm.marketPrice ? parseInt(addPrizeForm.marketPrice, 10) : null;

      // 寫入 prizes 表
      const { error: prizeErr } = await supabase.from('prizes').insert({
        id: prizeId,
        product_id: product.id,
        name: addPrizeForm.name.trim(),
        image: addPrizeForm.image.trim(),
        quantity: 1,
        rarity: addPrizeForm.rarity,
        market_price: marketPriceVal,
        min_remaining: null,
      });
      if (prizeErr) throw prizeErr;

      // 更新 draw_slots
      const { error: slotErr } = await supabase
        .from('draw_slots')
        .update({
          prize_id: prizeId,
          prize_name: addPrizeForm.name.trim(),
          prize_rarity: addPrizeForm.rarity,
          prize_market_price: marketPriceVal,
        })
        .eq('id', target.id);
      if (slotErr) throw slotErr;

      // 更新本地 prizes 列表顯示
      setPrizes(prev => [...prev, {
        id: prizeId,
        name: addPrizeForm.name.trim(),
        image: addPrizeForm.image.trim(),
        quantity: 1,
        rarity: addPrizeForm.rarity,
        marketPrice: marketPriceVal ?? undefined,
        minRemaining: null,
      }]);

      setAddPrizeMsg({ type: 'success', text: `成功！已將 #${target.slot_number} 號碼設為「${addPrizeForm.name.trim()}」的中獎號碼！` });
      setAddPrizeForm({ name: '', image: '', rarity: 'A', marketPrice: '' });
    } catch (err) {
      console.error('新增獎品失敗:', err);
      setAddPrizeMsg({ type: 'error', text: '新增獎品失敗，請稍後再試' });
    } finally {
      setAddPrizeLoading(false);
    }
  };

  const totalPrizeQuantity = prizes.reduce((sum, prize) => sum + prize.quantity, 0);
  const nonPrizeSlots = formData.totalSlots - totalPrizeQuantity;
  const winRate = formData.totalSlots > 0 ? ((totalPrizeQuantity / formData.totalSlots) * 100).toFixed(1) : '0.0';

  return (
    <>
    {/* 編輯模式：新增獎品至號碼池 彈窗 */}
    {showAddPrizeModal && product && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h4 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <i className="ri-gift-line text-emerald-500"></i>
                新增獎品至號碼池
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">新獎品將隨機取代一個剩餘的非中獎號碼</p>
            </div>
            <button
              type="button"
              onClick={() => { setShowAddPrizeModal(false); setAddPrizeMsg(null); }}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* 獎品名稱 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                獎品名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={addPrizeForm.name}
                onChange={(e) => setAddPrizeForm(p => ({ ...p, name: e.target.value }))}
                placeholder="例：Charizard ex SAR"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* 稀有度 & 市場價格 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">稀有度</label>
                <select
                  value={addPrizeForm.rarity}
                  onChange={(e) => setAddPrizeForm(p => ({ ...p, rarity: e.target.value as Rarity }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                >
                  <option value="SS">SS</option>
                  <option value="S">S</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">市場價格（HK$）</label>
                <input
                  type="number"
                  value={addPrizeForm.marketPrice}
                  onChange={(e) => setAddPrizeForm(p => ({ ...p, marketPrice: e.target.value }))}
                  placeholder="選填"
                  min="0"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* 獎品圖片上傳 */}
            <ImageUploader
              label="獎品圖片"
              required
              value={addPrizeForm.image}
              onChange={(val) => setAddPrizeForm(p => ({ ...p, image: val }))}
              aspectClass="h-36"
            />

            {/* 訊息提示 */}
            {addPrizeMsg && (
              <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm ${
                addPrizeMsg.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                <i className={`mt-0.5 ${addPrizeMsg.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'}`}></i>
                <span>{addPrizeMsg.text}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => { setShowAddPrizeModal(false); setAddPrizeMsg(null); }}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleAddPrizeToPool}
              disabled={addPrizeLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
            >
              {addPrizeLoading
                ? <><i className="ri-loader-4-line animate-spin"></i>新增中...</>
                : <><i className="ri-add-line"></i>確認新增獎品</>
              }
            </button>
          </div>
        </div>
      </div>
    )}

    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal 標題 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-xl font-bold text-gray-800">
            {product ? '編輯商品' : '新增商品'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* Modal 內容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 基本資訊區塊 */}
          <div className="space-y-5">
            <h4 className="text-base font-bold text-gray-800 border-b pb-2">基本資訊</h4>

            {/* 商品名稱（多語言） */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  商品名稱（預設） <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="請輸入商品名稱（預設語言）"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                    errors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-rose-500'
                  }`}
                />
                {errors.name && <p className="mt-1.5 text-xs text-red-600">{errors.name}</p>}
                <p className="mt-1 text-xs text-gray-400">此名稱為所有語言的 fallback，未填寫對應語言時會顯示此名稱</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    繁體中文名稱
                  </label>
                  <input
                    type="text"
                    value={formData.nameZhTw}
                    onChange={(e) => handleChange('nameZhTw', e.target.value)}
                    placeholder="選填"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    簡體中文名稱
                  </label>
                  <input
                    type="text"
                    value={formData.nameZhCn}
                    onChange={(e) => handleChange('nameZhCn', e.target.value)}
                    placeholder="選填"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    英文名稱
                  </label>
                  <input
                    type="text"
                    value={formData.nameEn}
                    onChange={(e) => handleChange('nameEn', e.target.value)}
                    placeholder="選填"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    日文名稱
                  </label>
                  <input
                    type="text"
                    value={formData.nameJa}
                    onChange={(e) => handleChange('nameJa', e.target.value)}
                    placeholder="選填"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 商品分類 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                商品分類 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm cursor-pointer ${
                  errors.category ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-rose-500'
                }`}
              >
                {categoryOptions.map((cat) => (
                  <option key={cat.name} value={cat.name}>{cat.displayName}</option>
                ))}
              </select>
              {errors.category && <p className="mt-1.5 text-xs text-red-600">{errors.category}</p>}
            </div>

            {/* 價格、口數與市場價格 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  單口價格 (CTP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleChange('price', Number(e.target.value))}
                  placeholder="0"
                  min="0"
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                    errors.price ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-rose-500'
                  }`}
                />
                {errors.price && <p className="mt-1.5 text-xs text-red-600">{errors.price}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  總口數 {!product && <span className="text-red-500">*</span>}
                </label>
                {product ? (
                  <>
                    <input
                      type="number"
                      value={formData.totalSlots}
                      readOnly
                      disabled
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-400">福袋新增後總口數不可更改</p>
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      value={formData.totalSlots}
                      onChange={(e) => handleChange('totalSlots', Number(e.target.value))}
                      placeholder="0"
                      min="0"
                      className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                        errors.totalSlots ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-rose-500'
                      }`}
                    />
                    {errors.totalSlots && <p className="mt-1.5 text-xs text-red-600">{errors.totalSlots}</p>}
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  剩餘口數
                </label>
                <input
                  type="number"
                  value={formData.remaining}
                  readOnly
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-400">剩餘口數由系統自動管理，不可手動修改</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  市場價格 (HK$)
                </label>
                <input
                  type="number"
                  value={formData.marketPrice}
                  onChange={(e) => handleChange('marketPrice', Number(e.target.value))}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>
            </div>

            {/* 商品圖片上傳 */}
            <ImageUploader
              label="商品圖片"
              required
              value={formData.image}
              onChange={(val) => handleChange('image', val)}
              error={errors.image}
              aspectClass="h-44"
            />

            {/* 盤型設定 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                盤型設定 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('boardType', 'open')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    formData.boardType === 'open'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-emerald-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full ${formData.boardType === 'open' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <i className="ri-eye-line text-xl"></i>
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${formData.boardType === 'open' ? 'text-emerald-700' : 'text-gray-700'}`}>明盤</p>
                    <p className="text-xs text-gray-500 mt-0.5">客戶可在抽獎前查看剩餘獎品</p>
                  </div>
                  {formData.boardType === 'open' && (
                    <div className="w-5 h-5 flex items-center justify-center bg-emerald-500 rounded-full">
                      <i className="ri-check-line text-white text-xs"></i>
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleChange('boardType', 'closed')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    formData.boardType === 'closed'
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 hover:border-rose-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full ${formData.boardType === 'closed' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <i className="ri-eye-off-line text-xl"></i>
                  </div>
                  <div className="text-center">
                    <p className={`text-sm font-bold ${formData.boardType === 'closed' ? 'text-rose-700' : 'text-gray-700'}`}>暗盤</p>
                    <p className="text-xs text-gray-500 mt-0.5">獎品內容對客戶保密隱藏</p>
                  </div>
                  {formData.boardType === 'closed' && (
                    <div className="w-5 h-5 flex items-center justify-center bg-rose-500 rounded-full">
                      <i className="ri-check-line text-white text-xs"></i>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* 標籤設定 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">商品標籤</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isHot}
                    onChange={(e) => handleChange('isHot', e.target.checked)}
                    className="w-4 h-4 text-rose-600 border-gray-300 rounded focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">HOT 熱門商品</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isNew}
                    onChange={(e) => handleChange('isNew', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-700">NEW 最新商品</span>
                </label>
              </div>
            </div>
          </div>

          {/* 獎品設定區塊 */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-gray-800">獎品設定</h4>
              <button
                type="button"
                onClick={handleAddPrize}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium whitespace-nowrap flex items-center gap-2"
              >
                <i className="ri-add-line"></i>
                新增獎品
              </button>
            </div>

            {/* 號碼分配預覽 */}
            {formData.totalSlots > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <i className="ri-ticket-line text-blue-600 text-lg mt-0.5"></i>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-blue-800 mb-2">號碼池分配預覽</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="bg-white rounded-lg p-2 border border-blue-100">
                        <p className="text-gray-600 text-xs">總口數</p>
                        <p className="text-blue-900 font-bold text-lg">{formData.totalSlots}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-emerald-100">
                        <p className="text-gray-600 text-xs">獎品號碼</p>
                        <p className="text-emerald-700 font-bold text-lg">{totalPrizeQuantity}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-gray-100">
                        <p className="text-gray-600 text-xs">未中獎號碼</p>
                        <p className="text-gray-700 font-bold text-lg">{nonPrizeSlots >= 0 ? nonPrizeSlots : 0}</p>
                      </div>
                    </div>
                    <p className="text-blue-700 mt-2 text-xs">
                      中獎率：<span className="font-bold text-blue-900">{winRate}%</span>
                      {nonPrizeSlots < 0 && <span className="text-red-600 ml-2">⚠️ 獎品號碼超出總口數！</span>}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 獎品列表 */}
            {prizes.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <i className="ri-gift-line text-4xl text-gray-400 mb-2"></i>
                <p className="text-gray-500 text-sm">尚未新增任何獎品，請點擊上方按鈕新增</p>
              </div>
            ) : (
              <div className="space-y-4">
                {prizes.map((prize, index) => (
                  <div key={prize.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">獎品 #{index + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePrize(prize.id)}
                        className="w-7 h-7 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <i className="ri-delete-bin-line"></i>
                      </button>
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                      {/* 獎品名稱 */}
                      <div className="col-span-4">
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          獎品名稱 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={prize.name}
                          onChange={(e) => handlePrizeChange(prize.id, 'name', e.target.value)}
                          placeholder="請輸入獎品名稱"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                            errors[`prize_name_${index}`]
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-rose-500'
                          }`}
                        />
                        {errors[`prize_name_${index}`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`prize_name_${index}`]}</p>
                        )}
                      </div>

                      {/* 稀有度 */}
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          稀有度 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={prize.rarity}
                          onChange={(e) => handlePrizeChange(prize.id, 'rarity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm cursor-pointer"
                        >
                          <option value="SS">SS</option>
                          <option value="S">S</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                        </select>
                      </div>

                      {/* 號碼數量 */}
                      <div className="col-span-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          號碼數量 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={prize.quantity}
                          onChange={(e) => handlePrizeChange(prize.id, 'quantity', Number(e.target.value))}
                          placeholder="1"
                          min="1"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                            errors[`prize_quantity_${index}`]
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-rose-500'
                          }`}
                        />
                        {errors[`prize_quantity_${index}`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`prize_quantity_${index}`]}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">該獎品在號碼池中佔幾個號碼</p>
                      </div>

                      {/* 市場價格 */}
                      <div className="col-span-3">
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                          市場價格 (HK$) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={prize.marketPrice || 0}
                          onChange={(e) => handlePrizeChange(prize.id, 'marketPrice', Number(e.target.value))}
                          placeholder="0"
                          min="0"
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                            errors[`prize_market_price_${index}`]
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-rose-500'
                          }`}
                        />
                        {errors[`prize_market_price_${index}`] && (
                          <p className="mt-1 text-xs text-red-600">{errors[`prize_market_price_${index}`]}</p>
                        )}
                      </div>
                    </div>

                    {/* 最低剩餘口數控制 */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <i className="ri-lock-line text-amber-600 text-sm mt-0.5"></i>
                        <div>
                          <p className="text-xs font-semibold text-amber-800">出現條件控制</p>
                          <p className="text-xs text-amber-600 mt-0.5">設定商品剩餘口數低於此數值時，此獎品的號碼才會出現在號碼池中。留空則不作限制。</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-amber-700 whitespace-nowrap">剩餘口數低於</label>
                        <input
                          type="number"
                          value={prize.minRemaining ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handlePrizeChange(
                              prize.id,
                              'minRemaining' as keyof Prize,
                              val === '' ? null : Number(val)
                            );
                          }}
                          placeholder="留空 = 不限制"
                          min="1"
                          className="flex-1 px-3 py-1.5 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm bg-white"
                        />
                        <label className="text-xs font-semibold text-amber-700 whitespace-nowrap">口時才可抽中</label>
                      </div>
                    </div>

                    {/* 獎品圖片上傳 */}
                    <ImageUploader
                      label="獎品圖片"
                      required
                      value={prize.image}
                      onChange={(val) => {
                        handlePrizeChange(prize.id, 'image', val);
                        const idx = prizes.findIndex((p) => p.id === prize.id);
                        if (idx !== -1 && errors[`prize_image_${idx}`]) {
                          setErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors[`prize_image_${idx}`];
                            return newErrors;
                          });
                        }
                      }}
                      error={errors[`prize_image_${index}`]}
                      aspectClass="h-32"
                    />
                  </div>
                ))}
              </div>
            )}

            {errors.prizes && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <i className="ri-error-warning-line mr-1"></i>
                {errors.prizes}
              </p>
            )}

            {/* 編輯模式提示 */}
            {product && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-2">
                <i className="ri-information-line text-blue-500 mt-0.5"></i>
                <p className="text-xs text-blue-700">
                  編輯模式下，點擊「+ 新增獎品」可為此福袋額外新增獎品，新獎品將隨機取代號碼池中一個剩餘的非中獎號碼。
                </p>
              </div>
            )}
          </div>

          {/* 按鈕區 */}
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <i className="ri-error-warning-line mt-0.5"></i>
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium whitespace-nowrap disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <i className="ri-loader-4-line animate-spin"></i>
                  {product ? '儲存中...' : '新增中...'}
                </>
              ) : (
                <>{product ? '儲存變更' : '新增商品'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}