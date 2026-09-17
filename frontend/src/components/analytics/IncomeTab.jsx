import React, { useMemo } from 'react';
import { TrendingUp, Calendar, AlertCircle, Briefcase, Zap, PieChart } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion } from 'framer-motion';

const InsightCard = React.memo(function InsightCard({ title, icon: Icon, value, subtitle, highlight, color = 'copper', delay = 0 }) {
  const colorMap = {
    'brand-blue': 'text-[#8D6346]',
    'brand-purple': 'text-[#E8C5A8]',
    'brand-green': 'text-[#34C759]',
    'brand-red': 'text-[#FF3B30]',
    'brand-amber': 'text-[#F59E0B]',
    'copper': 'text-[#E8C5A8]',
    'emerald': 'text-[#34C759]',
    'rose': 'text-[#FF3B30]',
  };

  const textColor = colorMap[color] || (color.startsWith('text-') ? color : 'text-[#E8C5A8]');

  return (
    <div className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:border-[#8D6346]/30 hover:shadow-[0_8px_32px_rgba(141,99,70,0.15)] transition-all duration-500 flex flex-col justify-between min-h-[140px]">
      <div className="absolute top-0 end-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-700">
        <Icon className="w-12 h-12 md:w-24 md:h-24 text-[#8D6346]" />
      </div>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <p className="text-xs md:text-sm font-bold ltr:tracking-wider ltr:uppercase rtl:tracking-normal mb-3 text-white/70">{title}</p>
        <div>
          <p className={`text-xl md:text-3xl font-black tabular-nums tracking-tight whitespace-nowrap ${textColor}`}>
            {value}
          </p>
          {(subtitle || highlight) && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
               {highlight && <span className="text-[11px] md:text-xs font-semibold px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-white/80 ltr:uppercase ltr:tracking-wider rtl:tracking-normal">{highlight}</span>}
               {subtitle && <span className="text-xs text-white/60 leading-tight">{subtitle}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function IncomeTabComponent({ data, categories, money, allTransactions, filters }) {
  const { t, lang } = useLanguage();

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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in pb-10 relative min-h-screen">
      
      {/* Background Effect for Income */}
      <div className="absolute inset-0 z-[-1] pointer-events-none rounded-[3rem] overflow-hidden">
        <div className="absolute top-0 end-0 w-[500px] h-[500px] bg-[#34C759]/5 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute bottom-0 start-0 w-[600px] h-[600px] bg-[#8D6346]/10 rounded-full blur-[150px] mix-blend-screen opacity-50" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-40" />
      </div>

      <div className="xl:col-span-7 flex flex-col gap-6">
      {/* 1. Main Insight Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-6">
        
        <InsightCard 
          title={t('analytics.insights.totalIncome')}
          icon={TrendingUp}
          value={money(totalIncome)}
          subtitle={`${t('analytics.insights.inPeriod')} ${daysInPeriod} ${t('analytics.insights.days')}`}
          color="emerald"
          delay={0.1}
        />
        
        <InsightCard 
          title={t('analytics.insights.dailyAvgIncome')}
          icon={Calendar}
          value={money(dailyAverage)}
          subtitle={t('analytics.insights.perDay')}
          color="copper"
          delay={0.2}
        />

        <InsightCard 
          title={t('analytics.insights.biggestIncome')}
          icon={Briefcase}
          value={biggestIncome.amount > 0 ? money(biggestIncome.amount) : '---'}
          highlight={biggestIncome.displayTitle}
          color="emerald"
          delay={0.3}
        />

        <InsightCard 
          title={t('analytics.insights.mostFrequentIncome')}
          icon={Zap}
          value={frequentCategory.name || '---'}
          subtitle={frequentCategory.count > 0 ? `${frequentCategory.count} ${t('analytics.insights.transactionsCount')}` : ''}
          color="copper"
          delay={0.4}
        />

      </div>

        {/* Recent Income Events (Balances desktop layout symmetry) */}
        {filteredTransactions.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.6, delay: 0.5 }}
            className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6"
          >
             <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
               <TrendingUp className="w-5 h-5 text-[#34C759]" /> {t('analytics.insights.recentIncome')}
             </h2>
             <p className="text-xs text-white/60 mb-4 leading-relaxed">{t('analytics.insights.recentIncomeDesc')}</p>

             <div className="space-y-3">
               {filteredTransactions.slice(0, 5).map((tx) => (
                 <div key={tx._id} className="flex items-center justify-between p-3.5 rounded-2xl bg-black/10 border border-white/5 hover:border-white/10 transition-colors">
                   <div className="min-w-0 flex items-center gap-3">
                     <div className="w-9 h-9 rounded-xl bg-[#34C759]/10 border border-[#34C759]/20 flex items-center justify-center shrink-0">
                       <TrendingUp className="w-4 h-4 text-[#34C759]" />
                     </div>
                     <div className="truncate">
                       <p className="font-bold text-sm text-white truncate">{tx.title || t('transactions.income')}</p>
                       <p className="text-xs text-white/50">{new Date(tx.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}</p>
                     </div>
                   </div>
                   <span className="font-black tabular-nums tracking-tight text-[#34C759] text-sm md:text-base ms-2 whitespace-nowrap">
                     +{money(tx.amount)}
                   </span>
                 </div>
               ))}
             </div>
          </motion.section>
        )}

      </div>
      <div className="xl:col-span-5 h-full">
      <div className="grid grid-cols-1 gap-6 h-full">
        
        {/* 2. Where Does Your Money Come From (Category Concentration) */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.6, delay: 0.5 }}
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
                   <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3">
                         <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white/90 bg-black/30 border border-white/10">{idx + 1}</span>
                         <div>
                           <span className="font-bold text-white text-sm">{cat.name}</span>
                           <p className="text-xs text-white/50 mt-0.5">{cat.count} {t('analytics.insights.transactionsCount')} • {t('analytics.insights.avg')}: {money(cat.avg)}</p>
                         </div>
                      </div>
                      <div className="text-end">
                        <span className="block font-black tabular-nums whitespace-nowrap text-white" style={{ color: cat.color || '#34C759' }}>{money(cat.amount)}</span>
                        <span className="text-xs text-white/60 font-bold tabular-nums tracking-tight">{percentage}%</span>
                      </div>
                   </div>
                   <div className="w-full bg-black/30 shadow-inner rounded-full h-1.5 overflow-hidden">
                     <div 
                       className="h-full rounded-full transition-all duration-1000 ease-out" 
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
    </div>
  );
}

export default React.memo(IncomeTabComponent);
