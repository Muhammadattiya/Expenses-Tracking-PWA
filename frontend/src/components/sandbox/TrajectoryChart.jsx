import React from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, ReferenceLine, CartesianGrid 
} from 'recharts';
import { Shield, TrendingDown, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function TrajectoryChart({ 
  projection, 
  horizonMonths = 6, 
  onHorizonChange = null 
}) {
  const { t, lang } = useLanguage();

  const money = (val) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  if (!projection || !projection.monthlyPoints || projection.monthlyPoints.length === 0) {
    return (
      <div className="w-full h-72 rounded-[2.5rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 p-6 flex flex-col items-center justify-center text-center">
        <Shield size={36} className="text-[#8D6346]/60 mb-2" />
        <p className="text-white/60 text-sm font-medium">
          {t('sandbox.noProjectionData')}
        </p>
      </div>
    );
  }

  const data = projection.monthlyPoints.map((pt) => ({
    ...pt,
    displayLabel: lang === 'ar' ? pt.labelAr : pt.labelEn
  }));

  const safetyFloor = projection.safetyFloor || 0;
  const isBreached = projection.breachedFloor;

  // Custom Glass Tooltip (Pure CSS Backdrop Blur)
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const pt = payload[0].payload;
    const delta = pt.simulatedBalance - pt.baselineBalance;
    const isUnderFloor = pt.simulatedBalance < safetyFloor;

    return (
      <div className="bg-[#1A1617]/90 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 shadow-2xl min-w-[200px] text-xs">
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-white/10">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Calendar size={13} className="text-[#E8C5A8]" />
            {pt.displayLabel}
          </span>
          {isUnderFloor && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <AlertTriangle size={10} />
              {t('sandbox.floorBreached')}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-white/70">
            <span>{t('sandbox.simulatedBalance')}:</span>
            <span className="font-bold text-white tabular-nums">{money(pt.simulatedBalance)}</span>
          </div>

          <div className="flex items-center justify-between text-white/50">
            <span>{t('sandbox.baselineBalance')}:</span>
            <span className="font-bold tabular-nums">{money(pt.baselineBalance)}</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <span className="text-white/60">{t('sandbox.delta')}:</span>
            <span className={`font-black tabular-nums ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {delta > 0 ? '+' : ''}{money(delta)}
            </span>
          </div>

          {safetyFloor > 0 && (
            <div className="flex items-center justify-between text-[11px] text-amber-300/80">
              <span>{t('emergencyFund.shieldTitle')}:</span>
              <span className="font-bold tabular-nums">{money(safetyFloor)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full rounded-[2.5rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
      {/* Header with Horizon Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <Shield size={18} className={isBreached ? 'text-amber-400' : 'text-[#8D6346]'} />
            {t('sandbox.trajectoryTitle')}
          </h4>
          <p className="text-xs text-white/50 mt-0.5">
            {t('sandbox.trajectoryDesc')}
          </p>
        </div>

        {/* Horizon Tabs (3, 6, 12 Months) */}
        {onHorizonChange && (
          <div className="flex items-center gap-1 p-1 bg-black/30 rounded-2xl border border-white/5 w-fit">
            {[3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => onHorizonChange(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  horizonMonths === m
                    ? 'bg-[#8D6346] text-white shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {m} {t('common.months') || (lang === 'ar' ? 'أشهر' : 'months')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Trajectory Graph Container */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {/* Simulated Balance Gradient */}
              <linearGradient id="simulatedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isBreached ? "#F59E0B" : "#8D6346"} stopOpacity={0.4} />
                <stop offset="95%" stopColor={isBreached ? "#F59E0B" : "#8D6346"} stopOpacity={0.0} />
              </linearGradient>
              {/* Baseline Balance Gradient */}
              <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E8C5A8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#E8C5A8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

            <XAxis 
              dataKey="displayLabel" 
              stroke="rgba(255,255,255,0.4)" 
              fontSize={11} 
              tickLine={false} 
            />
            <YAxis 
              stroke="rgba(255,255,255,0.4)" 
              fontSize={10} 
              tickLine={false} 
              tickFormatter={(v) => `${Math.round(v / 1000)}k`} 
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Safety Floor Reference Line */}
            {safetyFloor > 0 && (
              <ReferenceLine 
                y={safetyFloor} 
                stroke="#F59E0B" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
                label={{ 
                  value: `${t('emergencyFund.shieldTitle')} (${Math.round(safetyFloor / 1000)}k)`, 
                  fill: '#F59E0B', 
                  fontSize: 10,
                  position: 'insideTopRight'
                }} 
              />
            )}

            {/* Baseline Path */}
            <Area
              type="monotone"
              dataKey="baselineBalance"
              stroke="#E8C5A8"
              strokeWidth={2}
              strokeDasharray="4 2"
              fillOpacity={1}
              fill="url(#baselineGradient)"
              name={t('sandbox.baselineBalance')}
            />

            {/* Simulated Path */}
            <Area
              type="monotone"
              dataKey="simulatedBalance"
              stroke={isBreached ? "#F59E0B" : "#8D6346"}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#simulatedGradient)"
              name={t('sandbox.simulatedBalance')}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Summary Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-white/5 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-white/70">
            <span className="w-3 h-1 rounded-full bg-[#8D6346]" />
            <span>{t('sandbox.simulatedBalance')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/50">
            <span className="w-3 h-1 rounded-full bg-[#E8C5A8] border border-dashed border-white/40" />
            <span>{t('sandbox.baselineBalance')}</span>
          </div>
          {safetyFloor > 0 && (
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
              <span>{t('emergencyFund.shieldTitle')}</span>
            </div>
          )}
        </div>

        {/* Breach Alert Pill */}
        {isBreached ? (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <AlertTriangle size={13} />
            <span>
              {t('sandbox.breachNotice', { percent: projection.floorBreachPercent })}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <Shield size={13} />
            <span>{t('sandbox.shieldProtected')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
