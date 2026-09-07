import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { createCategory } from '../../api/categories';
import IconPicker from '../IconPicker';

const InitialCategoryModal = ({ isOpen, onClose, onSuccess }) => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Tag');

  const isRTL = language === 'ar';

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    try {
      await createCategory({
        name: newCategoryName,
        type: newCategoryType,
        icon: newCategoryIcon
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating category:', error);
      alert(error.response?.data?.message || t('settings.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const modalVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { type: 'spring', bounce: 0.3, duration: 0.6 }
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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 w-full max-w-sm flex flex-col gap-4 max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={e => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xl font-bold font-['Exo_2'] text-white">
                {t('settings.addCategoryBtn')}
              </h3>
              <button type="button" onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
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
                disabled={loading}
                className="w-full py-3.5 mt-3 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[15px] hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2"
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
