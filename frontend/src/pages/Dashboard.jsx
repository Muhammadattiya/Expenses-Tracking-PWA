import { useState, useEffect, useMemo } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, ChevronLeft, ChevronDown, Info, ArrowRight } from "lucide-react";
import { GroupedVirtuoso } from 'react-virtuoso';
import { DashboardSummarySkeleton, ListSkeleton } from "../components/ui/Skeletons";

import {
    getAccounts,
} from "../api/accounts";

import {
  getTransactions,
  deleteTransaction,
} from "../api/transactions";
import { getDebts } from "../api/debts";
import { getSurvival } from "../api/forecast";
import { getCurrentUser } from "../api/auth";
import TransactionCard from "../components/cards/TransactionCard";
import EditTransactionModal from "../components/modals/EditTransactionModal";
import CustomSelect from "../components/ui/CustomSelect";
import { useNotification } from "../contexts/NotificationContext";
import ConfirmModal from '../components/modals/ConfirmModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [allTransactions, setAllTransactions] = useState([]);
  const [allDebtTransactions, setAllDebtTransactions] = useState([]);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [referenceDate, setReferenceDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [userPrefs, setUserPrefs] = useState({ budgetPeriod: 'monthly', budgetStartDayMonthly: 1, budgetStartDayWeekly: 6 });
  const [survival, setSurvival] = useState(null);
  
  const { periodStart, periodEnd } = useMemo(() => {
    let start = new Date(referenceDate);
    let end = new Date(referenceDate);
    
    if (userPrefs.budgetPeriod === 'weekly') {
      const prefWeekStart = userPrefs.budgetStartDayWeekly !== undefined ? userPrefs.budgetStartDayWeekly : 6;
      let day = start.getDay();
      let diff = day >= prefWeekStart ? day - prefWeekStart : 7 - (prefWeekStart - day);
      
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      const prefMonthStart = userPrefs.budgetStartDayMonthly || 1;
      const lastDayOfCurrentMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const actualMonthStartDay = Math.min(prefMonthStart, lastDayOfCurrentMonth);

      if (start.getDate() < actualMonthStartDay) {
        const lastDayOfPrevMonth = new Date(start.getFullYear(), start.getMonth(), 0).getDate();
        start = new Date(start.getFullYear(), start.getMonth() - 1, Math.min(prefMonthStart, lastDayOfPrevMonth));
      } else {
        start = new Date(start.getFullYear(), start.getMonth(), actualMonthStartDay);
      }
      
      start.setHours(0, 0, 0, 0);

      end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    }
    
    return { periodStart: start, periodEnd: end };
  }, [referenceDate, userPrefs]);
  
  const [totals, setTotals] = useState({ balance: 0, income: 0, expense: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { showToast } = useNotification();

  // Swipe logic using native touch events
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [direction, setDirection] = useState(0);

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe || isRightSwipe) {
      const activeAccounts = accounts.filter(a => !a.isArchived);
      const accountIds = ['all', ...activeAccounts.map(a => a._id)];
      const currentIndex = accountIds.indexOf(selectedAccount);
      let newIndex = currentIndex;
      
      // For RTL, swipe left (finger right->left) = next
      if (isLeftSwipe) {
        newIndex = (currentIndex + 1) % accountIds.length;
        setDirection(1);
      } else if (isRightSwipe) {
        newIndex = (currentIndex - 1 + accountIds.length) % accountIds.length;
        setDirection(-1);
      }
      setSelectedAccount(accountIds[newIndex]);
    }
  };

  const fetchData = async () => {
    try {
      const [transactionsData, accountsData, userData, debtsData, survivalData] = await Promise.all([
        getTransactions(),
        getAccounts(),
        getCurrentUser().catch(() => null),
        getDebts().catch(() => ({ debts: [], transactions: [] })),
        getSurvival().catch(() => null)
      ]);

      setAllTransactions(transactionsData);
      setAccounts(accountsData);
      setAllDebtTransactions(debtsData.transactions || []);
      setSurvival(survivalData);
      if (userData && userData.preferences) {
        setUserPrefs({
          budgetPeriod: userData.preferences.budgetPeriod || 'monthly',
          budgetStartDayMonthly: userData.preferences.budgetStartDayMonthly || 1,
          budgetStartDayWeekly: userData.preferences.budgetStartDayWeekly ?? 6
        });
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

  useEffect(() => {
    // Separate completed from pending
    const completedTransactions = allTransactions.filter(t => !t.status || t.status === 'completed');
    const pending = allTransactions.filter(t => t.status === 'pending_review' || t.status === 'needs_manual_review');
    setPendingTransactions(pending);

    // فلترة المعاملات المكتملة بناءً على الحساب المختار (لكي نحسب الرصيد الإجمالي)
    const filtered = completedTransactions.filter(t => {
      if (selectedAccount === 'all') return true;
      return (t.account?._id || t.account) === selectedAccount || (t.from_account?._id || t.from_account) === selectedAccount || (t.to_account?._id || t.to_account) === selectedAccount;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;
    let totalSettlements = 0;
    let totalAdjustments = 0;

    if (selectedAccount === 'all') {
      totalAdjustments = accounts.reduce((sum, acc) => sum + (acc.balance_adjustment || 0), 0);
    } else {
      const acc = accounts.find(a => a._id === selectedAccount);
      totalAdjustments = acc?.balance_adjustment || 0;
    }

    filtered.forEach(t => {
      const tDate = new Date(t.date);
      const isCurrentPeriod = tDate >= periodStart && tDate <= periodEnd;

      if (t.type === 'income') {
        totalIncome += t.amount;
        if (isCurrentPeriod) currentMonthIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpense += t.amount;
        if (isCurrentPeriod) currentMonthExpense += t.amount;
      } else if (t.type === 'transfer') {
        if (selectedAccount !== 'all') {
          if ((t.to_account?._id || t.to_account) === selectedAccount) {
            totalIncome += t.amount;
            if (isCurrentPeriod) currentMonthIncome += t.amount;
          }
          if ((t.from_account?._id || t.from_account) === selectedAccount) {
            totalExpense += t.amount;
            if (isCurrentPeriod) currentMonthExpense += t.amount;
          }
        }
      } else if (t.type === 'settlement') {
        totalSettlements += t.amount;
      }
    });

    const getAccountBalance = (account) => {
      let bal = account.balance_adjustment || 0;
      completedTransactions.forEach(t => {
        if (t.type === 'income' && (t.account?._id || t.account) === account._id) bal += t.amount;
        else if (t.type === 'expense' && (t.account?._id || t.account) === account._id) bal -= t.amount;
        else if (t.type === 'transfer') {
          if ((t.to_account?._id || t.to_account) === account._id) bal += t.amount;
          if ((t.from_account?._id || t.from_account) === account._id) bal -= t.amount;
        } else if (t.type === 'settlement' && (t.account?._id || t.account) === account._id) bal += t.amount;
      });

      allDebtTransactions.forEach(dt => {
        if ((dt.account?._id || dt.account) === account._id) {
          if (dt.type === 'loan') {
            if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') bal += dt.amount; // Borrowed money -> got money
            else bal -= dt.amount; // Lent money -> lost money
          } else if (dt.type === 'repayment') {
            if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') bal -= dt.amount; // Repaid money -> lost money
            else bal += dt.amount; // Got paid back -> got money
          }
        }
      });
      
      return bal;
    };

    let calculatedBalance = 0;
    if (selectedAccount === 'all') {
      calculatedBalance = accounts
        .filter(acc => !acc.excludeFromTotal && !acc.isArchived)
        .reduce((sum, acc) => sum + getAccountBalance(acc), 0);
    } else {
      const acc = accounts.find(a => a._id === selectedAccount);
      if (acc) {
        calculatedBalance = getAccountBalance(acc);
      }
    }

    setTotals({
      income: currentMonthIncome,
      expense: currentMonthExpense,
      balance: calculatedBalance
    });
  }, [allTransactions, selectedAccount, periodStart, periodEnd, accounts]);

  const displayedTransactions = useMemo(() => {
    const completedTransactions = allTransactions.filter(t => !t.status || t.status === 'completed');
    return completedTransactions.filter(t => {
      if (selectedAccount !== 'all' && (t.account?._id || t.account) !== selectedAccount && (t.from_account?._id || t.from_account) !== selectedAccount && (t.to_account?._id || t.to_account) !== selectedAccount) {
        return false;
      }
      const tDate = new Date(t.date);
      if (tDate < periodStart || tDate > periodEnd) {
        return false;
      }
      return true;
    });
  }, [allTransactions, selectedAccount, periodStart, periodEnd]);

  const { groupedTransactions, sortedDates, groupCounts } = useMemo(() => {
    const getCreationTime = (t) => {
      if (t.createdAt) return new Date(t.createdAt).getTime();
      if (t._id && typeof t._id === 'string' && t._id.length === 24) {
        return parseInt(t._id.substring(0, 8), 16) * 1000;
      }
      return 0;
    };

    // Sort transactions first by date descending, then by creation time descending
    const sortedTransactions = [...displayedTransactions].sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      
      return getCreationTime(b) - getCreationTime(a);
    });

    const grouped = sortedTransactions.reduce((acc, curr) => {
      const d = new Date(curr.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!acc[key]) acc[key] = { items: [], income: 0, expense: 0 };
      
      acc[key].items.push(curr);

      if (curr.type === 'income') acc[key].income += curr.amount;
      else if (curr.type === 'expense') acc[key].expense += curr.amount;
      else if (curr.type === 'transfer' && selectedAccount !== 'all') {
        if ((curr.to_account?._id || curr.to_account) === selectedAccount) acc[key].income += curr.amount;
        if ((curr.from_account?._id || curr.from_account) === selectedAccount) acc[key].expense += curr.amount;
      } else if (curr.type === 'settlement' && selectedAccount !== 'all') {
        if ((curr.account?._id || curr.account) === selectedAccount) acc[key].income += curr.amount;
      }
      
      return acc;
    }, {});
    
    const sorted = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    const counts = sorted.map(date => grouped[date].items.length);
    
    return { groupedTransactions: grouped, sortedDates: sorted, groupCounts: counts };
  }, [displayedTransactions]);

  const handleTransactionClick = (transaction) => {
    setSelectedTransaction(transaction);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    setEditModalOpen(false);
    setSelectedTransaction(null);
    fetchData(); // Reload data
  };

  const confirmDeleteTransaction = async (transaction) => {
    try {
      await deleteTransaction(transaction._id);
      setAllTransactions(prev=>prev.filter(t=>t._id!==transaction._id));
      setEditModalOpen(false);
      setSelectedTransaction(null);
    } catch(error){
      showToast(error.response?.data?.message || t('common.deleteError', 'حدث خطأ أثناء الحذف'), 'error');
    }
  };

  const handlePrevPeriod = () => {
    setReferenceDate(prev => {
      const d = new Date(prev);
      if (userPrefs.budgetPeriod === 'weekly') d.setDate(d.getDate() - 7);
      else d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextPeriod = () => {
    setReferenceDate(prev => {
      const d = new Date(prev);
      if (userPrefs.budgetPeriod === 'weekly') d.setDate(d.getDate() + 7);
      else d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in p-4 space-y-6">
        <DashboardSummarySkeleton />
        <ListSkeleton count={10} />
      </div>
    );
  }
  
  const getPeriodLabel = () => {
    const now = new Date();
    const isCurrentPeriod = now >= periodStart && now <= periodEnd;
    
    if (userPrefs.budgetPeriod === 'weekly') {
      if (isCurrentPeriod) return t('dashboard.thisWeek', 'هذا الأسبوع');
      return `${t('dashboard.weekOf', 'أسبوع')} ${periodStart.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}`;
    } else {
      if (isCurrentPeriod) return t('dashboard.thisMonth', 'هذا الشهر');
      return periodStart.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="animate-fade-in overflow-x-hidden w-full">
      
      {/* قسم الإحصائيات العلوية مدمج فيه فلتر الحسابات */}
      <div 
        className="relative overflow-hidden glass-panel p-3 rounded-[1.5rem] shadow-xl mb-4 select-none max-w-[320px] mx-auto transition-transform active:scale-95 duration-200"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/20 rounded-full blur-[40px] -mr-8 -mt-8 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-[40px] -ml-8 -mb-8 pointer-events-none"></div>
        
        <div key={selectedAccount} className="relative z-50 flex flex-col items-center animate-fade-in">
          <div className="flex justify-center mb-1.5 w-full z-50 relative">
            <div className="w-48">
              <CustomSelect
                value={selectedAccount}
                onChange={setSelectedAccount}
                options={[
                  { value: 'all', label: t('common.allAccounts', 'جميع الحسابات'), icon: 'Globe', color: '#ffffff' },
                  ...accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))
                ]}
              />
            </div>
          </div>

            <div className="w-full">
          {/* Period Selector */}
          <div className="flex justify-between items-center mb-2 w-full">
            <button onClick={handlePrevPeriod} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 shadow-sm backdrop-blur-md active:scale-95">
              <ChevronLeft className={`w-5 h-5 text-[var(--color-text-main)] ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex flex-col items-center">
              <div 
                className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full" 
                onClick={() => {
                  const dateStr = `${periodStart.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })} - ${periodEnd.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                  showToast(`${dateStr} — ${t('dashboard.changeSettingsInfo', 'يمكنك تغيير هذا النظام من الإعدادات')}`, 'info');
                }}
              >
                <span className="text-sm font-bold text-[var(--color-text-main)] tracking-wider">
                  {getPeriodLabel()}
                </span>
                <Info className="w-3.5 h-3.5 text-brand-blue" />
              </div>
            </div>
            <button onClick={handleNextPeriod} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 shadow-sm backdrop-blur-md active:scale-95">
              <ChevronRight className={`w-5 h-5 text-[var(--color-text-main)] ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <p className="text-[var(--color-text-muted)] text-xs mb-0 text-center font-medium">{t('nav.totalBalance', 'إجمالي الرصيد')}</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-center text-[var(--color-text-main)] mb-2 tracking-tight">
            {totals.balance.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} <span className="text-lg text-[var(--color-text-muted)] font-medium tracking-normal">{t('nav.currency', 'EGP')}</span>
          </h1>

          <div className="flex justify-between gap-2">
            <div className="flex-1 bg-[var(--color-surface)] rounded-xl p-2 flex flex-col items-center border border-[var(--color-border)] backdrop-blur-md">
              <div className="bg-brand-green/20 p-0.5 rounded-lg mb-0.5">
                <ArrowDown className="w-4 h-4 text-brand-green" />
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5 font-medium">{t('nav.income', 'الدخل')}</p>
              <p className="font-bold text-[var(--color-text-main)] text-sm">{totals.income.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
            </div>

            <div className="flex-1 bg-[var(--color-surface)] rounded-xl p-2 flex flex-col items-center border border-[var(--color-border)] backdrop-blur-md">
              <div className="bg-brand-red/20 p-0.5 rounded-lg mb-0.5">
                <ArrowUp className="w-4 h-4 text-brand-red" />
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mb-0.5 font-medium">{t('nav.expense', 'المصروفات')}</p>
              <p className="font-bold text-[var(--color-text-main)] text-sm">{totals.expense.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
            </div>
          </div>
          </div>
        </div>
      </div>

      {survival && (
        survival.hasIncomeProfile === true ? (
          <div className={`mb-6 p-4 rounded-[1.5rem] border backdrop-blur-md flex items-center justify-between gap-4 transition-transform active:scale-95 cursor-pointer 
            ${survival.risk === 'Safe' ? 'bg-emerald-500/10 border-emerald-500/20' : 
              survival.risk === 'Low Risk' ? 'bg-blue-500/10 border-blue-500/20' : 
              survival.risk === 'Medium Risk' ? 'bg-amber-500/10 border-amber-500/20' : 
              'bg-rose-500/10 border-rose-500/20'}`}
            onClick={() => navigate('/analytics?tab=insights&focus=payday')}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Payday Survival</p>
              <p className="text-lg font-bold text-[var(--color-text-main)]">{survival.risk}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Next income in {survival.daysUntilIncome !== undefined ? survival.daysUntilIncome : '?'} days</p>
              {survival.runOutDate ? (
                <p className="text-[10px] text-rose-300/90 mt-1 font-medium">Runs out approx. {new Date(survival.runOutDate).toLocaleDateString()}</p>
              ) : (
                <p className="text-[10px] text-emerald-300/90 mt-1 font-medium">Extra Safe Days: {survival.financialBuffer}</p>
              )}
            </div>
            <div className="flex flex-col items-end">
               <div className="p-2 rounded-xl bg-black/20">
                 {survival.risk === 'High Risk' ? <ArrowDown className="text-rose-400 w-5 h-5" /> : 
                  <ArrowUp className="text-emerald-400 w-5 h-5" />}
               </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-[1.5rem] border border-white/5 bg-white/5 backdrop-blur-md flex items-center justify-between gap-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => navigate('/settings?tab=income')}>
             <div>
               <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1 text-brand-blue">Payday Survival</p>
               <p className="text-sm font-bold text-[var(--color-text-main)]">Unlock Predictions</p>
               <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Add an Income Profile to predict your survival until payday.</p>
             </div>
             <div className="p-2 rounded-xl bg-brand-blue/20 flex-shrink-0">
                <ArrowRight className="text-brand-blue w-5 h-5" />
             </div>
          </div>
        )
      )}

      {pendingTransactions.length > 0 && (
        <div className="mb-6 p-4 rounded-[2rem] border border-orange-500/30 bg-orange-500/10">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-orange-400 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              {t('dashboard.pendingReview', 'معاملات قيد المراجعة')} ({pendingTransactions.length})
            </h3>
          </div>
          <div className="flex flex-col gap-2">
            {pendingTransactions.map(pt => (
              <div key={pt._id} className="flex justify-between items-center p-3 rounded-xl bg-black/20 border border-white/5">
                <div>
                  <p className="font-semibold text-[var(--color-text-main)] text-sm">{pt.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{new Date(pt.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')} • {pt.amount} {t('nav.currency', 'EGP')}</p>
                </div>
                <button 
                  onClick={() => handleTransactionClick(pt)}
                  className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-400 text-xs font-semibold hover:bg-orange-500/30 transition-colors"
                >
                  {t('dashboard.reviewBtn', 'مراجعة')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* قسم المعاملات بناءً على الفلتر */}
      <div className="mb-4 flex justify-between items-end">
        <h2 className="text-xl font-bold text-[var(--color-text-main)]">
          {selectedAccount === 'all' ? t('dashboard.transactions', 'المعاملات') : `${t('dashboard.transactionsFor', 'معاملات:')} ${accounts.find(a => a._id === selectedAccount)?.name}`}
        </h2>
      </div>

      <div className="w-full pb-4">
        {displayedTransactions.length === 0 ? (
          <div className="text-center text-[var(--color-text-muted)] py-12 glass-panel rounded-[2rem] font-medium flex flex-col items-center gap-3">
            <p>{t('dashboard.noTransactions', 'لا توجد معاملات في هذه الفترة')}</p>
          </div>
        ) : (
          <GroupedVirtuoso
            useWindowScroll
            groupCounts={groupCounts}
            className="w-full hide-scrollbar"
            groupContent={(index) => {
              const dateKey = sortedDates[index];
              const dateObj = new Date(dateKey);
              const { income, expense } = groupedTransactions[dateKey];
              return (
                <div className="bg-[var(--color-bg-main)]/90 backdrop-blur-md py-2 z-10 sticky top-0">
                  <div className="flex flex-col gap-1.5 border-b border-[var(--color-border)] pb-2 px-2">
                    <h3 className="text-[var(--color-text-muted)] text-sm font-semibold flex justify-between items-center">
                      <span>{dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long' })}</span>
                      <span>{dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'numeric', day: 'numeric' })}</span>
                    </h3>
                    {(income > 0 || expense > 0) && (
                      <div className="flex gap-2 justify-start items-center">
                        {income > 0 && (
                          <div className="flex items-center gap-1 bg-brand-green/10 px-2 py-0.5 rounded-lg border border-brand-green/20">
                            <ArrowDown className="w-3 h-3 text-brand-green" />
                            <span className="text-xs font-bold text-brand-green">{income.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                          </div>
                        )}
                        {expense > 0 && (
                          <div className="flex items-center gap-1 bg-brand-red/10 px-2 py-0.5 rounded-lg border border-brand-red/20">
                            <ArrowUp className="w-3 h-3 text-brand-red" />
                            <span className="text-xs font-bold text-brand-red">{expense.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
            itemContent={(index, groupIndex) => {
              const dateKey = sortedDates[groupIndex];
              const transactionsForGroup = groupedTransactions[dateKey].items;
              // Calculate the item's index within its group to find it
              let offset = 0;
              for(let i=0; i<groupIndex; i++) offset += groupCounts[i];
              const itemIndexInGroup = index - offset;
              const transaction = transactionsForGroup[itemIndexInGroup];
              
              if (!transaction) return null;
              
              return (
                <div className="pb-3">
                  <TransactionCard
                    transaction={transaction}
                    onClick={handleTransactionClick}
                  />
                </div>
              );
            }}
          />
        )}
      </div>

      <EditTransactionModal
        open={editModalOpen}
        transaction={selectedTransaction}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTransaction(null);
        }}
        onDelete={confirmDeleteTransaction}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default Dashboard;
