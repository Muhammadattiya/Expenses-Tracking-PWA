import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { TrendingUp, Diamond, Building, Briefcase } from 'lucide-react';

export default function AssetsTab({ investments, money }) {
  const { t } = useLanguage();

  const totalInvestments = investments?.reduce((sum, inv) => sum + (inv.currentValue || 0), 0) || 0;
  const totalCost = investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;
  const totalProfit = totalInvestments - totalCost;
  const profitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'gold': return <Diamond size={20} />;
      case 'real_estate': return <Building size={20} />;
      default: return <Briefcase size={20} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'gold': return '#fbbf24'; // amber-400
      case 'real_estate': return '#10b981'; // emerald-500
      default: return '#3b82f6'; // blue-500
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      
      {/* Hero Summary */}
      <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 flex flex-col md:flex-row justify-between items-center rounded-[2rem] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
          <TrendingUp className="w-32 h-32 text-brand-blue" />
        </div>
        
        <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
          <p className="text-sm font-bold tracking-widest uppercase mb-2 text-[var(--color-text-main)] opacity-70">{t('nav.investments')}</p>
          <p className="text-5xl font-black tabular-nums tracking-tight text-white mb-2">{money(totalInvestments)}</p>
          
          {totalCost > 0 && (
            <div className={`flex items-center gap-2 justify-center md:justify-start ${totalProfit >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
               <span className="font-bold">{totalProfit >= 0 ? '+' : ''}{money(totalProfit)}</span>
               <span className="text-sm px-2 py-0.5 bg-white/10 rounded-lg">{totalProfit >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}%</span>
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
            <div className="bg-[#2B2321]/30 backdrop-blur-[32px] p-5 rounded-[1.5rem] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/5 transition-all duration-300 group flex flex-col gap-4 h-full justify-between relative overflow-hidden" key={inv._id}>
              {/* Type Glow */}
              <div 
                className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100px] -z-10 opacity-10 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 flex items-center justify-center rounded-2xl shrink-0 shadow-lg"
                    style={{ backgroundColor: `${color}20`, color: color }}
                  >
                    {getTypeIcon(inv.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--color-text-main)] text-sm md:text-base truncate max-w-[120px] sm:max-w-[150px] leading-tight" title={inv.name}>{inv.name}</p>
                    <span className="text-[9px] md:text-[10px] font-bold px-2 py-0.5 bg-white/5 border border-white/5 rounded-md text-[var(--color-text-muted)] uppercase mt-1 inline-block whitespace-nowrap">
                      {inv.type === 'gold' ? t('investments.gold') : inv.type === 'stocks' ? t('investments.stocks') : inv.type === 'real_estate' ? t('investments.real_estate') : inv.type === 'crypto' ? t('investments.crypto') : inv.type}
                    </span>
                  </div>
                </div>
                
                <div className="text-right shrink-0 ml-2">
                  <p className="text-lg md:text-xl font-black tabular-nums tracking-tight text-white">{money(inv.currentValue)}</p>
                  
                  {inv.amount > 0 && inv.currentValue !== inv.amount && (
                    <div className={`flex items-center justify-end gap-1 mt-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span className="text-[10px] font-bold">{isProfit ? '+' : ''}{money(diff)}</span>
                      <span className="text-[9px] px-1 py-0.5 bg-white/5 rounded-md">{isProfit ? '+' : ''}{pct.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-12 text-center">
            <p className="text-[var(--color-text-muted)]">{t('analytics.noData')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
