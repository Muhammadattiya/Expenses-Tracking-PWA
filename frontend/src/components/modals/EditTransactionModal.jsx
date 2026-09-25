import { useState, useEffect, useRef } from "react";
import { Loader2, X, Trash2, CheckCircle2, Calendar, Calculator } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { updateTransaction } from "../../api/transactions";
import { getAccounts } from "../../api/accounts";
import { getCategories } from "../../api/categories";
import ConfirmModal from "./ConfirmModal";
import CalculatorModal from "./CalculatorModal";
import { useNotification } from "../../contexts/NotificationContext";
import CustomSelect from "../ui/CustomSelect";
import CustomDatePicker from "../ui/CustomDatePicker";
import { useLanguage } from "../../contexts/LanguageContext";
import { createPortal } from "react-dom";

const EditTransactionModal = ({ transaction, open, onClose, onSkip, onDelete, onSuccess }) => {
  const { lang, t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [date, setDate] = useState("");

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [errors, setErrors] = useState({});
  const amountInputRef = useRef(null);
  const formRef = useRef(null);
  const { showToast } = useNotification();

  useEffect(() => {
    if (open && transaction) {
      setAmount(transaction.amount || "");
      setTitle(transaction.title || "");
      if (transaction.date) {
        setDate(new Date(transaction.date).toISOString().split('T')[0]);
      }
      setType(transaction.type || "");
      setAccount(transaction.account?._id || (typeof transaction.account === 'string' ? transaction.account : ""));
      setCategory(transaction.category?._id || (typeof transaction.category === 'string' ? transaction.category : ""));
      setFromAccount(transaction.from_account?._id || (typeof transaction.from_account === 'string' ? transaction.from_account : ""));
      setToAccount(transaction.to_account?._id || (typeof transaction.to_account === 'string' ? transaction.to_account : ""));
      setErrors({});

      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
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

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isUpdating) return;
    const newErrors = {};
    if (!amount || Number(amount) <= 0) newErrors.amount = t('common.amountRequired') || t('common.required');

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsUpdating(true);
    try {
      const payload = {
        amount: Number(amount),
        title,
        date: new Date(date).toISOString(),
        type: type,
        status: 'completed'
      };

      if (type === "transfer") {
        payload.from_account = fromAccount;
        payload.to_account = toAccount;
      } else {
        payload.account = account;
        payload.category = category;
      }

      await updateTransaction(transaction._id, payload);
      onSuccess();
    } catch (error) {
      showToast(t('modals.editTransactionError'), "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === type);

  return createPortal(
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-3.5 sm:p-4 pointer-events-auto"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Soft Translucent Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Pure Liquid Glass Modal Container - Perfectly Sized with Zero Scroll */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-transaction-title"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
          className="relative w-full max-w-[390px] liquidglass sm:rounded-[2.2rem] rounded-[2rem] p-5 flex flex-col sm:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] z-10 overflow-hidden"
        >
          {/* Header with Title and Quick Action Icons */}
          <div className="flex justify-between items-center mb-3 relative z-10">
            <h3 id="edit-transaction-title" className="text-[16px] font-bold text-white tracking-wide">
              {t('modals.editTransactionTitle')}
            </h3>
            
            <div className="flex items-center gap-1.5">
              <button 
                type="button"
                onClick={() => setDeleteConfirmOpen(true)} 
                aria-label={t('modals.deleteTransaction')}
                className="w-11 h-11 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 rounded-full transition-colors text-red-400 hover:text-red-300 active:scale-95 flex items-center justify-center"
                title={t('modals.deleteTransaction')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={onClose} 
                aria-label={t('common.close')}
                className="w-11 h-11 bg-white/5 hover:bg-white/15 border border-white/10 rounded-full transition-colors text-white/70 hover:text-white active:scale-95 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2.5 relative z-10">
            
            {/* Type Switch Capsule with Liquid Glass */}
            <div className="flex liquidglass p-1 rounded-full border border-white/15 shadow-inner">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`flex-1 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-300 ${
                  type === 'expense' 
                    ? 'bg-[#FF5555] text-white shadow-[0_2px_10px_rgba(255,85,85,0.4)]' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {t('addTransaction.expense')}
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`flex-1 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-300 ${
                  type === 'income' 
                    ? 'bg-[#34C759] text-white shadow-[0_2px_10px_rgba(52,199,89,0.4)]' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {t('addTransaction.income')}
              </button>
              <button
                type="button"
                onClick={() => setType('transfer')}
                className={`flex-1 py-1.5 text-[12px] font-semibold rounded-full transition-all duration-300 ${
                  type === 'transfer' 
                    ? 'bg-[#007AFF] text-white shadow-[0_2px_10px_rgba(0,122,255,0.4)]' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {t('addTransaction.transfer')}
              </button>
            </div>

            {/* Row: Amount & Date (2-Columns) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between mb-1 px-1">
                  <label htmlFor="edit-tx-amount" className="text-[11px] font-medium text-white/75">
                    {t('modals.amountLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCalculator(true)}
                    aria-label={t('calculator.title')}
                    className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                    title={t('calculator.title')}
                  >
                    <Calculator size={13} />
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="edit-tx-amount"
                    ref={amountInputRef}
                    type="number"
                    inputMode="decimal"
                    required
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (errors.amount) setErrors(prev => ({ ...prev, amount: undefined }));
                    }}
                    className={`w-full bg-black/30 border ${
                      errors.amount ? 'border-[#FF3B30] focus:ring-1 focus:ring-[#FF3B30]' : 'border-white/10 focus:border-[#8D6346]'
                    } rounded-xl py-2 px-3 pe-11 text-[13px] font-bold text-white focus:outline-none shadow-inner transition-all`}
                    style={{ caretColor: type === 'expense' ? '#FF5555' : type === 'income' ? '#34C759' : '#007AFF' }}
                  />
                  <span className="absolute end-2.5 top-2 text-[11px] text-white/50 font-semibold pointer-events-none">
                    {t('nav.currency')}
                  </span>
                </div>
                {errors.amount && (
                  <span className="text-[#FF3B30] text-[10px] font-medium mt-0.5 block px-1 animate-fade-in">
                    {errors.amount}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="edit-tx-date-btn" className="block text-[11px] font-medium text-white/75 mb-1 px-1">
                  {t('modals.dateLabel')}
                </label>
                <button
                  id="edit-tx-date-btn"
                  type="button"
                  onClick={() => setIsDatePickerOpen(true)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-[12px] font-medium text-white flex items-center justify-between focus:outline-none focus:border-[#8D6346] shadow-inner transition-all hover:bg-white/[0.08]"
                >
                  <span className="truncate">{date || t('addTransaction.customDate')}</span>
                  <Calendar size={14} className="text-white/50 shrink-0" />
                </button>
              </div>
            </div>

            {/* Description Field */}
            <div>
              <label htmlFor="edit-tx-desc" className="block text-[11px] font-medium text-white/75 mb-1 px-1">
                {t('modals.descriptionLabel')}
              </label>
              <input
                id="edit-tx-desc"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('addTransaction.descPlaceholder')}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 text-[12px] font-medium text-white placeholder-white/35 focus:outline-none focus:border-[#8D6346] shadow-inner transition-all"
              />
            </div>

            {/* Row: Accounts & Category (2-Columns) */}
            {type === 'transfer' ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-white/75 mb-1 px-1 truncate">
                    {t('modals.fromAccount')}
                  </span>
                  <CustomSelect
                    value={fromAccount}
                    onChange={setFromAccount}
                    options={accounts.filter(acc => !acc.isArchived).map(acc => ({
                      value: acc._id,
                      label: acc.name,
                      icon: acc.icon,
                      color: acc.color,
                      subtitle: acc.balance !== undefined ? `${acc.balance.toLocaleString()} ${t('nav.currency') || 'EGP'}` : undefined
                    }))}
                    placeholder={t('modals.selectAccount')}
                  />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-white/75 mb-1 px-1 truncate">
                    {t('modals.toAccount')}
                  </span>
                  <CustomSelect
                    value={toAccount}
                    onChange={setToAccount}
                    options={accounts.filter(acc => !acc.isArchived).map(acc => ({
                      value: acc._id,
                      label: acc.name,
                      icon: acc.icon,
                      color: acc.color,
                      subtitle: acc.balance !== undefined ? `${acc.balance.toLocaleString()} ${t('nav.currency') || 'EGP'}` : undefined
                    }))}
                    placeholder={t('modals.selectAccount')}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-white/75 mb-1 px-1 truncate">
                    {t('modals.accountLabel')}
                  </span>
                  <CustomSelect
                    value={account}
                    onChange={setAccount}
                    options={accounts.filter(acc => !acc.isArchived).map(acc => ({
                      value: acc._id,
                      label: acc.name,
                      icon: acc.icon,
                      color: acc.color,
                      subtitle: acc.balance !== undefined ? `${acc.balance.toLocaleString()} ${t('nav.currency') || 'EGP'}` : undefined
                    }))}
                    placeholder={t('modals.selectAccount')}
                  />
                </div>
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-white/75 mb-1 px-1 truncate">
                    {t('modals.categoryLabel')}
                  </span>
                  <CustomSelect
                    value={category}
                    onChange={setCategory}
                    options={filteredCategories.map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon }))}
                    placeholder={t('modals.selectCategory')}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-1.5 flex gap-2">
              <button
                type="submit"
                disabled={isUpdating}
                className="flex-[2] py-3 rounded-full font-semibold text-[14px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('modals.saveChanges')}</span>
                  </>
                )}
              </button>
              
              {!transaction.category && type !== 'transfer' && (
                <button
                  type="button"
                  onClick={() => onSkip ? onSkip(transaction) : onClose()}
                  className="flex-[1] py-3 rounded-full font-semibold text-[14px] text-white/80 transition-all duration-300 active:scale-[0.98] bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center"
                >
                  {t('modals.skip')}
                </button>
              )}
            </div>
          </form>

          <ConfirmModal
            open={deleteConfirmOpen}
            title={t('modals.deleteTransactionTitle')}
            message={`${t('modals.deleteTransactionConfirm')}${transaction.title ? ` "${transaction.title}"` : ''}${lang === 'ar' ? '؟' : '?'}`}
            confirmText={t('modals.yesDelete')}
            cancelText={t('modals.cancelBtn')}
            confirmColor="red"
            onConfirm={() => {
              setDeleteConfirmOpen(false);
              onDelete(transaction);
            }}
            onCancel={() => setDeleteConfirmOpen(false)}
          />
        </motion.div>
      </div>

      {isDatePickerOpen && (
        <CustomDatePicker
          value={date || new Date().toISOString().split('T')[0]}
          onChange={setDate}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}

      {showCalculator && (
        <CalculatorModal
          isOpen={showCalculator}
          onClose={() => setShowCalculator(false)}
          onSave={(val) => setAmount(val.toString())}
          initialValue={amount}
        />
      )}
    </AnimatePresence>,
    document.body
  );
};

export default EditTransactionModal;
