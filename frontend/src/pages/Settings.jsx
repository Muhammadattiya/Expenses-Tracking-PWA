import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Wallet,
  Tag,
  Loader2,
  Download,
  Upload,
  Pencil,
  Trash2,
} from "lucide-react";

import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../api/accounts";

import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/categories";

import {
  getTransactions,
  importTransactions,
} from "../api/transactions";

import ConfirmModal from "../components/modals/ConfirmModal";

const Settings = () => {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dataStatus, setDataStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async () => {
  try {
    const [accountsData, categoriesData] = await Promise.all([
      getAccounts(),
      getCategories(),
    ]);

    setAccounts(accountsData);
    setCategories(categoriesData);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    setIsLoading(false);
  }
};

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddAccount = async (e) => {
  e.preventDefault();

  if (!newAccountName.trim()) return;

  try {
    await createAccount({
      name: newAccountName,
      type: newAccountType,
    });

    setNewAccountName("");
    fetchData();
  } catch (error) {
    console.error("❌ خطأ في إضافة الحساب:", error);
  }
};

  const handleAddCategory = async (e) => {
  e.preventDefault();

  if (!newCategoryName.trim()) return;

  try {
    await createCategory({
      name: newCategoryName,
      type: newCategoryType,
    });
    

    setNewCategoryName("");
    fetchData();
  } catch (error) {
    console.error("❌ خطأ في إضافة الفئة:", error);
  }
};

const handleEditAccount = async (account) => {
  const newName = prompt("اسم الحساب الجديد", account.name);

  if (!newName || newName.trim() === "" || newName === account.name) return;

  try {
    await updateAccount(account._id, {
      name: newName,
      type: account.type,
    });

    fetchData();
  } catch (error) {
    alert(error.response?.data?.message || "حدث خطأ أثناء تعديل الحساب");
  }
};

const handleDeleteAccount = (account) => {
  setSelectedAccount(account);
  setDeleteType("account");
  setDeleteModalOpen(true);
};

const handleEditCategory = async (category) => {
  const newName = prompt("اسم الفئة الجديد", category.name);

  if (!newName || newName.trim() === "" || newName === category.name) return;

  try {
    await updateCategory(category._id, {
      name: newName,
      type: category.type,
    });

    fetchData();
  } catch (error) {
    alert(error.response?.data?.message || "حدث خطأ أثناء تعديل الفئة");
  }
};

const handleDeleteCategory = (category) => {
  setSelectedCategory(category);
  setDeleteType("category");
  setDeleteModalOpen(true);
};

const confirmDelete = async () => {
  setIsDeleting(true);
  try {
  if (deleteType === "account") {
    await deleteAccount(selectedAccount._id);
  } else if (deleteType === "category") {
    await deleteCategory(selectedCategory._id);
  }

  await fetchData();

  setDeleteModalOpen(false);
  setSelectedAccount(null);
  setSelectedCategory(null);
  setDeleteType(null);
} catch (error) {
  alert(error.response?.data?.message || "حدث خطأ أثناء الحذف");
} finally {
  setIsDeleting(false);
}
};

  const handleExport = async () => {
  try {
    const data = await getTransactions();
    const backup = {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      accounts: accounts.map(({ name, type }) => ({ name, type })),
      categories: categories.map(({ name, type }) => ({ name, type })),
      transactions: data.map((transaction) => ({
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        account: transaction.account ? { name: transaction.account.name, type: transaction.account.type } : undefined,
        category: transaction.category ? { name: transaction.category.name, type: transaction.category.type } : undefined,
        from_account: transaction.from_account ? { name: transaction.from_account.name, type: transaction.from_account.type } : undefined,
        to_account: transaction.to_account ? { name: transaction.to_account.name, type: transaction.to_account.type } : undefined,
      })),
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], {
      type: "application/json",
    });

    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `expenses_backup_${new Date().toISOString().split("T")[0]}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDataStatus(`تم تصدير ${backup.transactions.length} معاملة بنجاح.`);
  } catch (error) {
    setDataStatus(error.response?.data?.message || 'تعذر تصدير البيانات.');
  }
};

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        setDataStatus('جارٍ قراءة واستيراد الملف...');
        const importedData = JSON.parse(event.target.result);
        const result = await importTransactions(importedData);
        setDataStatus(`تم استيراد ${result.insertedTransactions} معاملة. أُضيف ${result.createdAccounts} حساب و${result.createdCategories} فئة عند الحاجة.`);
        fetchData();
      } catch (error) {
        setDataStatus(error.response?.data?.message || 'تأكد من أن الملف بصيغة JSON صحيحة.');
      } finally {
        setIsImporting(false);
        e.target.value = null; 
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pt-12 pb-24 min-h-screen text-white bg-[#0a0a0c] space-y-6">
      <h2 className="text-2xl font-bold text-center tracking-wide text-gray-100">
        الإعدادات
      </h2>

      {/* قسم إدارة الحسابات - تم تعديل التصميم للموبايل */}
      <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-400">
          <Wallet className="w-5 h-5" /> إدارة الحسابات
        </h3>
        
        <form onSubmit={handleAddAccount} className="flex flex-col gap-3 mb-5">
          <input
            type="text"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="اسم الحساب (مثال: كاش، بنك مصر)"
            className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
          />
          <div className="flex gap-3">
            <select
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value)}
              className="flex-1 bg-black/30 border border-white/10 rounded-xl py-3 px-3 text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="cash" className="bg-[#1c1c1e]">كاش</option>
              <option value="bank" className="bg-[#1c1c1e]">بنك</option>
              <option value="wallet" className="bg-[#1c1c1e]">محفظة</option>
            </select>
            <button type="submit" className="bg-blue-500 w-14 flex items-center justify-center rounded-xl text-white hover:bg-blue-600 transition-colors">
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </form>

      <div className="flex flex-wrap gap-3">
  {accounts.map((acc) => (
    <div
      key={acc._id}
      className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between gap-4 min-w-[180px]"
    >
      <div>
        <p className="text-white font-medium">{acc.name}</p>
        <p className="text-xs text-gray-400 capitalize">{acc.type}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleEditAccount(acc)}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/10 hover:bg-blue-500/20 transition flex items-center justify-center"
        >
          <Pencil size={16} className="text-blue-400" />
        </button>

        <button
          onClick={() => handleDeleteAccount(acc)}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/10 hover:bg-red-500/20 transition flex items-center justify-center"
        >
          <Trash2 size={16} className="text-red-400" />
        </button>
      </div>
    </div>
  ))}
</div>
      </section>

      {/* قسم إدارة الفئات - تم تعديل التصميم للموبايل */}
      <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-400">
          <Tag className="w-5 h-5" /> إدارة الفئات
        </h3>
        
        <form onSubmit={handleAddCategory} className="flex flex-col gap-3 mb-5">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="اسم الفئة (مثال: طعام، فواتير)"
            className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-green-500/50"
          />
          <div className="flex gap-3">
            <select
              value={newCategoryType}
              onChange={(e) => setNewCategoryType(e.target.value)}
              className="flex-1 bg-black/30 border border-white/10 rounded-xl py-3 px-3 text-sm text-white focus:outline-none focus:border-green-500/50"
            >
              <option value="expense" className="bg-[#1c1c1e]">مصروف</option>
              <option value="income" className="bg-[#1c1c1e]">دخل</option>
            </select>
            <button type="submit" className="bg-green-500 w-14 flex items-center justify-center rounded-xl text-white hover:bg-green-600 transition-colors">
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-3">
  {categories.map((cat) => (
    <div
      key={cat._id}
      className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-4 min-w-[180px] ${
        cat.type === "expense"
          ? "bg-red-500/10 border-red-500/20"
          : "bg-green-500/10 border-green-500/20"
      }`}
    >
      <div>
        <p
          className={`font-medium ${
            cat.type === "expense"
              ? "text-red-300"
              : "text-green-300"
          }`}
        >
          {cat.name}
        </p>

        <p className="text-xs text-gray-400 capitalize">
          {cat.type}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => handleEditCategory(cat)}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/10 hover:bg-blue-500/20 transition flex items-center justify-center"
        >
          <Pencil size={16} className="text-blue-400" />
        </button>

        <button
          onClick={() => handleDeleteCategory(cat)}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/10 hover:bg-red-500/20 transition flex items-center justify-center"
        >
          <Trash2 size={16} className="text-red-400" />
        </button>
      </div>
    </div>
  ))}
