import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Calendar, CreditCard, DollarSign, FileText, Zap, ShieldCheck, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const PROVIDER_OPTIONS = [
  { value: 'valu', key: 'valu' },
  { value: 'souhoola', key: 'souhoola' },
  { value: 'sympl', key: 'sympl' },
  { value: 'tabby', key: 'tabby' },
  { value: 'tamara', key: 'tamara' },
  { value: 'bank_cib', key: 'bank_cib' },
  { value: 'bank_nbe', key: 'bank_nbe' },
  { value: 'bank_misr', key: 'bank_misr' },
  { value: 'gameya', key: 'gameya' },
  { value: 'other', key: 'other' }
];

export default function InstallmentModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  installmentToEdit = null,
  accounts = []
}) {
  const { t, lang } = useLanguage();

  const [formData, setFormData] = useState({
    title: '',
    provider: 'valu',
    providerName: '',
    totalAmount: '',
    downPayment: '',
    monthlyAmount: '',
    totalMonths: 12,
    dueDayOfMonth: 1,
    linkedAccountId: '',
    autoPay: false,
    recordDownPaymentTransaction: true,
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill form when editing or resetting
  useEffect(() => {
    if (installmentToEdit) {
      setFormData({
        title: installmentToEdit.title || '',
        provider: installmentToEdit.provider || 'other',
        providerName: installmentToEdit.providerName || '',
        totalAmount: installmentToEdit.totalAmount || '',
        downPayment: installmentToEdit.downPayment || 0,
        monthlyAmount: installmentToEdit.monthlyAmount || '',
        totalMonths: installmentToEdit.totalMonths || 12,
        dueDayOfMonth: installmentToEdit.dueDayOfMonth || 1,
        linkedAccountId: installmentToEdit.linkedAccountId?._id || installmentToEdit.linkedAccountId || '',
        autoPay: Boolean(installmentToEdit.autoPay),
        recordDownPaymentTransaction: false,
        notes: installmentToEdit.notes || ''
      });
    } else {
      setFormData({
        title: '',
        provider: 'valu',
        providerName: '',
        totalAmount: '',
        downPayment: '',
        monthlyAmount: '',
        totalMonths: 12,
        dueDayOfMonth: new Date().getDate(),
        linkedAccountId: accounts[0]?._id || '',
        autoPay: false,
        recordDownPaymentTransaction: true,
        notes: ''
      });
    }
    setError('');
  }, [installmentToEdit, isOpen, accounts]);

  // Automatically calculate suggested monthlyAmount if user changes totalAmount, downPayment, or totalMonths
  const handleAutoCalcMonthly = (total, down, months) => {
    const totalNum = Number(total) || 0;
    const downNum = Number(down) || 0;
    const monthsNum = Number(months) || 1;
    if (totalNum > downNum && monthsNum > 0) {
      const calculated = Math.ceil((totalNum - downNum) / monthsNum);
      setFormData(prev => ({ ...prev, monthlyAmount: calculated }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError(t('installments.titleLabel'));
      return;
    }
    if (!formData.totalAmount || Number(formData.totalAmount) <= 0) {
      setError(t('installments.totalAmount'));
      return;
    }
    if (!formData.monthlyAmount || Number(formData.monthlyAmount) <= 0) {
      setError(t('installments.monthlyAmount'));
      return;
    }
    if (!formData.linkedAccountId) {
      setError(t('installments.linkedAccount'));
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSave({
        ...formData,
        totalAmount: Number(formData.totalAmount),
        downPayment: Number(formData.downPayment) || 0,
        monthlyAmount: Number(formData.monthlyAmount),
        totalMonths: Number(formData.totalMonths),
        dueDayOfMonth: Number(formData.dueDayOfMonth)
      });
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#141115] border border-[#8D6346]/40 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6)] text-white"
      >
        {/* Glow Sphere */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#8D6346]/20 rounded-full blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#8D6346]/20 text-[#E8C5A8] border border-[#8D6346]/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {installmentToEdit ? t('installments.editInstallment') : t('installments.addInstallment')}
              </h2>
              <p className="text-xs text-white/50">
                {t('installments.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              {t('installments.titleLabel')} *
            </label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('installments.titlePlaceholder')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#8D6346] transition-colors"
            />
          </div>

          {/* Provider Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                {t('installments.provider')}
              </label>
              <select
                name="provider"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A161A] border border-white/10 text-white text-sm focus:outline-none focus:border-[#8D6346] transition-colors"
              >
                {PROVIDER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-[#1A161A] text-white">
                    {t(`installments.providers.${opt.key}`, opt.value)}
                  </option>
                ))}
              </select>
            </div>

            {formData.provider === 'other' && (
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  {t('installments.providerName')}
                </label>
                <input
                  type="text"
                  name="providerName"
                  value={formData.providerName}
                  onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                  placeholder={t('installments.providerPlaceholder')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#8D6346]"
                />
              </div>
            )}
          </div>

          {/* Amounts: Total & Down Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                {t('installments.totalAmount')} *
              </label>
              <input
                type="number"
                name="totalAmount"
                min="1"
                required
                value={formData.totalAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, totalAmount: val });
                  handleAutoCalcMonthly(val, formData.downPayment, formData.totalMonths);
                }}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm tabular-nums focus:outline-none focus:border-[#8D6346]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                {t('installments.downPayment')}
              </label>
              <input
                type="number"
                name="downPayment"
                min="0"
                value={formData.downPayment}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, downPayment: val });
                  handleAutoCalcMonthly(formData.totalAmount, val, formData.totalMonths);
                }}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm tabular-nums focus:outline-none focus:border-[#8D6346]"
              />
            </div>
          </div>

          {/* Duration & Calculated Monthly Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                {t('installments.totalMonths')} *
              </label>
              <input
                type="number"
                name="totalMonths"
                min="1"
                max="120"
                required
                value={formData.totalMonths}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, totalMonths: val });
                  handleAutoCalcMonthly(formData.totalAmount, formData.downPayment, val);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm tabular-nums focus:outline-none focus:border-[#8D6346]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#E8C5A8] mb-1.5">
                {t('installments.monthlyAmount')} *
              </label>
              <input
                type="number"
                name="monthlyAmount"
                min="1"
                required
                value={formData.monthlyAmount}
                onChange={(e) => setFormData({ ...formData, monthlyAmount: e.target.value })}
                placeholder="0"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#8D6346]/10 border border-[#8D6346]/40 text-[#E8C5A8] font-bold text-sm tabular-nums focus:outline-none focus:border-[#8D6346]"
              />
            </div>
          </div>

          {/* Due Day & Linked Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                {t('installments.dueDay')} (1-31) *
              </label>
              <input
                type="number"
                name="dueDayOfMonth"
                min="1"
                max="31"
                required
                value={formData.dueDayOfMonth}
                onChange={(e) => setFormData({ ...formData, dueDayOfMonth: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm tabular-nums focus:outline-none focus:border-[#8D6346]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                {t('installments.linkedAccount')} *
              </label>
              <select
                id="select-linked-account"
                name="linkedAccountId"
                required
                value={formData.linkedAccountId}
                onChange={(e) => setFormData({ ...formData, linkedAccountId: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A161A] border border-white/10 text-white text-sm focus:outline-none focus:border-[#8D6346]"
              >
                <option value="" disabled>{t('installments.selectAccountPlaceholder')}</option>
                {accounts.map(acc => (
                  <option key={acc._id} value={acc._id} className="bg-[#1A161A] text-white">
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Record Down Payment Checkbox (only for new installments) */}
          {!installmentToEdit && Number(formData.downPayment) > 0 && (
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.recordDownPaymentTransaction}
                onChange={(e) => setFormData({ ...formData, recordDownPaymentTransaction: e.target.checked })}
                className="w-4 h-4 rounded text-[#8D6346] bg-black/40 border-white/20 focus:ring-0"
              />
              <span className="text-xs text-white/80">
                {t('installments.recordDownPayment')}
              </span>
            </label>
          )}

          {/* Auto-Pay Toggle */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[#8D6346]/10 border border-[#8D6346]/25 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.autoPay}
              onChange={(e) => setFormData({ ...formData, autoPay: e.target.checked })}
              className="mt-0.5 w-4 h-4 rounded text-[#8D6346] bg-black/40 border-[#8D6346]/40 focus:ring-0"
            />
            <div>
              <span className="text-xs font-semibold text-[#E8C5A8] block">
                {t('installments.autoPay')}
              </span>
              <span className="text-[11px] text-white/50">
                {t('installments.autoPayDesc')}
              </span>
            </div>
          </label>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              {t('installments.additionalNotes')}
            </label>
            <textarea
              rows="2"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder={t('installments.notesPlaceholder')}
              className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#8D6346] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-3 border-t border-white/10">
            {installmentToEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(installmentToEdit);
                  onClose();
                }}
                aria-label={t('installments.deleteInstallment')}
                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#8D6346] hover:bg-[#77533A] text-white text-sm font-semibold shadow-[0_4px_16px_rgba(141,99,70,0.3)] transition-all disabled:opacity-50"
            >
              {isSubmitting ? t('common.loading') : installmentToEdit ? t('installments.saveChanges') : t('installments.createInstallmentBtn')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>,
    document.body
  );
}
