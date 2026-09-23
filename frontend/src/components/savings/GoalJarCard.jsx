import React from 'react';
import { motion } from 'framer-motion';
import { 
  Target, Car, Heart, Palmtree, Home, Compass, 
  GraduationCap, Smartphone, Sparkles, Plus, 
  MoreVertical, CheckCircle2, AlertCircle, TrendingUp,
  Clock, Shield, Award, Edit2, Trash2
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const CATEGORY_ICONS = {
  car: Car,
  marriage: Heart,
  vacation: Palmtree,
  real_estate: Home,
  hajj_umrah: Compass,
  education: GraduationCap,
  electronics: Smartphone,
  other: Target
};

export default function GoalJarCard({ 
  goal, 
  onContribute, 
  onEdit, 
  onDelete 
}) {
  const { t, lang } = useLanguage();

  const money = (val) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  const IconComponent = CATEGORY_ICONS[goal.category] || Target;
  const isAchieved = goal.status === 'achieved' || (goal.currentAmount >= goal.targetAmount);
  const progressClamped = Math.min(100, goal.progressPercent || 0);

  // Pace status configuration
  const paceConfig = {
    ahead: {
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      icon: TrendingUp,
      label: t('savingsGoals.paceAhead')
    },
    on_track: {
      color: 'text-[#E8C5A8] bg-[#8D6346]/20 border-[#8D6346]/40',
      icon: CheckCircle2,
      label: t('savingsGoals.paceOnTrack')
    },
    behind: {
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      icon: AlertCircle,
      label: t('savingsGoals.paceBehind')
    }
  };

  const currentPace = paceConfig[goal.paceStatus] || paceConfig.on_track;
  const PaceIcon = currentPace.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25 }}
      className={`relative overflow-hidden rounded-[2rem] p-5 backdrop-blur-[32px] border transition-all duration-300 ${
        isAchieved
          ? 'bg-gradient-to-br from-[#2B2321]/60 via-[#8D6346]/20 to-[#34C759]/10 border-[#34C759]/40 shadow-[0_8px_32px_rgba(52,199,89,0.15)]'
          : 'bg-[#2B2321]/40 border-white/10 hover:border-[#8D6346]/40 shadow-[0_8px_32px_rgba(0,0,0,0.3)]'
      }`}
    >
      {/* Background Ambient Glow */}
      <div 
        className="absolute -top-12 -end-12 w-36 h-36 rounded-full blur-[60px] pointer-events-none opacity-20"
        style={{ backgroundColor: goal.color || '#8D6346' }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner border"
            style={{ 
              backgroundColor: `${goal.color || '#8D6346'}25`,
              borderColor: `${goal.color || '#8D6346'}40`,
              color: goal.color || '#E8C5A8'
            }}
          >
            <IconComponent size={24} />
          </div>
          <div className="min-w-0">
            <h4 className="text-white font-bold text-base truncate flex items-center gap-2">
              {goal.title}
              {isAchieved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#34C759]/20 text-[#34C759] border border-[#34C759]/40">
                  <Award size={11} /> {t('savingsGoals.milestone100')}
                </span>
              )}
            </h4>
            <div className="flex items-center gap-2 text-xs text-white/50 mt-0.5">
              <span>{goal.linkedAccountId?.name || t('savingsGoals.virtualJar')}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {t('savingsGoals.monthsRemaining', { months: goal.monthsRemaining })}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(goal)}
              aria-label={t('common.edit')}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
            >
              <Edit2 size={14} />
            </motion.button>
          )}
          {onDelete && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(goal)}
              aria-label={t('common.delete')}
              className="w-8 h-8 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
            >
              <Trash2 size={14} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Amounts Display */}
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex flex-col">
          <span className="text-[11px] text-white/50 font-medium">
            {t('savingsGoals.currentAmount')}
          </span>
          <span className="text-xl font-black text-white tabular-nums tracking-tight">
            {money(goal.currentAmount)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[11px] text-white/50 font-medium">
            {t('savingsGoals.targetAmount')}
          </span>
          <span className="text-sm font-bold text-[#E8C5A8] tabular-nums tracking-tight">
            {money(goal.targetAmount)}
          </span>
        </div>
      </div>

      {/* Progress Bar with Milestone Markers */}
      <div className="relative mb-3">
        <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressClamped}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full transition-all ${
              isAchieved
                ? 'bg-gradient-to-r from-[#34C759] to-[#E8C5A8] shadow-[0_0_12px_rgba(52,199,89,0.5)]'
                : 'bg-gradient-to-r from-[#8D6346] via-[#E8C5A8] to-[#8D6346] shadow-[0_0_8px_rgba(141,99,70,0.5)]'
            }`}
          />
        </div>

        {/* Milestone Notch Markers (25%, 50%, 75%) */}
        <div className="absolute inset-0 pointer-events-none flex justify-between px-1 items-center">
          <div className="w-1.5 h-1.5 rounded-full bg-black/60 border border-white/20" style={{ left: '25%' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-black/60 border border-white/20" style={{ left: '50%' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-black/60 border border-white/20" style={{ left: '75%' }} />
        </div>
      </div>

      {/* Progress Meta Row */}
      <div className="flex items-center justify-between text-xs mb-4">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-[#E8C5A8] tabular-nums">
            {goal.progressPercent || 0}%
          </span>
          {goal.surplusAmount > 0 && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
              +{money(goal.surplusAmount)} {t('savingsGoals.surplus')}
            </span>
          )}
        </div>

        {/* Pace Status Badge */}
        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${currentPace.color}`}>
          <PaceIcon size={12} />
          <span>{currentPace.label}</span>
        </div>
      </div>

      {/* Footer: Required Monthly Pace + Quick Contribute Button */}
      <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-white/50">
            {t('savingsGoals.requiredPace')}
          </span>
          <span className="text-xs font-bold text-white/90 tabular-nums">
            {goal.requiredMonthlyPace > 0 ? (
              <>
                <span className="text-emerald-400 font-extrabold">{money(goal.requiredMonthlyPace)}</span>
                <span className="text-white/40 text-[10px] ms-1">/{t('savingsGoals.perMonth')}</span>
              </>
            ) : (
              <span className="text-emerald-400 font-medium">{t('savingsGoals.paceCompleted')}</span>
            )}
          </span>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => onContribute(goal)}
          className="px-3.5 py-2 rounded-xl bg-[#8D6346]/20 hover:bg-[#8D6346]/40 border border-[#8D6346]/40 text-[#E8C5A8] hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
        >
          <Plus size={14} />
          <span>{t('savingsGoals.contribute')}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}
