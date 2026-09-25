import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, ShoppingBag, CreditCard, Calendar, Sparkles } from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SimulationModals({ type, onClose, onSubmit, metadata, initialValues = null }) {
  const { t, lang } = useLanguage();
  const [purchaseMethod, setPurchaseMethod] = useState(
    initialValues?.type === 'installment' || type === 'installment' ? 'installment' : 'cash'
  );
  const [payload, setPayload] = useState(initialValues?.payload || initialValues || {});

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (metadata?.accounts?.length > 0) {
      const defaultAcc = metadata.accounts.find(a => !a.excludeFromTotal && ((a.calculatedBalance ?? a.balance ?? a.balance_adjustment ?? 0) >= 0)) || metadata.accounts[0];
      if (defaultAcc) {
        setPayload(prev => ({
          ...prev,
          accountId: prev.accountId || defaultAcc._id,
          linkedAccountId: prev.linkedAccountId || defaultAcc._id
        }));
      }
    }
  }, [metadata?.accounts]);

  useEffect(() => {
    if (metadata?.categories?.length > 0) {
      setPayload(prev => ({
        ...prev,
        categoryId: prev.categoryId || metadata.categories[0]._id
      }));
    }
  }, [metadata?.categories]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalType = (type === 'purchase' && purchaseMethod === 'installment') ? 'installment' : type;
    let finalPayload = { ...payload };

    if (finalType === 'installment') {
      const tot = Number(payload.totalAmount || payload.amount || 0);
      const down = Number(payload.downPayment || 0);
      const mos = Number(payload.totalMonths || 12);
      const monthly = Number(payload.monthlyAmount) || Math.round(Math.max(0, tot - down) / Math.max(1, mos));
      finalPayload = {
        ...payload,
        title: payload.title || payload.notes || (lang === 'ar' ? 'شراء بالتقسيط' : 'Installment Purchase'),
        totalAmount: tot,
        downPayment: down,
        totalMonths: mos,
        monthlyAmount: monthly,
        dueDayOfMonth: Number(payload.dueDayOfMonth) || 15,
        linkedAccountId: payload.linkedAccountId || payload.accountId,
        accountId: payload.accountId || payload.linkedAccountId,
        provider: payload.provider || 'valu'
      };
    } else if (finalType === 'purchase') {
      finalPayload = {
        ...payload,
        amount: Number(payload.amount || payload.totalAmount || 0),
        notes: payload.notes || payload.title || (lang === 'ar' ? 'شراء كاش' : 'Cash Purchase')
      };
    }

    onSubmit(finalPayload, finalType);
  };

  const typeName = t(`sandbox.${type}`) || type;

  const accountOptions = (metadata?.accounts || []).map(a => {
    const rawBal = a.calculatedBalance ?? a.balance ?? a.balance_adjustment;
    const hasBal = rawBal !== undefined && rawBal !== null;
    const formattedBal = hasBal ? new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(rawBal) : '';
    return {
      value: a._id,
      label: hasBal ? `${a.name} (${formattedBal})` : a.name,
      icon: a.icon,
      color: a.color
    };
  });

  const providerOptions = [
    { value: 'valu', label: 'valU' },
    { value: 'souhoola', label: 'Souhoola' },
    { value: 'sympl', label: 'Sympl' },
    { value: 'tabby', label: 'Tabby' },
    { value: 'tamara', label: 'Tamara' },
    { value: 'bank_cib', label: lang === 'ar' ? 'بنك CIB' : 'CIB Bank' },
    { value: 'bank_nbe', label: lang === 'ar' ? 'البنك الأهلي المصري' : 'National Bank of Egypt' },
    { value: 'bank_misr', label: lang === 'ar' ? 'بنك مصر' : 'Banque Misr' },
    { value: 'gameya', label: lang === 'ar' ? 'جمعية شهرية' : "Gam'eya" },
    { value: 'other', label: lang === 'ar' ? 'جهة أخرى' : 'Other' }
  ];

  const renderInstallmentFields = () => {
    const tot = Number(payload.totalAmount || payload.amount || 0);
    const down = Number(payload.downPayment || 0);
    const mos = Number(payload.totalMonths || 12);
    const calcMonthly = Math.round(Math.max(0, tot - down) / Math.max(1, mos));

    const handleDurationClick = (m) => {
      const newMonthly = Math.round(Math.max(0, tot - down) / Math.max(1, m));
      setPayload(prev => ({
        ...prev,
        totalMonths: m,
        monthlyAmount: newMonthly
      }));
    };

    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="sim-inst-title" className="text-xs text-[var(--color-text-muted)] font-medium">
            {t('sandbox.installmentTitle')}
          </label>
          <input 
            id="sim-inst-title"
            required 
            type="text" 
            value={payload.title || payload.notes || ''}
            placeholder={t('sandbox.installmentTitlePlaceholder')} 
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none text-sm" 
            onChange={e => setPayload({ ...payload, title: e.target.value })} 
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="sim-inst-total" className="text-xs text-[var(--color-text-muted)] font-medium">
              {t('sandbox.totalAmount')}
            </label>
            <input 
              id="sim-inst-total"
              required 
              type="number" 
              step="1" 
              value={payload.totalAmount || payload.amount || ''}
              placeholder="0"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none text-sm" 
              onChange={e => {
                const total = Number(e.target.value) || 0;
                const monthly = Math.round(Math.max(0, total - down) / Math.max(1, mos));
                setPayload({ ...payload, totalAmount: total, monthlyAmount: monthly });
              }} 
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="sim-inst-down" className="text-xs text-[var(--color-text-muted)] font-medium">
              {t('sandbox.downPayment')}
            </label>
            <input 
              id="sim-inst-down"
              type="number" 
              step="1" 
              value={payload.downPayment !== undefined ? payload.downPayment : ''}
              placeholder="0" 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none text-sm" 
              onChange={e => {
                const d = Number(e.target.value) || 0;
                const monthly = Math.round(Math.max(0, tot - d) / Math.max(1, mos));
                setPayload({ ...payload, downPayment: d, monthlyAmount: monthly });
              }} 
            />
          </div>
        </div>

        {/* Quick Duration Chips */}
        <div className="space-y-1.5">
          <span className="block text-xs text-[var(--color-text-muted)] font-medium">
            {t('sandbox.quickMonths')}
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[3, 6, 12, 18, 24].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleDurationClick(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  mos === m
                    ? 'bg-[#8D6346] text-white shadow-sm border border-[#8D6346]'
                    : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                }`}
              >
                {m} {lang === 'ar' ? 'شهر' : 'mo'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="sim-inst-months" className="text-xs text-[var(--color-text-muted)] font-medium">
              {t('sandbox.months')}
            </label>
            <input 
              id="sim-inst-months"
              type="number" 
              step="1" 
              value={mos} 
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none text-sm" 
              onChange={e => {
                const m = Number(e.target.value) || 12;
                const monthly = Math.round(Math.max(0, tot - down) / Math.max(1, m));
                setPayload({ ...payload, totalMonths: m, monthlyAmount: monthly });
              }} 
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="sim-inst-monthly" className="text-xs text-[var(--color-text-muted)] font-medium">
              {t('sandbox.monthlyBurden')}
            </label>
            <input 
              id="sim-inst-monthly"
              type="number" 
              step="1" 
              value={payload.monthlyAmount !== undefined ? payload.monthlyAmount : calcMonthly} 
              placeholder={calcMonthly.toString()}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none text-sm font-bold text-[#E8C5A8]" 
              onChange={e => setPayload({ ...payload, monthlyAmount: Number(e.target.value) })} 
            />
          </div>
        </div>

        {/* Live Monthly Summary Callout */}
        <div className="p-3 rounded-2xl bg-black/30 border border-white/5 flex items-center justify-between text-xs">
          <span className="text-white/60">
            {t('sandbox.monthlyCommitmentLabel')}:
          </span>
          <span className="font-black text-[#E8C5A8] tabular-nums text-sm">
            {(payload.monthlyAmount || calcMonthly).toLocaleString()} {lang === 'ar' ? 'ج.م / شهر' : 'EGP / mo'}
          </span>
        </div>

        <div className="space-y-1">
          <span className="block text-xs text-[var(--color-text-muted)] font-medium">
            {t('sandbox.provider')}
          </span>
          <CustomSelect 
            options={providerOptions}
            value={payload.provider || 'valu'}
            onChange={val => setPayload({ ...payload, provider: val })}
            placeholder={t('sandbox.provider')}
          />
        </div>

        <div className="space-y-1">
          <span className="block text-xs text-[var(--color-text-muted)] font-medium">
            {t('sandbox.paymentAccount')}
          </span>
          <CustomSelect 
            options={accountOptions}
            value={payload.linkedAccountId || payload.accountId}
            onChange={val => setPayload({ ...payload, linkedAccountId: val, accountId: val })}
            placeholder={t('sandbox.selectAccount')}
          />
        </div>
      </div>
    );
  };

  const renderFields = () => {
    switch (type) {
      case 'purchase':
        return (
          <>
            {/* Cash vs. Installment Segmented Toggle */}
            <div className="flex rounded-2xl bg-black/40 p-1 border border-white/10 mb-4">
              <button
                type="button"
                onClick={() => setPurchaseMethod('cash')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  purchaseMethod === 'cash'
                    ? 'bg-[#8D6346] text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <ShoppingBag size={14} />
                <span>{t('sandbox.payMethodCash')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPurchaseMethod('installment');
                  if (!payload.totalAmount && payload.amount) {
                    const amt = Number(payload.amount) || 0;
                    setPayload(prev => ({
                      ...prev,
                      totalAmount: amt,
                      totalMonths: prev.totalMonths || 12,
                      monthlyAmount: Math.round(amt / (prev.totalMonths || 12))
                    }));
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  purchaseMethod === 'installment'
                    ? 'bg-[#8D6346] text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <CreditCard size={14} />
                <span>{t('sandbox.payMethodInstallment')}</span>
              </button>
            </div>

            {purchaseMethod === 'cash' ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="sim-purchase-notes" className="text-xs text-[var(--color-text-muted)] font-medium">
                    {t('installments.titleLabel')}
                  </label>
                  <input 
                    id="sim-purchase-notes"
                    type="text" 
                    value={payload.notes || payload.title || ''}
                    placeholder={t('sandbox.scenarioNamePlaceholder')} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none text-sm" 
                    onChange={e => setPayload({ ...payload, notes: e.target.value, title: e.target.value })} 
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="sim-purchase-amount" className="text-xs text-[var(--color-text-muted)] font-medium">
                    {t('sandbox.amount')}
                  </label>
                  <input 
                    id="sim-purchase-amount"
                    required 
                    type="number" 
                    step="0.01" 
                    value={payload.amount || payload.totalAmount || ''}
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] focus:ring-1 focus:ring-[#8D6346] outline-none text-sm" 
                    onChange={e => setPayload({ ...payload, amount: e.target.value, totalAmount: e.target.value })} 
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                    {t('sandbox.account')}
                  </span>
                  <CustomSelect 
                    options={accountOptions}
                    value={payload.accountId || payload.linkedAccountId}
                    onChange={val => setPayload({ ...payload, accountId: val, linkedAccountId: val })}
                    placeholder={t('sandbox.selectAccount')}
                  />
                </div>
                <div className="space-y-1">
                  <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                    {t('sandbox.category')}
                  </span>
                  <CustomSelect 
                    options={(metadata?.categories || []).map(c => ({ value: c._id, label: c.name, icon: c.icon, color: c.color }))}
                    value={payload.categoryId}
                    onChange={val => setPayload({ ...payload, categoryId: val })}
                    placeholder={t('sandbox.selectCategory')}
                  />
                </div>
              </div>
            ) : (
              renderInstallmentFields()
            )}
          </>
        );
      case 'salary':
        return (
          <>
            <div className="space-y-1">
              <label htmlFor="sim-salary-amount" className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.newSalaryAmount')}
              </label>
              <input 
                id="sim-salary-amount"
                required 
                type="number" 
                step="0.01" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] focus:ring-1 focus:ring-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, newAmount: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.destinationAccount')}
              </span>
              <CustomSelect 
                options={accountOptions}
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
              <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.action')}
              </span>
              <CustomSelect 
                options={[
                  { value: 'increase', label: t('sandbox.increaseBudget') },
                  { value: 'decrease', label: t('sandbox.decreaseBudget') },
                  { value: 'create', label: t('sandbox.createBudget') },
                  { value: 'delete', label: t('sandbox.deleteBudget') }
                ]}
                value={payload.action}
                onChange={val => setPayload({...payload, action: val})}
                placeholder={t('sandbox.selectAction')}
              />
            </div>
            <div className="space-y-1">
              <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.category')}
              </span>
              <CustomSelect 
                options={(metadata?.categories || []).map(c => ({ value: c._id, label: c.name, icon: c.icon, color: c.color }))}
                value={payload.categoryId}
                onChange={val => setPayload({...payload, categoryId: val})}
                placeholder={t('sandbox.selectCategory')}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="sim-budget-amount" className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.amount')}
              </label>
              <input 
                id="sim-budget-amount"
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
              <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.action')}
              </span>
              <CustomSelect 
                options={[
                  { value: 'take', label: t('sandbox.takeDebt') },
                  { value: 'repay', label: t('sandbox.repayDebt') }
                ]}
                value={payload.action}
                onChange={val => setPayload({...payload, action: val})}
                placeholder={t('sandbox.selectAction')}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="sim-debt-amount" className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.amount')}
              </label>
              <input 
                id="sim-debt-amount"
                required 
                type="number" 
                step="0.01" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, amount: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.account')}
              </span>
              <CustomSelect 
                options={accountOptions}
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
              <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.action')}
              </span>
              <CustomSelect 
                options={[
                  { value: 'pay', label: t('sandbox.payBill') },
                  { value: 'delay', label: t('sandbox.delayBill') },
                  { value: 'delete', label: t('sandbox.deleteBill') },
                  { value: 'add', label: t('sandbox.addBill') }
                ]}
                value={payload.action}
                onChange={val => setPayload({...payload, action: val})}
                placeholder={t('sandbox.selectAction')}
              />
            </div>
            {payload.action && payload.action !== 'add' && (
              <div className="space-y-1">
                <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                  {t('sandbox.billItem')}
                </span>
                <CustomSelect 
                  options={(metadata?.bills || []).map(b => ({ value: b._id, label: `${b.name} (${b.expectedAmount || b.amount || 0})` }))}
                  value={payload.billId}
                  onChange={val => setPayload({...payload, billId: val})}
                  placeholder={t('sandbox.selectBill')}
                />
              </div>
            )}
            {['add', 'pay'].includes(payload.action) && (
              <div className="space-y-1">
                <label htmlFor="sim-bill-amount" className="text-xs text-[var(--color-text-muted)] font-medium">
                  {t('sandbox.amount')}
                </label>
                <input 
                  id="sim-bill-amount"
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
                <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                  {t('sandbox.account')}
                </span>
                <CustomSelect 
                  options={accountOptions}
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
              <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.action')}
              </span>
              <CustomSelect 
                options={[
                  { value: 'disable', label: t('sandbox.disable') },
                  { value: 'enable', label: t('sandbox.enable') },
                  { value: 'edit', label: t('sandbox.editAmount') }
                ]}
                value={payload.action}
                onChange={val => setPayload({...payload, action: val})}
                placeholder={t('sandbox.selectAction')}
              />
            </div>
            <div className="space-y-1">
              <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.recurringTx')}
              </span>
              <CustomSelect 
                options={(metadata?.recurring || []).map(r => ({ value: r._id, label: `${r.title} (${r.amount})` }))}
                value={payload.recurringId}
                onChange={val => setPayload({...payload, recurringId: val})}
                placeholder={t('sandbox.selectRecurring')}
              />
            </div>
            {payload.action === 'edit' && (
               <div className="space-y-1">
                 <label htmlFor="sim-rec-amount" className="text-xs text-[var(--color-text-muted)] font-medium">
                   {t('sandbox.amount')}
                 </label>
                 <input 
                   id="sim-rec-amount"
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
              <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.action')}
              </span>
              <CustomSelect 
                options={[
                  { value: 'buy', label: t('sandbox.buyInvestment') },
                  { value: 'sell', label: t('sandbox.sellInvestment') }
                ]}
                value={payload.action}
                onChange={val => setPayload({...payload, action: val})}
                placeholder={t('sandbox.selectAction')}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="sim-inv-amount" className="text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.amount')}
              </label>
              <input 
                id="sim-inv-amount"
                required 
                type="number" 
                step="0.01" 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-white/90 focus:border-[#8D6346] outline-none" 
                onChange={e => setPayload({...payload, amount: e.target.value})} 
              />
            </div>
            <div className="space-y-1">
              <span className="block text-xs text-[var(--color-text-muted)] font-medium">
                {t('sandbox.account')}
              </span>
              <CustomSelect 
                options={accountOptions}
                value={payload.accountId}
                onChange={val => setPayload({...payload, accountId: val})}
                placeholder={t('sandbox.selectAccount')}
              />
            </div>
          </>
        );
      case 'installment':
        return renderInstallmentFields();
      default: return null;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="simulation-modal-title"
        className="bg-[#1C1819] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl relative z-10 animate-scale-in flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between p-6 border-b border-white/5 bg-[#1C1819]/95 backdrop-blur-md">
          <h2 id="simulation-modal-title" className="text-xl font-bold text-white">
            {t('sandbox.simulationTitle', { type: typeName })}
          </h2>
          <button 
            onClick={onClose} 
            aria-label={t('common.close')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form id="sim-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Upfront Decision Guidance Banner */}
            <div className="p-3.5 rounded-2xl bg-[#8D6346]/15 border border-[#8D6346]/30 flex items-start gap-2.5">
              <Sparkles size={16} className="text-[#E8C5A8] shrink-0 mt-0.5" />
              <p className="text-xs text-white/90 leading-relaxed font-medium">
                {t(`sandbox.modalTips.${type}`) || t('sandbox.modalTips.purchase')}
              </p>
            </div>

            {renderFields()}
          </form>
        </div>
        
        <div className="sticky bottom-0 z-20 p-6 border-t border-white/5 flex gap-3 bg-[#1C1819]/95 backdrop-blur-md">
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
