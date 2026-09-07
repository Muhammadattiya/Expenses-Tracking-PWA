import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ArrowLeft
} from 'lucide-react';
import { createPortal } from 'react-dom';
import ConfirmModal from '../modals/ConfirmModal';
import IconPicker, { getIconComponent } from '../IconPicker';
import { useLanguage } from '../../contexts/LanguageContext';
import { createCategory, updateCategory, deleteCategory } from '../../api/categories';
import { useNotification } from '../../contexts/NotificationContext';

export default function CategoryManagement({ categories, fetchData, onBack }) {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();
  const [categoryTab, setCategoryTab] = useState('expense');
  
  // Add Category State
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
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

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await createCategory({
        name: newCategoryName,
        type: newCategoryType,
        icon: newCategoryIcon,
      });
      setNewCategoryName('');
      setNewCategoryIcon('Tag');
      setAddCategoryModalOpen(false);
      fetchData();
      showToast(t('settings.addSuccess'), 'success');
    } catch (error) {
      console.error("❌ خطأ في إضافة الفئة:", error);
      showToast(t('settings.addError'), 'error');
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
    if (!editName.trim()) return;
    setIsUpdating(true);
    try {
      await updateCategory(editingItem._id, { 
        name: editName, 
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
    <motion.section
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="w-12 h-12 flex items-center justify-center rounded-[2rem] bg-[rgba(141,99,70,0.4)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[rgba(141,99,70,0.6)] transition-colors"
        >
          <ArrowLeft size={20} className={`text-white/90 ${lang === 'ar' ? 'rotate-180' : ''}`} />
        </motion.button>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Tag className="w-6 h-6 text-[#8D6346]" />
          {t('settings.categoriesTitle')}
        </h2>
      </div>

      <div className="flex bg-black/20 p-1 rounded-full shadow-inner relative mb-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setCategoryTab('expense')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-colors relative z-10 ${categoryTab === 'expense' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          {categoryTab === 'expense' && <motion.div layoutId="catTab" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
          <TrendingDown size={18} className={categoryTab === 'expense' ? 'text-red-400' : 'opacity-50'} />
          {t('settings.expense')}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setCategoryTab('income')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-bold transition-colors relative z-10 ${categoryTab === 'income' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
        >
          {categoryTab === 'income' && <motion.div layoutId="catTab" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
          <TrendingUp size={18} className={categoryTab === 'income' ? 'text-emerald-400' : 'opacity-50'} />
          {t('settings.income')}
        </motion.button>
      </div>

      <ul className="flex flex-col gap-2">
        {categories.filter(cat => cat.type === categoryTab).map((cat) => {
          const CatIcon = getIconComponent(cat.icon, 'Tag');
          const colorClass = cat.type === 'expense' ? 'text-red-400' : 'text-emerald-400';
          const bgClass = cat.type === 'expense' ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20';
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
                  className="p-2.5 bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 transition-colors rounded-xl text-white/40 hover:text-white"
                >
                  <Pencil size={18} />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDeleteCategory(cat)}
                  className="p-2.5 bg-red-500/5 border border-transparent hover:bg-red-500/10 hover:border-red-500/20 transition-colors rounded-xl text-red-400/60 hover:text-red-400"
                >
                  <Trash2 size={18} />
                </motion.button>
              </div>
            </li>
          )
        })}
        
        {categories.filter(cat => cat.type === categoryTab).length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
            <Tag size={40} className="mb-4 text-white/30" />
            <span className="text-white/60 font-medium">{t('settings.noCategories')}</span>
          </div>
        )}
      </ul>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          setNewCategoryType(categoryTab);
          setAddCategoryModalOpen(true);
        }}
        className="bg-[#8D6346]/10 border border-[#8D6346]/20 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] w-full py-4 flex items-center justify-center rounded-[24px] text-[#8D6346] hover:bg-[#8D6346]/20 transition-all duration-300 gap-2 mt-4 font-bold"
      >
        <Plus className="w-5 h-5" /> {t('settings.addCategoryBtn')}
      </motion.button>

      {/* Edit Modal */}
      {editModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 w-full max-w-sm flex flex-col gap-4 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold font-['Exo_2'] text-white">
                {t('settings.editCategory')}
              </h3>
              <button onClick={closeEditModal} className="text-white/50 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={submitEdit} className="flex flex-col gap-4 mt-2">
              <div>
                <label className="block text-xs text-white/50 mb-1.5">{t('settings.nameLabel')}</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50" required />
              </div>

              <div className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-3xl p-2">
                <IconPicker
                  type="category"
                  selectedIcon={editIcon}
                  onSelect={setEditIcon}
                  colorClass="text-[#8D6346]"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={isUpdating}
                className="w-full py-3.5 mt-2 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[15px] hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : t('settings.saveChanges')}
              </motion.button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Modal */}
      {addCategoryModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 w-full max-w-sm flex flex-col gap-4 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xl font-bold font-['Exo_2'] text-white">
                {t('settings.addCategoryBtn')}
              </h3>
              <button onClick={() => setAddCategoryModalOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="flex flex-col gap-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.nameLabel')}</label>
                  <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50" required />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.categoryType')}</label>
                  <select value={newCategoryType} onChange={(e) => setNewCategoryType(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50 appearance-none">
                    <option value="expense" className="bg-[#2B2321] text-white">{t('settings.expense')}</option>
                    <option value="income" className="bg-[#2B2321] text-white">{t('settings.income')}</option>
                  </select>
                </div>
              </div>

              <div className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-3xl p-2 mt-2">
                <IconPicker 
                  type="category" 
                  selectedIcon={newCategoryIcon} 
                  onSelect={setNewCategoryIcon} 
                  colorClass="text-[#8D6346]" 
                />
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }} 
                type="submit" 
                className="w-full py-3.5 mt-3 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[15px] hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> {t('settings.addCategoryBtn')}
              </motion.button>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        open={deleteModalOpen}
        title={t('settings.deleteCategoryTitle')}
        message={`${t('settings.deleteCategoryConfirm')} "${selectedCategory?.name}"؟`}
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
    </motion.section>
  );
}
