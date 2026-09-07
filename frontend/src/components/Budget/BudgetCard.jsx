import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BudgetCard({ budget, spent, onEdit, onDelete, index = 0 }) {
  const { t } = useLanguage();
  
  const safeAmount = budget.amount || 0;
  const safeSpent = spent || 0;
  
  const progress = Math.min((safeSpent / safeAmount) * 100, 100) || 0;
  const utilization = safeAmount > 0 ? (safeSpent / safeAmount) * 100 : 0;
  const isOverBudget = safeSpent > safeAmount;
  const remaining = Math.max(safeAmount - safeSpent, 0);

  let stateColor = 'bg-[#8D6346] text-[#8D6346]';
  let stateBorder = 'border-[#8D6346]/30';
  let stateBg = 'bg-[#8D6346]/10';
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

  const categoryIcon = budget.category?.icon || 'Tag';
  const IconComponent = Icons[categoryIcon] || Icons.Tag;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 relative overflow-hidden group transition-all duration-500 h-full flex flex-col justify-between hover:border-white/20 hover:scale-[1.01]`}
    >
      {/* Background glow based on progress */}
      <div 
        className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl opacity-20 rounded-full pointer-events-none transition-colors duration-500 ${stateColor.split(' ')[0]}`}
      />
      <div className="flex-1">

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${stateBg} ${stateBorder}`}>
            <IconComponent size={24} className={stateColor.split(' ')[1]} />
          </div>
          <div>
            <h3 className="font-semibold text-white/90 text-lg flex items-center gap-2">
              {budget.category?.name || t('budgets.category')}
              {budget.carryOver && (
                <Icons.Repeat size={14} className="text-white/40" />
              )}
              {budget.isRecurring === false && (
                <span className="text-[10px] font-bold bg-white/10 text-white/60 px-2 py-0.5 rounded-full">
                  {t('budgets.oneTime')}
                </span>
              )}
            </h3>
            <p className="text-xs text-white/50">
              {budget.period === 'weekly' ? t('budgets.weekly') : budget.period === 'custom' ? t('budgets.custom') : t('budgets.monthly')}
              {budget.account && ` • ${t('budgets.account')}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onEdit(budget);
            }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          >
            <Icons.Edit2 size={14} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(budget);
            }}
            className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
          >
            <Icons.Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
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

        {/* Progress Bar Container */}
        <div className="h-5 w-full bg-black/40 rounded-full overflow-hidden border border-[var(--color-border)] shadow-inner relative group-hover:border-white/10 transition-colors">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full transition-colors duration-500 shadow-[inset_0_1px_rgba(255,255,255,0.2)] flex items-center justify-end px-2 ${
              utilization >= 100 ? 'bg-gradient-to-r from-red-600 to-red-400' :
              utilization >= 85 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
              utilization >= 70 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
              'bg-gradient-to-r from-[#8D6346] to-[#E8C5A8]/80'
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
    </motion.div>
  );
}
