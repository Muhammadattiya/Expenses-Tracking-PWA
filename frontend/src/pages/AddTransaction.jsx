import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Repeat, CheckCircle2, Loader2 } from "lucide-react";

import { getAccounts } from "../api/accounts";
import { getCategories } from "../api/categories";
import { createTransaction } from "../api/transactions";
import { createRecurringTransaction } from "../api/recurringTransactions";
import CustomDatePicker from "../components/ui/CustomDatePicker";
import CustomSelect from "../components/ui/CustomSelect";
import RecurringSettingsModal from "../components/modals/RecurringSettingsModal";
import { payBill } from "../api/bills";
import { useNotification } from "../contexts/NotificationContext";
import { useLanguage } from "../contexts/LanguageContext";

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
        showToast(t('addTransaction.selectAccounts', 'يرجى تحديد الحسابات المعنية.'), 'warning');
        return;
      }
      payload.from_account = fromAccount;
      payload.to_account = toAccount;
    } else {
      if (!account || !category) {
        showToast(t('addTransaction.selectAccountAndCategory', 'يرجى تحديد الحساب والفئة.'), 'warning');
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

      showToast(t('addTransaction.successMsg', 'تم تسجيل المعاملة بنجاح!'), 'success');
      
      if (billId) {
        navigate('/bills');
      }
    } catch (error) {
      console.error('❌ خطأ في حفظ المعاملة:', error);
      showToast(error.response?.data?.message || t('addTransaction.errorMsg', 'حدث خطأ أثناء حفظ المعاملة.'), 'error');
    }
  };

  // شاشة تحميل بسيطة لو البيانات لسه بتيجي من السيرفر
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pt-8 animate-fade-in">
      <h2 className="text-2xl font-bold mb-8 text-center tracking-wide text-[var(--color-text-main)]">
        {t('addTransaction.title', 'إضافة معاملة')}
      </h2>

      {/* Segmented Control */}
      <div className="flex bg-black/10 dark:bg-black/30 p-1.5 rounded-[1.5rem] mb-10 border border-[var(--color-border)] shadow-inner">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-brand-red text-[var(--color-text-main)] shadow-[0_4px_12px_rgba(255,59,48,0.3)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
        >
          <ArrowUp className="h-4 w-4" /> {t('addTransaction.expense', 'مصروف')}
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${type === 'income' ? 'bg-brand-green text-[var(--color-text-main)] shadow-[0_4px_12px_rgba(52,199,89,0.3)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
        >
          <ArrowDown className="h-4 w-4" /> {t('addTransaction.income', 'دخل')}
        </button>
        <button
          type="button"
          onClick={() => setType('transfer')}
          className={`flex-1 py-3 rounded-2xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 ${type === 'transfer' ? 'bg-brand-blue text-[var(--color-text-main)] shadow-[0_4px_12px_rgba(0,122,255,0.3)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
            }`}
        >
          <Repeat className="h-4 w-4" /> {t('addTransaction.transfer', 'تحويل')}
        </button>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6 glass-panel p-6 rounded-[2rem]">

        {/* Massive Amount Input */}
        <div className="mb-2 flex flex-col items-center justify-center py-4 border-b border-white/5">
          <label className="text-xs text-[var(--color-text-muted)] font-bold mb-2 uppercase tracking-widest">{t('addTransaction.amount', 'المبلغ')}</label>
          <div className="flex items-end justify-center gap-2 w-full">
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="bg-transparent text-center text-6xl font-bold text-[var(--color-text-main)] focus:outline-none w-full max-w-[220px] placeholder-gray-800 transition-colors"
              style={{ caretColor: type === 'expense' ? '#FF3B30' : type === 'income' ? '#34C759' : '#007AFF' }}
            />
            <span className="text-xl text-[var(--color-text-muted)] font-medium mb-2">{t('nav.currency', 'ج.م')}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 ml-1 tracking-wide">{t('addTransaction.description', 'الوصف')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('addTransaction.descPlaceholder', 'مثال: غداء، تحويل لكاش...')}
            className="field"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 ml-1 tracking-wide">{t('addTransaction.date', 'التاريخ')}</label>
          <div className="flex bg-black/10 dark:bg-black/30 p-1.5 rounded-[1.2rem] border border-[var(--color-border)] shadow-inner">
            <button
              type="button"
              onClick={() => setDate(todayStr)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${isToday ? 'bg-brand-blue text-[var(--color-text-main)] shadow-[0_4px_12px_rgba(0,122,255,0.3)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
            >
              {t('addTransaction.today', 'اليوم')}
            </button>
            <button
              type="button"
              onClick={() => setDate(yesterdayStr)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${isYesterday ? 'bg-brand-blue text-[var(--color-text-main)] shadow-[0_4px_12px_rgba(0,122,255,0.3)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
            >
              {t('addTransaction.yesterday', 'أمس')}
            </button>
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(true)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${isCustom ? 'bg-brand-blue text-[var(--color-text-main)] shadow-[0_4px_12px_rgba(0,122,255,0.3)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`}
            >
              {isCustom ? date : t('addTransaction.customDate', 'تاريخ')}
            </button>
          </div>
        </div>

        {type === 'transfer' ? (
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-brand-blue mb-2 ml-1 tracking-wide">{t('addTransaction.fromAccount', 'من حساب')}</label>
              <CustomSelect
                value={fromAccount}
                onChange={setFromAccount}
                options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                placeholder={t('addTransaction.fromAccountPlaceholder', 'اختر حساب التحويل')}
              />
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold text-brand-green mb-2 ml-1 tracking-wide">{t('addTransaction.toAccount', 'إلى حساب')}</label>
              <CustomSelect
                value={toAccount}
                onChange={setToAccount}
                options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                placeholder={t('addTransaction.toAccountPlaceholder', 'اختر حساب الاستلام')}
              />
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 ml-1 tracking-wide">{t('addTransaction.account', 'الحساب')}</label>
              <CustomSelect
                value={account}
                onChange={setAccount}
                options={accounts.filter(acc => !acc.isArchived).map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))}
                placeholder={t('addTransaction.accountPlaceholder', 'اختر الحساب...')}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 ml-1 tracking-wide">{t('addTransaction.category', 'الفئة')}</label>
              <CustomSelect
                value={category}
                onChange={setCategory}
                options={categories[type].map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon }))}
                placeholder={t('addTransaction.categoryPlaceholder', 'اختر الفئة...')}
              />
            </div>
          </>
        )}

        {/* إعدادات التكرار (iOS Style Row) */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsRecurringModalOpen(true)}
            className="w-full flex items-center justify-between bg-black/10 dark:bg-black/30 p-4 rounded-xl border border-[var(--color-border)] shadow-inner transition-colors hover:bg-black/20"
          >
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${recurringSettings.repeatType !== 'never' ? 'bg-brand-blue/20 text-brand-blue' : 'bg-gray-500/20 text-gray-400'}`}>
                <Repeat className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-[var(--color-text-main)]">{t('recurring.settings', 'إعدادات التكرار')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                {recurringSettings.repeatType === 'never' ? t('recurring.never', 'بدون تكرار') : t(`recurring.${recurringSettings.repeatType}`, recurringSettings.repeatType)}
              </span>
              <span className="text-[var(--color-text-muted)] opacity-50">&gt;</span>
            </div>
          </button>
        </div>

        <button
          type="submit"
          className={`w-full flex items-center justify-center gap-2 py-4 mt-8 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 active:scale-95 ${type === 'expense' ? 'bg-brand-red hover:bg-red-600 text-[var(--color-text-main)]' :
              type === 'income' ? 'bg-brand-green hover:bg-green-600 text-[var(--color-text-main)]' :
                'bg-brand-blue hover:bg-blue-600 text-[var(--color-text-main)]'
            }`}
        >
          <CheckCircle2 className="h-6 w-6" />
          {t('addTransaction.submit', 'تأكيد وحفظ')}
        </button>
      </form>

      {isDatePickerOpen && (
        <CustomDatePicker
          value={date}
          onChange={setDate}
          onClose={() => setIsDatePickerOpen(false)}
        />
      )}

      <RecurringSettingsModal 
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        initialSettings={recurringSettings}
        onSave={setRecurringSettings}
      />
    </div>
  );
};

export default AddTransaction;
