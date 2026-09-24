import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Users, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';

export default function GroupExpenseModal({ isOpen, onClose, onSave, initialData, accounts, categories }) {
  const { t, lang } = useLanguage();
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(value || 0);
  
  const defaultForm = { 
    _id: null, 
    title: '', 
    paidAmount: '', 
    paidFrom: accounts[0]?._id || '', 
    receivedAmount: '', 
    receivedTo: '', 
    expenseCategory: categories[0]?._id || '', 
    participants: [{ name: '', owedAmount: '' }] 
  };

  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          _id: initialData._id,
          title: initialData.title || '',
          paidAmount: initialData.paidAmount ?? '',
          paidFrom: initialData.paidFrom?._id || initialData.paidFrom || accounts[0]?._id || '',
          receivedAmount: initialData.receivedAmount || '',
          receivedTo: initialData.receivedTo?._id || initialData.receivedTo || '',
          expenseCategory: initialData.expenseCategory?._id || initialData.expenseCategory || categories[0]?._id || '',
          participants: initialData.participants?.length 
            ? initialData.participants.map(p => ({ _id: p._id, name: p.name, owedAmount: p.owedAmount })) 
            : [{ name: '', owedAmount: '' }]
        });
      } else {
        setForm({
          ...defaultForm,
          paidFrom: accounts[0]?._id || '',
          expenseCategory: categories[0]?._id || ''
        });
      }
      setError('');
    }
  }, [isOpen, initialData, accounts, categories]);

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

  const addParticipant = () => setForm({ ...form, participants: [...form.participants, { name: '', owedAmount: '' }] });
  const removeParticipant = (index) => setForm({ ...form, participants: form.participants.filter((_, i) => i !== index) });

  const netExpense = Math.max(0, (Number(form.paidAmount) || 0) - (Number(form.receivedAmount) || 0) - form.participants.reduce((sum, p) => sum + (Number(p.owedAmount) || 0), 0));

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      setError(t('receivables.validationTitleRequired'));
      return;
    }

    const paidAmount = Number(form.paidAmount);
    if (!paidAmount || isNaN(paidAmount) || paidAmount <= 0) {
      setError(t('receivables.validationPaidAmount'));
      return;
    }

    const receivedAmount = Number(form.receivedAmount) || 0;
    if (receivedAmount < 0 || receivedAmount > paidAmount) {
      setError(t('receivables.validationPaymentExceeds'));
      return;
    }

    if (receivedAmount > 0 && !form.receivedTo) {
      setError(t('receivables.errorReceivingAccountRequired'));
      return;
    }

    let sumOwed = 0;
    const validatedParticipants = [];
    for (let i = 0; i < form.participants.length; i++) {
      const p = form.participants[i];
      const pName = (p.name || '').trim();
      const pOwed = Number(p.owedAmount);
      if (!pName || isNaN(pOwed) || pOwed <= 0) {
        setError(t('receivables.errorParticipantRequired'));
        return;
      }
      sumOwed += pOwed;
      validatedParticipants.push({
        ...(p._id ? { _id: p._id } : {}),
        name: pName,
        owedAmount: pOwed
      });
    }

    if (receivedAmount + sumOwed > paidAmount) {
      setError(t('receivables.errorAmountsExceed'));
      return;
    }

    setIsSubmitting(true);
    try {
      const data = {
        ...form,
        title: trimmedTitle,
        paidAmount,
        receivedAmount,
        participants: validatedParticipants
      };
      
      await onSave(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('receivables.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="group-expense-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={() => { if (!isSubmitting) onClose(); }} 
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-[#1C1819]/95 backdrop-blur-3xl border border-white/15 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Subtle Top Inner Edge Highlight */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

        {/* Sticky Header */}
        <div className="sticky top-0 z-20 p-6 border-b border-white/10 flex items-center justify-between bg-[#1C1819]/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#8D6346]/20 rounded-xl text-[#8D6346] shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <h2 id="group-expense-modal-title" className="text-xl font-bold text-white tracking-wide">
              {form._id ? t('receivables.editTitle') : t('receivables.addTitle')}
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

          <form noValidate id="group-expense-form" onSubmit={submit} className="space-y-6">
            
            <div className="space-y-1.5 pt-2">
              <label htmlFor="ge-title" className="text-sm font-medium text-white/70 px-1">
                {t('receivables.outingName')}
              </label>
              <input 
                id="ge-title"
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 focus:shadow-[0_0_12px_rgba(141,99,70,0.25)] transition-all disabled:opacity-50" 
                required 
                disabled={isSubmitting}
                maxLength={120}
                placeholder={t('receivables.outingName')} 
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })} 
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <label htmlFor="ge-paid-amount" className="text-sm font-medium text-white/90 px-1">
                {t('receivables.totalPaid')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  id="ge-paid-amount"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 focus:shadow-[0_0_12px_rgba(141,99,70,0.25)] transition-all disabled:opacity-50" 
                  required 
                  type="number" 
                  min="0.01" 
                  step="any"
                  disabled={isSubmitting}
                  placeholder={t('receivables.paidAmount')} 
                  value={form.paidAmount} 
                  onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} 
                />
                <CustomSelect 
                  value={form.paidFrom} 
                  onChange={(v) => setForm({ ...form, paidFrom: v })} 
                  options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                  placeholder={t('receivables.selectAccount')} 
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <label htmlFor="ge-received-amount" className="text-sm font-medium text-white/90 px-1">
                {t('receivables.receivedImmediately')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  id="ge-received-amount"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 focus:shadow-[0_0_12px_rgba(141,99,70,0.25)] transition-all disabled:opacity-50" 
                  type="number" 
                  min="0" 
                  step="any" 
                  max={form.paidAmount || undefined} 
                  disabled={isSubmitting}
                  placeholder={t('receivables.amountReceived')} 
                  value={form.receivedAmount} 
                  onChange={(e) => setForm({ ...form, receivedAmount: e.target.value })} 
                />
                <CustomSelect 
                  value={form.receivedTo} 
                  onChange={(v) => setForm({ ...form, receivedTo: v })} 
                  options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                  placeholder={t('receivables.receivingAccount')} 
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="block text-sm font-medium text-white/90 px-1">
                {t('receivables.friendsOwes')}
              </span>
              {form.participants.map((participant, index) => (
                <div className="flex gap-2 items-center" key={index}>
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <input 
                      type="text"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 focus:shadow-[0_0_12px_rgba(141,99,70,0.25)] transition-all disabled:opacity-50" 
                      required 
                      disabled={isSubmitting}
                      maxLength={60}
                      aria-label={`${t('receivables.personName')} ${index + 1}`}
                      placeholder={t('receivables.personName')} 
                      value={participant.name} 
                      onChange={(e) => setForm({ ...form, participants: form.participants.map((p, i) => i === index ? { ...p, name: e.target.value } : p) })} 
                    />
                    <input 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 focus:shadow-[0_0_12px_rgba(141,99,70,0.25)] transition-all disabled:opacity-50" 
                      required 
                      type="number" 
                      min="0.01" 
                      step="any" 
                      disabled={isSubmitting}
                      aria-label={`${t('receivables.owedAmount')} ${index + 1}`}
                      placeholder={t('receivables.amountOwed')} 
                      value={participant.owedAmount} 
                      onChange={(e) => setForm({ ...form, participants: form.participants.map((p, i) => i === index ? { ...p, owedAmount: e.target.value } : p) })} 
                    />
                  </div>
                  {form.participants.length > 1 && (
                    <button 
                      type="button" 
                      disabled={isSubmitting}
                      aria-label={t('common.delete') || 'Delete'}
                      onClick={() => removeParticipant(index)} 
                      className="min-w-[44px] min-h-[44px] p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition border border-red-500/20 shadow-sm disabled:opacity-40 flex items-center justify-center shrink-0"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
              <button 
                type="button" 
                disabled={isSubmitting}
                onClick={addParticipant} 
                className="min-h-[44px] py-2 px-3 text-sm font-medium text-[#E8C5A8] hover:text-white transition-colors flex items-center gap-1.5 ms-1 disabled:opacity-40"
              >
                {t('receivables.addPerson')}
              </button>
            </div>
            
            <div className="bg-[#8D6346]/5 border border-[#8D6346]/20 rounded-[1.5rem] p-5 mt-2 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/80 font-medium">{t('receivables.yourShare')}</span>
                <span className="font-bold text-[#8D6346] text-xl tracking-wide tabular-nums">{money(netExpense)}</span>
              </div>
              
              <div className="border-t border-[#8D6346]/20 pt-4">
                <span className="text-sm font-medium text-white/90 block mb-2 px-1">
                  {t('receivables.expenseCategory')}
                </span>
                <CustomSelect 
                  value={form.expenseCategory} 
                  onChange={(v) => setForm({ ...form, expenseCategory: v })} 
                  options={categories.map(c => ({ value: c._id, label: c.name, icon: c.icon, color: c.color }))} 
                  placeholder={t('receivables.selectCategory')} 
                  disabled={isSubmitting}
                />
              </div>
            </div>

          </form>
        </div>

        {/* Sticky Actions Footer */}
        <div className="sticky bottom-0 z-20 p-6 border-t border-white/10 bg-[#1C1819]/90 backdrop-blur-md">
          <button 
            type="submit"
            form="group-expense-form"
            disabled={isSubmitting}
            className="w-full py-4 rounded-full font-bold text-[14px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></span>
            ) : (
              <Plus className="w-5 h-5" />
            )}
            <span>{form._id ? t('receivables.saveChanges') : t('receivables.recordPaymentBtn')}</span>
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
