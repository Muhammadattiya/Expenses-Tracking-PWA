import React, { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Activity, AlertCircle, CheckCircle2, Zap, ArrowRight, BrainCircuit, Sparkles, FlaskConical } from 'lucide-react';

export default function InsightsTab({ data, money, filters, userPrefs }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const income = data?.summary?.income || 0;
  const expense = data?.summary?.expense || 0;
  const savings = income - expense;
  
  let health = 'warning'; // default
  let healthMessage = t('analytics.insights.warningMsg', 'Watch your spending, you are close to your limits.');
  if (income > 0) {
    const savingsRate = savings / income;
    if (savingsRate >= 0.2) {
      health = 'good';
      healthMessage = t('analytics.insights.goodMsg', 'Excellent! You are saving a healthy portion of your income.');
    }
    else if (savingsRate <= 0) {
      health = 'danger';
      healthMessage = t('analytics.insights.dangerMsg', 'Critical! You are spending more than you earn.');
    }
  } else if (expense > 0) {
    health = 'danger';
    healthMessage = t('analytics.insights.dangerMsg', 'Critical! You are spending without recorded income.');
  }

  const healthText = {
    good: t('analytics.insights.good', 'Excellent'),
    warning: t('analytics.insights.warning', 'Fair'),
    danger: t('analytics.insights.danger', 'Critical')
  };

  const healthStyle = {
    good: 'from-emerald-500/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400 shadow-emerald-900/20',
    warning: 'from-amber-500/20 to-amber-900/10 border-amber-500/30 text-amber-400 shadow-amber-900/20',
    danger: 'from-rose-500/20 to-rose-900/10 border-rose-500/30 text-rose-400 shadow-rose-900/20'
  };

  const projectedExpense = useMemo(() => {
    if (!expense) return 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let from, to;
    if (filters?.from && filters?.to) {
      from = new Date(filters.from);
      to = new Date(filters.to);
    } else {
      // default to current month
      const prefMonthStart = userPrefs?.budgetStartDayMonthly || 1;
      let start = new Date();
      const lastDayOfCurrentMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const actualMonthStartDay = Math.min(prefMonthStart, lastDayOfCurrentMonth);

      if (start.getDate() < actualMonthStartDay) {
        const lastDayOfPrevMonth = new Date(start.getFullYear(), start.getMonth(), 0).getDate();
        start = new Date(start.getFullYear(), start.getMonth() - 1, Math.min(prefMonthStart, lastDayOfPrevMonth));
      } else {
        start = new Date(start.getFullYear(), start.getMonth(), actualMonthStartDay);
      }
      let end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      
      from = start;
      to = end;
    }

    from.setHours(0,0,0,0);
    to.setHours(23,59,59,999);

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(1, Math.ceil((to - from) / msPerDay));
    const daysPassed = Math.ceil((Math.min(today, to) - from) / msPerDay) + 1; // +1 to include today

    if (daysPassed <= 0) return 0; // Future period
    if (daysPassed >= totalDays) return expense; // Past period

    // --- Smart Projection Logic ---
    // Separate large outliers (e.g., Rent, Bills) from variable daily spending
    let variableExpense = expense;
    let fixedExpense = 0;

    if (data?.transactions && Array.isArray(data.transactions)) {
       const periodExpenses = data.transactions.filter(t => 
         t.type === 'expense' && 
         new Date(t.date) >= from && 
         new Date(t.date) <= to
       );
       
       if (periodExpenses.length >= 3) {
          const amounts = periodExpenses.map(t => t.amount);
          const sum = amounts.reduce((a,b) => a+b, 0);
          const mean = sum / amounts.length;
          
          // Heuristic: Any transaction > mean * 2.5 is considered "Fixed/One-off" for this period
          periodExpenses.forEach(t => {
             if (t.amount > mean * 2.5) {
                fixedExpense += t.amount;
                variableExpense -= t.amount;
             }
          });
       }
    }

    variableExpense = Math.max(0, variableExpense);
    const projectedVariable = (variableExpense / daysPassed) * totalDays;
    
    return projectedVariable + fixedExpense;
  }, [expense, data, filters, userPrefs]);

  const diff = projectedExpense - income;
  const isForecastBad = diff > 0 && income > 0;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Financial Health Hero */}
      <section className={`p-8 rounded-[2rem] shadow-2xl bg-gradient-to-br ${healthStyle[health]} border backdrop-blur-xl relative overflow-hidden group transition-all duration-500`}>
        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700">
          {health === 'good' && <CheckCircle2 className="w-32 h-32" />}
          {health === 'warning' && <AlertCircle className="w-32 h-32" />}
          {health === 'danger' && <Activity className="w-32 h-32" />}
        </div>
        
        <div className="relative z-10">
          <p className="text-sm font-bold tracking-widest uppercase mb-2 opacity-80">{t('analytics.insights.health', 'Financial Health')}</p>
          <h2 className="text-5xl font-black mb-4 tracking-tight">{healthText[health]}</h2>
          <p className="text-lg opacity-90 max-w-md leading-relaxed">{healthMessage}</p>
        </div>
      </section>

      {/* Forecast Section */}
      <section className="p-6 rounded-[2rem] shadow-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors duration-500">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-brand-blue/20 rounded-2xl text-brand-blue">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-main)] tracking-wide">{t('analytics.insights.forecast', 'Spending Projections')}</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* Basic Math Projection */}
           <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div className="bg-black/30 p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-bl-[100px] -z-10 group-hover:bg-brand-red/10 transition-colors" />
                <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">{t('analytics.insights.projectedExpense', 'Basic Trend')}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-[var(--color-text-main)] tabular-nums tracking-tight">{money(projectedExpense)}</span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-2 opacity-70 leading-relaxed">
                   {t('analytics.insights.mathModelDesc', 'Smart linear projection. Large fixed expenses (like rent) are automatically isolated from your daily variable spending average to ensure high accuracy.')}
                </p>
             </div>

             <div className="bg-black/30 p-6 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors">
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-[100px] -z-10 transition-colors ${isForecastBad ? 'bg-brand-red/5 group-hover:bg-brand-red/10' : 'bg-brand-green/5 group-hover:bg-brand-green/10'}`} />
                <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">{t('analytics.insights.expectedSurplus', 'Expected Surplus')}</p>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold tabular-nums tracking-tight ${isForecastBad ? 'text-brand-red' : 'text-brand-green'}`}>
                    {money(income - projectedExpense)}
                  </span>
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-2 opacity-70">
                   {isForecastBad ? t('analytics.insights.deficitWarning', 'Warning: Projected deficit by end of period') : t('analytics.insights.surplusGood', 'On track for a surplus by end of period')}
                </p>
             </div>
           </div>

           {/* ML Placeholder Card */}
           <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/20 p-6 rounded-3xl border border-indigo-500/30 relative overflow-hidden group flex flex-col justify-center items-center text-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.15),transparent_70%)] animate-pulse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                 <BrainCircuit className="w-48 h-48 text-indigo-400" />
              </div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-4 backdrop-blur-md">
                  <Sparkles className="w-3 h-3" /> Coming Soon
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Finova AI Forecast</h3>
                <p className="text-xs text-indigo-200/80 leading-relaxed max-w-[200px]">
                  {t('analytics.insights.mlComingSoon', 'Machine learning models are analyzing your habits to provide personalized, high-accuracy financial forecasts.')}
                </p>
              </div>
           </div>

        </div>
      </section>

      {/* Sandbox Entry Point */}
      <section className="p-6 rounded-[2rem] shadow-2xl bg-gradient-to-r from-purple-500/10 to-indigo-600/10 border border-purple-500/20 backdrop-blur-xl relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors duration-700" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors duration-700" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-purple-500/20 rounded-xl text-purple-400">
                <FlaskConical className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text-main)] tracking-wide">Financial Sandbox</h2>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed max-w-2xl">
              Want to see how a big purchase, a salary increase, or a new debt would affect your finances? 
              Test "What-if" scenarios safely in our isolated sandbox without affecting your real data.
            </p>
          </div>
          
          <button 
            onClick={() => navigate('/sandbox')}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-8 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-lg hover:shadow-purple-500/25 hover:-translate-y-1"
          >
            Launch Sandbox
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

    </div>
  );
}
