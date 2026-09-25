import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';
import { getAccounts } from '../../api/accounts';

export default function GoldInvestmentModal({ isOpen, onClose, onSave, initialData = null, liveGoldRates = null }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';
  const nameInputRef = useRef(null);

  const [form, setForm] = useState({
    type: 'gold',
    name: '',
    karat: 24,
    quantity: '',
    purchasePrice: '',
    from_account: '',
    purchasedAt: new Date().toISOString().split('T')[0]
  });

  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting) {
        e.preventDefault();
        const formEl = document.getElementById('gold-form');
        if (formEl) formEl.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  // Autofocus name input on mount
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    getAccounts().then(accs => setAccounts(accs.filter(a => !a.isArchived))).catch(console.error);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          type: 'gold',
          name: initialData.name || '',
          karat: initialData.karat || 24,
          quantity: initialData.quantity || '',
          purchasePrice: initialData.purchasePrice || '',
          from_account: initialData.from_account || '',
          purchasedAt: initialData.purchasedAt ? new Date(initialData.purchasedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
      } else {
        const defaultKarat = 24;
        setForm({
          type: 'gold',
          name: isRTL ? 'سبيكة ذهب عيار 24' : '24K Gold Bar',
          karat: defaultKarat,
          quantity: '',
          purchasePrice: (defaultKarat === 24 ? liveGoldRates?.perGram24 : liveGoldRates?.perGram21) ? Math.round(defaultKarat === 24 ? liveGoldRates?.perGram24 : liveGoldRates?.perGram21) : '',
          from_account: '',
          purchasedAt: new Date().toISOString().split('T')[0]
        });
      }
      setError('');
    }
  }, [isOpen, initialData, isRTL, liveGoldRates]);

  const handleKaratChange = (k) => {
    const numKarat = Number(k);
    let autoName = form.name;
    if (!initialData) {
      autoName = isRTL ? `سبيكة ذهب عيار ${numKarat}` : `${numKarat}K Gold Bar`;
    }
    let autoPrice = form.purchasePrice;
    if (!initialData && liveGoldRates) {
      const rate = numKarat === 24 
        ? liveGoldRates.perGram24 
        : numKarat === 21 
          ? liveGoldRates.perGram21 
          : (liveGoldRates.perGram18 || (liveGoldRates.perGram24 * 18 / 24));
      if (rate) autoPrice = Math.round(rate);
    }
    setForm(prev => ({ ...prev, karat: numKarat, name: autoName, purchasePrice: autoPrice }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!form.name.trim()) errors.name = t('investments.fillAllFields');
    if (!form.quantity || Number(form.quantity) <= 0) errors.quantity = t('investments.fillAllFields');
    if (!form.purchasePrice || Number(form.purchasePrice) <= 0) errors.purchasePrice = t('investments.fillAllFields');

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(t('investments.fillAllFields'));
      return;
    }

    setIsSubmitting(true);
    setError('');
    setFieldErrors({});
    try {
      await onSave({
        ...form,
        karat: Number(form.karat),
        quantity: Number(form.quantity),
        purchasePrice: Number(form.purchasePrice),
        currency: 'EGP',
        transferTitle: t('investments.transferTitle').replace('{name}', form.name)
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('investments.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
          onClick={onClose}
        />

        {/* Modal Container */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gold-modal-title"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#141115]/95 backdrop-blur-xl rounded-[2.5rem] border border-amber-500/25 shadow-[0_16px_45px_rgba(0,0,0,0.6)] max-h-[90vh] flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Top Hairline Light */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-amber-300/40 to-transparent pointer-events-none" />

          {/* Sticky Header */}
          <div className="sticky top-0 z-20 flex justify-between items-center p-6 border-b border-white/5 bg-[#141115]/90 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-300 shadow-inner">
                <Coins size={20} />
              </div>
              <div>
                <h2 id="gold-modal-title" className="text-lg font-bold text-white tracking-wide">
                  {initialData ? t('investments.editGold') : t('investments.addGold')}
                </h2>
                <p className="text-[11px] text-amber-200/60 font-medium">
                  {t('investments.goldBullionSubtitle')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="p-6 overflow-y-auto flex-1 hide-scrollbar">
            {error && (
              <div className="p-3 mb-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
                {error}
              </div>
            )}

            <form id="gold-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Karat Selector Pill Tabs */}
              <div>
                <span className="text-xs font-semibold text-white/70 block mb-2 px-1">
                  {t('investments.karatSelect')}
                </span>
                <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-black/40 border border-white/10">
                  {[24, 21, 18].map(k => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handleKaratChange(k)}
                      className={`py-2 rounded-xl text-xs font-black transition-all ${
                        form.karat === k
                          ? 'bg-amber-500/30 border border-amber-500/50 text-amber-200 shadow-[0_2px_10px_rgba(245,158,11,0.2)]'
                          : 'text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {k}K {k === 24 ? '(999.9)' : k === 21 ? '(875)' : '(750)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name / Description */}
              <div>
                <label htmlFor="gold-name-input" className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                  {t('investments.goldNameLabel')}
                </label>
                <input
                  ref={nameInputRef}
                  id="gold-name-input"
                  type="text"
                  value={form.name}
                  onChange={e => {
                    setForm({ ...form, name: e.target.value });
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: null }));
                  }}
                  placeholder={isRTL ? 'مثال: سبيكة BTC 10 جرام' : 'e.g. 10g BTC Gold Bar'}
                  className={`w-full bg-black/30 border rounded-2xl px-4 py-3 text-white text-sm focus:outline-none placeholder:text-white/30 transition-all shadow-inner ${
                    fieldErrors.name ? 'border-[#FF3B30] focus:border-[#FF3B30]' : 'border-white/10 focus:border-amber-500/60'
                  }`}
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-[#FF3B30] mt-1 px-1">{fieldErrors.name}</p>
                )}
              </div>

              {/* Quantity (Weight in Grams) & Purchase Price per Gram */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="gold-quantity-input" className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                    {t('investments.weightGrams')}
                  </label>
                  <input
                    id="gold-quantity-input"
                    type="number"
                    step="any"
                    min="0.01"
                    value={form.quantity}
                    onChange={e => {
                      setForm({ ...form, quantity: e.target.value });
                      if (fieldErrors.quantity) setFieldErrors(prev => ({ ...prev, quantity: null }));
                    }}
                    placeholder="e.g. 10"
                    className={`w-full bg-black/30 border rounded-2xl px-4 py-3 text-white text-sm focus:outline-none placeholder:text-white/30 transition-all shadow-inner tabular-nums font-mono ${
                      fieldErrors.quantity ? 'border-[#FF3B30] focus:border-[#FF3B30]' : 'border-white/10 focus:border-amber-500/60'
                    }`}
                  />
                  {fieldErrors.quantity && (
                    <p className="text-[11px] text-[#FF3B30] mt-1 px-1">{fieldErrors.quantity}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="gold-purchase-price-input" className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                    {t('investments.buyRatePerGram')}
                  </label>
                  <input
                    id="gold-purchase-price-input"
                    type="number"
                    step="any"
                    min="1"
                    value={form.purchasePrice}
                    onChange={e => {
                      setForm({ ...form, purchasePrice: e.target.value });
                      if (fieldErrors.purchasePrice) setFieldErrors(prev => ({ ...prev, purchasePrice: null }));
                    }}
                    placeholder="e.g. 3500"
                    className={`w-full bg-black/30 border rounded-2xl px-4 py-3 text-white text-sm focus:outline-none placeholder:text-white/30 transition-all shadow-inner tabular-nums font-mono ${
                      fieldErrors.purchasePrice ? 'border-[#FF3B30] focus:border-[#FF3B30]' : 'border-white/10 focus:border-amber-500/60'
                    }`}
                  />
                  {fieldErrors.purchasePrice && (
                    <p className="text-[11px] text-[#FF3B30] mt-1 px-1">{fieldErrors.purchasePrice}</p>
                  )}
                </div>
              </div>

              {/* Total Cost Preview */}
              {form.quantity && form.purchasePrice && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex justify-between items-center">
                  <span className="text-xs text-amber-200/80 font-medium">
                    {t('investments.totalInitialCost')}:
                  </span>
                  <span className="text-sm font-black text-amber-300 tabular-nums">
                    {(Number(form.quantity) * Number(form.purchasePrice)).toLocaleString(isRTL ? 'ar-EG' : 'en-US')} EGP
                  </span>
                </div>
              )}

              {/* Purchase Date */}
              <div>
                <label htmlFor="gold-purchased-at-input" className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                  {t('investments.purchaseDate')}
                </label>
                <input
                  id="gold-purchased-at-input"
                  type="date"
                  value={form.purchasedAt}
                  onChange={e => setForm({ ...form, purchasedAt: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/60 transition-all shadow-inner"
                />
              </div>

              {/* Paid From Account (Optional) */}
              {!initialData && accounts.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                    {t('investments.paidFromAccount')}
                  </span>
                  <CustomSelect
                    value={form.from_account}
                    onChange={val => setForm({ ...form, from_account: val })}
                    options={[
                      { value: '', label: isRTL ? 'بدون خصم من حساب' : 'Do not deduct' },
                      ...accounts.map(a => ({
                        value: a._id,
                        label: a.name,
                        icon: a.icon,
                        color: a.color,
                        subtitle: a.balance !== undefined ? `${a.balance.toLocaleString(isRTL ? 'ar-EG' : 'en-US')} ${a.currency || 'EGP'}` : undefined
                      }))
                    ]}
                    placeholder={isRTL ? 'اختر الحساب...' : 'Select account...'}
                  />
                </div>
              )}
            </form>
          </div>

          {/* Sticky Actions Footer */}
          <div className="sticky bottom-0 z-20 p-6 border-t border-white/5 bg-[#141115]/90 backdrop-blur-md flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3.5 px-5 rounded-full font-semibold text-[13.5px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-[0.98]"
            >
              {t('common.cancel')}
            </button>

            <button
              type="submit"
              form="gold-form"
              disabled={isSubmitting}
              className="flex-1 py-3.5 px-5 rounded-full font-semibold text-[13.5px] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Coins size={15} />}
              <span>{initialData ? t('common.saveChanges') : t('investments.saveGold')}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
