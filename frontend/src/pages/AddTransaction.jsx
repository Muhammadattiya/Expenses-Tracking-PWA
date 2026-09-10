import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Repeat, CheckCircle2, Loader2, Bell, Calculator } from "lucide-react";
import { motion } from "framer-motion";

import { getAccounts } from "../api/accounts";
import { getCategories } from "../api/categories";
import { createTransaction } from "../api/transactions";
import { createRecurringTransaction } from "../api/recurringTransactions";
import CustomDatePicker from "../components/ui/CustomDatePicker";
import CustomSelect from "../components/ui/CustomSelect";
import RecurringSettingsModal from "../components/modals/RecurringSettingsModal";
import CalculatorModal from "../components/modals/CalculatorModal";
import { payBill } from "../api/bills";
import { useNotification } from "../contexts/NotificationContext";
import { useLanguage } from "../contexts/LanguageContext";
import SplashScreen from "../components/SplashScreen";

const AddTransaction = () => {
  // الحالات (States) الأساسية
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const { t } = useLanguage();

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState(location.state?.defaultAmount?.toString() || '');
  const [title, setTitle] = useState(location.state?.defaultName || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

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

  // إزالة الـ scroll تماماً من الصفحة للحفاظ على احتواء كل العناصر وثباتها داخل الشاشة
  useEffect(() => {
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
    };
  }, []);

  // جلب البيانات من الباك إند أول ما الصفحة تفتح
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const [accountsData, categoriesData] = await Promise.all([
          getAccounts(),
          getCategories(),
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


  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      type,
      amount: Number(amount),
      title,
      date: new Date(date).toISOString(),
    };

    if (type === 'transfer') {
      if (!fromAccount || !toAccount) {
        showToast(t('addTransaction.selectAccounts'), 'warning');
        return;
      }
      payload.from_account = fromAccount;
      payload.to_account = toAccount;
    } else {
      if (!account || !category) {
        showToast(t('addTransaction.selectAccountAndCategory'), 'warning');
        return;
      }
      payload.account = account;
      payload.category = category;
    }

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

      showToast(t('addTransaction.successMsg'), 'success');

      if (billId) {
        navigate('/bills');
      }
    } catch (error) {
      console.error('❌ خطأ في حفظ المعاملة:', error);
      showToast(error.response?.data?.message || t('addTransaction.errorMsg'), 'error');
    }
  };

  // شاشة تحميل بسيطة لو البيانات لسه بتيجي من السيرفر
  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <div className="w-full max-w-lg mx-auto select-none flex flex-col gap-2.5 sm:gap-3.5 h-[calc(100dvh-2rem)]">
      {/* Ambient Copper Background with rich glow showing through the transparent glass */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115] overflow-hidden">
        <div className="absolute top-[20px] left-[-90px] w-[340px] h-[340px] bg-[#8D6346] rounded-full blur-[140px] opacity-45" />
        <div className="absolute top-[300px] right-[-80px] w-[300px] h-[300px] bg-[#8D6346] rounded-full blur-[140px] opacity-40" />
        <div className="absolute bottom-[-60px] left-1/2 -translate-x-1/2 w-[380px] h-[280px] bg-[#8D6346] rounded-full blur-[140px] opacity-40" />
      </div>

      {/* Top Segmented Control (Expense / Income / Transfer) */}
      <div className="w-full shrink-0">
        <div className="flex bg-black/20 backdrop-blur-[10px] border border-white/5 p-1 rounded-full shadow-inner relative w-full h-11 sm:h-12 items-center">
          {[
            { key: 'expense', label: t('addTransaction.expense'), color: '#FF5555', shadow: 'rgba(255,85,85,0.45)' },
            { key: 'income', label: t('addTransaction.income'), color: '#34C759', shadow: 'rgba(52,199,89,0.45)' },
            { key: 'transfer', label: t('addTransaction.transfer'), color: '#007AFF', shadow: 'rgba(0,122,255,0.45)' }
          ].map((tab) => {
            const isActive = type === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setType(tab.key)}
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

      {/* Glass Container reaching 100% full width of the screen regardless of dimensions - Transparent glass allowing theme colors to show through */}
      <form 
        onSubmit={handleSubmit} 
        className="w-screen relative left-1/2 -translate-x-1/2 pt-4 pb-24 sm:pt-5 sm:pb-28 rounded-t-[28px] sm:rounded-t-[36px] rounded-b-none bg-black/10 backdrop-blur-xl border-t border-white/15 shadow-[0_-2px_16px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.12)] flex flex-col flex-1 -mb-32 overflow-x-hidden"
      >
        <div className="w-full max-w-lg mx-auto px-5 sm:px-6 flex flex-col gap-3.5 sm:gap-4.5 flex-1">
          {/* 1. Amount Section */}
          <div className="flex flex-col items-center justify-center w-full py-1 sm:py-2">
            <label className="text-xs sm:text-sm font-medium text-white/70 tracking-wide mb-1.5 text-center">
              {t('addTransaction.amount')}
            </label>
            <div className="flex items-center justify-center gap-2 relative w-full">
              <button
                type="button"
                onClick={() => setShowCalculator(true)}
                className="absolute start-1 sm:start-3 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
                aria-label={t('common.calculator')}
              >
                <Calculator className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
              <input
                type="number"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="bg-transparent text-center text-5xl sm:text-6xl font-extrabold text-white focus:outline-none w-full max-w-[65%] placeholder-white/25 tracking-tight leading-none py-1.5 tabular-nums"
                style={{ caretColor: type === 'expense' ? '#FF5555' : type === 'income' ? '#34C759' : '#007AFF' }}
              />
              <span className="text-sm sm:text-base text-white/80 font-bold self-end pb-2 sm:pb-2.5">
                {t('nav.currency')}
              </span>
            </div>
            <div className="w-2/5 max-w-[160px] min-w-[80px] h-[2px] bg-gradient-to-r from-transparent via-[#8D6346]/50 to-transparent mx-auto mt-1.5" />
          </div>

          {/* 2. Date Segmented Control */}
          <div className="w-full">
            <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1">
              {t('addTransaction.date')}
            </label>
            <div className="flex bg-black/20 backdrop-blur-[10px] border border-white/5 p-1 sm:p-1.5 rounded-full shadow-inner relative h-11 sm:h-12 items-center">
              {[
                { key: 'today', label: t('addTransaction.today'), active: isToday, onClick: () => setDate(todayStr) },
                { key: 'yesterday', label: t('addTransaction.yesterday'), active: isYesterday, onClick: () => setDate(yesterdayStr) },
                { key: 'custom', label: isCustom ? date : t('addTransaction.customDate'), active: isCustom, onClick: () => setIsDatePickerOpen(true) }
              ].map((tab) => {
                const activeColor = type === 'expense' ? '#FF5555' : type === 'income' ? '#34C759' : '#007AFF';
                const activeShadow = type === 'expense' ? 'rgba(255,85,85,0.45)' : type === 'income' ? 'rgba(52,199,89,0.45)' : 'rgba(0,122,255,0.45)';
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
            <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1">
              {t('addTransaction.description')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('addTransaction.descPlaceholder')}
              className="w-full h-12 sm:h-13 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full px-4.5 text-sm sm:text-base text-white placeholder-white/35 focus:outline-none focus:border-[#8D6346] focus:bg-black/30 transition-all hover:bg-white/5"
            />
          </div>

          {/* 4 & 5. Accounts & Category */}
          {type === 'transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4.5 w-full">
              <div className="w-full">
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1 truncate">
                  {t('addTransaction.fromAccount')}
                </label>
                <CustomSelect
                  value={fromAccount}
                  onChange={setFromAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('addTransaction.fromAccountPlaceholder')}
                  buttonClassName="w-full h-12 sm:h-13 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full px-4.5 text-sm sm:text-base font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 focus:outline-none focus:border-[#8D6346]"
                />
              </div>
              <div className="w-full">
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1 truncate">
                  {t('addTransaction.toAccount')}
                </label>
                <CustomSelect
                  value={toAccount}
                  onChange={setToAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('addTransaction.toAccountPlaceholder')}
                  buttonClassName="w-full h-12 sm:h-13 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full px-4.5 text-sm sm:text-base font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 focus:outline-none focus:border-[#8D6346]"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4.5 w-full">
              <div className="w-full">
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1 truncate">
                  {t('addTransaction.account')}
                </label>
                <CustomSelect
                  value={account}
                  onChange={setAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('addTransaction.accountPlaceholder')}
                  buttonClassName="w-full h-12 sm:h-13 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full px-4.5 text-sm sm:text-base font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 focus:outline-none focus:border-[#8D6346]"
                />
              </div>

              <div className="w-full">
                <label className="block text-xs sm:text-sm font-medium text-white/70 mb-1.5 px-1 truncate">
                  {t('addTransaction.category')}
                </label>
                <CustomSelect
                  value={category}
                  onChange={setCategory}
                  options={categories[type] ? categories[type].map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon })) : []}
                  placeholder={t('addTransaction.categoryPlaceholder')}
                  buttonClassName="w-full h-12 sm:h-13 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full px-4.5 text-sm sm:text-base font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 focus:outline-none focus:border-[#8D6346]"
                />
              </div>
            </div>
          )}

          {/* 6. Recurring Settings Button */}
          <div className="w-full mt-[22px] sm:mt-[26px]">
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

          {/* 7. Confirm & Save Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full h-13 sm:h-14 rounded-full font-bold text-base sm:text-lg text-white shadow-inner transition-colors duration-200 bg-[#8D6346]/30 backdrop-blur-[10px] border border-[#8D6346]/50 hover:bg-[#8D6346]/45 flex items-center justify-center gap-2 active:bg-[#8D6346]/55 mt-[22px] sm:mt-[26px]"
          >
            {t('addTransaction.submit')}
          </motion.button>
        </div>
      </form>
      {isDatePickerOpen && (
        <CustomDatePicker
          value={date}
          onChange={setDate}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}

      {isRecurringModalOpen && (
        <RecurringSettingsModal
          isOpen={isRecurringModalOpen}
          onClose={() => setIsRecurringModalOpen(false)}
          settings={recurringSettings}
          onSave={setRecurringSettings}
        />
      )}

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
