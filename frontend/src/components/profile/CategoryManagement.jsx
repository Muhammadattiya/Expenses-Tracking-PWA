import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Tag,
  TrendingDown,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronRight,
  ArrowLeft,
  ArrowUpDown,
  Check,
  GripVertical
} from 'lucide-react';
import { createPortal } from 'react-dom';
import ConfirmModal from '../modals/ConfirmModal';
import IconPicker, { getIconComponent } from '../IconPicker';
import { useLanguage } from '../../contexts/LanguageContext';
import { createCategory, updateCategory, deleteCategory, reorderCategories } from '../../api/categories';
import { useNotification } from '../../contexts/NotificationContext';
import { triggerHaptic } from '../../utils/haptics';

export default function CategoryManagement({ categories, fetchData, onBack }) {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();
  const [categoryTab, setCategoryTab] = useState('expense');
  
  // Add Category State
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Tag');
  
  // Edit Category State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Delete Category State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Arrange / Reorder State
  const [localCategories, setLocalCategories] = useState(categories || []);
  const [isArranging, setIsArranging] = useState(false);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  useEffect(() => {
    setLocalCategories(categories || []);
  }, [categories]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (editModalOpen && !isUpdating) closeEditModal();
        if (addCategoryModalOpen && !isAdding) setAddCategoryModalOpen(false);
      }
    };
    if (editModalOpen || addCategoryModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editModalOpen, addCategoryModalOpen, isUpdating, isAdding]);

  const activeTabCategories = useMemo(() => {
    return localCategories.filter(cat => cat.type === categoryTab);
  }, [localCategories, categoryTab]);

  const handleToggleArrange = async () => {
    triggerHaptic('light');
    if (isArranging) {
      if (hasOrderChanged) {
        setIsSavingOrder(true);
        try {
          const orderedIds = activeTabCategories.map(c => c._id);
          await reorderCategories(orderedIds);
          await fetchData();
          showToast(t('settings.reorderSuccess') || 'Order saved successfully', 'success');
        } catch (error) {
          console.error("Error saving category order:", error);
          showToast(t('settings.reorderError') || 'Failed to save order', 'error');
        } finally {
          setIsSavingOrder(false);
        }
      }
      setIsArranging(false);
      setHasOrderChanged(false);
    } else {
      setIsArranging(true);
      setHasOrderChanged(false);
    }
  };

  const handleReorder = (newItemsForTab) => {
    setLocalCategories(prev => {
      const otherTypeItems = prev.filter(c => c.type !== categoryTab);
      return [...otherTypeItems, ...newItemsForTab];
    });
    setHasOrderChanged(true);
    triggerHaptic('selection');
  };

  const switchTab = async (newTab) => {
    if (newTab === categoryTab) return;
    triggerHaptic('selection');
    if (isArranging && hasOrderChanged) {
      try {
        const orderedIds = activeTabCategories.map(c => c._id);
        await reorderCategories(orderedIds);
        await fetchData();
      } catch (e) {
        console.error(e);
      }
      setHasOrderChanged(false);
    }
    setCategoryTab(newTab);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showToast(t('settings.nameRequired') || t('profile.nameRequired'), 'error');
      return;
    }
    setIsAdding(true);
    try {
      await createCategory({
        name: trimmed,
        type: newCategoryType,
        icon: newCategoryIcon,
      });
      setNewCategoryName('');
      setNewCategoryIcon('Tag');
      setAddCategoryModalOpen(false);
      await fetchData();
      showToast(t('settings.addSuccess'), 'success');
    } catch (error) {
      console.error("❌ خطأ في إضافة الفئة:", error);
      showToast(error.response?.data?.message || t('settings.addError'), 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const openEditModal = (cat) => {
    setEditingItem(cat);
    setEditName(cat.name);
    setEditIcon(cat.icon || 'Tag');
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingItem(null);
    setEditName('');
    setEditIcon('');
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed) {
      showToast(t('settings.nameRequired') || t('profile.nameRequired'), 'error');
      return;
    }
    setIsUpdating(true);
    try {
      await updateCategory(editingItem._id, { 
        name: trimmed, 
        icon: editIcon, 
        type: editingItem.type 
      });
      await fetchData();
      closeEditModal();
      showToast(t('settings.editSuccess'), 'success');
    } catch (error) {
      showToast(error.response?.data?.message || t('settings.editError'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCategory = (cat) => {
    setSelectedCategory(cat);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCategory(selectedCategory._id);
      await fetchData();
      setDeleteModalOpen(false);
      setSelectedCategory(null);
      showToast(t('settings.deleteSuccess'), 'success');
    } catch (error) {
      console.error("❌ خطأ في مسح العنصر:", error);
      showToast(t('settings.deleteError'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            aria-label={t('common.back')}
            className="w-12 h-12 flex items-center justify-center rounded-[2rem] bg-[#8D6346]/40 backdrop-blur-[32px] border border-white/10 border-t-white/30 border-s-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[#8D6346]/60 transition-colors"
          >
            <ArrowLeft size={20} className="text-white/90 rtl:rotate-180" />
          </motion.button>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-[#8D6346]" />
            {t('settings.categoriesTitle')}
          </h2>
        </div>

        {activeTabCategories.length > 1 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleArrange}
            disabled={isSavingOrder}
            className={`px-3.5 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold transition-all ${
              isArranging
                ? 'bg-[#8D6346] text-white shadow-[0_4px_16px_rgba(141,99,70,0.4)]'
                : 'bg-[#8D6346]/20 text-[#E8C5A8] border border-[#8D6346]/30 hover:bg-[#8D6346]/30'
            }`}
          >
            {isSavingOrder ? (
              <Loader2 size={15} className="animate-spin text-white" />
            ) : isArranging ? (
              <>
                <Check size={15} />
                <span>{t('settings.doneArranging')}</span>
              </>
            ) : (
              <>
                <ArrowUpDown size={15} />
                <span>{t('settings.arrange')}</span>
              </>
            )}
          </motion.button>
        )}
      </div>

      <div className="flex bg-black/20 p-1 rounded-full shadow-inner relative mb-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => switchTab('expense')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-colors relative z-10 ${categoryTab === 'expense' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          {categoryTab === 'expense' && <motion.div layoutId="catTab" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
          <TrendingDown size={18} className={categoryTab === 'expense' ? 'text-brand-red' : 'opacity-50'} />
          {t('settings.expense')}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => switchTab('income')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-colors relative z-10 ${categoryTab === 'income' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          {categoryTab === 'income' && <motion.div layoutId="catTab" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
          <TrendingUp size={18} className={categoryTab === 'income' ? 'text-brand-green' : 'opacity-50'} />
          {t('settings.income')}
        </motion.button>
      </div>

      {isArranging ? (
        <Reorder.Group
          axis="y"
          values={activeTabCategories}
          onReorder={handleReorder}
          className="flex flex-col gap-2.5 mb-6"
        >
          {activeTabCategories.map((cat) => {
            const CatIcon = getIconComponent(cat.icon, 'Tag');
            const colorClass = cat.type === 'expense' ? 'text-brand-red' : 'text-brand-green';
            const bgClass = cat.type === 'expense' ? 'bg-brand-red/10 border-brand-red/20' : 'bg-brand-green/10 border-brand-green/20';
            return (
              <Reorder.Item
                key={cat._id}
                value={cat}
                className="py-3 px-3 flex items-center justify-between gap-3 bg-[#8D6346]/10 border border-[#8D6346]/30 rounded-2xl shadow-md select-none touch-none cursor-grab active:cursor-grabbing group"
                whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`${bgClass} border p-2.5 rounded-xl ${colorClass} transition-transform group-hover:scale-105 shadow-inner`}>
                    <CatIcon size={20} />
                  </div>
                  <span className="text-white/90 font-bold text-sm truncate">{cat.name}</span>
                </div>

                <div className="p-1.5 text-[#E8C5A8] opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                  <GripVertical size={20} />
                </div>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
      ) : (
        <ul className="flex flex-col gap-2">
          {activeTabCategories.map((cat) => {
            const CatIcon = getIconComponent(cat.icon, 'Tag');
            const colorClass = cat.type === 'expense' ? 'text-brand-red' : 'text-brand-green';
            const bgClass = cat.type === 'expense' ? 'bg-brand-red/10 border-brand-red/20' : 'bg-brand-green/10 border-brand-green/20';
            return (
              <li key={cat._id} className="py-4 px-2 flex items-center justify-between gap-3 group hover:bg-white/5 rounded-2xl transition-colors">
                <div className={`${bgClass} border p-3 rounded-2xl ${colorClass} transition-transform group-hover:scale-110 shadow-inner`}>
                  <CatIcon size={22} />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-white/90 font-bold text-base">{cat.name}</span>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => openEditModal(cat)}
                    aria-label={t('common.edit')}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 transition-colors rounded-xl text-white/40 hover:text-white"
                  >
                    <Pencil size={18} />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteCategory(cat)}
                    aria-label={t('common.delete')}
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-brand-red/5 border border-transparent hover:bg-brand-red/10 hover:border-brand-red/20 transition-colors rounded-xl text-brand-red/60 hover:text-brand-red"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </div>
              </li>
            );
          })}
          
          {activeTabCategories.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
              <Tag size={40} className="mb-4 text-white/30" />
              <span className="text-white/60 font-medium">{t('settings.noCategories')}</span>
            </div>
          )}
        </ul>
      )}

      {!isArranging && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setNewCategoryType(categoryTab);
            setAddCategoryModalOpen(true);
          }}
          className="bg-[#8D6346]/10 border border-[#8D6346]/20 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] w-full py-4 flex items-center justify-center rounded-[24px] text-[#8D6346] hover:bg-[#8D6346]/20 transition-all duration-300 gap-2 mt-4 font-bold min-h-[48px]"
        >
          <Plus className="w-5 h-5" /> {t('settings.addCategoryBtn')}
        </motion.button>
      )}

      {/* Edit Modal */}
      {editModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-category-title"
            className="bg-[#2B2321]/95 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2.5rem] w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex justify-between items-center p-6 border-b border-white/10 bg-[#2B2321]/90 backdrop-blur-md">
              <h3 id="edit-category-title" className="text-xl font-bold font-['Exo_2'] text-white">
                {t('settings.editCategory')}
              </h3>
              <button 
                onClick={closeEditModal} 
                disabled={isUpdating} 
                aria-label={t('common.close')} 
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/50 hover:text-white transition-colors disabled:opacity-50 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto flex-1 hide-scrollbar">
              <form id="edit-category-form" onSubmit={submitEdit} className="flex flex-col gap-4">
                <div>
                  <label htmlFor="edit-cat-name" className="block text-xs text-white/50 mb-1.5">{t('settings.nameLabel')}</label>
                  <input id="edit-cat-name" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-xl px-4 py-2.5 text-base text-white focus:outline-none focus:border-[#8D6346]/50" required />
                </div>

                <div className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-2xl p-2">
                  <IconPicker
                    type="category"
                    selectedIcon={editIcon}
                    onSelect={setEditIcon}
                    colorClass="text-[#8D6346]"
                  />
                </div>
              </form>
            </div>

            {/* Sticky Actions Footer */}
            <div className="sticky bottom-0 z-20 p-6 border-t border-white/10 bg-[#2B2321]/90 backdrop-blur-md">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                form="edit-category-form"
                disabled={isUpdating}
                className="w-full py-3.5 rounded-full bg-[#8D6346]/30 border border-[#8D6346]/50 text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] font-semibold text-[15px] hover:bg-[#8D6346]/45 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : t('settings.saveChanges')}
              </motion.button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Modal */}
      {addCategoryModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-category-title"
            className="bg-[#2B2321]/95 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2.5rem] w-full max-w-sm flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 flex justify-between items-center p-6 border-b border-white/10 bg-[#2B2321]/90 backdrop-blur-md">
              <h3 id="add-category-title" className="text-xl font-bold font-['Exo_2'] text-white">
                {t('settings.addCategoryBtn')}
              </h3>
              <button 
                onClick={() => { if (!isAdding) setAddCategoryModalOpen(false); }} 
                disabled={isAdding} 
                aria-label={t('common.close')} 
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/50 hover:text-white transition-colors disabled:opacity-50 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto flex-1 hide-scrollbar">
              <form id="add-category-form" onSubmit={handleAddCategory} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-cat-name" className="block text-xs text-white/50 mb-1.5">{t('settings.nameLabel')}</label>
                    <input id="new-cat-name" type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-xl px-4 py-2.5 text-base text-white focus:outline-none focus:border-[#8D6346]/50" required />
                  </div>
                  <div>
                    <label htmlFor="new-cat-type" className="block text-xs text-white/50 mb-1.5">{t('settings.categoryType')}</label>
                    <select id="new-cat-type" value={newCategoryType} onChange={(e) => setNewCategoryType(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-xl px-4 py-2.5 text-base text-white focus:outline-none focus:border-[#8D6346]/50 appearance-none">
                      <option value="expense" className="bg-[#2B2321] text-white">{t('settings.expense')}</option>
                      <option value="income" className="bg-[#2B2321] text-white">{t('settings.income')}</option>
                    </select>
                  </div>
                </div>

                <div className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-2xl p-2 mt-2">
                  <IconPicker 
                    type="category" 
                    selectedIcon={newCategoryIcon} 
                    onSelect={setNewCategoryIcon} 
                    colorClass="text-[#8D6346]" 
                  />
                </div>
              </form>
            </div>

            {/* Sticky Actions Footer */}
            <div className="sticky bottom-0 z-20 p-6 border-t border-white/10 bg-[#2B2321]/90 backdrop-blur-md">
              <motion.button 
                whileTap={{ scale: 0.98 }} 
                type="submit" 
                form="add-category-form"
                disabled={isAdding}
                className="w-full py-3.5 rounded-full bg-[#8D6346]/30 border border-[#8D6346]/50 text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] font-semibold text-[15px] hover:bg-[#8D6346]/45 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><Plus className="w-5 h-5" /> {t('settings.addCategoryBtn')}</>)}
              </motion.button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        open={deleteModalOpen}
        title={t('settings.deleteCategoryTitle')}
        message={`${t('settings.deleteCategoryConfirm')} "${selectedCategory?.name}"?`}
        confirmText={isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.deleteBtn')}
        cancelText={t('settings.cancelBtn')}
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => {
          if (isDeleting) return;
          setDeleteModalOpen(false);
          setSelectedCategory(null);
        }}
      />
    </section>
  );
}
