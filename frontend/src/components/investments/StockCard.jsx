import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, TrendingUp, TrendingDown, Pencil, Trash2, ArrowUpRight, Plus, ChevronDown, MoreHorizontal } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function StockCard({ item, onEdit, onDelete, onSell, onBuyMore, onEditBatch, onDeleteBatch }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';
  const [showBatches, setShowBatches] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowMenu(false);
    };
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showMenu]);

  const formatCurrency = (val, curr = item.currency || 'EGP') => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: curr,
    maximumFractionDigits: 2
  }).format(val || 0);

  const formatNum = (val) => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 2
  }).format(val || 0);

  const unitPrice = item.currentPrice || item.purchasePrice;
  const currentTotal = item.quantity * unitPrice;
  const initialCost = item.quantity * item.purchasePrice;
  const profit = currentTotal - initialCost;
  const isProfit = profit >= 0;
  const profitPercent = initialCost > 0 ? ((profit / initialCost) * 100).toFixed(1) : 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={`relative bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-4.5 flex flex-col gap-3.5 transition-shadow ${
        showMenu ? 'z-30' : 'z-0'
      }`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0 shadow-inner">
            <LineChart size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-white text-sm tracking-tight truncate">{item.name}</h3>
              {item.symbol && (
                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-blue-500/20 border border-blue-500/35 text-blue-300 uppercase tracking-wider font-mono shrink-0">
                  {item.symbol}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* More Options Dropdown Trigger */}
        <div className="relative shrink-0" ref={menuRef}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={() => setShowMenu(prev => !prev)}
            className="w-7 h-7 rounded-lg bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
            aria-label={t('common.moreOptions') || 'Options'}
            title={t('common.moreOptions') || 'Options'}
          >
            <MoreHorizontal size={15} />
          </motion.button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`absolute top-full mt-1.5 z-40 w-36 py-1.5 rounded-2xl bg-[#1D1715]/95 backdrop-blur-2xl border border-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col ${
                  isRTL ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(item);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors text-start"
                >
                  <Pencil size={12} className="text-[#E8C5A8]" />
                  <span>{t('common.edit')}</span>
                </button>
                <div className="h-px bg-white/5 my-0.5" />
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(item._id);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-start"
                >
                  <Trash2 size={12} className="text-red-400" />
                  <span>{t('common.delete')}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Valuation & Return */}
      <div className="flex items-baseline justify-between pt-1 border-t border-white/5">
        <div>
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider block">
            {t('investments.currentValue')}
          </span>
          <span className="text-xl font-black text-blue-200 tracking-tight tabular-nums">
            {formatCurrency(currentTotal, item.currency)}
          </span>
        </div>

        <div className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold flex items-center gap-1 border ${
          isProfit 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/15 border-red-500/30 text-red-300'
        }`}>
          {isProfit ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          <span className="tabular-nums">
            {isProfit ? `+${formatCurrency(profit, item.currency)}` : formatCurrency(profit, item.currency)} ({isProfit ? `+${profitPercent}%` : `${profitPercent}%`})
          </span>
        </div>
      </div>

      {/* Minimalist Specs Row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
        <div>
          <span className="text-white/40 block text-[9.5px] font-medium">{t('investments.sharesCount')}</span>
          <span className="font-bold text-white tabular-nums font-mono">
            {formatNum(item.quantity)} <span className="text-[9px] font-normal text-white/50">{t('investments.shareUnit')}</span>
          </span>
        </div>

        <div>
          <span className="text-white/40 block text-[9.5px] font-medium">{t('investments.avgBuyPrice')}</span>
          <span className="font-bold text-white/80 tabular-nums">
            {formatCurrency(item.purchasePrice, item.currency)}
          </span>
        </div>

        <div className="text-end">
          <span className="text-blue-300/70 block text-[9.5px] font-medium">{t('investments.currentSharePrice')}</span>
          <span className="font-bold text-blue-300 tabular-nums">
            {formatCurrency(unitPrice, item.currency)}
          </span>
        </div>
      </div>

      {/* Dual Trading Action Capsule */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => onBuyMore(item)}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#8D6346]/20 hover:bg-[#8D6346]/35 border border-[#8D6346]/40 text-[#E8C5A8] hover:text-white text-xs font-bold shadow-sm transition-all"
        >
          <Plus size={14} className="shrink-0" />
          <span>{t('investments.buyMore')}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.96 }}
          type="button"
          onClick={() => onSell(item)}
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-xs font-bold shadow-sm transition-all"
        >
          <ArrowUpRight size={14} className="shrink-0" />
          <span>{t('investments.sellAction')}</span>
        </motion.button>
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
            <ChevronDown size={14} className={`transition-transform duration-200 ${showBatches ? 'rotate-180 text-blue-300' : ''}`} />
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
                        <span className="text-[10px] font-bold text-blue-300 font-mono">
                          #{idx + 1}
                        </span>
                        <span className="text-white font-medium text-[11px] tabular-nums font-mono">
                          {formatNum(batch.quantity)} {t('investments.shareUnit')}
                        </span>
                        <span className="text-white/40 text-[10px]">@</span>
                        <span className="text-white/80 font-medium text-[11px] tabular-nums font-mono">
                          {formatCurrency(batch.price, item.currency)}
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
                  <span>{t('investments.buyMoreStock')}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
