import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { 
  X, CheckCircle2, AlertTriangle, Loader2, Sparkles, 
  CreditCard, ShoppingBag, Banknote, Calendar, ArrowRightLeft,
  TrendingUp, Repeat, PieChart 
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function CommitPlanModal({
  open,
  onClose,
  actions = [],
  onConfirm,
  isCommitting = false
}) {
  const { t, lang } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isCommitting) {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isCommitting) {
        e.preventDefault();
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, isCommitting, onConfirm]);

  if (!open) return null;

  const money = (val) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isCommitting) {
          onClose();
        }
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="commit-plan-title"
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-[#1A1617]/95 border border-white/15 rounded-[2.5rem] shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-[32px] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/40 text-[#E8C5A8] flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 id="commit-plan-title" className="text-lg font-bold text-white">
                {t('sandbox.commitTitle')}
              </h3>
              <p className="text-xs text-white/50">
                {t('sandbox.commitDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isCommitting}
            aria-label={t('common.close')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {t('sandbox.commitWarning')}
            </p>
          </div>

          <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider">
            {t('sandbox.plannedChanges')} ({actions.length})
          </h4>

          <div className="space-y-2.5">
            {actions.map((act, index) => {
              const p = act.payload || {};
              let icon = ShoppingBag;
              let title = act.type;
              let detail = '';

              if (act.type === 'purchase') {
                icon = ShoppingBag;
                title = p.notes || t('sandbox.purchaseTitle');
                detail = money(p.amount);
              } else if (act.type === 'installment') {
                icon = CreditCard;
                title = p.title || t('installments.title');
                detail = `${money(p.monthlyAmount)} / ${t('savingsGoals.perMonth')} (${p.totalMonths} ${t('common.months')})`;
              } else if (act.type === 'salary') {
                icon = Banknote;
                title = t('sandbox.salaryTitle');
                detail = `+${money(p.newAmount || p.amount)}`;
              } else if (act.type === 'debt') {
                icon = CreditCard;
                const isBorrow = p.action === 'borrow' || p.action === 'take';
                title = p.notes || (isBorrow ? (t('sandbox.takeDebt') || 'اقتراض سلفة') : (t('sandbox.repayDebt') || 'سداد دين'));
                detail = `${isBorrow ? '+' : '-'}${money(p.amount)}`;
              } else if (act.type === 'bill') {
                icon = Calendar;
                title = p.title || t('sandbox.billItem') || 'سداد فاتورة';
                detail = `-${money(p.amount)}`;
              } else if (act.type === 'investment') {
                icon = TrendingUp;
                const isBuy = p.action === 'buy';
                title = p.notes || (isBuy ? (t('sandbox.buyInvestment') || 'شراء أصل استثماري') : (t('sandbox.sellInvestment') || 'تسييل استثمار'));
                detail = `${isBuy ? '-' : '+'}${money(p.amount)}`;
              } else if (act.type === 'recurring') {
                icon = Repeat;
                title = p.notes || t('sandbox.recurringTx') || 'معاملة دورية';
                detail = `${money(p.amount)} / ${t('savingsGoals.perMonth')}`;
              } else if (act.type === 'budget') {
                icon = PieChart;
                title = p.categoryName || t('sandbox.budget') || 'ضبط الميزانية';
                detail = `${money(p.amount)} / ${t('savingsGoals.perMonth')}`;
              }

              const Icon = icon;

              return (
                <div 
                  key={index} 
                  className="p-3.5 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8C5A8] shrink-0">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{title}</p>
                      <p className="text-[10px] text-white/40">{t(`sandbox.${act.type}`) || act.type}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-white tabular-nums shrink-0">
                    {detail}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/10 bg-white/[0.02] flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isCommitting}
            className="flex-1 py-3.5 min-h-[48px] rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white/80 hover:text-white font-bold text-sm transition-colors cursor-pointer"
          >
            {t('common.cancel')}
          </button>

          <motion.button
            id="btn-confirm-commit"
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onConfirm}
            disabled={isCommitting}
            className="flex-1 py-3.5 min-h-[48px] rounded-full bg-[#8D6346]/35 hover:bg-[#8D6346]/50 border border-[#8D6346]/60 backdrop-blur-md text-white font-bold text-sm shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.22)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isCommitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('sandbox.applying')}</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>{t('sandbox.confirmCommit')}</span>
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
