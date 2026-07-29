import { useState, useEffect } from "react";
import { Loader2, X, Trash2, CheckCircle2 } from "lucide-react";
import { updateTransaction } from "../../api/transactions";
import { getAccounts } from "../../api/accounts";
import { getCategories } from "../../api/categories";
import ConfirmModal from "./ConfirmModal";
import { useNotification } from "../../contexts/NotificationContext";
import CustomSelect from "../ui/CustomSelect";
import { useLanguage } from "../../contexts/LanguageContext";
import { createPortal } from "react-dom";

const EditTransactionModal = ({ transaction, open, onClose, onDelete, onSuccess }) => {
  const { t } = useLanguage();
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [date, setDate] = useState("");

  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { showToast } = useNotification();

  useEffect(() => {
    if (open && transaction) {
      setAmount(transaction.amount || "");
      setTitle(transaction.title || "");
      if (transaction.date) {
        // Format to YYYY-MM-DD for input[type="date"]
        setDate(new Date(transaction.date).toISOString().split('T')[0]);
      }
      setAccount(transaction.account?._id || "");
      setCategory(transaction.category?._id || "");
      setFromAccount(transaction.from_account?._id || "");
      setToAccount(transaction.to_account?._id || "");
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
        date: new Date(date).toISOString(),
        type: transaction.type,
        status: 'completed'
      };

      if (transaction.type === "transfer") {
        payload.from_account = fromAccount;
        payload.to_account = toAccount;
      } else {
        payload.account = account;
        payload.category = category;
      }

      await updateTransaction(transaction._id, payload);
      onSuccess();
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
            {t('modals.editTransactionTitle', 'تعديل المعاملة')}
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
                className="w-full bg-[var(--color-surface-active)] border border-white/10 rounded-xl py-2.5 px-4 pe-14 text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50"
              />
              <span className="absolute end-4 top-3 text-[var(--color-text-muted)] font-medium pointer-events-none">{t('nav.currency', 'EGP')}</span>
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

          <div>
            <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('modals.dateLabel', 'التاريخ')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[var(--color-surface-active)] border border-white/10 rounded-xl py-1.5 px-3 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {transaction.type === 'transfer' ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-blue-400/80 mb-1 ml-1">{t('modals.fromAccount', 'من حساب')}</label>
                <CustomSelect
                  value={fromAccount}
                  onChange={setFromAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('modals.selectAccount', 'اختر الحساب')}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-green-400/80 mb-1 ml-1">{t('modals.toAccount', 'إلى حساب')}</label>
                <CustomSelect
                  value={toAccount}
                  onChange={setToAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
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
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('modals.selectAccount', 'اختر الحساب')}
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-1 ml-1">{t('modals.categoryLabel', 'الفئة')}</label>
                <CustomSelect
                  value={category}
                  onChange={setCategory}
                  options={filteredCategories.map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon }))}
                  placeholder={t('modals.selectCategory', 'اختر الفئة...')}
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              disabled={isUpdating}
              className="bg-blue-500 w-full py-3 flex items-center justify-center rounded-xl text-white font-bold hover:bg-blue-600 transition-colors gap-2"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5"/> {t('modals.saveChanges', 'حفظ التعديلات')}</>}
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="bg-red-500/10 border border-red-500/20 w-full py-3 flex items-center justify-center rounded-xl text-red-400 font-bold hover:bg-red-500/20 transition-colors gap-2"
            >
              <Trash2 className="w-5 h-5" /> {t('modals.deleteTransaction', 'مسح المعاملة')}
            </button>
          </div>
        </form>

        <ConfirmModal
          open={deleteConfirmOpen}
          title={t('modals.deleteTransactionTitle', 'مسح المعاملة')}
          message={`${t('modals.deleteTransactionConfirm', 'هل أنت متأكد من مسح المعاملة')} "${transaction.title}"؟`}
          confirmText={t('modals.yesDelete', 'نعم، امسحها')}
          cancelText={t('modals.cancelBtn', 'إلغاء')}
          confirmColor="red"
          onConfirm={() => {
            setDeleteConfirmOpen(false);
            onDelete(transaction);
          }}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      </div>
    </div>,
    document.body
  );
};

export default EditTransactionModal;
