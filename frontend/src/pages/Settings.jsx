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
  AlertTriangle,
  Banknote,
  X,
  ChevronRight,
  Bell,
  Database,
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
  createTransaction,
} from "../api/transactions";

import { subscribeToNotifications, sendNotification } from "../api/notifications";

import { deleteAllUserData } from "../api/auth";

import ConfirmModal from "../components/modals/ConfirmModal";
import IconPicker, { getIconComponent } from "../components/IconPicker";

const Settings = () => {
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('main'); // main, notifications, accounts, categories, data
  const fileInputRef = useRef(null);

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');
  const [newAccountIcon, setNewAccountIcon] = useState('Wallet');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Tag');

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dataStatus, setDataStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editType, setEditType] = useState(null); // 'account' or 'category'
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Push Notifications State
  const [pushStatus, setPushStatus] = useState('');

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleSubscribe = async () => {
    try {
      setPushStatus('جارٍ التفعيل...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('لم يتم إعطاء صلاحية الإشعارات');
      }
      const registration = await navigator.serviceWorker.ready;
      
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
      
      await subscribeToNotifications(subscription);
      setPushStatus('تم تفعيل الإشعارات بنجاح!');
    } catch (error) {
      console.error('Push error:', error);
      setPushStatus('تعذر تفعيل الإشعارات: ' + error.message);
    }
  };

  const fetchData = async () => {
    try {
      const [accountsData, categoriesData, transactionsData] = await Promise.all([
        getAccounts(),
        getCategories(),
        getTransactions(),
      ]);

      setAccounts(accountsData);
      setCategories(categoriesData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getAccountBalance = (account) => {
    let balance = account.balance_adjustment || 0;
    transactions.forEach(t => {
      if (t.type === 'income' && t.account?._id === account._id) balance += t.amount;
      else if (t.type === 'expense' && t.account?._id === account._id) balance -= t.amount;
      else if (t.type === 'transfer') {
        if (t.to_account?._id === account._id) balance += t.amount;
        if (t.from_account?._id === account._id) balance -= t.amount;
      } else if (t.type === 'settlement' && t.account?._id === account._id) balance += t.amount;
    });
    return balance;
  };

  const handleEditBalance = async (account) => {
    const currentBalance = getAccountBalance(account);
    const newBalanceStr = prompt(`تعديل رصيد حساب "${account.name}"\n\nالرصيد الحالي: ${currentBalance.toLocaleString('ar-EG')} ج.م\n\nأدخل الرصيد الجديد:`, currentBalance);
    
    if (newBalanceStr === null || newBalanceStr.trim() === '') return;
    const newBalance = Number(newBalanceStr);
    if (isNaN(newBalance) || newBalance === currentBalance) return;

    const diff = newBalance - currentBalance;
    
    try {
      setIsLoading(true);
      const newAdjustment = (account.balance_adjustment || 0) + diff;
      await updateAccount(account._id, { balance_adjustment: newAdjustment });
      await fetchData();
    } catch (error) {
      alert('حدث خطأ أثناء تعديل الرصيد');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    try {
      await createAccount({
        name: newAccountName,
        type: newAccountType,
        icon: newAccountIcon,
      });
      setNewAccountName("");
      setNewAccountIcon("Wallet");
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
        icon: newCategoryIcon,
      });
      setNewCategoryName("");
      setNewCategoryIcon("Tag");
      fetchData();
    } catch (error) {
      console.error("❌ خطأ في إضافة الفئة:", error);
    }
  };

  const openEditModal = (item, type) => {
    setEditType(type);
    setEditingItem(item);
    setEditName(item.name);
    setEditIcon(item.icon || (type === 'account' ? 'Wallet' : 'Tag'));
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingItem(null);
    setEditName('');
    setEditIcon('');
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsUpdating(true);
    try {
      if (editType === 'account') {
        await updateAccount(editingItem._id, { name: editName, icon: editIcon, type: editingItem.type });
      } else {
        await updateCategory(editingItem._id, { name: editName, icon: editIcon, type: editingItem.type });
      }
      await fetchData();
      closeEditModal();
    } catch (error) {
      alert(error.response?.data?.message || "حدث خطأ أثناء التعديل");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = (account) => {
    setSelectedAccount(account);
    setDeleteType("account");
    setDeleteModalOpen(true);
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

  const handleWipeData = async () => {
    setIsWiping(true);
    try {
      await deleteAllUserData();
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setWipeModalOpen(false);
      setDataStatus('تم مسح جميع البيانات بنجاح.');
      window.location.reload();
    } catch (error) {
      setDataStatus(error.response?.data?.message || 'تعذر مسح البيانات.');
    } finally {
      setIsWiping(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await getTransactions();
      const backup = {
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        accounts: accounts.map(({ name, type, icon }) => ({ name, type, icon })),
        categories: categories.map(({ name, type, icon }) => ({ name, type, icon })),
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
      const dataBlob = new Blob([dataStr], { type: "application/json" });
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

    const fileType = file.name.split('.').pop().toLowerCase();

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        setDataStatus('جارٍ قراءة واستيراد الملف...');
        
        let importedData;
        if (fileType === 'csv') {
          const text = event.target.result;
          const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
          if (lines.length < 2) throw new Error('ملف CSV فارغ أو غير صالح.');
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          importedData = [];
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
            const obj = {};
            headers.forEach((header, index) => {
              if (values[index] !== undefined) {
                obj[header] = values[index];
              }
            });
            importedData.push(obj);
          }
        } else {
          importedData = JSON.parse(event.target.result);
        }

        const result = await importTransactions(importedData);
        let msg = `تم استيراد ${result.insertedTransactions} معاملة. أُضيف ${result.createdAccounts} حساب و${result.createdCategories} فئة عند الحاجة.`;
        if (result.skippedRows > 0) msg += ` تم تخطي ${result.skippedRows} صف غير صالح.`;
        setDataStatus(msg);
        fetchData();
      } catch (error) {
        setDataStatus(error.response?.data?.message || 'تأكد من أن الملف بصيغة صالحة (JSON أو CSV).');
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
    <div className="p-4 pt-12 pb-24 min-h-screen text-white bg-[#0a0a0c] space-y-6 relative">
      <h2 className="text-2xl font-bold text-center tracking-wide text-gray-100 flex items-center justify-center gap-3">
        {activeView !== 'main' && (
          <button onClick={() => setActiveView('main')} className="text-gray-400 hover:text-white p-2">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
        <span>
          {activeView === 'main' && 'الإعدادات'}
          {activeView === 'notifications' && 'الإشعارات'}
          {activeView === 'accounts' && 'إدارة الحسابات'}
          {activeView === 'categories' && 'إدارة الفئات'}
          {activeView === 'data' && 'إدارة البيانات'}
        </span>
        {activeView !== 'main' && <div className="w-10"></div>}
      </h2>

      {activeView === 'main' && (
        <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)] divide-y divide-white/5 overflow-hidden">
          <button onClick={() => setActiveView('notifications')} className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400"><Bell size={20} /></div>
              <span className="text-lg font-medium text-gray-200">الإشعارات الفورية</span>
            </div>
            <ChevronRight className="text-gray-500 w-5 h-5 rotate-180" />
          </button>
          
          <button onClick={() => setActiveView('accounts')} className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400"><Wallet size={20} /></div>
              <span className="text-lg font-medium text-gray-200">إدارة الحسابات</span>
            </div>
            <ChevronRight className="text-gray-500 w-5 h-5 rotate-180" />
          </button>
          
          <button onClick={() => setActiveView('categories')} className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400"><Tag size={20} /></div>
              <span className="text-lg font-medium text-gray-200">إدارة الفئات</span>
            </div>
            <ChevronRight className="text-gray-500 w-5 h-5 rotate-180" />
          </button>

          <button onClick={() => setActiveView('data')} className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/20 p-2 rounded-xl text-purple-400"><Database size={20} /></div>
              <span className="text-lg font-medium text-gray-200">إدارة البيانات</span>
            </div>
            <ChevronRight className="text-gray-500 w-5 h-5 rotate-180" />
          </button>
        </section>
      )}

      {activeView === 'notifications' && (
      <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
        <h3 className="text-lg font-semibold mb-1 text-gray-200">الإشعارات الفورية (Push)</h3>
        <p className="text-sm text-gray-400 mb-6">احصل على تنبيهات وإشعارات حتى لو كان التطبيق مغلقاً.</p>
        
        <div className="mb-6">
          <button onClick={handleSubscribe} className="w-full flex items-center justify-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-3 rounded-2xl hover:bg-blue-500/30 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="text-sm font-semibold">تفعيل استلام الإشعارات على هذا الجهاز</span>
          </button>
        </div>

        {pushStatus && <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-gray-300 text-center">{pushStatus}</p>}
      </section>
      )}

      {activeView === 'accounts' && (
      <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-400">
          <Wallet className="w-5 h-5" /> الحسابات
        </h3>
        
        <ul className="divide-y divide-white/5 mb-5">
          {accounts.map((acc) => {
            const AccIcon = getIconComponent(acc.icon, 'Wallet');
            return (
            <li key={acc._id} className="py-4 flex items-center justify-between gap-3">
              <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400">
                <AccIcon size={20} />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-white font-medium text-lg">{acc.name}</span>
                <span className="text-xs text-gray-400 capitalize">{acc.type === 'cash' ? 'كاش' : acc.type === 'bank' ? 'بنك' : 'محفظة'}</span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => handleEditBalance(acc)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition group">
                  <span className="font-bold text-blue-400 text-lg">{getAccountBalance(acc).toLocaleString('ar-EG')}</span>
                  <span className="text-xs text-blue-400/70">ج.م</span>
                  <Pencil size={14} className="text-blue-400 opacity-50 group-hover:opacity-100 transition" />
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(acc, 'account')}
                    className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 transition rounded-xl text-gray-400 hover:text-white"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(acc)}
                    className="p-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition rounded-xl text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          )})}
        </ul>

        <form onSubmit={handleAddAccount} className="flex flex-col gap-4">
          <input
            type="text"
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="اسم الحساب (مثال: كاش، بنك مصر)"
            className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
          />
          <select
            value={newAccountType}
            onChange={(e) => setNewAccountType(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-3 text-sm text-white focus:outline-none focus:border-blue-500/50"
          >
            <option value="cash" className="bg-[#1c1c1e]">كاش</option>
            <option value="bank" className="bg-[#1c1c1e]">بنك</option>
            <option value="wallet" className="bg-[#1c1c1e]">محفظة</option>
          </select>
          <IconPicker selectedIcon={newAccountIcon} onSelect={setNewAccountIcon} colorClass="text-blue-400" />
          <button type="submit" className="bg-blue-500 w-full py-3 flex items-center justify-center rounded-xl text-white hover:bg-blue-600 transition-colors gap-2">
            <Plus className="w-5 h-5" /> إضافة حساب
          </button>
        </form>
      </section>
      )}

      {activeView === 'categories' && (
      <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-emerald-400">
          <Tag className="w-5 h-5" /> الفئات
        </h3>
        
        <ul className="divide-y divide-white/5 mb-5">
          {categories.map((cat) => {
            const CatIcon = getIconComponent(cat.icon, 'Tag');
            const colorClass = cat.type === 'expense' ? 'text-red-400' : 'text-emerald-400';
            const bgClass = cat.type === 'expense' ? 'bg-red-500/20' : 'bg-emerald-500/20';
            return (
            <li key={cat._id} className="py-4 flex items-center justify-between gap-3">
              <div className={`${bgClass} p-2 rounded-xl ${colorClass}`}>
                <CatIcon size={20} />
              </div>
              <div className="flex flex-col flex-1">
                <span className={`font-medium text-lg ${cat.type === 'expense' ? 'text-red-300' : 'text-emerald-300'}`}>{cat.name}</span>
                <span className="text-xs text-gray-400 capitalize">{cat.type === 'expense' ? 'مصروف' : 'دخل'}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditModal(cat, 'category')}
                  className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 transition rounded-xl text-gray-400 hover:text-white"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="p-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition rounded-xl text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          )})}
        </ul>

        <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="اسم الفئة (مثال: طعام، فواتير)"
            className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          />
          <select
            value={newCategoryType}
            onChange={(e) => setNewCategoryType(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-3 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="expense" className="bg-[#1c1c1e]">مصروف</option>
            <option value="income" className="bg-[#1c1c1e]">دخل</option>
          </select>
          <IconPicker 
            selectedIcon={newCategoryIcon} 
            onSelect={setNewCategoryIcon} 
            colorClass={newCategoryType === 'expense' ? 'text-red-400' : 'text-emerald-400'} 
          />
          <button type="submit" className="bg-emerald-500 w-full py-3 flex items-center justify-center rounded-xl text-white hover:bg-emerald-600 transition-colors gap-2">
            <Plus className="w-5 h-5" /> إضافة فئة
          </button>
        </form>
      </section>
      )}

      {activeView === 'data' && (
      <div className="space-y-6">
        <section className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
          <h3 className="text-lg font-semibold mb-1 text-gray-200">إدارة البيانات</h3>
          <p className="text-sm text-gray-400 mb-4">الاستيراد ينشئ الحسابات والفئات الناقصة تلقائيًا ويحفظ كل معاملة في حسابها الصحيح.</p>
          
          <div className="flex gap-3">
            <button onClick={handleExport} className="flex-1 flex flex-col items-center justify-center gap-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-4 rounded-2xl hover:bg-blue-500/30 transition-colors">
              <Download className="w-6 h-6" /> 
              <span className="text-sm">تصدير</span>
            </button>

            <input type="file" accept=".json,.csv" ref={fileInputRef} onChange={handleImportFile} className="hidden" />
            
            <button onClick={handleImportClick} disabled={isImporting} className="flex-1 flex flex-col items-center justify-center gap-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 py-4 rounded-2xl hover:bg-purple-500/30 transition-colors disabled:opacity-50">
              <Upload className="w-6 h-6" /> 
              <span className="text-sm">استيراد</span>
            </button>
          </div>
          {dataStatus && <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-gray-300">{dataStatus}</p>}
        </section>

        <section className="bg-red-500/5 backdrop-blur-xl border border-red-500/20 p-5 rounded-3xl shadow-[0_8px_32px_rgb(0,0,0,0.3)]">
          <h3 className="text-lg font-semibold mb-1 text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> منطقة الخطر
          </h3>
          <p className="text-sm text-gray-400 mb-4">حذف جميع البيانات نهائياً بما في ذلك المعاملات والحسابات والفئات والاستثمارات والمستحقات. لا يمكن التراجع عن هذا الإجراء.</p>
          <button
            onClick={() => setWipeModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 py-4 rounded-2xl hover:bg-red-500/30 transition-colors font-semibold"
          >
            <Trash2 className="w-5 h-5" />
            مسح جميع البيانات
          </button>
        </section>
      </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold text-white">
                تعديل {editType === 'account' ? 'الحساب' : 'الفئة'}
              </h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={submitEdit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">الاسم</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                  required
                />
              </div>

              <IconPicker 
                selectedIcon={editIcon} 
                onSelect={setEditIcon} 
                colorClass={
                  editType === 'account' ? 'text-blue-400' 
                  : (editingItem?.type === 'expense' ? 'text-red-400' : 'text-emerald-400')
                } 
              />

              <button 
                type="submit" 
                disabled={isUpdating}
                className="bg-blue-500 w-full py-3 flex items-center justify-center rounded-xl text-white hover:bg-blue-600 transition-colors mt-2"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ التعديلات"}
              </button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={wipeModalOpen}
        title="مسح جميع البيانات"
        message="هل أنت متأكد من حذف جميع بياناتك؟ سيتم حذف كل المعاملات والحسابات والفئات والاستثمارات والمستحقات نهائياً. لا يمكن التراجع عن هذا الإجراء!"
        confirmText={isWiping ? <Loader2 className="w-4 h-4 animate-spin" /> : "مسح الكل"}
        cancelText="إلغاء"
        confirmColor="red"
        onConfirm={handleWipeData}
        onCancel={() => { if (!isWiping) setWipeModalOpen(false); }}
      />

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
