import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Target, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export default function BudgetSummary({ budgets, spentData }) {
  const { t } = useLanguage();

  if (!budgets || budgets.length === 0) return null;

  const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (spentData[b._id] || 0), 0);
  const totalRemaining = Math.max(totalBudget - totalSpent, 0);
  const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  let healthState = 'healthy';
  let HealthIcon = CheckCircle;
  let healthColor = 'text-green-400';
  let healthBg = 'bg-green-500/10 border-green-500/20';

  if (utilization >= 100) {
    healthState = 'exceeded';
    HealthIcon = AlertTriangle;
    healthColor = 'text-red-400';
    healthBg = 'bg-red-500/10 border-red-500/20';
  } else if (utilization >= 85) {
    healthState = 'critical';
    HealthIcon = AlertTriangle;
    healthColor = 'text-orange-400';
    healthBg = 'bg-orange-500/10 border-orange-500/20';
  } else if (utilization >= 70) {
    healthState = 'warning';
    HealthIcon = Info;
    healthColor = 'text-yellow-400';
    healthBg = 'bg-yellow-500/10 border-yellow-500/20';
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <div className="bg-white/5 dark:bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-xl relative overflow-hidden shadow-2xl">
        {/* Glow Effect */}
        <div 
          className={`absolute -top-16 -right-16 w-48 h-48 blur-[80px] opacity-30 rounded-full pointer-events-none transition-colors duration-700 ${
            utilization >= 100 ? 'bg-red-500' : utilization >= 70 ? 'bg-yellow-500' : 'bg-brand-blue'
          }`}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="text-brand-blue" />
              {t('budgets.summary')}
            </h2>
            <div className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 border backdrop-blur-md ${healthBg}`}>
              <HealthIcon className={`w-4 h-4 ${healthColor}`} />
              <span className={`text-xs font-semibold ${healthColor}`}>
                {t(`budgets.${healthState}`)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
              <span className="text-white/50 text-sm block mb-1">{t('budgets.totalRemaining')}</span>
              <span className="text-2xl font-bold text-white">
                {totalRemaining.toLocaleString()} <span className="text-sm font-normal text-white/40">{t('nav.currency')}</span>
              </span>
            </div>
            
            <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
              <span className="text-white/50 text-sm block mb-1">{t('budgets.totalSpent')}</span>
              <span className="text-2xl font-bold text-white">
                {totalSpent.toLocaleString()} <span className="text-sm font-normal text-white/40">{t('nav.currency')}</span>
              </span>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(utilization, 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    utilization >= 100 ? 'bg-red-500' : utilization >= 70 ? 'bg-yellow-500' : 'bg-brand-blue'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
