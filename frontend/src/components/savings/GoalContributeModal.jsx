import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X, ArrowRightLeft, Loader2, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function GoalContributeModal({
  open,
  onClose,
  goal,
  accounts = [],
  onContribute,
  isSubmitting = false
}) {
  const { t, lang } = useLanguage();

  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (goal) {
      // Default amount to required pace or empty
      const defaultAmt = goal.requiredMonthlyPace > 0 ? String(goal.requiredMonthlyPace) : '1000';
      setAmount(defaultAmt);
      // Pick first non-linked account if possible
      const defaultSource = accounts.find(a => a._id !== (goal.linkedAccountId?._id || goal.linkedAccountId)) || accounts[0];
      setFromAccountId(defaultSource?._id || '');
      setNotes('');
      setError('');
    }
  }, [goal, open, accounts]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !goal) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) {
      setError(t('savingsGoals.amountRequired'));
      return;
    }
    if (!fromAccountId) {
      setError(t('savingsGoals.sourceAccountRequired'));
      return;
    }
    onContribute({
      goalId: goal._id,
      amount: num,
      fromAccountId,
      notes: notes.trim()
    });
  };

  const quickPresets = [500, 1000, 2000, 5000];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="goal-contribute-title"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md bg-[#1A1617]/95 border border-white/15 rounded-[2.5rem] shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-[32px] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/40 text-[#E8C5A8] flex items-center justify-center">
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <h3 id="goal-contribute-title" className="text-lg font-bold text-white">
                {t('savingsGoals.contributeTo', { title: '' })}
              </h3>
              <p className="text-xs text-[#E8C5A8] font-bold">
                {goal.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t('common.close')}
            className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-300 text-xs">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label htmlFor="contribute-amount-input" className="block text-xs font-semibold text-white/70 mb-1.5">
              {t('savingsGoals.depositAmount')} *
            </label>
            <input
              id="contribute-amount-input"
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-lg font-black tabular-nums focus:outline-none focus:border-[#8D6346]"
              required
            />
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2">
            {quickPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-bold transition-colors tabular-nums min-h-[40px]"
              >
                +{preset.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
              </button>
            ))}
          </div>

          {/* Source Account */}
          <div>
            <label htmlFor="contribute-account-select" className="block text-xs font-semibold text-white/70 mb-1.5">
              {t('savingsGoals.fromAccount')} *
            </label>
            <select
              id="contribute-account-select"
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full px-4 py-3 bg-[#2B2321] border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-[#8D6346]"
              required
            >
              <option value="">{t('savingsGoals.selectSourceAccount')}</option>
              {accounts.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.name} ({acc.type})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="contribute-notes-input" className="block text-xs font-semibold text-white/70 mb-1.5">
              {t('savingsGoals.notes')}
            </label>
            <input
              id="contribute-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('savingsGoals.depositNotesPlaceholder')}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:border-[#8D6346] placeholder-white/30"
            />
          </div>

          {/* Submit */}
          <div className="pt-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full font-bold text-[15px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t('savingsGoals.processingDeposit')}</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>{t('savingsGoals.confirmDeposit')}</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
