import React, { useEffect, useState, useRef } from 'react';
import { getAnalytics } from '../api/analytics';
import { getTransactions, getTransactionsOffline } from '../api/transactions';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { getDebts } from '../api/debts';
import { getInvestments } from '../api/investments';
import { budgetService } from '../services/budgetService';
import { getBills } from '../api/bills';
import { getRecurringTransactions } from '../api/recurringTransactions';
import { getReceivables } from '../api/receivables';
import { getIncomeProfiles } from '../api/incomeProfiles';
import { getCurrentUser } from '../api/auth';
import { Download, Filter, Search, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import CustomSelect from '../components/ui/CustomSelect';

import AnalyticsTabs from '../components/analytics/AnalyticsTabs';
import DateFilterChips, { getFilterBounds } from '../components/analytics/DateFilterChips';
import OverviewTab from '../components/analytics/OverviewTab';
const SpendingTab = React.lazy(() => import('../components/analytics/SpendingTab'));
const IncomeTab = React.lazy(() => import('../components/analytics/IncomeTab'));
const PlanningTab = React.lazy(() => import('../components/analytics/PlanningTab'));
const AssetsTab = React.lazy(() => import('../components/analytics/AssetsTab'));
const LiabilitiesTab = React.lazy(() => import('../components/analytics/LiabilitiesTab'));
const InsightsTab = React.lazy(() => import('../components/analytics/InsightsTab'));
import { AnalyticsSkeleton } from '../components/ui/Skeletons';

function TabLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse py-4">
      <div className="h-44 bg-white/5 border border-white/10 rounded-[2.5rem] backdrop-blur-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="h-36 bg-white/5 border border-white/10 rounded-[1.5rem]" />
        <div className="h-36 bg-white/5 border border-white/10 rounded-[1.5rem]" />
        <div className="h-36 bg-white/5 border border-white/10 rounded-[1.5rem]" />
      </div>
    </div>
  );
}

const MAX_PENDING_ATTEMPTS = 12;

