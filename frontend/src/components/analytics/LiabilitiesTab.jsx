import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { TrendingDown, Users, CalendarClock, CheckCircle, Plus } from 'lucide-react';
import { getMetricFontSize, metricFlow } from '../../utils/metricFontSize';

function LiabilitiesTabComponent({ debts, bills, filters, money, allDebtTransactions }) {
  const { t, lang } = useLanguage();
  const reduceMotion = useReducedMotion();

  const loanTxMap = React.useMemo(() => {
    const map = new Map();
    (allDebtTransactions || []).forEach(dt => {
      if (dt.type === 'loan') {
        const id = dt.debtId?._id ? String(dt.debtId._id) : String(dt.debtId || '');
        if (id && !map.has(id)) {
          map.set(id, dt);
        }
      }
    });
    return map;
  }, [allDebtTransactions]);

  const { isAllRange, fromTime, toTime } = React.useMemo(() => {
    const isAll = !filters?.from || !filters?.to || filters?.filterType === 'all';
    return {
      isAllRange: isAll,
      fromTime: !isAll ? new Date(filters.from).getTime() : -Infinity,
      toTime: !isAll ? new Date(filters.to).getTime() : Infinity
    };
  }, [filters?.from, filters?.to, filters?.filterType]);

  const totalDebts = React.useMemo(() => {
    return (debts || [])
      .filter(d => d.type === 'i_owe')
      .filter(d => {
        if (isAllRange) return true;
        const loanTx = loanTxMap.get(String(d._id));
        const debtDateRaw = loanTx?.date || d.dueDate || d.createdAt;
        if (!debtDateRaw) return true;
        const debtTime = new Date(debtDateRaw).getTime();
        return debtTime >= fromTime && debtTime <= toTime;
      })
      .reduce((sum, d) => sum + (d.remainingAmount || 0), 0);
  }, [debts, loanTxMap, isAllRange, fromTime, toTime]);

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
        if (isAllRange) return true;
        const loanTx = loanTxMap.get(String(d._id));
        const debtDateRaw = loanTx?.date || d.dueDate || d.createdAt;
        if (!debtDateRaw) return true;
        const debtTime = new Date(debtDateRaw).getTime();
        return debtTime >= fromTime && debtTime <= toTime;
      });
  }, [debts, loanTxMap, isAllRange, fromTime, toTime]);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: reduceMotion ? { duration: 0.15 } : { staggerChildren: 0.04 }
    }
  };

  const itemVariants = reduceMotion
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } }
    : { hidden: { opacity: 0, y: 12, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', bounce: 0.15, duration: 0.45 } } };

  return (
    <div className="space-y-10 pb-10">
      
      {/* Master Hero Summary: All Liabilities */}
      <motion.div 
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-[#FF3B30]/30 border-s-[#FF3B30]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-4 md:p-8 flex flex-col justify-center items-center text-center rounded-[2.5rem] relative overflow-hidden group"
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-5 group-hover:scale-125 transition-transform duration-1000 motion-reduce:transition-none pointer-events-none">
          <TrendingDown className="w-64 h-64 text-[#FF3B30]" />
        </div>
        
        <div className="relative z-10 max-w-xl">
          <p className="text-xs md:text-sm font-bold ltr:tracking-wider ltr:uppercase rtl:tracking-normal mb-2 text-white/70">{t('analytics.overview.allLiabilities')}</p>
          <p className={`${getMetricFontSize(money(allLiabilities), { hero: true })} font-black tabular-nums tracking-tight text-white min-w-0 break-all`}>{money(allLiabilities)}</p>
          <p className="text-xs sm:text-sm text-white/60 mt-2 leading-relaxed">{t('analytics.overview.liabilitiesDesc')}</p>
        </div>
      </motion.div>

      {/* Sub Summaries */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6"
      >
        {/* Debts Overview */}
        <motion.div 
          variants={itemVariants}
          whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
          className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:border-[#FF3B30]/30 transition-colors duration-300 flex flex-col justify-between min-h-[140px]"
        >
          <div className="absolute top-0 end-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            <Users className="w-12 h-12 md:w-24 md:h-24 text-[#FF3B30]" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-xs md:text-sm font-bold ltr:tracking-wider ltr:uppercase rtl:tracking-normal mb-3 text-white/70">{t('debts.iOwe')}</p>
            <div>
              <p className={`${getMetricFontSize(money(totalDebts))} ${metricFlow} font-black text-[#FF3B30] mb-1`}>
                {money(totalDebts)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Bills Overview */}
        <motion.div 
          variants={itemVariants}
          whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
          className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:border-[#007AFF]/30 hover:shadow-[0_8px_32px_rgba(0,122,255,0.15)] transition-colors duration-300 flex flex-col justify-between min-h-[140px]"
        >
          <div className="absolute top-0 end-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            <CalendarClock className="w-12 h-12 md:w-24 md:h-24 text-[#007AFF]" />
          </div>
          <div className="relative z-10 flex flex-col h-full justify-between">
            <p className="text-xs md:text-sm font-bold ltr:tracking-wider ltr:uppercase rtl:tracking-normal mb-3 text-white/70">{t('nav.bills')}</p>
            <div>
              <p className={`${getMetricFontSize(money(totalBills))} ${metricFlow} font-black text-[#007AFF] mb-1`}>
                {money(totalBills)}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                 <span className="text-[11px] font-bold px-2.5 py-1 bg-[#007AFF]/10 border border-[#007AFF]/20 rounded-lg text-[#007AFF] ltr:uppercase ltr:tracking-wider rtl:tracking-normal whitespace-nowrap">
                   {filteredBills.length} {t('nav.bills')}
                 </span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Grid of Debts */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
      >
        {filteredDebts.length ? filteredDebts.map((d) => {
          const isBorrowed = d.type === 'i_owe';
          const color = isBorrowed ? '#FF3B30' : '#34C759'; // rose-500 or emerald-500
          const initialAmount = d.initialAmount || d.amount || d.remainingAmount;
          const paid = initialAmount - d.remainingAmount;
          const progress = initialAmount > 0 ? (paid / initialAmount) * 100 : 0;
          
          return (
            <motion.div 
              variants={itemVariants}
              whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
              className="bg-[#2B2321]/30 backdrop-blur-[32px] p-5 rounded-[1.5rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-white/20 transition-colors duration-300 group flex flex-col gap-4 h-full justify-between" 
              key={d._id}
            >
              <div className="flex justify-between items-start gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    className="w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 shadow-lg"
                    style={{ backgroundColor: `${color}20`, color: color }}
                  >
                    <Users size={24} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm md:text-base truncate leading-snug" title={d.personName}>{d.personName}</p>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-white/60 ltr:uppercase ltr:tracking-wide rtl:tracking-normal mt-1 inline-block whitespace-nowrap">
                      {isBorrowed ? t('dashboard.debtsBorrowed') : t('dashboard.debtsLent')}
                    </span>
                  </div>
                </div>
                <div className="text-end min-w-0 max-w-[50%]">
                  <p className={`${getMetricFontSize(money(d.remainingAmount), { compact: true })} ${metricFlow} font-black text-white`}>{money(d.remainingAmount)}</p>
                  {d.dueDate && (
                    <p className="text-[11px] font-medium text-white/70 mt-1">
                      {t('analytics.overview.due')}: {new Date(d.dueDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                    </p>
                  )}
                </div>
              </div>

              {/* Repayment Progress */}
              <div className="space-y-1.5 mt-2">
                 <div className="flex justify-between gap-2 text-xs text-white/70 font-medium min-w-0">
                   <span className={metricFlow}>{t('dashboard.paid')}: <span className="font-semibold text-white/80">{money(paid)}</span></span>
                   <span className="tabular-nums font-bold text-white/80">{progress.toFixed(0)}%</span>
                 </div>
                 <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                   <div 
                     className="h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none"
                     style={{ width: `${progress}%`, backgroundColor: color }}
                   />
                 </div>
              </div>
            </motion.div>
          );
        }) : (
          <div className="col-span-full py-16 flex flex-col items-center justify-center bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] text-center">
            <div className="w-16 h-16 rounded-full bg-[#34C759]/10 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-[#34C759]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t('debts.noDebts')}</h3>
            <p className="text-sm text-white/60 max-w-sm leading-relaxed mb-5">{t('liabilities.debtsClearDesc')}</p>
            <Link 
              to="/receivables?tab=debts"
              className="px-5 py-2.5 rounded-xl bg-[#8D6346] hover:bg-[#8D6346]/90 text-white font-bold text-xs shadow-lg shadow-[#8D6346]/20 transition-all inline-flex items-center gap-2 min-h-[44px] active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]"
            >
              <Plus size={14} />
              <span>{t('debts.addDebt')}</span>
            </Link>
          </div>
        )}
      </motion.div>

      {/* Repeating Bills List */}
      <section className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-[#007AFF]/30 border-s-[#007AFF]/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 md:p-8 rounded-[2.5rem]">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-[#007AFF]/20 border border-[#007AFF]/30 rounded-2xl text-[#007AFF]">
            <CalendarClock className="w-6 h-6" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white ltr:tracking-wide rtl:tracking-normal">{t('nav.bills')}</h2>
        </div>
        
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch"
        >
          {filteredBills.length ? filteredBills.map((b) => {
            const isPaid = b.isPaidForPeriod !== undefined ? b.isPaidForPeriod : (b.status === 'paid');
            const displayDate = b.periodDueDate || b.dueDate;
            const isOverdue = b.isOverdue;
            const isDueToday = b.isDueToday;

            let statusBg = 'bg-[#007AFF]/10 border-[#007AFF]/20 text-[#007AFF]';
            let statusText = t('bills.status.upcoming');
            let iconBg = 'rgba(0, 122, 255, 0.2)';
            let iconColor = '#007AFF';
            let amountColor = 'text-[#007AFF]';

            if (isPaid) {
              statusBg = 'bg-[#34C759]/10 border-[#34C759]/20 text-[#34C759]';
              statusText = t('bills.status.paid');
              iconBg = 'rgba(52, 199, 89, 0.2)';
              iconColor = '#34C759';
              amountColor = 'text-[#34C759]';
            } else if (isOverdue) {
              statusBg = 'bg-[#FF3B30]/10 border-[#FF3B30]/20 text-[#FF3B30]';
              statusText = t('bills.status.overdue');
              iconBg = 'rgba(255, 59, 48, 0.2)';
              iconColor = '#FF3B30';
              amountColor = 'text-[#FF3B30]';
            } else if (isDueToday) {
              statusBg = 'bg-[#F59E0B]/10 border-[#F59E0B]/20 text-[#F59E0B]';
              statusText = t('bills.status.due_today');
              iconBg = 'rgba(245, 158, 11, 0.2)';
              iconColor = '#F59E0B';
              amountColor = 'text-[#F59E0B]';
            }

            return (
              <motion.div 
                variants={itemVariants}
                whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
                className="bg-[#2B2321]/30 backdrop-blur-[32px] p-5 rounded-[1.5rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-[#007AFF]/30 hover:shadow-[0_8px_32px_rgba(0,122,255,0.15)] transition-colors duration-300 group flex flex-col gap-4 h-full justify-between" 
                key={b._id}
              >
                <div className="flex justify-between items-start gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div 
                      className="w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 shadow-lg"
                      style={{ backgroundColor: iconBg, color: iconColor }}
                    >
                      {isPaid ? <CheckCircle size={24} /> : <CalendarClock size={24} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm md:text-base truncate leading-snug" title={b.name}>{b.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {b.repeat && b.repeat !== 'never' && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-white/60 ltr:uppercase ltr:tracking-wide rtl:tracking-normal inline-block whitespace-nowrap">
                            {t(`recurring.${b.repeat}`, b.repeat)}
                          </span>
                        )}
                        <span className={`text-[11px] font-bold px-2 py-0.5 border rounded-md ltr:uppercase ltr:tracking-wider rtl:tracking-normal inline-block whitespace-nowrap ${statusBg}`}>
                          {statusText}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-end min-w-0 max-w-[50%]">
                    <p className={`${getMetricFontSize(money(b.expectedAmount), { compact: true })} ${metricFlow} font-black ${amountColor}`}>{money(b.expectedAmount)}</p>
                    <p className="text-[11px] font-medium text-white/70 mt-1">
                      {isPaid && b.periodPaymentDate ? (
                        <span>{t('bills.status.paid')}: {new Date(b.periodPaymentDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                      ) : (
                        <span>{t('analytics.overview.due')}: {new Date(displayDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                      )}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          }) : (
            <div className="col-span-full py-16 flex flex-col items-center justify-center bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] text-center mt-2 p-6">
              <div className="w-16 h-16 rounded-full bg-[#007AFF]/10 border border-[#007AFF]/20 flex items-center justify-center mb-4">
                 <CalendarClock className="w-8 h-8 text-[#007AFF]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t('liabilities.noBillsTitle')}</h3>
              <p className="text-sm text-white/60 max-w-sm leading-relaxed mb-5">{t('liabilities.noBillsDesc')}</p>
              <Link 
                to="/bills"
                className="px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-bold text-xs shadow-lg shadow-[#007AFF]/25 transition-all inline-flex items-center gap-2 min-h-[44px] active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
              >
                <Plus size={14} />
                <span>{t('nav.bills')}</span>
              </Link>
            </div>
          )}
        </motion.div>
      </section>

    </div>
  );
}

export default React.memo(LiabilitiesTabComponent);
