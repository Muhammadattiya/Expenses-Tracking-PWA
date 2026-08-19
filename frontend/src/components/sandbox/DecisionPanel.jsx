import React from 'react';
import { ShieldAlert, TrendingUp, TrendingDown, Activity, AlertCircle, ShieldCheck, CheckCircle2, AlertTriangle, Zap, DollarSign, BrainCircuit, PieChart } from 'lucide-react';

export default function DecisionPanel({ decision, insights }) {
  if (!decision) return null;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30 shadow-[0_8px_32px_rgba(52,211,153,0.2),inset_0_1px_2px_rgba(255,255,255,0.3)] border-t-emerald-400/40 border-l-emerald-400/30';
    if (score >= 50) return 'text-brand-blue bg-brand-blue/10 border-brand-blue/30 shadow-[0_8px_32px_rgba(0,122,255,0.2),inset_0_1px_2px_rgba(255,255,255,0.3)] border-t-brand-blue/40 border-l-brand-blue/30';
    if (score >= 30) return 'text-amber-400 bg-amber-400/10 border-amber-400/30 shadow-[0_8px_32px_rgba(251,191,36,0.2),inset_0_1px_2px_rgba(255,255,255,0.3)] border-t-amber-400/40 border-l-amber-400/30';
    return 'text-rose-400 bg-rose-400/10 border-rose-400/30 shadow-[0_8px_32px_rgba(244,63,94,0.2),inset_0_1px_2px_rgba(255,255,255,0.3)] border-t-rose-400/40 border-l-rose-400/30';
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Very Low':
      case 'Low': return 'text-emerald-400';
      case 'Medium': return 'text-amber-400';
      case 'High':
      case 'Critical': return 'text-rose-400';
      default: return 'text-white';
    }
  };

  const getStressColor = (stress) => {
    switch (stress) {
      case 'Very Low':
      case 'Low': return 'text-emerald-400';
      case 'Medium': return 'text-amber-400';
      case 'High':
      case 'Critical': return 'text-rose-400';
      default: return 'text-white';
    }
  };

  return (
    <div className="space-y-6 mb-8 animate-fade-in-up">
      {/* Hero Decision Score */}
      <div className={`backdrop-blur-[40px] border p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500 ${getScoreColor(decision.score)}`}>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-4 flex items-center justify-center flex-shrink-0 relative">
             <div className="absolute inset-0 rounded-full animate-ping opacity-20 border-inherit" />
             <span className="text-4xl font-black tabular-nums">{decision.score}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-5 h-5" />
              <h2 className="text-xl font-bold uppercase tracking-widest">AI Decision Score</h2>
            </div>
            <p className="text-sm opacity-80 leading-relaxed max-w-md">
              This score mathematically evaluates the cumulative impact of all actions in the pipeline based on liquidity, debt, and budget stability.
            </p>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 min-w-[200px]">
           <div className="bg-black/10 shadow-inner p-4 rounded-2xl flex items-center justify-between border border-white/5">
              <span className="text-xs uppercase tracking-wider opacity-70">Overall Risk</span>
              <span className={`font-bold ${getRiskColor(decision.risk)}`}>{decision.risk}</span>
           </div>
           <div className="bg-black/10 shadow-inner p-4 rounded-2xl flex items-center justify-between border border-white/5">
              <span className="text-xs uppercase tracking-wider opacity-70">Financial Stress</span>
              <span className={`font-bold ${getStressColor(decision.financialStress)}`}>{decision.financialStress}</span>
           </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Cash Impact */}
        <div className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem] p-5">
          <div className="flex items-center gap-2 mb-3">
             <DollarSign className="w-4 h-4 text-brand-blue" />
             <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Cash Impact</span>
          </div>
          <p className={`text-2xl font-black tabular-nums ${decision.cashImpact >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
             {decision.cashImpact > 0 ? '+' : ''}{decision.cashImpact}%
          </p>
        </div>

        {/* Liquidity Score */}
        <div className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem] p-5">
          <div className="flex items-center gap-2 mb-3">
             <Activity className="w-4 h-4 text-brand-blue" />
             <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Liquidity Score</span>
          </div>
          <p className="text-2xl font-black text-white tabular-nums">{decision.liquidityScore} / 100</p>
        </div>

        {/* Emergency Coverage */}
        <div className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem] p-5">
          <div className="flex items-center gap-2 mb-3">
             <ShieldCheck className="w-4 h-4 text-brand-blue" />
             <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Emergency Cover</span>
          </div>
          <p className="text-2xl font-black text-white tabular-nums">{decision.emergencyCoverageMonths} <span className="text-sm font-medium text-[var(--color-text-muted)]">Months</span></p>
        </div>

        {/* Budget Stability */}
        <div className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem] p-5">
          <div className="flex items-center gap-2 mb-3">
             <PieChart className="w-4 h-4 text-brand-blue" />
             <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Budget Stability</span>
          </div>
          <p className={`text-lg font-black ${decision.budgetStability === 'Stable' ? 'text-brand-green' : (decision.budgetStability === 'Warning' ? 'text-amber-400' : 'text-brand-red')}`}>
             {decision.budgetStability}
          </p>
        </div>
      </div>

      {/* Critical Insights if any */}
      {insights && insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {insights.map((insight, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border shadow-inner flex items-start gap-3
              ${insight.type === 'critical' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 
                insight.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 
                'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
               <div className="mt-0.5">
                 {insight.type === 'critical' && <AlertTriangle className="w-5 h-5" />}
                 {insight.type === 'warning' && <AlertCircle className="w-5 h-5" />}
                 {insight.type === 'good' && <CheckCircle2 className="w-5 h-5" />}
               </div>
               <div>
                 <h4 className="font-bold mb-1">{insight.title}</h4>
                 <p className="text-sm opacity-90">{insight.message}</p>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
