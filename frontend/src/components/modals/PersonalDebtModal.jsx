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
      setError(err.response?.data?.message || err.message || t('debts.saveError', 'Could not save debt.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#111]/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-blue/20 rounded-xl text-brand-blue">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {initialData ? t('debts.editDebt', 'Edit Debt') : t('debts.addDebt', 'Add Debt')}
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
                {t('debts.iOwe', 'I Owe')}
              </button>
              <button 
                type="button" 
                onClick={() => setForm({ ...form, type: 'owed_to_me' })} 
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${form.type === 'owed_to_me' ? 'bg-brand-green text-white shadow-lg shadow-brand-green/20' : 'text-[var(--color-text-muted)] hover:text-white'}`}
              >
                {t('debts.owedToMe', 'Owed To Me')}
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-text-muted)] px-1">{t('debts.personName', 'Person Name')}</label>
              <input 
                className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 transition-all" 
                required 
                placeholder={t('debts.personName', 'Person Name')} 
                value={form.personName} 
                onChange={(e) => setForm({ ...form, personName: e.target.value })} 
              />
            </div>
            
            <div className="space-y-4 pt-2 border-t border-white/5">
              <label className="text-sm font-medium text-[var(--color-text-main)] px-1">{t('debts.amount', 'Amount')}</label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 transition-all disabled:opacity-50" 
                  required 
                  type="number" 
                  min="1" 
                  disabled={!!initialData}
                  placeholder={t('debts.amount', 'Amount')} 
                  value={form.amount} 
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                />
                <CustomSelect 
                  value={form.account} 
                  onChange={(v) => setForm({ ...form, account: v })} 
                  options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                  placeholder={t('debts.account', 'Account')} 
                  disabled={!!initialData}
                />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-[#111]/80 backdrop-blur-xl">
          <button 
            type="submit"
            form="personal-debt-form"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-brand-blue py-4 font-bold text-[var(--color-text-main)] hover:bg-brand-blue/90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {initialData ? t('debts.saveChanges', 'Save Changes') : t('debts.saveDebt', 'Save Debt')}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
