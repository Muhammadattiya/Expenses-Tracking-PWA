import { useState, useEffect } from "react";
import { Loader2, X, Trash2, CheckCircle2 } from "lucide-react";
import { updateTransaction } from "../../api/transactions";
import { getAccounts } from "../../api/accounts";
import { getCategories } from "../../api/categories";
import ConfirmModal from "./ConfirmModal";

const EditTransactionModal = ({ transaction, open, onClose, onDelete, onSuccess }) => {
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
        type: transaction.type
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
      alert("حدث خطأ أثناء تعديل المعاملة");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredCategories = categories.filter(c => c.type === transaction.type);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            تعديل المعاملة
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1 ml-1">المبلغ</label>
            <div className="relative">
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50"
              />
              <span className="absolute left-4 top-3 text-gray-500 font-medium">ج.م</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1 ml-1">الوصف</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1 ml-1">التاريخ</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {transaction.type === 'transfer' ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-blue-400/80 mb-1 ml-1">من حساب</label>
                <select
                  value={fromAccount}
                  onChange={(e) => setFromAccount(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500/50 appearance-none text-sm"
                >
                  {accounts.map(acc => (
                    <option key={`from-${acc._id}`} value={acc._id} className="bg-[#1c1c1e]">{acc.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm text-green-400/80 mb-1 ml-1">إلى حساب</label>
                <select
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-3 text-white focus:outline-none focus:border-blue-500/50 appearance-none text-sm"
                >
                  {accounts.map(acc => (
                    <option key={`to-${acc._id}`} value={acc._id} className="bg-[#1c1c1e]">{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1 ml-1">الحساب</label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                >
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id} className="bg-[#1c1c1e]">{acc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1 ml-1">الفئة</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500/50 appearance-none"
                >
                  <option value="" disabled className="bg-[#1c1c1e]">اختر الفئة...</option>
                  {filteredCategories.map(cat => (
                    <option key={cat._id} value={cat._id} className="bg-[#1c1c1e]">{cat.name}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <button
              type="submit"
              disabled={isUpdating}
              className="bg-blue-500 w-full py-3.5 flex items-center justify-center rounded-xl text-white font-bold hover:bg-blue-600 transition-colors gap-2"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5"/> حفظ التعديلات</>}
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="bg-red-500/10 border border-red-500/20 w-full py-3 flex items-center justify-center rounded-xl text-red-400 font-bold hover:bg-red-500/20 transition-colors gap-2"
            >
              <Trash2 className="w-5 h-5" /> مسح المعاملة
            </button>
          </div>
        </form>

        <ConfirmModal
          open={deleteConfirmOpen}
          title="مسح المعاملة"
          message={`هل أنت متأكد من مسح المعاملة "${transaction.title}"؟`}
          confirmText="نعم، امسحها"
          cancelText="إلغاء"
          confirmColor="red"
          onConfirm={() => {
            setDeleteConfirmOpen(false);
            onDelete(transaction);
          }}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      </div>
    </div>
  );
};

export default EditTransactionModal;
