import { useState, useEffect, useRef } from "react";
import { Loader2, X, CheckCircle2 } from "lucide-react";
import { updateRecurringTransaction } from "../../api/recurringTransactions";
import { getAccounts } from "../../api/accounts";
import { getCategories } from "../../api/categories";
import { useNotification } from "../../contexts/NotificationContext";
import CustomSelect from "../ui/CustomSelect";
import { useLanguage } from "../../contexts/LanguageContext";
import { createPortal } from "react-dom";

const EditRecurringTransactionModal = ({ recurringTx: transaction, isOpen: open, onClose, onSuccess, accounts: propAccounts = [], categories: propCategories = [] }) => {
  const { t, lang } = useLanguage();
  const amountInputRef = useRef(null);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  
  // Recurring specific
  const [repeatType, setRepeatType] = useState('monthly');
  const [interval, setInterval] = useState(1);
  const [neverEnds, setNeverEnds] = useState(true);
  const [endDate, setEndDate] = useState('');
  const [maxOccurrences, setMaxOccurrences] = useState('');
  const [executionTime, setExecutionTime] = useState('00:00');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(1);

  const [accounts, setAccounts] = useState(propAccounts);
  const [categories, setCategories] = useState(propCategories);
  const [isUpdating, setIsUpdating] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const { showToast } = useNotification();

  useEffect(() => {
    if (open && transaction) {
      setAmount(transaction.amount || "");
      setTitle(transaction.title || "");
      setAccount(transaction.account?._id || transaction.account || "");
      setCategory(transaction.category?._id || transaction.category || "");
      setFromAccount(transaction.from_account?._id || transaction.from_account || "");
      setToAccount(transaction.to_account?._id || transaction.to_account || "");
      
      setRepeatType(transaction.repeatType || 'monthly');
      setInterval(transaction.interval || 1);
      setNeverEnds(transaction.neverEnds);
      if (transaction.endDate) {
        setEndDate(new Date(transaction.endDate).toISOString().split('T')[0]);
      } else {
        setEndDate("");
      }
      setMaxOccurrences(transaction.maxOccurrences || "");
      setExecutionTime(transaction.executionTime || "00:00");
      setReminderEnabled(transaction.reminderEnabled || false);
      setReminderDaysBefore(transaction.reminderDaysBefore || 1);
      setFieldErrors({});
    }
  }, [open, transaction]);

  // Autofocus amount input on open
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (propAccounts.length > 0) setAccounts(propAccounts);
      if (propCategories.length > 0) setCategories(propCategories);
      
      if (propAccounts.length === 0 && accounts.length === 0) {
        Promise.all([getAccounts(), getCategories()]).then(([accs, cats]) => {
          setAccounts(accs);
          setCategories(cats);
        });
      }
    }
  }, [open, propAccounts, propCategories, accounts.length]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isUpdating) {
        e.preventDefault();
        const formEl = document.querySelector('form');
        if (formEl) formEl.requestSubmit();
      }
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isUpdating, onClose]);

  if (!open || !transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      showToast(t('common.fillRequired') || t('common.error'), 'error');
      return;
    }
    setIsUpdating(true);
    try {
      const payload = {
        amount: Number(amount),
        title,
        type: transaction.type,
        repeatType,
        interval: Number(interval),
        neverEnds,
        executionTime,
        reminderEnabled,
        reminderDaysBefore: Number(reminderDaysBefore)
      };

      if (!neverEnds && endDate) payload.endDate = new Date(endDate).toISOString();
      if (!neverEnds && maxOccurrences) payload.maxOccurrences = Number(maxOccurrences);

      if (transaction.type === "transfer") {
        payload.from_account = fromAccount;
        payload.to_account = toAccount;
      } else {
        payload.account = account;
        payload.category = category;
      }

      const updated = await updateRecurringTransaction(transaction._id, payload);
      onSuccess(updated);
    } catch (error) {
      showToast(t('modals.editTransactionError'), "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === transaction.type);

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 ${lang === 'ar' ? 'font-arabic' : 'font-english'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-recurring-title"
        className="bg-[#2B2321]/95 backdrop-blur-[32px] border border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.5)] rounded-[2rem] w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden relative z-10"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 bg-[#2B2321]/95 backdrop-blur-md z-20 flex justify-between items-center p-5 px-6 border-b border-white/10">
          <h3 id="edit-recurring-title" className="text-lg font-bold text-white">
            {t('modals.editRecurringTitle')}
          </h3>
          <button 
            onClick={onClose} 
            disabled={isUpdating} 
            aria-label={t('common.close')} 
            className="w-11 h-11 text-white/70 hover:text-white bg-white/5 rounded-full transition-colors hover:bg-white/10 disabled:opacity-50 flex items-center justify-center shrink-0 active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Fields Body */}
          <div className="overflow-y-auto px-6 py-4 space-y-4 max-h-[calc(85vh-160px)]">
            <div>
              <label htmlFor="edit-rec-amount" className="text-[13px] text-white/60 mb-1 block ms-1">{t('modals.amountLabel')}</label>
              <div className="relative">
                <input
                  ref={amountInputRef}
                  id="edit-rec-amount"
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (fieldErrors.amount) setFieldErrors(prev => ({ ...prev, amount: null }));
                  }}
                  className={`w-full bg-black/20 backdrop-blur-[10px] border shadow-inner rounded-[30px] px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none ${
                    fieldErrors.amount ? 'border-[#FF3B30] focus:border-[#FF3B30]' : 'border-white/5 focus:border-[#8D6346]/50'
                  }`}
                />
                <span className="absolute top-3.5 end-4 text-white/50 font-medium pointer-events-none">{t('nav.currency')}</span>
              </div>
              {fieldErrors.amount && (
                <p className="text-xs text-[#FF3B30] mt-1 ms-2">{fieldErrors.amount}</p>
              )}
            </div>

            <div>
              <label htmlFor="edit-rec-title" className="text-[13px] text-white/60 mb-1 block ms-1">{t('modals.descriptionLabel')}</label>
              <input
                id="edit-rec-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/50"
              />
            </div>

            {transaction.type === 'transfer' ? (
              <div className="flex gap-3">
                <div className="flex-1">
                  <span className="block text-[13px] text-[#3b82f6]/80 mb-1 ms-1">{t('modals.fromAccount')}</span>
                  <CustomSelect
                    buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                    value={fromAccount}
                    onChange={setFromAccount}
                    options={accounts.filter(acc => !acc.isArchived).map(acc => ({
                      value: acc._id,
                      label: acc.name,
                      icon: acc.icon,
                      color: acc.color,
                      subtitle: acc.balance !== undefined ? `${acc.balance.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${acc.currency || 'EGP'}` : undefined
                    }))}
                    placeholder={t('modals.selectAccount')}
                  />
                </div>
                <div className="flex-1">
                  <span className="block text-[13px] text-[#10b981]/80 mb-1 ms-1">{t('modals.toAccount')}</span>
                  <CustomSelect
                    buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                    value={toAccount}
                    onChange={setToAccount}
                    options={accounts.filter(acc => !acc.isArchived).map(acc => ({
                      value: acc._id,
                      label: acc.name,
                      icon: acc.icon,
                      color: acc.color,
                      subtitle: acc.balance !== undefined ? `${acc.balance.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${acc.currency || 'EGP'}` : undefined
                    }))}
                    placeholder={t('modals.selectAccount')}
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <span className="text-[13px] text-white/60 mb-1 block ms-1">{t('modals.accountLabel')}</span>
                  <CustomSelect
                    buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                    value={account}
                    onChange={setAccount}
                    options={accounts.filter(acc => !acc.isArchived).map(acc => ({
                      value: acc._id,
                      label: acc.name,
                      icon: acc.icon,
                      color: acc.color,
                      subtitle: acc.balance !== undefined ? `${acc.balance.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} ${acc.currency || 'EGP'}` : undefined
                    }))}
                    placeholder={t('modals.selectAccount')}
                  />
                </div>
                <div>
                  <span className="text-[13px] text-white/60 mb-1 block ms-1">{t('modals.categoryLabel')}</span>
                  <CustomSelect
                    buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                    value={category}
                    onChange={setCategory}
                    options={filteredCategories.map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon }))}
                    placeholder={t('modals.selectCategory')}
                  />
                </div>
              </>
            )}

            {/* Recurring Options */}
            <div className="pt-2 border-t border-white/10 mt-2">
              <span className="text-[13px] text-white/60 mb-1 block ms-1">{t('recurring.repeatType')}</span>
              <CustomSelect
                buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                value={repeatType}
                onChange={setRepeatType}
                options={[
                  { value: 'daily', label: t('recurring.daily') },
                  { value: 'weekly', label: t('recurring.weekly') },
                  { value: 'monthly', label: t('recurring.monthly') },
                  { value: 'yearly', label: t('recurring.yearly') },
                  { value: 'custom', label: t('recurring.custom') }
                ]}
              />
            </div>

            {repeatType === 'custom' && (
              <div>
                <label htmlFor="edit-rec-interval" className="text-[13px] text-white/60 mb-1 block ms-1">{t('recurring.interval')}</label>
                <input 
                  id="edit-rec-interval"
                  type="number" 
                  min="1" 
                  value={interval} 
                  onChange={(e) => setInterval(e.target.value)} 
                  className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-base text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/50" 
                />
              </div>
            )}

            <div>
              <label htmlFor="edit-rec-time" className="text-[13px] text-white/60 mb-1 block ms-1">{t('recurring.executionTime')}</label>
              <input 
                id="edit-rec-time"
                type="time" 
                value={executionTime} 
                onChange={(e) => setExecutionTime(e.target.value)} 
                className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-base text-white focus:outline-none text-left"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="edit-rec-never-ends" className="text-[13px] font-bold text-white/90">{t('recurring.neverEnds')}</label>
              <button
                id="edit-rec-never-ends"
                type="button"
                role="switch"
                aria-checked={neverEnds}
                aria-label={t('recurring.neverEnds')}
                onClick={() => setNeverEnds(!neverEnds)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 shadow-inner border border-white/10 ${neverEnds ? 'bg-[#8D6346]' : 'bg-black/40'}`}
              >
                <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${neverEnds ? (lang === 'ar' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`} />
              </button>
            </div>

            {!neverEnds && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="edit-rec-end-date" className="text-[13px] text-white/60 mb-1 block ms-1">{t('recurring.endDate')}</label>
                  <input
                    id="edit-rec-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-base text-white focus:outline-none"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="edit-rec-max-occurrences" className="text-[13px] text-white/60 mb-1 block ms-1">{t('recurring.maxOccurrences')}</label>
                  <input 
                    id="edit-rec-max-occurrences"
                    type="number" 
                    min="1" 
                    value={maxOccurrences} 
                    onChange={(e) => setMaxOccurrences(e.target.value)} 
                    placeholder="12" 
                    className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-base text-white focus:outline-none" 
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
              <label htmlFor="edit-rec-reminder-toggle" className="text-[13px] font-bold text-white/90">{t('recurring.reminderEnabled')}</label>
              <button
                id="edit-rec-reminder-toggle"
                type="button"
                role="switch"
                aria-checked={reminderEnabled}
                aria-label={t('recurring.reminderEnabled')}
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className={`relative w-12 h-7 rounded-full transition-colors duration-300 shadow-inner border border-white/10 ${reminderEnabled ? 'bg-[#8D6346]' : 'bg-black/40'}`}
              >
                <div className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${reminderEnabled ? (lang === 'ar' ? '-translate-x-5' : 'translate-x-5') : 'translate-x-0'}`} />
              </button>
            </div>

            {reminderEnabled && (
              <div className="animate-fade-in">
                <label htmlFor="edit-rec-reminder-days" className="text-[13px] text-white/60 mb-1 block ms-1">{t('recurring.reminderDaysBefore')}</label>
                <input 
                  id="edit-rec-reminder-days"
                  type="number" 
                  min="0" 
                  value={reminderDaysBefore} 
                  onChange={(e) => setReminderDaysBefore(e.target.value)} 
                  className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-base text-white focus:outline-none" 
                />
              </div>
            )}
          </div>

          {/* Sticky Actions Footer */}
          <div className="sticky bottom-0 bg-[#2B2321]/95 backdrop-blur-md z-20 p-5 px-6 border-t border-white/10">
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-3.5 rounded-full font-semibold text-[14px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5"/> {t('modals.saveChanges')}</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditRecurringTransactionModal;
