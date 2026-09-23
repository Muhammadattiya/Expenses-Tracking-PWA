import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Target, Car, Heart, Palmtree, Home, Compass, 
  GraduationCap, Smartphone, Loader2, Calendar, 
  DollarSign, Check, Layers, AlertCircle, Lock
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatAccountName } from '../../utils/transactionFormatters';

const CATEGORIES = [
  { id: 'car', icon: Car },
  { id: 'marriage', icon: Heart },
  { id: 'vacation', icon: Palmtree },
  { id: 'real_estate', icon: Home },
  { id: 'hajj_umrah', icon: Compass },
  { id: 'education', icon: GraduationCap },
  { id: 'electronics', icon: Smartphone },
  { id: 'other', icon: Target }
];

const PRESET_COLORS = [
  '#8D6346', '#34C759', '#007AFF', '#AF52DE', 
  '#FF9500', '#FF2D55', '#5856D6', '#E8C5A8'
];

export default function GoalModal({
  open,
  onClose,
  onSave,
  accounts = [],
  accountBalances = new Map(),
  initialGoal = null,
  isSaving = false
}) {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';

  const money = (val) =>
    new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  const getAccBalance = (accId) => {
    if (!accId) return 0;
    const strId = accId.toString();
    const raw = accountBalances.has(strId) 
      ? accountBalances.get(strId) 
      : (accounts.find(a => a._id?.toString() === strId)?.balance_adjustment || 0);
    return Number(raw) || 0;
  };

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('other');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [allocationType, setAllocationType] = useState('dedicated');
  const [priority, setPriority] = useState('medium');
  const [color, setColor] = useState('#8D6346');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialGoal) {
      setTitle(initialGoal.title || '');
      setCategory(initialGoal.category || 'other');
      setTargetAmount(initialGoal.targetAmount ? String(initialGoal.targetAmount) : '');
      const accId = initialGoal.linkedAccountId?._id || initialGoal.linkedAccountId || '';
      setLinkedAccountId(accId);
      const alloc = initialGoal.allocationType || 'dedicated';
      setAllocationType(alloc);

      if (alloc === 'dedicated' && accId) {
        setCurrentAmount(String(Math.max(0, getAccBalance(accId))));
      } else {
        setCurrentAmount(initialGoal.currentAmount !== undefined ? String(initialGoal.currentAmount) : '');
      }

      setTargetDate(initialGoal.targetDate ? initialGoal.targetDate.substring(0, 10) : '');
      setPriority(initialGoal.priority || 'medium');
      setColor(initialGoal.color || '#8D6346');
      setNotes(initialGoal.notes || '');
    } else {
      setTitle('');
      setCategory('other');
      setTargetAmount('');
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + 6);
      setTargetDate(defaultDate.toISOString().substring(0, 10));
      
      const savingsAcc = accounts.find(a => a.isSavingsAccount && !a.isArchived);
      const accId = savingsAcc?._id || accounts[0]?._id || '';
      setLinkedAccountId(accId);
      const alloc = savingsAcc ? 'dedicated' : 'virtual_jar';
      setAllocationType(alloc);

      if (alloc === 'dedicated' && accId) {
        setCurrentAmount(String(Math.max(0, getAccBalance(accId))));
      } else {
        setCurrentAmount('0');
      }

      setPriority('medium');
      setColor('#8D6346');
      setNotes('');
    }
    setError('');
  }, [initialGoal, open, accounts, accountBalances]);

  if (!open) return null;

  const handleSelectDedicated = () => {
    setAllocationType('dedicated');
    let targetAccId = linkedAccountId;
    if (!targetAccId) {
      const savingsAcc = accounts.find(a => a.isSavingsAccount && !a.isArchived);
      targetAccId = savingsAcc?._id || accounts[0]?._id || '';
      setLinkedAccountId(targetAccId);
    }
    if (targetAccId) {
      setCurrentAmount(String(Math.max(0, getAccBalance(targetAccId))));
    }
  };

  const handleSelectVirtualJar = () => {
    setAllocationType('virtual_jar');
  };

  const handleAccountChange = (newAccId) => {
    setLinkedAccountId(newAccId);
    if (allocationType === 'dedicated' && newAccId) {
      setCurrentAmount(String(Math.max(0, getAccBalance(newAccId))));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t('savingsGoals.titleRequired'));
      return;
    }
    const numTarget = Number(targetAmount);
    if (!numTarget || numTarget <= 0) {
      setError(t('savingsGoals.targetAmountRequired'));
      return;
    }
    if (!targetDate) {
      setError(t('savingsGoals.dateRequired'));
      return;
    }
    if (!linkedAccountId) {
      setError(t('savingsGoals.accountRequired'));
      return;
    }

    const finalCurrentAmount = allocationType === 'dedicated'
      ? Math.max(0, getAccBalance(linkedAccountId))
      : Math.max(0, Number(currentAmount) || 0);

    onSave({
      title: title.trim(),
      category,
      targetAmount: numTarget,
      currentAmount: finalCurrentAmount,
      targetDate: new Date(targetDate).toISOString(),
      linkedAccountId,
      allocationType,
      priority,
      color,
      notes: notes.trim()
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-[#1A1617]/95 border border-white/15 rounded-[2.5rem] shadow-[0_24px_64px_rgba(0,0,0,0.6)] backdrop-blur-[32px] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-2xl flex items-center justify-center border shadow-inner"
              style={{ backgroundColor: `${color}25`, borderColor: `${color}40`, color }}
            >
              <Target size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {initialGoal ? t('savingsGoals.editGoal') : t('savingsGoals.addGoal')}
              </h3>
              <p className="text-xs text-white/50">
                {t('savingsGoals.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            aria-label={t('common.close')}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-300 text-xs font-medium">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Goal Title */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              {t('savingsGoals.titleLabel')} *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('savingsGoals.titlePlaceholder')}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-[#8D6346] placeholder-white/30"
              required
            />
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-2">
              {t('savingsGoals.category')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`py-2 px-1 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                      isSelected
                        ? 'bg-[#8D6346]/30 border-[#8D6346] text-white shadow-inner'
                        : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <CatIcon size={18} />
                    <span className="text-[10px] truncate max-w-full">
                      {t(`savingsGoals.categories.${cat.id}`) || cat.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Amount & Initial Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                {t('savingsGoals.targetAmount')} *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="50000"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm font-bold tabular-nums focus:outline-none focus:border-[#8D6346]"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5 min-h-[18px]">
                <label className="block text-xs font-semibold text-white/70">
                  {t('savingsGoals.currentAmount')}
                </label>
                {allocationType === 'dedicated' && (
                  <span className="text-[10px] text-[#E8C5A8] font-bold flex items-center gap-1 bg-[#8D6346]/20 px-2 py-0.5 rounded-full border border-[#8D6346]/40">
                    <Lock size={10} />
                    {t('planning.plans.syncedWithAccount') || (lang === 'ar' ? 'مربوط برصيد الحساب' : 'Synced')}
                  </span>
                )}
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                readOnly={allocationType === 'dedicated'}
                placeholder="0"
                className={`w-full px-4 py-3 border rounded-2xl text-sm font-bold tabular-nums focus:outline-none ${
                  allocationType === 'dedicated'
                    ? 'bg-white/[0.03] border-[#8D6346]/40 text-[#E8C5A8] cursor-not-allowed shadow-inner'
                    : 'bg-white/5 border-white/10 text-white focus:border-[#8D6346]'
                }`}
              />
            </div>
          </div>

          {/* Target Date & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                {t('savingsGoals.targetDate')} *
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-[#8D6346]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                {t('savingsGoals.priority')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 bg-[#2B2321] border border-white/10 rounded-2xl text-white text-sm focus:outline-none focus:border-[#8D6346]"
              >
                <option value="high">{t('savingsGoals.priorityHigh')}</option>
                <option value="medium">{t('savingsGoals.priorityMedium')}</option>
                <option value="low">{t('savingsGoals.priorityLow')}</option>
              </select>
            </div>
          </div>

          {/* Connect to Savings Account Question */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div>
              <label className="block text-xs font-bold text-white mb-0.5">
                {t('planning.plans.connectToSavings') || (lang === 'ar' ? 'هل ترغب في ربط هذا الهدف بحساب ادخار؟' : 'Connect this goal to a savings account?')}
              </label>
              <p className="text-[11px] text-white/50">
                {t('planning.plans.connectToSavingsDesc') || (lang === 'ar' ? 'اربط الهدف بحساب ادخار مخصص أو احتفظ به كوعاء ادخار افتراضي' : 'Link to a savings account or track as a virtual goal jar')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleSelectDedicated}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                  allocationType === 'dedicated'
                    ? 'bg-[#8D6346]/30 border-[#8D6346] text-[#E8C5A8] shadow-sm'
                    : 'bg-white/5 border-white/5 text-white/50 hover:text-white'
                }`}
              >
                {t('planning.plans.connectYes') || (lang === 'ar' ? 'نعم، بحساب ادخار' : 'Yes, Savings Account')}
              </button>

              <button
                type="button"
                onClick={handleSelectVirtualJar}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                  allocationType === 'virtual_jar'
                    ? 'bg-[#8D6346]/30 border-[#8D6346] text-[#E8C5A8] shadow-sm'
                    : 'bg-white/5 border-white/5 text-white/50 hover:text-white'
                }`}
              >
                {t('planning.plans.connectNo') || (lang === 'ar' ? 'وعاء افتراضي' : 'Virtual Jar')}
              </button>
            </div>

            {/* Linked Account Selector */}
            <div>
              <label className="block text-[11px] font-semibold text-white/60 mb-1">
                {allocationType === 'dedicated' 
                  ? (t('planning.savings.designatedAccount') || (lang === 'ar' ? 'حساب الادخار المرتبط' : 'Linked Savings Account')) 
                  : (t('savingsGoals.linkedAccount') || (lang === 'ar' ? 'الحساب التابع له' : 'Parent Account'))} *
              </label>
              <select
                value={linkedAccountId}
                onChange={(e) => handleAccountChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#2B2321] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#8D6346]"
                required
              >
                <option value="">{t('savingsGoals.selectAccount') || 'Select account...'}</option>
                {accounts.filter(a => !a.isArchived).map((acc) => {
                  const bal = getAccBalance(acc._id);
                  return (
                    <option key={acc._id} value={acc._id}>
                      {formatAccountName(acc.name, lang)} ({money(bal)}) {acc.isSavingsAccount ? `• ${t('planning.savings.designatedAccount') || (lang === 'ar' ? 'حساب ادخار' : 'Savings')}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-2">
              {t('savingsGoals.color')}
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                  style={{ 
                    backgroundColor: c, 
                    borderColor: color === c ? '#FFFFFF' : 'transparent' 
                  }}
                >
                  {color === c && <Check size={14} className="text-white drop-shadow-md" />}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5">
              {t('savingsGoals.notes')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('savingsGoals.notesPlaceholder')}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:border-[#8D6346] placeholder-white/30"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSaving}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#8D6346] via-[#B88764] to-[#8D6346] hover:opacity-95 text-white font-bold text-sm shadow-[0_8px_24px_rgba(141,99,70,0.4)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{t('common.saving')}</span>
                </>
              ) : (
                <span>{initialGoal ? t('common.saveChanges') : t('savingsGoals.saveGoal')}</span>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
