import React from 'react';

const TYPE_CONFIG = {
  gain: {
    text: 'text-[#34C759]',
    label: 'text-[#34C759]',
    bg: 'bg-[#34C759]/10',
    border: 'border-[#34C759]/20',
  },
  loss: {
    text: 'text-[#FF3B30]',
    label: 'text-[#FF3B30]',
    bg: 'bg-[#FF3B30]/10',
    border: 'border-[#FF3B30]/20',
  },
  warning: {
    text: 'text-amber-400',
    label: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
  info: {
    text: 'text-blue-400',
    label: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  copper: {
    text: 'text-[#E8C5A8]',
    label: 'text-[#E8C5A8]',
    bg: 'bg-[#8D6346]/15',
    border: 'border-[#8D6346]/30',
  },
  neutral: {
    text: 'text-white/90',
    label: 'text-white/50',
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
};

export const MetricPill = ({
  type = 'neutral',
  label,
  value,
  currency,
  icon = null,
  variant = 'stacked',
  className = '',
  onClick,
}) => {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.neutral;
  const isClickable = typeof onClick === 'function';

  if (variant === 'badge') {
    return (
      <span
        onClick={onClick}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
          border backdrop-blur-sm select-none
          ${config.bg} ${config.border} ${config.text}
          ${isClickable ? 'cursor-pointer hover:opacity-90 active:scale-95 transition-transform' : ''}
          ${className}
        `}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        {label && <span>{label}</span>}
        {value !== undefined && value !== null && (
          <span className="tabular-nums tracking-tight font-bold">{value}</span>
        )}
        {currency && <span className="opacity-70 text-[10px]">{currency}</span>}
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <div
        onClick={onClick}
        className={`
          flex items-center justify-between gap-3 px-3.5 py-2 rounded-[20px]
          bg-white/5 border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.1)]
          select-none
          ${isClickable ? 'cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all' : ''}
          ${className}
        `}
      >
        <div className="flex items-center gap-2">
          {icon && <span className={config.text}>{icon}</span>}
          {label && (
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
              {label}
            </span>
          )}
        </div>
        <div className={`tabular-nums tracking-tight font-bold text-sm ${config.text}`}>
          {value}
          {currency && <span className="text-xs font-normal ms-1 opacity-70">{currency}</span>}
        </div>
      </div>
    );
  }

  // Default: stacked card pill (e.g. Account Card Gain/Loss well)
  return (
    <div
      onClick={onClick}
      className={`
        flex-1 bg-white/5 rounded-[20px] py-2 px-3 flex flex-col items-center justify-center gap-0.5
        shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_2px_4px_rgba(0,0,0,0.1)]
        border border-white/5 select-none
        ${isClickable ? 'cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-all' : ''}
        ${className}
      `}
    >
      <div className="flex items-center gap-1">
        {icon && <span className={`text-[12px] ${config.label}`}>{icon}</span>}
        {label && (
          <span className={`text-[11px] font-semibold tracking-wider uppercase ${config.label}`}>
            {label}
          </span>
        )}
      </div>
      <div className="text-white font-medium text-sm tracking-wide tabular-nums">
        {value}
        {currency && <span className="text-xs font-normal ms-1 opacity-70">{currency}</span>}
      </div>
    </div>
  );
};

export default MetricPill;
