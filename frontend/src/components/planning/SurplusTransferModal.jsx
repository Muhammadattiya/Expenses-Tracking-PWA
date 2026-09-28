import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  PiggyBank, 
  Target, 
  ArrowRight, 
  Lock, 
  AlertCircle, 
  Loader2, 
  X, 
  Check, 
  Wallet 
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { depositEmergencyFund } from '../../api/emergencyFund';
import { contributeToGoal } from '../../api/savingsGoals';
import { createTransaction } from '../../api/transactions';
import { getIconComponent } from '../IconPicker';

function SurplusTransferModal({
  isOpen,
  onClose,
  targetType = 'emergency', // 'emergency' | 'savings' | 'goals'
  remainingAmount = 0,
  accounts = [],
  emergencyShield = null,
  savingsGoals = [],
  onSuccess
}) {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();
  const isAr = lang === 'ar';

  const [fromAccountId, setFromAccountId] = useState('');
  const [amount, setAmount] = useState(remainingAmount || '');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [addToBudgetPlan, setAddToBudgetPlan] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active goals list (filter out achieved/cancelled)
  const activeGoals = useMemo(() => {
    return (savingsGoals || []).filter(g => g.status === 'active' || !g.status);
  }, [savingsGoals]);

  // Set default goal if targetType is goals
  useEffect(() => {
    if (targetType === 'goals' && activeGoals.length > 0 && !selectedGoalId) {
      setSelectedGoalId(activeGoals[0]._id);
    }
  }, [targetType, activeGoals, selectedGoalId]);

  // Determine the automatically known "To Account"
  const toAccount = useMemo(() => {
    if (!accounts || accounts.length === 0) return null;

    if (targetType === 'emergency') {
      if (emergencyShield?.linkedAccount) {
        const id = emergencyShield.linkedAccount._id || emergencyShield.linkedAccount;
        return accounts.find(a => (a._id || a).toString() === id.toString()) || emergencyShield.linkedAccount;
      }
      return accounts.find(a => a.isEmergencyFund) ||
        accounts.find(a => a.name?.toLowerCase().includes('emergency') || a.name?.includes('طوارئ') || a.name?.includes('طوارىء')) ||
        null;
    }

    if (targetType === 'savings') {
      return accounts.find(a => a.isSavingsAccount) ||
        accounts.find(a => a.name?.toLowerCase().includes('saving') || a.name?.includes('ادخار')) ||
        null;
    }

    if (targetType === 'goals') {
      const currentGoal = activeGoals.find(g => g._id === selectedGoalId) || activeGoals[0];
      if (currentGoal?.linkedAccountId) {
        const targetId = currentGoal.linkedAccountId._id || currentGoal.linkedAccountId;
        return accounts.find(a => (a._id || a).toString() === targetId.toString()) || currentGoal.linkedAccountId;
      }
      return null;
    }

    return null;
  }, [targetType, accounts, emergencyShield, activeGoals, selectedGoalId]);

  // Filter available source accounts (exclude the destination account and archived accounts)
  const availableSourceAccounts = useMemo(() => {
    const toId = toAccount?._id ? toAccount._id.toString() : null;
    return accounts.filter(a => {
      if (a.isArchived) return false;
      if (toId && a._id.toString() === toId) return false;
      return true;
    });
  }, [accounts, toAccount]);

  // Auto-select first source account or default account
  useEffect(() => {
    if (availableSourceAccounts.length > 0) {
      const defaultAcc = availableSourceAccounts.find(a => a.isDefault) || availableSourceAccounts[0];
      setFromAccountId(defaultAcc._id);
    } else {
      setFromAccountId('');
    }
  }, [availableSourceAccounts]);

  // Update amount when remainingAmount prop changes
  useEffect(() => {
    if (remainingAmount > 0) {
      setAmount(remainingAmount);
    }
  }, [remainingAmount]);

  // Close on ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const TargetIcon = targetType === 'emergency' 
    ? ShieldCheck 
    : targetType === 'savings' 
    ? PiggyBank 
    : Target;

  const targetTitle = targetType === 'emergency'
    ? t('smartBudget.assignToEmergency')
    : targetType === 'savings'
    ? t('smartBudget.assignToSavings')
    : t('smartBudget.assignToGoals');

  const targetTheme = useMemo(() => {
    if (targetType === 'emergency') {
      return {
        glow: 'bg-emerald-500/15',
        iconBg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(52,199,89,0.25)]',
        subtitleColor: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
        accountBorder: 'border-emerald-500/40'
      };
    }
    if (targetType === 'goals') {
      return {
        glow: 'bg-indigo-500/15',
        iconBg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]',
        subtitleColor: 'text-indigo-300',
        badgeBg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
        accountBorder: 'border-indigo-500/40'
      };
    }
    return {
      glow: 'bg-[#8D6346]/20',
      iconBg: 'bg-[#8D6346]/20 border-[#8D6346]/40 text-[#E8C5A8] shadow-[0_0_12px_rgba(141,99,70,0.25)]',
      subtitleColor: 'text-[#E8C5A8]',
      badgeBg: 'bg-[#8D6346]/20 border-[#8D6346]/30 text-[#E8C5A8]',
      accountBorder: 'border-[#8D6346]/40'
    };
  }, [targetType]);

  if (!isOpen) return null;

  const handleConfirmTransfer = async () => {
    if (isSubmitting) return;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return showToast(t('transactions.enterValidAmount') || t('smartBudget.enterValidBudget'), 'error');
    }

    if (!fromAccountId) {
      return showToast(t('transactions.searchAccounts') || 'Please select a source account', 'error');
    }

    const selectedSource = availableSourceAccounts.find(a => a._id === fromAccountId);
    if (selectedSource && selectedSource.balance !== undefined && selectedSource.balance < numAmount) {
      return showToast(t('smartBudget.insufficientBalance'), 'error');
    }

    if (!toAccount || !toAccount._id) {
      const msg = targetType === 'emergency' 
        ? t('smartBudget.noEmergencyAccount')
        : targetType === 'savings'
        ? t('smartBudget.noSavingsAccount')
        : t('smartBudget.noGoalsAvailable');
      return showToast(msg, 'error');
    }

    if (fromAccountId.toString() === toAccount._id.toString()) {
      return showToast(t('smartBudget.sourceDestSame'), 'error');
    }

    setIsSubmitting(true);
    try {
      if (targetType === 'emergency') {
        await depositEmergencyFund({
          fromAccountId,
          amount: numAmount,
          notes: isAr ? 'تحويل فائض الميزانية الذكية إلى درع الطوارئ' : 'Smart Budget surplus allocation to Emergency Fund'
        });
      } else if (targetType === 'goals') {
        const goalId = selectedGoalId || activeGoals[0]?._id;
        if (!goalId) throw new Error('No target goal selected');
        await contributeToGoal(goalId, {
          fromAccountId,
          amount: numAmount,
          notes: isAr ? 'تحويل فائض الميزانية الذكية إلى هدف الادخار' : 'Smart Budget surplus contribution to goal'
        });
      } else if (targetType === 'savings') {
        await createTransaction({
          title: isAr ? 'تحويل فائض الميزانية إلى حساب الادخار' : 'Smart Budget surplus transfer to Savings',
          type: 'transfer',
          amount: numAmount,
          from_account: fromAccountId,
          to_account: toAccount._id,
          date: new Date().toISOString(),
          notes: isAr ? 'تحويل فائض الميزانية الذكية' : 'Smart Budget surplus transfer'
        });
      }

      window.dispatchEvent(new CustomEvent('finova-data-updated', { detail: { action: 'SURPLUS_TRANSFERRED' } }));
      showToast(t('smartBudget.transferSuccess'), 'success');

      if (onSuccess) {
        onSuccess({
          amount: numAmount,
          targetType,
          addToBudgetPlan,
          selectedGoal: targetType === 'goals' ? activeGoals.find(g => g._id === selectedGoalId) : null
        });
      }

      onClose();
    } catch (err) {
      console.error('[SURPLUS_TRANSFER_ERROR]:', err);
      const msg = err.response?.data?.message || err.message || t('smartBudget.transferError');
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !isSubmitting && onClose()}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="surplus-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0 }}
        className="relative w-full max-w-lg max-h-[90dvh] bg-[#141115]/95 border border-white/10 rounded-[2.5rem] p-5 sm:p-7 shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.15)] backdrop-blur-[32px] overflow-hidden my-auto flex flex-col selection:bg-[#8D6346]/40 selection:text-white"
      >
        {/* Ambient Glow */}
        <div className={`absolute top-0 right-0 w-48 h-48 ${targetTheme.glow} rounded-full blur-[80px] pointer-events-none -mr-16 -mt-16`} />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#8D6346]/15 rounded-full blur-[80px] pointer-events-none -ml-16 -mb-16" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6 relative z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl ${targetTheme.iconBg} border flex items-center justify-center shadow-inner shrink-0`}>
              <TargetIcon size={22} />
            </div>
            <div className="min-w-0">
              <h3 id="surplus-modal-title" className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                {t('smartBudget.surplusModalTitle')}
              </h3>
              <p className={`text-xs ${targetTheme.subtitleColor} font-medium mt-0.5 truncate`}>
                {targetTitle}
              </p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
            aria-label={t('common.close')}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0 touch-manipulation"
          >
            <X size={18} />
          </motion.button>
        </div>

        {/* Content */}
        <div className="space-y-4 sm:space-y-5 relative z-10 flex-1 overflow-y-auto pr-1 -mr-1 overscroll-contain">
          {/* Goal Selector (Only for 'goals') */}
          {targetType === 'goals' && (
            <div>
              <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                {t('smartBudget.selectGoal')}
              </label>
              {activeGoals.length > 0 ? (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {activeGoals.map(goal => {
                    const isSelected = (selectedGoalId || activeGoals[0]?._id) === goal._id;
                    const GoalIcon = getIconComponent(goal.icon || 'Target');
                    return (
                      <button
                        key={goal._id}
                        type="button"
                        onClick={() => setSelectedGoalId(goal._id)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left rtl:text-right ${
                          isSelected 
                            ? 'bg-[#8D6346]/30 border-[#8D6346] shadow-[0_0_12px_rgba(141,99,70,0.3)]' 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-inner"
                            style={{ backgroundColor: `${goal.color || '#8D6346'}25`, color: goal.color || '#8D6346' }}
                          >
                            <GoalIcon size={18} />
                          </div>
                          <div>
                            <span className="text-sm font-bold text-white block">{goal.title}</span>
                            <span className="text-[11px] text-white/40 tabular-nums">
                              {Number(goal.currentAmount || 0).toLocaleString()} / {Number(goal.targetAmount || 0).toLocaleString()} {t('nav.currency')}
                            </span>
                          </div>
                        </div>
                        {isSelected && <Check size={18} className="text-[#E8C5A8]" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{t('smartBudget.noGoalsAvailable')}</span>
                </div>
              )}
            </div>
          )}

          {/* Destination "To Account" (Auto-detected & Locked) */}
          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>{t('smartBudget.toAccount')}</span>
              <Lock size={12} className="text-[#E8C5A8]" />
            </label>
            {toAccount ? (
              <div className={`flex items-center justify-between p-4 rounded-2xl bg-white/5 border ${targetTheme.accountBorder} shadow-inner`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${targetTheme.iconBg} border flex items-center justify-center shadow-inner`}>
                    {React.createElement(getIconComponent(toAccount.icon || 'Wallet'), { size: 20 })}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">{toAccount.name}</span>
                    <span className={`text-[11px] ${targetTheme.subtitleColor} uppercase tracking-wider font-semibold block mt-0.5`}>
                      {toAccount.balance !== undefined ? `${Number(toAccount.balance).toLocaleString()} ${t('nav.currency')}` : (toAccount.type || t('smartBudget.dedicatedAccount'))}
                    </span>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-[11px] font-semibold ${targetTheme.badgeBg} px-2.5 py-1 rounded-full border`}>
                  <Check size={12} />
                  <span>{t('smartBudget.autoDetected')}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>
                  {targetType === 'emergency'
                    ? t('smartBudget.noEmergencyAccount')
                    : targetType === 'savings'
                    ? t('smartBudget.noSavingsAccount')
                    : t('smartBudget.noGoalsAvailable')}
                </span>
              </div>
            )}
          </div>

          {/* Source "From Account" (User Choice) */}
          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
              {t('smartBudget.fromAccount')}
            </label>
            {availableSourceAccounts.length > 0 ? (
              <div className="relative">
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full bg-[#1c1c1e] text-white text-sm font-semibold rounded-2xl p-4 border border-white/10 outline-none focus:border-[#8D6346] transition-colors appearance-none cursor-pointer"
                >
                  {availableSourceAccounts.map(acc => (
                    <option key={acc._id} value={acc._id} className="bg-[#1c1c1e] text-white">
                      {acc.name} {acc.balance !== undefined ? `(${Number(acc.balance).toLocaleString()} ${t('nav.currency')})` : `(${acc.type})`}
                    </option>
                  ))}
                </select>
                <div className="absolute end-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                  <ArrowRight size={16} className={isAr ? 'rotate-180' : ''} />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{t('smartBudget.noSourceAccounts')}</span>
              </div>
            )}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
              {t('smartBudget.amountToTransfer')}
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="any"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  setAmount(val === '' ? '' : Math.max(0, Number(val)));
                }}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-white text-lg sm:text-xl font-black outline-none focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 transition-all tabular-nums tracking-tight caret-[#E8C5A8] shadow-inner placeholder:text-white/20"
              />
              <span className="absolute end-4 top-1/2 -translate-y-1/2 text-white/40 text-xs font-bold">
                {t('nav.currency')}
              </span>
            </div>
            {remainingAmount > 0 && (
              <p className="text-[11px] text-white/40 mt-1.5 tabular-nums">
                {t('smartBudget.remainingAmount')}: <strong className="text-white/80">{remainingAmount.toLocaleString()} {t('nav.currency')}</strong>
              </p>
            )}
          </div>

          {/* Also add to budget plan toggle */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white/5 border border-white/10 gap-3">
            <div>
              <span className="text-sm font-bold text-white block">
                {t('smartBudget.addToBudgetPlan')}
              </span>
              <span className="text-[11px] text-white/40 block mt-0.5">
                {t('smartBudget.addToBudgetPlanDesc')}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={addToBudgetPlan}
                onChange={(e) => setAddToBudgetPlan(e.target.checked)}
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8D6346]"></div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-white/5 flex items-center gap-3 relative z-10 shrink-0">
          <motion.button
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 min-h-[48px] py-3 rounded-2xl font-semibold text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors disabled:opacity-50 touch-manipulation cursor-pointer"
          >
            {t('common.cancel')}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={handleConfirmTransfer}
            disabled={isSubmitting || !toAccount || !fromAccountId || !amount || Number(amount) <= 0}
            className="flex-[2] min-h-[48px] py-3 rounded-2xl font-bold text-sm text-white bg-[#8D6346]/35 hover:bg-[#8D6346]/50 border border-[#8D6346]/60 shadow-[0_4px_20px_rgba(141,99,70,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none touch-manipulation cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Check size={18} />
            )}
            <span>{t('smartBudget.confirmAndTransfer')}</span>
          </motion.button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

export default React.memo(SurplusTransferModal);

