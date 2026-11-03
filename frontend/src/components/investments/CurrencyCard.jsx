import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Banknote, TrendingUp, TrendingDown, Pencil, Trash2, ArrowUpRight, Plus, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function CurrencyCard({ item, liveUsdRate, onEdit, onDelete, onSell, onBuyMore, onEditBatch, onDeleteBatch }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';
  const [showBatches, setShowBatches] = useState(false);

  const moneyEGP = (val) => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0
  }).format(val || 0);

  const formatForeign = (val, curr = 'USD') => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: curr || 'USD',
    maximumFractionDigits: 2
  }).format(val || 0);

  const currCode = item.symbol || item.currency || 'USD';
  const effectiveRate = (currCode === 'USD' && liveUsdRate)
    ? liveUsdRate
    : (item.currentPrice || item.purchasePrice);

  const currentTotalEGP = item.quantity * effectiveRate;
  const initialCostEGP = item.quantity * item.purchasePrice;
  const profitEGP = currentTotalEGP - initialCostEGP;
  const isProfit = profitEGP >= 0;
  const profitPercent = initialCostEGP > 0 ? ((profitEGP / initialCostEGP) * 100).toFixed(1) : 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="relative bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-4.5 flex flex-col gap-3.5"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-300 shrink-0">
            <Banknote size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-white text-sm tracking-tight truncate">{item.name}</h3>
              <span className="px-2 py-0.2 rounded-md text-[9.5px] font-black bg-emerald-500/20 border border-emerald-500/35 text-emerald-300 uppercase tracking-wider font-mono shrink-0">
                {currCode}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onBuyMore(item)}
            className="w-7 h-7 rounded-lg bg-[#8D6346]/20 hover:bg-[#8D6346]/35 border border-[#8D6346]/40 shadow-inner text-[#E8C5A8] hover:text-white flex items-center justify-center transition-colors"
            aria-label={t('investments.buyMore')}
            title={t('investments.buyMore')}
          >
            <Plus size={13} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onSell(item)}
            className="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 shadow-inner text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition-colors"
            aria-label={t('investments.sellAction')}
            title={t('investments.sellAction')}
          >
            <ArrowUpRight size={13} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onEdit(item)}
            className="w-7 h-7 rounded-lg bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
            aria-label={t('common.edit')}
            title={t('common.edit')}
          >
            <Pencil size={12} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onDelete(item._id)}
            className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 shadow-inner text-red-400 hover:text-red-300 flex items-center justify-center transition-colors"
            aria-label={t('common.delete')}
            title={t('common.delete')}
          >
            <Trash2 size={12} />
          </motion.button>
        </div>
      </div>

      {/* Main Valuation & Return */}
      <div className="flex items-baseline justify-between pt-1 border-t border-white/5">
        <div>
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block">
            {t('investments.currentValueEGP')}
          </span>
          <span className="text-xl font-black text-emerald-200 tracking-tight tabular-nums">
            {moneyEGP(currentTotalEGP)}
          </span>
        </div>

        <div className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold flex items-center gap-1 border ${
          isProfit 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/15 border-red-500/30 text-red-300'
        }`}>
          {isProfit ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          <span className="tabular-nums">
            {isProfit ? `+${moneyEGP(profitEGP)}` : moneyEGP(profitEGP)} ({isProfit ? `+${profitPercent}%` : `${profitPercent}%`})
          </span>
        </div>
      </div>

      {/* Minimalist Specs Row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
        <div>
          <span className="text-white/40 block text-[9.5px] font-medium">{t('investments.amountInForeign')}</span>
          <span className="font-bold text-white tabular-nums font-mono">
            {formatForeign(item.quantity, currCode)}
          </span>
        </div>

        <div>
          <span className="text-white/40 block text-[9.5px] font-medium">{t('investments.buyRateLabel')}</span>
          <span className="font-bold text-white/80 tabular-nums">
            {moneyEGP(item.purchasePrice)}
          </span>
        </div>

        <div className="text-end">
          <span className="text-emerald-300/70 block text-[9.5px] font-medium">{t('investments.currentExchangeRate')}</span>
          <span className="font-bold text-emerald-300 tabular-nums">
            {moneyEGP(effectiveRate)}
          </span>
        </div>
      </div>

      {/* Batches Accordion Toggle */}
      {item.purchases && item.purchases.length > 0 && (
        <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowBatches(!showBatches)}
            className="flex items-center justify-between text-[11px] font-semibold text-white/60 hover:text-white/90 transition-colors py-0.5"
          >
            <div className="flex items-center gap-1.5">
              <span>{t('investments.batchesCount', { count: item.purchases.length })}</span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-200 ${showBatches ? 'rotate-180 text-emerald-300' : ''}`} />
          </button>

          <AnimatePresence>
            {showBatches && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden flex flex-col gap-1.5 pt-1"
              >
                {item.purchases.map((batch, idx) => (
                  <div
                    key={batch._id || idx}
                    className="p-2.5 rounded-xl bg-black/25 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-emerald-300 font-mono">
                          #{idx + 1}
                        </span>
                        <span className="text-white font-medium text-[11px] tabular-nums font-mono">
                          {formatForeign(batch.quantity, currCode)}
                        </span>
                        <span className="text-white/40 text-[10px]">@</span>
                        <span className="text-white/80 font-medium text-[11px] tabular-nums font-mono">
                          {moneyEGP(batch.price)}
                        </span>
                      </div>
                      <span className="text-[9.5px] text-white/40">
                        {batch.date ? new Date(batch.date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US') : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditBatch(item, batch)}
                        className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition-colors"
                        title={t('investments.editBatch')}
                      >
                        <Pencil size={10} />
                      </button>
                      {item.purchases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteBatch(item, batch)}
                          className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 flex items-center justify-center transition-colors"
                          title={t('investments.deleteBatch')}
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => onBuyMore(item)}
                  className="mt-1 py-1.5 px-3 rounded-xl bg-[#8D6346]/15 hover:bg-[#8D6346]/25 border border-[#8D6346]/30 text-[#E8C5A8] hover:text-white text-[11px] font-semibold transition-all flex items-center justify-center gap-1"
                >
                  <Plus size={12} />
                  <span>{t('investments.buyMoreCurrency')}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
