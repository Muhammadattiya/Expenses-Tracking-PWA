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
          title: initialData.title,
          paidAmount: initialData.paidAmount,
          paidFrom: initialData.paidFrom?._id || initialData.paidFrom || '',
          receivedAmount: initialData.receivedAmount || '',
          receivedTo: initialData.receivedTo?._id || initialData.receivedTo || '',
          expenseCategory: initialData.expenseCategory?._id || initialData.expenseCategory || '',
          participants: initialData.participants?.length ? initialData.participants.map(p => ({ _id: p._id, name: p.name, owedAmount: p.owedAmount })) : [{ name: '', owedAmount: '' }]
        });
      } else {
        setForm(defaultForm);
      }
      setError('');
    }
  }, [isOpen, initialData, accounts, categories]);

  if (!isOpen) return null;

  const addParticipant = () => setForm({ ...form, participants: [...form.participants, { name: '', owedAmount: '' }] });
  const removeParticipant = (index) => setForm({ ...form, participants: form.participants.filter((_, i) => i !== index) });

  const netExpense = Math.max(0, (Number(form.paidAmount) || 0) - (Number(form.receivedAmount) || 0) - form.participants.reduce((sum, p) => sum + (Number(p.owedAmount) || 0), 0));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const data = {
        ...form,
        paidAmount: Number(form.paidAmount),
        receivedAmount: Number(form.receivedAmount) || 0,
        participants: form.participants.map((p) => ({ ...p, owedAmount: Number(p.owedAmount) }))
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-[#1C1819]/80 backdrop-blur-3xl border border-white/15 rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Subtle Top Inner Edge Highlight */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-transparent z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#8D6346]/20 rounded-xl text-[#8D6346] shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {form._id ? t('receivables.editTitle') : t('receivables.addTitle')}
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

          <form id="group-expense-form" onSubmit={submit} className="space-y-6">
            
            <div className="space-y-1.5 pt-2">
              <label className="text-sm font-medium text-white/70 px-1">{t('receivables.outingName')}</label>
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 transition-all" 
                required 
                placeholder={t('receivables.outingName')} 
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })} 
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <label className="text-sm font-medium text-white/90 px-1">{t('receivables.totalPaid')}</label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 transition-all" 
                  required 
                  type="number" 
                  min="1" 
                  placeholder={t('receivables.paidAmount')} 
                  value={form.paidAmount} 
                  onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} 
                />
                <CustomSelect 
                  value={form.paidFrom} 
                  onChange={(v) => setForm({ ...form, paidFrom: v })} 
                  options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                  placeholder={t('receivables.selectAccount')} 
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <label className="text-sm font-medium text-white/90 px-1">{t('receivables.receivedImmediately')}</label>
              <div className="grid grid-cols-2 gap-3">
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 transition-all" 
                  type="number" 
                  min="0" 
                  max={form.paidAmount || undefined} 
                  placeholder={t('receivables.amountReceived')} 
                  value={form.receivedAmount} 
                  onChange={(e) => setForm({ ...form, receivedAmount: e.target.value })} 
                />
                <CustomSelect 
                  value={form.receivedTo} 
                  onChange={(v) => setForm({ ...form, receivedTo: v })} 
                  options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                  placeholder={t('receivables.receivingAccount')} 
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <label className="text-sm font-medium text-white/90 px-1">{t('receivables.friendsOwes')}</label>
              {form.participants.map((participant, index) => (
                <div className="flex gap-2 items-center" key={index}>
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <input 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 transition-all" 
                      required 
                      placeholder={t('receivables.personName')} 
                      value={participant.name} 
                      onChange={(e) => setForm({ ...form, participants: form.participants.map((p, i) => i === index ? { ...p, name: e.target.value } : p) })} 
                    />
                    <input 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/70 focus:ring-1 focus:ring-[#8D6346]/70 transition-all" 
                      required 
                      type="number" 
                      min="1" 
                      placeholder={t('receivables.amountOwed')} 
                      value={participant.owedAmount} 
                      onChange={(e) => setForm({ ...form, participants: form.participants.map((p, i) => i === index ? { ...p, owedAmount: e.target.value } : p) })} 
                    />
                  </div>
                  {form.participants.length > 1 && (
                    <button type="button" onClick={() => removeParticipant(index)} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition border border-red-500/20 shadow-sm">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addParticipant} className="text-sm font-medium text-[#E8C5A8] hover:text-white transition-colors flex items-center gap-1.5 ml-1">
                {t('receivables.addPerson')}
              </button>
            </div>
            
            <div className="bg-[#8D6346]/5 border border-[#8D6346]/20 rounded-[1.5rem] p-5 mt-2 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/80 font-medium">{t('receivables.yourShare')}</span>
                <span className="font-bold text-[#8D6346] text-xl tracking-wide tabular-nums">{money(netExpense)}</span>
              </div>
              
              <div className="border-t border-[#8D6346]/20 pt-4">
                <label className="text-sm font-medium text-white/90 block mb-2 px-1">{t('receivables.expenseCategory')}</label>
                <CustomSelect 
                  value={form.expenseCategory} 
                  onChange={(v) => setForm({ ...form, expenseCategory: v })} 
                  options={categories.map(c => ({ value: c._id, label: c.name, icon: c.icon, color: c.color }))} 
                  placeholder={t('receivables.selectCategory')} 
                />
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-transparent">
          <button 
            type="submit"
            form="group-expense-form"
            disabled={isSubmitting}
            className="w-full py-4 rounded-full font-bold text-[14px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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
