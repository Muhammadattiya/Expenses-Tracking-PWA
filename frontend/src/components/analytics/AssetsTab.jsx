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
      <div className="glass-panel p-8 flex flex-col md:flex-row justify-between items-center rounded-[2rem] shadow-2xl border border-white/5 bg-gradient-to-br from-brand-blue/20 to-black/40 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
          <TrendingUp className="w-32 h-32 text-brand-blue" />
        </div>
        
        <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
          <p className="text-sm font-bold tracking-widest uppercase mb-2 text-[var(--color-text-main)] opacity-70">{t('nav.investments', 'Investments Portfolio')}</p>
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
            <div className="bg-black/40 p-6 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden" key={inv._id}>
              {/* Type Glow */}
              <div 
                className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100px] -z-10 opacity-20 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
              />
              
              <div className="flex justify-between items-start mb-6">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `${color}20`, color: color }}
                >
                  {getTypeIcon(inv.type)}
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[var(--color-text-muted)] uppercase tracking-wider">
                  {inv.type}
                </span>
              </div>
              
              <div>
                <p className="font-bold text-lg text-[var(--color-text-main)] mb-1">{inv.name}</p>
                <div className="flex items-end justify-between mt-4">
                  <span className="text-2xl font-black tabular-nums tracking-tight text-white">{money(inv.currentValue)}</span>
                </div>
                
                {inv.amount > 0 && inv.currentValue !== inv.amount && (
                  <div className={`flex items-center gap-2 mt-3 ${isProfit ? 'text-brand-green' : 'text-brand-red'}`}>
                    <span className="text-sm font-bold">{isProfit ? '+' : ''}{money(diff)}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-white/5 rounded-md">{isProfit ? '+' : ''}{pct.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-12 text-center">
            <p className="text-[var(--color-text-muted)]">{t('analytics.noData', 'No data')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
