import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import BudgetCard from './BudgetCard';

export default function MasterBudgetCard({ plan, budgets, spentData, onEdit, onDelete, onEditPlan, onDeletePlan, index = 0, categories }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useLanguage();
  
  const safeAmount = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const safeSpent = budgets.reduce((sum, b) => sum + (spentData[b._id] || 0), 0);
  
  const progress = Math.min((safeSpent / safeAmount) * 100, 100) || 0;
  const utilization = safeAmount > 0 ? (safeSpent / safeAmount) * 100 : 0;
  const isOverBudget = safeSpent > safeAmount;
  const remaining = Math.max(safeAmount - safeSpent, 0);

  let stateColor = 'bg-brand-blue text-brand-blue';
  let stateBorder = 'border-brand-blue/30';
  let stateBg = 'bg-brand-blue/10';
  let RiskIcon = Icons.CheckCircle;
  
  if (utilization >= 100) {
    stateColor = 'bg-red-500 text-red-400';
    stateBorder = 'border-red-500/30';
    stateBg = 'bg-red-500/10';
    RiskIcon = Icons.AlertOctagon;
  } else if (utilization >= 85) {
    stateColor = 'bg-orange-500 text-orange-400';
    stateBorder = 'border-orange-500/30';
    stateBg = 'bg-orange-500/10';
    RiskIcon = Icons.AlertTriangle;
  } else if (utilization >= 70) {
    stateColor = 'bg-yellow-500 text-yellow-400';
    stateBorder = 'border-yellow-500/30';
    stateBg = 'bg-yellow-500/10';
    RiskIcon = Icons.Info;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`bg-black/30 rounded-[2rem] p-6 border border-white/5 relative overflow-hidden backdrop-blur-xl group transition-all duration-500 h-full flex flex-col justify-between ${isExpanded ? stateBorder : 'hover:border-white/10 hover:shadow-2xl hover:scale-[1.01]'}`}
    >
      <div 
        className="cursor-pointer relative z-10 flex-1 flex flex-col justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${stateBg} ${stateBorder}`}>
              <Icons.Folder size={24} className={stateColor.split(' ')[1]} />
            </div>
            <div>
              <h3 className="font-semibold text-white/90 text-lg flex items-center gap-2">
                {plan.name || 'Master Budget'}
                <span className="text-[10px] font-bold bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
                  {budgets.length} Items
                </span>
              </h3>
              <p className="text-xs text-white/50">
                Grouped Budget Plan
              </p>
            </div>
          </div>
          <div className="flex gap-2 relative z-20">
            <button
              onClick={(e) => { e.stopPropagation(); onEditPlan?.(plan); }}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-brand-blue/20 hover:text-brand-blue transition-colors"
            >
              <Icons.Edit2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeletePlan?.(plan); }}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-red-500/20 hover:text-red-500 transition-colors"
            >
              <Icons.Trash2 size={14} />
            </button>
            <motion.div 
              animate={{ rotate: isExpanded ? 180 : 0 }} 
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 pointer-events-none"
            >
              <Icons.ChevronDown size={16} />
            </motion.div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <div className="text-white/60 text-sm">
              {t('budgets.spent')} <span className="text-white font-medium">{safeSpent.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-white/40 block mb-1">
                {isOverBudget ? t('budgets.overbudget') : t('budgets.remaining')}
              </span>
              <span className={`font-bold text-2xl ${isOverBudget ? 'text-red-400' : 'text-white'}`}>
                {isOverBudget ? (safeSpent - safeAmount).toLocaleString() : remaining.toLocaleString()} 
                <span className="text-sm font-normal text-white/40 ml-1">{t('nav.currency')}</span>
              </span>
            </div>
          </div>

          <div className="h-5 w-full bg-black/40 rounded-full overflow-hidden border border-[var(--color-border)] shadow-inner relative group-hover:border-white/10 transition-colors">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full transition-colors duration-500 shadow-[inset_0_1px_rgba(255,255,255,0.2)] flex items-center justify-end px-2 ${
                utilization >= 100 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                utilization >= 85 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                utilization >= 70 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                'bg-gradient-to-r from-blue-600 to-blue-400'
              }`}
            >
              {progress > 15 && (
                <span className="text-[10px] font-bold text-white drop-shadow-md">
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
              {budgets.map((budget, idx) => {
                const mappedCategory = typeof budget.category === 'object' 
                  ? budget.category 
                  : categories.find(c => c._id === budget.category);
                
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
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
