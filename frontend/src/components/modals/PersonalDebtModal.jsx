import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';
import Button from '../ui/Button';

export default function PersonalDebtModal({ isOpen, onClose, onSave, accounts, initialData }) {
  const { t } = useLanguage();
  
  const defaultForm = { personName: '', type: 'i_owe', amount: '', account: accounts[0]?._id || '' };
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          personName: initialData.personName || '',
          type: initialData.type || 'i_owe',
          amount: initialData.initialAmount || '',
          account: accounts[0]?._id || ''
        });
      } else {
        setForm(defaultForm);
      }
      setError('');
    }
  }, [isOpen, accounts, initialData]);

  // Escape key listener for accessible modal dismissal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedName = form.personName.trim();
    if (!trimmedName) {
      setError(t('debts.validationPersonName'));
      return;
    }

    const parsedAmount = Number(form.amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError(t('debts.validationAmount'));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        personName: trimmedName,
        type: form.type,
        amount: parsedAmount,
        account: form.account
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('debts.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="personal-debt-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={() => { if (!isSubmitting) onClose(); }} 
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#1C1819]/95 backdrop-blur-3xl border border-white/15 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Subtle Top Inner Edge Highlight */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Sticky Header */}
        <div className="sticky top-0 z-20 p-6 border-b border-white/10 flex items-center justify-between bg-[#1C1819]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#8D6346]/20 rounded-xl text-[#8D6346] shadow-inner">
              <User className="w-5 h-5" />
            </div>
            <h2 id="personal-debt-modal-title" className="text-xl font-bold text-white tracking-wide">
              {initialData ? t('debts.editDebt') : t('debts.addDebt')}
            </h2>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            disabled={isSubmitting}
            aria-label={t('common.close') || 'Close'}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto flex-1 hide-scrollbar">
          {error && (
            <div role="alert" className="mb-6 rounded-2xl bg-brand-red/10 p-4 border border-brand-red/20 text-sm text-brand-red font-medium flex items-center gap-2">
              <X className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form noValidate id="personal-debt-form" onSubmit={submit} className="space-y-6">
            
            <div>
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5" role="radiogroup" aria-label={t('debts.debtType')}>
                <button 
                  type="button" 
                  role="radio"
                  aria-checked={form.type === 'i_owe'}
                  onClick={() => setForm({ ...form, type: 'i_owe' })} 
                  className={`flex-1 min-h-[44px] py-3 text-sm font-bold rounded-xl transition-all ${form.type === 'i_owe' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-white/50 hover:text-white'}`}
                >
                  {t('debts.iOwe')}
                </button>
                <button 
                  type="button" 
                  role="radio"
                  aria-checked={form.type === 'owed_to_me'}
                  onClick={() => setForm({ ...form, type: 'owed_to_me' })} 
                  className={`flex-1 min-h-[44px] py-3 text-sm font-bold rounded-xl transition-all ${form.type === 'owed_to_me' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-white/50 hover:text-white'}`}
                >
                  {t('debts.owedToMe')}
                </button>
              </div>
              <p className="text-xs text-white/50 px-2 pt-2 transition-all">
                {form.type === 'i_owe' ? t('debts.iOweDescription') : t('debts.owedToMeDescription')}
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <label htmlFor="pd-person-name" className="text-sm font-medium text-white/70 px-1">
                {t('debts.personName')}
              </label>
              <input 
                id="pd-person-name"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 focus:shadow-[0_0_12px_rgba(141,99,70,0.25)] transition-all disabled:opacity-50" 
                required 
                disabled={isSubmitting}
                maxLength={80}
                placeholder={t('debts.personName')} 
                value={form.personName} 
                onChange={(e) => setForm({ ...form, personName: e.target.value })} 
              />
            </div>
            
            <div className="space-y-3 pt-3 border-t border-white/10">
              <label htmlFor="pd-amount" className="text-sm font-medium text-white/90 px-1">
                {t('debts.amount')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  id="pd-amount"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 focus:shadow-[0_0_12px_rgba(141,99,70,0.25)] transition-all disabled:opacity-50" 
                  required 
                  type="number" 
                  min="0.01" 
                  step="any"
                  disabled={!!initialData || isSubmitting}
                  placeholder={t('debts.amount')} 
                  value={form.amount} 
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                />
                <CustomSelect 
                  value={form.account} 
                  onChange={(v) => setForm({ ...form, account: v })} 
                  options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                  placeholder={t('debts.account')} 
                  disabled={!!initialData || isSubmitting}
                />
              </div>
              {initialData && (
                <p className="text-xs text-white/45 px-1 leading-relaxed">
                  {t('debts.amountLockedHint')}
                </p>
              )}
            </div>

          </form>
        </div>

        {/* Sticky Actions Footer */}
        <div className="sticky bottom-0 z-20 p-6 border-t border-white/10 bg-[#1C1819]/90 backdrop-blur-md">
          <Button
            type="submit"
            form="personal-debt-form"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            icon={<Plus className="w-5 h-5" />}
          >
            {initialData ? t('debts.saveChanges') : t('debts.saveDebt')}
          </Button>
        </div>

      </div>
    </div>,
    document.body
  );
}
