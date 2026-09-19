import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Repeat, CheckCircle2, Loader2, Bell, Calculator, ChevronDown, ChevronLeft, ChevronRight, Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";

import { getAccounts } from "../api/accounts";
import { getCategories } from "../api/categories";
import { createTransaction } from "../api/transactions";
import { createRecurringTransaction } from "../api/recurringTransactions";
import CustomDatePicker from "../components/ui/CustomDatePicker";
import RecurringSettingsModal from "../components/modals/RecurringSettingsModal";
import CategoryBottomSheetModal from "../components/modals/CategoryBottomSheetModal";
import AccountBottomSheetModal from "../components/modals/AccountBottomSheetModal";
import CalculatorModal from "../components/modals/CalculatorModal";
import { getIconComponent } from "../components/IconPicker";
import { payBill } from "../api/bills";
import { useNotification } from "../contexts/NotificationContext";
import { useLanguage } from "../contexts/LanguageContext";
import SplashScreen from "../components/SplashScreen";
import { triggerHaptic } from "../utils/haptics";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

const AddTransaction = () => {
  // الحالات (States) الأساسية
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const { t, lang } = useLanguage();
  const formRef = useRef(null);
  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
    error: speechError,
  } = useSpeechRecognition(lang === 'ar' ? 'ar-EG' : 'en-US');

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState(location.state?.defaultAmount?.toString() || '');
  const [title, setTitle] = useState(location.state?.defaultName || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSuccessCelebration, setIsSuccessCelebration] = useState(false);

  // حالة مودال الحسابات
  const [accountModalConfig, setAccountModalConfig] = useState({
    isOpen: false,
    target: 'account',
    title: ''
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();

  const isToday = date === todayStr;
  const isYesterday = date === yesterdayStr;
  const isCustom = !isToday && !isYesterday;

  // حالات القوائم الديناميكية
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ expense: [], income: [] });
  const [isLoading, setIsLoading] = useState(true);

  // حالات الاختيارات
  const [account, setAccount] = useState(location.state?.defaultAccount || '');
  const [category, setCategory] = useState(location.state?.defaultCategory || '');
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const billId = location.state?.billId || null;

  // إعدادات التكرار (Recurring)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recurringSettings, setRecurringSettings] = useState({
    repeatType: 'never',
    interval: 1,
    neverEnds: true,
    endDate: '',
    maxOccurrences: '',
    executionTime: '09:00',
    reminderEnabled: false,
    reminderDaysBefore: 1
  });
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);

  // اختصار لوحة المفاتيح: Ctrl+Enter أو Cmd+Enter للحفظ السريع على سطح المكتب
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isSubmitting && amount && Number(amount) > 0) {
          formRef.current?.requestSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, amount]);

  useEffect(() => {
    const spoken = `${transcript || ''} ${interimTranscript || ''}`.trim();
    if (spoken) setTitle(spoken.slice(0, 120));
  }, [transcript, interimTranscript]);

  useEffect(() => {
    if (speechError) {
      showToast(t('quickAdd.speechError'), 'warning');
    }
  }, [speechError, showToast, t]);

  // جلب البيانات من الباك إند أول ما الصفحة تفتح
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [accountsData, categoriesData] = await Promise.all([
          getAccounts(),
          getCategories()
        ]);

        setAccounts(accountsData);

        // فصل الفئات لدخل ومصروف بناءً على اللي راجع من الداتا بيز
        const groupedCategories = { expense: [], income: [] };
        categoriesData.forEach(cat => {
          if (cat.type === 'expense') groupedCategories.expense.push(cat);
          if (cat.type === 'income') groupedCategories.income.push(cat);
        });
        setCategories(groupedCategories);

        // تعيين قيم افتراضية للحقول لو في حسابات موجودة
        if (accountsData.length > 0) {
          const defaultAcc = accountsData.find(a => a.isDefault) || accountsData[0];
          if (!location.state?.defaultAccount) setAccount(defaultAcc._id);
          setFromAccount(defaultAcc._id);
          const otherAcc = accountsData.find(a => a._id !== defaultAcc._id) || defaultAcc;
          setToAccount(otherAcc._id);
        }

        // تعيين فئة افتراضية لو مش جاية من الفاتورة
        if (!location.state?.defaultCategory && groupedCategories.expense.length > 0) {
          setCategory(groupedCategories.expense[0]._id);
        }
      } catch (error) {
        console.error('❌ خطأ في جلب البيانات:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormData();
  }, []);

  useEffect(() => {
    if (location.state?.openRecurring) {
      setIsRecurringModalOpen(true);
      // Clean up state so it doesn't reopen on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);


  const handleTypeChange = (newType) => {
    triggerHaptic('selection');
    setType(newType);
    if (newType === 'transfer') return;
    const availableCategories = categories[newType] || [];
    const isCategoryValid = availableCategories.some(c => c._id === category);
    if (!isCategoryValid && availableCategories.length > 0) {
      setCategory(availableCategories[0]._id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const parsedAmount = Number(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      triggerHaptic('warning');
      showToast(t('addTransaction.enterValidAmount'), 'warning');
      return;
    }

    const payload = {
      type,
      amount: parsedAmount,
      title,
      date: new Date(date).toISOString(),
    };

    if (type === 'transfer') {
      if (!fromAccount || !toAccount) {
        triggerHaptic('warning');
        showToast(t('addTransaction.selectAccounts'), 'warning');
        return;
      }
      payload.from_account = fromAccount;
      payload.to_account = toAccount;
    } else {
      if (!account || !category) {
        triggerHaptic('warning');
        showToast(t('addTransaction.selectAccountAndCategory'), 'warning');
        return;
      }
      payload.account = account;
      payload.category = category;
    }

    setIsSubmitting(true);
    try {
      if (recurringSettings.repeatType !== 'never') {
        const recurringPayload = {
          ...payload,
          repeatType: recurringSettings.repeatType,
          interval: Number(recurringSettings.interval),
          startDate: payload.date,
          executionTime: recurringSettings.executionTime,
          neverEnds: recurringSettings.neverEnds,
          reminderEnabled: recurringSettings.reminderEnabled,
          reminderDaysBefore: Number(recurringSettings.reminderDaysBefore)
        };
        if (!recurringSettings.neverEnds && recurringSettings.endDate) recurringPayload.endDate = new Date(recurringSettings.endDate).toISOString();
        if (!recurringSettings.neverEnds && recurringSettings.maxOccurrences) recurringPayload.maxOccurrences = Number(recurringSettings.maxOccurrences);

        await createRecurringTransaction(recurringPayload);
      } else {
        const response = await createTransaction(payload);
        // الدفع للفاتورة لو جاية من شاشة الفواتير
        if (billId) {
          await payBill(billId, response._id);
        }
      }

      setAmount('');
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setRecurringSettings({
        repeatType: 'never',
        interval: 1,
        neverEnds: true,
        endDate: '',
        maxOccurrences: '',
        executionTime: '09:00',
        reminderEnabled: false,
        reminderDaysBefore: 1
      });


      // نبض لمسي احتفالي عند نجاح الحفظ
      triggerHaptic('success');
      setIsSuccessCelebration(true);
      setTimeout(() => {
        setIsSuccessCelebration(false);
      }, 1400);

      showToast(t('addTransaction.successMsg'), 'success');

      if (billId) {
        navigate('/bills');
      }
    } catch (error) {
      triggerHaptic('warning');
      console.error('❌ خطأ في حفظ المعاملة:', error);
      showToast(error.response?.data?.message || t('addTransaction.errorMsg'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // شاشة تحميل بسيطة لو البيانات لسه بتيجي من السيرفر
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <div className="w-full max-w-lg mx-auto select-none flex flex-col gap-3 sm:gap-4 px-4 pt-3 pb-8 min-h-screen relative">
      {/* Ambient Copper Background with rich glow showing through the transparent glass */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115] overflow-hidden">
        <div className="absolute top-[20px] left-[-90px] w-[340px] h-[340px] bg-[#8D6346] rounded-full blur-[140px] opacity-45" />
        <div className="absolute top-[300px] right-[-80px] w-[300px] h-[300px] bg-[#8D6346] rounded-full blur-[140px] opacity-40" />
        <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 w-[380px] h-[280px] bg-[#8D6346] rounded-full blur-[140px] opacity-40" />
      </div>

      {/* Top Header Bar with Cancel / Back Navigation */}
      <div className="flex items-center justify-between w-full px-1">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-95"
          aria-label={t('modals.cancelBtn') || 'Back'}
        >
          {lang === 'ar' ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
        <h2 className="text-white font-bold text-base sm:text-lg tracking-wide">
          {type === 'expense' ? t('addTransaction.expense') : type === 'income' ? t('addTransaction.income') : t('addTransaction.transfer')}
        </h2>
        <div className="w-11 h-11" />
      </div>

      {/* Top Segmented Control (Expense / Income / Transfer) */}
      <div className="w-full shrink-0">
        <div className="flex bg-black/20 backdrop-blur-[10px] border border-white/5 p-1 rounded-full shadow-inner relative w-full h-11 sm:h-12 items-center">
          {[
            { key: 'expense', label: t('addTransaction.expense'), color: '#FF3B30', shadow: 'rgba(255,59,48,0.45)' },
            { key: 'income', label: t('addTransaction.income'), color: '#34C759', shadow: 'rgba(52,199,89,0.45)' },
            { key: 'transfer', label: t('addTransaction.transfer'), color: '#007AFF', shadow: 'rgba(0,122,255,0.45)' }
          ].map((tab) => {
            const isActive = type === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTypeChange(tab.key)}
                className="relative flex-1 h-full rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 flex items-center justify-center z-10 active:scale-[0.97]"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTypePill"
                    className="absolute inset-0 rounded-full"
                    style={{
                      backgroundColor: tab.color,
                      boxShadow: `0 2px 12px ${tab.shadow}`
                    }}
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
                <span className={`relative z-20 ${isActive ? 'text-white' : 'text-white/60 hover:text-white'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Responsive Liquid Glass Form Card */}
      <form 
        ref={formRef}
        onSubmit={handleSubmit} 
        className="w-full rounded-[28px] sm:rounded-[36px] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 p-5 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_2px_rgba(255,255,255,0.15)] flex flex-col gap-4 sm:gap-5"
      >
        <div className="w-full flex flex-col gap-3.5 sm:gap-4.5">
          {/* 1. Amount Section */}
          <div className="flex flex-col items-center justify-center w-full py-1 sm:py-2">
            <label htmlFor="tx-amount" className="text-xs sm:text-sm font-medium text-white/70 tracking-wide mb-1.5 text-center cursor-pointer">
              {t('addTransaction.amount')}
            </label>
            <div className="flex items-center justify-center gap-2 relative w-full">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setShowCalculator(true);
                }}
                className="absolute start-1 sm:start-3 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
                aria-label={t('common.calculator')}
              >
                <Calculator className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
              <input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                required
                min="0.01"
                max="999999999"
                step="any"
                aria-label={t('addTransaction.amount')}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="bg-transparent text-center text-5xl sm:text-6xl font-extrabold text-white focus:outline-none w-full max-w-[65%] placeholder-white/25 tracking-tight leading-none py-1.5 tabular-nums"
                style={{ caretColor: type === 'expense' ? '#FF3B30' : type === 'income' ? '#34C759' : '#007AFF' }}
              />
              <span className="text-sm sm:text-base text-white/80 font-bold self-end pb-2 sm:pb-2.5">
                {t('nav.currency')}
              </span>
            </div>
            <div 
              className="w-2/5 max-w-[160px] min-w-[80px] h-[2px] mx-auto mt-1.5 transition-all duration-300 rounded-full" 
              style={{
                background: `linear-gradient(to right, transparent, ${
                  type === 'expense' ? 'rgba(255, 59, 48, 0.7)' : type === 'income' ? 'rgba(52, 199, 89, 0.7)' : 'rgba(0, 122, 255, 0.7)'
                }, transparent)`
              }}
            />
          </div>

          {/* 2. Date Segmented Control */}
          <div className="w-full">
            <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1">
              {t('addTransaction.date')}
            </label>
            <div className="flex bg-black/20 backdrop-blur-[10px] border border-white/5 p-1 sm:p-1.5 rounded-full shadow-inner relative h-11 sm:h-12 items-center">
              {[
                { key: 'today', label: t('addTransaction.today'), active: isToday, onClick: () => { triggerHaptic('selection'); setDate(todayStr); } },
                { key: 'yesterday', label: t('addTransaction.yesterday'), active: isYesterday, onClick: () => { triggerHaptic('selection'); setDate(yesterdayStr); } },
                { key: 'custom', label: isCustom ? date : t('addTransaction.customDate'), active: isCustom, onClick: () => { triggerHaptic('light'); setIsDatePickerOpen(true); } }
              ].map((tab) => {
                const activeColor = type === 'expense' ? '#FF3B30' : type === 'income' ? '#34C759' : '#007AFF';
                const activeShadow = type === 'expense' ? 'rgba(255,59,48,0.45)' : type === 'income' ? 'rgba(52,199,89,0.45)' : 'rgba(0,122,255,0.45)';
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={tab.onClick}
                    className="relative flex-1 h-full rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 flex items-center justify-center z-10 active:scale-[0.97]"
                  >
                    {tab.active && (
                      <motion.div
                        layoutId="activeDatePill"
                        className="absolute inset-0 rounded-full"
                        style={{
                          backgroundColor: activeColor,
                          boxShadow: `0 2px 10px ${activeShadow}`
                        }}
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span className={`relative z-20 truncate px-1.5 ${tab.active ? 'text-white font-semibold' : 'text-white/60 hover:text-white'}`}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Description Input */}
          <div className="w-full">
            <label htmlFor="tx-description" className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1 cursor-pointer">
              {t('addTransaction.description')}
            </label>
            <div className="relative">
              <input
                id="tx-description"
                type="text"
                maxLength={120}
                aria-label={t('addTransaction.description')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('addTransaction.descPlaceholder')}
                className="w-full h-12 sm:h-13 bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-full px-4.5 pe-14 text-sm sm:text-base text-white placeholder-white/35 focus:outline-none focus:border-[#8D6346] focus:bg-black/30 transition-all hover:bg-white/5"
              />
              {isSupported && (
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  aria-label={isListening ? t('quickAdd.stopListening') : t('quickAdd.listen')}
                  aria-pressed={isListening}
                  className={`absolute end-1.5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center ${
                    isListening
                      ? 'text-red-200 bg-red-500/30 border border-red-500/40'
                      : 'text-white/80 bg-white/10 border border-white/10'
                  }`}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
              )}
            </div>
          </div>

          {/* 4 & 5. Accounts & Category */}
          {type === 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4.5 w-full">
              {/* From Account Trigger Button */}
              <div className="w-full">
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1 truncate">
                  {t('addTransaction.fromAccount')}
                </label>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={accountModalConfig.isOpen && accountModalConfig.target === 'fromAccount'}
                  onClick={() => setAccountModalConfig({
                    isOpen: true,
                    target: 'fromAccount',
                    title: t('addTransaction.fromAccount')
                  })}
                  className="w-full h-12 sm:h-13 bg-black/20 backdrop-blur-[10px] border border-white/10 hover:border-white/20 shadow-inner rounded-full px-3.5 sm:px-4 text-sm sm:text-base font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 active:scale-[0.98] focus:outline-none focus:border-[#8D6346]"
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    {(() => {
                      const currentAcc = accounts.find(a => a._id === fromAccount);
                      if (!currentAcc) return <span className="text-white/40">{t('addTransaction.fromAccountPlaceholder')}</span>;
                      const IconComp = getIconComponent(currentAcc.icon, 'Wallet');
                      return (
                        <>
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ 
                              backgroundColor: currentAcc.color ? `${currentAcc.color}25` : 'rgba(141,99,70,0.25)',
                              color: currentAcc.color || '#E8C5A8'
                            }}
                          >
                            <IconComp size={15} />
                          </div>
                          <span className="truncate text-white font-medium">{currentAcc.name}</span>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/50 shrink-0 ms-1" />
                </button>
              </div>

              {/* To Account Trigger Button */}
              <div className="w-full">
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1 truncate">
                  {t('addTransaction.toAccount')}
                </label>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={accountModalConfig.isOpen && accountModalConfig.target === 'toAccount'}
                  onClick={() => setAccountModalConfig({
                    isOpen: true,
                    target: 'toAccount',
                    title: t('addTransaction.toAccount')
                  })}
                  className="w-full h-12 sm:h-13 bg-black/20 backdrop-blur-[10px] border border-white/10 hover:border-white/20 shadow-inner rounded-full px-3.5 sm:px-4 text-sm sm:text-base font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 active:scale-[0.98] focus:outline-none focus:border-[#8D6346]"
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    {(() => {
                      const currentAcc = accounts.find(a => a._id === toAccount);
                      if (!currentAcc) return <span className="text-white/40">{t('addTransaction.toAccountPlaceholder')}</span>;
                      const IconComp = getIconComponent(currentAcc.icon, 'Wallet');
                      return (
                        <>
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ 
                              backgroundColor: currentAcc.color ? `${currentAcc.color}25` : 'rgba(141,99,70,0.25)',
                              color: currentAcc.color || '#E8C5A8'
                            }}
                          >
                            <IconComp size={15} />
                          </div>
                          <span className="truncate text-white font-medium">{currentAcc.name}</span>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/50 shrink-0 ms-1" />
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4.5 w-full">
              {/* Account Trigger Button */}
              <div className="w-full">
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1 truncate">
                  {t('addTransaction.account')}
                </label>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={accountModalConfig.isOpen && accountModalConfig.target === 'account'}
                  onClick={() => setAccountModalConfig({
                    isOpen: true,
                    target: 'account',
                    title: t('addTransaction.account')
                  })}
                  className="w-full h-12 sm:h-13 bg-black/20 backdrop-blur-[10px] border border-white/10 hover:border-white/20 shadow-inner rounded-full px-3.5 sm:px-4 text-sm sm:text-base font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 active:scale-[0.98] focus:outline-none focus:border-[#8D6346]"
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0">
                    {(() => {
                      const currentAcc = accounts.find(a => a._id === account);
                      if (!currentAcc) return <span className="text-white/40">{t('addTransaction.accountPlaceholder')}</span>;
                      const IconComp = getIconComponent(currentAcc.icon, 'Wallet');
                      return (
                        <>
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ 
                              backgroundColor: currentAcc.color ? `${currentAcc.color}25` : 'rgba(141,99,70,0.25)',
                              color: currentAcc.color || '#E8C5A8'
                            }}
                          >
                            <IconComp size={15} />
                          </div>
                          <span className="truncate text-white font-medium">{currentAcc.name}</span>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/50 shrink-0 ms-1" />
                </button>
              </div>

              {/* Category Trigger Button opening iOS Bottom Sheet Grid */}
              <div className="w-full">
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1 truncate">
                  {t('addTransaction.category')}
                </label>
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={isCategoryModalOpen}
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full h-12 sm:h-13 bg-black/20 backdrop-blur-[10px] border border-white/10 hover:border-white/20 shadow-inner rounded-full px-3.5 sm:px-4 text-sm sm:text-base font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 active:scale-[0.98] focus:outline-none focus:border-[#8D6346]"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {(() => {
                      const activeCatList = categories[type] || [];
                      const currentCat = activeCatList.find(c => c._id === category);
                      if (!currentCat) return <span className="text-white/40">{t('addTransaction.categoryPlaceholder')}</span>;
                      const IconComp = getIconComponent(currentCat.icon, 'Tag');
                      return (
                        <>
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                            style={{ 
                              backgroundColor: currentCat.color ? `${currentCat.color}25` : 'rgba(141,99,70,0.25)',
                              color: currentCat.color || '#E8C5A8'
                            }}
                          >
                            <IconComp size={15} />
                          </div>
                          <span className="truncate text-white font-medium">{currentCat.name}</span>
                        </>
                      );
                    })()}
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />
                </button>
              </div>
            </div>
          )}

          {/* 6. Recurring Settings Button */}
          <div className="w-full mt-1">
            {recurringSettings.repeatType === 'never' ? (
              <button
                type="button"
                onClick={() => setIsRecurringModalOpen(true)}
                className="w-full h-11 sm:h-12 flex items-center justify-center gap-2 border border-dashed border-white/15 hover:border-white/25 rounded-full bg-black/20 backdrop-blur-[10px] shadow-inner transition-all duration-200 active:scale-[0.98]"
              >
                <Repeat className="w-4 h-4 text-white/60" />
                <span className="text-sm sm:text-base font-semibold text-white/75">{t('recurring.addBtn')}</span>
              </button>
            ) : (
              <div className="w-full h-11 sm:h-12 flex items-center justify-between px-4 border border-dashed border-[#8D6346]/40 rounded-full bg-[#8D6346]/10 backdrop-blur-[10px] shadow-inner transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Repeat className="w-4 h-4 text-[#E8C5A8]" />
                  <span className="text-sm sm:text-base font-semibold text-[#E8C5A8]">{t('recurring.settings')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(true)}
                  className="px-3.5 py-1.5 bg-[#8D6346] hover:bg-[#734e35] rounded-full text-xs sm:text-sm font-medium text-white transition-colors"
                >
                  {t('recurring.edit')}
                </button>
              </div>
            )}
          </div>

          {/* 7. Confirm & Save Button (Solid Warm Copper Ember with High Affordance) */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="submit"
            disabled={isSubmitting || isSuccessCelebration || !amount || Number(amount) <= 0}
            className={`w-full h-13 sm:h-14 rounded-full font-bold text-base sm:text-lg text-white shadow-[0_4px_20px_rgba(141,99,70,0.35)] transition-all duration-300 border border-white/15 flex items-center justify-center gap-2 active:scale-95 mt-4 sm:mt-5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer relative overflow-hidden ${
              isSuccessCelebration
                ? 'bg-[#34C759] shadow-[0_0_24px_rgba(52,199,89,0.5)] scale-[1.01]'
                : 'bg-[#8D6346] hover:bg-[#E8C5A8] hover:text-[#3D2E2B]'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isSuccessCelebration ? (
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>{t('common.success')}</span>
              </motion.div>
            ) : (
              t('addTransaction.submit')
            )}
          </motion.button>
        </div>
      </form>

      {/* Date Picker Modal */}
      {isDatePickerOpen && (
        <CustomDatePicker
          value={date}
          onChange={setDate}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}

      {/* Recurring Settings Modal */}
      {isRecurringModalOpen && (
        <RecurringSettingsModal
          isOpen={isRecurringModalOpen}
          onClose={() => setIsRecurringModalOpen(false)}
          settings={recurringSettings}
          onSave={setRecurringSettings}
        />
      )}

      {/* iOS Liquid Glass Category Bottom Sheet Grid Modal */}
      <CategoryBottomSheetModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories[type] || []}
        selectedId={category}
        onSelect={setCategory}
        type={type}
      />

      {/* iOS Liquid Glass Account Bottom Sheet Modal */}
      <AccountBottomSheetModal
        isOpen={accountModalConfig.isOpen}
        onClose={() => setAccountModalConfig(prev => ({ ...prev, isOpen: false }))}
        accounts={accounts}
        selectedId={
          accountModalConfig.target === 'fromAccount' 
            ? fromAccount 
            : accountModalConfig.target === 'toAccount' 
              ? toAccount 
              : account
        }
        onSelect={(id) => {
          if (accountModalConfig.target === 'fromAccount') setFromAccount(id);
          else if (accountModalConfig.target === 'toAccount') setToAccount(id);
          else setAccount(id);
        }}
        title={accountModalConfig.title}
      />

      {/* Calculator Modal */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        initialValue={amount}
        onSave={setAmount}
      />
    </div>
  );
};

export default AddTransaction;
