import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { TrendingDown, Calendar, AlertCircle, ShoppingBag, Zap, PieChart, Scale } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion } from 'framer-motion';

function InsightCard({ title, icon: Icon, value, subtitle, highlight, color = 'copper', delay = 0 }) {
  const colorMap = {
    'brand-blue': 'text-brand-blue',
    'brand-purple': 'text-purple-400',
    'brand-green': 'text-emerald-400',
    'brand-red': 'text-rose-400',
    'brand-amber': 'text-amber-400',
    'copper': 'text-[#E8C5A8]',
    'emerald': 'text-emerald-400',
    'rose': 'text-rose-400',
  };

  const textColor = colorMap[color] || (color.startsWith('text-') ? color : 'text-[#E8C5A8]');

  return (
    <div className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:shadow-[#8D6346]/20 transition-all duration-500 flex flex-col justify-between min-h-[140px]">
      <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-700">
        <Icon className="w-12 h-12 md:w-24 md:h-24 text-[#8D6346]" />
      </div>
      <div className="relative z-10 flex flex-col h-full justify-between">
        <p className="text-sm font-bold tracking-widest uppercase mb-4 text-[var(--color-text-main)] opacity-70">{title}</p>
        <div>
          <p className={`text-xl md:text-3xl font-black tabular-nums tracking-tight ${textColor}`}>
            {value}
          </p>
          {(subtitle || highlight) && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
               {highlight && <span className="text-[10px] md:text-xs font-bold px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[var(--color-text-muted)] uppercase tracking-wider">{highlight}</span>}
               {subtitle && <span className="text-[10px] md:text-xs text-[var(--color-text-muted)] leading-tight">{subtitle}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SpendingTab({ data, categories, money, allTransactions, filters }) {
  const { t, lang } = useLanguage();
  const [activeBarIndex, setActiveBarIndex] = useState(null);

  const filteredTransactions = useMemo(() => {
    if (!allTransactions) return [];
    let txs = allTransactions.filter(tx => tx.type === 'expense' && (!tx.status || tx.status === 'completed'));
    
    if (filters?.from && filters?.to) {
       const start = new Date(filters.from);
       start.setHours(0, 0, 0, 0);
       const end = new Date(filters.to);
       end.setHours(23, 59, 59, 999);
       txs = txs.filter(tx => new Date(tx.date) >= start && new Date(tx.date) <= end);
    }
    if (filters?.account) {
       txs = txs.filter(tx => (tx.account?._id || tx.account) === filters.account || (tx.from_account?._id || tx.from_account) === filters.account);
    }
    if (filters?.category) {
       txs = txs.filter(tx => (tx.category?._id || tx.category) === filters.category);
    }
    return txs;
  }, [allTransactions, filters]);

  const incomeVsExpense = useMemo(() => {
    if (!allTransactions) return { income: 0, expense: 0 };
    let txs = allTransactions.filter(tx => !tx.status || tx.status === 'completed');
    
    if (filters?.from && filters?.to) {
       const start = new Date(filters.from);
       start.setHours(0, 0, 0, 0);
       const end = new Date(filters.to);
       end.setHours(23, 59, 59, 999);
       txs = txs.filter(tx => new Date(tx.date) >= start && new Date(tx.date) <= end);
    }
    if (filters?.account) {
       txs = txs.filter(tx => (tx.account?._id || tx.account) === filters.account || (tx.from_account?._id || tx.from_account) === filters.account);
    }
    
    let income = 0;
    let expense = 0;
    txs.forEach(tx => {
      if (tx.type === 'income') income += tx.amount;
      if (tx.type === 'expense') expense += tx.amount;
    });
    
    return { income, expense };
  }, [allTransactions, filters]);

  const {
    totalExpense,
    daysInPeriod,
    dailyAverage,
    biggestPurchase,
    frequentCategory,
    weekendPercentage,
    dayOfWeekData,
    topCategories,
    top3Percentage,
    sizeDistribution
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
    const biggestTitle = biggest.amount > 0 ? (biggest.title ? `${biggest.title} (${biggestCatName})` : biggestCatName) : t('analytics.insights.none');
    
    const catCounts = {};
    const daysArr = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
    
    filteredTransactions.forEach(tx => {
       const catId = typeof tx.category === 'object' ? tx.category?._id : tx.category;
       if (catId) {
         catCounts[catId] = (catCounts[catId] || 0) + 1;
       }
       const day = new Date(tx.date).getDay();
       daysArr[day] += tx.amount;
    });
    
    let mostFreqCatId = null;
    let maxFreq = 0;
    Object.entries(catCounts).forEach(([id, count]) => {
       if (count > maxFreq) { maxFreq = count; mostFreqCatId = id; }
    });
    const mostFreqCatObj = categories.find(c => c._id === mostFreqCatId) || { nameAr: '', nameEn: '', name: '' };
    const mostFreqName = lang === 'ar' ? (mostFreqCatObj.nameAr || mostFreqCatObj.name) : (mostFreqCatObj.nameEn || mostFreqCatObj.name);

    const weekendSpend = daysArr[5] + daysArr[6]; // Friday & Saturday
    const weekendPct = total > 0 ? Math.round((weekendSpend / total) * 100) : 0;
    
    const dayNamesAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNames = lang === 'ar' ? dayNamesAr : dayNamesEn;
    
    const dayData = daysArr.map((amt, idx) => ({
       name: dayNames[idx],
       amount: amt,
       isWeekend: idx === 5 || idx === 6
    }));

    // Categories Breakdown
    const catDataMap = {};

    filteredTransactions.forEach(tx => {
       const catId = typeof tx.category === 'object' ? tx.category?._id : tx.category;
       if (catId) {
         if (!catDataMap[catId]) catDataMap[catId] = { amount: 0, count: 0 };
         catDataMap[catId].amount += tx.amount;
         catDataMap[catId].count += 1;
       }
    });

    const topCats = Object.entries(catDataMap).map(([id, catData]) => {
       const catObj = categories.find(c => c._id === id);
       return {
          id,
          name: catObj ? (lang === 'ar' ? (catObj.nameAr || catObj.name) : (catObj.nameEn || catObj.name)) : t('analytics.insights.unknownCategory'),
          amount: catData.amount,
          count: catData.count,
          avg: catData.amount / catData.count,
          color: catObj ? catObj.color : '#888'
       };
    }).sort((a, b) => b.amount - a.amount);
    
    const top3Spend = topCats.slice(0, 3).reduce((sum, c) => sum + c.amount, 0);
    const top3Pct = total > 0 ? Math.round((top3Spend / total) * 100) : 0;

    return {
       totalExpense: total,
       daysInPeriod: days,
       dailyAverage: daily,
       biggestPurchase: { ...biggest, displayTitle: biggestTitle },
       frequentCategory: { name: mostFreqName, count: maxFreq },
       weekendPercentage: weekendPct,
       dayOfWeekData: dayData,
       topCategories: topCats,
       top3Percentage: top3Pct
    };
  }, [filteredTransactions, filters, categories, lang, t]);

  if (!data || !filteredTransactions) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fade-in pb-10 relative min-h-screen">
      
      {/* Background Effect */}
      <div className="absolute inset-0 z-[-1] pointer-events-none rounded-[3rem] overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-red/5 rounded-full blur-[120px] mix-blend-screen opacity-50" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-brand-purple/5 rounded-full blur-[150px] mix-blend-screen opacity-50" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-40" />
      </div>

      <div className="xl:col-span-12 flex flex-col gap-6">
      {/* 1. Main Insight Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        
        <InsightCard 
          title={t('analytics.insights.totalSpent')}
          icon={TrendingDown}
          value={money(totalExpense)}
          subtitle={`${t('analytics.insights.inPeriod')} ${daysInPeriod} ${t('analytics.insights.days')}`}
          color="rose"
          delay={0.1}
        />
        
        <InsightCard 
          title={t('analytics.insights.dailyAverage')}
          icon={Calendar}
          value={money(dailyAverage)}
          subtitle={t('analytics.insights.perDay')}
          color="copper"
          delay={0.2}
        />

        <InsightCard 
          title={t('analytics.insights.biggestPurchase')}
          icon={ShoppingBag}
          value={biggestPurchase.amount > 0 ? money(biggestPurchase.amount) : '---'}
          highlight={biggestPurchase.displayTitle}
          color="rose"
          delay={0.3}
        />

        <InsightCard 
          title={t('analytics.insights.mostFrequent')}
          icon={Zap}
          value={frequentCategory.name || '---'}
          subtitle={frequentCategory.count > 0 ? `${frequentCategory.count} ${t('analytics.insights.transactionsCount')}` : ''}
          color="copper"
          delay={0.4}
        />

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 2. When Do You Spend (Day of Week) */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.6, delay: 0.5 }}
          className="lg:col-span-1 relative overflow-hidden bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6"
        >
           <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Calendar className="w-5 h-5 text-[#8D6346]" /> {t('analytics.insights.whenYouSpend')}</h2>
           <p className="text-xs text-white/50 mb-6">{t('analytics.insights.basedOnDays')}</p>
           
           <div className="mb-4 h-[72px]">
             {activeBarIndex !== null ? (
               <motion.div 
                 key="selected" 
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                 className="flex flex-col"
               >
                 <div className="flex items-end gap-2">
                   <span className="text-3xl font-black text-[#E8C5A8] tabular-nums tracking-tight">{money(dayOfWeekData[activeBarIndex].amount)}</span>
                   <span className="text-sm text-white/70 font-medium mb-1">{dayOfWeekData[activeBarIndex].name}</span>
                 </div>
                 <p className="text-xs text-white/50 mt-1">{t('analytics.insights.spentOnThisDay') || 'Total spent on this day'}</p>
               </motion.div>
             ) : (
               <motion.div 
                 key="weekend" 
                 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                 className="flex flex-col"
               >
                 <div className="flex items-end gap-2">
                   <span className="text-3xl font-black text-[#E8C5A8] tabular-nums tracking-tight">{weekendPercentage}%</span>
                   <span className="text-sm text-white/70 font-medium mb-1">{t('analytics.insights.onWeekends')}</span>
                 </div>
                 <p className="text-xs text-white/50 mt-1">{weekendPercentage > 50 ? t('analytics.insights.heavyWeekend') : t('analytics.insights.heavyWeekday')}</p>
               </motion.div>
             )}
           </div>

           <div className="h-48 w-full mt-4">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={dayOfWeekData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                 <defs>
                   <linearGradient id="weekendCopper" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="0%" stopColor="#E8C5A8" stopOpacity={0.9} />
                     <stop offset="100%" stopColor="#8D6346" stopOpacity={0.7} />
                   </linearGradient>
                 </defs>
                 <CartesianGrid stroke="#ffffff0a" vertical={false} />
                 <XAxis dataKey="name" stroke="#ffffff50" fontSize={11} tickLine={false} axisLine={false} />
                 <YAxis stroke="#ffffff50" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
                 <Tooltip 
                   cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                   contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}
                   formatter={(value) => [money(value)]}
                 />
                 <Bar 
                   dataKey="amount" 
                   radius={[6, 6, 0, 0]} 
                   barSize={24}
                   onClick={(data, index) => setActiveBarIndex(activeBarIndex === index ? null : index)}
                   cursor="pointer"
                 >
                   {dayOfWeekData.map((entry, index) => {
                     const isSelected = activeBarIndex === index;
                     const baseFill = '#ffffff20';
                     const highlightFill = 'url(#weekendCopper)';
                     return (
                       <Cell 
                         key={`cell-${index}`} 
                         fill={isSelected ? highlightFill : baseFill} 
                         style={{ transition: 'fill 0.3s ease' }} 
                       />
                     );
                   })}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </motion.section>

        {/* 3. What Do You Spend On (Category Concentration) */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.6, delay: 0.6 }}
          className="lg:col-span-2 relative overflow-hidden bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6"
        >
           <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><PieChart className="w-5 h-5 text-[#8D6346]" /> {t('analytics.insights.whereMoneyGoes')}</h2>
           <p className="text-xs text-white/50 mb-6">{t('analytics.insights.categoryBreakdownDesc')}</p>
           
           <div className="mb-6 p-4 rounded-2xl bg-[#8D6346]/10 border border-[#8D6346]/20 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#8D6346]/20 flex items-center justify-center flex-shrink-0">
                 <AlertCircle className="w-6 h-6 text-[#E8C5A8]" />
              </div>
              <div>
                 <p className="text-sm text-white/80 leading-relaxed">
                   {t('analytics.insights.top3Rule')} <strong className="text-[#E8C5A8] font-black text-lg mx-1">{top3Percentage}%</strong> {t('analytics.insights.ofTotalSpend')}
                 </p>
              </div>
           </div>

           <div className="space-y-4 max-h-[300px] overflow-y-auto hide-scrollbar pr-2">
             {topCategories.map((cat, idx) => {
               const percentage = totalExpense > 0 ? ((cat.amount / totalExpense) * 100).toFixed(1) : 0;
               return (
                 <div key={cat.id} className="group relative bg-black/10 hover:bg-white/5 p-4 rounded-2xl border border-white/5 transition-colors">
                   <div className="flex justify-between items-center mb-2">
                     <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-black/30 border border-white/10">{idx + 1}</span>
                        <div>
                          <span className="font-bold text-white text-sm">{cat.name}</span>
                          <p className="text-xs text-white/40 mt-0.5">{cat.count} {t('analytics.insights.transactionsCount')} • {t('analytics.insights.avg')}: {money(cat.avg)}</p>
                        </div>
                     </div>
                     <div className="text-right">
                       <span className="block font-black tabular-nums text-white" style={{ color: cat.color || '#fff' }}>{money(cat.amount)}</span>
                       <span className="text-[11px] text-white/50 font-bold tracking-widest">{percentage}%</span>
                     </div>
                   </div>
                   <div className="w-full bg-black/30 shadow-inner rounded-full h-1.5 overflow-hidden border border-white/5">
                     <div 
                       className="h-full rounded-full transition-all duration-1000 ease-out relative" 
                       style={{ 
                         width: `${percentage}%`, 
                         background: 'linear-gradient(90deg, #8D6346 0%, #E8C5A8 100%)', 
                         boxShadow: '0 0 10px rgba(232, 197, 168, 0.4)' 
                       }}
                     >
                       <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full" />
                     </div>
                   </div>
                 </div>
               )
             })}
             {topCategories.length === 0 && (
                <div className="text-center py-10 text-white/40 font-medium tracking-wide">{t('analytics.noData')}</div>
             )}
           </div>

        </motion.section>

        {/* 4. Income vs Expense Comparison */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', bounce: 0, duration: 0.6, delay: 0.7 }}
          className="lg:col-span-3 relative overflow-hidden bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6"
        >
           <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><Scale className="w-5 h-5 text-brand-green" /> {t('analytics.insights.cashflow')}</h2>
           <p className="text-xs text-white/50 mb-6">{t('analytics.insights.cashflowDesc')}</p>

           <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
              {(() => {
                 const maxVal = Math.max(incomeVsExpense.income, incomeVsExpense.expense, 1);
                 const incPct = (incomeVsExpense.income / maxVal) * 100;
                 const expPct = (incomeVsExpense.expense / maxVal) * 100;
                 return (
                   <>
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="font-bold text-emerald-400 tracking-wide uppercase text-sm">{t('analytics.insights.income')}</span>
                        <span className="font-black text-2xl tabular-nums text-white drop-shadow-sm">{money(incomeVsExpense.income)}</span>
                      </div>
                      <div className="w-full bg-black/30 shadow-inner rounded-full h-4 overflow-hidden border border-white/5">
                         <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${incPct}%`, boxShadow: '0 0 15px rgba(52,211,153,0.4)' }} />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="font-bold text-rose-400 tracking-wide uppercase text-sm">{t('analytics.insights.expense')}</span>
                        <span className="font-black text-2xl tabular-nums text-white drop-shadow-sm">{money(incomeVsExpense.expense)}</span>
                      </div>
                      <div className="w-full bg-black/30 shadow-inner rounded-full h-4 overflow-hidden border border-white/5">
                         <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-1000 ease-out" style={{ width: `${expPct}%`, boxShadow: '0 0 15px rgba(251,113,133,0.4)' }} />
                      </div>
                    </div>
                   </>
                 );
              })()}

              <div className="mt-2 p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-center">
                 <p className="text-sm text-white/80 leading-relaxed">
                   {incomeVsExpense.income >= incomeVsExpense.expense ? (
                      <>
                        <span className="text-emerald-400 font-bold text-base block mb-1">{t('analytics.insights.saved')} {money(incomeVsExpense.income - incomeVsExpense.expense)}</span>
                        {incomeVsExpense.income > 0 && <span className="text-white/60 text-xs uppercase tracking-wider">({Math.round(((incomeVsExpense.income - incomeVsExpense.expense)/incomeVsExpense.income)*100)}%) {t('analytics.insights.duringPeriod')}</span>}
                      </>
                   ) : (
                      <>
                        <span className="text-rose-400 font-bold text-base block mb-1">{t('analytics.insights.overspent')} {money(incomeVsExpense.expense - incomeVsExpense.income)}</span>
                        <span className="text-white/60 text-xs uppercase tracking-wider">{t('analytics.insights.duringPeriod')}</span>
                      </>
                   )}
                 </p>
              </div>
           </div>
        </motion.section>

      </div>
      </div>
    </div>
  );
}
