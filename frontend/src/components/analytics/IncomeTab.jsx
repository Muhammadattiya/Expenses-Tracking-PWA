import React, { useMemo } from 'react';
import { TrendingUp, Calendar, AlertCircle, Briefcase, Zap, PieChart } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion, useReducedMotion } from 'framer-motion';
import InsightCard from './InsightCard';
import { metricFlow } from '../../utils/metricFontSize';

function IncomeTabComponent({ data, categories, money, allTransactions, filters }) {
  const { t, lang } = useLanguage();
  const reduceMotion = useReducedMotion();

  const categoryMap = useMemo(() => {
    const map = new Map();
    (categories || []).forEach(c => map.set(String(c._id), c));
    return map;
  }, [categories]);

  const { startMs, endMs, filterAcc, filterCat } = useMemo(() => {
    return {
      startMs: filters?.from ? new Date(filters.from).getTime() : -Infinity,
      endMs: filters?.to ? new Date(filters.to).getTime() : Infinity,
      filterAcc: filters?.account ? String(filters.account) : null,
      filterCat: filters?.category ? String(filters.category) : null,
    };
  }, [filters?.from, filters?.to, filters?.account, filters?.category]);

  const filteredTransactions = useMemo(() => {
    if (!allTransactions || !allTransactions.length) return [];
    
    return allTransactions.filter(tx => {
      if (tx.type !== 'income') return false;
      if (tx.status && tx.status !== 'completed') return false;

      const txTime = new Date(tx.date).getTime();
      if (txTime < startMs || txTime > endMs) return false;

      if (filterAcc) {
        const accId = String(tx.account?._id || tx.account || '');
        const toAccId = String(tx.to_account?._id || tx.to_account || '');
        if (accId !== filterAcc && toAccId !== filterAcc) return false;
      }

      if (filterCat) {
        const catId = String(tx.category?._id || tx.category || '');
        if (catId !== filterCat) return false;
      }

      return true;
    });
  }, [allTransactions, startMs, endMs, filterAcc, filterCat]);

  const {
    totalIncome,
    daysInPeriod,
    dailyAverage,
    biggestIncome,
    frequentCategory,
    topCategories,
    top3Percentage
  } = useMemo(() => {
    const total = filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    let days = 30; // fallback
    if (filters?.from && filters?.to) {
      const diffTime = Math.abs(new Date(filters.to) - new Date(filters.from));
      days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
    
    const daily = days > 0 ? total / days : 0;
    
    const biggest = filteredTransactions.reduce((max, tx) => tx.amount > max.amount ? tx : max, { amount: 0, title: '' });
    const biggestCatId = String(typeof biggest.category === 'object' ? (biggest.category?._id || '') : (biggest.category || ''));
    const biggestCat = categoryMap.get(biggestCatId);
    const biggestCatName = biggestCat ? (lang === 'ar' ? (biggestCat.nameAr || biggestCat.name) : (biggestCat.nameEn || biggestCat.name)) : '';
    const biggestTitle = biggest.amount > 0 ? (biggest.title ? `${biggest.title} (${biggestCatName})` : biggestCatName) : t('analytics.insights.none');
    
    const catCounts = {};
    const catDataMap = {};

    filteredTransactions.forEach(tx => {
       const catId = String(typeof tx.category === 'object' ? (tx.category?._id || '') : (tx.category || ''));
       if (catId) {
         catCounts[catId] = (catCounts[catId] || 0) + 1;
         if (!catDataMap[catId]) catDataMap[catId] = { amount: 0, count: 0 };
         catDataMap[catId].amount += tx.amount;
         catDataMap[catId].count += 1;
       }
    });

    let mostFreqCatId = null;
    let maxFreq = 0;
    Object.entries(catCounts).forEach(([id, count]) => {
       if (count > maxFreq) { maxFreq = count; mostFreqCatId = id; }
    });
    const mostFreqCatObj = categoryMap.get(String(mostFreqCatId)) || { nameAr: '', nameEn: '', name: '' };
    const mostFreqName = lang === 'ar' ? (mostFreqCatObj.nameAr || mostFreqCatObj.name) : (mostFreqCatObj.nameEn || mostFreqCatObj.name);

    const topCats = Object.entries(catDataMap).map(([id, catData]) => {
       const catObj = categoryMap.get(id);
       return {
          id,
          name: catObj ? (lang === 'ar' ? (catObj.nameAr || catObj.name) : (catObj.nameEn || catObj.name)) : t('analytics.insights.unknownCategory'),
          amount: catData.amount,
          count: catData.count,
          avg: catData.amount / catData.count,
          color: catObj ? catObj.color : '#888'
       };
    }).sort((a, b) => b.amount - a.amount);
    
    const top3Earned = topCats.slice(0, 3).reduce((sum, c) => sum + c.amount, 0);
    const top3Pct = total > 0 ? Math.round((top3Earned / total) * 100) : 0;

    return {
       totalIncome: total,
       daysInPeriod: days,
       dailyAverage: daily,
       biggestIncome: { ...biggest, displayTitle: biggestTitle },
       frequentCategory: { name: mostFreqName, count: maxFreq },
       topCategories: topCats,
       top3Percentage: top3Pct
    };
  }, [filteredTransactions, filters, categoryMap, lang, t]);

  if (!data || !filteredTransactions) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: reduceMotion ? { duration: 0.15 } : { staggerChildren: 0.04 }
    }
  };

  const itemVariants = reduceMotion
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.15 } } }
    : { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.15, duration: 0.4 } } };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-10">
      <div className="xl:col-span-7 flex flex-col gap-6">
      {/* 1. Main Insight Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 md:gap-6"
      >
        <InsightCard 
          title={t('analytics.insights.totalIncome')}
          icon={TrendingUp}
          value={money(totalIncome)}
          subtitle={`${t('analytics.insights.inPeriod')} ${daysInPeriod} ${t('analytics.insights.days')}`}
          color="emerald"
        />
        
        <InsightCard 
          title={t('analytics.insights.dailyAvgIncome')}
          icon={Calendar}
          value={money(dailyAverage)}
          subtitle={t('analytics.insights.perDay')}
          color="copper"
        />

        <InsightCard 
          title={t('analytics.insights.biggestIncome')}
          icon={Briefcase}
          value={biggestIncome.amount > 0 ? money(biggestIncome.amount) : t('analytics.insights.emDash')}
          highlight={biggestIncome.displayTitle}
          color="emerald"
        />

        <InsightCard 
          title={t('analytics.insights.mostFrequentIncome')}
          icon={Zap}
          value={frequentCategory.name || t('analytics.insights.emDash')}
          subtitle={frequentCategory.count > 0 ? `${frequentCategory.count} ${t('analytics.insights.transactionsCount')}` : ''}
          color="copper"
        />
      </motion.div>

        {/* Recent Income Events (Balances desktop layout symmetry) */}
        {filteredTransactions.length > 0 && (
          <motion.section 
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', bounce: 0, duration: 0.6, delay: 0.15 }}
            className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6"
          >
             <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-[#34C759]" /> {t('analytics.insights.recentIncome')}
             </h2>
             <p className="text-xs text-white/60 mb-4 leading-relaxed">{t('analytics.insights.recentIncomeDesc')}</p>

             <motion.div 
               variants={containerVariants}
               initial="hidden"
               animate="show"
               className="space-y-3"
             >
               {filteredTransactions.slice(0, 5).map((tx) => (
                 <motion.div 
                   key={tx._id} 
                   variants={itemVariants}
                   whileHover={reduceMotion ? undefined : { y: -1.5, transition: { duration: 0.2 } }}
                   className="flex items-center justify-between p-3.5 rounded-2xl bg-black/10 border border-white/5 hover:border-white/10 transition-colors"
                 >
                   <div className="min-w-0 flex items-center gap-3">
                     <div className="w-9 h-9 rounded-xl bg-[#34C759]/10 border border-[#34C759]/20 flex items-center justify-center shrink-0">
                       <TrendingUp className="w-4 h-4 text-[#34C759]" />
                     </div>
                     <div className="truncate">
                       <p className="font-bold text-sm text-white truncate">{tx.title || t('transactions.income')}</p>
                       <p className="text-xs text-white/50">{new Date(tx.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}</p>
                     </div>
                   </div>
                   <span className={`font-black text-[#34C759] text-sm md:text-base ms-2 ${metricFlow}`}>
                     +{money(tx.amount)}
                   </span>
                 </motion.div>
               ))}
             </motion.div>
          </motion.section>
        )}

      </div>
      <div className="xl:col-span-5 flex flex-col gap-6">
        
        {/* 2. Where Does Your Money Come From (Category Concentration) */}
        <motion.section 
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={reduceMotion ? { duration: 0.15 } : { type: 'spring', bounce: 0, duration: 0.6, delay: 0.2 }}
          className="relative overflow-hidden bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6"
        >
           <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><PieChart className="w-5 h-5 text-[#34C759]" /> {t('analytics.insights.incomeSources')}</h2>
           <p className="text-xs text-white/60 mb-6 leading-relaxed">{t('analytics.insights.incomeSourcesDesc')}</p>
           
           <div className="mb-6 p-4 rounded-2xl bg-[#34C759]/10 border border-[#34C759]/20 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#34C759]/20 flex items-center justify-center flex-shrink-0">
                 <AlertCircle className="w-6 h-6 text-[#34C759]" />
              </div>
              <div>
                 <p className="text-sm text-white/90 leading-relaxed">
                   {t('analytics.insights.top3IncomeRule')} <strong className="text-[#34C759] font-black text-lg mx-1">{top3Percentage}%</strong> {t('analytics.insights.ofTotalIncome')}
                 </p>
              </div>
           </div>

           <div className="space-y-4 max-h-[400px] overflow-y-auto hide-scrollbar pe-2">
             {topCategories.map((cat, idx) => {
               const percentage = totalIncome > 0 ? ((cat.amount / totalIncome) * 100).toFixed(1) : 0;
               return (
                 <div key={cat.id} className="group relative bg-black/10 hover:bg-white/5 p-4 rounded-2xl border border-white/5 transition-colors">
                   <div className="flex justify-between items-center mb-2 gap-3 min-w-0">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                         <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white/90 bg-black/30 border border-white/10 shrink-0">{idx + 1}</span>
                         <div className="min-w-0">
                           <span className="font-bold text-white text-sm truncate block">{cat.name}</span>
                           <p className="text-xs text-white/70 mt-0.5 break-all">{cat.count} {t('analytics.insights.transactionsCount')} • {t('analytics.insights.avg')}: {money(cat.avg)}</p>
                         </div>
                      </div>
                      <div className="text-end min-w-0 max-w-[45%]">
                        <span className={`block font-black text-white ${metricFlow}`}>{money(cat.amount)}</span>
                        <span className="text-xs text-white/60 font-bold tabular-nums tracking-tight">{percentage}%</span>
                      </div>
                   </div>
                   <div className="w-full bg-black/30 shadow-inner rounded-full h-1.5 overflow-hidden">
                     <div 
                       className="h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none" 
                       style={{ width: `${percentage}%`, backgroundColor: cat.color || '#34C759', boxShadow: `0 0 10px ${cat.color || '#34C759'}90` }}
                     />
                   </div>
                 </div>
               )
             })}
             {topCategories.length === 0 && (
                <div className="text-center py-10 text-white/50 text-sm font-medium tracking-wide max-w-sm mx-auto">{t('analytics.income.emptyDesc')}</div>
             )}
           </div>

        </motion.section>
      </div>
    </div>
  );
}

export default React.memo(IncomeTabComponent);
