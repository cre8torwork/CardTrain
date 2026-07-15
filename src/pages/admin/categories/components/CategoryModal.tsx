import { useState, useEffect } from 'react';
import type { Category } from '../../../../hooks/useCategoryStore';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: { name: string; nameZhCn: string; nameEn: string; nameJa: string }) => void;
  category?: Category | null;
  existingNames: string[];
}

export const CategoryModal = ({ isOpen, onClose, onSubmit, category, existingNames }: CategoryModalProps) => {
  const [name, setName] = useState('');
  const [nameZhCn, setNameZhCn] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameJa, setNameJa] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(category?.name || '');
      setNameZhCn(category?.nameZhCn || '');
      setNameEn(category?.nameEn || '');
      setNameJa(category?.nameJa || '');
      setError('');
    }
  }, [isOpen, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('分類名稱不可為空');
      return;
    }

    const trimmedName = name.trim();
    const isDuplicate = existingNames.some(
      existingName => existingName === trimmedName && existingName !== category?.name
    );

    if (isDuplicate) {
      setError('此分類名稱已存在');
      return;
    }

    onSubmit({
      name: trimmedName,
      nameZhCn: nameZhCn.trim() || trimmedName,
      nameEn: nameEn.trim() || trimmedName,
      nameJa: nameJa.trim() || trimmedName,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {category ? '編輯分類' : '新增分類'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              繁體中文名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="請輸入繁體中文分類名稱"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              簡體中文名稱
            </label>
            <input
              type="text"
              value={nameZhCn}
              onChange={(e) => setNameZhCn(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="請輸入簡體中文分類名稱（留空則使用繁體中文）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              英文名稱
            </label>
            <input
              type="text"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="請輸入英文分類名稱（留空則使用繁體中文）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              日文名稱
            </label>
            <input
              type="text"
              value={nameJa}
              onChange={(e) => setNameJa(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="請輸入日文分類名稱（留空則使用繁體中文）"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
            >
              {category ? '儲存' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};