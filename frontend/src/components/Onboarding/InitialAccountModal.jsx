import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { createAccount } from '../../api/accounts';
import IconPicker from '../IconPicker';

const InitialAccountModal = ({ isOpen, onClose, onSuccess }) => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountCardLast4, setNewAccountCardLast4] = useState('');
  const [newAccountExcludeFromTotal, setNewAccountExcludeFromTotal] = useState(false);
  const [newAccountIsSavingsAccount, setNewAccountIsSavingsAccount] = useState(false);
  const [newAccountIcon, setNewAccountIcon] = useState('Wallet');
  const [newAccountColor, setNewAccountColor] = useState('#8D6346');

  const isRTL = language === 'ar';

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;

    setLoading(true);
    try {
      await createAccount({
        name: newAccountName,
        type: newAccountType,
        balance: Number(newAccountBalance) || 0,
        currency: 'EGP',
        cardLast4: newAccountCardLast4 || undefined,
        excludeFromTotal: newAccountExcludeFromTotal,
        isSavingsAccount: newAccountIsSavingsAccount,
        icon: newAccountIcon,
        color: newAccountColor
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating account:', error);
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
            className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 w-full max-w-sm flex flex-col max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={e => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold font-['Exo_2'] text-white">
                {t('settings.addAccountBtn')}
              </h3>
              <button type="button" onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.nameLabel')}</label>
                  <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50" required />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.accountType')}</label>
                  <select value={newAccountType} onChange={(e) => setNewAccountType(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50 appearance-none">
                    <option value="cash" className="bg-[#2B2321] text-white">{t('settings.cash')}</option>
                    <option value="bank" className="bg-[#2B2321] text-white">{t('settings.bank')}</option>
                    <option value="wallet" className="bg-[#2B2321] text-white">{t('settings.wallet')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.balanceLabel')}</label>
                  <input type="number" step="any" value={newAccountBalance} onChange={(e) => setNewAccountBalance(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50" required />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.cardLast4')}</label>
                  <input type="text" maxLength="4" pattern="\d{4}" value={newAccountCardLast4} onChange={(e) => setNewAccountCardLast4(e.target.value)} placeholder="1234" className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50" />
                </div>
              </div>

              <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                <span className="text-xs font-medium text-white/90">{t('settings.excludeFromTotal')}</span>
                <input type="checkbox" checked={newAccountExcludeFromTotal} onChange={(e) => setNewAccountExcludeFromTotal(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
              </label>

              <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                <span className="text-xs font-medium text-white/90">{t('settings.isSavingsAccount')}</span>
                <input type="checkbox" checked={newAccountIsSavingsAccount} onChange={(e) => setNewAccountIsSavingsAccount(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
              </label>

              <div className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-3xl p-2 mt-1">
                <IconPicker 
                  type="account" 
                  selectedIcon={newAccountIcon} 
                  onSelect={setNewAccountIcon} 
                  selectedColor={newAccountColor} 
                  onColorSelect={setNewAccountColor} 
                  colorClass="text-[#8D6346]" 
                />
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }} 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 mt-3 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[15px] hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> {t('settings.addAccountBtn')}</>}
              </motion.button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default InitialAccountModal;
