import React, { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getIconComponent } from '../IconPicker';
import { TrendingUp, TrendingDown, Landmark, Wallet, PiggyBank, CreditCard } from 'lucide-react';

export default function OverviewTab({ money, data, accounts, investments, debts, bills, recurring, filters, allTransactions, allDebtTransactions }) {
  const { t } = useLanguage();

  const accountBalances = useMemo(() => {
    const balances = {};
    (accounts || []).forEach(acc => {
      balances[acc._id] = acc.balance_adjustment || 0;
    });

    (allTransactions || []).forEach(t => {
      const amount = Number(t.amount);
      if (t.type === 'income') {
        if (t.account) balances[t.account._id || t.account] = (balances[t.account._id || t.account] || 0) + amount;
      } else if (t.type === 'expense') {
        if (t.account) balances[t.account._id || t.account] = (balances[t.account._id || t.account] || 0) - amount;
      } else if (t.type === 'transfer') {
        if (t.from_account) balances[t.from_account._id || t.from_account] = (balances[t.from_account._id || t.from_account] || 0) - amount;
        if (t.to_account) balances[t.to_account._id || t.to_account] = (balances[t.to_account._id || t.to_account] || 0) + amount;
      }
    });
    
    (allDebtTransactions || []).forEach(t => {
        const amount = Number(t.amount);
        if (t.type === 'borrowed') {
            balances[t.account] = (balances[t.account] || 0) + amount;
        } else if (t.type === 'lent') {
            balances[t.account] = (balances[t.account] || 0) - amount;
        } else if (t.type === 'repayment_borrowed') {
            balances[t.account] = (balances[t.account] || 0) - amount;
        } else if (t.type === 'repayment_lent') {
            balances[t.account] = (balances[t.account] || 0) + amount;
        }
    });

    return balances;
  }, [accounts, allTransactions, allDebtTransactions]);

  const totalAccountBalances = useMemo(() => {
    let total = 0;
    (accounts || []).forEach(acc => {
      total += (accountBalances[acc._id] || 0);
    });
    return total;
  }, [accounts, accountBalances]);

  // Net Worth = sum(accountBalances) + sum(investments) - sum(debts)
  const totalAssets = totalAccountBalances + 
                      (investments || []).reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
  
  const totalDebts = (debts || []).reduce((sum, d) => sum + (d.remainingAmount || 0), 0);

  // Helper to count exact occurrences of a repeating event within the filtered date range (Mathematically accurate for JS Dates)
  const calculateOccurrences = (eventDate, frequency, filters) => {
    if (!eventDate) return 0;
    
    // User requested: For "All Time" (no filters), always show exactly ONE cycle in the overview.
    if (!filters?.from || !filters?.to) {
      return 1;
    }

    const start = new Date(eventDate);
    const fromDate = new Date(filters.from);
    let toDate = new Date(filters.to);
    
    // User requested: Cap future dates to 'today' so "This Year" only counts YTD (Year-to-date)
    const today = new Date();
    if (filters?.filterType === 'year' && toDate > today) {
      toDate = today;
    }
    
    // If the fromDate is now somehow after toDate (e.g., viewing a strictly future custom filter capped to today)
    if (fromDate > toDate) return 0;
    
    if (frequency === 'never') {
      return (start >= fromDate && start <= toDate) ? 1 : 0;
    }

    // Helper to get the i-th occurrence strictly mathematically
    const getOccurrence = (i) => {
      const d = new Date(start);
      if (frequency === 'daily') d.setDate(d.getDate() + i);
      else if (frequency === 'weekly') d.setDate(d.getDate() + i * 7);
      else if (frequency === 'yearly') d.setFullYear(d.getFullYear() + i);
      else if (frequency === 'monthly') {
        const targetMonth = d.getMonth() + i;
        const expectedMonth = ((targetMonth % 12) + 12) % 12; // safe modulo for JS
        d.setMonth(targetMonth);
        if (d.getMonth() !== expectedMonth) d.setDate(0); // Clamp to end of month if JS rolled it over
      }
      return d;
    };

    let count = 0;
    let i = 0;
    
    // Fast forward 'i' if the event started way in the past (to avoid large loops)
    if (start < fromDate) {
      if (frequency === 'daily') i = Math.max(0, Math.floor((fromDate - start) / (1000 * 60 * 60 * 24)));
      else if (frequency === 'weekly') i = Math.max(0, Math.floor((fromDate - start) / (1000 * 60 * 60 * 24 * 7)));
      else if (frequency === 'monthly') i = Math.max(0, (fromDate.getFullYear() - start.getFullYear()) * 12 + (fromDate.getMonth() - start.getMonth()) - 1);
      else if (frequency === 'yearly') i = Math.max(0, fromDate.getFullYear() - start.getFullYear() - 1);
    }

    while (true) {
      const current = getOccurrence(i);
      if (current > toDate) break;
      if (current >= fromDate) count++;
      i++;
      if (i > 10000) break; // failsafe
    }
    
    return count;
  };

  const totalBills = useMemo(() => {
    return (bills || []).reduce((sum, b) => {
      const occurrences = calculateOccurrences(b.dueDate, b.repeat || 'never', filters);
      return sum + (b.expectedAmount || 0) * occurrences;
    }, 0);
  }, [bills, filters]);

  const totalLiabilities = totalDebts + totalBills;
  
  // Net Worth should ALWAYS be absolute (Assets - Debts), ignoring future expected bills to prevent illogical fluctuations!
  const netWorth = totalAssets - totalDebts;
  
  const savings = useMemo(() => {
    let total = 0;
    (accounts || []).forEach(acc => {
      if (acc.isSavingsAccount) {
        total += (accountBalances[acc._id] || 0);
      }
    });
    return total;
  }, [accounts, accountBalances]);

  const fixedIncome = useMemo(() => {
    return (recurring || [])
      .filter(r => r.type === 'income')
      .reduce((sum, r) => {
        const occurrences = calculateOccurrences(r.startDate, r.repeatType || 'monthly', filters);
        return sum + (r.amount || 0) * occurrences;
      }, 0);
  }, [recurring, filters]);

  const netAfterLiabilities = fixedIncome - totalLiabilities;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Hero Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Net Worth */}
        <div className="relative overflow-hidden glass-panel p-6 rounded-[2rem] shadow-2xl bg-gradient-to-br from-brand-blue/20 to-brand-blue/5 border border-brand-blue/30 group hover:shadow-brand-blue/20 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
            <Landmark className="w-24 h-24 text-brand-blue" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-80">{t('overview.netWorth', 'Net Worth')}</p>
            <p className={`text-4xl lg:text-5xl font-black tabular-nums tracking-tight ${netWorth >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
              {money(netWorth)}
            </p>
          </div>
        </div>

        {/* Total Assets */}
        <div className="relative overflow-hidden glass-panel p-6 rounded-[2rem] shadow-2xl bg-black/40 border border-white/5 group hover:bg-white/5 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <TrendingUp className="w-24 h-24 text-emerald-400" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('analytics.tabs.assets', 'Assets')}</p>
            <p className="text-3xl font-black tabular-nums tracking-tight text-emerald-400">
              {money(totalAssets)}
            </p>
          </div>
        </div>

        {/* Total Liabilities */}
        <div className="relative overflow-hidden glass-panel p-6 rounded-[2rem] shadow-2xl bg-black/40 border border-white/5 group hover:bg-white/5 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <TrendingDown className="w-24 h-24 text-rose-400" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('overview.allLiabilities', 'All Liabilities')}</p>
            <p className="text-3xl font-black tabular-nums tracking-tight text-rose-400">
              {money(totalLiabilities)}
            </p>
          </div>
        </div>

        {/* Fixed Income */}
        <div className="relative overflow-hidden glass-panel p-6 rounded-[2rem] shadow-2xl bg-black/40 border border-white/5 group hover:bg-white/5 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Wallet className="w-24 h-24 text-brand-green" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('overview.fixedIncome', 'Fixed Income')}</p>
            <p className="text-3xl font-black tabular-nums tracking-tight text-brand-green">
              {money(fixedIncome)}
            </p>
          </div>
        </div>

        {/* Net After Liabilities */}
        <div className="relative overflow-hidden glass-panel p-6 rounded-[2rem] shadow-2xl bg-black/40 border border-white/5 group hover:bg-white/5 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <CreditCard className="w-24 h-24 text-purple-400" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('overview.netAfterLiabilities', 'Net After Liabilities')}</p>
            <p className={`text-3xl font-black tabular-nums tracking-tight ${netAfterLiabilities >= 0 ? 'text-purple-400' : 'text-brand-red'}`}>
              {money(netAfterLiabilities)}
            </p>
          </div>
        </div>

        {/* Savings */}
        <div className="relative overflow-hidden glass-panel p-6 rounded-[2rem] shadow-2xl bg-black/40 border border-white/5 group hover:bg-white/5 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700">
            <PiggyBank className="w-24 h-24 text-amber-400" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('analytics.savings', 'Savings')}</p>
            <p className="text-3xl font-black tabular-nums tracking-tight text-amber-400">
              {money(savings)}
            </p>
          </div>
        </div>
      </div>

      {/* Balances Section */}
      <section className="glass-panel p-6 lg:p-8 rounded-[2rem] shadow-2xl border border-white/5 bg-black/20">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-brand-blue/20 rounded-2xl text-brand-blue">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-main)] tracking-wide">{t('analytics.accountBalances', 'Account Balances')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {accounts?.length ? accounts.map((acc) => {
            const AccIcon = getIconComponent(acc.icon, 'Wallet');
            const accBalance = accountBalances[acc._id] || 0;
            return (
              <div className="bg-black/30 p-5 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-colors group flex items-center gap-4" key={acc._id}>
                <div 
                  className="w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 transition-transform group-hover:scale-110 shadow-lg"
                  style={{ backgroundColor: `${acc.color}20`, color: acc.color }}
                >
                  <AccIcon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[var(--color-text-main)] truncate">{acc.name}</p>
                  <p className={`text-sm font-bold tracking-tight truncate mt-1 ${accBalance < 0 ? 'text-brand-red' : 'text-brand-green'}`}>
                    {money(accBalance)}
                  </p>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-8 text-center text-[var(--color-text-muted)]">
              {t('analytics.noData', 'No data available.')}
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
