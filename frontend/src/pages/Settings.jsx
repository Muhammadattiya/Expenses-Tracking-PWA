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
  Smartphone,
  Repeat,
  Command
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

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

import { getCurrentUser, deleteAllUserData, updatePreferences } from "../api/auth";
import { getDebts } from "../api/debts";
import { getReceivables } from "../api/receivables";
import { getIncomeProfiles, createIncomeProfile, updateIncomeProfile, deleteIncomeProfile } from "../api/incomeProfiles";
import { getShortcutTokenStatus, generateShortcutToken, revokeShortcutToken } from "../api/integrations";
import api from "../api/axios";

import ConfirmModal from "../components/modals/ConfirmModal";
import IncomeProfileModal from "../components/modals/IncomeProfileModal";
import IconPicker, { getIconComponent } from "../components/IconPicker";
import { useNotification } from "../contexts/NotificationContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { Settings as SettingsIcon } from "lucide-react";
import EditRecurringTransactionModal from "../components/modals/EditRecurringTransactionModal";

const CopyableURL = ({ url }) => {
  const { showToast } = useNotification();
  return (
    <div className="mt-2 flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-3 shadow-inner">
      <code className="text-xs text-blue-400 break-all select-all font-mono">{url}</code>
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          navigator.clipboard.writeText(url);
          showToast('URL Copied', 'success');
        }}
        className="shrink-0 p-2 ml-3 bg-white/5 hover:bg-white/10 text-white/70 rounded-md transition-colors"
      >
        <Copy size={16} />
      </motion.button>
    </div>
  );
};

