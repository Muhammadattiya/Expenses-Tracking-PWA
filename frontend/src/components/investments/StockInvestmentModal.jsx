import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LineChart, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';
import { getAccounts } from '../../api/accounts';

export default function StockInvestmentModal({ isOpen, onClose, onSave, initialData = null }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';

  const [form, setForm] = useState({
    type: 'stock',
    name: '',
    symbol: '',
    currency: 'EGP',
    quantity: '',
    purchasePrice: '',
    currentPrice: '',
    from_account: '',
    purchasedAt: new Date().toISOString().split('T')[0]
  });

  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getAccounts().then(accs => setAccounts(accs.filter(a => !a.isArchived))).catch(console.error);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          type: 'stock',
          name: initialData.name || '',
          symbol: initialData.symbol || '',
          currency: initialData.currency || 'EGP',
          quantity: initialData.quantity || '',
          purchasePrice: initialData.purchasePrice || '',
          currentPrice: initialData.currentPrice || initialData.purchasePrice || '',
          from_account: initialData.from_account || '',
          purchasedAt: initialData.purchasedAt ? new Date(initialData.purchasedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        });
      } else {
        setForm({
          type: 'stock',
          name: '',
          symbol: '',
          currency: 'EGP',
          quantity: '',
          purchasePrice: '',
          currentPrice: '',
          from_account: '',
          purchasedAt: new Date().toISOString().split('T')[0]
        });
      }
      setError('');
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.quantity || !form.purchasePrice) {
      setError(t('investments.fillAllFields'));
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onSave({
        ...form,
        quantity: Number(form.quantity),
        purchasePrice: Number(form.purchasePrice),
        currentPrice: form.currentPrice ? Number(form.currentPrice) : Number(form.purchasePrice),
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
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md liquidglass rounded-[2.5rem] p-6 border border-blue-500/25 shadow-[0_16px_45px_rgba(0,0,0,0.6)] max-h-[90vh] overflow-y-auto hide-scrollbar flex flex-col gap-5"
          onClick={e => e.stopPropagation()}
        >
          {/* Top Hairline Light */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-blue-400/40 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/35 flex items-center justify-center text-blue-400 shadow-inner">
                <LineChart size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  {initialData ? t('investments.editStock') : t('investments.addStock')}
                </h2>
                <p className="text-[11px] text-blue-200/60 font-medium">
                  {t('investments.stocksSubtitle')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95"
            >
              <X size={15} />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Stock Name & Ticker Symbol */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                  {t('investments.stockName')}
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder={isRTL ? 'مثال: البنك التجاري الدولي' : 'e.g. Apple Inc.'}
                  className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60 placeholder:text-white/30 transition-all shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                  {t('investments.symbol')}
                </label>
                <input
                  type="text"
                  value={form.symbol}
                  onChange={e => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                  className="w-full bg-black/30 border border-white/10 rounded-2xl px-3 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60 placeholder:text-white/30 transition-all shadow-inner uppercase font-mono font-bold"
                />
              </div>
            </div>

            {/* Currency Pill Selection */}
            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                {t('investments.currencyLabel')}
              </label>
              <div className="grid grid-cols-4 gap-2 p-1 rounded-2xl bg-black/40 border border-white/10">
                {['EGP', 'USD', 'EUR', 'SAR'].map(curr => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setForm({ ...form, currency: curr })}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                      form.currency === curr
                        ? 'bg-blue-500/30 border border-blue-500/50 text-blue-200 shadow-[0_2px_10px_rgba(59,130,246,0.2)]'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* Shares Count & Purchase Price per Share */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                  {t('investments.sharesCount')}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })}
                  placeholder="e.g. 50"
                  className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60 placeholder:text-white/30 transition-all shadow-inner tabular-nums font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                  {t('investments.buyPricePerShare')}
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={form.purchasePrice}
                  onChange={e => setForm({ ...form, purchasePrice: e.target.value })}
                  placeholder="e.g. 180"
                  className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60 placeholder:text-white/30 transition-all shadow-inner tabular-nums font-mono"
                />
              </div>
            </div>

            {/* Current Price per Share (Optional) */}
            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                {t('investments.currentSharePriceOptional')}
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                value={form.currentPrice}
                onChange={e => setForm({ ...form, currentPrice: e.target.value })}
                placeholder={form.purchasePrice || 'e.g. 195'}
                className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60 placeholder:text-white/30 transition-all shadow-inner tabular-nums font-mono"
              />
            </div>

            {/* Total Cost Preview */}
            {form.quantity && form.purchasePrice && (
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex justify-between items-center">
                <span className="text-xs text-blue-200/80 font-medium">
                  {t('investments.totalInitialCost')}:
                </span>
                <span className="text-sm font-black text-blue-200 tabular-nums">
                  {(Number(form.quantity) * Number(form.purchasePrice)).toLocaleString(isRTL ? 'ar-EG' : 'en-US')} {form.currency}
                </span>
              </div>
            )}

            {/* Purchase Date */}
            <div>
              <label className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                {t('investments.purchaseDate')}
              </label>
              <input
                type="date"
                value={form.purchasedAt}
                onChange={e => setForm({ ...form, purchasedAt: e.target.value })}
                className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/60 transition-all shadow-inner"
              />
            </div>

            {/* Paid From Account (Optional) */}
            {!initialData && accounts.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                  {t('investments.paidFromAccount')}
                </label>
                <CustomSelect
                  value={form.from_account}
                  onChange={val => setForm({ ...form, from_account: val })}
                  options={[
                    { value: '', label: isRTL ? 'بدون خصم من حساب' : 'Do not deduct' },
                    ...accounts.map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))
                  ]}
                  placeholder={isRTL ? 'اختر الحساب...' : 'Select account...'}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-3 px-5 rounded-full font-semibold text-[13.5px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all active:scale-[0.98]"
              >
                {t('common.cancel')}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-5 rounded-full font-semibold text-[13.5px] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <LineChart size={15} />}
                <span>{initialData ? t('common.saveChanges') : t('investments.saveStock')}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
