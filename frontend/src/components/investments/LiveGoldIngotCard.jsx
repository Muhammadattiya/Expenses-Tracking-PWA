import React from 'react';
import { Coins } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LiveGoldIngotCard({ gold }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';

  const formatPrice = (val) => new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-US', {
    maximumFractionDigits: 0
  }).format(val || 0);

  if (!gold) return null;

  const p24 = gold.perGram24 || 0;
  const p21 = gold.perGram21 || (p24 * 21 / 24);
  const p18 = gold.perGram18 || (p24 * 18 / 24);
  const usdRate = gold.usdToEgp;

  return (
    <div 
      className="relative w-full bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-4.5 mb-5 select-none transition-all"
      dir={isRTL ? 'rtl' : 'ltr'}
    >

      {/* Header: Recessed Live Indicator */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/[0.12] border border-amber-500/25 flex items-center justify-center text-amber-300 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
            <Coins size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-['Exo_2'] font-bold text-[15px] text-white tracking-tight">
                {isRTL ? 'أسعار الذهب اللحظية' : 'Live Gold Prices'}
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,199,89,0.9)]" />
            </div>
            <span className="font-['Exo_2'] font-bold uppercase text-[11px] tracking-wide text-white/50 block mt-0.5">
              {isRTL ? 'تحديث فوري بالجنيه المصري' : 'Real-time market rates in EGP'}
            </span>
          </div>
        </div>

        {/* Recessed USD Currency Pill */}
        {usdRate && (
          <div className="px-2.5 py-1 rounded-xl flex items-center gap-1.5 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner">
            <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">USD</span>
            <span className="text-xs font-bold text-amber-200/90 tabular-nums font-mono">
              {usdRate.toFixed(2)} EGP
            </span>
          </div>
        )}
      </div>

      {/* Sunken Karat Chambers (24K, 21K, 18K) */}
      <div className="relative z-10 grid grid-cols-3 gap-2.5 pt-3.5">
        {/* 24K Chamber */}
        <div className="p-2.5 sm:p-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-2xl flex flex-col items-center justify-center text-center">
          <span className="text-[10.5px] font-bold text-white/50 tracking-wider uppercase mb-1">
            {isRTL ? 'عيار 24' : '24K (999)'}
          </span>
          <span className="text-[16px] sm:text-[17px] font-black text-amber-300 tabular-nums font-mono leading-tight">
            {formatPrice(p24)}
          </span>
          <span className="text-[9.5px] text-white/40 font-medium mt-1">
            {isRTL ? 'ج.م / جرام' : 'EGP / g'}
          </span>
        </div>

        {/* 21K Chamber (Prominent Benchmark) */}
        <div className="p-2.5 sm:p-3 bg-[rgba(141,99,70,0.2)] backdrop-blur-[10px] border border-white/10 shadow-inner rounded-2xl flex flex-col items-center justify-center text-center">
          <span className="text-[10.5px] font-black text-amber-200 tracking-wider uppercase mb-1">
            {isRTL ? 'عيار 21' : '21K (875)'}
          </span>
          <span className="text-[17px] sm:text-[18px] font-black text-white tabular-nums font-mono leading-tight drop-shadow-sm">
            {formatPrice(p21)}
          </span>
          <span className="text-[9.5px] text-amber-200/60 font-medium mt-1">
            {isRTL ? 'ج.م / جرام' : 'EGP / g'}
          </span>
        </div>

        {/* 18K Chamber */}
        <div className="p-2.5 sm:p-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-2xl flex flex-col items-center justify-center text-center">
          <span className="text-[10.5px] font-bold text-white/50 tracking-wider uppercase mb-1">
            {isRTL ? 'عيار 18' : '18K (750)'}
          </span>
          <span className="text-[16px] sm:text-[17px] font-black text-amber-300 tabular-nums font-mono leading-tight">
            {formatPrice(p18)}
          </span>
          <span className="text-[9.5px] text-white/40 font-medium mt-1">
            {isRTL ? 'ج.م / جرام' : 'EGP / g'}
          </span>
        </div>
      </div>
    </div>
  );
}
