import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';

const CustomTooltip = ({ active, payload, label, lang, t }) => {
  if (!active || !payload || payload.length === 0) return null;

  const money = (val) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  const inflow = payload.find(p => p.dataKey === 'inflow')?.value || 0;
  const outflow = payload.find(p => p.dataKey === 'outflow')?.value || 0;
  const net = inflow - outflow;

  return (
    <div className="bg-[#141115]/95 backdrop-blur-[32px] border border-white/10 rounded-2xl p-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] min-w-[170px] text-xs">
      <div className="font-bold text-white/70 mb-2 border-b border-white/10 pb-1 text-center">
        {label}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {t ? t('planning.savings.chartInflow') : (lang === 'ar' ? 'وارد (إيداع)' : 'Inflow (In)')}
          </span>
          <span className="font-bold text-emerald-400 tabular-nums">{money(inflow)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-rose-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            {t ? t('planning.savings.chartOutflow') : (lang === 'ar' ? 'صادر (سحب)' : 'Outflow (Out)')}
          </span>
          <span className="font-bold text-rose-400 tabular-nums">{money(outflow)}</span>
        </div>
        <div className="pt-1.5 mt-1.5 border-t border-white/10 flex items-center justify-between gap-3">
          <span className="text-white/60 font-medium">{t ? t('planning.savings.chartNet') : (lang === 'ar' ? 'الصافي' : 'Net')}</span>
          <span className={`font-black tabular-nums ${net >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
            {net >= 0 ? `+${money(net)}` : money(net)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function SavingsCashFlowChart({ data = [] }) {
  const { t, lang } = useLanguage();

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-52 flex items-center justify-center text-white/40 text-xs">
        {t('planning.savings.noActivity') || 'No cash flow data available'}
      </div>
    );
  }

  return (
    <div className="w-full h-56 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="savingsInflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34C759" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#34C759" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="savingsOutflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF3B30" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#FF3B30" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
          
          <XAxis 
            dataKey="monthLabel" 
            stroke="rgba(255,255,255,0.35)" 
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          
          <YAxis 
            stroke="rgba(255,255,255,0.35)" 
            fontSize={10}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
          />

          <Tooltip content={<CustomTooltip lang={lang} t={t} />} />

          <Area 
            type="monotone" 
            dataKey="inflow" 
            stroke="#34C759" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#savingsInflowGrad)" 
            name="Inflow"
          />

          <Area 
            type="monotone" 
            dataKey="outflow" 
            stroke="#FF3B30" 
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={1} 
            fill="url(#savingsOutflowGrad)" 
            name="Outflow"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
