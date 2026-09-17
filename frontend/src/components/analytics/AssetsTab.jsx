import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { TrendingUp, Diamond, Building, Briefcase, Coins, Plus } from 'lucide-react';
import { getMetricFontSize, metricFlow } from '../../utils/metricFontSize';

function AssetsTabComponent({ investments = [], money }) {
  const { t } = useLanguage();

  const { totalInvestments, totalCost, totalProfit, profitPercentage } = useMemo(() => {
    let currentValSum = 0;
    let costSum = 0;

    (investments || []).forEach(inv => {
      currentValSum += (inv.currentValue || 0);
      costSum += (inv.amount || 0);
    });

    const profit = currentValSum - costSum;
    const pct = costSum > 0 ? (profit / costSum) * 100 : 0;

    return {
      totalInvestments: currentValSum,
      totalCost: costSum,
      totalProfit: profit,
      profitPercentage: pct
    };
  }, [investments]);

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'gold': return <Diamond size={20} />;
      case 'real_estate': return <Building size={20} />;
      case 'stocks': return <TrendingUp size={20} />;
      case 'crypto': return <Coins size={20} />;
      default: return <Briefcase size={20} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'gold': return '#F59E0B'; // Brand Amber
      case 'real_estate': return '#E8C5A8'; // Copper Light
      case 'stocks': return '#8D6346'; // Copper Brown
      case 'crypto': return '#34C759'; // Brand Green
      default: return '#8D6346';
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      
      {/* Hero Summary */}
      <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-center relative overflow-hidden group">
        <div className="absolute top-0 end-0 p-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
          <TrendingUp className="w-32 h-32 text-[#8D6346]" />
        </div>
        
        <div className="relative z-10 text-center md:text-start mb-6 md:mb-0">
          <p className="text-xs md:text-sm font-bold ltr:tracking-wider ltr:uppercase rtl:tracking-normal mb-1.5 text-white/70">{t('analytics.overview.investments')}</p>
          <p className={`${getMetricFontSize(money(totalInvestments), { hero: true })} font-black tabular-nums tracking-tight min-w-0 break-all text-white mb-1.5 drop-shadow-sm`}>{money(totalInvestments)}</p>
          <p className="text-xs sm:text-sm text-white/60 mb-3.5 leading-relaxed">{t('analytics.assets.portfolioDesc')}</p>
          
          {totalCost > 0 && (
            <div className={`flex items-center gap-2 justify-center md:justify-start flex-wrap ${totalProfit >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
               <span className={`font-bold ${metricFlow}`}>{totalProfit >= 0 ? '+' : ''}{money(totalProfit)}</span>
               <span className={`text-xs sm:text-sm font-bold px-2.5 py-0.5 rounded-lg tabular-nums tracking-tight border ${totalProfit >= 0 ? 'bg-[#34C759]/15 border-[#34C759]/20' : 'bg-[#FF3B30]/15 border-[#FF3B30]/20'}`}>{totalProfit >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Investments */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {investments?.length ? investments.map((inv) => {
          const isProfit = inv.currentValue >= inv.amount;
          const diff = inv.currentValue - inv.amount;
          const pct = inv.amount > 0 ? (diff / inv.amount) * 100 : 0;
          const color = getTypeColor(inv.type);
          
          return (
            <div className="bg-[#2B2321]/30 backdrop-blur-[32px] p-5 rounded-[1.5rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-[#8D6346]/40 hover:shadow-[0_8px_32px_rgba(141,99,70,0.15)] transition-all duration-300 group flex flex-col gap-4 h-full justify-between relative overflow-hidden" key={inv._id}>
              {/* Type Glow */}
              <div 
                className="absolute top-0 end-0 w-24 h-24 rtl:rounded-br-[100px] ltr:rounded-bl-[100px] -z-10 opacity-10 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
              <div className="flex justify-between items-start gap-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div 
                    className="w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 shadow-lg"
                    style={{ backgroundColor: `${color}20`, color: color }}
                  >
                    {getTypeIcon(inv.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm md:text-base truncate leading-tight" title={inv.name}>{inv.name}</p>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-white/70 ltr:uppercase ltr:tracking-wider rtl:tracking-normal mt-1 inline-block whitespace-nowrap">
                      {inv.type === 'gold' ? t('investments.gold') : inv.type === 'stocks' ? t('investments.stocks') : inv.type === 'real_estate' ? t('investments.real_estate') : inv.type === 'crypto' ? t('investments.crypto') : inv.type}
                    </span>
                  </div>
                </div>
                
                <div className="text-end min-w-0 max-w-[50%]">
                  <p className={`${getMetricFontSize(money(inv.currentValue), { compact: true })} ${metricFlow} font-black text-white`}>{money(inv.currentValue)}</p>
                  
                  {inv.amount > 0 && inv.currentValue !== inv.amount && (
                    <div className={`flex items-center justify-end gap-1 mt-1 flex-wrap ${isProfit ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                      <span className={`text-[11px] font-bold ${metricFlow}`}>{isProfit ? '+' : ''}{money(diff)}</span>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums tracking-tight border ${isProfit ? 'bg-[#34C759]/15 border-[#34C759]/20' : 'bg-[#FF3B30]/15 border-[#FF3B30]/20'}`}>{isProfit ? '+' : ''}{pct.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-16 text-center flex flex-col items-center justify-center bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6">
            <div className="w-12 h-12 rounded-2xl bg-[#8D6346]/10 border border-[#8D6346]/20 flex items-center justify-center text-[#8D6346] mb-3">
              <TrendingUp size={24} />
            </div>
            <p className="text-[var(--color-text-muted)] text-sm max-w-md mb-5 leading-relaxed">{t('analytics.assets.noInvestments')}</p>
            <Link 
              to="/investments"
              className="px-5 py-2.5 rounded-xl bg-[#8D6346] hover:bg-[#8D6346]/90 text-white font-bold text-xs shadow-lg shadow-[#8D6346]/30 border border-[#E8C5A8]/20 transition-all inline-flex items-center gap-2 min-h-[44px] active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]"
            >
              <Plus size={14} />
              <span>{t('analytics.assets.addInvestment')}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(AssetsTabComponent);
