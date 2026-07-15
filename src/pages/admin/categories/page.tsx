import { useState, useEffect } from 'react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { useCategoryStore, type Category } from '../../../hooks/useCategoryStore';
import { CategoryModal } from './components/CategoryModal';
import { DeleteCategoryModal } from './components/DeleteCategoryModal';

export default function CategoriesPage() {
  const { categories, loadCategories, addCategory, updateCategory, deleteCategory, getCategoryProductCount } = useCategoryStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deletingProductCount, setDeletingProductCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadCategories();
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, number> = {};
      for (const cat of categories) {
        counts[cat.id] = await getCategoryProductCount(cat.name);
      }
      setProductCounts(counts);
    };
    if (categories.length > 0) fetchCounts();
  }, [categories]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (category: Category) => {
    const count = await getCategoryProductCount(category.name);
    setDeletingProductCount(count);
    setDeletingCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = async (input: { name: string; nameZhCn: string; nameEn: string; nameJa: string }) => {
    const mappedInput = {
      name: input.name,
      name_zh_cn: input.nameZhCn,
      name_en: input.nameEn,
      name_ja: input.nameJa,
    };
    if (editingCategory) {
      const result = await updateCategory(editingCategory.id, mappedInput);
      if (result.success) {
        showToast('分類已成功更新', 'success');
      } else {
        showToast(result.message || '更新失敗，請稍後再試', 'error');
      }
    } else {
      const result = await addCategory(mappedInput);
      if (result.success) {
        showToast('分類已成功新增', 'success');
      } else {
        showToast(result.message || '新增失敗，請稍後再試', 'error');
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingCategory) {
      const result = await deleteCategory(deletingCategory.id);
      if (result.success) {
        showToast('分類已成功刪除', 'success');
      } else {
        showToast(result.message || '刪除失敗，請稍後再試', 'error');
      }
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Toast 提示 */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm transition-all ${toast.type === 'success' ? 'bg-teal-600' : 'bg-red-600'}`}>
            <i className={`${toast.type === 'success' ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} text-lg`}></i>
            {toast.message}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">分類管理</h1>
            <p className="text-gray-600 mt-1">管理商品分類，新增、編輯或刪除分類</p>
          </div>
          <button
            onClick={handleAddCategory}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <i className="ri-add-line"></i>
            新增分類
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">分類名稱</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">商品數量</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">建立時間</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">操作</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <i className="ri-loader-4-line text-4xl text-gray-300 animate-spin"></i>
                        <p>載入中...</p>
                      </div>
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <i className="ri-price-tag-3-line text-4xl text-gray-300"></i>
                        <p>尚無分類，請新增第一個分類</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-100">
                            <i className="ri-price-tag-3-line text-teal-600"></i>
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 block">{category.name}</span>
                            <span className="text-xs text-gray-500">{category.nameZhCn !== category.name ? category.nameZhCn : ''} {category.nameEn !== category.name ? `(${category.nameEn})` : ''} {category.nameJa !== category.name ? `/${category.nameJa}` : ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                          {productCounts[category.id] ?? '—'} 個商品
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(category.createdAt).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title="編輯"
                          >
                            <i className="ri-edit-line"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(category)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="刪除"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <CategoryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          category={editingCategory}
          existingNames={categories.map(c => c.name)}
        />

        <DeleteCategoryModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          categoryName={deletingCategory?.name || ''}
          productCount={deletingProductCount}
        />
      </div>
    </AdminLayout>
  );
}