import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Calendar, CheckCircle2, AlertCircle, Clock, Trash2, Edit2, Zap, Building2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const PROVIDER_COLORS = {
  valu: 'from-orange-500/20 to-orange-700/20 text-orange-400 border-orange-500/30',
  souhoola: 'from-emerald-500/20 to-emerald-700/20 text-emerald-400 border-emerald-500/30',
  sympl: 'from-blue-500/20 to-blue-700/20 text-blue-400 border-blue-500/30',
  tabby: 'from-green-500/20 to-green-700/20 text-green-400 border-green-500/30',
  tamara: 'from-amber-500/20 to-amber-700/20 text-amber-400 border-amber-500/30',
  bank_cib: 'from-blue-600/20 to-blue-900/20 text-blue-300 border-blue-600/30',
  bank_nbe: 'from-emerald-600/20 to-emerald-900/20 text-emerald-300 border-emerald-600/30',
  bank_misr: 'from-red-600/20 to-red-900/20 text-red-300 border-red-600/30',
  gameya: 'from-[#8D6346]/20 to-[#5A3F2D]/20 text-[#E8C5A8] border-[#8D6346]/30',
  other: 'from-stone-600/20 to-stone-900/20 text-stone-300 border-stone-600/30'
};

export default function InstallmentCard({
  installment,
  onPay,
  onEdit,
  onDelete,
  isPaying = false
}) {
  const { t, lang } = useLanguage();

  const money = (val) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  const {
    _id,
    title,
    provider = 'other',
    providerName,
    totalAmount = 0,
    monthlyAmount = 0,
    totalMonths = 1,
    paidMonths = 0,
    remainingAmount = 0,
    progressPercent = 0,
    nextDueDate,
    isOverdue,
    autoPay,
    linkedAccountId,
    status
  } = installment;

  // Calculate days remaining until nextDueDate
  const targetDate = new Date(nextDueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const targetMidnight = new Date(targetDate);
  targetMidnight.setHours(0, 0, 0, 0);
  const diffDays = Math.round((targetMidnight - now) / (1000 * 60 * 60 * 24));

  const providerLabel = provider === 'other' && providerName
    ? providerName
    : t(`installments.providers.${provider}`, provider);

  const providerBadgeClass = PROVIDER_COLORS[provider] || PROVIDER_COLORS.other;

  const isSettled = status === 'settled' || paidMonths >= totalMonths;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-2xl bg-[#2B2321]/30 backdrop-blur-xl border border-[#8D6346]/25 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.37)] hover:border-[#8D6346]/50 transition-all group"
    >
      {/* Ambient subtle glow sphere behind active cards */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#8D6346]/20 rounded-full blur-2xl pointer-events-none" />

      {/* Top row: Provider Badge & Action Icons */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${providerBadgeClass}`}>
            <Building2 className="w-3 h-3" />
            {providerLabel}
          </span>
          {autoPay && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#8D6346]/20 text-[#E8C5A8] border border-[#8D6346]/30">
              <Zap className="w-2.5 h-2.5" />
              {t('installments.autoPay')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onEdit(installment)}
              aria-label={t('installments.editInstallment')}
              className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </motion.button>
          )}
          {onDelete && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onDelete(installment)}
              aria-label={t('installments.deleteInstallment')}
              className="p-1.5 rounded-lg text-white/50 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Title & Monthly Amount Hero */}
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <div>
          <h3 className="text-base font-semibold text-white/90 drop-shadow-sm line-clamp-1">
            {title}
          </h3>
          {linkedAccountId?.name && (
            <p className="text-xs text-white/40 mt-0.5">
              {linkedAccountId.name}
            </p>
          )}
        </div>
        <div className="text-end">
          <span className="text-lg font-bold text-white tabular-nums tracking-tight">
            {money(monthlyAmount)}
          </span>
          <span className="text-xs text-[#E8C5A8]/70 block">
            {t('savingsGoals.perMonth')}
          </span>
        </div>
      </div>

      {/* Progress Bar & Month Counter */}
      <div className="space-y-1.5 mb-4">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>
            {t('installments.monthOf', { current: paidMonths, total: totalMonths })}
          </span>
          <span className="font-semibold text-[#E8C5A8] tabular-nums">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden p-0.5 border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              isSettled
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                : 'bg-gradient-to-r from-[#8D6346] via-[#B28260] to-[#E8C5A8]'
            }`}
          />
        </div>
      </div>

      {/* Due Date Countdown & Remaining Burden */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs mb-4">
        {/* Due status pill */}
        <div>
          {isSettled ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t('installments.statusSettled')}
            </span>
          ) : isOverdue ? (
            <span className="inline-flex items-center gap-1 text-rose-400 font-medium bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              <AlertCircle className="w-3 h-3" />
              {t('installments.overdue')}
            </span>
          ) : diffDays === 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
              <Clock className="w-3 h-3" />
              {t('installments.dueToday')}
            </span>
          ) : (
            <span className={`inline-flex items-center gap-1 ${diffDays <= 3 ? 'text-amber-400' : 'text-white/60'}`}>
              <Calendar className="w-3 h-3" />
              {t('installments.nextDueIn', {
                days: diffDays,
                date: targetDate.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })
              })}
            </span>
          )}
        </div>

        {/* Total remaining amount */}
        <div className="text-end">
          <span className="text-white/40 block text-[10px]">
            {t('installments.totalRemaining')}
          </span>
          <span className="font-semibold text-white/80 tabular-nums">
            {money(remainingAmount)}
          </span>
        </div>
      </div>

      {/* One-Tap Payment Action Button */}
      {!isSettled && onPay && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => onPay(installment)}
          disabled={isPaying}
          className="w-full py-3 px-4 rounded-full font-semibold text-[13.5px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPaying ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t('installments.paying')}</span>
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              <span>{t('installments.payThisMonth')}</span>
            </>
          )}
        </motion.button>
      )}
    </motion.div>
  );
}
