import React, { useMemo } from 'react';
import { TrendingUp, Calendar, AlertCircle, Briefcase, Zap, Target } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion } from 'framer-motion';

function InsightCard({ title, icon: Icon, value, subtitle, highlight, color = 'brand-green', delay = 0 }) {
  const colorMap = {
    'brand-blue': 'from-blue-500/20 to-cyan-500/5 border-blue-500/20 text-blue-400',
    'brand-purple': 'from-purple-500/20 to-fuchsia-500/5 border-purple-500/20 text-purple-400',
    'brand-green': 'from-emerald-500/20 to-teal-500/5 border-emerald-500/20 text-emerald-400',
    'brand-red': 'from-rose-500/20 to-orange-500/5 border-rose-500/20 text-rose-400',
    'brand-amber': 'from-amber-500/20 to-yellow-500/5 border-amber-500/20 text-amber-400',
  };

  const glowMap = {
    'brand-blue': 'bg-blue-500/20',
    'brand-purple': 'bg-purple-500/20',
    'brand-green': 'bg-emerald-500/20',
    'brand-red': 'bg-rose-500/20',
    'brand-amber': 'bg-amber-500/20',
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.6, delay }}
      className={`relative overflow-hidden bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem] group transition-all duration-500 hover:scale-[1.02] flex flex-col justify-between`}
    >
      <div className={`absolute -right-20 -top-20 w-64 h-64 ${glowMap[color]} rounded-full blur-[50px] group-hover:scale-110 transition-transform duration-700 pointer-events-none`} />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner bg-gradient-to-br ${colorMap[color]} border`}>
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-white/70 font-bold tracking-wide text-sm uppercase">{title}</h3>
        </div>
        
        <div className="mt-2">
          <span className="text-3xl md:text-4xl font-black text-white tabular-nums tracking-tight drop-shadow-md block mb-1">
            {value}
          </span>
          {(subtitle || highlight) && (
            <p className="text-sm font-medium mt-2 flex items-center gap-2">
               {highlight && <span className={`px-2 py-0.5 rounded-md bg-white/10 ${colorMap[color].split(' ').pop()} border border-white/5`}>{highlight}</span>}
               {subtitle && <span className="text-white/50">{subtitle}</span>}
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}

export default function IncomeTab({ data, categories, money, allTransactions, filters }) {
  const { t, lang } = useLanguage();

  const filteredTransactions = useMemo(() => {
    if (!allTransactions) return [];
    let txs = allTransactions.filter(tx => tx.type === 'income' && (!tx.status || tx.status === 'completed'));
    
    if (filters?.from && filters?.to) {
       const start = new Date(filters.from);
       start.setHours(0, 0, 0, 0);
       const end = new Date(filters.to);
       end.setHours(23, 59, 59, 999);
       txs = txs.filter(tx => new Date(tx.date) >= start && new Date(tx.date) <= end);
    }
    if (filters?.account) {
       txs = txs.filter(tx => (tx.account?._id || tx.account) === filters.account || (tx.to_account?._id || tx.to_account) === filters.account);
    }
    if (filters?.category) {
       txs = txs.filter(tx => (tx.category?._id || tx.category) === filters.category);
    }
    return txs;
  }, [allTransactions, filters]);

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
    const biggestCat = categories.find(c => c._id === (typeof biggest.category === 'object' ? biggest.category?._id : biggest.category));
    const biggestCatName = biggestCat ? (lang === 'ar' ? (biggestCat.nameAr || biggestCat.name) : (biggestCat.nameEn || biggestCat.name)) : '';
    const biggestTitle = biggest.amount > 0 ? (biggest.title ? `${biggest.title} (${biggestCatName})` : biggestCatName) : t('analytics.insights.none', 'None');
    
    const catCounts = {};
    
    // Categories Breakdown
    const catDataMap = {};

    filteredTransactions.forEach(tx => {
       const catId = typeof tx.category === 'object' ? tx.category?._id : tx.category;
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
    const mostFreqCatObj = categories.find(c => c._id === mostFreqCatId) || { nameAr: '', nameEn: '', name: '' };
    const mostFreqName = lang === 'ar' ? (mostFreqCatObj.nameAr || mostFreqCatObj.name) : (mostFreqCatObj.nameEn || mostFreqCatObj.name);

    const topCats = Object.entries(catDataMap).map(([id, catData]) => {
       const catObj = categories.find(c => c._id === id);
       return {
          id,
          name: catObj ? (lang === 'ar' ? (catObj.nameAr || catObj.name) : (catObj.nameEn || catObj.name)) : t('analytics.insights.unknownCategory', 'Unknown'),
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
  }, [filteredTransactions, filters, categories, lang, t]);

  if (!data || !filteredTransactions) return null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10 relative min-h-screen">
      
      {/* Background Effect for Income (Emerald/Green/Blue) */}
      <div className="absolute inset-0 z-[-1] pointer-events-none rounded-[3rem] overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px] mix-blend-screen opacity-50" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-40" />
      </div>

      {/* 1. Main Insight Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <InsightCard 
          title={t('analytics.insights.totalIncome', 'Total Income')}
          icon={TrendingUp}
          value={money(totalIncome)}
          subtitle={`${t('analytics.insights.inPeriod', 'in period of')} ${daysInPeriod} ${t('analytics.insights.days', 'days')}`}
          color="brand-green"
          delay={0.1}
        />
        
        <InsightCard 
          title={t('analytics.insights.dailyAvgIncome', 'Daily Avg Income')}
          icon={Calendar}
          value={money(dailyAverage)}
          subtitle={t('analytics.insights.perDay', 'per day')}
          color="brand-blue"
          delay={0.2}
        />

        <InsightCard 
          title={t('analytics.insights.biggestIncome', 'Biggest Income')}
          icon={Briefcase}
          value={biggestIncome.amount > 0 ? money(biggestIncome.amount) : '---'}
          highlight={biggestIncome.displayTitle}
          color="brand-purple"
          delay={0.3}
        />

        <InsightCard 
          title={t('analytics.insights.mostFrequentIncome', 'Most Frequent')}
          icon={Zap}
          value={frequentCategory.name || '---'}
          subtitle={frequentCategory.count > 0 ? `${frequentCategory.count} ${t('analytics.insights.transactionsCount', 'transactions')}` : ''}
          color="brand-amber"
          delay={0.4}
        />

      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* 2. Where Does Your Money Come From (Category Concentration) */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.6, delay: 0.5 }}
          className="relative overflow-hidden bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem]"
        >
           <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Target className="w-5 h-5 text-emerald-400" /> {t('analytics.insights.incomeSources', 'Income Sources')}</h2>
           <p className="text-xs text-white/50 mb-6">{t('analytics.insights.incomeSourcesDesc', 'Breakdown of where your money comes from and average income size.')}</p>
           
           <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                 <AlertCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                 <p className="text-sm text-white/80 leading-relaxed">
                   {t('analytics.insights.top3IncomeRule', 'Your top 3 income sources account for')} <strong className="text-emerald-400 font-black text-lg mx-1">{top3Percentage}%</strong> {t('analytics.insights.ofTotalIncome', 'of your total income this period.')}
                 </p>
              </div>
           </div>

           <div className="space-y-4 max-h-[400px] overflow-y-auto hide-scrollbar pr-2">
             {topCategories.map((cat, idx) => {
               const percentage = totalIncome > 0 ? ((cat.amount / totalIncome) * 100).toFixed(1) : 0;
               return (
                 <div key={cat.id} className="group relative bg-black/10 hover:bg-white/5 p-4 rounded-2xl border border-white/5 transition-colors">
                   <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-black/30 border border-white/10">{idx + 1}</span>
                        <div>
                          <span className="font-bold text-white text-sm">{cat.name}</span>
                          <p className="text-xs text-white/40 mt-0.5">{cat.count} {t('analytics.insights.transactionsCount', 'transactions')} • {t('analytics.insights.avg', 'Avg')}: {money(cat.avg)}</p>
                        </div>
                     </div>
                     <div className="text-right">
                       <span className="block font-black tabular-nums text-white" style={{ color: cat.color || '#34d399' }}>{money(cat.amount)}</span>
                       <span className="text-[11px] text-white/50 font-bold tracking-widest">{percentage}%</span>
                     </div>
                   </div>
                   <div className="w-full bg-black/30 shadow-inner rounded-full h-1.5 overflow-hidden">
                     <div 
                       className="h-full rounded-full transition-all duration-1000 ease-out" 
                       style={{ width: `${percentage}%`, backgroundColor: cat.color || '#34d399', boxShadow: `0 0 10px ${cat.color || '#34d399'}90` }}
                     />
                   </div>
                 </div>
               )
             })}
             {topCategories.length === 0 && (
                <div className="text-center py-10 text-white/40 font-medium tracking-wide">{t('analytics.noData', 'No data available for the selected period')}</div>
             )}
           </div>

        </motion.section>
      </div>
    </div>
  );
}
