import { useState, useEffect } from "react";
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
    }
  }, [open, transaction]);

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

  if (!open || !transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 ${lang === 'ar' ? 'font-arabic' : 'font-english'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 w-full max-w-sm flex flex-col max-h-[80vh] overflow-y-auto scrollbar-hide relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">
            {t('modals.editRecurringTitle')}
          </h3>
          <button onClick={onClose} className="p-2 text-white/50 hover:text-white bg-white/5 rounded-full transition-colors hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('modals.amountLabel')}</label>
            <div className="relative">
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/50"
              />
              <span className={`absolute top-3 text-white/50 font-medium ${lang === 'ar' ? 'left-4' : 'right-4'}`}>{t('nav.currency')}</span>
            </div>
          </div>

          <div>
            <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('modals.descriptionLabel')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/50"
            />
          </div>

          {transaction.type === 'transfer' ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[13px] text-[#3b82f6]/80 mb-1 ml-1">{t('modals.fromAccount')}</label>
                <CustomSelect
                  buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                  value={fromAccount}
                  onChange={setFromAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('modals.selectAccount')}
                />
              </div>
              <div className="flex-1">
                <label className="block text-[13px] text-[#10b981]/80 mb-1 ml-1">{t('modals.toAccount')}</label>
                <CustomSelect
                  buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                  value={toAccount}
                  onChange={setToAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('modals.selectAccount')}
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('modals.accountLabel')}</label>
                <CustomSelect
                  buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-[13px] text-white/90 flex justify-between items-center"
                  value={account}
                  onChange={setAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('modals.selectAccount')}
                />
              </div>
              <div>
                <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('modals.categoryLabel')}</label>
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
            <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('recurring.repeatType')}</label>
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
              <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('recurring.interval')}</label>
              <input 
                type="number" 
                min="1" 
                value={interval} 
                onChange={(e) => setInterval(e.target.value)} 
                className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/50" 
              />
            </div>
          )}

          <div>
            <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('recurring.executionTime')}</label>
            <input 
              type="time" 
              value={executionTime} 
              onChange={(e) => setExecutionTime(e.target.value)} 
              className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-sm text-white focus:outline-none text-left"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-[13px] font-bold text-white/90">{t('recurring.neverEnds')}</label>
            <button
              type="button"
              onClick={() => setNeverEnds(!neverEnds)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 shadow-inner border border-white/10 ${neverEnds ? 'bg-[#8D6346]' : 'bg-black/40'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${neverEnds ? (lang === 'ar' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'}`} />
            </button>
          </div>

          {!neverEnds && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('recurring.endDate')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-sm text-white focus:outline-none"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="flex-1">
                <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('recurring.maxOccurrences')}</label>
                <input type="number" min="1" value={maxOccurrences} onChange={(e) => setMaxOccurrences(e.target.value)} placeholder="12" className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-sm text-white focus:outline-none" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
            <label className="text-[13px] font-bold text-white/90">{t('recurring.reminderEnabled')}</label>
            <button
              type="button"
              onClick={() => setReminderEnabled(!reminderEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 shadow-inner border border-white/10 ${reminderEnabled ? 'bg-[#8D6346]' : 'bg-black/40'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${reminderEnabled ? (lang === 'ar' ? '-translate-x-6' : 'translate-x-6') : 'translate-x-0'}`} />
            </button>
          </div>

          {reminderEnabled && (
            <div className="animate-fade-in">
              <label className="text-[13px] text-white/60 mb-1 block ml-1">{t('recurring.reminderDaysBefore')}</label>
              <input type="number" min="0" value={reminderDaysBefore} onChange={(e) => setReminderDaysBefore(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-3 text-sm text-white focus:outline-none" />
            </div>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-3.5 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[14px] hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2"
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
