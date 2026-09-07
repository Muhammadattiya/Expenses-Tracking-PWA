import React from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, TrendingDown, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function GoldCard({ item, liveGoldRate, onEdit, onDelete }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';

  const money = (val) => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0
  }).format(val || 0);

  const formatNum = (val) => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 2
  }).format(val || 0);

  const unitRate = liveGoldRate || item.currentPrice || item.purchasePrice;
  const currentTotal = item.quantity * unitRate;
  const initialCost = item.quantity * item.purchasePrice;
  const profit = currentTotal - initialCost;
  const isProfit = profit >= 0;
  const profitPercent = initialCost > 0 ? ((profit / initialCost) * 100).toFixed(1) : 0;

  const karat = item.karat || 24;
  const purityLabel = karat === 24 ? '999.9' : karat === 21 ? '875' : '750';

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
          <div className="w-7 h-7 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
            <Coins size={14} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-white text-sm tracking-tight truncate">{item.name}</h3>
              <span className="px-2 py-0.2 rounded-md text-[9.5px] font-black bg-amber-500/20 border border-amber-500/35 text-amber-300 uppercase tracking-wider font-mono shrink-0">
                {karat}K • {purityLabel}
              </span>
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
          <span className="text-xl font-black text-amber-300 tracking-tight tabular-nums">
            {money(currentTotal)}
          </span>
        </div>

        <div className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold flex items-center gap-1 border ${
          isProfit 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/15 border-red-500/30 text-red-300'
        }`}>
          {isProfit ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          <span className="tabular-nums">
            {isProfit ? `+${money(profit)}` : money(profit)} ({isProfit ? `+${profitPercent}%` : `${profitPercent}%`})
          </span>
        </div>
      </div>

      {/* Minimalist Specs Row */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
        <div>
          <span className="text-white/40 block text-[9.5px] font-medium">{t('investments.weightGrams')}</span>
          <span className="font-bold text-white tabular-nums font-mono">
            {formatNum(item.quantity)} <span className="text-[9px] font-normal text-white/50">{t('investments.gram')}</span>
          </span>
        </div>

        <div>
          <span className="text-white/40 block text-[9.5px] font-medium">{t('investments.buyRatePerGram')}</span>
          <span className="font-bold text-white/80 tabular-nums">
            {money(item.purchasePrice)}
          </span>
        </div>

        <div className="text-end">
          <span className="text-amber-400/70 block text-[9.5px] font-medium">{t('investments.liveRatePerGram')}</span>
          <span className="font-bold text-amber-300 tabular-nums">
            {money(unitRate)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
