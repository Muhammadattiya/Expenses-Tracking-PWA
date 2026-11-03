import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Banknote, Loader2, Plus } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';

export default function BuyMoreCurrencyModal({
  isOpen,
  item,
  accounts = [],
  liveUsdRate = null,
  loading = false,
  onClose,
  onSave
}) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';
  const quantityInputRef = useRef(null);

  const [form, setForm] = useState({
    quantity: '',
    purchasePrice: '',
    from_account: '',
    purchasedAt: new Date().toISOString().split('T')[0]
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');

  const currCode = item?.symbol || item?.currency || 'USD';
  const effectiveLiveRate = (currCode === 'USD' && liveUsdRate) 
    ? Math.round(liveUsdRate * 100) / 100 
    : (item?.purchasePrice || '');

  useEffect(() => {
    if (isOpen && item) {
      setForm({
        quantity: '',
        purchasePrice: effectiveLiveRate || item.purchasePrice || '',
        from_account: '',
        purchasedAt: new Date().toISOString().split('T')[0]
      });
      setError('');
      setFieldErrors({});

      const timer = setTimeout(() => {
        quantityInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, item, effectiveLiveRate]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !loading) {
        e.preventDefault();
        const formEl = document.getElementById('buy-more-currency-form');
        if (formEl) formEl.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen || !item) return null;

  const currentQty = Number(item.quantity) || 0;
  const currentAvgPrice = Number(item.purchasePrice) || 0;
  const addQty = Number(form.quantity) || 0;
  const addPrice = Number(form.purchasePrice) || 0;
  const additionalCostEGP = addQty * addPrice;
  const newTotalQty = Math.round((currentQty + addQty) * 100) / 100;
  const newWeightedAvg = newTotalQty > 0 
    ? Math.round((((currentQty * currentAvgPrice) + additionalCostEGP) / newTotalQty) * 100) / 100
    : currentAvgPrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!form.quantity || Number(form.quantity) <= 0) errors.quantity = t('investments.fillAllFields');
    if (!form.purchasePrice || Number(form.purchasePrice) <= 0) errors.purchasePrice = t('investments.fillAllFields');

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(t('investments.fillAllFields'));
      return;
    }

    try {
      await onSave({
        quantity: Number(form.quantity),
        purchasePrice: Number(form.purchasePrice),
        purchasedAt: form.purchasedAt,
        from_account: form.from_account || undefined,
        title: t('investments.transferTitle').replace('{name}', item.name)
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('investments.saveError'));
    }
  };

  const moneyEGP = (val) => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 2
  }).format(val || 0);

  const formatForeign = (val) => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: currCode,
    maximumFractionDigits: 2
  }).format(val || 0);

  const usableAccounts = accounts.filter(a => !a.isArchived && a.type !== 'investment');

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-x-hidden touch-pan-y" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10"
          onClick={() => { if (!loading) onClose(); }}
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="buy-more-curr-title"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#141115]/95 backdrop-blur-xl rounded-[2.5rem] border border-emerald-500/25 shadow-[0_16px_45px_rgba(0,0,0,0.6)] max-h-[90vh] flex flex-col overflow-hidden overflow-x-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Top Hairline Light */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent pointer-events-none" />

          {/* Sticky Header */}
          <div className="sticky top-0 z-20 flex justify-between items-center p-6 border-b border-white/5 bg-[#141115]/90 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
                <Banknote size={20} />
              </div>
              <div className="min-w-0">
                <h2 id="buy-more-curr-title" className="text-lg font-bold text-white tracking-wide truncate">
                  {t('investments.buyMoreCurrency')}
                </h2>
                <p className="text-[11px] text-emerald-200/60 font-medium truncate">
                  {item.name} · {currCode}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label={t('common.close')}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="p-5 sm:p-6 overflow-y-auto overflow-x-hidden flex-1 hide-scrollbar">
            {error && (
              <div className="p-3 mb-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Current Holding Banner */}
            <div className="p-3.5 mb-4 rounded-2xl bg-black/30 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-white/40 block font-medium uppercase tracking-wider">
                  {t('investments.amountInForeign')}
                </span>
                <span className="text-xs font-bold text-white">
                  {formatForeign(currentQty)}
                </span>
              </div>
              <div className="text-end">
                <span className="text-[10px] text-white/40 block font-medium uppercase tracking-wider">
                  {t('investments.currentAvgPrice')}
                </span>
                <span className="text-xs font-bold text-emerald-300 tabular-nums font-mono">
                  {moneyEGP(currentAvgPrice)}
                </span>
              </div>
            </div>

            <form id="buy-more-currency-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Additional Amount & Buy Exchange Rate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="buy-more-curr-qty" className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                    {t('investments.additionalAmount')} ({currCode})
                  </label>
                  <input
                    ref={quantityInputRef}
                    id="buy-more-curr-qty"
                    type="number"
                    step="any"
                    min="0.01"
                    value={form.quantity}
                    onChange={e => {
                      setForm({ ...form, quantity: e.target.value });
                      if (fieldErrors.quantity) setFieldErrors(prev => ({ ...prev, quantity: null }));
                    }}
                    placeholder="e.g. 100"
                    className={`w-full bg-black/30 border rounded-2xl px-4 py-3 text-white text-sm focus:outline-none placeholder:text-white/30 transition-all shadow-inner tabular-nums font-mono ${
                      fieldErrors.quantity ? 'border-[#FF3B30] focus:border-[#FF3B30]' : 'border-white/10 focus:border-emerald-500/60'
                    }`}
                  />
                  {fieldErrors.quantity && (
                    <p className="text-[11px] text-[#FF3B30] mt-1 px-1">{fieldErrors.quantity}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="buy-more-curr-price" className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                    {t('investments.buyRateLabel')}
                  </label>
                  <input
                    id="buy-more-curr-price"
                    type="number"
                    step="any"
                    min="0.01"
                    value={form.purchasePrice}
                    onChange={e => {
                      setForm({ ...form, purchasePrice: e.target.value });
                      if (fieldErrors.purchasePrice) setFieldErrors(prev => ({ ...prev, purchasePrice: null }));
                    }}
                    placeholder="e.g. 49.50"
                    className={`w-full bg-black/30 border rounded-2xl px-4 py-3 text-white text-sm focus:outline-none placeholder:text-white/30 transition-all shadow-inner tabular-nums font-mono ${
                      fieldErrors.purchasePrice ? 'border-[#FF3B30] focus:border-[#FF3B30]' : 'border-white/10 focus:border-emerald-500/60'
                    }`}
                  />
                  {fieldErrors.purchasePrice && (
                    <p className="text-[11px] text-[#FF3B30] mt-1 px-1">{fieldErrors.purchasePrice}</p>
                  )}
                </div>
              </div>

              {/* Real-time Projected Cost & Weighted Average Box */}
              {addQty > 0 && addPrice > 0 && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-200/80 font-medium">{t('investments.additionalCost')}:</span>
                    <span className="font-bold text-emerald-200 tabular-nums">{moneyEGP(additionalCostEGP)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-200/80 font-medium">{t('investments.newTotalHoldings')}:</span>
                    <span className="font-bold text-white tabular-nums">{formatForeign(newTotalQty)}</span>
                  </div>
                  <div className="pt-2 border-t border-emerald-500/20 flex justify-between items-center text-xs font-bold">
                    <span className="text-emerald-200">{t('investments.projectedAvgPrice')}:</span>
                    <span className="font-black text-emerald-200 text-sm tabular-nums font-mono">
                      {moneyEGP(newWeightedAvg)}
                    </span>
                  </div>
                </div>
              )}

              {/* Purchase Date */}
              <div className="w-full min-w-0 max-w-full overflow-hidden">
                <label htmlFor="buy-more-curr-date" className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                  {t('investments.purchaseDate')}
                </label>
                <input
                  id="buy-more-curr-date"
                  type="date"
                  value={form.purchasedAt}
                  onChange={e => setForm({ ...form, purchasedAt: e.target.value })}
                  className="w-full min-w-0 max-w-full block bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/60 transition-all shadow-inner [color-scheme:dark]"
                />
              </div>

              {/* Paid From Account (Optional) */}
              {usableAccounts.length > 0 && (
                <div>
                  <span className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                    {t('investments.paidFromAccount')}
                  </span>
                  <CustomSelect
                    value={form.from_account}
                    onChange={val => setForm({ ...form, from_account: val })}
                    options={[
                      { value: '', label: isRTL ? 'بدون خصم من حساب' : 'Do not deduct' },
                      ...usableAccounts.map(a => ({
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
              disabled={loading}
              className="flex-1 py-3.5 px-5 rounded-full font-semibold text-[13.5px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-[0.98]"
            >
              {t('common.cancel')}
            </button>

            <button
              type="submit"
              form="buy-more-currency-form"
              disabled={loading || !addQty || !addPrice}
              className="flex-1 py-3.5 px-5 rounded-full font-semibold text-[13.5px] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={15} />}
              <span>{t('investments.confirmBuyMore')}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

