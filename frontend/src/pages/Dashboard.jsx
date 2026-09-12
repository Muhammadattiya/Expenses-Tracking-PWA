import { useState, useEffect, useMemo } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, ChevronLeft, ChevronDown, Info, ArrowRight, Mic, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { GroupedVirtuoso } from 'react-virtuoso';
import { DashboardSummarySkeleton, ListSkeleton } from "../components/ui/Skeletons";

import {
    getAccounts,
} from "../api/accounts";

import {
  getTransactions,
  deleteTransaction,
} from "../api/transactions";
import { getCategories } from "../api/categories";
import { getDebts } from "../api/debts";
import { getSurvival } from "../api/forecast";
import { getReceivables } from "../api/receivables";
import { getCurrentUser, resetOnboarding } from "../api/auth";
import { getInvestments, getGoldPrice } from "../api/investments";
import { getActiveUserId } from "../utils/offlineSession";
import TransactionCard from "../components/cards/TransactionCard";
import EditTransactionModal from "../components/modals/EditTransactionModal";
import QuickAddModal from "../components/modals/QuickAddModal";
import CustomSelect from "../components/ui/CustomSelect";
import { useNotification } from "../contexts/NotificationContext";
import ConfirmModal from '../components/modals/ConfirmModal';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';

const Dashboard = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [allTransactions, setAllTransactions] = useState([]);
  const [allDebtTransactions, setAllDebtTransactions] = useState([]);
  const [allReceivables, setAllReceivables] = useState(() => {
    try {
      const activeUser = getActiveUserId();
      if (!activeUser) return [];
      const cached = localStorage.getItem(`finova_cache_receivables_${activeUser}`);
      return cached ? JSON.parse(cached) : [];
    } catch (e) { return []; }
  });
  const [investmentsValue, setInvestmentsValue] = useState(() => {
    try {
      const activeUser = getActiveUserId();
      if (!activeUser) return 0;
      const cached = localStorage.getItem(`finova_cache_investments_val_${activeUser}`);
      return cached ? Number(cached) : 0;
    } catch (e) { return 0; }
  });
  const [uncategorizedTransactions, setUncategorizedTransactions] = useState([]);
  const [skippedTransactionIds, setSkippedTransactionIds] = useState(new Set());
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [referenceDate, setReferenceDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [userPrefs, setUserPrefs] = useState({ trackingPeriod: 'monthly', trackingStartDayMonthly: 1, trackingStartDayWeekly: 6 });
  const [survival, setSurvival] = useState(null);
  
  const { periodStart, periodEnd } = useMemo(() => {
    let start = new Date(referenceDate);
    let end = new Date(referenceDate);
    
    if (userPrefs.trackingPeriod === 'weekly') {
      const prefWeekStart = userPrefs.trackingStartDayWeekly !== undefined ? userPrefs.trackingStartDayWeekly : 6;
      let day = start.getDay();
      let diff = day >= prefWeekStart ? day - prefWeekStart : 7 - (prefWeekStart - day);
      
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      const prefMonthStart = userPrefs.trackingStartDayMonthly !== undefined ? userPrefs.trackingStartDayMonthly : 1;
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
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const { showToast } = useNotification();

  // Swipe logic using native touch events
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [direction, setDirection] = useState(0);

  const handleDragEnd = (event, info) => {
    const isLeftSwipe = info.offset.x < -50;
    const isRightSwipe = info.offset.x > 50;
    
    if (isLeftSwipe || isRightSwipe) {
      const activeAccounts = accounts.filter(a => !a.isArchived);
      const accountIds = ['all', ...activeAccounts.map(a => a._id)];
      const currentIndex = accountIds.indexOf(selectedAccount);
      let newIndex = currentIndex;
      
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
      const [transactionsData, accountsData, userData, debtsData, survivalData, receivablesData, categoriesData, investmentsData, goldPriceData] = await Promise.all([
        getTransactions(),
        getAccounts(),
        getCurrentUser().catch(() => null),
        getDebts().catch(() => ({ debts: [], transactions: [] })),
        getSurvival().catch(() => null),
        getReceivables().catch(() => null),
        getCategories().catch(() => []),
        getInvestments().catch(() => null),
        getGoldPrice().catch(() => null)
      ]);

      setAllTransactions(transactionsData);
      setAccounts(accountsData);
      setCategories(categoriesData || []);
      if (debtsData?.transactions) {
        setAllDebtTransactions(debtsData.transactions);
      }
      if (receivablesData && Array.isArray(receivablesData)) {
        setAllReceivables(receivablesData);
        try { 
          const activeUser = getActiveUserId();
          if (activeUser) {
            localStorage.setItem(`finova_cache_receivables_${activeUser}`, JSON.stringify(receivablesData));
          }
        } catch(e){}
      }
      
      if (investmentsData && investmentsData.length > 0) {
        let invValue = 0;
        investmentsData.forEach(inv => {
          if (inv.type === 'gold' && goldPriceData) {
            const currentPrice = inv.karat === 24 ? goldPriceData.perGram24 : goldPriceData.perGram21;
            invValue += Number(inv.quantity) * currentPrice;
          } else {
            invValue += Number(inv.quantity) * Number(inv.currentPrice || inv.purchasePrice);
          }
        });
        setInvestmentsValue(invValue);
        try { 
          const activeUser = getActiveUserId();
          if (activeUser) {
            localStorage.setItem(`finova_cache_investments_val_${activeUser}`, String(invValue));
          }
        } catch(e){}
      }
      if (survivalData) {
        setSurvival(survivalData);
      }
      if (userData && userData.preferences) {
        setUserPrefs({
          trackingPeriod: userData.preferences.trackingPeriod || 'monthly',
          trackingStartDayMonthly: userData.preferences.trackingStartDayMonthly || 1,
          trackingStartDayWeekly: userData.preferences.trackingStartDayWeekly || 6
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
    const handleDataUpdated = (e) => {
      // Targeted instant update for local transaction creation
      if (e?.detail?.action === 'LOCAL_TRANSACTION_CREATED' && e.detail.transaction) {
        const newTx = e.detail.transaction;
        setAllTransactions(prev => {
          const exists = prev.some(t => 
            t._id === newTx._id || 
            (newTx.idempotencyKey && t.idempotencyKey === newTx.idempotencyKey)
          );
          if (exists) return prev;
          return [newTx, ...prev];
        });
        return;
      }
      fetchData();
    };
    window.addEventListener('finova-data-updated', handleDataUpdated);
    return () => window.removeEventListener('finova-data-updated', handleDataUpdated);
  }, []);

  const matchesAcc = (accField, targetId) => {
    if (!accField || !targetId) return false;
    return (accField._id || accField).toString() === targetId.toString();
  };

  useEffect(() => {
    // Separate completed from pending, deduplicating by idempotencyKey to prevent double-counting
    const seenKeys = new Set();
    const completedTransactions = [];
    for (const t of allTransactions) {
      if (t.status && t.status !== 'completed' && t.status !== 'pending') continue;
      if (t.idempotencyKey) {
        if (seenKeys.has(t.idempotencyKey)) continue;
        seenKeys.add(t.idempotencyKey);
      }
      completedTransactions.push(t);
    }

    const pending = allTransactions.filter(t => !t.category && ['income', 'expense'].includes(t.type) && !skippedTransactionIds.has(t._id));
    setUncategorizedTransactions(pending);

    // Filter transactions based on selected account
    const filtered = completedTransactions.filter(t => {
      if (selectedAccount === 'all') return true;
      return matchesAcc(t.account, selectedAccount) || matchesAcc(t.from_account, selectedAccount) || matchesAcc(t.to_account, selectedAccount);
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
      const tAmount = Number(t.amount) || 0;

      if (t.type === 'income') {
        totalIncome += tAmount;
        if (isCurrentPeriod) currentMonthIncome += tAmount;
      } else if (t.type === 'expense') {
        totalExpense += tAmount;
        if (isCurrentPeriod) currentMonthExpense += tAmount;
      } else if (t.type === 'transfer') {
        if (selectedAccount !== 'all') {
          if (matchesAcc(t.to_account, selectedAccount)) {
            totalIncome += tAmount;
            if (isCurrentPeriod) currentMonthIncome += tAmount;
          }
          if (matchesAcc(t.from_account, selectedAccount)) {
            totalExpense += tAmount;
            if (isCurrentPeriod) currentMonthExpense += tAmount;
          }
        }
      } else if (t.type === 'settlement') {
        totalSettlements += tAmount;
      }
    });

    const getAccountBalance = (account) => {
      if (account.type === 'investment') return investmentsValue;
      let bal = Number(account.balance_adjustment) || 0;
      const targetId = account._id?.toString();

      completedTransactions.forEach(t => {
        const tAmount = Number(t.amount) || 0;
        const accMatch = matchesAcc(t.account, targetId);
        const fromMatch = matchesAcc(t.from_account, targetId);
        const toMatch = matchesAcc(t.to_account, targetId);

        if (t.type === 'income' && accMatch) bal += tAmount;
        else if (t.type === 'expense' && accMatch) bal -= tAmount;
        else if (t.type === 'transfer') {
          if (toMatch) bal += tAmount;
          if (fromMatch) bal -= tAmount;
        } else if (t.type === 'settlement' && accMatch) bal += tAmount;
      });

      allDebtTransactions.forEach(dt => {
        if (matchesAcc(dt.account, targetId)) {
          const dtAmount = Number(dt.amount) || 0;
          if (dt.type === 'loan') {
            if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') bal += dtAmount;
            else bal -= dtAmount;
          } else if (dt.type === 'repayment') {
            if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') bal -= dtAmount;
            else bal += dtAmount;
          }
        }
      });

      allReceivables.forEach(r => {
        if (matchesAcc(r.paidFrom, targetId)) bal -= (Number(r.paidAmount) || 0);
        if (matchesAcc(r.receivedTo, targetId)) bal += (Number(r.receivedAmount) || 0);
        if (r.participants) {
          r.participants.forEach(p => {
            if (p.payments) {
              p.payments.forEach(pay => {
                if (matchesAcc(pay.account, targetId)) bal += (Number(pay.amount) || 0);
              });
            }
          });
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
  }, [allTransactions, allDebtTransactions, allReceivables, selectedAccount, periodStart, periodEnd, accounts, investmentsValue, skippedTransactionIds]);

  const displayedTransactions = useMemo(() => {
    const seenKeys = new Set();
    const valid = [];
    for (const t of allTransactions) {
      if (t.status && t.status !== 'completed' && t.status !== 'pending') continue;
      if (t.idempotencyKey) {
        if (seenKeys.has(t.idempotencyKey)) continue;
        seenKeys.add(t.idempotencyKey);
      }
      valid.push(t);
    }

    return valid.filter(t => {
      if (selectedAccount !== 'all') {
        const accMatch = matchesAcc(t.account, selectedAccount);
        const fromMatch = matchesAcc(t.from_account, selectedAccount);
        const toMatch = matchesAcc(t.to_account, selectedAccount);
        if (!accMatch && !fromMatch && !toMatch) return false;
      }
      if (selectedCategory !== 'all') {
        const catId = (t.category?._id || t.category)?.toString();
        if (catId !== selectedCategory.toString()) return false;
      }
      const tDate = new Date(t.date);
      if (tDate < periodStart || tDate > periodEnd) {
        return false;
      }
      return true;
    });
  }, [allTransactions, selectedAccount, selectedCategory, periodStart, periodEnd]);

  const { groupedTransactions, sortedDates, groupCounts, groupOffsets } = useMemo(() => {
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
      const cAmount = Number(curr.amount) || 0;

      if (curr.type === 'income') acc[key].income += cAmount;
      else if (curr.type === 'expense') acc[key].expense += cAmount;
      else if (curr.type === 'transfer' && selectedAccount !== 'all') {
        if (matchesAcc(curr.to_account, selectedAccount)) acc[key].income += cAmount;
        if (matchesAcc(curr.from_account, selectedAccount)) acc[key].expense += cAmount;
      } else if (curr.type === 'settlement' && selectedAccount !== 'all') {
        if (matchesAcc(curr.account, selectedAccount)) acc[key].income += cAmount;
      }
      
      return acc;
    }, {});
    
    const sorted = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    const counts = sorted.map(date => grouped[date].items.length);
    const offsets = [0];
    for (let i = 0; i < counts.length - 1; i++) {
      offsets.push(offsets[i] + counts[i]);
    }
    
    return { groupedTransactions: grouped, sortedDates: sorted, groupCounts: counts, groupOffsets: offsets };
  }, [displayedTransactions, selectedAccount]);

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
      showToast(error.response?.data?.message || t('common.deleteError'), 'error');
    }
  };

  const handlePrevPeriod = () => {
    setReferenceDate(prev => {
      const d = new Date(prev);
      if (userPrefs.trackingPeriod === 'weekly') d.setDate(d.getDate() - 7);
      else d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextPeriod = () => {
    setReferenceDate(prev => {
      const d = new Date(prev);
      if (userPrefs.trackingPeriod === 'weekly') d.setDate(d.getDate() + 7);
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
    
    if (userPrefs.trackingPeriod === 'weekly') {
      if (isCurrentPeriod) return t('dashboard.thisWeek');
      return `${t('dashboard.weekOf')} ${periodStart.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}`;
    } else {
      if (isCurrentPeriod) return t('dashboard.thisMonth');
      return periodStart.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="animate-fade-in w-full relative min-h-screen pb-32 overflow-x-hidden">
      {/* Figma Background Effects */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115]">
        <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
      </div>

      <div className="px-4 pt-6 pb-20 w-full max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Visa-Style Swipeable Card */}
        <div className="relative w-full overflow-visible">
           <motion.div 
             key={selectedAccount}
             initial={{ opacity: 0, x: direction * 50 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
             className="w-full relative touch-pan-y cursor-grab active:cursor-grabbing"
             drag="x"
             dragConstraints={{ left: 0, right: 0 }}
             dragElastic={0.2}
             onDragEnd={handleDragEnd}
           >
             {selectedAccount === 'add_account' ? (
                <div 
                  onClick={() => navigate('/add?tab=account')}
                  className="w-full h-[220px] md:h-[260px] lg:h-[300px] max-w-[340px] md:max-w-[400px] lg:max-w-[460px] mx-auto rounded-[20px] border-2 border-dashed border-[#8D6346] bg-[#8D6346]/10 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                >
                  <p className="text-[#E2EF8B] text-lg lg:text-xl font-medium tracking-wide">{t('dashboard.addAccount') || 'Add Account +'}</p>
                </div>
             ) : (
                <div className="w-full h-[220px] md:h-[260px] lg:h-[300px] max-w-[340px] md:max-w-[400px] lg:max-w-[460px] mx-auto rounded-[30px] p-6 lg:p-8 flex flex-col justify-between liquidglass relative overflow-hidden"
                     style={{
                       boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.2)'
                     }}>
                  
                  {/* Bank/Account Name and Icon */}
                  <div className="flex justify-between items-center w-full">
                    <h2 className="text-white/90 text-xl font-medium tracking-wide">
                      {selectedAccount === 'all' ? t('common.allAccounts') : accounts.find(a => a._id === selectedAccount)?.name}
                    </h2>
                    
                    {/* Selected Account Icon */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/10"
                         style={{ 
                           boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 2px 8px rgba(0,0,0,0.2)',
                           color: selectedAccount === 'all' ? '#8D6346' : accounts.find(a => a._id === selectedAccount)?.color || '#8D6346' 
                         }}>
                      {(() => {
                        const iconName = selectedAccount === 'all' ? 'Globe' : accounts.find(a => a._id === selectedAccount)?.icon;
                        const Icon = LucideIcons[iconName] || LucideIcons.Wallet;
                        return <Icon className="w-6 h-6" />;
                      })()}
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-white/50 font-medium text-xs md:text-sm tracking-wider uppercase">{t('nav.totalBalance')}</p>
                    <h1 className="text-white font-extrabold text-4xl md:text-5xl tabular-nums tracking-tight drop-shadow-sm">
                      {totals.balance.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} <span className="text-xl md:text-2xl font-medium opacity-70">{t('nav.currency')}</span>
                    </h1>
                  </div>

                  {/* Gain / Loss Pills */}
                  <div className="flex gap-3 w-full mt-3">
                    {/* Gain */}
                    <div className="flex-1 bg-white/5 rounded-[20px] py-2 px-3 flex flex-col items-center justify-center gap-0.5"
                         style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.1)' }}>
                      <p className="text-green-400 text-[11px] font-semibold tracking-wider uppercase">{t('dashboard.gain') || 'Gain'} <span className="opacity-50 lowercase tracking-normal">({userPrefs.trackingPeriod === 'weekly' ? (t('dashboard.thisWk') || 'This Wk') : (t('dashboard.thisMo') || 'This Mo')})</span></p>
                      <p className="text-white font-medium text-sm tracking-wide tabular-nums">{totals.income.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('nav.currency')}</p>
                    </div>
                    {/* Loss */}
                    <div className="flex-1 bg-white/5 rounded-[20px] py-2 px-3 flex flex-col items-center justify-center gap-0.5"
                         style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.1)' }}>
                      <p className="text-red-400 text-[11px] font-semibold tracking-wider uppercase">{t('dashboard.loss') || 'Loss'} <span className="opacity-50 lowercase tracking-normal">({userPrefs.trackingPeriod === 'weekly' ? (t('dashboard.thisWk') || 'This Wk') : (t('dashboard.thisMo') || 'This Mo')})</span></p>
                      <p className="text-white font-medium text-sm tracking-wide tabular-nums">{totals.expense.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('nav.currency')}</p>
                    </div>
                  </div>
                </div>
             )}
           </motion.div>
           
           {/* Pagination Dots */}
           <div className="flex justify-center gap-2 mt-4">
              {['all', ...accounts.filter(a => !a.isArchived).map(a => a._id), 'add_account'].map((id) => (
                <div key={id} className={`h-2 rounded-full transition-all duration-300 ${selectedAccount === id ? 'w-6 bg-white' : 'w-2 bg-white/30'}`} />
              ))}
           </div>
        </div>

        {/* Payday Survival Box */}
        {survival && survival.hasIncomeProfile && (
           <div 
             onClick={() => navigate('/analytics?tab=insights&focus=payday')}
             className="w-full relative overflow-hidden rounded-[24px] p-4 cursor-pointer active:scale-95 transition-transform border mb-4"
             style={{
               background: survival.risk === 'Safe' ? 'rgba(16, 185, 129, 0.15)' : 
                           survival.risk === 'Low Risk' ? 'rgba(59, 130, 246, 0.15)' : 
                           survival.risk === 'Medium Risk' ? 'rgba(245, 158, 11, 0.15)' : 
                           'rgba(255, 0, 0, 0.2)',
               borderColor: survival.risk === 'Safe' ? 'rgba(16, 185, 129, 0.3)' : 
                            survival.risk === 'Low Risk' ? 'rgba(59, 130, 246, 0.3)' : 
                            survival.risk === 'Medium Risk' ? 'rgba(245, 158, 11, 0.3)' : 
                            'rgba(255, 0, 0, 0.3)',
               backdropFilter: 'blur(32px) saturate(1.4)',
               WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
               boxShadow: 'inset 0 0 2px 1px lab(100% 0 0 / .35), inset 0 0 10px 4px lab(100% 0 0 / .15), inset 0 4px 16px lab(5.32203% 1.61424 -5.88284 / .0509804), 0 4px 16px rgba(0,0,0,0.3)'
             }}
           >
             <div className="flex items-center justify-between w-full">
               <div className="flex flex-col gap-0.5 pr-3">
                   <h3 className="text-white font-semibold text-base">{t('dashboard.paydaySurvival')}</h3>
                   
                   {survival.risk === 'High Risk' ? (
                     <p className="text-white/80 text-[12px] leading-snug mt-1">
                       {t('dashboard.balanceRunsOut', { days: survival.daysUntilIncome - (survival.remainingSurvivalDays || 0) })}
                       <span className="text-[#ff4444] font-bold ml-1">({t('dashboard.riskHigh')})</span>
                     </p>
                   ) : (
                     <p className="text-white/80 text-[12px] leading-snug mt-1">
                       {t('dashboard.balanceSurvives', { days: survival.daysUntilIncome })}
                       <span className={`font-bold ml-1 ${survival.risk === 'Safe' ? 'text-emerald-400' : survival.risk === 'Low Risk' ? 'text-blue-400' : 'text-amber-400'}`}>({survival.risk})</span>
                     </p>
                   )}
               </div>

               {/* Dynamic Risk Icon */}
               <div className="flex-shrink-0 flex items-center justify-center p-2.5 bg-black/10 rounded-full border border-white/5 shadow-inner">
                 {survival.risk === 'Safe' ? (
                   <ShieldCheck className="w-6 h-6 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                 ) : survival.risk === 'Low Risk' ? (
                   <ShieldCheck className="w-6 h-6 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                 ) : survival.risk === 'Medium Risk' ? (
                   <AlertTriangle className="w-6 h-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                 ) : (
                   <ShieldAlert className="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                 )}
               </div>
             </div>
           </div>
        )}
        
        {/* Filters: Month & Categories */}
        <div className="flex items-center gap-2 justify-center w-full px-1">
            {/* Month/Week Selector */}
            <div className="flex items-center justify-between px-2 py-2 bg-[rgba(141,99,70,0.3)] backdrop-blur-xl border border-white/10 rounded-[20px] min-w-[140px] flex-1 max-w-[180px] relative overflow-hidden">
              <button onClick={handlePrevPeriod} className="active:scale-90 p-1 flex-shrink-0 z-10"><ChevronLeft className={`w-4 h-5 text-white ${lang === 'ar' ? 'rotate-180' : ''}`} /></button>
              <div className="relative flex items-center justify-center flex-1 h-[20px]">
                <AnimatePresence mode="popLayout">
                  <motion.span 
                    key={getPeriodLabel()}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2, type: 'spring', bounce: 0 }}
                    className="text-white font-medium text-[12.5px] tracking-wide text-center whitespace-nowrap absolute"
                  >
                    {getPeriodLabel()}
                  </motion.span>
                </AnimatePresence>
              </div>
              <button onClick={handleNextPeriod} className="active:scale-90 p-1 flex-shrink-0 z-10"><ChevronRight className={`w-4 h-5 text-white ${lang === 'ar' ? 'rotate-180' : ''}`} /></button>
            </div>
            
            {/* Category Selector */}
            <button 
              onClick={() => setCategoryModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[rgba(141,99,70,0.3)] backdrop-blur-xl border border-white/10 rounded-[20px] active:scale-95 transition-transform flex-shrink-0"
            >
              <span className="text-white font-medium text-[12.5px] tracking-wide">
                {selectedCategory === 'all' ? t('dashboard.allCategories') : (lang === 'ar' ? categories.find(c => c._id === selectedCategory)?.nameAr : categories.find(c => c._id === selectedCategory)?.nameEn) || 'Category'}
              </span>
              <ChevronDown className="w-4 h-4 text-white opacity-70" />
            </button>
         </div>

        {/* Uncategorized Transactions */}
        {uncategorizedTransactions.length > 0 && (
          <div className="p-4 rounded-[2rem] border border-white/10 bg-white/5 liquidglass shadow-inner">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-white/90 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
                {t('dashboard.pendingReview')} ({uncategorizedTransactions.length})
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              {uncategorizedTransactions.map(pt => (
                <div key={pt._id} className="flex justify-between items-center p-3 rounded-xl bg-black/20 border border-white/5 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
                  <div>
                    <p className="font-semibold text-white text-sm">{pt.title}</p>
                    <p className="text-xs text-white/60">{new Date(pt.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')} • {pt.amount} {t('nav.currency')}</p>
                  </div>
                  <button 
                    onClick={() => handleTransactionClick(pt)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/30 transition-colors border border-blue-500/20"
                  >
                    {t('dashboard.reviewBtn')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="w-full">
           <h2 className="text-white font-extrabold text-[22px] mb-4 pl-2 drop-shadow-md">{t('dashboard.transactionHistory') || 'Transaction History'}</h2>
           {displayedTransactions.length === 0 ? (
             <div className="text-center text-white/50 py-12 bg-white/5 rounded-[2rem] font-medium flex flex-col items-center gap-3">
               <p>{t('dashboard.noTransactions')}</p>
             </div>
           ) : (
             <GroupedVirtuoso
               useWindowScroll
               groupCounts={groupCounts}
               className="w-full hide-scrollbar"
               groupContent={(index) => {
                 const dateKey = sortedDates[index];
                 const dateObj = new Date(dateKey);
                 const groupStats = groupedTransactions[dateKey];
                 return (
                   <div className="py-3 z-10 sticky top-0 backdrop-blur-md">
                     {/* Date Row */}
                     <div className="flex justify-between items-center px-1 mb-3">
                       <h3 className="text-white text-base font-normal">
                         {dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long' })}
                       </h3>
                       <h3 className="text-white text-base font-normal">
                         {dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                       </h3>
                     </div>
                     
                     {/* Gain / Loss Pills Row */}
                     {(groupStats.income > 0 || groupStats.expense > 0) && (
                       <div className="flex items-center gap-3 px-1 mt-2">
                         {groupStats.income > 0 && (
                           <div className="flex items-center gap-1.5 liquidglass border border-white/5 rounded-full px-3 py-1"
                                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.2)' }}>
                             <LucideIcons.TrendingUp className="w-4 h-4 text-green-400" />
                             <span className="text-green-400 font-bold text-[13px] tabular-nums">{groupStats.income.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('nav.currency')}</span>
                             <span className="text-green-400/90 font-medium text-[13px] ml-0.5">{t('dashboard.gain') || 'Gain'}</span>
                           </div>
                         )}
                         {groupStats.expense > 0 && (
                           <div className="flex items-center gap-1.5 liquidglass border border-white/5 rounded-full px-3 py-1"
                                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.2)' }}>
                             <LucideIcons.TrendingDown className="w-4 h-4 text-red-400" />
                             <span className="text-red-400 font-bold text-[13px] tabular-nums">{groupStats.expense.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('nav.currency')}</span>
                             <span className="text-red-400/90 font-medium text-[13px] ml-0.5">{t('dashboard.loss') || 'Loss'}</span>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 );
               }}
               itemContent={(index, groupIndex) => {
                 const dateKey = sortedDates[groupIndex];
                 const transactionsForGroup = groupedTransactions[dateKey].items;
                 const offset = groupOffsets ? groupOffsets[groupIndex] || 0 : 0;
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
      </div>

      <EditTransactionModal
        open={editModalOpen}
        transaction={selectedTransaction}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTransaction(null);
        }}
        onSkip={(tx) => {
          setSkippedTransactionIds(prev => new Set([...prev, tx._id]));
          setEditModalOpen(false);
          setSelectedTransaction(null);
        }}
        onDelete={confirmDeleteTransaction}
        onSuccess={handleEditSuccess}
      />

      <QuickAddModal 
        isOpen={quickAddOpen} 
        onClose={() => setQuickAddOpen(false)} 
        onSuccess={fetchData}
      />

      {/* Category Bottom Sheet */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCategoryModalOpen(false)}></div>
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="relative border-t border-white/10 rounded-t-[40px] p-6 pb-[max(2rem,env(safe-area-inset-bottom))] max-h-[70vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, rgba(40,40,40,0.6) 0%, rgba(20,20,20,0.95) 100%)',
              backdropFilter: 'blur(40px) saturate(1.5)',
              WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15), 0 -8px 32px rgba(0,0,0,0.5)'
            }}
          >
             <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6 shadow-inner"></div>
             <h2 className="text-white font-bold text-xl mb-6 text-center tracking-wide">{t('dashboard.allCategories')}</h2>
             
             <div className="grid grid-cols-4 gap-y-6 gap-x-4">
                <div 
                  onClick={() => { setSelectedCategory('all'); setCategoryModalOpen(false); }}
                  className={`flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 ${selectedCategory === 'all' ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                >
                  <div className="relative w-14 h-14 flex items-center justify-center">
                    {selectedCategory === 'all' && (
                      <motion.div
                        layoutId="category-indicator"
                        className="absolute inset-0 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                        style={{ background: 'rgba(255,255,255,0.15)' }}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <motion.div 
                      className="relative z-10 flex items-center justify-center w-full h-full"
                      animate={{ scale: selectedCategory === 'all' ? 1.25 : 1 }}
                      transition={{ type: 'spring', bounce: 0.4, duration: 0.4 }}
                    >
                       <LucideIcons.LayoutGrid className="w-6 h-6 transition-colors duration-300" style={{ color: selectedCategory === 'all' ? '#8D6346' : '#fff' }} />
                    </motion.div>
                  </div>
                  <span className={`text-xs font-medium text-center transition-colors duration-300 ${selectedCategory === 'all' ? 'text-white' : 'text-white/60'}`}>{t('dashboard.all')}</span>
                </div>
                
                {categories.map(cat => {
                   const IconComponent = LucideIcons[cat.icon] || LucideIcons.Tag;
                   const isActive = selectedCategory === cat._id;
                   
                   return (
                     <div 
                       key={cat._id}
                       onClick={() => { setSelectedCategory(cat._id); setCategoryModalOpen(false); }}
                       className={`flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                     >
                       <div className="relative w-14 h-14 flex items-center justify-center">
                         {isActive && (
                           <motion.div
                             layoutId="category-indicator"
                             className="absolute inset-0 rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                             style={{ background: 'rgba(255,255,255,0.15)' }}
                             transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                           />
                         )}
                         <motion.div 
                           className="relative z-10 flex items-center justify-center w-full h-full"
                           animate={{ scale: isActive ? 1.25 : 1 }}
                           transition={{ type: 'spring', bounce: 0.4, duration: 0.4 }}
                         >
                            <IconComponent className="w-6 h-6 transition-colors duration-300" style={{ color: isActive ? '#8D6346' : '#fff' }} />
                         </motion.div>
                       </div>
                       <span className={`text-xs font-medium text-center line-clamp-1 transition-colors duration-300 ${isActive ? 'text-white' : 'text-white/60'}`}>{lang === 'ar' ? (cat.nameAr || cat.name) : (cat.nameEn || cat.name)}</span>
                     </div>
                   )
                })}
             </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