export default function Analytics() {
  const { t, lang } = useLanguage();
  const reduceMotion = useReducedMotion();
  
  const numberFormatter = React.useMemo(() => {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    });
  }, [lang]);

  const money = React.useCallback((value) => numberFormatter.format(value || 0), [numberFormatter]);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', newTab);
      return next;
    }, { replace: true });
  };
  
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [debts, setDebts] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [bills, setBills] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [incomeProfiles, setIncomeProfiles] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [allDebtTransactions, setAllDebtTransactions] = useState([]);
  const [allReceivables, setAllReceivables] = useState([]);
  const [userPrefs, setUserPrefs] = useState(null);

  const [filters, setFilters] = useState({ from: '', to: '', search: '', account: '', category: '', filterType: '', initialized: false });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const reqIdRef = useRef(0);
  const staticLoadedRef = useRef(false);
  const lastLoadedFiltersRef = useRef('');
  const pendingAttemptsRef = useRef(0);

  // Tier 2: Filtered Analytics - lightweight, filter-dependent backend call
  const loadFilteredAnalytics = async (targetFilters) => {
    const currentReqId = ++reqIdRef.current;
    try {
      const analyticsResult = await getAnalytics(targetFilters);

      if (analyticsResult?.monthly) {
        analyticsResult.monthly = analyticsResult.monthly.map(m => ({
          ...m,
          balance: m.income - m.expense
        }));
      }

      if (currentReqId !== reqIdRef.current) return;

      setData(analyticsResult);
      setLoadError(false);

      if (analyticsResult?.initializationPending) {
        pendingAttemptsRef.current += 1;
        setIsBuilding(true);
        if (pendingAttemptsRef.current <= MAX_PENDING_ATTEMPTS) {
          const delay = Math.min(600 * pendingAttemptsRef.current, 4000);
          setTimeout(() => {
            if (currentReqId === reqIdRef.current) {
              loadFilteredAnalytics(targetFilters);
            }
          }, delay);
        } else {
          setIsBuilding(false);
        }
      } else {
        pendingAttemptsRef.current = 0;
        setIsBuilding(false);
      }
    } catch (err) {
      if (currentReqId === reqIdRef.current) {
        console.error("Failed to load filtered analytics:", err);
        setLoadError(true);
        setIsBuilding(false);
      }
    }
  };

  // Tier 1: Static Data - heavy one-time mount loading (accounts, categories, debts, investments, budgets, transactions, etc.)
  const loadStaticData = async (prefs) => {
    try {
      const [
        accs, 
        cats, 
        debtsRes, 
        invsRes, 
        budgetsRes, 
        billsRes, 
        recurringRes,
        incomeProfilesRes,
        allTx,
        receivablesData
      ] = await Promise.all([
        getAccounts(),
        getCategories(),
        getDebts().catch(() => ({})),
        getInvestments().catch(() => []),
        budgetService.getBudgets().catch(() => []),
        getBills().catch(() => []),
        getRecurringTransactions().catch(() => []),
        getIncomeProfiles().catch(() => []),
        getTransactionsOffline().catch(() => []),
        getReceivables().catch(() => [])
      ]);

      let goldPriceRes = null;
      try {
        const cached = localStorage.getItem('cachedGoldPrice');
        if (cached) {
          goldPriceRes = JSON.parse(cached);
        }
      } catch (e) {
        console.error("Failed to parse cached gold price", e);
      }

      const investmentsWithCurrentValue = (invsRes || []).map(inv => {
        let unitValue = inv.purchasePrice;
        if (inv.type === 'gold' && goldPriceRes) {
          unitValue = inv.karat === 24 ? goldPriceRes.perGram24 : goldPriceRes.perGram21;
        }
        return {
          ...inv,
          currentValue: inv.quantity * unitValue
        };
      });

      // Calculate budget spent using allTx and userPrefs
      const now = new Date();
      const prefMonthStart = prefs?.trackingStartDayMonthly ?? 1;
      const prefWeekStart = prefs?.trackingStartDayWeekly ?? 6;
      
      const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const actualMonthStartDay = Math.min(prefMonthStart, lastDayOfCurrentMonth);
      let monthStart = new Date(now.getFullYear(), now.getMonth(), actualMonthStartDay);
      if (now.getDate() < actualMonthStartDay) {
        const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        monthStart = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(prefMonthStart, lastDayOfPrevMonth));
      }
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(monthEnd.getDate() - 1);
      monthEnd.setHours(23, 59, 59, 999);
      
      const diffToWeekStart = (now.getDay() - prefWeekStart + 7) % 7; 
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diffToWeekStart);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const monthStartMs = monthStart.getTime();
      const monthEndMs = monthEnd.getTime();
      const weekStartMs = weekStart.getTime();
      const weekEndMs = weekEnd.getTime();

      // Pre-group expense transactions by category for instant O(1) matching
      const expensesByCat = new Map();
      (allTx || []).forEach(tx => {
        if (tx.type === 'expense') {
          const catId = typeof tx.category === 'object' ? String(tx.category?._id || '') : String(tx.category || '');
          if (catId) {
            if (!expensesByCat.has(catId)) expensesByCat.set(catId, []);
            expensesByCat.get(catId).push(tx);
          }
        }
      });

      const enrichedBudgets = (budgetsRes || []).map(b => {
        const catId = typeof b.category === 'object' ? String(b.category?._id || '') : String(b.category || '');
        let categoryTx = expensesByCat.get(catId) || [];
        
        if (b.account) {
          const bAccId = typeof b.account === 'object' ? String(b.account?._id || '') : String(b.account);
          categoryTx = categoryTx.filter(tx => {
            const txAccId = typeof tx.account === 'object' ? String(tx.account?._id || '') : String(tx.account || '');
            const txFromAccId = typeof tx.from_account === 'object' ? String(tx.from_account?._id || '') : String(tx.from_account || '');
            return txAccId === bAccId || txFromAccId === bAccId;
          });
        }
        
        let spent = 0;
        const budgetPeriod = b.period || 'monthly';
        if (budgetPeriod === 'monthly') {
          spent = categoryTx.reduce((sum, tx) => {
            const tMs = new Date(tx.date).getTime();
            return (tMs >= monthStartMs && tMs <= monthEndMs) ? sum + tx.amount : sum;
          }, 0);
        } else if (budgetPeriod === 'weekly') {
          spent = categoryTx.reduce((sum, tx) => {
            const tMs = new Date(tx.date).getTime();
            return (tMs >= weekStartMs && tMs <= weekEndMs) ? sum + tx.amount : sum;
          }, 0);
        } else if (budgetPeriod === 'custom' && b.startDate && b.endDate) {
          const customStart = new Date(b.startDate); customStart.setHours(0,0,0,0);
          const customEnd = new Date(b.endDate); customEnd.setHours(23,59,59,999);
          const cStartMs = customStart.getTime();
          const cEndMs = customEnd.getTime();
          spent = categoryTx.reduce((sum, tx) => {
            const tMs = new Date(tx.date).getTime();
            return (tMs >= cStartMs && tMs <= cEndMs) ? sum + tx.amount : sum;
          }, 0);
        }
        
        return { ...b, spent };
      });

      setAccounts(accs);
      setCategories(cats);
      setDebts(debtsRes?.debts || []);
      setAllDebtTransactions(debtsRes?.transactions || []);
      setInvestments(investmentsWithCurrentValue);
      setIncomeProfiles(incomeProfilesRes || []);
      setBudgets(enrichedBudgets);
      setBills(billsRes);
      setRecurring(recurringRes || []);
      setAllTransactions(allTx);
      setAllReceivables(receivablesData || []);
      getTransactions()
        .then((fresh) => {
          if (Array.isArray(fresh)) setAllTransactions(fresh);
        })
        .catch(() => {});
    } catch (err) {
      console.error("Failed to load static analytics data:", err);
    }
  };

  // Debounce search input changes (300ms) to prevent hammering getAnalytics on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => {
        if (prev.search === searchInput) return prev;
        return { ...prev, search: searchInput };
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Mount effect: fetch user preferences, set initial filter, load static data and initial analytics
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      setIsLoading(true);
      try {
        let prefs = userPrefs;
        if (!prefs) {
          const userRes = await getCurrentUser().catch(() => ({}));
          prefs = userRes?.preferences || {};
          if (isMounted) setUserPrefs(prefs);
        }

        const type = prefs.trackingPeriod === 'weekly' ? 'this_week' : 'this_month';
        const bounds = getFilterBounds(type, prefs);
        const initialFilters = bounds
          ? { from: bounds.from, to: bounds.to, search: '', account: '', category: '', filterType: type, initialized: true }
          : { from: '', to: '', search: '', account: '', category: '', filterType: type, initialized: true };

        const filterKey = JSON.stringify({
          from: initialFilters.from,
          to: initialFilters.to,
          search: initialFilters.search,
          account: initialFilters.account,
          category: initialFilters.category,
          filterType: initialFilters.filterType
        });
        lastLoadedFiltersRef.current = filterKey;

        if (isMounted) {
          setFilters(initialFilters);
        }

        await Promise.all([
          loadStaticData(prefs),
          loadFilteredAnalytics(initialFilters)
        ]);
        staticLoadedRef.current = true;
      } catch (err) {
        console.error("Error during Analytics initialization:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter change effect: runs only when filters change, skips duplicate/initial fetch
  useEffect(() => {
    if (!filters.initialized) return;

    const filterKey = JSON.stringify({
      from: filters.from,
      to: filters.to,
      search: filters.search,
      account: filters.account,
      category: filters.category,
      filterType: filters.filterType
    });

    if (filterKey === lastLoadedFiltersRef.current) {
      return;
    }

    lastLoadedFiltersRef.current = filterKey;
    loadFilteredAnalytics(filters);
  }, [filters.from, filters.to, filters.account, filters.category, filters.search, filters.filterType, filters.initialized]);

  const exportReport = () => { 
    const exportPayload = {
      analytics: data,
      accounts,
      debts,
      investments,
      budgets,
      bills
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const link = document.createElement('a'); 
    link.href = url; link.download = `financial-report-${new Date().toISOString().slice(0,10)}.json`; 
    link.click(); 
    URL.revokeObjectURL(url); 
  };

  const retryAnalytics = () => {
    pendingAttemptsRef.current = 0;
    setLoadError(false);
    setIsLoading(true);
    loadFilteredAnalytics(filters).finally(() => setIsLoading(false));
  };

  if (isLoading && !data && !loadError) return <AnalyticsSkeleton />;

  const isAssetsTab = activeTab === 'assets';
  const hasActiveFilters = Boolean(filters.account || filters.category || filters.search || searchInput);
  const pageMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, transition: { type: 'spring', bounce: 0, duration: 0.4 } };
  const tabMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.15 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 }, transition: { type: 'spring', bounce: 0, duration: 0.4 } };

  return (
    <>
      {/* Fixed Background covering the viewport */}
      <div className="fixed inset-0 -z-10 bg-[var(--color-background)] overflow-hidden pointer-events-none">
        <div className="absolute top-[-50px] start-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-40 blur-[120px] rounded-full" />
        <div className="absolute top-[30%] end-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-30 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-50px] start-[-50px] w-[300px] h-[300px] bg-[#8D6346] opacity-30 blur-[150px] rounded-full" />
      </div>

      <motion.div 
        {...pageMotion}
        className="space-y-6 md:space-y-8 relative z-0"
      >
      {/* Header & Global Actions */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[#E8C5A8] text-xs font-bold ltr:tracking-widest ltr:uppercase rtl:tracking-normal mb-1 drop-shadow-sm">{t(`analytics.tabs.${activeTab}`)}</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-sm">{t('analytics.title')}</h1>
          <p className="text-xs sm:text-sm text-white/60 mt-1 max-w-xl leading-relaxed">{t('analytics.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
          {!isAssetsTab && (
            <motion.button 
              whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)} 
              aria-label={showFilters ? t('analytics.hideFilters') : t('analytics.filterResults')}
              aria-expanded={showFilters}
              aria-controls={showFilters ? 'analytics-filters' : undefined}
              className={`relative flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-lg min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70 ${showFilters ? 'bg-[#8D6346] text-white shadow-[0_4px_16px_rgba(141,99,70,0.35)] border border-[#E8C5A8]/30' : 'bg-white/5 border border-white/10 text-white hover:bg-white/10'}`}
            >
              <Filter className="w-4 h-4" aria-hidden="true" />
              <span>{showFilters ? t('analytics.hideFilters') : t('analytics.filterResults')}</span>
              {hasActiveFilters && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#34C759] shadow-[0_0_8px_#34C759]" aria-hidden="true" />
                  <span className="sr-only">{t('analytics.activeFilters')}</span>
                </span>
              )}
            </motion.button>
          )}
          
          <motion.button 
            whileTap={reduceMotion ? undefined : { scale: 0.95 }} 
            onClick={exportReport} 
            aria-label={t('analytics.export')}
            className="flex items-center gap-2 bg-[#8D6346] hover:bg-[#8D6346]/90 text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-lg shadow-[#8D6346]/25 border border-[#E8C5A8]/20 min-h-[44px] outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('analytics.export')}</span>
          </motion.button>
        </div>
      </header>

      {(loadError || isBuilding) && (
        <div
          role="status"
          aria-live="polite"
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[1.5rem] border backdrop-blur-[32px] ${
            loadError
              ? 'bg-[#FF3B30]/10 border-[#FF3B30]/20'
              : 'bg-[#8D6346]/10 border-[#8D6346]/20'
          }`}
        >
          <div className="flex items-start gap-3 min-w-0">
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${loadError ? 'text-[#FF3B30]' : 'text-[#E8C5A8]'}`} aria-hidden="true" />
            <div>
              <p className="text-sm font-bold text-white">
                {loadError ? t('analytics.loadErrorTitle') : t('analytics.buildingReports')}
              </p>
              {loadError && (
                <p className="text-xs text-white/70 mt-1 leading-relaxed">{t('analytics.loadErrorDesc')}</p>
              )}
            </div>
          </div>
          {loadError && (
            <button
              type="button"
              onClick={retryAnalytics}
              className="px-4 py-2.5 min-h-[44px] rounded-xl bg-[#8D6346] hover:bg-[#8D6346]/90 text-white font-bold text-xs shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70 active:scale-95"
            >
              {t('analytics.insights.retry')}
            </button>
          )}
        </div>
      )}

      {/* Control Panel (Filters) */}
      {!isAssetsTab && showFilters && (
        <div id="analytics-filters">
          <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-4 md:p-6 rounded-[2rem] space-y-4">
          <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6">
           <div className="flex-1 w-full flex flex-col md:flex-row gap-4">
             <DateFilterChips filters={filters} setFilters={setFilters} userPrefs={userPrefs} />
           </div>
           
           <div className="w-full lg:w-auto flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-48 z-20">
                <CustomSelect
                  options={[
                    { value: '', label: t('analytics.allAccounts'), icon: 'Globe', color: '#ffffff' },
                    ...accounts.map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))
                  ]}
                  value={filters.account}
                  onChange={(val) => setFilters({ ...filters, account: val })}
                  placeholder={t('analytics.allAccounts')}
                  aria-label={t('analytics.allAccounts')}
                />
              </div>

              <div className="w-full md:w-48 z-10">
                <CustomSelect
                  options={[
                    { value: '', label: t('analytics.allCategories'), icon: 'Layers', color: '#ffffff' },
                    ...categories.map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon, color: cat.color }))
                  ]}
                  value={filters.category}
                  onChange={(val) => setFilters({ ...filters, category: val })}
                  placeholder={t('analytics.allCategories')}
                  aria-label={t('analytics.allCategories')}
                />
              </div>

              <div className="w-full md:w-48">
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-white/60 pointer-events-none" aria-hidden="true" />
                  <input 
                    type="text" 
                    placeholder={t('analytics.searchPlaceholder')}
                    aria-label={t('analytics.searchPlaceholder')}
                    className="w-full min-h-[44px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-3.5 ps-10 pe-4 text-sm text-[var(--color-text-main)] outline-none focus:border-[#8D6346] focus:ring-1 focus:ring-[#8D6346]/50 transition-all"
                    value={searchInput} 
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>
           </div>
          </div>

          {(filters.account || filters.category || searchInput || filters.search) && (
            <div className="flex justify-end pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setFilters(prev => ({ ...prev, account: '', category: '', search: '' }));
                }}
                className="text-xs font-bold text-[#FF3B30] hover:text-white px-3 py-2 rounded-xl bg-[#FF3B30]/10 hover:bg-[#FF3B30] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30] active:scale-95 min-h-[44px]"
              >
                {t('analytics.resetFilters')}
              </button>
            </div>
          )}
        </div>
       </div>
      )}

      {/* Tabs Navigation */}
      <AnalyticsTabs activeTab={activeTab} setActiveTab={handleTabChange} />

      {/* Main Content Area */}
      <div className="relative" role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            {...tabMotion}
          >
            <React.Suspense fallback={<TabLoadingSkeleton />}>
              {activeTab === 'overview' && (
                <OverviewTab 
                  money={money} 
                  data={data} 
                  accounts={accounts} 
                  investments={investments} 
                  debts={debts} 
                  bills={bills}
                  recurring={recurring}
                  incomeProfiles={incomeProfiles}
                  filters={filters}
                  allTransactions={allTransactions}
                  allDebtTransactions={allDebtTransactions}
                  allReceivables={allReceivables}
                />
              )}
              {activeTab === 'spending' && (
                <SpendingTab data={data} categories={categories} money={money} allTransactions={allTransactions} filters={filters} />
              )}
              {activeTab === 'income' && (
                <IncomeTab data={data} categories={categories} money={money} allTransactions={allTransactions} filters={filters} />
              )}
              {activeTab === 'planning' && (
                <PlanningTab budgets={budgets} money={money} />
              )}
              {activeTab === 'assets' && (
                <AssetsTab investments={investments} money={money} />
              )}
              {activeTab === 'liabilities' && (
                <LiabilitiesTab debts={debts} bills={bills} filters={filters} money={money} allDebtTransactions={allDebtTransactions} />
              )}
              {activeTab === 'insights' && (
                <InsightsTab data={data} money={money} filters={filters} />
              )}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

    </motion.div>
    </>
  );
}
