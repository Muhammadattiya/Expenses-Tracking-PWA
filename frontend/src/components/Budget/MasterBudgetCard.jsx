import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Folder, Edit2, Trash2, ChevronDown, CheckCircle, AlertOctagon, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BudgetCard from './BudgetCard';

function MasterBudgetCard({ plan, budgets = [], spentData = {}, onEdit, onDelete, onEditPlan, onDeletePlan, index = 0, categories = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useLanguage();

  const { safeAmount, safeSpent, progress, utilization, isOverBudget, remaining, stateColor, stateBorder, stateBg, RiskIcon } = useMemo(() => {
    let amount = 0;
    let spent = 0;
    for (let i = 0; i < budgets.length; i++) {
      const b = budgets[i];
      amount += (b.amount || 0);
      spent += (spentData[b._id] || 0);
    }

    const prog = Math.min((spent / (amount || 1)) * 100, 100) || 0;
    const util = amount > 0 ? (spent / amount) * 100 : 0;
    const over = spent > amount;
    const rem = Math.max(amount - spent, 0);

    let color = 'bg-[#8D6346] text-[#8D6346]';
    let border = 'border-[#8D6346]/30';
    let bg = 'bg-[#8D6346]/10';
    let icon = CheckCircle;

    if (util >= 100) {
      color = 'bg-red-500 text-red-400';
      border = 'border-red-500/30';
      bg = 'bg-red-500/10';
      icon = AlertOctagon;
    } else if (util >= 85) {
      color = 'bg-orange-500 text-orange-400';
      border = 'border-orange-500/30';
      bg = 'bg-orange-500/10';
      icon = AlertTriangle;
    } else if (util >= 70) {
      color = 'bg-yellow-500 text-yellow-400';
      border = 'border-yellow-500/30';
      bg = 'bg-yellow-500/10';
      icon = Info;
    }

    return {
      safeAmount: amount,
      safeSpent: spent,
      progress: prog,
      utilization: util,
      isOverBudget: over,
      remaining: rem,
      stateColor: color,
      stateBorder: border,
      stateBg: bg,
      RiskIcon: icon
    };
  }, [budgets, spentData]);

  const categoriesMap = useMemo(() => {
    if (!categories || categories.length === 0) return null;
    const map = new Map();
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      map.set(c._id, c);
    }
    return map;
  }, [categories]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 relative overflow-hidden group transition-all duration-500 h-full flex flex-col justify-between ${isExpanded ? stateBorder : 'hover:border-white/20 hover:scale-[1.01]'}`}
    >
      <div
        className="cursor-pointer relative z-10 flex-1 flex flex-col justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${stateBg} ${stateBorder}`}>
              <Folder size={24} className={stateColor.split(' ')[1]} />
            </div>
            <div>
              <h3 className="font-semibold text-white/90 text-lg flex items-center gap-2 flex-wrap">
                <span className="truncate max-w-[180px] sm:max-w-xs" title={plan.name || t('smartBudget.masterBudgetLabel')}>
                  {plan.name || t('smartBudget.masterBudgetLabel')}
                </span>
                <span className="text-[10px] font-bold bg-white/10 text-white/60 px-2 py-0.5 rounded-full shrink-0">
                  {budgets.length} {t('smartBudget.items')}
                </span>
              </h3>
              <p className="text-xs text-white/50">
                {t('smartBudget.groupedPlan')}
              </p>
            </div>
          </div>
          <div className="flex gap-2 relative z-20">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onEditPlan?.(plan); }}
              aria-label={t('common.edit')}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-white/5 shadow-inner flex items-center justify-center text-white/50 hover:bg-[#8D6346]/20 hover:text-[#8D6346] transition-colors border border-white/5 touch-manipulation"
            >
              <Edit2 size={15} />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); onDeletePlan?.(plan); }}
              aria-label={t('common.delete')}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-red-500/10 shadow-inner flex items-center justify-center text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors border border-white/5 touch-manipulation"
            >
              <Trash2 size={15} />
            </motion.button>
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 pointer-events-none"
            >
              <ChevronDown size={16} />
            </motion.div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="text-white/60 text-sm">
              {t('budgets.spent')} <span className="text-white font-medium">{safeSpent.toLocaleString()}</span>
            </div>
            <div className="text-end">
              <span className="text-xs text-white/40 block mb-1">
                {isOverBudget ? t('budgets.overbudget') : t('budgets.remaining')}
              </span>
              <span className={`font-bold text-2xl ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
                {isOverBudget ? (safeSpent - safeAmount).toLocaleString() : remaining.toLocaleString()}
                <span className="text-sm font-normal text-white/40 ms-1">{t('nav.currency')}</span>
              </span>
            </div>
          </div>

          <div 
            role="progressbar"
            aria-valuenow={safeSpent}
            aria-valuemin={0}
            aria-valuemax={Math.max(1, safeAmount)}
            className="h-5 w-full bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-inner relative group-hover:border-white/20 transition-colors"
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full transition-colors duration-500 shadow-[inset_0_1px_rgba(255,255,255,0.2)] flex items-center justify-end px-2 ${utilization >= 100 ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]' :
                utilization >= 85 ? 'bg-gradient-to-r from-orange-600 to-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.4)]' :
                  utilization >= 70 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.35)]' :
                    'bg-gradient-to-r from-[#8D6346] to-[#E8C5A8]/80 shadow-[0_0_12px_rgba(141,99,70,0.4)]'
              }`}
            >
              {progress > 15 && (
                <span className="text-[10px] font-bold text-white drop-shadow-md tabular-nums">
                  {safeSpent.toLocaleString()}
                </span>
              )}
            </motion.div>
          </div>

          <div className="flex justify-between items-center text-xs text-white/40 font-medium pt-1">
            <div className="flex items-center gap-1">
              <RiskIcon size={14} className={stateColor.split(' ')[1]} />
              <span>{utilization.toFixed(0)}%</span>
            </div>
            <span>{safeAmount.toLocaleString()} {t('nav.currency')}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-6"
          >
            <div className="pt-6 space-y-4 border-t border-white/10">
              {budgets.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
                  <p className="text-white/40 text-sm">{t('smartBudget.noCategories')}</p>
                </div>
              ) : (
                budgets.map((budget, idx) => {
                  const mappedCategory = typeof budget.category === 'object'
                    ? (budget.category || { name: t('nav.category') })
                    : (categoriesMap?.get(budget.category) || { name: t('nav.category') });

                  const fullBudget = { ...budget, category: mappedCategory };

                  return (
                    <BudgetCard
                      key={budget._id}
                      budget={fullBudget}
                      spent={spentData[budget._id] || 0}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      index={idx}
                    />
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default React.memo(MasterBudgetCard);