const Settings = () => {
  const { showToast } = useNotification();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [allDebtTransactions, setAllDebtTransactions] = useState([]);
  const [allReceivables, setAllReceivables] = useState([]);
  const [incomeProfiles, setIncomeProfiles] = useState([]);
  const navigate = useNavigate();
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('main'); // main, notifications, accounts, categories, data, recurring
  const fileInputRef = useRef(null);

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');
  const [newAccountIcon, setNewAccountIcon] = useState('Wallet');
  const [newAccountColor, setNewAccountColor] = useState('#3b82f6');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('expense');
  const [newCategoryIcon, setNewCategoryIcon] = useState('Tag');
  const [newCategoryColor, setNewCategoryColor] = useState('#ef4444');

  const base = api.defaults.baseURL || '';
  const apiUrl = base.startsWith('http') ? base : `${window.location.origin}${base}`;
  const [addCategoryModalOpen, setAddCategoryModalOpen] = useState(false);
  const [categoryTab, setCategoryTab] = useState('expense');

  const [addAccountModalOpen, setAddAccountModalOpen] = useState(false);
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountCardLast4, setNewAccountCardLast4] = useState('');
  const [newAccountExcludeFromTotal, setNewAccountExcludeFromTotal] = useState(false);
  const [newAccountIsSavingsAccount, setNewAccountIsSavingsAccount] = useState(false);

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
  const [editColor, setEditColor] = useState('#3b82f6');
  const [editCardLast4, setEditCardLast4] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editExcludeFromTotal, setEditExcludeFromTotal] = useState(false);
  const [editIsSavingsAccount, setEditIsSavingsAccount] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Push Notifications State
  const [pushStatus, setPushStatus] = useState('');

  // Income Profiles State
  const [addIncomeProfileModalOpen, setAddIncomeProfileModalOpen] = useState(false);
  const [editIncomeProfileModalOpen, setEditIncomeProfileModalOpen] = useState(false);
  const [editingIncomeProfile, setEditingIncomeProfile] = useState(null);
  const [newIncomeProfile, setNewIncomeProfile] = useState({
    name: '',
    amount: '',
    frequency: 'monthly',
    weekDay: 0,
    monthDay: 1,
    account: '',
    isActive: true
  });

  // SMS Webhook State
  const [smsToken, setSmsToken] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Budget Preferences State
  const [budgetPeriod, setBudgetPeriod] = useState('monthly');
  const [budgetStartDayWeekly, setBudgetStartDayWeekly] = useState(6);
  const [budgetStartDayMonthly, setBudgetStartDayMonthly] = useState(1);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);

  // Apple Shortcuts State
  const [shortcutConnected, setShortcutConnected] = useState(false);
  const [shortcutToken, setShortcutToken] = useState(null);

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
      const [accs, cats, trans, recurringData, debtsData, incomeProfilesData, receivablesData] = await Promise.all([
        getAccounts(),
        getCategories(),
        getTransactions(),
        getRecurringTransactions(),
        getDebts().catch(() => ({ debts: [], transactions: [] })),
        getIncomeProfiles().catch(() => []),
        getReceivables().catch(() => [])
      ]);
      setAccounts(accs);
      setCategories(cats);
      setTransactions(trans);
      setRecurringTransactions(recurringData);
      setAllDebtTransactions(debtsData.transactions || []);
      setIncomeProfiles(incomeProfilesData);
      setAllReceivables(receivablesData || []);

      // Fetch user data
      const user = await getCurrentUser();
      setSmsToken(user.smsWebhookToken || null);
      
      try {
        const tokenStatus = await getShortcutTokenStatus();
        setShortcutConnected(tokenStatus.isConnected);
      } catch (e) {
        console.error('Failed to get shortcut token status', e);
      }

      if (user.preferences) {
        setBudgetPeriod(user.preferences.budgetPeriod || 'monthly');
        setBudgetStartDayWeekly(user.preferences.budgetStartDayWeekly ?? 6);
        setBudgetStartDayMonthly(user.preferences.budgetStartDayMonthly ?? 1);
      }
    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePreferences = async (updates) => {
    try {
      setIsUpdatingPreferences(true);
      await updatePreferences(updates);
      showToast(t('settings.preferencesSaved', 'Preferences saved successfully!'), 'success');
    } catch (error) {
      console.error("❌ Error updating preferences:", error);
      showToast(t('settings.preferencesError', 'Error saving preferences'), 'error');
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

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

    allDebtTransactions.forEach(dt => {
      if ((dt.account?._id || dt.account) === account._id) {
        if (dt.type === 'loan') {
          if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') balance += dt.amount; // Borrowed money -> got money
          else balance -= dt.amount; // Lent money -> lost money
        } else if (dt.type === 'repayment') {
          if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') balance -= dt.amount; // Repaid money -> lost money
          else balance += dt.amount; // Got paid back -> got money
        }
      }
    });

    allReceivables.forEach(r => {
      if ((r.paidFrom?._id || r.paidFrom) === account._id) balance -= r.paidAmount;
      if ((r.receivedTo?._id || r.receivedTo) === account._id) balance += r.receivedAmount;
      if (r.participants) {
        r.participants.forEach(p => {
          if (p.payments) {
            p.payments.forEach(pay => {
              if ((pay.account?._id || pay.account) === account._id) balance += pay.amount;
            });
          }
        });
      }
    });
    
    return balance;
  };



  const handleDeleteIncomeProfile = (profile) => {
    setSelectedCategory(profile); // Reuse selectedCategory state for generic items
    setDeleteType("incomeProfile");
    setDeleteModalOpen(true);
  };

  const handleAddIncomeProfile = async (data) => {
    try {
      if (!data.name || !data.amount || !data.account) {
        showToast(t('common.error', 'Please fill all required fields'), 'error');
        return;
      }
      await createIncomeProfile({
        name: data.name,
        amount: Number(data.amount),
        frequency: data.frequency,
        weekDay: Number(data.weekDay),
        monthDay: Number(data.monthDay),
        account: data.account,
        category: data.category,
        isActive: data.isActive
      });
      setAddIncomeProfileModalOpen(false);
      setNewIncomeProfile({
        name: '', amount: '', frequency: 'monthly', weekDay: 0, monthDay: 1, account: '', category: '', isActive: true
      });
      fetchData();
      showToast(t('common.success', 'Saved successfully'), 'success');
    } catch (error) {
      showToast(error.response?.data?.message || t('common.error', 'Error saving'), 'error');
    }
  };

  const handleUpdateIncomeProfile = async (data) => {
    try {
      if (!data.name || !data.amount || !data.account) {
        showToast(t('common.error', 'Please fill all required fields'), 'error');
        return;
      }
      await updateIncomeProfile(data._id, {
        name: data.name,
        amount: Number(data.amount),
        frequency: data.frequency,
        weekDay: Number(data.weekDay),
        monthDay: Number(data.monthDay),
        account: data.account,
        category: data.category,
        isActive: data.isActive
      });
      setEditIncomeProfileModalOpen(false);
      setEditingIncomeProfile(null);
      fetchData();
      showToast(t('common.success', 'Saved successfully'), 'success');
    } catch (error) {
      showToast(error.response?.data?.message || t('common.error', 'Error saving'), 'error');
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
        color: newAccountColor,
        balance_adjustment: Number(newAccountBalance) || 0,
        cardLast4: newAccountCardLast4,
        excludeFromTotal: newAccountExcludeFromTotal,
        isSavingsAccount: newAccountIsSavingsAccount
      });
      setNewAccountName("");
      setNewAccountBalance("");
      setNewAccountIcon("Wallet");
      setNewAccountColor("#3b82f6");
      setNewAccountCardLast4("");
      setNewAccountExcludeFromTotal(false);
      setNewAccountIsSavingsAccount(false);
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
    setEditColor(item.color || '#3b82f6');
    if (type === 'account') {
      setEditCardLast4(item.cardLast4 || '');
      setEditBalance(getAccountBalance(item));
      setEditExcludeFromTotal(item.excludeFromTotal || false);
      setEditIsSavingsAccount(item.isSavingsAccount || false);
    }
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingItem(null);
    setEditName('');
    setEditIcon('');
    setEditColor('#3b82f6');
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
        await updateAccount(editingItem._id, { name: editName, icon: editIcon, color: editColor, type: editingItem.type, cardLast4: editCardLast4, balance_adjustment: newAdjustment, excludeFromTotal: editExcludeFromTotal, isSavingsAccount: editIsSavingsAccount });
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
      } else if (deleteType === "incomeProfile") {
        await deleteIncomeProfile(selectedCategory._id);
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="p-4 pt-8 pb-24 space-y-6 relative"
    >
      {/* Background Liquid Orbs */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/20 rounded-full mix-blend-screen filter blur-[60px] opacity-70 animate-pulse pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-72 h-72 bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[80px] opacity-50 pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-screen filter blur-[100px] opacity-40 pointer-events-none" />

      <h2 className="text-4xl font-bold text-center tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-sm flex items-center justify-center gap-3 relative z-10">
        <AnimatePresence>
          {activeView !== 'main' && (
            <motion.button 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={() => setActiveView('main')} 
              className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>
        <span>
          {activeView === 'main' && t('nav.settings')}
          {activeView === 'appSettings' && t('settings.appSettings')}
          {activeView === 'notifications' && t('settings.pushNotifications')}
          {activeView === 'accounts' && t('settings.accountManagement')}
          {activeView === 'categories' && t('settings.categoryManagement')}
          {activeView === 'data' && t('settings.dataManagement')}
          {activeView === 'recurring' && t('settings.recurringTransactions')}
          {activeView === 'incomeProfiles' && t('incomeProfiles.title', 'Income Profiles')}
          {activeView === 'sms' && t('settings.smsIntegration')}
          {activeView === 'appleShortcuts' && t('appleShortcuts.title')}
        </span>
        {activeView !== 'main' && <div className="w-10"></div>}
      </h2>

      <AnimatePresence mode="wait">
      {activeView === 'main' && (
        <motion.section 
          key="main"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative z-10 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 rounded-[2.5rem] divide-y divide-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {[
            { id: 'appSettings', icon: <SettingsIcon size={20} />, label: t('settings.appSettings'), color: 'text-orange-400', bg: 'bg-orange-500/20', borderColor: 'border-orange-500/30' },
            { id: 'notifications', icon: <Bell size={20} />, label: t('settings.pushNotifications'), color: 'text-brand-blue', bg: 'bg-brand-blue/20', borderColor: 'border-brand-blue/30' },
            { id: 'sms', icon: <MessageSquare size={20} />, label: t('settings.smsIntegration'), color: 'text-emerald-400', bg: 'bg-emerald-500/20', borderColor: 'border-emerald-500/30' },
            { id: 'appleShortcuts', icon: <Command size={20} />, label: t('appleShortcuts.title'), color: 'text-purple-400', bg: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
            { id: 'accounts', icon: <Wallet size={20} />, label: t('settings.accountManagement'), color: 'text-brand-blue', bg: 'bg-brand-blue/20', borderColor: 'border-brand-blue/30' },
            { id: 'categories', icon: <Tag size={20} />, label: t('settings.categoryManagement'), color: 'text-brand-green', bg: 'bg-brand-green/20', borderColor: 'border-brand-green/30' },
            { id: 'recurring', icon: <Repeat size={20} />, label: t('settings.recurringTransactions', 'المعاملات المتكررة'), color: 'text-orange-400', bg: 'bg-orange-500/20', borderColor: 'border-orange-500/30' },
            { id: 'incomeProfiles', icon: <Banknote size={20} />, label: t('incomeProfiles.title', 'Income Profiles'), color: 'text-emerald-400', bg: 'bg-emerald-500/20', borderColor: 'border-emerald-500/30' },
            { id: 'data', icon: <Database size={20} />, label: t('settings.dataManagement'), color: 'text-purple-400', bg: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
          ].map((item) => (
            <motion.button 
              key={item.id}
              whileTap={{ scale: 0.98, backgroundColor: "rgba(255,255,255,0.1)" }}
              onClick={() => setActiveView(item.id)} 
              className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors group relative"
            >
              <div className="absolute inset-y-0 left-0 w-1 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-4">
                <div className={`${item.bg} p-2.5 rounded-2xl ${item.color} border ${item.borderColor} shadow-inner`}>
                  {item.icon}
                </div>
                <span className="text-lg font-medium text-white/90 tracking-wide drop-shadow-sm">{item.label}</span>
              </div>
              <ChevronRight className={`text-white/40 group-hover:text-white/80 w-5 h-5 transition-colors ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </motion.button>
          ))}
        </motion.section>
      )}

      {activeView === 'appSettings' && (
        <motion.section 
          key="appSettings"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative z-10 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem] p-6"
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-white/90 font-medium text-lg ml-1">{t('settings.language')}</span>
              <div className="flex bg-black/30 backdrop-blur-xl rounded-2xl p-1.5 border border-white/5 shadow-inner relative">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLang('ar')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors relative z-10 ${lang === 'ar' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                >
                  {lang === 'ar' && <motion.div layoutId="langIndicator" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                  {t('settings.arabic', 'العربية')}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLang('en')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors relative z-10 ${lang === 'en' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                >
                  {lang === 'en' && <motion.div layoutId="langIndicator" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                  {t('settings.english', 'English')}
                </motion.button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-white/90 font-medium text-lg ml-1">{t('settings.theme')}</span>
              <div className="flex bg-black/30 backdrop-blur-xl rounded-2xl p-1.5 border border-white/5 shadow-inner relative">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleTheme('dark')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors relative z-10 ${theme === 'dark' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                >
                  {theme === 'dark' && <motion.div layoutId="themeIndicator" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                  {t('settings.dark', 'Dark')}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleTheme('light')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors relative z-10 ${theme === 'light' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                >
                  {theme === 'light' && <motion.div layoutId="themeIndicator" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                  {t('settings.light', 'Light')}
                </motion.button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-6 mt-6 border-t border-white/10">
            <span className="text-white/90 font-medium text-lg ml-1">{t('settings.budgetPreferences', 'إعدادات الميزانية')}</span>
            
            <label className="text-sm text-white/50 ml-1">{t('settings.defaultBudgetPeriod', 'الفترة الافتراضية للميزانية')}</label>
            <div className="flex bg-black/30 backdrop-blur-xl rounded-2xl p-1.5 border border-white/5 shadow-inner relative mb-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setBudgetPeriod('monthly')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors relative z-10 ${budgetPeriod === 'monthly' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                {budgetPeriod === 'monthly' && <motion.div layoutId="budgetIndicator" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                {t('budgets.monthly', 'Monthly')}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setBudgetPeriod('weekly')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors relative z-10 ${budgetPeriod === 'weekly' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                {budgetPeriod === 'weekly' && <motion.div layoutId="budgetIndicator" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                {t('budgets.weekly', 'Weekly')}
              </motion.button>
            </div>

            {budgetPeriod === 'weekly' ? (
              <>
                <label className="text-sm text-white/50 ml-1 mt-2">{t('settings.weekStartDay', 'بداية الأسبوع')}</label>
                <select
                  value={budgetStartDayWeekly}
                  onChange={(e) => setBudgetStartDayWeekly(Number(e.target.value))}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3.5 text-white/90 focus:outline-none focus:border-brand-blue/50 shadow-inner"
                >
                  <option value={6} className="bg-[#12121a]">{t('days.saturday', 'السبت')}</option>
                  <option value={0} className="bg-[#12121a]">{t('days.sunday', 'الأحد')}</option>
                  <option value={1} className="bg-[#12121a]">{t('days.monday', 'الإثنين')}</option>
                  <option value={2} className="bg-[#12121a]">{t('days.tuesday', 'الثلاثاء')}</option>
                  <option value={3} className="bg-[#12121a]">{t('days.wednesday', 'الأربعاء')}</option>
                  <option value={4} className="bg-[#12121a]">{t('days.thursday', 'الخميس')}</option>
                  <option value={5} className="bg-[#12121a]">{t('days.friday', 'الجمعة')}</option>
                </select>
              </>
            ) : (
              <>
                <label className="text-sm text-white/50 ml-1 mt-2">{t('settings.monthStartDate', 'تاريخ بداية الشهر')}</label>
                <select
                  value={budgetStartDayMonthly}
                  onChange={(e) => setBudgetStartDayMonthly(Number(e.target.value))}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3.5 text-white/90 focus:outline-none focus:border-brand-blue/50 shadow-inner"
                >
                  {[...Array(31)].map((_, i) => (
                    <option key={i + 1} value={i + 1} className="bg-[#12121a]">
                      {i + 1}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-white/40 ml-1">{t('settings.monthStartNotice', 'إذا كان الشهر لا يحتوي على هذا اليوم، سيتم استخدام اليوم الأخير من الشهر.')}</p>
              </>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSavePreferences({
                budgetPeriod,
                budgetStartDayWeekly,
                budgetStartDayMonthly
              })}
              disabled={isUpdatingPreferences}
              className="w-full mt-6 bg-brand-blue/20 border border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white rounded-2xl py-4 font-bold shadow-[0_4px_12px_rgba(59,130,246,0.2)] transition-colors disabled:opacity-50"
            >
              {isUpdatingPreferences ? <Loader2 className="w-5 h-5 animate-spin" /> : t('settings.savePreferences', 'حفظ الإعدادات')}
            </motion.button>
          </div>
        </motion.section>
      )}

      {activeView === 'incomeProfiles' && (
        <motion.section 
          key="incomeProfiles"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative z-10 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem] mb-24 mt-2"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white/90">{t('incomeProfiles.title', 'Income Profiles')}</h2>
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setAddIncomeProfileModalOpen(true)}
              className="bg-brand-blue hover:bg-brand-blue/90 text-white p-2 rounded-xl transition-colors shadow-inner"
            >
              <Plus size={24} />
            </motion.button>
          </div>

          <div className="flex flex-col gap-3">
            {incomeProfiles.length === 0 ? (
              <div className="text-center py-10 text-white/40">
                <Banknote size={48} className="mx-auto mb-3 opacity-20" />
                <p>{t('incomeProfiles.noProfiles', 'No active income profiles')}</p>
              </div>
            ) : (
              incomeProfiles.map(profile => (
                <div key={profile._id} className="group relative bg-black/30 backdrop-blur-xl p-5 md:p-6 rounded-3xl border border-white/5 hover:border-brand-blue/30 transition-all duration-300 overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  
                  <div className="relative z-10 flex w-full md:w-auto flex-col sm:flex-row items-start sm:items-center gap-5">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className={`p-4 rounded-2xl shrink-0 ${profile.isActive ? 'bg-brand-blue/20 text-brand-blue shadow-[0_0_20px_rgba(59,130,246,0.3)] border border-brand-blue/30' : 'bg-white/5 text-white/40 border border-white/10'}`}>
                        <Banknote size={28} className={profile.isActive ? '' : 'grayscale'} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white/90 flex items-center gap-2">
                          {profile.name}
                          {!profile.isActive && (
                            <span className="text-[10px] uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded-md text-white/50 border border-white/10">
                              {t('incomeProfiles.inactive', 'Inactive')}
                            </span>
                          )}
                        </h3>
                        <p className="text-2xl font-black tabular-nums text-emerald-400 mt-1 tracking-tight">
                          {Number(profile.amount).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('nav.currency')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-white/5 sm:border-t-0">
                      <div className="bg-black/40 px-3 py-2 rounded-xl flex items-center gap-2 border border-white/5 shadow-inner">
                        <Repeat size={14} className="text-brand-blue opacity-70" />
                        <span className="text-xs font-bold text-white/80">
                          {profile.frequency === 'weekly' ? t('incomeProfiles.weekly', 'Weekly') : t('incomeProfiles.monthly', 'Monthly')}
                        </span>
                      </div>
                      {profile.account && (
                        <div className="bg-black/40 px-3 py-2 rounded-xl flex items-center gap-2 border border-white/5 shadow-inner">
                          <Wallet size={14} className="text-emerald-400 opacity-70" />
                          <span className="text-xs font-bold text-white/80 truncate max-w-[100px]">
                            {profile.account.name || 'Account'}
                          </span>
                        </div>
                      )}
                      {profile.category && (
                        <div className="bg-black/40 px-3 py-2 rounded-xl flex items-center gap-2 border border-white/5 shadow-inner col-span-2">
                          <Tag size={14} className="text-amber-400 opacity-70" />
                          <span className="text-xs font-bold text-white/80">
                            {profile.category.name || 'Category'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10 flex items-center gap-2 w-full md:w-auto justify-end border-t border-white/5 md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setEditingIncomeProfile({
                          ...profile,
                          account: profile.account?._id || profile.account,
                          category: profile.category?._id || profile.category
                        });
                        setEditIncomeProfileModalOpen(true);
                      }}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 p-3 bg-brand-blue/10 border border-brand-blue/20 text-brand-blue hover:bg-brand-blue hover:text-white rounded-xl transition-colors font-bold text-sm shadow-inner"
                    >
                      <Pencil size={18} />
                      <span className="md:hidden">Edit</span>
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDeleteIncomeProfile(profile)}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-bold text-sm shadow-inner"
                    >
                      <Trash2 size={18} />
                      <span className="md:hidden">Delete</span>
                    </motion.button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.section>
      )}

      {activeView === 'notifications' && (
        <motion.section 
          key="notifications"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative z-10 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem]"
        >
          <h3 className="text-lg font-bold mb-1 text-white/90">{t('settings.pushNotifications', 'الإشعارات الفورية (Push)')}</h3>
          <p className="text-sm text-white/50 mb-6">{t('settings.pushDesc', 'احصل على تنبيهات وإشعارات حتى لو كان التطبيق مغلقاً.')}</p>

          <div className="mb-6">
            <motion.button 
              whileTap={{ scale: 0.98 }}
              onClick={handleSubscribe} 
              className="w-full flex items-center justify-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-4 rounded-2xl hover:bg-blue-500/30 transition-colors shadow-inner"
            >
              <Bell className="w-5 h-5" />
              <span className="text-sm font-bold">{t('settings.pushActivateBtn', 'تفعيل استلام الإشعارات على هذا الجهاز')}</span>
            </motion.button>
          </div>

          <AnimatePresence>
            {pushStatus && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 rounded-2xl bg-black/30 border border-white/10 p-4 text-sm font-medium text-white/80 text-center shadow-inner"
              >
                {pushStatus}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.section>
      )}

      {activeView === 'sms' && (
        <motion.section 
          key="sms"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="space-y-4 mb-24 mt-2"
        >
          <div className="relative z-10 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem] overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110 pointer-events-none" />
            
            <h3 className="text-xl font-bold mb-2 text-white/90 flex items-center gap-2">
              <MessageSquare className="text-emerald-400 w-6 h-6" />
              {t('settings.smsIntegration')}
            </h3>
            <p className="text-sm text-white/50 mb-6 leading-relaxed">{t('settings.smsDesc')}</p>

            {smsToken ? (
              <div className="flex flex-col gap-6">
                <div className="bg-black/30 p-5 rounded-3xl border border-white/10 relative shadow-inner">
                  <label className="text-sm font-bold text-white/90 flex items-center gap-2 mb-3">
                    <Link2 className="w-5 h-5 text-emerald-400" />
                    {t('settings.webhookUrlLabel')}
                  </label>

                  <div className="flex gap-2 items-center bg-black/50 p-2 rounded-2xl border border-white/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                    <input
                      type="text"
                      readOnly
                      value={`https://finova-zzr7.onrender.com/api/sms/webhook/${smsToken}`}
                      className="flex-1 bg-transparent text-xs sm:text-sm font-mono text-white/80 outline-none px-3 py-2 w-full"
                      style={{ direction: 'ltr' }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        navigator.clipboard.writeText(`https://finova-zzr7.onrender.com/api/sms/webhook/${smsToken}`);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className={`p-3 rounded-xl transition-colors flex-shrink-0 border border-transparent ${copiedToken ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-emerald-400'}`}
                    >
                      {copiedToken ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </motion.button>
                  </div>
                  
                  <div className="mt-5 flex gap-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl shadow-inner">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-orange-400/90 leading-relaxed font-medium">
                      {t('settings.webhookWarning')}
                    </p>
                  </div>
                </div>

                <div className="bg-black/20 p-5 rounded-3xl border border-white/5 shadow-inner">
                  <h4 className="font-bold text-white/90 mb-4 text-sm flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    {t('settings.shortcutsGuideTitle')}
                  </h4>
                  {lang === 'ar' ? (
                    <ol className="list-decimal list-inside space-y-3 text-xs sm:text-sm text-white/60 marker:text-emerald-500 marker:font-bold">
                      <li>افتح تطبيق <strong>Shortcuts (الاختصارات)</strong> في جهاز الآيفون الخاص بك.</li>
                      <li>انتقل إلى قسم <strong>Automation (التحكم التلقائي)</strong> من الأسفل واضغط على <strong>+</strong> لإضافة تحكم تلقائي شخصي.</li>
                      <li>اختر <strong>Message (رسالة)</strong>. في خانة المرسل (Sender) اكتب اسم البنك كما يظهر في رسائلك (مثال: <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md border border-emerald-400/20 mx-1">NBE</span> أو <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md border border-emerald-400/20 mx-1">CIB</span>).</li>
                      <li><strong>مهم جداً:</strong> بالأسفل اختر <strong>Run Immediately (تشغيل فوراً)</strong>، والغي تفعيل خيار <strong>Notify When Run (الإعلام عند التشغيل)</strong> لتعمل في الخلفية بصمت. ثم اضغط التالي (Next).</li>
                      <li>اختر <strong>New Blank Automation (تحكم تلقائي فارغ جديد)</strong> ثم <strong>Add Action (إضافة إجراء)</strong>.</li>
                      <li>ابحث عن <strong>Get Contents of URL (الحصول على محتويات عنوان URL)</strong> واخترها.</li>
                      <li>في حقل URL، الصق الرابط (Webhook URL) الخاص بك كاملاً من الأعلى.</li>
                      <li>اضغط على السهم الصغير بجانب الرابط للخيارات المتقدمة، وغير <strong>Method (الطريقة)</strong> إلى <strong>POST</strong>.</li>
                      <li>في قسم <strong>Request Body (جسم الطلب)</strong>، اختر <strong>JSON</strong>، وأضف حقل <strong>Text (نص)</strong> جديد: الـ Key هو <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md border border-emerald-400/20 mx-1">text</span> وفي الـ Text اضغط واختر متغير <strong>Shortcut Input (إدخال الاختصار)</strong>.</li>
                      <li>اضغط <strong>Done (تم)</strong>. الآن أي رسالة بنكية سيتم تسجيلها كمعاملة في Finova تلقائياً!</li>
                    </ol>
                  ) : (
                    <ol className="list-decimal list-inside space-y-3 text-xs sm:text-sm text-white/60 marker:text-emerald-500 marker:font-bold">
                      <li>Open the <strong>Shortcuts</strong> app on your iPhone.</li>
                      <li>Go to the <strong>Automation</strong> tab at the bottom and tap <strong>+</strong> to add a new Personal Automation.</li>
                      <li>Select <strong>Message</strong>. In the Sender field, type your bank's exact name as it appears in SMS (e.g., <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md border border-emerald-400/20 mx-1">NBE</span> or <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md border border-emerald-400/20 mx-1">CIB</span>).</li>
                      <li><strong>CRITICAL:</strong> At the bottom, select <strong>Run Immediately</strong>, and turn OFF <strong>Notify When Run</strong> so it works silently in the background. Tap Next.</li>
                      <li>Select <strong>New Blank Automation</strong> then <strong>Add Action</strong>.</li>
                      <li>Search for <strong>Get Contents of URL</strong> and select it.</li>
                      <li>In the URL field, paste your copied Webhook URL completely.</li>
                      <li>Tap the small arrow next to the URL (Show More) and change the <strong>Method</strong> to <strong>POST</strong>.</li>
                      <li>In the <strong>Request Body</strong> section, choose <strong>JSON</strong>, and add a new <strong>Text</strong> field: Key is <span className="font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-md border border-emerald-400/20 mx-1">text</span> and for Text tap it and select the <strong>Shortcut Input</strong> variable.</li>
                      <li>Tap <strong>Done</strong>. Now any bank SMS will be logged automatically as a Finova transaction!</li>
                    </ol>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex justify-center p-12 bg-black/20 rounded-3xl border border-white/5 shadow-inner">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            )}
          </div>
        </motion.section>
      )}

      {activeView === 'accounts' && (
        <motion.section 
          key="accounts"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative z-10 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem]"
        >
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-400 drop-shadow-sm">
            <Wallet className="w-5 h-5" /> {t('settings.accountsTitle', 'الحسابات')}
          </h3>

          <ul className="divide-y divide-white/5 mb-5 bg-black/10 rounded-2xl border border-white/5 px-2 shadow-inner">
            {accounts.filter(a => !a.isArchived).map((acc) => {
              const AccIcon = getIconComponent(acc.icon, 'Wallet');
              return (
                <li key={acc._id} className="py-4 px-2 flex items-center justify-between gap-3 group">
                  <div className="p-3 rounded-2xl shadow-inner transition-transform group-hover:scale-110" style={{ backgroundColor: `${acc.color || '#3b82f6'}20`, color: acc.color || '#3b82f6', border: `1px solid ${acc.color || '#3b82f6'}30` }}>
                    <AccIcon size={22} />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-white/90 font-bold text-base">{acc.name}</span>
                    <span className="text-xs text-white/50 capitalize">{acc.type === 'cash' ? t('settings.cash', 'كاش') : acc.type === 'bank' ? t('settings.bank', 'بنك') : t('settings.wallet', 'محفظة')}</span>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 shadow-inner">
                      <span className="font-black text-blue-400 tabular-nums tracking-tight text-lg">{getAccountBalance(acc).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                      <span className="text-xs text-blue-400/70 font-bold">{t('settings.egp', 'ج.م')}</span>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={async () => {
                          if (acc.isDefault) return;
                          try {
                            await updateAccount(acc._id, { isDefault: true });
                            fetchData();
                          } catch (e) {
                            showToast(t('settings.updateError', 'حدث خطأ'), 'error');
                          }
                        }}
                        className={`p-2 transition-colors rounded-xl border ${acc.isDefault ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 shadow-inner' : 'bg-white/5 border-transparent hover:bg-white/10 text-white/40 hover:text-yellow-500'}`}
                        title={t('settings.setAsDefault', 'تعيين كافتراضي')}
                      >
                        <Star size={16} fill={acc.isDefault ? "currentColor" : "none"} />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openEditModal(acc, 'account')}
                        className="p-2 bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 transition-colors rounded-xl text-white/40 hover:text-white"
                      >
                        <Pencil size={16} />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteAccount(acc)}
                        className="p-2 bg-red-500/5 border border-transparent hover:bg-red-500/10 hover:border-red-500/20 transition-colors rounded-xl text-red-400/60 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setAddAccountModalOpen(true)}
            className="bg-blue-500/10 border border-blue-500/20 shadow-inner w-full py-4 flex items-center justify-center rounded-2xl text-blue-400 hover:bg-blue-500/20 transition-colors gap-2 mt-6 font-bold"
          >
            <Plus className="w-5 h-5" /> {t('settings.addAccountBtn', 'إضافة حساب جديد')}
          </motion.button>
        </motion.section>
      )}

      {activeView === 'categories' && (
        <motion.section 
          key="categories"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative z-10 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem] mb-24 mt-2"
        >
          <h3 className="text-lg font-bold mb-5 flex items-center gap-2 text-white/90">
            <Tag className="w-6 h-6 text-emerald-400 drop-shadow" /> {t('settings.categoriesTitle', 'الفئات')}
          </h3>

          <div className="flex bg-black/30 backdrop-blur-xl p-1.5 rounded-2xl border border-white/5 mb-6 shadow-inner relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setCategoryTab('expense')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors relative z-10 ${categoryTab === 'expense' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              {categoryTab === 'expense' && <motion.div layoutId="catTab" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
              <TrendingDown size={18} className={categoryTab === 'expense' ? 'text-red-400' : 'opacity-50'} />
              {t('settings.expense', 'مصروف')}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setCategoryTab('income')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors relative z-10 ${categoryTab === 'income' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              {categoryTab === 'income' && <motion.div layoutId="catTab" className="absolute inset-0 bg-white/10 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
              <TrendingUp size={18} className={categoryTab === 'income' ? 'text-emerald-400' : 'opacity-50'} />
              {t('settings.income', 'دخل')}
            </motion.button>
          </div>

          <ul className="divide-y divide-white/5 mb-5 bg-black/10 rounded-2xl border border-white/5 px-2 shadow-inner">
            {categories.filter(cat => cat.type === categoryTab).map((cat) => {
              const CatIcon = getIconComponent(cat.icon, 'Tag');
              const colorClass = cat.type === 'expense' ? 'text-red-400' : 'text-emerald-400';
              const bgClass = cat.type === 'expense' ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20';
              return (
                <li key={cat._id} className="py-4 px-2 flex items-center justify-between gap-3 group">
                  <div className={`${bgClass} border p-3 rounded-2xl ${colorClass} transition-transform group-hover:scale-110 shadow-inner`}>
                    <CatIcon size={22} />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-white/90 font-bold text-base">{cat.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openEditModal(cat, 'category')}
                      className="p-2.5 bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 transition-colors rounded-xl text-white/40 hover:text-white"
                    >
                      <Pencil size={18} />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-2.5 bg-red-500/5 border border-transparent hover:bg-red-500/10 hover:border-red-500/20 transition-colors rounded-xl text-red-400/60 hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  </div>
                </li>
              )
            })}
            
            {categories.filter(cat => cat.type === categoryTab).length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center opacity-60">
                <Tag size={40} className="mb-4 text-white/30" />
                <span className="text-white/60 font-medium">لا توجد فئات مضافة هنا</span>
              </div>
            )}
          </ul>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setAddCategoryModalOpen(true)}
            className="bg-emerald-500/10 border border-emerald-500/20 shadow-inner w-full py-4 flex items-center justify-center rounded-2xl text-emerald-400 hover:bg-emerald-500/20 transition-colors gap-2 mt-6 font-bold"
          >
            <Plus className="w-5 h-5" /> {t('settings.addCategoryBtn', 'إضافة فئة جديدة')}
          </motion.button>
        </motion.section>
      )}

      {activeView === 'recurring' && (
        <motion.section 
          key="recurring"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="space-y-4 mb-24 mt-2"
        >
          {recurringTransactions.map((rt) => (
            <div key={rt._id} className="relative z-10 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem] overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110 pointer-events-none" />
              
              <div className="flex justify-between items-start mb-5">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white/90 mb-1 flex items-center gap-2">
                    {rt.title || t('recurring.untitled', 'معاملة بدون عنوان')}
                    {rt.reminderEnabled && <Bell size={14} className="text-yellow-400 drop-shadow" />}
                  </h3>
                  <div className="text-2xl font-black text-brand-blue tracking-tight drop-shadow-sm">
                    {new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(rt.amount)}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => handleToggleRecurring(rt._id)}
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 shadow-inner border border-white/10 ${rt.isActive ? 'bg-brand-blue' : 'bg-black/40'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${rt.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                  <div className="flex gap-1 mt-1">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setEditingRecurring(rt)}
                      className="p-2 text-white/40 hover:text-white transition-colors bg-white/5 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10"
                    >
                      <Pencil size={16} />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteRecurring(rt)}
                      className="p-2 text-red-400/60 hover:text-red-400 transition-colors bg-white/5 rounded-xl hover:bg-white/10 border border-transparent hover:border-red-500/20"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                <div className="flex items-center gap-2 text-white/60 bg-black/30 p-2 rounded-xl border border-white/5 shadow-inner">
                  <Repeat size={14} className="text-orange-400" />
                  <span className="font-bold">{t(`recurring.${rt.repeatType}`, rt.repeatType)}</span>
                </div>
                <div className="flex items-center gap-2 text-white/60 bg-black/30 p-2 rounded-xl border border-white/5 shadow-inner">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  <span dir="ltr" className="font-bold">{new Date(rt.nextExecutionDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')} {rt.executionTime && `- ${rt.executionTime}`}</span>
                </div>
              </div>
            </div>
          ))}
          {recurringTransactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-white/40 space-y-5 flex-1">
              <div className="w-24 h-24 bg-black/20 rounded-[2rem] flex items-center justify-center mb-2 shadow-inner border border-white/5">
                <Repeat size={40} className="text-white/20" />
              </div>
              <p className="text-xl font-bold text-white/60 text-center">{t('recurring.noRecurring', 'لا توجد معاملات متكررة')}</p>
            </div>
          )}
          
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/add', { state: { openRecurring: true } })}
            className="bg-brand-blue/10 border border-brand-blue/20 shadow-inner w-full py-4 flex items-center justify-center rounded-2xl text-brand-blue hover:bg-brand-blue hover:text-white transition-colors gap-2 mt-6 font-bold"
          >
            <Plus className="w-5 h-5" /> {t('recurring.addBtn', 'إضافة معاملة متكررة')}
          </motion.button>
        </motion.section>
      )}

      {activeView === 'data' && (
        <motion.section 
          key="data"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="space-y-6"
        >
          <div className="relative z-10 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem]">
            <h3 className="text-lg font-bold mb-1 text-white/90">{t('settings.dataManagement', 'إدارة البيانات')}</h3>
            <p className="text-sm text-white/50 mb-6">{t('settings.dataDesc', 'الاستيراد ينشئ الحسابات والفئات الناقصة تلقائيًا ويحفظ كل معاملة في حسابها الصحيح.')}</p>

            <div className="flex gap-3">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleExport} 
                className="flex-1 flex flex-col items-center justify-center gap-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 py-5 rounded-2xl hover:bg-blue-500/30 transition-colors shadow-inner"
              >
                <Download className="w-6 h-6" />
                <span className="text-sm font-bold">{t('settings.exportBtn', 'تصدير')}</span>
              </motion.button>

              <input type="file" accept=".json,.csv" ref={fileInputRef} onChange={handleImportFile} className="hidden" />

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleImportClick} 
                disabled={isImporting} 
                className="flex-1 flex flex-col items-center justify-center gap-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 py-5 rounded-2xl hover:bg-purple-500/30 transition-colors disabled:opacity-50 shadow-inner"
              >
                <Upload className="w-6 h-6" />
                <span className="text-sm font-bold">{t('settings.importBtn', 'استيراد')}</span>
              </motion.button>
            </div>
            <AnimatePresence>
              {dataStatus && (
                <motion.p 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 rounded-xl bg-black/30 border border-white/10 p-3 text-sm font-medium text-white/80 text-center shadow-inner"
                >
                  {dataStatus}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="relative z-10 bg-black/20 backdrop-blur-[40px] border border-red-500/30 border-t-red-500/40 border-l-red-500/30 shadow-[0_8px_32px_rgba(220,38,38,0.1),inset_0_1px_2px_rgba(255,255,255,0.1)] p-6 rounded-[2.5rem] bg-red-500/5">
            <h3 className="text-lg font-bold mb-2 text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 drop-shadow" /> {t('settings.dangerZone', 'منطقة الخطر')}
            </h3>
            <p className="text-sm text-white/50 mb-6">{t('settings.wipeWarning', 'حذف جميع البيانات نهائياً بما في ذلك المعاملات والحسابات والفئات والاستثمارات والمستحقات. لا يمكن التراجع عن هذا الإجراء.')}</p>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setWipeModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 py-4 rounded-2xl hover:bg-red-500 hover:text-white transition-colors font-bold shadow-inner"
            >
              <Trash2 className="w-5 h-5" />
              {t('settings.wipeBtn', 'مسح جميع البيانات')}
            </motion.button>
          </div>
        </motion.section>
      )}

      {/* Apple Shortcuts Settings */}
      {activeView === 'appleShortcuts' && (
        <motion.section 
          key="appleShortcuts"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative z-10 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2.5rem] p-6 space-y-6"
        >
          {/* Header & Status */}
          <div className="flex flex-col items-center justify-center space-y-3 mb-6">
            <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/30 rounded-2xl flex items-center justify-center text-purple-400 shadow-inner">
              <Command size={32} />
            </div>
            <p className="text-white/70 text-center text-sm leading-relaxed px-4">
              {t('appleShortcuts.description')}
            </p>
            <div className={`mt-2 px-4 py-1.5 rounded-full text-xs font-semibold border ${shortcutConnected ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/10 border-white/20 text-white/50'}`}>
              {shortcutConnected ? t('appleShortcuts.statusConnected') : t('appleShortcuts.statusDisconnected')}
            </div>
          </div>

          {/* Token Generation / Revocation */}
          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-inner">
            {shortcutToken ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-emerald-400 font-medium">
                  <span className="flex items-center gap-2"><CheckCircle2 size={18} /> {t('appleShortcuts.tokenGenerated')}</span>
                </div>
                <div className="bg-[#12121a] border border-white/10 rounded-xl p-4 text-white/50 font-mono text-sm tracking-widest text-center select-none">
                  ••••••••••••••••••••••••••••••••••••••••
                </div>
                <p className="text-orange-400/90 text-xs flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  {t('appleShortcuts.tokenWarning')}
                </p>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    navigator.clipboard.writeText(shortcutToken);
                    showToast(t('appleShortcuts.tokenCopied'), 'success');
                  }}
                  className="w-full py-3 bg-brand-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(59,130,246,0.3)]"
                >
                  <Copy size={18} />
                  {t('appleShortcuts.copyToken')}
                </motion.button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {shortcutConnected ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      if (window.confirm(t('appleShortcuts.revokeWarning'))) {
                        try {
                          await revokeShortcutToken();
                          setShortcutConnected(false);
                          setShortcutToken(null);
                          showToast(t('settings.revokedSuccessfully'), 'success');
                        } catch(e) {
                          showToast(t('addTransaction.errorMsg'), 'error');
                        }
                      }
                    }}
                    className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 font-semibold rounded-xl hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    {t('appleShortcuts.revokeToken')}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      try {
                        const res = await generateShortcutToken();
                        setShortcutToken(res.token);
                        setShortcutConnected(true);
                      } catch (error) {
                        showToast(t('common.error'), 'error');
                      }
                    }}
                    className="w-full py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(168,85,247,0.3)]"
                  >
                    <Command size={18} />
                    {t('appleShortcuts.generateToken')}
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {/* Setup Guide */}
          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-inner space-y-4">
            <h3 className="text-white/90 font-semibold flex items-center gap-2">
              <Smartphone size={18} className="text-purple-400" />
              {t('appleShortcuts.setupGuide')}
            </h3>
            <div className="space-y-6 mt-4">
              {/* Group 1: Preparation */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span className="bg-purple-500/20 text-purple-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                  Preparation
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-white/70 ml-2">
                  <li>{t('appleShortcuts.step1')}</li>
                  <li>{t('appleShortcuts.step2')}</li>
                  <li>{t('appleShortcuts.step3')}</li>
                  <li>{t('appleShortcuts.step4')}</li>
                  <li>{t('appleShortcuts.step5')}</li>
                  <li>{t('appleShortcuts.step6')}</li>
                </ol>
              </div>

              {/* Group 2: Account Selection */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span className="bg-purple-500/20 text-purple-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                  Account Selection
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-white/70 ml-2" start="7">
                  <li>{t('appleShortcuts.step7')}</li>
                  <CopyableURL url={`${apiUrl}/integrations/shortcut/accounts`} />
                  <li>{t('appleShortcuts.step8')}</li>
                  <li>{t('appleShortcuts.step9')}</li>
                  <li>{t('appleShortcuts.step10')}</li>
                </ol>
              </div>

              {/* Group 3: Category Selection */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span className="bg-purple-500/20 text-purple-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                  Category Selection
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-white/70 ml-2" start="11">
                  <li>{t('appleShortcuts.step11')}</li>
                  <CopyableURL url={`${apiUrl}/integrations/shortcut/categories`} />
                  <li>{t('appleShortcuts.step12')}</li>
                  <li>{t('appleShortcuts.step13')}</li>
                  <li>{t('appleShortcuts.step14')}</li>
                </ol>
              </div>

              {/* Group 4: Sending Transaction */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span className="bg-purple-500/20 text-purple-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">4</span>
                  Saving Transaction
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-white/70 ml-2" start="15">
                  <li>{t('appleShortcuts.step15')}</li>
                  <CopyableURL url={`${apiUrl}/integrations/shortcut/transactions`} />
                  <li>{t('appleShortcuts.step16')}</li>
                  <li>{t('appleShortcuts.step17')}</li>
                  <li>{t('appleShortcuts.step18')}</li>
                  <li>{t('appleShortcuts.step19')}</li>
                  <li>{t('appleShortcuts.step20')}</li>
                  <li>{t('appleShortcuts.step21')}</li>
                  <li>{t('appleShortcuts.step22')}</li>
                  <li>{t('appleShortcuts.step23')}</li>
                </ol>
              </div>

              {/* Group 5: Back Tap Config */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                  <span className="bg-purple-500/20 text-purple-400 w-6 h-6 rounded-full flex items-center justify-center text-xs">5</span>
                  Back Tap Setup
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-white/70 ml-2" start="24">
                  <li>{t('appleShortcuts.step24')}</li>
                  <li>{t('appleShortcuts.step25')}</li>
                  <li>{t('appleShortcuts.step26')}</li>
                </ol>
              </div>
            </div>
          </div>
        </motion.section>
      )}
      </AnimatePresence>

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
                  <label className="flex items-center justify-between p-2.5 bg-black/20 border border-white/5 rounded-xl cursor-pointer hover:bg-black/40 transition-colors">
                    <span className="text-xs font-medium text-[var(--color-text-main)]">{t('settings.isSavingsAccount', 'حساب توفير')}</span>
                    <input type="checkbox" checked={editIsSavingsAccount} onChange={(e) => setEditIsSavingsAccount(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-black/50" />
                  </label>
                </>
              ) : (
                <div>
                  <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">{t('settings.nameLabel', 'الاسم')}</label>
                  <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-blue-500/50" required />
                </div>
              )}



              <IconPicker
                type={editType === 'account' ? 'account' : 'category'}
                selectedIcon={editIcon}
                onSelect={setEditIcon}
                selectedColor={editColor}
                onColorSelect={setEditColor}
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

              <label className="flex items-center justify-between p-2.5 bg-black/20 border border-white/5 rounded-xl cursor-pointer hover:bg-black/40 transition-colors">
                <span className="text-xs font-medium text-[var(--color-text-main)]">{t('settings.isSavingsAccount', 'حساب توفير')}</span>
                <input type="checkbox" checked={newAccountIsSavingsAccount} onChange={(e) => setNewAccountIsSavingsAccount(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-blue-500 focus:ring-blue-500/50 bg-black/50" />
              </label>

              <IconPicker type="account" selectedIcon={newAccountIcon} onSelect={setNewAccountIcon} selectedColor={newAccountColor} onColorSelect={setNewAccountColor} colorClass="text-blue-400" />

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
                type="category"
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
      <IncomeProfileModal
        isOpen={addIncomeProfileModalOpen}
        onClose={() => setAddIncomeProfileModalOpen(false)}
        isEdit={false}
        profileData={newIncomeProfile}
        setProfileData={setNewIncomeProfile}
        onSubmit={handleAddIncomeProfile}
        accounts={accounts}
        categories={categories.filter(c => c.type === 'income')}
      />

      {editingIncomeProfile && (
        <IncomeProfileModal
          isOpen={editIncomeProfileModalOpen}
          onClose={() => setEditIncomeProfileModalOpen(false)}
          isEdit={true}
          profileData={editingIncomeProfile}
          setProfileData={setEditingIncomeProfile}
          onSubmit={handleUpdateIncomeProfile}
          accounts={accounts}
          categories={categories.filter(c => c.type === 'income')}
        />
      )}

    </motion.div>
  );
};

export default Settings;
