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
  Check,
  CheckCircle2,
  Link2,
  TrendingUp,
  TrendingDown,
  Smartphone,
  Repeat,
  Command,
  ArrowLeft,
  ArrowRight,
  Settings as SettingsIcon
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  getTransactions,
  importTransactions,
  createTransaction,
} from "../api/transactions";
import { getAccounts } from "../api/accounts";
import { getCategories } from "../api/categories";

import { subscribeToNotifications, sendNotification } from "../api/notifications";

import { getCurrentUser, deleteAllUserData } from "../api/auth";
import { getShortcutTokenStatus, generateShortcutToken, revokeShortcutToken } from "../api/integrations";
import api from "../api/axios";

import ConfirmModal from "../components/modals/ConfirmModal";
import SplashScreen from "../components/SplashScreen";
import { useNotification } from "../contexts/NotificationContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";

const CopyableURL = ({ url }) => {
  const { showToast } = useNotification();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    showToast(t('appleShortcuts.urlCopied'), 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      dir="ltr"
      className="mt-2 flex items-center justify-between gap-2.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-inner hover:border-[#8D6346]/50 transition-colors"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto scrollbar-hide py-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#8D6346] shrink-0" />
        <code className="text-xs text-[#8D6346] font-mono whitespace-nowrap select-all tracking-tight">{url}</code>
      </div>
      <motion.button 
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={handleCopy}
        className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
          copied 
            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
            : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white'
        }`}
      >
        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        <span>{copied ? (t('common.copied')) : (t('common.copy'))}</span>
      </motion.button>
    </div>
  );
};

const ShortcutStep = ({ num, text, children }) => (
  <div className="flex items-start gap-3 text-sm text-white/80 leading-relaxed">
    <div className="shrink-0 w-6 h-6 rounded-lg bg-white/5 border border-white/10 text-[#8D6346] text-xs font-bold flex items-center justify-center tabular-nums shadow-sm mt-0.5">
      {num}
    </div>
    <div className="flex-1 min-w-0 space-y-1.5">
      <div className="text-white/85 text-sm leading-relaxed break-words">{text}</div>
      {children}
    </div>
  </div>
);

const apiUrl = import.meta.env.VITE_API_URL || 'https://finova-zzr7.onrender.com/api';

const Settings = () => {
  const { showToast } = useNotification();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState('main');
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  // SMS Webhook State
  const [smsToken, setSmsToken] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);


  // Apple Shortcuts State
  const [shortcutConnected, setShortcutConnected] = useState(false);
  const [shortcutToken, setShortcutToken] = useState(null);

  const [pushStatus, setPushStatus] = useState('');
  const [dataStatus, setDataStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

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
      setPushStatus(t('settings.pushActivating'));
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error(t('settings.pushPermissionDenied'));
      }
      const registration = await navigator.serviceWorker.ready;

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });

      await subscribeToNotifications(subscription);
      setPushStatus(t('settings.pushSuccess'));
    } catch (error) {
      console.error('Push error:', error);
      setPushStatus(t('settings.pushError') + error.message);
    }
  };

  const fetchData = async () => {
    try {
      const [trans] = await Promise.all([
        getTransactions()
      ]);
      setTransactions(trans);



      // Fetch user data
      const user = await getCurrentUser();
      setSmsToken(user.smsWebhookToken || null);
      
      try {
        const tokenStatus = await getShortcutTokenStatus();
        setShortcutConnected(tokenStatus.isConnected);
      } catch (e) {
        console.error('Failed to get shortcut token status', e);
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




  const handleWipeData = async () => {
    setIsWiping(true);
    try {
      await deleteAllUserData();
      setTransactions([]);
      setWipeModalOpen(false);
      setDataStatus(t('settings.wipeSuccess'));
      window.location.reload();
    } catch (error) {
      setDataStatus(error.response?.data?.message || t('settings.wipeError'));
    } finally {
      setIsWiping(false);
    }
  };

  const handleExport = async () => {
    try {
      const [data, accounts, categories] = await Promise.all([
        getTransactions(),
        getAccounts(),
        getCategories()
      ]);
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
      setDataStatus(t('settings.exportSuccess'));
    } catch (error) {
      setDataStatus(error.response?.data?.message || t('settings.exportError'));
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
        setDataStatus(t('settings.importReading'));

        let importedData;
        if (fileType === 'csv') {
          const text = event.target.result;
          const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
          if (lines.length < 2) throw new Error(t('settings.importCsvError'));

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
        let msg = t('settings.importSuccessMsg');
        setDataStatus(msg);
        fetchData();
      } catch (error) {
        setDataStatus(error.response?.data?.message || t('settings.importFormatError'));
      } finally {
        setIsImporting(false);
        e.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="p-4 pt-8 pb-24 space-y-6 relative min-h-[100dvh]"
    >
      {/* Ambient Copper Background exactly like Dashboard */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115]">
        <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="relative z-10 grid grid-cols-[3.5rem_1fr_3.5rem] items-center mb-8 h-12">
        <div className="flex justify-start">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => activeView === 'main' ? navigate(-1) : setActiveView('main')} 
            className="bg-[#2B2321] text-white/90 rounded-full w-10 h-10 flex items-center justify-center border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] hover:bg-white/10 transition-colors"
          >
            <ArrowLeft strokeWidth={2.5} className={`w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
          </motion.button>
        </div>

        <h2 className="text-3xl font-bold text-center tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-sm flex items-center justify-center">
          {activeView === 'main' && t('nav.settings')}
          {activeView === 'appSettings' && t('settings.appSettings')}
          {activeView === 'data' && t('settings.dataManagement')}
          {activeView === 'sms' && t('settings.smsIntegration')}
          {activeView === 'appleShortcuts' && t('appleShortcuts.title')}
        </h2>

        <div></div>
      </div>

      <AnimatePresence mode="wait">
      {activeView === 'main' ? (
        <motion.section 
          key="main"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative z-10 flex flex-col gap-2"
        >
          {[
            { id: 'appSettings', icon: <SettingsIcon size={20} />, label: t('settings.appSettings') },
            { id: 'sms', icon: <MessageSquare size={20} />, label: t('settings.smsIntegration') },
            { id: 'appleShortcuts', icon: <Command size={20} />, label: t('appleShortcuts.title') },
            { id: 'data', icon: <Database size={20} />, label: t('settings.dataManagement') },
          ].map((item) => (
            <motion.button 
              key={item.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveView(item.id)} 
              className="w-full flex items-center justify-between py-4 px-2 hover:bg-white/5 transition-colors rounded-[24px] group relative text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner text-[#8D6346]">
                  {item.icon}
                </div>
                <span className="text-[17px] font-semibold font-['Exo_2'] text-white drop-shadow-sm">{item.label}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#2B2321] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] flex items-center justify-center flex-shrink-0">
                <ArrowRight strokeWidth={2.5} className={`text-white/90 w-4 h-4 transition-colors ${lang === 'ar' ? 'rotate-180' : ''}`} />
              </div>
            </motion.button>
          ))}
        </motion.section>
      ) : activeView === 'appSettings' ? (
        <motion.section 
          key="appSettings"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative z-10 space-y-10 px-2 sm:px-4"
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-white/80 font-medium text-sm ml-1">{t('settings.language')}</span>
              <div className="flex liquidglass rounded-[24px] p-1.5 relative z-10">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLang('ar')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors relative z-10 ${lang === 'ar' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                >
                  {lang === 'ar' && <motion.div layoutId="langIndicator" className="absolute inset-0 bg-white/15 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] -z-10" />}
                  {t('settings.arabic')}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLang('en')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors relative z-10 ${lang === 'en' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                >
                  {lang === 'en' && <motion.div layoutId="langIndicator" className="absolute inset-0 bg-white/15 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] -z-10" />}
                  {t('settings.english')}
                </motion.button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-white/80 font-medium text-sm ml-1">{t('settings.theme')}</span>
              <div className="flex liquidglass rounded-[24px] p-1.5 relative z-10">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleTheme('dark')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors relative z-10 ${theme === 'dark' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                >
                  {theme === 'dark' && <motion.div layoutId="themeIndicator" className="absolute inset-0 bg-white/15 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] -z-10" />}
                  {t('settings.dark')}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleTheme('light')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors relative z-10 ${theme === 'light' ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
                >
                  {theme === 'light' && <motion.div layoutId="themeIndicator" className="absolute inset-0 bg-white/15 border border-white/10 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] -z-10" />}
                  {t('settings.light')}
                </motion.button>
              </div>
            </div>

            {/* Push Notifications Section */}
            <div className="flex flex-col gap-3 pt-6 border-t border-white/5">
              <span className="text-white/80 font-medium text-sm ml-1 flex items-center gap-2">
                <Bell className="w-4 h-4" /> 
                {t('settings.pushNotifications')}
              </span>
              <p className="text-xs text-white/40 mb-2 px-1">{t('settings.pushDesc')}</p>
              
              <motion.button 
                whileTap={{ scale: 0.98 }}
                onClick={handleSubscribe} 
                className="w-full flex items-center justify-center gap-2 bg-[#8D6346]/10 text-[#8D6346] border border-[#8D6346]/20 py-4 rounded-2xl hover:bg-[#8D6346]/20 transition-colors shadow-inner font-bold text-sm"
              >
                <Bell className="w-5 h-5" />
                <span>{t('settings.pushActivateBtn')}</span>
              </motion.button>

              <AnimatePresence>
                {pushStatus && (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-2 rounded-xl bg-black/30 border border-white/10 p-3 text-xs font-medium text-white/80 text-center shadow-inner"
                  >
                    {pushStatus}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

          </div>
        </motion.section>
      ) : activeView === 'sms' ? (
        <motion.section 
          key="sms"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="space-y-4 mb-24 mt-2"
        >
          <div className="relative z-10 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2.5rem] overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#8D6346]/10 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110 pointer-events-none" />
            
            <h3 className="text-xl font-bold mb-2 text-white/90 flex items-center gap-2">
              <MessageSquare className="text-[#8D6346] w-6 h-6" />
              {t('settings.smsIntegration')}
            </h3>
            <p className="text-sm text-white/50 mb-6 leading-relaxed">{t('settings.smsDesc')}</p>

            {smsToken ? (
              <div className="flex flex-col gap-6">
                <div className="bg-black/30 p-5 rounded-[24px] border border-white/10 relative shadow-inner">
                  <label className="text-sm font-bold text-white/90 flex items-center gap-2 mb-3">
                    <Link2 className="w-5 h-5 text-[#8D6346]" />
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
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        navigator.clipboard.writeText(`https://finova-zzr7.onrender.com/api/sms/webhook/${smsToken}`);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className={`p-3 rounded-xl transition-colors flex-shrink-0 border border-transparent ${copiedToken ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-[#8D6346]'}`}
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

                <div className="bg-black/20 p-5 rounded-[24px] border border-white/5 shadow-inner">
                  <h4 className="font-bold text-white/90 mb-4 text-sm flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#8D6346]" />
                    {t('appleShortcuts.shortcutsGuideTitle')}
                  </h4>
                  <ol className="list-decimal list-inside space-y-3 text-xs sm:text-sm text-white/60 marker:text-[#8D6346] marker:font-bold">
                    <li>{t('appleShortcuts.step1a')}<strong>{t('appleShortcuts.step1b')}</strong>{t('appleShortcuts.step1c')}</li>
                    <li>{t('appleShortcuts.step2a')}<strong>{t('appleShortcuts.step2b')}</strong>{t('appleShortcuts.step2c')}<strong>{t('appleShortcuts.step2d')}</strong>{t('appleShortcuts.step2e')}</li>
                    <li>{t('appleShortcuts.step3a')}<strong>{t('appleShortcuts.step3b')}</strong>{t('appleShortcuts.step3c')}<span className="font-mono text-[#8D6346] bg-[#8D6346]/10 px-1.5 py-0.5 rounded-md border border-[#8D6346]/20 mx-1">NBE</span>{t('appleShortcuts.step3d')}<span className="font-mono text-[#8D6346] bg-[#8D6346]/10 px-1.5 py-0.5 rounded-md border border-[#8D6346]/20 mx-1">CIB</span>{t('appleShortcuts.step3e')}</li>
                    <li><strong>{t('appleShortcuts.step4a')}</strong>{t('appleShortcuts.step4b')}<strong>{t('appleShortcuts.step4c')}</strong>{t('appleShortcuts.step4d')}<strong>{t('appleShortcuts.step4e')}</strong>{t('appleShortcuts.step4f')}</li>
                    <li>{t('appleShortcuts.step5a')}<strong>{t('appleShortcuts.step5b')}</strong>{t('appleShortcuts.step5c')}<strong>{t('appleShortcuts.step5d')}</strong>{t('appleShortcuts.step5e')}</li>
                    <li>{t('appleShortcuts.step6a')}<strong>{t('appleShortcuts.step6b')}</strong>{t('appleShortcuts.step6c')}</li>
                    <li>{t('appleShortcuts.step7')}</li>
                    <li>{t('appleShortcuts.step8a')}<strong>{t('appleShortcuts.step8b')}</strong>{t('appleShortcuts.step8c')}<strong>{t('appleShortcuts.step8d')}</strong>{t('appleShortcuts.step8e')}</li>
                    <li>{t('appleShortcuts.step9a')}<strong>{t('appleShortcuts.step9b')}</strong>{t('appleShortcuts.step9c')}<strong>{t('appleShortcuts.step9d')}</strong>{t('appleShortcuts.step9e')}<strong>{t('appleShortcuts.step9f')}</strong>{t('appleShortcuts.step9g')}<span className="font-mono text-[#8D6346] bg-[#8D6346]/10 px-1.5 py-0.5 rounded-md border border-[#8D6346]/20 mx-1">text</span>{t('appleShortcuts.step9h')}<strong>{t('appleShortcuts.step9i')}</strong>{t('appleShortcuts.step9j')}</li>
                    <li>{t('appleShortcuts.step10a')}<strong>{t('appleShortcuts.step10b')}</strong>{t('appleShortcuts.step10c')}</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="flex justify-center p-12 bg-black/20 rounded-[24px] border border-white/5 shadow-inner">
                <Loader2 className="w-8 h-8 animate-spin text-[#8D6346]" />
              </div>
            )}
          </div>
        </motion.section>
      ) : activeView === 'data' ? (
        <motion.section 
          key="data"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="space-y-6"
        >
          <div className="relative z-10 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2.5rem]">
            <h3 className="text-lg font-bold mb-1 text-white/90">{t('settings.dataManagement')}</h3>
            <p className="text-sm text-white/50 mb-6">{t('settings.dataDesc')}</p>

            <div className="flex gap-3">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleExport} 
                className="flex-1 flex flex-col items-center justify-center gap-2 bg-[#8D6346]/10 text-[#8D6346] border border-[#8D6346]/30 py-5 rounded-2xl hover:bg-[#8D6346]/20 transition-colors shadow-inner"
              >
                <Upload className="w-6 h-6" />
                <span className="text-sm font-bold">{t('settings.exportBtn')}</span>
              </motion.button>

              <input type="file" accept=".json,.csv" ref={fileInputRef} onChange={handleImportFile} className="hidden" />

              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleImportClick} 
                disabled={isImporting} 
                className="flex-1 flex flex-col items-center justify-center gap-2 bg-[#8D6346]/10 text-[#8D6346] border border-[#8D6346]/30 py-5 rounded-2xl hover:bg-[#8D6346]/20 transition-colors disabled:opacity-50 shadow-inner"
              >
                <Download className="w-6 h-6" />
                <span className="text-sm font-bold">{t('settings.importBtn')}</span>
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

            <div className="relative z-10 bg-red-500/5 backdrop-blur-[32px] border border-red-500/30 shadow-[0_8px_32px_rgba(220,38,38,0.1)] p-6 rounded-[2.5rem] mt-6">
              <h3 className="text-lg font-bold mb-2 text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 drop-shadow" /> {t('settings.dangerZone')}
              </h3>
              <p className="text-sm text-white/50 mb-6">{t('settings.wipeWarning')}</p>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setWipeModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 py-4 rounded-2xl hover:bg-red-500/20 transition-colors font-bold shadow-inner"
              >
                <Trash2 className="w-5 h-5" />
                {t('settings.wipeBtn')}
              </motion.button>
            </div>
        </motion.section>
      ) : activeView === 'appleShortcuts' ? (
        <motion.section 
          key="appleShortcuts"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          className="relative z-10 space-y-12 pb-10 px-2 sm:px-4"
        >
          {/* Header & Status */}
          <div className="flex flex-col items-center justify-center text-center space-y-3 mb-2">
            <div className="w-16 h-16 bg-[#8D6346]/15 border border-[#8D6346]/30 rounded-2xl flex items-center justify-center text-[#8D6346] shadow-inner">
              <Command size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {t('appleShortcuts.title')}
              </h2>
              <p className="text-white/60 text-sm leading-relaxed max-w-md mx-auto mt-1">
                {t('appleShortcuts.description')}
              </p>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-xs font-semibold border inline-flex items-center gap-2 ${shortcutConnected ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-white/10 border-white/20 text-white/50'}`}>
              <span className={`w-2 h-2 rounded-full ${shortcutConnected ? 'bg-emerald-400 animate-pulse' : 'bg-white/40'}`} />
              {shortcutConnected ? t('appleShortcuts.statusConnected') : t('appleShortcuts.statusDisconnected')}
            </div>
          </div>

          {/* Token Generation / Revocation */}
          <div className="pt-10 border-t border-white/5">
            {shortcutToken ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-emerald-400 font-medium text-sm">
                  <span className="flex items-center gap-2"><CheckCircle2 size={18} /> {t('appleShortcuts.tokenGenerated')}</span>
                </div>
                <div dir="ltr" className="bg-[#12121a] border border-white/10 rounded-xl p-4 text-white/50 font-mono text-sm tracking-widest text-center select-none">
                  ••••••••••••••••••••••••••••••••••••••••
                </div>
                <p className="text-amber-400/90 text-xs flex items-start gap-2 leading-relaxed">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
                  <span>{t('appleShortcuts.tokenWarning')}</span>
                </p>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    navigator.clipboard.writeText(shortcutToken);
                    showToast(t('appleShortcuts.tokenCopied'), 'success');
                    setShortcutToken(null);
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(59,130,246,0.3)]"
                >
                  <Copy size={18} />
                  {t('appleShortcuts.copyToken')}
                </motion.button>
              </div>
            ) : (
                <div className="flex flex-col gap-3">
                {shortcutConnected ? (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
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
                    className="w-full py-3.5 bg-red-500/10 text-red-400 border border-red-500/20 font-semibold rounded-xl hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    {t('appleShortcuts.revokeToken')}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={async () => {
                      try {
                        const res = await generateShortcutToken();
                        setShortcutToken(res.token);
                        setShortcutConnected(true);
                      } catch (error) {
                        showToast(t('common.error'), 'error');
                      }
                    }}
                    className="w-full py-3.5 bg-[#8D6346]/20 hover:bg-[#8D6346]/30 text-white font-semibold border border-[#8D6346]/30 rounded-xl transition-all flex items-center justify-center gap-2 shadow-inner"
                  >
                    <Command size={18} />
                    {t('appleShortcuts.generateToken')}
                  </motion.button>
                )}
              </div>
            )}
          </div>

          {/* Setup Guide */}
          <div className="space-y-5 pt-10 border-t border-white/5">
            <div className="flex items-center justify-between pb-4">
              <h3 className="text-white font-bold flex items-center gap-2 text-base">
                <Smartphone size={19} className="text-[#8D6346]" />
                {t('appleShortcuts.setupGuide')}
              </h3>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#8D6346]/15 border border-[#8D6346]/25 text-[#8D6346]">
                iOS Shortcuts
              </span>
            </div>

            <div className="space-y-6 pt-2">
              {/* Group 1: Preparation */}
              <div className="space-y-3.5">
                <h4 className="text-white/90 font-bold flex items-center gap-2.5 text-sm">
                  <span className="bg-[#8D6346]/20 text-[#8D6346] w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border border-[#8D6346]/30">1</span>
                  {t('appleShortcuts.group1')}
                </h4>
                <div className="space-y-3 pt-1 border-s border-white/10 ms-3 ps-5">
                  <ShortcutStep num={1} text={t('appleShortcuts.step1')} />
                  <ShortcutStep num={2} text={t('appleShortcuts.step2')} />
                  <ShortcutStep num={3} text={t('appleShortcuts.step3')} />
                  <ShortcutStep num={4} text={t('appleShortcuts.step4')} />
                  <ShortcutStep num={5} text={t('appleShortcuts.step5')} />
                  <ShortcutStep num={6} text={t('appleShortcuts.step6')} />
                </div>
              </div>

              {/* Group 2: Account Selection */}
              <div className="space-y-3.5">
                <h4 className="text-white/90 font-bold flex items-center gap-2.5 text-sm">
                  <span className="bg-[#8D6346]/20 text-[#8D6346] w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border border-[#8D6346]/30">2</span>
                  {t('appleShortcuts.group2')}
                </h4>
                <div className="space-y-3 pt-1 border-s border-white/10 ms-3 ps-5">
                  <ShortcutStep num={7} text={t('appleShortcuts.step7')}>
                    <CopyableURL url={`${apiUrl}/integrations/shortcut/accounts`} />
                  </ShortcutStep>
                  <ShortcutStep num={8} text={t('appleShortcuts.step8')} />
                  <ShortcutStep num={9} text={t('appleShortcuts.step9')} />
                  <ShortcutStep num={10} text={t('appleShortcuts.step10')} />
                </div>
              </div>

              {/* Group 3: Category Selection */}
              <div className="space-y-3.5">
                <h4 className="text-white/90 font-bold flex items-center gap-2.5 text-sm">
                  <span className="bg-[#8D6346]/20 text-[#8D6346] w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border border-[#8D6346]/30">3</span>
                  {t('appleShortcuts.group3')}
                </h4>
                <div className="space-y-3 pt-1 border-s border-white/10 ms-3 ps-5">
                  <ShortcutStep num={11} text={t('appleShortcuts.step11')}>
                    <CopyableURL url={`${apiUrl}/integrations/shortcut/categories`} />
                  </ShortcutStep>
                  <ShortcutStep num={12} text={t('appleShortcuts.step12')} />
                  <ShortcutStep num={13} text={t('appleShortcuts.step13')} />
                  <ShortcutStep num={14} text={t('appleShortcuts.step14')} />
                </div>
              </div>

              {/* Group 4: Saving Transaction */}
              <div className="space-y-3.5">
                <h4 className="text-white/90 font-bold flex items-center gap-2.5 text-sm">
                  <span className="bg-[#8D6346]/20 text-[#8D6346] w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border border-[#8D6346]/30">4</span>
                  {t('appleShortcuts.group4')}
                </h4>
                <div className="space-y-3 pt-1 border-s border-white/10 ms-3 ps-5">
                  <ShortcutStep num={15} text={t('appleShortcuts.step15')}>
                    <CopyableURL url={`${apiUrl}/integrations/shortcut/transactions`} />
                  </ShortcutStep>
                  <ShortcutStep num={16} text={t('appleShortcuts.step16')} />
                  <ShortcutStep num={17} text={t('appleShortcuts.step17')} />
                  <ShortcutStep num={18} text={t('appleShortcuts.step18')} />
                  <ShortcutStep num={19} text={t('appleShortcuts.step19')} />
                  <ShortcutStep num={20} text={t('appleShortcuts.step20')} />
                  <ShortcutStep num={21} text={t('appleShortcuts.step21')} />
                  <ShortcutStep num={22} text={t('appleShortcuts.step22')} />
                  <ShortcutStep num={23} text={t('appleShortcuts.step23')} />
                </div>
              </div>

              {/* Group 5: Back Tap Setup */}
              <div className="space-y-3.5">
                <h4 className="text-white/90 font-bold flex items-center gap-2.5 text-sm">
                  <span className="bg-[#8D6346]/20 text-[#8D6346] w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border border-[#8D6346]/30">5</span>
                  {t('appleShortcuts.group5')}
                </h4>
                <div className="space-y-3 pt-1 ms-3 ps-5">
                  <ShortcutStep num={24} text={t('appleShortcuts.step24')} />
                  <ShortcutStep num={25} text={t('appleShortcuts.step25')} />
                  <ShortcutStep num={26} text={t('appleShortcuts.step26')} />
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      ) : null}
      </AnimatePresence>

      <ConfirmModal
        isOpen={wipeModalOpen}
        onClose={() => setWipeModalOpen(false)}
        onConfirm={handleWipeData}
        title={t('settings.dangerZone')}
        message={t('settings.wipeWarning')}
        confirmText={t('settings.wipeBtn')}
        isDanger={true}
      />

    </motion.div>
  );
};

export default Settings;
