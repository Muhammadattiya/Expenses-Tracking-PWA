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

  // Keyboard Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="installment-modal-title"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-[#141115] border border-[#8D6346]/40 shadow-[0_16px_48px_rgba(0,0,0,0.6)] text-white overflow-hidden"
      >
        {/* Glow Sphere */}
        <div className="absolute top-0 end-0 w-48 h-48 bg-[#8D6346]/20 rounded-full blur-[80px] pointer-events-none" />

        {/* Header (Sticky) */}
        <div className="sticky top-0 bg-[#141115]/95 backdrop-blur-md z-20 flex items-center justify-between p-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#8D6346]/20 text-[#E8C5A8] border border-[#8D6346]/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 id="installment-modal-title" className="text-lg font-bold">
                {installmentToEdit ? t('installments.editInstallment') : t('installments.addInstallment')}
              </h2>
              <p className="text-xs text-white/50">
                {t('installments.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close')}
            className="w-11 h-11 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Fields Body */}
          <div className="overflow-y-auto px-6 py-4 space-y-4 max-h-[calc(90vh-170px)]">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label htmlFor="inst-title" className="block text-xs font-medium text-white/70 mb-1.5">
                {t('installments.titleLabel')} *
              </label>
              <input
                id="inst-title"
                type="text"
                name="title"
                required
                aria-required="true"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder={t('installments.titlePlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#8D6346] transition-colors"
              />
            </div>

            {/* Provider Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="inst-provider" className="block text-xs font-medium text-white/70 mb-1.5">
                  {t('installments.provider')}
                </label>
                <select
                  id="inst-provider"
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
                  <label htmlFor="inst-provider-name" className="block text-xs font-medium text-white/70 mb-1.5">
                    {t('installments.providerName')}
                  </label>
                  <input
                    id="inst-provider-name"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="inst-total-amount" className="block text-xs font-medium text-white/70 mb-1.5">
                  {t('installments.totalAmount')} *
                </label>
                <input
                  id="inst-total-amount"
                  type="number"
                  name="totalAmount"
                  min="1"
                  required
                  aria-required="true"
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
                <label htmlFor="inst-down-payment" className="block text-xs font-medium text-white/70 mb-1.5">
                  {t('installments.downPayment')}
                </label>
                <input
                  id="inst-down-payment"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="inst-total-months" className="block text-xs font-medium text-white/70 mb-1.5">
                  {t('installments.totalMonths')} *
                </label>
                <input
                  id="inst-total-months"
                  type="number"
                  name="totalMonths"
                  min="1"
                  max="120"
                  required
                  aria-required="true"
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
                <label htmlFor="inst-monthly-amount" className="block text-xs font-medium text-[#E8C5A8] mb-1.5">
                  {t('installments.monthlyAmount')} *
                </label>
                <input
                  id="inst-monthly-amount"
                  type="number"
                  name="monthlyAmount"
                  min="1"
                  required
                  aria-required="true"
                  value={formData.monthlyAmount}
                  onChange={(e) => setFormData({ ...formData, monthlyAmount: e.target.value })}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#8D6346]/10 border border-[#8D6346]/40 text-[#E8C5A8] font-bold text-sm tabular-nums focus:outline-none focus:border-[#8D6346]"
                />
              </div>
            </div>

            {/* Due Day & Linked Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="inst-due-day" className="block text-xs font-medium text-white/70 mb-1.5">
                  {t('installments.dueDay')} (1-31) *
                </label>
                <input
                  id="inst-due-day"
                  type="number"
                  name="dueDayOfMonth"
                  min="1"
                  max="31"
                  required
                  aria-required="true"
                  value={formData.dueDayOfMonth}
                  onChange={(e) => setFormData({ ...formData, dueDayOfMonth: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm tabular-nums focus:outline-none focus:border-[#8D6346]"
                />
              </div>

              <div>
                <label htmlFor="inst-linked-account" className="block text-xs font-medium text-white/70 mb-1.5">
                  {t('installments.linkedAccount')} *
                </label>
                <select
                  id="inst-linked-account"
                  name="linkedAccountId"
                  required
                  aria-required="true"
                  value={formData.linkedAccountId}
                  onChange={(e) => setFormData({ ...formData, linkedAccountId: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A161A] border border-white/10 text-white text-sm focus:outline-none focus:border-[#8D6346]"
                >
                  <option value="" disabled>{t('installments.selectAccountPlaceholder')}</option>
                  {accounts.map(acc => (
                    <option key={acc._id} value={acc._id} className="bg-[#1A161A] text-white">
                      {acc.name ? acc.name.charAt(0).toUpperCase() + acc.name.slice(1) : acc._id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Record Down Payment Checkbox (only for new installments) */}
            {!installmentToEdit && Number(formData.downPayment) > 0 && (
              <label htmlFor="inst-record-down-payment" className="flex items-center gap-2.5 p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer">
                <input
                  id="inst-record-down-payment"
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
            <label htmlFor="inst-auto-pay" className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#8D6346]/10 border border-[#8D6346]/25 cursor-pointer">
              <input
                id="inst-auto-pay"
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
              <label htmlFor="inst-notes" className="block text-xs font-medium text-white/70 mb-1.5">
                {t('installments.additionalNotes')}
              </label>
              <textarea
                id="inst-notes"
                rows="2"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('installments.notesPlaceholder')}
                className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#8D6346] resize-none"
              />
            </div>
          </div>

          {/* Sticky Actions Footer */}
          <div className="sticky bottom-0 bg-[#141115]/95 backdrop-blur-md z-20 flex items-center gap-3 p-6 pt-4 border-t border-white/10 mt-auto">
            {installmentToEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(installmentToEdit);
                  onClose();
                }}
                aria-label={t('installments.deleteInstallment')}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors shrink-0 active:scale-95"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] py-2.5 px-5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-sm active:scale-95 transition-all flex items-center justify-center"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[44px] py-2.5 px-5 rounded-full font-semibold text-sm text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed"
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
