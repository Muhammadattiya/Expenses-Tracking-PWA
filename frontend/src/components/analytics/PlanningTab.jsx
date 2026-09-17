import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Target, TrendingUp, ShieldCheck, Sparkles, ArrowUpRight } from 'lucide-react';
import { getIconComponent } from '../IconPicker';
import { getMetricFontSize, metricFlow } from '../../utils/metricFontSize';

function PlanningTabComponent({ budgets = [], money }) {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();

  const { totalBudget, totalSpent, remainingBudget, overallPercentage, overBudgetCount } = React.useMemo(() => {
    let budgetSum = 0;
    let spentSum = 0;
    let overCount = 0;

    (budgets || []).forEach(b => {
      const amt = Number(b.amount) || 0;
      const spent = Number(b.spent) || 0;
      budgetSum += amt;
      spentSum += spent;
      if (spent > amt) overCount++;
    });

    const remaining = Math.max(0, budgetSum - spentSum);
    const overallPct = budgetSum > 0 ? (spentSum / budgetSum) * 100 : 0;

    return {
      totalBudget: budgetSum,
      totalSpent: spentSum,
      remainingBudget: remaining,
      overallPercentage: overallPct,
      overBudgetCount: overCount
    };
  }, [budgets]);

  const overallStatus = React.useMemo(() => {
    if (overallPercentage >= 100) {
      return {
        label: t('analytics.planning.dangerStatus'),
        color: 'text-[#FF3B30] bg-[#FF3B30]/10 border-[#FF3B30]/20'
      };
    }
    if (overallPercentage >= 85) {
      return {
        label: t('analytics.planning.warningStatus'),
        color: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20'
      };
    }
    return {
      label: t('analytics.planning.healthyStatus'),
      color: 'text-[#34C759] bg-[#34C759]/10 border-[#34C759]/20'
    };
  }, [overallPercentage, t]);

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
    <div className="space-y-8 pb-10">

      {/* Hero Performance Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
      >
        {/* Total Allocated */}
        <motion.div 
          variants={itemVariants}
          whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
          className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-2xl p-4 md:p-5 relative overflow-hidden group transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs md:text-sm font-medium text-white/70">
              {t('analytics.planning.totalBudget')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#8D6346]/20 border border-[#8D6346]/30 flex items-center justify-center text-[#8D6346]">
              <Target size={16} />
            </div>
          </div>
          <div className={`${getMetricFontSize(money(totalBudget), { compact: true })} ${metricFlow} font-black text-white mb-1`}>
            {money(totalBudget)}
          </div>
          <p className="text-xs text-white/60 mt-0.5">
            {budgets?.length || 0} {t('analytics.planning.activeBudgetsCount')}
          </p>
        </motion.div>

        {/* Total Spent */}
        <motion.div 
          variants={itemVariants}
          whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
          className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-2xl p-4 md:p-5 relative overflow-hidden group transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs md:text-sm font-medium text-white/70">
              {t('analytics.planning.totalSpent')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#E8C5A8]/20 border border-[#E8C5A8]/30 flex items-center justify-center text-[#E8C5A8]">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className={`${getMetricFontSize(money(totalSpent), { compact: true })} ${metricFlow} font-black text-white mb-1`}>
            {money(totalSpent)}
          </div>
          <p className="text-xs text-white/60 mt-0.5">
            {Math.round(overallPercentage)}% {t('analytics.planning.ofLimit')}
          </p>
        </motion.div>

        {/* Remaining Allowance */}
        <motion.div 
          variants={itemVariants}
          whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
          className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-2xl p-4 md:p-5 relative overflow-hidden group transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs md:text-sm font-medium text-white/70">
              {t('analytics.planning.remainingBudget')}
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              overBudgetCount > 0 
                ? 'bg-[#FF3B30]/20 border border-[#FF3B30]/30 text-[#FF3B30]' 
                : 'bg-[#34C759]/20 border border-[#34C759]/30 text-[#34C759]'
            }`}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className={`${getMetricFontSize(money(remainingBudget), { compact: true })} ${metricFlow} font-black mb-1 ${
            overBudgetCount > 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'
          }`}>
            {money(remainingBudget)}
          </div>
          <p className="text-xs text-white/60 mt-0.5">
            {overBudgetCount > 0 
              ? t('analytics.planning.exceededCategories', { count: overBudgetCount })
              : t('analytics.planning.availableToSpend')
            }
          </p>
        </motion.div>

        {/* Consumption Rate */}
        <motion.div 
          variants={itemVariants}
          whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
          className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-2xl p-4 md:p-5 relative overflow-hidden group transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs md:text-sm font-medium text-white/70">
              {t('analytics.planning.consumption')}
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${overallStatus.color}`}>
              {overallStatus.label}
            </span>
          </div>
          <div className="text-xl md:text-2xl font-black tabular-nums tracking-tight text-white mb-2">
            {Math.round(overallPercentage)}%
          </div>
          <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden shadow-inner">
            <div 
              className="h-full rounded-full transition-all duration-700 ease-out motion-reduce:transition-none"
              style={{ 
                width: `${Math.min(overallPercentage, 100)}%`,
                backgroundColor: overallPercentage >= 100 ? '#FF3B30' : overallPercentage >= 85 ? '#F59E0B' : '#34C759',
                boxShadow: `0 0 8px ${overallPercentage >= 100 ? '#FF3B30' : overallPercentage >= 85 ? '#F59E0B' : '#34C759'}80`
              }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Category Budgets Grid */}
      <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-2xl text-[#8D6346]">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--color-text-main)] tracking-wide">
                {t('analytics.planning.title')}
              </h2>
              <p className="text-xs text-white/50 mt-0.5">
                {t('analytics.planning.budgetsDesc')}
              </p>
            </div>
          </div>

          <Link
            to="/budgets"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-colors self-start sm:self-auto outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70"
          >
            <span>{t('analytics.planning.manageBudgets')}</span>
            <ArrowUpRight className="w-3.5 h-3.5 rtl:-scale-x-100 opacity-70" />
          </Link>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6"
        >
          {budgets?.length ? budgets.map((b) => {
            const spent = b.spent || 0;
            const percentage = Math.min((spent / b.amount) * 100, 100);
            const isDanger = percentage >= 90;
            const isOver = spent > b.amount;
            const CatIcon = b.category?.icon ? getIconComponent(b.category.icon, 'Layers') : Target;
            const color = b.category?.color || '#8D6346';
            
            return (
              <motion.div 
                variants={itemVariants}
                whileHover={reduceMotion ? undefined : { y: -2, transition: { duration: 0.2 } }}
                className="bg-black/10 shadow-inner p-4 md:p-6 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden" 
                key={b._id}
              >
                {/* Background glow */}
                <div 
                  className="absolute -top-10 -end-10 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
                  style={{ backgroundColor: color }}
                />
                
                <div className="flex items-start justify-between gap-2 mb-5 relative z-10 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div 
                      className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: `${color}20`, color: color }}
                    >
                      <CatIcon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm md:text-base truncate">
                        {b.category?.name || t('analytics.allCategories')}
                      </p>
                      <p className="text-xs text-white/50 mt-0.5">
                        {t(`budgets.${b.period}`, b.period)}
                      </p>
                    </div>
                  </div>

                  {/* Over / Remaining pill */}
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border max-w-full ${metricFlow} ${
                    isOver 
                      ? 'text-[#FF3B30] bg-[#FF3B30]/10 border-[#FF3B30]/20' 
                      : 'text-white/70 bg-white/5 border-white/10'
                  }`}>
                    {isOver 
                      ? `+${money(spent - b.amount)} ${t('analytics.planning.overBudget')}`
                      : `${money(b.amount - spent)} ${t('analytics.planning.remaining')}`
                    }
                  </span>
                </div>

                <div className="space-y-2 relative z-10">
                  <div className="flex justify-between items-baseline gap-2 min-w-0">
                     <span className={`${getMetricFontSize(money(spent), { compact: true })} ${metricFlow} font-bold ${
                       isOver ? 'text-[#FF3B30]' : 'text-white'
                     }`}>
                       {money(spent)}
                     </span>
                     <span className={`text-xs sm:text-sm font-medium text-white/70 ${metricFlow} shrink-0 max-w-[45%]`}>
                       / {money(b.amount)}
                     </span>
                  </div>
                  
                  <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out motion-reduce:transition-none"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: isDanger ? '#FF3B30' : color,
                        boxShadow: `0 0 8px ${isDanger ? '#FF3B30' : color}80`
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          }) : (
            <div className="col-span-full py-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-[#8D6346]/10 border border-[#8D6346]/20 flex items-center justify-center text-[#8D6346] mb-3">
                <Target size={24} />
              </div>
              <p className="text-[var(--color-text-muted)] text-sm max-w-md mb-4 leading-relaxed">
                {t('analytics.planning.noBudgetsDesc')}
              </p>
              <Link 
                to="/budgets"
                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#8D6346] hover:bg-[#8D6346]/90 text-white font-bold text-xs shadow-lg shadow-[#8D6346]/20 transition-all inline-flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70"
              >
                <Target size={14} />
                <span>{t('analytics.planning.createBudget')}</span>
              </Link>
            </div>
          )}
        </motion.div>
      </section>

      {/* Smart Budget Planner Integration Banner */}
      <section className="bg-gradient-to-br from-[#2B2321]/40 via-[#2B2321]/20 to-[#8D6346]/15 backdrop-blur-[32px] border border-[#8D6346]/30 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-5 lg:p-6 relative overflow-hidden">
        <div className="absolute -top-12 -end-12 w-48 h-48 bg-[#8D6346]/20 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-2xl text-[#E8C5A8] shrink-0 mt-0.5">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                <span>{t('analytics.planning.smartPlannerTitle')}</span>
              </h3>
              <p className="text-xs text-white/60 mt-1 max-w-xl leading-relaxed">
                {t('analytics.planning.smartPlannerDesc')}
              </p>
            </div>
          </div>

          <Link
            to="/budgets/smart-planner"
            className="px-5 py-3 min-h-[44px] rounded-xl bg-[#8D6346] hover:bg-[#8D6346]/90 text-white font-bold text-xs shadow-lg shadow-[#8D6346]/30 transition-all inline-flex items-center justify-center gap-2 shrink-0 self-start md:self-auto outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70"
          >
            <span>{t('analytics.planning.openSmartPlanner')}</span>
            <ArrowUpRight className="w-4 h-4 rtl:-scale-x-100" />
          </Link>
        </div>
      </section>

    </div>
  );
}

export default React.memo(PlanningTabComponent);
