import React, { useEffect, useState } from 'react';
import { getAnalytics } from '../api/analytics';
import { getTransactions } from '../api/transactions';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { getDebts } from '../api/debts';
import { getInvestments, getGoldPrice } from '../api/investments';
import { budgetService } from '../services/budgetService';
import { getBills } from '../api/bills';
import { getRecurringTransactions } from '../api/recurringTransactions';
import { getCurrentUser } from '../api/auth';
import { Loader2, Download, Filter, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import CustomSelect from '../components/ui/CustomSelect';

import AnalyticsTabs from '../components/analytics/AnalyticsTabs';
import DateFilterChips, { getFilterBounds } from '../components/analytics/DateFilterChips';
import OverviewTab from '../components/analytics/OverviewTab';
import SpendingTab from '../components/analytics/SpendingTab';
import PlanningTab from '../components/analytics/PlanningTab';
import AssetsTab from '../components/analytics/AssetsTab';
import LiabilitiesTab from '../components/analytics/LiabilitiesTab';
import InsightsTab from '../components/analytics/InsightsTab';
import { AnalyticsSkeleton } from '../components/ui/Skeletons';

export default function Analytics() {
  const { t, lang } = useLanguage();
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value || 0);
  
  const [activeTab, setActiveTab] = useState('overview');
  
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [debts, setDebts] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [bills, setBills] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [allDebtTransactions, setAllDebtTransactions] = useState([]);
  const [userPrefs, setUserPrefs] = useState(null);

  const [filters, setFilters] = useState({ from: '', to: '', search: '', account: '', category: '', filterType: '', initialized: false });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load everything
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Get user preferences first to determine default filter
      let currentFilters = { ...filters };
      let prefs = userPrefs;
      
      if (!prefs) {
        const userRes = await getCurrentUser().catch(() => ({}));
        prefs = userRes?.preferences || {};
        setUserPrefs(prefs);
      }

      if (!currentFilters.initialized) {
        const type = prefs.budgetPeriod === 'weekly' ? 'this_week' : 'this_month';
        const bounds = getFilterBounds(type, prefs);
        if (bounds) {
          currentFilters = { ...currentFilters, from: bounds.from, to: bounds.to, filterType: type, initialized: true };
          setFilters(currentFilters);
        }
      }

      // Parallel loading for better performance
      const [
        analyticsResult, 
        accs, 
        cats, 
        debtsRes, 
        invsRes, 
        budgetsRes, 
        billsRes, 
        recurringRes,
        allTx
      ] = await Promise.all([
        getAnalytics(currentFilters),
        getAccounts(),
        getCategories(),
        getDebts().catch(() => ({})), // Catch if endpoint fails offline
        getInvestments().catch(() => []),
        budgetService.getBudgets().catch(() => []),
        getBills().catch(() => []),
        getRecurringTransactions().catch(() => []),
        getTransactions().catch(() => [])
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

      if (analyticsResult.monthly) {
        analyticsResult.monthly = analyticsResult.monthly.map(m => ({
          ...m,
          balance: m.income - m.expense
        }));
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

      setData(analyticsResult);
      setAccounts(accs);
      setCategories(cats);
      setDebts(debtsRes?.debts || []);
      setAllDebtTransactions(debtsRes?.transactions || []);
      setInvestments(investmentsWithCurrentValue);
      setBudgets(budgetsRes);
      setBills(billsRes);
      setRecurring(recurringRes || []);
      setAllTransactions(allTx);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!filters.initialized && !userPrefs) {
      loadData();
    } else if (filters.initialized) {
      loadData();
    }
  }, [filters.from, filters.to, filters.account, filters.category, filters.search, filters.initialized]);

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

  if (isLoading && !data) return <AnalyticsSkeleton />;

  const isAssetsTab = activeTab === 'assets';

  return (
    <div className="p-4 pt-8 animate-fade-in space-y-8 pb-24 max-w-7xl mx-auto">
      
      {/* Header & Global Actions */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-brand-blue text-xs font-bold tracking-widest uppercase mb-1">{t('analytics.tabs.overview', 'Overview')}</p>
          <h1 className="text-3xl md:text-4xl font-black text-[var(--color-text-main)] tracking-tight">{t('analytics.title', 'Reports & Analytics')}</h1>
        </div>
        <div className="flex items-center gap-3">
          {!isAssetsTab && (
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg hover:-translate-y-0.5 ${showFilters ? 'bg-brand-blue text-white shadow-brand-blue/20' : 'bg-white/5 border border-white/10 text-[var(--color-text-main)] hover:bg-white/10'}`}
            >
              <Filter className="w-4 h-4" />
              <span>{showFilters ? t('analytics.hideFilters', 'Hide Filters') : t('analytics.filterResults', 'Filter Results')}</span>
            </button>
          )}
          
          <button onClick={exportReport} className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white px-5 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg hover:shadow-brand-blue/20 hover:-translate-y-0.5">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t('analytics.export', 'Export JSON')}</span>
          </button>
        </div>
      </header>

      {/* Control Panel (Filters) */}
      {!isAssetsTab && (
        <div className={`transition-all duration-500 overflow-hidden ${showFilters ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="glass-panel p-4 md:p-6 rounded-[2rem] shadow-2xl bg-black/40 border border-white/5 backdrop-blur-2xl">
          <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6">
           <div className="flex-1 w-full flex flex-col md:flex-row gap-4">
             <DateFilterChips filters={filters} setFilters={setFilters} userPrefs={userPrefs} />
           </div>
           
           <div className="w-full lg:w-auto flex flex-col md:flex-row gap-4">
              <div className="w-full md:w-48 z-20">
                <CustomSelect
                  options={[
                    { value: '', label: t('analytics.allAccounts', 'All Accounts'), icon: 'Globe', color: '#ffffff' },
                    ...accounts.map(acc => ({ value: acc._id, label: acc.name, icon: acc.icon, color: acc.color }))
                  ]}
                  value={filters.account}
                  onChange={(val) => setFilters({ ...filters, account: val })}
                  placeholder={t('analytics.allAccounts', 'All Accounts')}
                  type="account"
                />
              </div>

              <div className="w-full md:w-48 z-10">
                <CustomSelect
                  options={[
                    { value: '', label: t('analytics.allCategories', 'All Categories'), icon: 'Layers', color: '#ffffff' },
                    ...categories.map(cat => ({ value: cat._id, label: cat.name, icon: cat.icon, color: cat.color }))
                  ]}
                  value={filters.category}
                  onChange={(val) => setFilters({ ...filters, category: val })}
                  placeholder={t('analytics.allCategories', 'All Categories')}
                />
              </div>

              <div className="w-full md:w-48">
                <div className="relative">
                  <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-[var(--color-text-muted)] pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder={t('analytics.searchPlaceholder', 'Search...')}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-3.5 px-4 pr-10 text-sm text-[var(--color-text-main)] outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all"
                    value={filters.search} 
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>
           </div>
        </div>
       </div>
       </div>
      )}

      {/* Tabs Navigation */}
      <AnalyticsTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="relative">
        {activeTab === 'overview' && (
            <OverviewTab 
              money={money} 
              data={data} 
              accounts={accounts} 
              investments={investments} 
              debts={debts} 
              bills={bills}
              recurring={recurring}
              filters={filters}
              allTransactions={allTransactions}
              allDebtTransactions={allDebtTransactions}
            />
        )}
        {activeTab === 'spending' && (
            <SpendingTab data={data} categories={categories} money={money} />
        )}
        {activeTab === 'planning' && (
            <PlanningTab budgets={budgets} money={money} />
        )}
        {activeTab === 'assets' && (
            <AssetsTab investments={investments} money={money} />
        )}
        {activeTab === 'liabilities' && (
            <LiabilitiesTab debts={debts} bills={bills} filters={filters} money={money} />
        )}
        {activeTab === 'insights' && (
            <InsightsTab data={data} money={money} filters={filters} />
        )}
      </div>

    </div>
  );
}
