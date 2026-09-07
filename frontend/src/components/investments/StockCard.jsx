import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, TrendingUp, TrendingDown, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function StockCard({ item, onEdit, onDelete }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';

  const formatCurrency = (val, curr = 'EGP') => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: curr || 'EGP',
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
      className="relative bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-4.5 flex flex-col gap-3.5"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0">
            <LineChart size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-white text-sm tracking-tight truncate">{item.name}</h3>
              {item.symbol && (
                <span className="px-2 py-0.2 rounded-md text-[9.5px] font-black bg-blue-500/20 border border-blue-500/35 text-blue-300 uppercase tracking-wider font-mono shrink-0">
                  {item.symbol}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Small Subtle Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onEdit(item)}
            className="w-7 h-7 rounded-lg bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
            aria-label={t('common.edit')}
          >
            <Pencil size={12} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={() => onDelete(item._id)}
            className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 shadow-inner text-red-400 hover:text-red-300 flex items-center justify-center transition-colors"
            aria-label={t('common.delete')}
          >
            <Trash2 size={12} />
          </motion.button>
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
    </motion.div>
  );
}
