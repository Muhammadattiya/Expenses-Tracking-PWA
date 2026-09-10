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
    <div 
      className="w-full h-full flex flex-col overflow-hidden relative select-none bg-[#141115]"
      style={{
        '--space-label': '0.375rem',
        '--space-field': 'clamp(0.5rem, 1.5vh, 0.875rem)',
        '--space-action-gap': 'clamp(0.375rem, 1vh, 0.5rem)',
        '--control-height': 'clamp(2.375rem, 4.8vh, 2.75rem)',
        '--input-height-hero': 'clamp(2.75rem, 5.5vh, 3.25rem)',
        '--pill-height': 'clamp(2.25rem, 4.2vh, 2.5rem)',
        '--btn-height-primary': 'clamp(2.5rem, 5vh, 3rem)',
      }}
    >
      {/* Ambient Copper Background exactly like Settings & Dashboard */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
      </div>

      {/* Top Segmented Control (Expense / Income / Transfer) */}
      <div className="px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-1.5 shrink-0 z-20">
        <div className="flex bg-black/20 backdrop-blur-[10px] border border-white/5 p-1 rounded-full shadow-inner relative max-w-[340px] mx-auto w-full h-[var(--pill-height)] items-center">
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
                className="relative flex-1 h-full rounded-full text-[clamp(0.75rem,2vw,0.875rem)] font-semibold transition-colors duration-200 flex items-center justify-center z-10 active:scale-[0.97]"
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

      {/* Main Glass Container */}
      <div className="w-full flex-1 min-h-0 bg-[#2B2321]/30 backdrop-blur-[32px] rounded-t-[28px] sm:rounded-t-[32px] border-t border-white/10 px-4 sm:px-5 pt-3 sm:pt-4 pb-[calc(5.25rem+max(0.75rem,env(safe-area-inset-bottom)))] flex flex-col overflow-hidden relative z-10">

        {/* Form Fields Area - Balanced Vertical Rhythm */}
        <form onSubmit={handleSubmit} className="w-full flex-1 min-h-0 flex flex-col justify-between">

          {/* 1. Amount Section */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <label className="text-[clamp(0.75rem,1.8vh,0.8125rem)] font-medium text-white/70 tracking-wide mb-[var(--space-label)] text-center">
              {t('addTransaction.amount')}
            </label>
            <div className="flex items-center justify-center gap-2 relative w-full h-[var(--input-height-hero)]">
              <button
                type="button"
                onClick={() => setShowCalculator(true)}
                className="absolute start-1.5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
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
                className="bg-transparent text-center text-[clamp(2.125rem,5.2vh,2.625rem)] font-bold text-white focus:outline-none w-[auto] min-w-[70px] max-w-[220px] placeholder-white/25 tracking-tight leading-none h-full tabular-nums"
                style={{ caretColor: type === 'expense' ? '#FF5555' : type === 'income' ? '#34C759' : '#007AFF' }}
              />
              <span className="text-[clamp(0.8125rem,2vh,0.875rem)] text-white/80 font-semibold self-end pb-2">
                {t('nav.currency')}
              </span>
            </div>
            <div className="w-36 h-[1.5px] bg-gradient-to-r from-transparent via-[#8D6346]/40 to-transparent mx-auto mt-1" />
          </div>

          {/* 2. Date Segmented Control */}
          <div className="shrink-0">
            <label className="block text-[clamp(0.75rem,1.8vh,0.8125rem)] font-medium text-white/70 mb-[var(--space-label)] px-1">
              {t('addTransaction.date')}
            </label>
            <div className="flex bg-black/20 backdrop-blur-[10px] border border-white/5 p-1 rounded-full shadow-inner relative h-[var(--pill-height)] items-center">
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
                    className="relative flex-1 h-full rounded-full text-[clamp(0.75rem,1.8vh,0.8125rem)] font-medium transition-colors duration-200 flex items-center justify-center z-10 active:scale-[0.97]"
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
          <div className="shrink-0">
            <label className="block text-[clamp(0.75rem,1.8vh,0.8125rem)] font-medium text-white/70 mb-[var(--space-label)] px-1">
              {t('addTransaction.description')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('addTransaction.descPlaceholder')}
              className="w-full h-[var(--control-height)] bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full px-4 text-[clamp(0.8125rem,1.9vh,0.875rem)] text-white placeholder-white/35 focus:outline-none focus:border-[#8D6346] focus:bg-black/30 transition-all hover:bg-white/5"
            />
          </div>

          {/* 4 & 5. Accounts & Category */}
          {type === 'transfer' ? (
            <>
              <div className="shrink-0">
                <label className="block text-[clamp(0.75rem,1.8vh,0.8125rem)] font-medium text-white/70 mb-[var(--space-label)] px-1 truncate">
                  {t('addTransaction.fromAccount')}
                </label>
                <CustomSelect
                  value={fromAccount}
                  onChange={setFromAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('addTransaction.fromAccountPlaceholder')}
                  buttonClassName="w-full h-[var(--control-height)] bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full px-4 text-[clamp(0.8125rem,1.9vh,0.875rem)] font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 focus:outline-none focus:border-[#8D6346]"
                />
              </div>
              <div className="shrink-0">
                <label className="block text-[clamp(0.75rem,1.8vh,0.8125rem)] font-medium text-white/70 mb-[var(--space-label)] px-1 truncate">
                  {t('addTransaction.toAccount')}
                </label>
                <CustomSelect
                  value={toAccount}
                  onChange={setToAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('addTransaction.toAccountPlaceholder')}
                  buttonClassName="w-full h-[var(--control-height)] bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full px-4 text-[clamp(0.8125rem,1.9vh,0.875rem)] font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 focus:outline-none focus:border-[#8D6346]"
                />
              </div>
            </>
          ) : (
            <>
              <div className="shrink-0">
                <label className="block text-[clamp(0.75rem,1.8vh,0.8125rem)] font-medium text-white/70 mb-[var(--space-label)] px-1 truncate">
                  {t('addTransaction.account')}
                </label>
                <CustomSelect
                  value={account}
                  onChange={setAccount}
                  options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                  placeholder={t('addTransaction.accountPlaceholder')}
                  buttonClassName="w-full h-[var(--control-height)] bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full px-4 text-[clamp(0.8125rem,1.9vh,0.875rem)] font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 focus:outline-none focus:border-[#8D6346]"
                />
              </div>

              <div className="shrink-0">
                <label className="block text-[clamp(0.75rem,1.8vh,0.8125rem)] font-medium text-white/70 mb-[var(--space-label)] px-1 truncate">
                  {t('addTransaction.category')}
                </label>
                <CustomSelect
                  value={category}
                  onChange={setCategory}
                  options={categories[type] ? categories[type].map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon })) : []}
                  placeholder={t('addTransaction.categoryPlaceholder')}
                  buttonClassName="w-full h-[var(--control-height)] bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full px-4 text-[clamp(0.8125rem,1.9vh,0.875rem)] font-medium text-white flex items-center justify-between transition-all hover:bg-white/5 focus:outline-none focus:border-[#8D6346]"
                />
              </div>
            </>
          )}

          {/* Lower Action Buttons Group - Unified Pill Design */}
          <div className="flex flex-col gap-[var(--space-action-gap)] shrink-0">
            {/* 6. Recurring Settings Button */}
            {recurringSettings.repeatType === 'never' ? (
              <button
                type="button"
                onClick={() => setIsRecurringModalOpen(true)}
                className="w-full h-[var(--pill-height)] flex items-center justify-center gap-2 border border-dashed border-white/15 hover:border-white/25 rounded-full bg-black/20 backdrop-blur-[10px] shadow-inner transition-all duration-200 active:scale-[0.98]"
              >
                <Repeat className="w-3.5 h-3.5 text-white/60" />
                <span className="text-[clamp(0.8125rem,1.9vh,0.875rem)] font-semibold text-white/75">{t('recurring.addBtn')}</span>
              </button>
            ) : (
              <div className="w-full h-[var(--pill-height)] flex items-center justify-between px-4 border border-dashed border-[#8D6346]/40 rounded-full bg-[#8D6346]/10 backdrop-blur-[10px] shadow-inner transition-all duration-200">
                <div className="flex items-center gap-2">
                  <Repeat className="w-3.5 h-3.5 text-[#E8C5A8]" />
                  <span className="text-[clamp(0.8125rem,1.9vh,0.875rem)] font-semibold text-[#E8C5A8]">{t('recurring.settings')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRecurringModalOpen(true)}
                  className="px-3 py-1 bg-[#8D6346] hover:bg-[#734e35] rounded-full text-xs font-medium text-white transition-colors"
                >
                  {t('recurring.edit')}
                </button>
              </div>
            )}

            {/* 7. Confirm & Save Button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="submit"
              className="w-full h-[var(--btn-height-primary)] rounded-full font-bold text-[clamp(0.875rem,2vh,1rem)] text-white shadow-inner transition-colors duration-200 bg-[#8D6346]/25 backdrop-blur-[10px] border border-[#8D6346]/40 hover:bg-[#8D6346]/35 flex items-center justify-center gap-2 active:bg-[#8D6346]/45"
            >
              {t('addTransaction.submit')}
            </motion.button>
          </div>
        </form>
      </div>
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
