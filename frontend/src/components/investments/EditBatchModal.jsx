import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function EditBatchModal({
  isOpen,
  investment,
  batch,
  loading = false,
  onClose,
  onSave,
  onDelete
}) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';
  const qtyInputRef = useRef(null);

  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && batch) {
      setQuantity(String(batch.quantity || ''));
      setPrice(String(batch.price || ''));
      setDate(batch.date ? new Date(batch.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setError('');

      const timer = setTimeout(() => {
        qtyInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, batch]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !loading) {
        e.preventDefault();
        const formEl = document.getElementById('edit-batch-form');
        if (formEl) formEl.requestSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen || !investment || !batch) return null;

  const numQty = Number(quantity) || 0;
  const numPrice = Number(price) || 0;

  // Calculate projected weighted average if this batch is modified
  const otherBatches = (investment.purchases || []).filter(b => b._id !== batch._id);
  const otherQty = otherBatches.reduce((acc, b) => acc + (Number(b.quantity) || 0), 0);
  const otherCost = otherBatches.reduce((acc, b) => acc + ((Number(b.quantity) || 0) * (Number(b.price) || 0)), 0);
  
  const projectedTotalQty = otherQty + numQty;
  const projectedTotalCost = otherCost + (numQty * numPrice);
  const projectedWeightedAvg = projectedTotalQty > 0 
    ? Math.round((projectedTotalCost / projectedTotalQty) * 100) / 100 
    : 0;

  const unit = investment.type === 'gold' 
    ? t('investments.gram') 
    : investment.type === 'stock' 
      ? t('investments.shareUnit') 
      : (investment.symbol || investment.currency || '');

  const curr = investment.currency || 'EGP';

  const money = (val) => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: curr,
    maximumFractionDigits: 2
  }).format(val || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || numQty <= 0 || !price || numPrice <= 0) {
      setError(t('investments.fillAllFields'));
      return;
    }

    try {
      await onSave(investment._id, batch._id, {
        quantity: numQty,
        price: numPrice,
        date
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('investments.saveError'));
    }
  };

  const canDeleteBatch = (investment.purchases?.length || 0) > 1;

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
          aria-labelledby="edit-batch-title"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-[#141115]/95 backdrop-blur-xl rounded-[2.5rem] border border-[#8D6346]/40 shadow-[0_16px_45px_rgba(0,0,0,0.6)] max-h-[90vh] flex flex-col overflow-hidden overflow-x-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Top Hairline Light */}
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#8D6346]/60 to-transparent pointer-events-none" />

          {/* Sticky Header */}
          <div className="sticky top-0 z-20 flex justify-between items-center p-6 border-b border-white/5 bg-[#141115]/90 backdrop-blur-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/35 flex items-center justify-center text-[#E8C5A8] shadow-inner shrink-0">
                <Pencil size={18} />
              </div>
              <div className="min-w-0">
                <h2 id="edit-batch-title" className="text-lg font-bold text-white tracking-wide truncate">
                  {t('investments.editBatch')}
                </h2>
                <p className="text-[11px] text-white/50 font-medium truncate">
                  {investment.name}
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

            <form id="edit-batch-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-batch-qty" className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                    {t('investments.quantity')} ({unit})
                  </label>
                  <input
                    ref={qtyInputRef}
                    id="edit-batch-qty"
                    type="number"
                    step="any"
                    min="0.0001"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#8D6346]/60 transition-all shadow-inner font-mono tabular-nums"
                  />
                </div>

                <div>
                  <label htmlFor="edit-batch-price" className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                    {t('investments.buyPriceUnit')} ({curr})
                  </label>
                  <input
                    id="edit-batch-price"
                    type="number"
                    step="any"
                    min="0.01"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#8D6346]/60 transition-all shadow-inner font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Purchase Date */}
              <div className="w-full min-w-0 max-w-full overflow-hidden">
                <label htmlFor="edit-batch-date" className="text-xs font-semibold text-white/70 block mb-1.5 px-1">
                  {t('investments.purchaseDate')}
                </label>
                <input
                  id="edit-batch-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full min-w-0 max-w-full block bg-black/30 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#8D6346]/60 transition-all shadow-inner [color-scheme:dark]"
                />
              </div>

              {/* Recalculation Preview Card */}
              {numQty > 0 && numPrice > 0 && (
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60 font-medium">{t('investments.totalInitialCost')}:</span>
                    <span className="font-bold text-white tabular-nums">{money(numQty * numPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-white/60 font-medium">{t('investments.newTotalHoldings')}:</span>
                    <span className="font-bold text-white tabular-nums">{projectedTotalQty} {unit}</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs font-bold text-[#E8C5A8]">
                    <span>{t('investments.projectedAvgPrice')}:</span>
                    <span className="font-black text-sm tabular-nums font-mono">{money(projectedWeightedAvg)}</span>
                  </div>
                </div>
              )}

              {/* Delete Batch Option (if multiple batches exist) */}
              {canDeleteBatch && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(t('investments.deleteBatchConfirm'))) {
                        onDelete(investment._id, batch._id);
                      }
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                  >
                    <Trash2 size={13} />
                    <span>{t('investments.deleteBatch')}</span>
                  </button>
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
              form="edit-batch-form"
              disabled={loading || numQty <= 0 || numPrice <= 0}
              className="flex-1 py-3.5 px-5 rounded-full font-semibold text-[13.5px] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={15} />}
              <span>{t('common.saveChanges')}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

