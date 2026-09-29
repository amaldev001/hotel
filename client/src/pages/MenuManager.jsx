import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../components/common/Toast';
import { formatMoney } from '../utils/moneyFormatter';
import Skeleton from '../components/common/Skeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import { Plus, Edit, Trash2, Image, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

export const MenuManager = () => {
  const { config } = useConfig();
  const { showToast } = useToast();

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', displayOrder: 1 });
  const [editingCatId, setEditingCatId] = useState(null);

  // Item Modal State
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    price: 1000,
    diet: 'veg',
    imageUrl: '',
    isAvailable: true,
  });
  const [editingItemId, setEditingItemId] = useState(null);

  // Image Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const fetchMenu = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/restaurant/categories'),
      api.get('/restaurant/items'),
    ])
      .then(([catRes, itemRes]) => {
        setCategories(catRes.data.data || []);
        setItems(itemRes.data.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.error?.message || 'Failed to fetch menu manager data');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // Category Handlers
  const handleOpenCatModal = (cat = null) => {
    if (cat) {
      setEditingCatId(cat._id);
      setCatForm({ name: cat.name, displayOrder: cat.displayOrder || 1 });
    } else {
      setEditingCatId(null);
      setCatForm({ name: '', displayOrder: categories.length + 1 });
    }
    setCatModalOpen(true);
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();
    try {
      if (editingCatId) {
        await api.put(`/restaurant/categories/${editingCatId}`, catForm);
        showToast('Category updated', 'success');
      } else {
        await api.post('/restaurant/categories', catForm);
        showToast('Category created', 'success');
      }
      setCatModalOpen(false);
      fetchMenu();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to save category', 'error');
    }
  };

  const handleDeleteCat = async (catId) => {
    try {
      await api.delete(`/restaurant/categories/${catId}`);
      showToast('Category deleted', 'info');
      fetchMenu();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to delete category', 'error');
    }
  };

  // Item Handlers
  const handleOpenItemModal = (item = null) => {
    if (item) {
      setEditingItemId(item._id);
      setItemForm({
        categoryId: item.categoryId._id || item.categoryId,
        name: item.name,
        description: item.description || '',
        price: item.price,
        diet: item.diet || 'veg',
        imageUrl: item.imageUrl || '',
        isAvailable: item.isAvailable,
      });
      setImagePreview(item.imageUrl || '');
    } else {
      setEditingItemId(null);
      setItemForm({
        categoryId: categories[0]?._id || '',
        name: '',
        description: '',
        price: 1000,
        diet: 'veg',
        imageUrl: '',
        isAvailable: true,
      });
      setImagePreview('');
    }
    setItemModalOpen(true);
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side file checks
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file size must be less than 2 MB', 'error');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Only JPEG, PNG, and WebP images are allowed', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setUploadingImage(true);
    try {
      const res = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = res.data.data.url;
      setItemForm((prev) => ({ ...prev, imageUrl: uploadedUrl }));
      setImagePreview(uploadedUrl);
      showToast('Image uploaded successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      if (editingItemId) {
        await api.put(`/restaurant/items/${editingItemId}`, itemForm);
        showToast('Menu item updated', 'success');
      } else {
        await api.post('/restaurant/items', itemForm);
        showToast('Menu item created', 'success');
      }
      setItemModalOpen(false);
      fetchMenu();
    } catch (err) {
      showToast(err.response?.data?.error?.message || 'Failed to save menu item', 'error');
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await api.patch(`/restaurant/items/${item._id}/availability`, {
        isAvailable: !item.isAvailable,
      });
      showToast(`Updated availability for ${item.name}`, 'info');
      fetchMenu();
    } catch (err) {
      showToast('Failed to toggle availability', 'error');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await api.delete(`/restaurant/items/${itemId}`);
      showToast('Item deleted', 'info');
      fetchMenu();
    } catch (err) {
      showToast('Failed to delete item', 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Menu & Category Manager</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleOpenCatModal()}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white dark:bg-slate-700 hover:bg-slate-900 text-xs font-bold shadow-sm min-h-touch flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
          <button
            onClick={() => handleOpenItemModal()}
            disabled={categories.length === 0}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 text-xs font-bold shadow-sm disabled:opacity-40 min-h-touch flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-40" count={2} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchMenu} />
      ) : categories.length === 0 ? (
        <EmptyState
          title="No Categories"
          message="Create your first menu category to start adding dishes."
          actionLabel="Add Category"
          onAction={() => handleOpenCatModal()}
        />
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => {
            const catItems = items.filter(
              (i) => (i.categoryId._id || i.categoryId).toString() === cat._id.toString()
            );

            return (
              <div key={cat._id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{cat.name}</h2>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenCatModal(cat)}
                      className="text-xs font-semibold text-brand-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCat(cat._id)}
                      className="text-xs font-semibold text-red-600 hover:underline ml-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {catItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No items in this category.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catItems.map((item) => (
                      <div
                        key={item._id}
                        className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${
                          item.isAvailable
                            ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                            : 'bg-slate-100 dark:bg-slate-950 border-slate-300 opacity-60'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.name}
                            </h3>
                            <button
                              onClick={() => handleToggleAvailability(item)}
                              title="Toggle Availability"
                              className="text-brand-600"
                            >
                              {item.isAvailable ? (
                                <ToggleRight className="w-6 h-6 text-emerald-600" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-slate-400" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                          <p className="text-xs font-extrabold text-slate-900 dark:text-white pt-1">
                            {formatMoney(item.price, config.currency)} &bull; {item.diet.toUpperCase()}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                          <button
                            onClick={() => handleOpenItemModal(item)}
                            className="text-xs font-semibold text-brand-600 hover:underline"
                          >
                            Edit Item
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="text-xs font-semibold text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Category Modal */}
      <Modal isOpen={catModalOpen} onClose={() => setCatModalOpen(false)} title={editingCatId ? 'Edit Category' : 'Create Category'}>
        <form onSubmit={handleSaveCat} className="space-y-4">
          <FormField label="Category Name" id="cat-name" required>
            <input
              type="text"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="e.g. Starters or Desserts"
            />
          </FormField>

          <FormField label="Display Order" id="cat-order">
            <input
              type="number"
              value={catForm.displayOrder}
              onChange={(e) => setCatForm({ ...catForm, displayOrder: parseInt(e.target.value, 10) || 1 })}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCatModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-sm"
            >
              Save Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Item Modal with Image Upload */}
      <Modal isOpen={itemModalOpen} onClose={() => setItemModalOpen(false)} title={editingItemId ? 'Edit Menu Item' : 'Add Menu Item'}>
        <form onSubmit={handleSaveItem} className="space-y-4">
          <FormField label="Category" id="item-cat" required>
            <select
              value={itemForm.categoryId}
              onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Item Name" id="item-name" required>
            <input
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              placeholder="e.g. Margherita Pizza"
            />
          </FormField>

          <FormField label="Description" id="item-desc">
            <textarea
              rows={2}
              value={itemForm.description}
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              placeholder="Short description of ingredients or taste"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Price (Minor Units / Cents)" id="item-price" required>
              <input
                type="number"
                value={itemForm.price}
                onChange={(e) => setItemForm({ ...itemForm, price: parseInt(e.target.value, 10) || 0 })}
              />
            </FormField>

            <FormField label="Diet Category" id="item-diet" required>
              <select
                value={itemForm.diet}
                onChange={(e) => setItemForm({ ...itemForm, diet: e.target.value })}
              >
                <option value="veg">Veg</option>
                <option value="non_veg">Non-Veg</option>
              </select>
            </FormField>
          </div>

          {/* Image File Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Dish Image Upload (JPEG/PNG/WebP, max 2MB)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageFileChange}
              className="text-xs text-slate-500"
            />

            {uploadingImage && <p className="text-xs text-brand-600 animate-pulse">Uploading image...</p>}

            {imagePreview && (
              <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setItemModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadingImage}
              className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-sm"
            >
              Save Item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MenuManager;
