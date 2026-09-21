import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { createCategory } from '../../api/categories';
import IconPicker from '../IconPicker';

const InitialCategoryModal = ({ isOpen, onClose, onSuccess }) => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Tag');

  const isRTL = language === 'ar';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    setErrorMessage('');
    try {
      await createCategory({
        name: newCategoryName.trim(),
        type: newCategoryType,
        icon: newCategoryIcon
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating category:', error);
      setErrorMessage(error.response?.data?.message || t('settings.saveError', 'Failed to save category'));
    } finally {
      setLoading(false);
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', bounce: 0.2, duration: 0.5 }
    },
    exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-[#2B2321]/40 backdrop-blur-[32px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.2)] rounded-[2rem] p-6 w-full max-w-sm flex flex-col gap-3.5 max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={e => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="flex justify-between items-center mb-1">
              <h3 id="category-modal-title" className="text-xl font-bold font-['Exo_2'] text-white tracking-tight">
                {t('settings.addCategoryBtn')}
              </h3>
              <button 
                type="button" 
                onClick={onClose} 
                aria-label={t('common.close', 'Close')}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
              >
                <X size={20} />
              </button>
            </div>

            {errorMessage && (
              <div role="alert" className="p-3 mb-2 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cat-name" className="block text-xs text-white/60 mb-1.5 font-medium">
                    {t('settings.nameLabel')}
                  </label>
                  <input 
                    id="cat-name"
                    type="text" 
                    value={newCategoryName} 
                    onChange={(e) => setNewCategoryName(e.target.value)} 
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346] focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label htmlFor="cat-type" className="block text-xs text-white/60 mb-1.5 font-medium">
                    {t('settings.categoryType')}
                  </label>
                  <select 
                    id="cat-type"
                    value={newCategoryType} 
                    onChange={(e) => setNewCategoryType(e.target.value)} 
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346] focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] transition-all appearance-none"
                  >
                    <option value="expense" className="bg-[#2B2321] text-white">{t('settings.expense')}</option>
                    <option value="income" className="bg-[#2B2321] text-white">{t('settings.income')}</option>
                  </select>
                </div>
              </div>

              <div className="bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-2xl p-2 mt-1">
                <IconPicker 
                  type="category" 
                  selectedIcon={newCategoryIcon} 
                  onSelect={setNewCategoryIcon} 
                  colorClass="text-[#8D6346]" 
                />
              </div>

              <motion.button 
                whileTap={{ scale: 0.96 }} 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 mt-2 rounded-full bg-[#8D6346] border border-[#8D6346]/60 text-white shadow-[0_4px_16px_rgba(141,99,70,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] font-semibold text-[15px] hover:bg-[#a67a5b] transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> {t('settings.addCategoryBtn')}</>}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default InitialCategoryModal;
