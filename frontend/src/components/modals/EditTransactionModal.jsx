import { useState, useEffect } from "react";
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
    if (isUpdating) return;
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
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: "spring", bounce: 0.15, duration: 0.35 }}
          className="relative w-full max-w-[390px] liquidglass sm:rounded-[2.2rem] rounded-[2rem] p-5 flex flex-col sm:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] z-10 overflow-hidden"
        >
          {/* Header with Title and Quick Action Icons */}
          <div className="flex justify-between items-center mb-3 relative z-10">
            <h3 className="text-[16px] font-bold text-white tracking-wide">
              {t('modals.editTransactionTitle')}
            </h3>
            
            <div className="flex items-center gap-1.5">
              <button 
                type="button"
                onClick={() => setDeleteConfirmOpen(true)} 
                className="p-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/25 rounded-full transition-colors text-red-400 hover:text-red-300 active:scale-95 flex items-center justify-center"
                title={t('modals.deleteTransaction')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button 
                type="button"
                onClick={onClose} 
                className="p-1.5 bg-black/20 hover:bg-black/40 border border-white/10 rounded-full transition-colors text-white/70 hover:text-white active:scale-95 flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 relative z-10">
            
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
                  <label className="text-[11px] font-medium text-white/75">
                    {t('modals.amountLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCalculator(true)}
                    className="p-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                    title={t('calculator.title')}
                  >
                    <Calculator size={12} />
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl py-2 px-3 pe-11 text-[13px] font-bold text-white focus:outline-none focus:border-[#8D6346] shadow-inner transition-all"
                    style={{ caretColor: type === 'expense' ? '#FF5555' : type === 'income' ? '#34C759' : '#007AFF' }}
                  />
                  <span className="absolute end-2.5 top-2 text-[11px] text-white/50 font-semibold pointer-events-none">
                    {t('nav.currency')}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-white/75 mb-1 px-1">
                  {t('modals.dateLabel')}
                </label>
                <button
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
              <label className="block text-[11px] font-medium text-white/75 mb-1 px-1">
                {t('modals.descriptionLabel')}
              </label>
              <input
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
                  <label className="block text-[11px] font-medium text-white/75 mb-1 px-1 truncate">
                    {t('modals.fromAccount')}
                  </label>
                  <CustomSelect
                    value={fromAccount}
                    onChange={setFromAccount}
                    options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                    placeholder={t('modals.selectAccount')}
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] font-medium text-white/75 mb-1 px-1 truncate">
                    {t('modals.toAccount')}
                  </label>
                  <CustomSelect
                    value={toAccount}
                    onChange={setToAccount}
                    options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                    placeholder={t('modals.selectAccount')}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <label className="block text-[11px] font-medium text-white/75 mb-1 px-1 truncate">
                    {t('modals.accountLabel')}
                  </label>
                  <CustomSelect
                    value={account}
                    onChange={setAccount}
                    options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                    placeholder={t('modals.selectAccount')}
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[11px] font-medium text-white/75 mb-1 px-1 truncate">
                    {t('modals.categoryLabel')}
                  </label>
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
