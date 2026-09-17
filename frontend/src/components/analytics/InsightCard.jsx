import React from 'react';
import { getMetricFontSize } from '../../utils/metricFontSize';

const COLOR_MAP = {
  'brand-blue': 'text-[#8D6346]',
  'brand-purple': 'text-[#E8C5A8]',
  'brand-green': 'text-[#34C759]',
  'brand-red': 'text-[#FF3B30]',
  'brand-amber': 'text-[#F59E0B]',
  copper: 'text-[#E8C5A8]',
  emerald: 'text-[#34C759]',
  rose: 'text-[#FF3B30]',
};

function InsightCard({ title, icon: Icon, value, subtitle, highlight, color = 'copper' }) {
  const textColor = COLOR_MAP[color] || (color.startsWith('text-') ? color : 'text-[#E8C5A8]');

  return (
    <div className="relative overflow-hidden p-4 md:p-6 bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] group hover:border-[#8D6346]/30 hover:shadow-[0_8px_32px_rgba(141,99,70,0.15)] transition-all duration-500 motion-reduce:transition-none flex flex-col justify-between min-h-[140px] min-w-0">
      <div className="absolute top-0 end-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-700 motion-reduce:transition-none pointer-events-none">
        <Icon className="w-12 h-12 md:w-24 md:h-24 text-[#8D6346]" />
      </div>
      <div className="relative z-10 flex flex-col h-full justify-between min-w-0">
        <p className="text-xs md:text-sm font-bold ltr:tracking-wider ltr:uppercase rtl:tracking-normal mb-3 text-white/70">{title}</p>
        <div className="min-w-0">
          <p
            title={typeof value === 'string' ? value : undefined}
            className={`${getMetricFontSize(value)} font-black tabular-nums tracking-tight min-w-0 break-all ${textColor}`}
          >
            {value}
          </p>
          {(subtitle || highlight) && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {highlight && (
                <span className="text-[11px] md:text-xs font-semibold px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-white/80 ltr:uppercase ltr:tracking-wider rtl:tracking-normal max-w-full truncate">
                  {highlight}
                </span>
              )}
              {subtitle && <span className="text-xs text-white/60 leading-tight">{subtitle}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(InsightCard);
