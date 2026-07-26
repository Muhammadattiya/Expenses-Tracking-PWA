import { useState, useEffect } from "react";
import { Loader2, X, CheckCircle2 } from "lucide-react";
import { updateRecurringTransaction } from "../../api/recurringTransactions";
import { getAccounts } from "../../api/accounts";
import { getCategories } from "../../api/categories";
import { useNotification } from "../../contexts/NotificationContext";
import CustomSelect from "../ui/CustomSelect";
import { useLanguage } from "../../contexts/LanguageContext";
import { createPortal } from "react-dom";

const EditRecurringTransactionModal = ({ transaction, open, onClose, onSuccess }) => {
  const { t } = useLanguage();
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

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
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
    if (open && accounts.length === 0) {
      Promise.all([getAccounts(), getCategories()]).then(([accs, cats]) => {
        setAccounts(accs);
        setCategories(cats);
      });
    }
  }, [open, accounts.length]);

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
      showToast(t('modals.editTransactionError', 'حدث خطأ أثناء تعديل المعاملة'), "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === transaction.type);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] border border-white/10 rounded-3xl p-5 w-full max-w-sm flex flex-col max-h-[80vh] overflow-y-auto scrollbar-hide">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-bold text-[var(--color-text-main)]">
            {t('modals.editRecurringTitle', 'تعديل معاملة متكررة')}
          </h3>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('modals.amountLabel', 'المبلغ')}</label>
            <div className="relative">
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[var(--color-surface-active)] border border-white/10 rounded-xl py-2.5 px-4 text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50"
              />
              <span className="absolute left-4 top-3 text-[var(--color-text-muted)] font-medium">ج.م</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('modals.descriptionLabel', 'الوصف')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[var(--color-surface-active)] border border-white/10 rounded-xl py-2.5 px-4 text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {transaction.type === 'transfer' ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-blue-400/80 mb-1 ml-1">{t('modals.fromAccount', 'من حساب')}</label>
                <CustomSelect
                  value={fromAccount}
                  onChange={setFromAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name }))}
                  placeholder={t('modals.selectAccount', 'اختر الحساب')}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-green-400/80 mb-1 ml-1">{t('modals.toAccount', 'إلى حساب')}</label>
                <CustomSelect
                  value={toAccount}
                  onChange={setToAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name }))}
                  placeholder={t('modals.selectAccount', 'اختر الحساب')}
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('modals.accountLabel', 'الحساب')}</label>
                <CustomSelect
                  value={account}
                  onChange={setAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name }))}
                  placeholder={t('modals.selectAccount', 'اختر الحساب')}
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('modals.categoryLabel', 'الفئة')}</label>
                <CustomSelect
                  value={category}
                  onChange={setCategory}
                  options={filteredCategories.map(cat => ({ value: cat._id, label: cat.name }))}
                  placeholder={t('modals.selectCategory', 'اختر الفئة...')}
                />
              </div>
            </>
          )}

          {/* Recurring Options */}
          <div className="pt-2 border-t border-white/10 mt-2">
            <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('recurring.repeatType', 'نوع التكرار')}</label>
            <CustomSelect
              value={repeatType}
              onChange={setRepeatType}
              options={[
                { value: 'daily', label: t('recurring.daily', 'يومياً') },
                { value: 'weekly', label: t('recurring.weekly', 'أسبوعياً') },
                { value: 'monthly', label: t('recurring.monthly', 'شهرياً') },
                { value: 'yearly', label: t('recurring.yearly', 'سنوياً') },
                { value: 'custom', label: t('recurring.custom', 'مخصص') }
              ]}
            />
          </div>

          {repeatType === 'custom' && (
            <div>
              <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('recurring.interval', 'تكرار كل (أيام)')}</label>
              <input type="number" min="1" value={interval} onChange={(e) => setInterval(e.target.value)} className="w-full bg-[var(--color-surface-active)] border border-white/10 rounded-xl py-2.5 px-4 text-[var(--color-text-main)] focus:outline-none" />
            </div>
          )}

          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('recurring.executionTime', 'وقت التنفيذ')}</label>
            <input 
              type="time" 
              value={executionTime} 
              onChange={(e) => setExecutionTime(e.target.value)} 
              className="w-full bg-[var(--color-surface-active)] border border-white/10 rounded-xl py-2.5 px-4 text-[var(--color-text-main)] focus:outline-none text-left"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-[var(--color-text-main)]">{t('recurring.neverEnds', 'تتكرر دائماً')}</label>
            <button
              type="button"
              onClick={() => setNeverEnds(!neverEnds)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${neverEnds ? 'bg-brand-blue' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${neverEnds ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {!neverEnds && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('recurring.endDate', 'تاريخ الانتهاء')}</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-[var(--color-surface-active)] border border-white/10 rounded-xl py-2.5 px-4 text-[var(--color-text-main)] focus:outline-none"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('recurring.maxOccurrences', 'عدد المرات')}</label>
                <input type="number" min="1" value={maxOccurrences} onChange={(e) => setMaxOccurrences(e.target.value)} placeholder="مثال: 12" className="w-full bg-[var(--color-surface-active)] border border-white/10 rounded-xl py-2.5 px-4 text-[var(--color-text-main)] focus:outline-none" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
            <label className="text-sm font-bold text-[var(--color-text-main)]">{t('recurring.reminderEnabled', 'تفعيل التذكير')}</label>
            <button
              type="button"
              onClick={() => setReminderEnabled(!reminderEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${reminderEnabled ? 'bg-brand-blue' : 'bg-gray-600'}`}
            >
              <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${reminderEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {reminderEnabled && (
            <div className="animate-fade-in">
              <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('recurring.reminderDaysBefore', 'التذكير قبل (أيام)')}</label>
              <input type="number" min="0" value={reminderDaysBefore} onChange={(e) => setReminderDaysBefore(e.target.value)} className="w-full bg-[var(--color-surface-active)] border border-white/10 rounded-xl py-2.5 px-4 text-[var(--color-text-main)] focus:outline-none" />
            </div>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              disabled={isUpdating}
              className="bg-blue-500 w-full py-3 flex items-center justify-center rounded-xl text-white font-bold hover:bg-blue-600 transition-colors gap-2"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5"/> {t('modals.saveChanges', 'حفظ التعديلات')}</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default EditRecurringTransactionModal;
