import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TrendingDown, Users, ArrowUpRight, ArrowDownRight, CalendarClock, CheckCircle } from 'lucide-react';

export default function LiabilitiesTab({ debts, bills, filters, money, allDebtTransactions }) {
  const { t } = useLanguage();

  const totalDebts = React.useMemo(() => {
    return (debts || [])
      .filter(d => d.type === 'i_owe')
      .filter(d => {
        if (!filters?.from || !filters?.to || filters?.filterType === 'all') return true;
        const fromDate = new Date(filters.from);
        const toDate = new Date(filters.to);
        const loanTx = (allDebtTransactions || []).find(dt => 
          (dt.debtId?._id ? String(dt.debtId._id) : String(dt.debtId)) === String(d._id) && 
          dt.type === 'loan'
        );
        const debtDateRaw = loanTx?.date || d.dueDate || d.createdAt;
        if (!debtDateRaw) return true;
        const debtDate = new Date(debtDateRaw);
        return debtDate >= fromDate && debtDate <= toDate;
      })
      .reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
  }, [debts, allDebtTransactions, filters]);

  const totalBorrowed = totalDebts; // Since it's only i_owe now


  // Helper to count exact occurrences of a repeating event within the filtered date range (Mathematically accurate for JS Dates)
  const calculateOccurrences = (eventDate, frequency, filters, createdAt = null) => {
    if (!eventDate) return 0;
    
    const start = new Date(eventDate);
    const fromDate = filters?.from ? new Date(filters.from) : new Date(start);
    let toDate = filters?.to ? new Date(filters.to) : new Date();

    const today = new Date();
    if (filters?.filterType === 'year' && toDate > today) {
      toDate = today;
    }
    if (fromDate > toDate) return 0;
    
    if (frequency === 'never') {
      return (start >= fromDate && start <= toDate) ? 1 : 0;
    }

    const earliestDate = createdAt ? new Date(createdAt) : null;

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
    } else if (start > toDate) {
      if (frequency === 'daily') i = Math.floor((fromDate - start) / (1000 * 60 * 60 * 24)) - 1;
      else if (frequency === 'weekly') i = Math.floor((fromDate - start) / (1000 * 60 * 60 * 24 * 7)) - 1;
      else if (frequency === 'monthly') i = (fromDate.getFullYear() - start.getFullYear()) * 12 + (fromDate.getMonth() - start.getMonth()) - 1;
      else if (frequency === 'yearly') i = fromDate.getFullYear() - start.getFullYear() - 1;
    }

    while (true) {
      const current = getOccurrence(i);
      if (current > toDate) break;
      if (current >= fromDate) {
        if (!earliestDate || current >= earliestDate) {
          count++;
        }
      }
      i++;
      if (i > 10000) break;
    }
    
    return count;
  };

  const getRepeatingOccurrences = (eventDate, frequency, fromDate, toDate) => {
    if (!eventDate || !frequency || frequency === 'never' || fromDate > toDate) return [];
    const start = new Date(eventDate);

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

    let i = 0;
    if (start < fromDate) {
      if (frequency === 'daily') i = Math.max(0, Math.floor((fromDate - start) / (1000 * 60 * 60 * 24)));
      else if (frequency === 'weekly') i = Math.max(0, Math.floor((fromDate - start) / (1000 * 60 * 60 * 24 * 7)));
      else if (frequency === 'monthly') i = Math.max(0, (fromDate.getFullYear() - start.getFullYear()) * 12 + (fromDate.getMonth() - start.getMonth()) - 1);
      else if (frequency === 'yearly') i = Math.max(0, fromDate.getFullYear() - start.getFullYear() - 1);
    } else if (start > toDate) {
      if (frequency === 'daily') i = Math.floor((fromDate - start) / (1000 * 60 * 60 * 24)) - 1;
      else if (frequency === 'weekly') i = Math.floor((fromDate - start) / (1000 * 60 * 60 * 24 * 7)) - 1;
      else if (frequency === 'monthly') i = (fromDate.getFullYear() - start.getFullYear()) * 12 + (fromDate.getMonth() - start.getMonth()) - 1;
      else if (frequency === 'yearly') i = fromDate.getFullYear() - start.getFullYear() - 1;
    }

    const occurrences = [];
    while (true) {
      const current = getOccurrence(i);
      if (current > toDate) break;
      if (current >= fromDate) {
        occurrences.push(current);
      }
      i++;
      if (i > 10000) break;
    }
    return occurrences;
  };

  const filteredDebts = React.useMemo(() => {
    return (debts || [])
      .filter(d => d.type === 'i_owe' && (d.remainingAmount > 0 || d.status === 'active'))
      .filter(d => {
        if (!filters?.from || !filters?.to || filters?.filterType === 'all') return true;
        const fromDate = new Date(filters.from);
        const toDate = new Date(filters.to);
        const loanTx = (allDebtTransactions || []).find(dt => 
          (dt.debtId?._id ? String(dt.debtId._id) : String(dt.debtId)) === String(d._id) && 
          dt.type === 'loan'
        );
        const debtDateRaw = loanTx?.date || d.dueDate || d.createdAt;
        if (!debtDateRaw) return true;
        const debtDate = new Date(debtDateRaw);
        return debtDate >= fromDate && debtDate <= toDate;
      });
  }, [debts, allDebtTransactions, filters]);

  const filteredBills = React.useMemo(() => {
    if (!bills || !bills.length) return [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (!filters?.from || !filters?.to || filters?.filterType === 'all') {
      return bills
        .filter(b => b.isActive !== false)
        .map(b => {
          const isPaid = b.status === 'paid';
          const dueDate = new Date(b.dueDate);
          const dueTime = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
          const isOverdue = !isPaid && dueTime < todayStart;
          const isDueToday = !isPaid && dueTime === todayStart;

          return {
            ...b,
            isPaidForPeriod: isPaid,
            periodDueDate: b.dueDate,
            periodPaymentDate: b.paymentDate || b.lastPaymentDate,
            isOverdue,
            isDueToday
          };
        });
    }

    const fromDate = new Date(filters.from);
    const toDate = new Date(filters.to);

    let billFromDate = fromDate;
    let billToDate = toDate;
    const isCurrentPeriod = ['today', 'this_week', 'this_month', 'year'].includes(filters?.filterType) || (filters?.filterType === 'custom' && toDate.getTime() >= todayStart);

    if (filters?.filterType === 'this_month') {
      billFromDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1, 0, 0, 0, 0);
      billToDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (filters?.filterType === 'this_week') {
      billToDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    } else if (filters?.filterType === 'year') {
      billToDate = new Date(fromDate.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (filters?.filterType === 'last_month') {
      billFromDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1, 0, 0, 0, 0);
      billToDate = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (filters?.filterType === 'last_week') {
      billToDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    } else if (filters?.filterType === 'yesterday') {
      billFromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      billToDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (filters?.filterType === 'today') {
      billFromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      billToDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (filters?.filterType === 'custom') {
      billToDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999);
    }

    const result = [];

    for (const b of bills) {
      if (b.isActive === false) continue;

      const history = Array.isArray(b.paymentHistory) ? b.paymentHistory : [];
      const payments = history.length > 0
        ? history
        : (b.paymentDate ? [{ paidAt: b.paymentDate, dueDate: b.dueDate, amount: b.expectedAmount }] : []);

      if (b.repeat === 'never') {
        const dueDate = new Date(b.dueDate);
        const inDueRange = dueDate >= billFromDate && dueDate <= billToDate;

        const matchingPayment = payments.find(p => 
          (p.dueDate && new Date(p.dueDate) >= billFromDate && new Date(p.dueDate) <= billToDate) ||
          (p.paidAt && new Date(p.paidAt) >= billFromDate && new Date(p.paidAt) <= billToDate) ||
          (inDueRange && p.paidAt && Math.abs(new Date(p.paidAt).getTime() - dueDate.getTime()) <= 15 * 86400 * 1000)
        ) || (b.status === 'paid' && inDueRange ? { paidAt: b.paymentDate || b.updatedAt || b.dueDate, dueDate: b.dueDate } : null);

        const inPaymentRange = Boolean(matchingPayment);
        const isOverduePast = isCurrentPeriod && (b.status === 'overdue' || (b.status !== 'paid' && dueDate.getTime() < todayStart)) && dueDate < billFromDate;

        if (inDueRange || inPaymentRange || isOverduePast) {
          const isPaid = b.status === 'paid' || inPaymentRange;
          const displayDate = matchingPayment?.dueDate || b.dueDate;
          const dueTime = new Date(new Date(displayDate).getFullYear(), new Date(displayDate).getMonth(), new Date(displayDate).getDate()).getTime();

          result.push({
            ...b,
            isPaidForPeriod: isPaid,
            periodDueDate: displayDate,
            periodPaymentDate: matchingPayment?.paidAt || (isPaid ? b.paymentDate : null),
            isOverdue: !isPaid && dueTime < todayStart,
            isDueToday: !isPaid && dueTime === todayStart
          });
        }
      } else {
        // Repeating bill
        const occurrences = getRepeatingOccurrences(b.dueDate, b.repeat, billFromDate, billToDate);
        const usedPaymentIndices = new Set();

        occurrences.forEach((occDate) => {
          const occTime = occDate.getTime();
          const occDay = occDate.getDate();
          const occMonth = occDate.getMonth();
          const occYear = occDate.getFullYear();

          let matchedIdx = -1;
          for (let i = 0; i < payments.length; i++) {
            if (usedPaymentIndices.has(i)) continue;
            const p = payments[i];

            if (p.dueDate) {
              const pd = new Date(p.dueDate);
              if (pd.getFullYear() === occYear && pd.getMonth() === occMonth && pd.getDate() === occDay) {
                matchedIdx = i;
                break;
              }
              if (Math.abs(pd.getTime() - occTime) < 36 * 3600 * 1000) {
                matchedIdx = i;
                break;
              }
            }

            if (p.paidAt) {
              const paidTime = new Date(p.paidAt).getTime();
              let maxWindow = 15 * 86400 * 1000;
              if (b.repeat === 'weekly') maxWindow = 4 * 86400 * 1000;
              else if (b.repeat === 'yearly') maxWindow = 45 * 86400 * 1000;

              if (Math.abs(paidTime - occTime) <= maxWindow) {
                matchedIdx = i;
                break;
              }
            }
          }

          const payment = matchedIdx !== -1 ? payments[matchedIdx] : null;
          if (matchedIdx !== -1) {
            usedPaymentIndices.add(matchedIdx);
          }

          const isPaid = Boolean(payment);
          const dueTime = new Date(occYear, occMonth, occDay).getTime();

          result.push({
            ...b,
            _id: `${b._id}_${occTime}`,
            originalId: b._id,
            isPaidForPeriod: isPaid,
            periodDueDate: occDate,
            periodPaymentDate: payment?.paidAt || null,
            isOverdue: !isPaid && dueTime < todayStart,
            isDueToday: !isPaid && dueTime === todayStart
          });
        });

        payments.forEach((p, idx) => {
          if (usedPaymentIndices.has(idx)) return;
          if (!p.paidAt) return;
          const paidDate = new Date(p.paidAt);
          if (paidDate >= billFromDate && paidDate <= billToDate) {
            usedPaymentIndices.add(idx);
            result.push({
              ...b,
              _id: `${b._id}_pay_${idx}`,
              originalId: b._id,
              isPaidForPeriod: true,
              periodDueDate: p.dueDate || p.paidAt,
              periodPaymentDate: p.paidAt,
              isOverdue: false,
              isDueToday: false
            });
          }
        });
      }
    }

    if (isCurrentPeriod) {
      const addedOriginalIds = new Set(result.map(r => String(r.originalId || r._id)));
      for (const b of bills) {
        if (b.isActive === false) continue;
        if (addedOriginalIds.has(String(b._id))) continue;

        const dueTime = new Date(b.dueDate).getTime();
        const isPaid = b.status === 'paid';
        const isOverdue = !isPaid && dueTime < todayStart;
        if (isOverdue) {
          result.push({
            ...b,
            _id: `${b._id}_overdue`,
            originalId: b._id,
            isPaidForPeriod: false,
            periodDueDate: b.dueDate,
            periodPaymentDate: null,
            isOverdue: true,
            isDueToday: false
          });
        }
      }
    }

    return result;
  }, [bills, filters]);

  const totalBills = React.useMemo(() => {
    if (!filteredBills || !filteredBills.length) return 0;
    return filteredBills
      .reduce((sum, b) => sum + (Number(b.expectedAmount) || 0), 0);
  }, [filteredBills]);

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
                   {t('overview.allLiabilities')}: {filteredBills.length}
                 </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Debts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {filteredDebts.length ? filteredDebts.map((d) => {
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
          {filteredBills.length ? filteredBills.map((b) => {
            const isPaid = b.isPaidForPeriod !== undefined ? b.isPaidForPeriod : (b.status === 'paid');
            const displayDate = b.periodDueDate || b.dueDate;
            const isOverdue = b.isOverdue;
            const isDueToday = b.isDueToday;

            let statusBg = 'bg-sky-500/10 border-sky-500/20 text-sky-400';
            let statusText = t('bills.status.upcoming');
            let iconBg = 'rgba(56, 189, 248, 0.2)';
            let iconColor = '#38bdf8';
            let amountColor = 'text-white';

            if (isPaid) {
              statusBg = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
              statusText = t('bills.status.paid');
              iconBg = 'rgba(52, 199, 89, 0.2)';
              iconColor = '#34C759';
              amountColor = 'text-emerald-400';
            } else if (isOverdue) {
              statusBg = 'bg-rose-500/10 border-rose-500/20 text-rose-400';
              statusText = t('bills.status.overdue');
              iconBg = 'rgba(244, 63, 94, 0.2)';
              iconColor = '#f43f5e';
              amountColor = 'text-brand-red';
            } else if (isDueToday) {
              statusBg = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
              statusText = t('bills.status.due_today');
              iconBg = 'rgba(245, 158, 11, 0.2)';
              iconColor = '#f59e0b';
              amountColor = 'text-amber-400';
            }

            return (
              <div className="bg-[#2B2321]/30 backdrop-blur-[32px] p-5 rounded-[1.5rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/5 transition-all duration-300 group flex flex-col gap-4 h-full justify-between" key={b._id}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 shadow-lg"
                      style={{ backgroundColor: iconBg, color: iconColor }}
                    >
                      {isPaid ? <CheckCircle size={24} /> : <CalendarClock size={24} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--color-text-main)] text-sm md:text-base truncate max-w-[120px] sm:max-w-[150px] leading-tight" title={b.name}>{b.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {b.repeat && b.repeat !== 'never' && (
                          <span className="text-[9px] md:text-[10px] font-bold px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[var(--color-text-muted)] uppercase inline-block whitespace-nowrap">
                            {t(`frequency.${b.repeat}`, b.repeat)}
                          </span>
                        )}
                        <span className={`text-[9px] md:text-[10px] font-bold px-2 py-0.5 border rounded-md uppercase inline-block whitespace-nowrap ${statusBg}`}>
                          {statusText}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`text-lg md:text-xl font-black tabular-nums tracking-tight ${amountColor}`}>{money(b.expectedAmount)}</p>
                    <p className="text-[9px] md:text-[10px] text-[var(--color-text-muted)] mt-1 whitespace-nowrap">
                      {isPaid && b.periodPaymentDate ? (
                        <span>{t('bills.status.paid')}: {new Date(b.periodPaymentDate).toLocaleDateString()}</span>
                      ) : (
                        <span>{t('overview.due')}: {new Date(displayDate).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          }) : (
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
