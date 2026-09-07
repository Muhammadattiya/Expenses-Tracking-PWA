import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';

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
          personName: initialData.personName,
          type: initialData.type,
          amount: initialData.initialAmount || '',
          account: accounts[0]?._id || ''
        });
      } else {
        setForm(defaultForm);
      }
      setError('');
    }
  }, [isOpen, accounts, initialData]);

  if (!isOpen) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onSave({
        personName: form.personName,
        type: form.type,
        amount: Number(form.amount),
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#1C1819]/80 backdrop-blur-3xl border border-white/15 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Subtle Top Inner Edge Highlight */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-transparent z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#8D6346]/20 rounded-xl text-[#8D6346] shadow-inner">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {initialData ? t('debts.editDebt') : t('debts.addDebt')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-[var(--color-text-muted)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 rounded-2xl bg-brand-red/10 p-4 border border-brand-red/20 text-sm text-brand-red font-medium flex items-center gap-2">
              <X className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form id="personal-debt-form" onSubmit={submit} className="space-y-6">
            
            <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
              <button 
                type="button" 
                onClick={() => setForm({ ...form, type: 'i_owe' })} 
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${form.type === 'i_owe' ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                {t('debts.iOwe')}
              </button>
              <button 
                type="button" 
                onClick={() => setForm({ ...form, type: 'owed_to_me' })} 
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${form.type === 'owed_to_me' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                {t('debts.owedToMe')}
              </button>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-sm font-medium text-white/70 px-1">{t('debts.personName')}</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 transition-all" 
                required 
                placeholder={t('debts.personName')} 
                value={form.personName} 
                onChange={(e) => setForm({ ...form, personName: e.target.value })} 
              />
            </div>
            
            <div className="space-y-4 pt-4 border-t border-white/10">
              <label className="text-sm font-medium text-white/90 px-1">{t('debts.amount')}</label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 transition-all disabled:opacity-50" 
                  required 
                  type="number" 
                  min="1" 
                  disabled={!!initialData}
                  placeholder={t('debts.amount')} 
                  value={form.amount} 
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                />
                <CustomSelect 
                  value={form.account} 
                  onChange={(v) => setForm({ ...form, account: v })} 
                  options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                  placeholder={t('debts.account')} 
                  disabled={!!initialData}
                />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-transparent">
          <button 
            type="submit"
            form="personal-debt-form"
            disabled={isSubmitting}
            className="w-full py-4 rounded-full font-bold text-[14px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <Plus className="w-5 h-5" />
            )}
            <span>{initialData ? t('debts.saveChanges') : t('debts.saveDebt')}</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
