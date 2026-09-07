import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TrendingDown, Users, ArrowUpRight, ArrowDownRight, CalendarClock, CheckCircle } from 'lucide-react';

export default function LiabilitiesTab({ debts, bills, filters, money }) {
  const { t } = useLanguage();

  const totalDebts = debts?.filter(d => d.type === 'i_owe').reduce((sum, d) => sum + (d.remainingAmount || 0), 0) || 0;
  const totalBorrowed = totalDebts; // Since it's only i_owe now


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
      <div className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-brand-red/30 border-l-brand-red/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-4 md:p-8 flex flex-col justify-center items-center text-center rounded-[2.5rem] relative overflow-hidden group">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 group-hover:scale-125 transition-transform duration-1000">
          <TrendingDown className="w-64 h-64 text-brand-red" />
        </div>
        
        <div className="relative z-10">
          <p className="text-sm font-bold tracking-widest uppercase mb-2 text-[var(--color-text-main)] opacity-70">{t('overview.allLiabilities')}</p>
          <p className="text-6xl font-black tabular-nums tracking-tight text-white">{money(allLiabilities)}</p>
        </div>
      </div>

      {/* Sub Summaries */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 md:gap-6">
        {/* Debts Overview */}
        <div className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:bg-white/5 transition-all duration-500 flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Users className="w-12 h-12 md:w-24 md:h-24 text-brand-red" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('nav.receivables')}</p>
            <div>
              <p className="text-xl md:text-3xl font-black tabular-nums tracking-tight text-brand-red mb-1">
                {money(totalDebts)}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                 <span className="text-[10px] md:text-xs font-bold px-2 py-1 bg-white/5 border border-white/5 rounded-md text-rose-400 uppercase tracking-wider">
                   {t('dashboard.debtsBorrowed')}: {money(totalBorrowed)}
                 </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bills Overview */}
        <div className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:bg-white/5 transition-all duration-500 flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <CalendarClock className="w-12 h-12 md:w-24 md:h-24 text-rose-400" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{t('nav.bills')}</p>
            <div>
              <p className="text-xl md:text-3xl font-black tabular-nums tracking-tight text-rose-400 mb-1">
                {money(totalBills)}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                 <span className="text-[10px] md:text-xs font-bold px-2 py-1 bg-white/5 border border-white/5 rounded-md text-[var(--color-text-muted)] uppercase tracking-wider">
                   {t('overview.allLiabilities')}: {bills?.length || 0}
                 </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Debts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {debts?.filter(d => d.remainingAmount > 0 && d.type === 'i_owe').length ? debts.filter(d => d.remainingAmount > 0 && d.type === 'i_owe').map((d) => {
          const isBorrowed = d.type === 'i_owe';
          const color = isBorrowed ? '#f43f5e' : '#10b981'; // rose-500 or emerald-500
          const initialAmount = d.initialAmount || d.amount || d.remainingAmount;
          const paid = initialAmount - d.remainingAmount;
          const progress = initialAmount > 0 ? (paid / initialAmount) * 100 : 0;
          
          return (
            <div className="bg-[#2B2321]/30 backdrop-blur-[32px] p-5 rounded-[1.5rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/5 transition-all duration-300 group flex flex-col gap-4 h-full justify-between" key={d._id}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 shadow-lg"
                    style={{ backgroundColor: `${color}20`, color: color }}
                  >
                    <Users size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--color-text-main)] text-sm md:text-base truncate max-w-[120px] sm:max-w-[150px] leading-tight" title={d.personName}>{d.personName}</p>
                    <span className="text-[9px] md:text-[10px] font-bold px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[var(--color-text-muted)] uppercase mt-1 inline-block whitespace-nowrap">
                      {isBorrowed ? t('dashboard.debtsBorrowed') : t('dashboard.debtsLent')}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-lg md:text-xl font-black tabular-nums tracking-tight text-white">{money(d.remainingAmount)}</p>
                  {d.dueDate && (
                    <p className="text-[9px] md:text-[10px] text-[var(--color-text-muted)] mt-1 whitespace-nowrap">
                      {t('overview.due')}: {new Date(d.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Repayment Progress */}
              <div className="space-y-1.5 mt-2">
                 <div className="flex justify-between text-[10px] md:text-xs text-[var(--color-text-muted)] font-medium">
                   <span>{t('dashboard.paid')}: {money(paid)}</span>
                   <span>{progress.toFixed(0)}%</span>
                 </div>
                 <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                   <div 
                     className="h-full rounded-full transition-all duration-1000 ease-out"
                     style={{ width: `${progress}%`, backgroundColor: color }}
                   />
                 </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
               <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t('liabilities.noDebtsTitle')}</h3>
            <p className="text-[var(--color-text-muted)] max-w-sm">{t('liabilities.noDebtsDesc')}</p>
          </div>
        )}
      </div>

      {/* Bills Section */}
      <section className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 lg:p-4 md:p-8 rounded-[2.5rem]">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-brand-red/20 rounded-2xl text-brand-red">
            <CalendarClock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-main)] tracking-wide">{t('nav.bills')}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {bills?.length ? bills.map((b) => (
            <div className="bg-[#2B2321]/30 backdrop-blur-[32px] p-5 rounded-[1.5rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/5 transition-all duration-300 group flex flex-col gap-4 h-full justify-between" key={b._id}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 shadow-lg"
                    style={{ backgroundColor: `rgba(244, 63, 94, 0.2)`, color: '#f43f5e' }}
                  >
                    <CalendarClock size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--color-text-main)] text-sm md:text-base truncate max-w-[120px] sm:max-w-[150px] leading-tight" title={b.name}>{b.name}</p>
                    {b.repeat && (
                      <span className="text-[9px] md:text-[10px] font-bold px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[var(--color-text-muted)] uppercase mt-1 inline-block whitespace-nowrap">
                        {t(`frequency.${b.repeat}`, b.repeat)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-lg md:text-xl font-black tabular-nums tracking-tight text-brand-red">{money(b.expectedAmount)}</p>
                  <p className="text-[9px] md:text-[10px] text-[var(--color-text-muted)] mt-1 whitespace-nowrap">
                    {t('overview.next')}: {new Date(b.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] text-center mt-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                 <CheckCircle className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('liabilities.noBillsTitle')}</h3>
              <p className="text-[var(--color-text-muted)] max-w-sm">{t('liabilities.noBillsDesc')}</p>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
