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
  Star,
  MessageSquare,
  Copy,
  CheckCircle2,
  Link2,
  TrendingUp,
  TrendingDown,
  Smartphone
} from "lucide-react";

import { createPortal } from "react-dom";

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

import {
  getRecurringTransactions,
  deleteRecurringTransaction,
  toggleRecurringActive
} from "../api/recurringTransactions";

import { subscribeToNotifications, sendNotification } from "../api/notifications";

import { getCurrentUser, deleteAllUserData } from "../api/auth";
import api from "../api/axios";

import ConfirmModal from "../components/modals/ConfirmModal";
import IconPicker, { getIconComponent } from "../components/IconPicker";
import { useNotification } from "../contexts/NotificationContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { Settings as SettingsIcon } from "lucide-react";
import EditRecurringTransactionModal from "../components/modals/EditRecurringTransactionModal";

const Settings = () => {
  const { showToast } = useNotification();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('main'); // main, notifications, accounts, categories, data, recurring
  const fileInputRef = useRef(null);

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');
  const [newAccountIcon, setNewAccountIcon] = useState('Wallet');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Tag');
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [categoryTab, setCategoryTab] = useState('expense');

  const [addAccountModalOpen, setAddAccountModalOpen] = useState(false);
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountCardLast4, setNewAccountCardLast4] = useState('');
  const [newAccountExcludeFromTotal, setNewAccountExcludeFromTotal] = useState(false);

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
  const [editWebhookUrl, setEditWebhookUrl] = useState('');
  const [isGeneratingWebhook, setIsGeneratingWebhook] = useState(false);
  const [editType, setEditType] = useState(null); // 'account' or 'category'
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editCardLast4, setEditCardLast4] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editExcludeFromTotal, setEditExcludeFromTotal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Push Notifications State
  const [pushStatus, setPushStatus] = useState('');

  // SMS Webhook State
  const [smsToken, setSmsToken] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

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
      setPushStatus(t('settings.pushActivating', 'جارٍ التفعيل...'));
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error(t('settings.pushPermissionDenied', 'لم يتم إعطاء صلاحية الإشعارات'));
      }
      const registration = await navigator.serviceWorker.ready;

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      await subscribeToNotifications(subscription);
      setPushStatus(t('settings.pushSuccess', 'تم تفعيل الإشعارات بنجاح!'));
    } catch (error) {
      console.error('Push error:', error);
      setPushStatus(t('settings.pushError', 'تعذر تفعيل الإشعارات: ') + error.message);
    }
  };

  const fetchData = async () => {
    try {
      const [accs, cats, trans, recurringData] = await Promise.all([
        getAccounts(),
        getCategories(),
        getTransactions(),
        getRecurringTransactions()
      ]);
      setAccounts(accs);
      setCategories(cats);
      setTransactions(trans);
      setRecurringTransactions(recurringData);

      // Fetch SMS Token
      const user = await getCurrentUser();
      setSmsToken(user.smsWebhookToken || null);
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



  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    try {
      await createAccount({
        name: newAccountName,
        type: newAccountType,
        icon: newAccountIcon,
        balance_adjustment: Number(newAccountBalance) || 0,
        cardLast4: newAccountCardLast4,
        excludeFromTotal: newAccountExcludeFromTotal
      });
      setNewAccountName("");
      setNewAccountBalance("");
      setNewAccountIcon("Wallet");
      setNewAccountCardLast4("");
      setNewAccountExcludeFromTotal(false);
      setAddAccountModalOpen(false);
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
      setAddCategoryModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("❌ خطأ في إضافة الفئة:", error);
    }
  };

  const openEditModal = async (item, type) => {
    setEditType(type);
    setEditingItem(item);
    setEditName(item.name);
    setEditIcon(item.icon || (type === 'account' ? 'Wallet' : 'Tag'));
    if (type === 'account') {
      setEditCardLast4(item.cardLast4 || '');
      setEditBalance(getAccountBalance(item));
      setEditExcludeFromTotal(item.excludeFromTotal || false);
    }
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingItem(null);
    setEditName('');
    setEditIcon('');
    setEditCardLast4('');
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsUpdating(true);
    try {
      if (editType === 'account') {
        const currentBalance = getAccountBalance(editingItem);
        const newBalance = Number(editBalance);
        let newAdjustment = editingItem.balance_adjustment || 0;
        if (!isNaN(newBalance) && newBalance !== currentBalance) {
          newAdjustment += (newBalance - currentBalance);
        }
        await updateAccount(editingItem._id, { name: editName, icon: editIcon, type: editingItem.type, cardLast4: editCardLast4, balance_adjustment: newAdjustment, excludeFromTotal: editExcludeFromTotal });
      } else {
        await updateCategory(editingItem._id, { name: editName, icon: editIcon, type: editingItem.type });
      }
      await fetchData();
      closeEditModal();
    } catch (error) {
      showToast(error.response?.data?.message || t('settings.editError', 'حدث خطأ أثناء التعديل'), 'error');
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
      } else if (deleteType === "recurring") {
        await deleteRecurringTransaction(selectedCategory._id);
      }
      await fetchData();
      setDeleteModalOpen(false);
      setSelectedAccount(null);
      setSelectedCategory(null);
      setDeleteType(null);
    } catch (error) {
      console.error("❌ خطأ في مسح العنصر:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleRecurring = async (id) => {
    try {
      await toggleRecurringActive(id);
      fetchData();
    } catch (e) {
      showToast(t('settings.updateError', 'حدث خطأ'), 'error');
    }
  };

  const handleDeleteRecurring = (recurring) => {
    setSelectedCategory(recurring);
    setDeleteType("recurring");
    setDeleteModalOpen(true);
  };

  const handleWipeData = async () => {
    setIsWiping(true);
    try {
      await deleteAllUserData();
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setWipeModalOpen(false);
      setDataStatus(t('settings.wipeSuccess', 'تم مسح جميع البيانات بنجاح.'));
      window.location.reload();
    } catch (error) {
      setDataStatus(error.response?.data?.message || t('settings.wipeError', 'تعذر مسح البيانات.'));
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
      setDataStatus(t('settings.exportSuccess', 'تم تصدير المعاملات بنجاح.'));
    } catch (error) {
      setDataStatus(error.response?.data?.message || t('settings.exportError', 'تعذر تصدير البيانات.'));
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
        setDataStatus(t('settings.importReading', 'جارٍ قراءة واستيراد الملف...'));

        let importedData;
        if (fileType === 'csv') {
          const text = event.target.result;
          const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
          if (lines.length < 2) throw new Error(t('settings.importCsvError', 'ملف CSV فارغ أو غير صالح.'));

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
        let msg = t('settings.importSuccessMsg', 'تم استيراد المعاملات بنجاح.');
        setDataStatus(msg);
        fetchData();
      } catch (error) {
        setDataStatus(error.response?.data?.message || t('settings.importFormatError', 'تأكد من أن الملف بصيغة صالحة (JSON أو CSV).'));
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
    <div className="p-4 pt-8 animate-fade-in space-y-6">
      <h2 className="text-2xl font-bold text-center tracking-wide text-[var(--color-text-main)] flex items-center justify-center gap-3">
        {activeView !== 'main' && (
          <button onClick={() => setActiveView('main')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] p-2">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
        <span className="text-[var(--color-text-main)]">
          {activeView === 'main' && t('nav.settings')}
          {activeView === 'appSettings' && t('settings.appSettings')}
          {activeView === 'notifications' && t('settings.pushNotifications')}
          {activeView === 'accounts' && t('settings.accountManagement')}
          {activeView === 'categories' && t('settings.categoryManagement')}
          {activeView === 'data' && t('settings.dataManagement')}
          {activeView === 'recurring' && t('settings.recurringTransactions')}
        </span>
        {activeView !== 'main' && <div className="w-10"></div>}
      </h2>

      {activeView === 'main' && (
        <section className="glass-panel rounded-[2rem] divide-y divide-[var(--color-border)] overflow-hidden">
          <button onClick={() => setActiveView('appSettings')} className="w-full flex items-center justify-between p-5 hover:bg-[var(--color-surface-hover)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/20 p-2 rounded-xl text-orange-400"><SettingsIcon size={20} /></div>
              <span className="text-lg font-medium text-[var(--color-text-main)] tracking-wide">{t('settings.appSettings')}</span>
            </div>
            <ChevronRight className={`text-[var(--color-text-muted)] w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </button>

          <button onClick={() => setActiveView('notifications')} className="w-full flex items-center justify-between p-5 hover:bg-[var(--color-surface-hover)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-brand-blue/20 p-2 rounded-xl text-brand-blue"><Bell size={20} /></div>
              <span className="text-lg font-medium text-[var(--color-text-main)] tracking-wide">{t('settings.pushNotifications')}</span>
            </div>
            <ChevronRight className={`text-[var(--color-text-muted)] w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </button>

          <button onClick={() => setActiveView('sms')} className="w-full flex items-center justify-between p-5 hover:bg-[var(--color-surface-hover)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400"><MessageSquare size={20} /></div>
              <span className="text-lg font-medium text-[var(--color-text-main)] tracking-wide">{t('settings.smsIntegration')}</span>
            </div>
            <ChevronRight className={`text-[var(--color-text-muted)] w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </button>

          <button onClick={() => setActiveView('accounts')} className="w-full flex items-center justify-between p-5 hover:bg-[var(--color-surface-hover)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-brand-blue/20 p-2 rounded-xl text-brand-blue"><Wallet size={20} /></div>
              <span className="text-lg font-medium text-[var(--color-text-main)] tracking-wide">{t('settings.accountManagement')}</span>
            </div>
            <ChevronRight className={`text-[var(--color-text-muted)] w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </button>

          <button onClick={() => setActiveView('categories')} className="w-full flex items-center justify-between p-5 hover:bg-[var(--color-surface-hover)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-brand-green/20 p-2 rounded-xl text-brand-green"><Tag size={20} /></div>
              <span className="text-lg font-medium text-[var(--color-text-main)] tracking-wide">{t('settings.categoryManagement')}</span>
            </div>
            <ChevronRight className={`text-[var(--color-text-muted)] w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </button>

          <button onClick={() => setActiveView('recurring')} className="w-full flex items-center justify-between p-5 hover:bg-[var(--color-surface-hover)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500/20 p-2 rounded-xl text-orange-400"><Star size={20} /></div>
              <span className="text-lg font-medium text-[var(--color-text-main)] tracking-wide">{t('settings.recurringTransactions', 'المعاملات المتكررة')}</span>
            </div>
            <ChevronRight className={`text-[var(--color-text-muted)] w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </button>

          <button onClick={() => setActiveView('data')} className="w-full flex items-center justify-between p-5 hover:bg-[var(--color-surface-hover)] transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/20 p-2 rounded-xl text-purple-400"><Database size={20} /></div>
              <span className="text-lg font-medium text-[var(--color-text-main)] tracking-wide">{t('settings.dataManagement')}</span>
            </div>
            <ChevronRight className={`text-[var(--color-text-muted)] w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </button>
        </section>
      )}

      {activeView === 'appSettings' && (
        <section className="glass-panel rounded-[2rem] p-5">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-[var(--color-text-main)] font-medium text-lg">{t('settings.language')}</span>
              <div className="flex bg-black/10 dark:bg-black/30 rounded-xl p-1 border border-[var(--color-border)] w-full">
                <button
                  onClick={() => setLang('ar')}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${lang === 'ar' ? 'bg-[var(--color-surface-active)] text-[var(--color-text-main)] shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                >
                  {t('settings.arabic', 'العربية')}
                </button>
                <button
                  onClick={() => setLang('en')}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${lang === 'en' ? 'bg-[var(--color-surface-active)] text-[var(--color-text-main)] shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                >
                  {t('settings.english', 'English')}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[var(--color-text-main)] font-medium text-lg">{t('settings.theme')}</span>
              <div className="flex bg-black/10 dark:bg-black/30 rounded-xl p-1 border border-[var(--color-border)] w-full">
                <button
                  onClick={() => toggleTheme('dark')}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${theme === 'dark' ? 'bg-[var(--color-surface-active)] text-[var(--color-text-main)] shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                >
                  {t('settings.dark', 'Dark')}
                </button>
                <button
                  onClick={() => toggleTheme('light')}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${theme === 'light' ? 'bg-[var(--color-surface-active)] text-[var(--color-text-main)] shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
                >
                  {t('settings.light', 'Light')}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeView === 'notifications' && (
        <section className="glass-panel p-6 rounded-[2rem]">
          <h3 className="text-lg font-semibold mb-1 text-[var(--color-text-main)]">{t('settings.pushNotifications', 'الإشعارات الفورية (Push)')}</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">{t('settings.pushDesc', 'احصل على تنبيهات وإشعارات حتى لو كان التطبيق مغلقاً.')}</p>

          <div className="mb-6">
            <button onClick={handleSubscribe} className="w-full flex items-center justify-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-3 rounded-2xl hover:bg-blue-500/30 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="text-sm font-semibold">{t('settings.pushActivateBtn', 'تفعيل استلام الإشعارات على هذا الجهاز')}</span>
            </button>
          </div>

          {pushStatus && <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-[var(--color-text-main)] text-center">{pushStatus}</p>}
        </section>
      )}

      {activeView === 'sms' && (
        <div className="space-y-4 mb-24 mt-2">
          <div className="glass-panel p-6 rounded-[2rem] border border-white/5 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
            
            <h3 className="text-xl font-bold mb-2 text-[var(--color-text-main)] flex items-center gap-2">
              <MessageSquare className="text-emerald-400 w-6 h-6" />
              {t('settings.smsIntegration')}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6 leading-relaxed">{t('settings.smsDesc')}</p>

            {smsToken ? (
              <div className="flex flex-col gap-6">
                <div className="bg-black/20 p-5 rounded-2xl border border-white/5 relative">
                  <label className="text-sm font-bold text-[var(--color-text-main)] flex items-center gap-2 mb-3">
                    <Link2 className="w-5 h-5 text-emerald-400" />
                    {t('settings.webhookUrlLabel')}
                  </label>

                  <div className="flex gap-2 items-center bg-black/40 p-2 rounded-xl border border-white/10">
                    <input
                      type="text"
                      readOnly
                      value={`https://finova-zzr7.onrender.com/api/sms/webhook/${smsToken}`}
                      className="flex-1 bg-transparent text-xs sm:text-sm font-mono text-[var(--color-text-main)] outline-none px-3 py-2 w-full"
                      style={{ direction: 'ltr' }}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://finova-zzr7.onrender.com/api/sms/webhook/${smsToken}`);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className={`p-3 rounded-lg transition-all duration-300 flex-shrink-0 ${copiedToken ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-white/10 text-[var(--color-text-main)] hover:bg-white/20 hover:text-emerald-400'}`}
                    >
                      {copiedToken ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <div className="mt-4 flex gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-400/90 leading-relaxed font-medium">
                      {t('settings.webhookWarning')}
                    </p>
                  </div>
                </div>

                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                  <h4 className="font-bold text-[var(--color-text-main)] mb-4 text-sm flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    {t('settings.shortcutsGuideTitle')}
                  </h4>
                  {lang === 'ar' ? (
                    <ol className="list-decimal list-inside space-y-3 text-xs sm:text-sm text-[var(--color-text-muted)] marker:text-emerald-500 marker:font-bold">
                      <li>افتح تطبيق <strong>Shortcuts</strong> في جهاز الآيفون الخاص بك.</li>
                      <li>انتقل إلى قسم <strong>Automation</strong> واضغط على <strong>+</strong> لإضافة أتمتة جديدة.</li>
                      <li>اختر <strong>Message</strong> وابحث عن اسم البنك (مثال: <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded mx-1">Banque Misr</span>). واختر <strong>Run Immediately</strong>.</li>
                      <li>اختر <strong>New Blank Automation</strong> ثم <strong>Add Action</strong>.</li>
                      <li>ابحث عن <strong>Get Contents of URL</strong> واخترها.</li>
                      <li>في حقل URL، الصق الرابط (Webhook URL) الخاص بك كاملاً.</li>
                      <li>اضغط على السهم بجانب الرابط (Show More) وغير <strong>Method</strong> إلى <strong>POST</strong>.</li>
                      <li>في قسم <strong>Headers</strong>، أضف Header جديد: الـ Key هو <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded mx-1">Content-Type</span> والـ Text هو <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded mx-1">application/json</span>.</li>
                      <li>في قسم <strong>Request Body</strong>، اختر <strong>JSON</strong>، وأضف حقل <strong>Text</strong> جديد: الـ Key هو <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded mx-1">text</span> وفي الـ Text اضغط واختر متغير <strong>Shortcut Input</strong>.</li>
                      <li>اضغط <strong>Done</strong>. الآن أي رسالة بنكية سيتم تسجيلها كمعاملة تلقائياً!</li>
                    </ol>
                  ) : (
                    <ol className="list-decimal list-inside space-y-3 text-xs sm:text-sm text-[var(--color-text-muted)] marker:text-emerald-500 marker:font-bold">
                      <li>Open the <strong>Shortcuts</strong> app on your iPhone.</li>
                      <li>Go to the <strong>Automation</strong> tab and tap <strong>+</strong> to add a new automation.</li>
                      <li>Select <strong>Message</strong> and search for your bank's sender name (e.g., <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded mx-1">Banque Misr</span>). Select <strong>Run Immediately</strong>.</li>
                      <li>Select <strong>New Blank Automation</strong> then <strong>Add Action</strong>.</li>
                      <li>Search for <strong>Get Contents of URL</strong> and select it.</li>
                      <li>In the URL field, paste your copied Webhook URL completely.</li>
                      <li>Tap the arrow next to the URL (Show More) and change the <strong>Method</strong> to <strong>POST</strong>.</li>
                      <li>In the <strong>Headers</strong> section, add a new Header: Key is <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded mx-1">Content-Type</span> and Text is <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded mx-1">application/json</span>.</li>
                      <li>In the <strong>Request Body</strong> section, choose <strong>JSON</strong>, and add a new <strong>Text</strong> field: Key is <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded mx-1">text</span> and for Text tap it and select the <strong>Shortcut Input</strong> variable.</li>
                      <li>Tap <strong>Done</strong>. Now any bank SMS will be logged automatically to your account!</li>
                    </ol>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center p-12 bg-white/5 rounded-2xl border border-white/5">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === 'accounts' && (
        <section className="glass-panel p-6 rounded-[2rem]">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-400">
            <Wallet className="w-5 h-5" /> {t('settings.accountsTitle', 'الحسابات')}
          </h3>

          <ul className="divide-y divide-white/5 mb-5">
            {accounts.filter(a => !a.isArchived).map((acc) => {
              const AccIcon = getIconComponent(acc.icon, 'Wallet');
              return (
                <li key={acc._id} className="py-4 flex items-center justify-between gap-3">
                  <div className="bg-blue-500/20 p-2 rounded-xl text-blue-400">
                    <AccIcon size={20} />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-[var(--color-text-main)] font-medium text-lg">{acc.name}</span>
                    <span className="text-xs text-[var(--color-text-muted)] capitalize">{acc.type === 'cash' ? t('settings.cash', 'كاش') : acc.type === 'bank' ? t('settings.bank', 'بنك') : t('settings.wallet', 'محفظة')}</span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <span className="font-bold text-blue-400 text-lg">{getAccountBalance(acc).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                      <span className="text-xs text-blue-400/70">{t('settings.egp', 'ج.م')}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (acc.isDefault) return;
                          try {
                            await updateAccount(acc._id, { isDefault: true });
                            fetchData();
                          } catch (e) {
                            showToast(t('settings.updateError', 'حدث خطأ'), 'error');
                          }
                        }}
                        className={`p-2 transition rounded-xl border ${acc.isDefault ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : 'bg-white/5 border-white/10 hover:bg-white/10 text-[var(--color-text-muted)] hover:text-yellow-500'}`}
                        title={t('settings.setAsDefault', 'تعيين كافتراضي')}
                      >
                        <Star size={16} fill={acc.isDefault ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={() => openEditModal(acc, 'account')}
                        className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 transition rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
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
              )
            })}
          </ul>

          <button
            onClick={() => setAddAccountModalOpen(true)}
            className="bg-blue-500/10 border border-blue-500/20 w-full py-3 flex items-center justify-center rounded-xl text-blue-400 hover:bg-blue-500/20 transition-colors gap-2 mt-6"
          >
            <Plus className="w-5 h-5" /> {t('settings.addAccountBtn', 'إضافة حساب جديد')}
          </button>
        </section>
      )}

      {activeView === 'categories' && (
        <section className="glass-panel p-6 rounded-[2rem] mb-24 mt-2">
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-[var(--color-text-main)]">
            <Tag className="w-6 h-6 text-emerald-400" /> {t('settings.categoriesTitle', 'الفئات')}
          </h3>

          <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 mb-6 relative">
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white/10 rounded-xl transition-all duration-300 ease-out shadow-sm ${categoryTab === 'expense' ? 'left-1.5' : 'left-[calc(50%+4px)]'}`}
            />
            <button
              onClick={() => setCategoryTab('expense')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all relative z-10 ${categoryTab === 'expense' ? 'text-red-400' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
              <TrendingDown size={18} className={categoryTab === 'expense' ? 'opacity-100' : 'opacity-50'} />
              {t('settings.expense', 'مصروف')}
            </button>
            <button
              onClick={() => setCategoryTab('income')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all relative z-10 ${categoryTab === 'income' ? 'text-emerald-400' : 'text-[var(--color-text-muted)] hover:text-white'}`}
            >
              <TrendingUp size={18} className={categoryTab === 'income' ? 'opacity-100' : 'opacity-50'} />
              {t('settings.income', 'دخل')}
            </button>
          </div>

          <ul className="divide-y divide-white/5 mb-5">
            {categories.filter(cat => cat.type === categoryTab).map((cat) => {
              const CatIcon = getIconComponent(cat.icon, 'Tag');
              const colorClass = cat.type === 'expense' ? 'text-red-400' : 'text-emerald-400';
              const bgClass = cat.type === 'expense' ? 'bg-red-500/10' : 'bg-emerald-500/10';
              return (
                <li key={cat._id} className="py-4 flex items-center justify-between gap-3 group">
                  <div className={`${bgClass} p-3 rounded-2xl ${colorClass} transition-transform group-hover:scale-110`}>
                    <CatIcon size={22} />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-[var(--color-text-main)] font-bold text-base">{cat.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(cat, 'category')}
                      className="p-2.5 bg-white/5 border border-white/10 hover:bg-white/10 transition rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-2.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition rounded-xl text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              )
            })}
            
            {categories.filter(cat => cat.type === categoryTab).length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
                <Tag size={40} className="mb-4 text-[var(--color-text-muted)]" />
                <span className="text-[var(--color-text-main)] font-medium">لا توجد فئات مضافة هنا</span>
              </div>
            )}
          </ul>

          <button
            onClick={() => setAddCategoryModalOpen(true)}
            className="bg-emerald-500/10 border border-emerald-500/20 w-full py-3 flex items-center justify-center rounded-xl text-emerald-400 hover:bg-emerald-500/20 transition-colors gap-2 mt-6"
          >
            <Plus className="w-5 h-5" /> {t('settings.addCategoryBtn', 'إضافة فئة جديدة')}
          </button>
        </section>
      )}

      {activeView === 'recurring' && (
        <div className="space-y-4 mb-24 mt-2">
          {recurringTransactions.map((rt) => (
            <div key={rt._id} className="glass-panel p-5 rounded-[2rem] border border-white/5 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-1 flex items-center gap-2">
                    {rt.title || 'معاملة بدون عنوان'}
                    {rt.reminderEnabled && <Bell size={14} className="text-yellow-400" />}
                  </h3>
                  <div className="text-2xl font-black text-brand-blue tracking-tight">
                    {new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(rt.amount)}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => handleToggleRecurring(rt._id)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${rt.isActive ? 'bg-brand-blue' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${rt.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => setEditingRecurring(rt)}
                      className="p-2 text-[var(--color-text-muted)] hover:text-brand-blue transition bg-white/5 rounded-xl hover:bg-brand-blue/10"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteRecurring(rt)}
                      className="p-2 text-[var(--color-text-muted)] hover:text-brand-red transition bg-white/5 rounded-xl hover:bg-brand-red/10"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <Star size={14} className="text-orange-400" />
                  <span>{t(`recurring.${rt.repeatType}`, rt.repeatType)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
                  <span dir="ltr">{new Date(rt.nextExecutionDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')} {rt.executionTime && `- ${rt.executionTime}`}</span>
                </div>
              </div>
            </div>
          ))}
          {recurringTransactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-[var(--color-text-muted)] space-y-5 flex-1">
              <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-2 shadow-inner border border-white/5">
                <Star size={40} className="text-[var(--color-text-muted)]" />
              </div>
              <p className="text-xl font-bold text-[var(--color-text-main)] text-center">{t('recurring.noRecurring', 'لا توجد معاملات متكررة')}</p>
            </div>
          )}
        </div>
      )}

      {activeView === 'data' && (
        <div className="space-y-6">
          <section className="glass-panel p-6 rounded-[2rem]">
            <h3 className="text-lg font-semibold mb-1 text-[var(--color-text-main)]">{t('settings.dataManagement', 'إدارة البيانات')}</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">{t('settings.dataDesc', 'الاستيراد ينشئ الحسابات والفئات الناقصة تلقائيًا ويحفظ كل معاملة في حسابها الصحيح.')}</p>

            <div className="flex gap-3">
              <button onClick={handleExport} className="flex-1 flex flex-col items-center justify-center gap-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-4 rounded-2xl hover:bg-blue-500/30 transition-colors">
                <Download className="w-6 h-6" />
                <span className="text-sm">{t('settings.exportBtn', 'تصدير')}</span>
              </button>

              <input type="file" accept=".json,.csv" ref={fileInputRef} onChange={handleImportFile} className="hidden" />

              <button onClick={handleImportClick} disabled={isImporting} className="flex-1 flex flex-col items-center justify-center gap-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 py-4 rounded-2xl hover:bg-purple-500/30 transition-colors disabled:opacity-50">
                <Upload className="w-6 h-6" />
                <span className="text-sm">{t('settings.importBtn', 'استيراد')}</span>
              </button>
            </div>
            {dataStatus && <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-[var(--color-text-main)]">{dataStatus}</p>}
          </section>

          <section className="glass-panel border-brand-red/30 p-6 rounded-[2rem] bg-brand-red/5">
            <h3 className="text-lg font-semibold mb-1 text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> {t('settings.dangerZone', 'منطقة الخطر')}
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">{t('settings.wipeWarning', 'حذف جميع البيانات نهائياً بما في ذلك المعاملات والحسابات والفئات والاستثمارات والمستحقات. لا يمكن التراجع عن هذا الإجراء.')}</p>
            <button
              onClick={() => setWipeModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 py-4 rounded-2xl hover:bg-red-500/30 transition-colors font-semibold"
            >
              <Trash2 className="w-5 h-5" />
              {t('settings.wipeBtn', 'مسح جميع البيانات')}
            </button>
          </section>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#121214] border border-white/10 rounded-3xl p-5 w-full max-w-sm flex flex-col gap-3 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xl font-bold text-[var(--color-text-main)]">
                {editType === 'account' ? t('settings.editAccount', 'تعديل الحساب') : t('settings.editCategory', 'تعديل الفئة')}
              </h3>
              <button onClick={closeEditModal} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={submitEdit} className="flex flex-col gap-3">
              {editType === 'account' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">{t('settings.nameLabel', 'الاسم')}</label>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50" required />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">{t('settings.balanceLabel', 'الرصيد')}</label>
                      <input type="number" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">{t('settings.cardLast4', 'أخر 4 أرقام (اختياري)')}</label>
                      <input type="text" maxLength="4" pattern="\d{4}" value={editCardLast4} onChange={(e) => setEditCardLast4(e.target.value)} placeholder="1234" className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50" />
                    </div>
                    <div className="flex items-end pb-0.5">
                      <label className="flex items-center w-full justify-between gap-2 p-2.5 bg-black/20 border border-white/5 rounded-xl cursor-pointer hover:bg-black/40 transition-colors">
                        <span className="text-xs font-medium text-[var(--color-text-main)]">{t('settings.excludeFromTotal', 'استبعاد من الإجمالي')}</span>
                        <input type="checkbox" checked={editExcludeFromTotal} onChange={(e) => setEditExcludeFromTotal(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-black/50" />
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">{t('settings.nameLabel', 'الاسم')}</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50" required />
                </div>
              )}



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
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : t('settings.saveChanges', 'حفظ التعديلات')}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        open={wipeModalOpen}
        title={t('settings.wipeBtn', 'مسح جميع البيانات')}
        message={t('settings.wipeConfirmMsg', 'هل أنت متأكد من حذف جميع بياناتك؟ سيتم حذف كل المعاملات والحسابات والفئات والاستثمارات والمستحقات نهائياً. لا يمكن التراجع عن هذا الإجراء!')}
        confirmText={isWiping ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.wipeAllBtn', 'مسح الكل')}
        cancelText={t('settings.cancelBtn', 'إلغاء')}
        confirmColor="red"
        onConfirm={handleWipeData}
        onCancel={() => { if (!isWiping) setWipeModalOpen(false); }}
      />

      <ConfirmModal
        open={deleteModalOpen}
        title={deleteType === "account" ? t('settings.deleteAccountTitle', 'حذف الحساب') : t('settings.deleteCategoryTitle', 'حذف الفئة')}
        message={
          deleteType === "account"
            ? `${t('settings.deleteAccountConfirm', 'هل تريد حذف الحساب')} "${selectedAccount?.name}" ؟`
            : `${t('settings.deleteCategoryConfirm', 'هل تريد حذف الفئة')} "${selectedCategory?.name}" ؟`
        }
        confirmText={isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.deleteBtn', 'حذف')}
        cancelText={t('settings.cancelBtn', 'إلغاء')}
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

      {addAccountModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] border border-white/10 rounded-3xl p-5 w-full max-w-sm flex flex-col max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-bold text-[var(--color-text-main)]">
                {t('settings.addAccountBtn', 'إضافة حساب جديد')}
              </h3>
              <button onClick={() => setAddAccountModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">{t('settings.nameLabel', 'الاسم')}</label>
                  <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50" required />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">{t('settings.accountType', 'نوع الحساب')}</label>
                  <select value={newAccountType} onChange={(e) => setNewAccountType(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50 appearance-none">
                    <option value="cash" className="bg-[var(--color-surface)]">{t('settings.cash', 'كاش')}</option>
                    <option value="bank" className="bg-[var(--color-surface)]">{t('settings.bank', 'بنك')}</option>
                    <option value="wallet" className="bg-[var(--color-surface)]">{t('settings.wallet', 'محفظة')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">{t('settings.balanceLabel', 'الرصيد')}</label>
                  <input type="number" value={newAccountBalance} onChange={(e) => setNewAccountBalance(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50" required />
                </div>
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">{t('settings.cardLast4', 'أخر 4 أرقام (اختياري)')}</label>
                  <input type="text" maxLength="4" pattern="\d{4}" value={newAccountCardLast4} onChange={(e) => setNewAccountCardLast4(e.target.value)} placeholder="1234" className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>

              <label className="flex items-center justify-between p-2.5 bg-black/20 border border-white/5 rounded-xl cursor-pointer hover:bg-black/40 transition-colors">
                <span className="text-xs font-medium text-[var(--color-text-main)]">{t('settings.excludeFromTotal', 'استبعاد من إجمالي الرصيد')}</span>
                <input type="checkbox" checked={newAccountExcludeFromTotal} onChange={(e) => setNewAccountExcludeFromTotal(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-black/50" />
              </label>

              <IconPicker selectedIcon={newAccountIcon} onSelect={setNewAccountIcon} colorClass="text-blue-400" />

              <button type="submit" className="bg-blue-500 w-full py-3 flex items-center justify-center rounded-xl text-white font-bold hover:bg-blue-600 transition-colors gap-2 mt-2">
                <Plus className="w-5 h-5" /> {t('settings.addAccountBtn', 'إضافة حساب جديد')}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {addCategoryModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-24 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] border border-white/10 rounded-3xl p-5 w-full max-w-sm flex flex-col max-h-[80vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-[var(--color-text-main)]">
                {t('settings.addCategoryBtn', 'إضافة فئة جديدة')}
              </h3>
              <button onClick={() => setAddCategoryModalOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-2">{t('settings.nameLabel', 'الاسم')}</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={t('settings.categoryNamePlaceholder', 'اسم الفئة (مثال: طعام، فواتير)')}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-emerald-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-[var(--color-text-muted)] mb-2">{t('settings.categoryType', 'نوع الفئة')}</label>
                <select
                  value={newCategoryType}
                  onChange={(e) => setNewCategoryType(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl py-3 px-4 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-emerald-500/50 appearance-none"
                >
                  <option value="expense" className="bg-[var(--color-surface)]">{t('settings.expense', 'مصروف')}</option>
                  <option value="income" className="bg-[var(--color-surface)]">{t('settings.income', 'دخل')}</option>
                </select>
              </div>

              <IconPicker
                selectedIcon={newCategoryIcon}
                onSelect={setNewCategoryIcon}
                colorClass={newCategoryType === 'expense' ? 'text-red-400' : 'text-emerald-400'}
              />

              <button type="submit" className="bg-emerald-500 w-full py-3 flex items-center justify-center rounded-xl text-white font-bold hover:bg-emerald-600 transition-colors gap-2 mt-2">
                <Plus className="w-5 h-5" /> {t('settings.addCategoryBtn', 'إضافة فئة جديدة')}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* Recurring Edit Modal */}
      <EditRecurringTransactionModal
        transaction={editingRecurring}
        open={!!editingRecurring}
        onClose={() => setEditingRecurring(null)}
        onSuccess={(updatedTx) => {
          setEditingRecurring(null);
          setRecurringTransactions(prev => prev.map(rt => rt._id === updatedTx._id ? updatedTx : rt));
          showToast(t('settings.recurringUpdated', 'تم تحديث المعاملة بنجاح'), 'success');
        }}
      />
    </div>
  );
};

export default Settings;
