import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Play } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SimulationModals({ type, onClose, onSubmit, metadata }) {
  const { t, lang } = useLanguage();
  const [payload, setPayload] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(payload);
  };

  const typeName = t(`sandbox.${type}`) || type;

  const renderFields = () => {
    switch (type) {
      case 'purchase':
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.amount')}
              </label>
              <input 
                required 
                type="number" 
                step="0.01" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] focus:ring-1 focus:ring-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, amount: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.account')}
              </label>
              <CustomSelect 
                options={metadata.accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                value={payload.accountId}
                onChange={val => setPayload({...payload, accountId: val})}
                placeholder={t('sandbox.selectAccount')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.category')}
              </label>
              <CustomSelect 
                options={metadata.categories.map(c => ({ value: c._id, label: c.name, icon: c.icon, color: c.color }))}
                value={payload.categoryId}
                onChange={val => setPayload({...payload, categoryId: val})}
                placeholder={t('sandbox.selectCategory')}
              />
            </div>
          </>
        );
      case 'salary':
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.newSalaryAmount')}
              </label>
              <input 
                required 
                type="number" 
                step="0.01" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] focus:ring-1 focus:ring-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, newAmount: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.destinationAccount')}
              </label>
              <CustomSelect 
                options={metadata.accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                value={payload.accountId}
                onChange={val => setPayload({...payload, accountId: val})}
                placeholder={t('sandbox.selectAccount')}
              />
            </div>
          </>
        );
      case 'budget':
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.action')}
              </label>
              <select 
                className="w-full bg-[#1C1819] border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, action: e.target.value})}
              >
                <option value="">{t('sandbox.selectAction')}</option>
                <option value="increase">{t('sandbox.increaseBudget')}</option>
                <option value="decrease">{t('sandbox.decreaseBudget')}</option>
                <option value="create">{t('sandbox.createBudget')}</option>
                <option value="delete">{t('sandbox.deleteBudget')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.category')}
              </label>
              <CustomSelect 
                options={metadata.categories.map(c => ({ value: c._id, label: c.name, icon: c.icon, color: c.color }))}
                value={payload.categoryId}
                onChange={val => setPayload({...payload, categoryId: val})}
                placeholder={t('sandbox.selectCategory')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.amount')}
              </label>
              <input 
                required 
                type="number" 
                step="0.01" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, amount: e.target.value})} 
              />
            </div>
          </>
        );
      case 'debt':
         return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.action')}
              </label>
              <select 
                className="w-full bg-[#1C1819] border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, action: e.target.value})}
              >
                <option value="">{t('sandbox.selectAction')}</option>
                <option value="take">{t('sandbox.takeDebt')}</option>
                <option value="repay">{t('sandbox.repayDebt')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.amount')}
              </label>
              <input 
                required 
                type="number" 
                step="0.01" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, amount: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.account')}
              </label>
              <CustomSelect 
                options={metadata.accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                value={payload.accountId}
                onChange={val => setPayload({...payload, accountId: val})}
                placeholder={t('sandbox.selectAccount')}
              />
            </div>
          </>
        );
      case 'bill':
         return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.action')}
              </label>
              <select 
                className="w-full bg-[#1C1819] border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, action: e.target.value})}
              >
                <option value="">{t('sandbox.selectAction')}</option>
                <option value="pay">{t('sandbox.payBill')}</option>
                <option value="delay">{t('sandbox.delayBill')}</option>
                <option value="delete">{t('sandbox.deleteBill')}</option>
                <option value="add">{t('sandbox.addBill')}</option>
              </select>
            </div>
            {payload.action !== 'add' && (
              <div className="space-y-1">
                <label className="text-xs text-[var(--color-text-muted)] font-medium">
                  {t('sandbox.billItem')}
                </label>
                <select 
                  className="w-full bg-[#1C1819] border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                  onChange={e => setPayload({...payload, billId: e.target.value})}
                >
                  <option value="">{t('sandbox.selectBill')}</option>
                  {metadata.bills.map(b => (
                    <option key={b._id} value={b._id}>{b.name} ({b.expectedAmount})</option>
                  ))}
                </select>
              </div>
            )}
            {['add', 'pay'].includes(payload.action) && (
              <div className="space-y-1">
                <label className="text-xs text-[var(--color-text-muted)] font-medium">
                  {t('sandbox.amount')}
                </label>
                <input 
                  required 
                  type="number" 
                  step="0.01" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                  onChange={e => setPayload({...payload, amount: e.target.value})} 
                />
              </div>
            )}
            {payload.action === 'pay' && (
              <div className="space-y-1">
                <label className="text-xs text-[var(--color-text-muted)] font-medium">
                  {t('sandbox.account')}
                </label>
                <CustomSelect 
                  options={metadata.accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                  value={payload.accountId}
                  onChange={val => setPayload({...payload, accountId: val})}
                  placeholder={t('sandbox.selectAccount')}
                />
              </div>
            )}
          </>
        );
      case 'recurring':
         return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.action')}
              </label>
              <select 
                className="w-full bg-[#1C1819] border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, action: e.target.value})}
              >
                <option value="">{t('sandbox.selectAction')}</option>
                <option value="disable">{t('sandbox.disable')}</option>
                <option value="enable">{t('sandbox.enable')}</option>
                <option value="edit">{t('sandbox.editAmount')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.recurringTx')}
              </label>
              <select 
                className="w-full bg-[#1C1819] border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, recurringId: e.target.value})}
              >
                <option value="">{t('sandbox.selectRecurring')}</option>
                {metadata.recurring.map(r => (
                  <option key={r._id} value={r._id}>{r.title} ({r.amount})</option>
                ))}
              </select>
            </div>
            {payload.action === 'edit' && (
               <div className="space-y-1">
                 <label className="text-xs text-[var(--color-text-muted)] font-medium">
                   {t('sandbox.amount')}
                 </label>
                 <input 
                   required 
                   type="number" 
                   step="0.01" 
                   className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                   onChange={e => setPayload({...payload, amount: e.target.value})} 
                 />
               </div>
            )}
          </>
        );
      case 'investment':
         return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.action')}
              </label>
              <select 
                className="w-full bg-[#1C1819] border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, action: e.target.value})}
              >
                <option value="">{t('sandbox.selectAction')}</option>
                <option value="buy">{t('sandbox.buyInvestment')}</option>
                <option value="sell">{t('sandbox.sellInvestment')}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.amount')}
              </label>
              <input 
                required 
                type="number" 
                step="0.01" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, amount: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.account')}
              </label>
              <CustomSelect 
                options={metadata.accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                value={payload.accountId}
                onChange={val => setPayload({...payload, accountId: val})}
                placeholder={t('sandbox.selectAccount')}
              />
            </div>
          </>
        );
      case 'installment':
        return (
          <>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.installmentTitle')}
              </label>
              <input 
                required 
                type="text" 
                placeholder={t('sandbox.installmentTitlePlaceholder')} 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, title: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-[var(--color-text-muted)] font-medium">
                  {t('sandbox.totalAmount')}
                </label>
                <input 
                  required 
                  type="number" 
                  step="1" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                  onChange={e => {
                    const tot = Number(e.target.value) || 0;
                    const down = Number(payload.downPayment) || 0;
                    const months = Number(payload.totalMonths) || 12;
                    const monthly = Math.round(Math.max(0, tot - down) / Math.max(1, months));
                    setPayload({...payload, totalAmount: tot, monthlyAmount: monthly});
                  }} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--color-text-muted)] font-medium">
                  {t('sandbox.downPayment')}
                </label>
                <input 
                  type="number" 
                  step="1" 
                  placeholder="0" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                  onChange={e => {
                    const down = Number(e.target.value) || 0;
                    const tot = Number(payload.totalAmount) || 0;
                    const months = Number(payload.totalMonths) || 12;
                    const monthly = Math.round(Math.max(0, tot - down) / Math.max(1, months));
                    setPayload({...payload, downPayment: down, monthlyAmount: monthly});
                  }} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-[var(--color-text-muted)] font-medium">
                  {t('sandbox.months')}
                </label>
                <input 
                  type="number" 
                  step="1" 
                  defaultValue="12" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                  onChange={e => {
                    const months = Number(e.target.value) || 12;
                    const tot = Number(payload.totalAmount) || 0;
                    const down = Number(payload.downPayment) || 0;
                    const monthly = Math.round(Math.max(0, tot - down) / Math.max(1, months));
                    setPayload({...payload, totalMonths: months, monthlyAmount: monthly});
                  }} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--color-text-muted)] font-medium">
                  {t('sandbox.monthlyBurden')}
                </label>
                <input 
                  type="number" 
                  step="1" 
                  value={payload.monthlyAmount || ''} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                  onChange={e => setPayload({...payload, monthlyAmount: Number(e.target.value)})} 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.paymentAccount')}
              </label>
              <CustomSelect 
                options={metadata.accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))}
                value={payload.linkedAccountId}
                onChange={val => setPayload({...payload, linkedAccountId: val})}
                placeholder={t('sandbox.selectAccount')}
              />
            </div>
          </>
        );
      default: return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-[#1C1819] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl relative z-10 animate-scale-in flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">
            {t('sandbox.simulationTitle', { type: typeName })}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <form id="sim-form" onSubmit={handleSubmit} className="space-y-5">
             {renderFields()}
          </form>
        </div>
        
        <div className="p-6 border-t border-white/5 flex gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 rounded-full font-bold text-[15px] text-white transition-colors border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)]"
          >
            {t('common.cancel')}
          </button>
          <button 
            type="submit" 
            form="sim-form" 
            className="flex-[2] py-3.5 rounded-full font-bold text-[15px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
          >
            <Play className="w-4 h-4 fill-current" />
            {t('sandbox.runSimulation')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
