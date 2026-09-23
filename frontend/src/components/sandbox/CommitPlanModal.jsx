import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  X, CheckCircle2, AlertTriangle, Loader2, Sparkles, 
  CreditCard, ShoppingBag, Banknote, Calendar, ArrowRightLeft 
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

  if (!open) return null;

  const money = (val) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg bg-[#1A1617]/95 border border-white/15 rounded-[2.5rem] shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-[32px] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/40 text-[#E8C5A8] flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
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
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
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
                detail = `+${money(p.amount)}`;
              }

              const Icon = icon;

              return (
                <div 
                  key={index} 
                  className="p-3.5 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8C5A8]">
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{title}</p>
                      <p className="text-[10px] text-white/40 capitalize">{act.type}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-white tabular-nums">
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
            className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-bold text-xs transition-colors"
          >
            {t('common.cancel')}
          </button>

          <motion.button
            id="btn-confirm-commit"
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={onConfirm}
            disabled={isCommitting}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#8D6346] via-[#B88764] to-[#8D6346] hover:opacity-95 text-white font-bold text-xs shadow-[0_8px_24px_rgba(141,99,70,0.4)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
