import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { createAccount } from '../../api/accounts';
import { triggerHaptic } from '../../utils/haptics';
import IconPicker from '../IconPicker';

export default function CreateAccountModal({ isOpen, onClose, onSuccess }) {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();
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

  const isRTL = lang === 'ar';

  useEffect(() => {
    if (isOpen) {
      setNewAccountName('');
      setNewAccountType('cash');
      setNewAccountBalance('');
      setNewAccountCardLast4('');
      setNewAccountExcludeFromTotal(false);
      setNewAccountIsSavingsAccount(false);
      setNewAccountIcon('Wallet');
      setNewAccountColor('#8D6346');
      setErrorMessage('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newAccountName.trim();
    if (!trimmed) {
      setErrorMessage(t('settings.nameRequired') || t('profile.nameRequired'));
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      triggerHaptic('selection');
      const savedAccount = await createAccount({
        name: trimmed,
        type: newAccountType,
        balance_adjustment: Number(newAccountBalance) || 0,
        currency: 'EGP',
        cardLast4: newAccountCardLast4 || undefined,
        excludeFromTotal: newAccountExcludeFromTotal,
        isSavingsAccount: newAccountIsSavingsAccount,
        icon: newAccountIcon,
        color: newAccountColor
      });

      showToast(t('settings.addSuccess'), 'success');
      window.dispatchEvent(new CustomEvent('finova-data-updated', { detail: { action: 'ACCOUNT_CREATED', account: savedAccount } }));
      if (onSuccess) onSuccess(savedAccount);
      onClose();
    } catch (error) {
      console.error('Error creating account:', error);
      const msg = error.response?.data?.message || t('settings.addError');
      setErrorMessage(msg);
      showToast(msg, 'error');
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
      transition: { type: 'spring', bounce: 0.2, duration: 0.45 }
    },
    exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="absolute inset-0"
          onClick={() => { if (!loading) onClose(); }}
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-account-modal-title"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative bg-[#2B2321]/95 backdrop-blur-[32px] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.2)] rounded-[2.5rem] w-full max-w-sm sm:max-w-md flex flex-col max-h-[90vh] overflow-hidden z-10"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-20 flex justify-between items-center p-5 sm:p-6 border-b border-white/10 bg-[#2B2321]/90 backdrop-blur-md">
            <h3 id="create-account-modal-title" className="text-xl font-bold text-white tracking-wide drop-shadow-sm">
              {t('settings.addAccountBtn')}
            </h3>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              aria-label={t('common.close', 'Close')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] disabled:opacity-40 cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 hide-scrollbar">
            {errorMessage && (
              <div role="alert" className="p-3 mb-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-xs">
                {errorMessage}
              </div>
            )}

            <form id="create-account-form" onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-acc-name" className="block text-xs text-white/60 mb-1.5 font-medium">
                    {t('settings.nameLabel')}
                  </label>
                  <input 
                    id="create-acc-name"
                    type="text" 
                    value={newAccountName} 
                    onChange={(e) => setNewAccountName(e.target.value)} 
                    placeholder={lang === 'ar' ? 'مثال: محفظة كاش' : 'e.g. Cash Wallet'}
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346] focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] transition-all" 
                    required 
                  />
                </div>
                <div>
                  <label htmlFor="create-acc-type" className="block text-xs text-white/60 mb-1.5 font-medium">
                    {t('settings.accountType')}
                  </label>
                  <select 
                    id="create-acc-type"
                    value={newAccountType} 
                    onChange={(e) => setNewAccountType(e.target.value)} 
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346] focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] transition-all appearance-none cursor-pointer"
                  >
                    <option value="cash" className="bg-[#2B2321] text-white">{t('settings.cash')}</option>
                    <option value="bank" className="bg-[#2B2321] text-white">{t('settings.bank')}</option>
                    <option value="wallet" className="bg-[#2B2321] text-white">{t('settings.wallet')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="create-acc-balance" className="block text-xs text-white/60 mb-1.5 font-medium">
                    {t('settings.balanceLabel')}
                  </label>
                  <input 
                    id="create-acc-balance"
                    type="number" 
                    step="any" 
                    value={newAccountBalance} 
                    onChange={(e) => setNewAccountBalance(e.target.value)} 
                    placeholder="0"
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346] focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] transition-all tabular-nums" 
                  />
                </div>
                <div>
                  <label htmlFor="create-acc-last4" className="block text-xs text-white/60 mb-1.5 font-medium">
                    {t('settings.cardLast4')}
                  </label>
                  <input 
                    id="create-acc-last4"
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

              <label htmlFor="create-acc-exclude-total" className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-2xl cursor-pointer hover:bg-black/30 transition-colors">
                <span className="text-xs font-medium text-white/90">{t('settings.excludeFromTotal')}</span>
                <input 
                  id="create-acc-exclude-total"
                  type="checkbox" 
                  checked={newAccountExcludeFromTotal} 
                  onChange={(e) => setNewAccountExcludeFromTotal(e.target.checked)} 
                  className="w-4 h-4 rounded border-white/20 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" 
                />
              </label>

              <label htmlFor="create-acc-is-savings" className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-2xl cursor-pointer hover:bg-black/30 transition-colors">
                <span className="text-xs font-medium text-white/90">{t('settings.isSavingsAccount')}</span>
                <input 
                  id="create-acc-is-savings"
                  type="checkbox" 
                  checked={newAccountIsSavingsAccount} 
                  onChange={(e) => setNewAccountIsSavingsAccount(e.target.checked)} 
                  className="w-4 h-4 rounded border-white/20 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" 
                />
              </label>

              <div className="bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-2xl p-2.5 mt-1">
                <IconPicker 
                  type="account" 
                  selectedIcon={newAccountIcon} 
                  onSelect={setNewAccountIcon} 
                  selectedColor={newAccountColor} 
                  onColorSelect={setNewAccountColor} 
                  colorClass="text-[#8D6346]" 
                />
              </div>
            </form>
          </div>

          {/* Sticky Actions Footer */}
          <div className="sticky bottom-0 z-20 p-5 sm:p-6 border-t border-white/10 bg-[#2B2321]/90 backdrop-blur-md">
            <motion.button 
              whileTap={{ scale: 0.98 }} 
              type="submit" 
              form="create-account-form"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-[#8D6346]/40 border border-[#E8C5A8]/50 text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] font-bold text-[15px] hover:bg-[#8D6346]/60 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5" /> {t('settings.addAccountBtn')}</>}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
