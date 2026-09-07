import React, { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getIconComponent } from '../IconPicker';
import { TrendingUp, TrendingDown, Landmark, Wallet, PiggyBank, CreditCard } from 'lucide-react';

export default function OverviewTab({ money, data, accounts, investments, debts, bills, recurring, incomeProfiles, filters, allTransactions, allDebtTransactions, allReceivables }) {
  const { t } = useLanguage();

  const accountBalances = useMemo(() => {
    const balances = {};
    const totalInvestmentsValue = (investments || []).reduce((sum, inv) => sum + (inv.currentValue || 0), 0);

    (accounts || []).forEach(acc => {
      balances[acc._id] = acc.type === 'investment' ? totalInvestmentsValue : (acc.balance_adjustment || 0);
    });

    (allTransactions || []).forEach(t => {
      const amount = Number(t.amount);
      const accId = t.account?._id || t.account;
      const fromId = t.from_account?._id || t.from_account;
      const toId = t.to_account?._id || t.to_account;

      const accObj = (accounts || []).find(a => a._id === accId);
      const fromObj = (accounts || []).find(a => a._id === fromId);
      const toObj = (accounts || []).find(a => a._id === toId);

      if (t.type === 'income') {
        if (accId && accObj?.type !== 'investment') balances[accId] = (balances[accId] || 0) + amount;
      } else if (t.type === 'expense') {
        if (accId && accObj?.type !== 'investment') balances[accId] = (balances[accId] || 0) - amount;
      } else if (t.type === 'transfer') {
        if (fromId && fromObj?.type !== 'investment') balances[fromId] = (balances[fromId] || 0) - amount;
        if (toId && toObj?.type !== 'investment') balances[toId] = (balances[toId] || 0) + amount;
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
    
    (allReceivables || []).forEach(r => {
      if (r.paidFrom) balances[r.paidFrom._id || r.paidFrom] = (balances[r.paidFrom._id || r.paidFrom] || 0) - r.paidAmount;
      if (r.receivedTo) balances[r.receivedTo._id || r.receivedTo] = (balances[r.receivedTo._id || r.receivedTo] || 0) + r.receivedAmount;
      if (r.participants) {
        r.participants.forEach(p => {
          if (p.payments) {
            p.payments.forEach(pay => {
              if (pay.account) balances[pay.account._id || pay.account] = (balances[pay.account._id || pay.account] || 0) + pay.amount;
            });
          }
        });
      }
    });

    // Ensure investment account balance always reflects live market value of investments
    (accounts || []).forEach(acc => {
      if (acc.type === 'investment') {
        balances[acc._id] = totalInvestmentsValue;
      }
    });

    return balances;
  }, [accounts, investments, allTransactions, allDebtTransactions, allReceivables]);

  const totalAccountBalances = useMemo(() => {
    let total = 0;
    (accounts || []).forEach(acc => {
      if (!acc.isArchived && (!acc.excludeFromTotal || acc.type === 'investment')) {
        total += (accountBalances[acc._id] || 0);
      }
    });

    // Fallback if no account has type === 'investment'
    const hasInvestmentAccount = (accounts || []).some(a => a.type === 'investment');
    if (!hasInvestmentAccount) {
      total += (investments || []).reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
    }
    return total;
  }, [accounts, accountBalances, investments]);

  // Total Assets is literally all balance in all non-archived accounts (including the investment account)
  const totalAssets = useMemo(() => {
    let total = 0;
    (accounts || []).forEach(acc => {
      if (!acc.isArchived) {
        total += (accountBalances[acc._id] || 0);
      }
    });

    // Fallback if no account has type === 'investment'
    const hasInvestmentAccount = (accounts || []).some(a => a.type === 'investment');
    if (!hasInvestmentAccount) {
      total += (investments || []).reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
    }
    return total;
  }, [accounts, accountBalances, investments]);
  
  // Debts I have to pay (borrowed / i_owe)
  const totalDebtsToPay = useMemo(() => {
    return (debts || [])
      .filter(d => String(d.type) === 'i_owe' || String(d.debtType) === 'i_owe' || String(d.type) === 'borrowed')
      .reduce((sum, d) => sum + (Number(d.remainingAmount) || 0), 0);
  }, [debts]);

  const totalInvestments = useMemo(() => {
    return (investments || []).reduce((sum, inv) => sum + (inv.currentValue || 0), 0);
  }, [investments]);

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
    return (bills || [])
      .filter(b => b.status !== 'paid' || (b.repeat && b.repeat !== 'never'))
      .reduce((sum, b) => {
        const occurrences = calculateOccurrences(b.dueDate, b.repeat || 'never', filters);
        return sum + (Number(b.expectedAmount) || 0) * occurrences;
      }, 0);
  }, [bills, filters]);

  // Liabilities = debts I have to pay + bills I have to pay for the active filter period
  const totalLiabilities = (totalDebtsToPay || 0) + (totalBills || 0);
  
  // Net Worth = all the balance in all accounts minus liabilities
  const netWorth = totalAssets - totalLiabilities;
  
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
    return (incomeProfiles || [])
      .filter(p => p.isActive !== false) // Active by default or explicitly true
      .reduce((sum, p) => {
        const occurrences = calculateOccurrences(p.createdAt || new Date(), p.frequency || 'monthly', filters);
        return sum + (p.amount || 0) * occurrences;
      }, 0);
  }, [incomeProfiles, filters]);

  const netAfterLiabilities = fixedIncome - totalLiabilities;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in pb-10">
      <div className="xl:col-span-8 space-y-6">
      
      {/* Hero Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {/* Net Worth */}
        <div className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:shadow-[#8D6346]/20 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
            <Landmark className="w-12 h-12 md:w-24 md:h-24 text-[#8D6346]" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-80">{t('overview.netWorth')}</p>
            <p className={`text-2xl md:text-4xl lg:text-5xl font-black tabular-nums tracking-tight ${netWorth >= 0 ? 'text-[#E8C5A8]' : 'text-rose-400'}`}>
              {money(netWorth)}
            </p>
          </div>
        </div>

        {/* Investments */}
        <div className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:shadow-[#8D6346]/20 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-700">
            <TrendingUp className="w-12 h-12 md:w-24 md:h-24 text-[#8D6346]" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('sidebar.investments')}</p>
            <p className="text-xl md:text-3xl font-black tabular-nums tracking-tight text-emerald-400">
              {money(totalInvestments)}
            </p>
          </div>
        </div>

        {/* Total Liabilities */}
        <div className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:shadow-[#8D6346]/20 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-700">
            <TrendingDown className="w-12 h-12 md:w-24 md:h-24 text-[#8D6346]" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('overview.allLiabilities')}</p>
            <p className="text-xl md:text-3xl font-black tabular-nums tracking-tight text-rose-400">
              {money(totalLiabilities)}
            </p>
          </div>
        </div>

        {/* Fixed Income */}
        <div className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:shadow-[#8D6346]/20 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-700">
            <Wallet className="w-12 h-12 md:w-24 md:h-24 text-[#8D6346]" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('overview.fixedIncome')}</p>
            <p className="text-xl md:text-3xl font-black tabular-nums tracking-tight text-emerald-400">
              {money(fixedIncome)}
            </p>
          </div>
        </div>

        {/* Net After Liabilities */}
        <div className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:shadow-[#8D6346]/20 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-700">
            <CreditCard className="w-12 h-12 md:w-24 md:h-24 text-[#8D6346]" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('overview.netAfterLiabilities')}</p>
            <p className={`text-xl md:text-3xl font-black tabular-nums tracking-tight ${netAfterLiabilities >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {money(netAfterLiabilities)}
            </p>
          </div>
        </div>

        {/* Savings */}
        <div className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:shadow-[#8D6346]/20 transition-all duration-500">
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700">
            <PiggyBank className="w-12 h-12 md:w-24 md:h-24 text-[#8D6346]" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('analytics.savings')}</p>
            <p className="text-xl md:text-3xl font-black tabular-nums tracking-tight text-[#E8C5A8]">
              {money(savings)}
            </p>
          </div>
        </div>
      </div>

      </div>
      <div className="xl:col-span-4 h-full">
      {/* Balances Section */}
      <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-5 lg:p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-2xl text-[#8D6346] shadow-[0_2px_8px_rgba(141,99,70,0.2)]">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-main)] tracking-wide">{t('analytics.accountBalances')}</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-3 md:gap-4">
          {accounts?.length ? accounts.map((acc) => {
            const AccIcon = getIconComponent(acc.icon, 'Wallet');
            const accBalance = accountBalances[acc._id] || 0;
            return (
              <div className="bg-black/10 shadow-inner p-3 md:p-5 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-colors group flex items-center gap-2 md:gap-4" key={acc._id}>
                <div 
                  className="w-8 h-8 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl shrink-0 transition-transform group-hover:scale-110 shadow-lg"
                  style={{ backgroundColor: `${acc.color}20`, color: acc.color }}
                >
                  <AccIcon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{acc.name}</p>
                  <p className={`text-sm font-bold tracking-tight truncate mt-1 ${accBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {money(accBalance)}
                  </p>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-8 text-center text-[var(--color-text-muted)]">
              {t('analytics.noData')}
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
