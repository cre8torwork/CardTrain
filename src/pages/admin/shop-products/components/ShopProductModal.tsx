import { useState, useEffect, useRef } from 'react';
import type { ShopProduct } from '@/hooks/useShopStore';
import { supabase } from '@/lib/supabase';

interface ShopProductModalProps {
  product: ShopProduct | null;
  onSave: (data: Omit<ShopProduct, 'id' | 'createdAt'>) => Promise<void>;
  onClose: () => void;
}

interface UploadingItem {
  id: string;
  progress: number;
  name: string;
}

export default function ShopProductModal({ product, onSave, onClose }: ShopProductModalProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    image: '',       // 封面圖（從 images 中選一張）
    images: [] as string[],
    category: '',
    stock: '',
    isActive: true,
    isFeatured: false,
    sortOrder: '0',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingItems, setUploadingItems] = useState<UploadingItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      const imgs = product.images && product.images.length > 0
        ? product.images
        : product.image ? [product.image] : [];
      setForm({
        name: product.name,
        description: product.description,
        price: String(product.price),
        image: product.image,
        images: imgs,
        category: product.category,
        stock: String(product.stock),
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        sortOrder: String(product.sortOrder),
      });
    }
  }, [product]);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const uploadSingleImage = async (file: File): Promise<string> => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) throw new Error('只支援 JPG、PNG、WebP、GIF 格式');
    if (file.size > 5 * 1024 * 1024) throw new Error('圖片大小不能超過 5MB');

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `shop-products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { upsert: false, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const newItems: UploadingItem[] = files.map((f) => ({
      id: `${Date.now()}-${Math.random()}`,
      progress: 0,
      name: f.name,
    }));
    setUploadingItems((prev) => [...prev, ...newItems]);
    setError('');

    const results: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const itemId = newItems[i].id;
      setUploadingItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, progress: 40 } : it))
      );
      try {
        const url = await uploadSingleImage(files[i]);
        setUploadingItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, progress: 100 } : it))
        );
        results.push(url);
      } catch (err: any) {
        setError(err.message || '部分圖片上傳失敗');
        setUploadingItems((prev) => prev.filter((it) => it.id !== itemId));
      }
    }

    setForm((prev) => {
      const newImages = [...prev.images, ...results];
      // 若還沒有封面，自動設第一張為封面
      const newCover = prev.image || results[0] || '';
      return { ...prev, images: newImages, image: newCover };
    });

    setTimeout(() => {
      setUploadingItems((prev) =>
        prev.filter((it) => !newItems.find((n) => n.id === it.id))
      );
    }, 800);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      const fakeEvent = { target: { files: dt.files, value: '' } } as any;
      handleFilesChange(fakeEvent);
    }
  };

  const handleRemoveImage = (url: string) => {
    setForm((prev) => {
      const newImages = prev.images.filter((img) => img !== url);
      const newCover = prev.image === url ? (newImages[0] || '') : prev.image;
      return { ...prev, images: newImages, image: newCover };
    });
  };

  const handleSetCover = (url: string) => {
    setForm((prev) => ({ ...prev, image: url }));
  };

  const validate = () => {
    if (!form.name.trim()) return '請填寫商品名稱';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0) return '請填寫有效的積分價格';
    if (!form.stock || isNaN(Number(form.stock)) || Number(form.stock) < 0) return '請填寫有效的庫存數量';
    if (form.images.length === 0) return '請至少上傳一張商品圖片';
    if (!form.image) return '請選擇一張封面圖片';
    return '';
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        image: form.image,
        images: form.images,
        category: form.category.trim(),
        stock: Number(form.stock),
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        sortOrder: Number(form.sortOrder) || 0,
      });
    } catch {
      setError('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  const isUploading = uploadingItems.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-base font-bold text-gray-800">
            {product ? '編輯商品' : '新增商品'}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
          {/* 商品名稱 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">商品名稱 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="請輸入商品名稱"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
          </div>

          {/* 商品描述 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">商品描述</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="請輸入商品描述"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
          </div>

          {/* 多圖上傳區 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">
                商品圖片 * <span className="text-gray-400 font-normal">（可上傳多張，點擊圖片設為封面）</span>
              </label>
              <span className="text-xs text-gray-400">{form.images.length} 張</span>
            </div>

            {/* 已上傳圖片網格 */}
            {form.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {form.images.map((url) => {
                  const isCover = form.image === url;
                  return (
                    <div
                      key={url}
                      className={`relative group rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                        isCover ? 'border-rose-500 ring-2 ring-rose-300' : 'border-gray-200 hover:border-rose-300'
                      }`}
                      style={{ aspectRatio: '1' }}
                      onClick={() => handleSetCover(url)}
                      title="點擊設為封面"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {/* 封面標籤 */}
                      {isCover && (
                        <div className="absolute bottom-0 left-0 right-0 bg-rose-500 text-white text-center text-xs font-bold py-0.5">
                          封面
                        </div>
                      )}
                      {/* hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        {!isCover && (
                          <span className="text-white text-xs font-semibold bg-black/50 px-2 py-0.5 rounded-full">
                            設為封面
                          </span>
                        )}
                      </div>
                      {/* 刪除按鈕 */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(url); }}
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600"
                      >
                        <i className="ri-close-line"></i>
                      </button>
                    </div>
                  );
                })}

                {/* 上傳中的佔位 */}
                {uploadingItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative rounded-xl overflow-hidden border-2 border-dashed border-rose-300 bg-rose-50 flex flex-col items-center justify-center gap-1"
                    style={{ aspectRatio: '1' }}
                  >
                    <i className="ri-loader-4-line text-rose-400 text-lg animate-spin"></i>
                    <div className="w-10 h-1 bg-rose-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}

                {/* 新增更多按鈕 */}
                <div
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all ${
                    isUploading
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-300 bg-gray-50 hover:border-rose-400 hover:bg-rose-50 cursor-pointer'
                  }`}
                  style={{ aspectRatio: '1' }}
                >
                  <i className="ri-add-line text-xl text-gray-400"></i>
                  <span className="text-xs text-gray-400">新增</span>
                </div>
              </div>
            )}

            {/* 無圖片時的大上傳區 */}
            {form.images.length === 0 && (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`w-full h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all ${
                  isUploading
                    ? 'border-rose-300 bg-rose-50 cursor-not-allowed'
                    : 'border-gray-300 bg-gray-50 hover:border-rose-400 hover:bg-rose-50 cursor-pointer'
                }`}
              >
                {isUploading ? (
                  <>
                    <i className="ri-loader-4-line text-3xl text-rose-400 animate-spin"></i>
                    <p className="text-rose-500 text-sm font-medium">上傳中...</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100">
                      <i className="ri-image-add-line text-2xl text-gray-400"></i>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-600">點擊或拖放圖片至此</p>
                      <p className="text-xs text-gray-400 mt-0.5">支援多選，JPG / PNG / WebP，最大 5MB</p>
                    </div>
                  </>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFilesChange}
              className="hidden"
            />

            {/* 封面提示 */}
            {form.images.length > 0 && form.image && (
              <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1">
                <i className="ri-checkbox-circle-fill"></i>
                已選封面：點擊其他圖片可更換封面
              </p>
            )}
          </div>

          {/* 價格、庫存、分類、排序 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">積分價格 (CTP) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
                placeholder="0"
                min="1"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">庫存數量 *</label>
              <input
                type="number"
                value={form.stock}
                onChange={(e) => handleChange('stock', e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">分類</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="如：卡牌、周邊"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">排序（數字越小越前）</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => handleChange('sortOrder', e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
          </div>

          {/* 上架 / 精選 toggles */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => handleChange('isActive', !form.isActive)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${form.isActive ? 'bg-rose-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
              </div>
              <span className="text-sm text-gray-700">上架中</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => handleChange('isFeatured', !form.isFeatured)}
                className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${form.isFeatured ? 'bg-amber-400' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isFeatured ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
              </div>
              <span className="text-sm text-gray-700">精選商品</span>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <i className="ri-error-warning-line flex-shrink-0"></i>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || isUploading}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm hover:from-rose-600 hover:to-pink-600 transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <i className="ri-loader-4-line animate-spin"></i>儲存中...
              </span>
            ) : isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="ri-loader-4-line animate-spin"></i>圖片上傳中...
              </span>
            ) : (
              product ? '儲存修改' : '新增商品'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