</div>
      </section>

      {/* قسم الاستيراد والتصدير */}
      <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
        <h3 className="text-lg font-semibold mb-1 text-gray-200">إدارة البيانات</h3>
        <p className="text-sm text-gray-400 mb-4">الاستيراد ينشئ الحسابات والفئات الناقصة تلقائيًا ويحفظ كل معاملة في حسابها الصحيح.</p>
        
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex-1 flex flex-col items-center justify-center gap-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-4 rounded-2xl hover:bg-blue-500/30 transition-colors">
            <Download className="w-6 h-6" /> 
            <span className="text-sm">تصدير</span>
          </button>

          <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportFile} className="hidden" />
          
          <button onClick={handleImportClick} disabled={isImporting} className="flex-1 flex flex-col items-center justify-center gap-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 py-4 rounded-2xl hover:bg-purple-500/30 transition-colors disabled:opacity-50">
            <Upload className="w-6 h-6" /> 
            <span className="text-sm">استيراد</span>
          </button>
        </div>
        {dataStatus && <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-gray-300">{dataStatus}</p>}
      </section>

      <ConfirmModal
        open={deleteModalOpen}
        title={deleteType === "account" ? "حذف الحساب" : "حذف الفئة"}
        message={
          deleteType === "account"
            ? `هل تريد حذف الحساب "${selectedAccount?.name}" ؟`
            : `هل تريد حذف الفئة "${selectedCategory?.name}" ؟`
        }
        confirmText={isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف"}
        cancelText="إلغاء"
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => {
  if (isDeleting) return;

  setDeleteModalOpen(false);
  setSelectedAccount(null);
  setSelectedCategory(null);
  setDeleteType(null);
}}
      />
    </div>
  );
};

export default Settings;
