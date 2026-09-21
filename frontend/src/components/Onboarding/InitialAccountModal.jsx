import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { createAccount } from '../../api/accounts';
import IconPicker from '../IconPicker';

const InitialAccountModal = ({ isOpen, onClose, onSuccess }) => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountCardLast4, setNewAccountCardLast4] = useState('');
  const [newAccountExcludeFromTotal, setNewAccountExcludeFromTotal] = useState(false);
  const [newAccountIsSavingsAccount, setNewAccountIsSavingsAccount] = useState(false);
  const [newAccountIcon, setNewAccountIcon] = useState('Wallet');
  const [newAccountColor, setNewAccountColor] = useState('#8D6346');

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
    if (!newAccountName.trim()) return;

    setLoading(true);
    setErrorMessage('');
    try {
      await createAccount({
        name: newAccountName.trim(),
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
      setErrorMessage(error.response?.data?.message || t('settings.saveError', 'Failed to save account'));
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
            aria-labelledby="account-modal-title"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-[#2B2321]/40 backdrop-blur-[32px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.2)] rounded-[2rem] p-6 w-full max-w-sm flex flex-col max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={e => e.stopPropagation()}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 id="account-modal-title" className="text-xl font-bold font-['Exo_2'] text-white tracking-tight">
                {t('settings.addAccountBtn')}
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
              <div role="alert" className="p-3 mb-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="acc-name" className="block text-xs text-white/60 mb-1.5 font-medium">
                    {t('settings.nameLabel')}
                  </label>
                  <input 
                    id="acc-name"
                    type="text" 
                    value={newAccountName} 
                    onChange={(e) => setNewAccountName(e.target.value)} 
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346] focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label htmlFor="acc-type" className="block text-xs text-white/60 mb-1.5 font-medium">
                    {t('settings.accountType')}
                  </label>
                  <select 
                    id="acc-type"
                    value={newAccountType} 
                    onChange={(e) => setNewAccountType(e.target.value)} 
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346] focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] transition-all appearance-none"
                  >
                    <option value="cash" className="bg-[#2B2321] text-white">{t('settings.cash')}</option>
                    <option value="bank" className="bg-[#2B2321] text-white">{t('settings.bank')}</option>
                    <option value="wallet" className="bg-[#2B2321] text-white">{t('settings.wallet')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="acc-balance" className="block text-xs text-white/60 mb-1.5 font-medium">
                    {t('settings.balanceLabel')}
                  </label>
                  <input 
                    id="acc-balance"
                    type="number" 
                    step="any" 
                    value={newAccountBalance} 
                    onChange={(e) => setNewAccountBalance(e.target.value)} 
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346] focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label htmlFor="acc-last4" className="block text-xs text-white/60 mb-1.5 font-medium">
                    {t('settings.cardLast4')}
                  </label>
                  <input 
                    id="acc-last4"
                    type="text" 
                    maxLength="4" 
                    pattern="\d{4}" 
                    value={newAccountCardLast4} 
                    onChange={(e) => setNewAccountCardLast4(e.target.value)} 
                    placeholder="1234" 
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346] focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] transition-all" 
                  />
                </div>
              </div>

              <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-2xl cursor-pointer hover:bg-black/30 transition-colors">
                <span className="text-xs font-medium text-white/90">{t('settings.excludeFromTotal')}</span>
                <input 
                  type="checkbox" 
                  checked={newAccountExcludeFromTotal} 
                  onChange={(e) => setNewAccountExcludeFromTotal(e.target.checked)} 
                  className="w-4 h-4 rounded border-white/20 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" 
                />
              </label>

              <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-2xl cursor-pointer hover:bg-black/30 transition-colors">
                <span className="text-xs font-medium text-white/90">{t('settings.isSavingsAccount')}</span>
                <input 
                  type="checkbox" 
                  checked={newAccountIsSavingsAccount} 
                  onChange={(e) => setNewAccountIsSavingsAccount(e.target.checked)} 
                  className="w-4 h-4 rounded border-white/20 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" 
                />
              </label>

              <div className="bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-2xl p-2 mt-1">
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
                whileTap={{ scale: 0.96 }} 
                type="submit" 
                disabled={loading}
                className="w-full py-3.5 mt-2 rounded-full bg-[#8D6346] border border-[#8D6346]/60 text-white shadow-[0_4px_16px_rgba(141,99,70,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] font-semibold text-[15px] hover:bg-[#a67a5b] transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
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
