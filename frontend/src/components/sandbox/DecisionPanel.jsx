import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, 
  Clock, TrendingUp, TrendingDown, Target, Lightbulb, 
  ArrowRight, Award, Zap, AlertCircle, Sparkles, Flame, Calendar
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function DecisionPanel({ decision, insights = [] }) {
  const { t, lang } = useLanguage();

  if (!decision) return null;

  const money = (val) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  const verdict = decision.verdict || {
    status: decision.risk === 'Critical' ? 'critical' : (decision.risk === 'High' ? 'caution' : 'safe'),
    badgeAr: decision.risk === 'Critical' ? 'خطر حرج ⚠️' : (decision.risk === 'High' ? 'قابل للتطبيق بحذر !' : 'آمن وموصى به ✓'),
    badgeEn: decision.risk === 'Critical' ? 'Critical Risk ⚠️' : (decision.risk === 'High' ? 'Viable with Caution !' : 'Safe & Recommended ✓'),
    titleAr: decision.risk === 'Critical' ? 'خطر مالي حرج' : (decision.risk === 'High' ? 'قابل للتطبيق مع الحذر' : 'آمن وموصى به'),
    titleEn: decision.risk === 'Critical' ? 'Critical Financial Risk' : (decision.risk === 'High' ? 'Viable with Caution' : 'Safe & Recommended'),
    reasonAr: 'التقييم يعتمد على مستوى السيولة ودرع الأمان ومعدل عبء الدين.',
    reasonEn: 'Evaluation is based on liquidity buffers, emergency shield, and debt load.'
  };

  // Verdict Theme Styles
  const verdictStyles = {
    safe: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      glow: 'rgba(52,199,89,0.15)',
      icon: ShieldCheck,
      iconColor: 'text-emerald-400'
    },
    caution: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      glow: 'rgba(245,158,11,0.15)',
      icon: AlertTriangle,
      iconColor: 'text-amber-400'
    },
    critical: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
      badge: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      glow: 'rgba(255,59,48,0.15)',
      icon: ShieldAlert,
      iconColor: 'text-rose-400'
    }
  };

  const currentStyle = verdictStyles[verdict.status] || verdictStyles.safe;
  const VerdictIcon = currentStyle.icon;

  const verdictBadge = lang === 'ar' ? verdict.badgeAr : verdict.badgeEn;
  const verdictTitle = lang === 'ar' ? verdict.titleAr : verdict.titleEn;
  const verdictReason = lang === 'ar' ? verdict.reasonAr : verdict.reasonEn;

  // Extracted Resilience Metrics Before & After
  const shieldBefore = decision.emergencyCoverageMonthsBefore !== undefined ? decision.emergencyCoverageMonthsBefore : 0;
  const shieldAfter = decision.emergencyCoverageMonthsAfter !== undefined ? decision.emergencyCoverageMonthsAfter : (decision.emergencyCoverageMonths || 0);
  const shieldDiff = Number((shieldAfter - shieldBefore).toFixed(1));

  const dtiBefore = decision.dtiBefore !== undefined ? decision.dtiBefore : 0;
  const dtiAfter = decision.dtiAfter !== undefined ? decision.dtiAfter : (decision.debtToIncomeRatio || 0);

  const burnBefore = decision.essentialBurnBefore !== undefined ? decision.essentialBurnBefore : 0;
  const burnAfter = decision.essentialBurnAfter !== undefined ? decision.essentialBurnAfter : 0;
  const burnDiff = burnAfter - burnBefore;

  const recoveryDays = decision.recoveryDays;
  const dailyRate = decision.dailySavingsRate || 0;
  const monthlyNetSavings = decision.monthlyNetSavings || 0;

  return (
    <div className="space-y-5 mb-8">
      {/* 1. Hero Decision Verdict Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`relative overflow-hidden rounded-[2.5rem] p-6 sm:p-8 backdrop-blur-[32px] border ${currentStyle.bg}`}
        style={{ boxShadow: `0 8px 32px ${currentStyle.glow}` }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${currentStyle.badge}`}>
              <VerdictIcon size={30} className={currentStyle.iconColor} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className={`px-3 py-1 rounded-full text-xs font-black border ${currentStyle.badge}`}>
                  {verdictBadge}
                </span>
                {decision.score !== undefined && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-black/30 border border-white/10 text-white/70 tabular-nums">
                    {decision.score}/100
                  </span>
                )}
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {verdictTitle}
              </h3>
              <p className="text-xs sm:text-sm text-white/80 mt-1 leading-relaxed max-w-xl">
                {verdictReason}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Resilience Pillars 4-Card Grid (Before vs After) */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
          
          {/* Pillar 1: Emergency Shield Runway */}
          <div className="p-4 rounded-2xl bg-black/25 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/50 font-medium">
                {t('sandbox.shieldCoverage')}
              </span>
              <ShieldCheck size={14} className={decision.emergencyFloorBreached ? 'text-amber-400' : 'text-emerald-400'} />
            </div>
            
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-white/40 line-through tabular-nums">
                {shieldBefore} {t('sandbox.months')}
              </span>
              <ArrowRight size={11} className="text-white/30 rtl:rotate-180" />
              <span className={`text-base font-extrabold tabular-nums ${
                decision.emergencyFloorBreached ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {shieldAfter} {t('sandbox.months')}
              </span>
            </div>

            <p className="text-[10px] text-white/50 truncate">
              {decision.emergencyFloorBreached
                ? t('sandbox.shieldBreached', { percent: decision.floorBreachPercent || 0 })
                : t('sandbox.shieldUntouched')}
            </p>
          </div>

          {/* Pillar 2: Debt-to-Income (DTI) Ratio */}
          <div className="p-4 rounded-2xl bg-black/25 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/50 font-medium">
                {t('sandbox.dtiRatio')}
              </span>
              <TrendingUp size={14} className={dtiAfter > 40 ? 'text-rose-400' : dtiAfter > 30 ? 'text-amber-400' : 'text-emerald-400'} />
            </div>
            
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-white/40 line-through tabular-nums">
                {dtiBefore}%
              </span>
              <ArrowRight size={11} className="text-white/30 rtl:rotate-180" />
              <span className={`text-base font-extrabold tabular-nums ${
                dtiAfter > 40 ? 'text-rose-400' : dtiAfter > 30 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {dtiAfter}%
              </span>
            </div>

            <p className="text-[10px] text-white/50">
              {dtiAfter > 40 ? t('sandbox.criticalRatio') : dtiAfter > 30 ? t('sandbox.cautionRatio') : t('sandbox.healthyRatio')}
            </p>
          </div>

          {/* Pillar 3: Recovery Runway */}
          <div className="p-4 rounded-2xl bg-black/25 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/50 font-medium">
                {t('sandbox.recoveryRunway')}
              </span>
              <Clock size={14} className="text-[#E8C5A8]" />
            </div>
            
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold text-white tabular-nums">
                {recoveryDays !== null ? `${recoveryDays} ${t('sandbox.days')}` : t('sandbox.noRecovery')}
              </span>
            </div>

            <p className="text-[10px] text-white/50 truncate">
              {dailyRate > 0 ? `+${money(dailyRate)} / ${t('sandbox.dailyRate')}` : t('sandbox.noRecovery')}
            </p>
          </div>

          {/* Pillar 4: Essential Commitments Burn */}
          <div className="p-4 rounded-2xl bg-black/25 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/50 font-medium">
                {t('sandbox.essentialCommitments')}
              </span>
              <Flame size={14} className="text-amber-400" />
            </div>
            
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-white/40 line-through tabular-nums">
                {money(burnBefore)}
              </span>
              <ArrowRight size={11} className="text-white/30 rtl:rotate-180" />
              <span className="text-base font-extrabold text-white tabular-nums">
                {money(burnAfter)}
              </span>
            </div>

            <p className={`text-[10px] font-bold tabular-nums ${burnDiff > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {burnDiff > 0 ? `+${money(burnDiff)} / ${t('sandbox.perMonth')}` : '0 ج.م'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 3. Agreed Dedicated Recovery Quote Statement (sand.md) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-[#8D6346]/15 border border-[#8D6346]/35 p-4 flex items-start gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
      >
        <div className="p-2 rounded-xl bg-[#8D6346]/30 text-[#E8C5A8] shrink-0 mt-0.5 border border-[#8D6346]/40">
          <Sparkles size={18} />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-semibold text-white/90 leading-relaxed">
            {lang === 'ar' ? decision.recoveryDaysTextAr : decision.recoveryDaysTextEn}
          </p>
          {dailyRate > 0 && monthlyNetSavings > 0 && (
            <p className="text-[11px] text-[#E8C5A8] mt-1 font-medium">
              {lang === 'ar' 
                ? `معدل التوفير اليومي: ${money(dailyRate)}/يوم • صافي الفائض الشهري: ${money(monthlyNetSavings)}/شهر`
                : `Daily Savings Rate: ${money(dailyRate)}/day • Monthly Net Surplus: ${money(monthlyNetSavings)}/month`}
            </p>
          )}
        </div>
      </motion.div>

      {/* 4. Goal Delays Opportunity Cost Section (sand.md) */}
      {decision.goalDelays && decision.goalDelays.length > 0 && (
        <div className="rounded-[2.5rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 mb-1.5 text-[#E8C5A8]">
            <Target size={18} />
            <h4 className="text-sm font-bold text-white">
              {t('sandbox.goalDelayNotice')}
            </h4>
          </div>
          <p className="text-xs text-white/50 mb-4">
            {lang === 'ar' 
              ? 'يوضح هذا القسم كيف يؤثر هذا القرار سلباً على المواعيد النهائية لأهدافك التوفيرية النشطة:'
              : 'This section details how this decision delays your active savings goals target deadlines:'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {decision.goalDelays.map((gd) => (
              <div 
                key={gd.goalId} 
                className="p-4 rounded-2xl bg-black/25 border border-white/5 flex flex-col justify-between gap-3 group hover:border-[#8D6346]/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h5 className="text-sm font-bold text-white flex items-center gap-2">
                      {gd.title}
                    </h5>
                    {gd.priority === 'high' ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                        {t('savingsGoals.priorityHigh')}
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 font-medium border border-white/10">
                        {t(`savingsGoals.priority${gd.priority ? gd.priority.charAt(0).toUpperCase() + gd.priority.slice(1) : 'Medium'}`)}
                      </span>
                    )}
                  </div>

                  {/* Agreed Impact Statement */}
                  <p className="text-xs text-amber-300/90 font-medium leading-relaxed mt-1">
                    {lang === 'ar' ? gd.impactTextAr : gd.impactTextEn}
                  </p>
                </div>

                {/* Date Progression Pill */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-white/40 block">
                      {lang === 'ar' ? 'الموعد الأصلي' : 'Original Deadline'}
                    </span>
                    <span className="font-semibold text-white/60 line-through tabular-nums text-[11px]">
                      {gd.originalTargetDateFormatted || new Date(gd.originalTargetDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <ArrowRight size={13} className="text-[#E8C5A8] rtl:rotate-180 shrink-0" />

                  <div className="text-end">
                    <span className="text-[10px] text-[#E8C5A8] block font-medium">
                      {t('sandbox.newDeadline')}
                    </span>
                    <span className="font-bold text-white tabular-nums text-xs">
                      {gd.newEstimatedDateFormatted || new Date(gd.newEstimatedDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Actionable Trade-off Suggestions */}
      {decision.tradeOffSuggestions && decision.tradeOffSuggestions.length > 0 && (
        <div className="rounded-[2.5rem] bg-[#8D6346]/10 border border-[#8D6346]/25 p-6 backdrop-blur-[20px]">
          <div className="flex items-center gap-2 mb-2.5 text-[#E8C5A8]">
            <Lightbulb size={18} />
            <h4 className="text-sm font-bold">
              {t('sandbox.suggestionsTitle')}
            </h4>
          </div>

          <div className="space-y-2.5">
            {decision.tradeOffSuggestions.map((sug, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-white/80">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E8C5A8] mt-2 shrink-0" />
                <p className="leading-relaxed">
                  {lang === 'ar' ? sug.textAr : sug.textEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Warnings & Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-2xl border flex items-center gap-3 text-xs sm:text-sm font-medium ${
                ins.type === 'critical'
                  ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
                  : 'bg-amber-500/15 border-amber-500/35 text-amber-300'
              }`}
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{ins.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
