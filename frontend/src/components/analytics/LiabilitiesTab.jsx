import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TrendingDown, Users, ArrowUpRight, ArrowDownRight, CalendarClock } from 'lucide-react';

export default function LiabilitiesTab({ debts, bills, filters, money }) {
  const { t } = useLanguage();

  const totalDebts = debts?.reduce((sum, d) => sum + (d.remainingAmount || 0), 0) || 0;
  const totalBorrowed = debts?.filter(d => d.type === 'borrowed').reduce((sum, d) => sum + (d.remainingAmount || 0), 0) || 0;
  const totalLent = debts?.filter(d => d.type === 'lent').reduce((sum, d) => sum + (d.remainingAmount || 0), 0) || 0;

  // Helper to count exact occurrences of a repeating event within the filtered date range (Mathematically accurate for JS Dates)
  const calculateOccurrences = (eventDate, frequency, filters) => {
    if (!eventDate) return 0;
    
    const start = new Date(eventDate);
    const fromDate = filters?.from ? new Date(filters.from) : new Date(start);
    const toDate = filters?.to ? new Date(filters.to) : new Date();
    
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
        const expectedMonth = ((targetMonth % 12) + 12) % 12;
        d.setMonth(targetMonth);
        if (d.getMonth() !== expectedMonth) d.setDate(0);
      }
      return d;
    };

    let count = 0;
    let i = 0;
    
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
      if (i > 10000) break;
    }
    
    return count;
  };

  const totalBills = React.useMemo(() => {
    return (bills || []).reduce((sum, b) => {
      const occurrences = calculateOccurrences(b.dueDate, b.repeat || 'never', filters);
      return sum + (b.expectedAmount || 0) * occurrences;
    }, 0);
  }, [bills, filters]);

  const allLiabilities = totalDebts + totalBills;

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      
      {/* Master Hero Summary: All Liabilities */}
      <div className="glass-panel p-8 flex flex-col justify-center items-center text-center rounded-[2rem] shadow-2xl border border-white/5 bg-gradient-to-br from-brand-red/30 to-black/60 relative overflow-hidden group">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 group-hover:scale-125 transition-transform duration-1000">
          <TrendingDown className="w-64 h-64 text-brand-red" />
        </div>
        
        <div className="relative z-10">
          <p className="text-sm font-bold tracking-widest uppercase mb-2 text-[var(--color-text-main)] opacity-70">{t('overview.allLiabilities', 'All Liabilities')}</p>
          <p className="text-6xl font-black tabular-nums tracking-tight text-white">{money(allLiabilities)}</p>
        </div>
      </div>

      {/* Sub Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Debts Overview */}
        <div className="glass-panel p-8 flex flex-col md:flex-row justify-between items-center rounded-[2rem] shadow-2xl border border-white/5 bg-gradient-to-br from-brand-red/20 to-black/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700">
            <Users className="w-24 h-24 text-brand-red" />
          </div>
          
          <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
            <p className="text-sm font-bold tracking-widest uppercase mb-2 text-[var(--color-text-main)] opacity-70">{t('nav.receivables', 'Debts')}</p>
            <p className="text-4xl font-black tabular-nums tracking-tight text-white mb-2">{money(totalDebts)}</p>
            
            <div className="flex items-center gap-4 justify-center md:justify-start mt-4">
               <div className="flex items-center gap-2 bg-brand-red/10 px-3 py-1.5 rounded-xl border border-brand-red/20">
                 <ArrowDownRight className="w-4 h-4 text-brand-red" />
                 <div className="flex flex-col">
                   <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{t('dashboard.debtsBorrowed', 'Borrowed')}</span>
                   <span className="text-sm font-bold text-brand-red leading-none">{money(totalBorrowed)}</span>
                 </div>
               </div>
               
               <div className="flex items-center gap-2 bg-brand-green/10 px-3 py-1.5 rounded-xl border border-brand-green/20">
                 <ArrowUpRight className="w-4 h-4 text-brand-green" />
                 <div className="flex flex-col">
                   <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{t('dashboard.debtsLent', 'Lent')}</span>
                   <span className="text-sm font-bold text-brand-green leading-none">{money(totalLent)}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Bills Overview */}
        <div className="glass-panel p-8 flex flex-col md:flex-row justify-between items-center rounded-[2rem] shadow-2xl border border-white/5 bg-gradient-to-br from-brand-red/20 to-black/40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-700">
            <CalendarClock className="w-24 h-24 text-brand-red" />
          </div>
          
          <div className="relative z-10 text-center md:text-left">
            <p className="text-sm font-bold tracking-widest uppercase mb-2 text-[var(--color-text-main)] opacity-70">{t('nav.bills', 'Bills')}</p>
            <p className="text-4xl font-black tabular-nums tracking-tight text-white mb-2">{money(totalBills)}</p>
            
            <div className="flex items-center gap-4 justify-center md:justify-start mt-4">
               <div className="flex items-center gap-2 bg-brand-red/10 px-4 py-2 rounded-xl border border-brand-red/20">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{t('overview.allLiabilities', 'Total Bills')}</span>
                   <span className="text-sm font-bold text-brand-red leading-none">{bills?.length || 0}</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Debts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {debts?.length ? debts.map((d) => {
          const isBorrowed = d.type === 'borrowed';
          const color = isBorrowed ? '#f43f5e' : '#10b981'; // rose-500 or emerald-500
          const initialAmount = d.amount || d.remainingAmount;
          const paid = initialAmount - d.remainingAmount;
          const progress = initialAmount > 0 ? (paid / initialAmount) * 100 : 0;
          
          return (
            <div className="bg-black/40 p-6 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden" key={d._id}>
              {/* Type Glow */}
              <div 
                className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100px] -z-10 opacity-10 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
              
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `${color}20`, color: color }}
                >
                  <Users size={20} />
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-xs font-bold px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[var(--color-text-muted)] uppercase tracking-wider">
                     {isBorrowed ? t('dashboard.debtsBorrowed', 'Borrowed') : t('dashboard.debtsLent', 'Lent')}
                   </span>
                   {d.dueDate && (
                     <span className="text-[10px] text-[var(--color-text-muted)] mt-2">
                       Due: {new Date(d.dueDate).toLocaleDateString()}
                     </span>
                   )}
                </div>
              </div>
              
              <div className="relative z-10">
                <p className="font-bold text-lg text-[var(--color-text-main)] mb-1">{d.personName}</p>
                <div className="flex items-end justify-between mt-4 mb-3">
                  <span className="text-2xl font-black tabular-nums tracking-tight text-white">{money(d.remainingAmount)}</span>
                </div>
                
                {/* Repayment Progress */}
                <div className="space-y-1.5">
                   <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
                     <span>{t('dashboard.paid', 'Paid')}: {money(paid)}</span>
                     <span>{progress.toFixed(0)}%</span>
                   </div>
                   <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden shadow-inner">
                     <div 
                       className="h-full rounded-full transition-all duration-1000 ease-out"
                       style={{ width: `${progress}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}80` }}
                     />
                   </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-12 text-center">
            <p className="text-[var(--color-text-muted)]">{t('analytics.noData', 'No data')}</p>
          </div>
        )}
      </div>

      {/* Bills Section */}
      <section className="glass-panel p-6 lg:p-8 rounded-[2rem] shadow-2xl border border-white/5 bg-black/20">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-brand-red/20 rounded-2xl text-brand-red">
            <CalendarClock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-main)] tracking-wide">{t('nav.bills', 'Bills')}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bills?.length ? bills.map((b) => (
            <div className="bg-black/40 p-6 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden flex flex-col justify-between min-h-[140px]" key={b._id}>
               <div className="absolute top-0 right-0 w-24 h-24 bg-brand-red/10 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform" />
               <div className="z-10">
                 <p className="font-bold text-[var(--color-text-main)] text-lg mb-1">{b.name}</p>
                 <p className="text-sm text-[var(--color-text-muted)]">{b.frequency}</p>
               </div>
               <div className="z-10 mt-4 flex items-end justify-between">
                 <span className="text-2xl font-black tabular-nums tracking-tight text-brand-red">
                   {money(b.expectedAmount)}
                 </span>
                 <span className="text-xs font-medium px-2 py-1 bg-white/5 rounded-lg text-[var(--color-text-muted)]">
                   Next: {new Date(b.dueDate).toLocaleDateString()}
                 </span>
               </div>
            </div>
          )) : (
            <div className="col-span-full py-12 text-center">
              <p className="text-[var(--color-text-muted)]">{t('analytics.noData', 'No data')}</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
