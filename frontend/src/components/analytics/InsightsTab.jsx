import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getForecast, getSurvival } from '../../api/forecast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { TrendingUp, TrendingDown, Activity, AlertCircle, CheckCircle2, Zap, CalendarDays, Wallet, BrainCircuit, ArrowRight, Lightbulb, FlaskConical, Info } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function InsightsTab({ money, filters }) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [forecast, setForecast] = useState(null);
  const [survival, setSurvival] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState(30);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const paydayCardRef = React.useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchForecast = async () => {
      setLoading(true);
      setError(false);
      try {
        const [forecastData, survivalData] = await Promise.all([
          getForecast(filters?.account || '', days),
          getSurvival(selectedProfileId).catch(() => null)
        ]);
        if (isMounted) {
          setForecast(forecastData);
          setSurvival(survivalData);
          if (survivalData?.selectedProfileId && !selectedProfileId) {
             setSelectedProfileId(survivalData.selectedProfileId);
          }
        }
      } catch (err) {
        console.error("Failed to load forecast:", err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchForecast();
    return () => { isMounted = false; };
  }, [filters?.account, days, selectedProfileId]);

  useEffect(() => {
    if (!loading && survival) {
      const params = new URLSearchParams(location.search);
      if (params.get('focus') === 'payday' && paydayCardRef.current) {
        setTimeout(() => {
           paydayCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [loading, survival, location.search]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-48 bg-white/5 rounded-3xl"></div>
        <div className="h-96 bg-white/5 rounded-3xl"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="h-24 bg-white/5 rounded-2xl"></div>
          <div className="h-24 bg-white/5 rounded-2xl"></div>
          <div className="h-24 bg-white/5 rounded-2xl"></div>
          <div className="h-24 bg-white/5 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
        <AlertCircle className="w-12 h-12 text-brand-red mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
        <p className="text-[var(--color-text-muted)]">Could not load the financial forecast.</p>
      </div>
    );
  }

  if (forecast?.isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl text-center">
        <Activity className="w-16 h-16 text-brand-blue mb-4 opacity-50" />
        <h3 className="text-2xl font-bold text-white mb-2">{t('analytics.insights.emptyStateTitle', 'No Forecast Available')}</h3>
        <p className="text-[var(--color-text-muted)] max-w-md mb-6">{t('analytics.insights.emptyStateDesc', 'We need more data to accurately predict your financial future.')}</p>
        <button 
          onClick={() => navigate('/add-transaction')}
          className="bg-brand-blue hover:bg-brand-blue/90 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-brand-blue/20"
        >
          {t('analytics.insights.addTransactionsBtn', 'Add Transactions')}
        </button>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/80 border border-white/10 backdrop-blur-md p-4 rounded-xl shadow-2xl">
          <p className="text-white font-bold mb-1">{new Date(label).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          <p className="text-2xl font-black tabular-nums text-brand-blue mb-3">{money(data.balance)}</p>
          
          {data.events && data.events.length > 0 && (
            <div className="space-y-2 mt-2 pt-2 border-t border-white/10">
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">{t('analytics.insights.upcomingEvents', 'Upcoming Events')}</p>
              {data.events.map((e, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <span className="text-xs text-white/90 truncate max-w-[120px]">{e.title || 'Event'}</span>
                  <span className={`text-xs font-bold ${e.amount >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                    {e.amount >= 0 ? '+' : '-'}{money(Math.abs(e.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {(data.income > 0 || data.expense > 0) && data.events?.length === 0 && (
             <div className="flex justify-between gap-4 mt-2 pt-2 border-t border-white/10">
               <span className="text-xs text-white/50">Daily Avg</span>
               <span className="text-xs text-brand-red font-bold">-{money(data.expense)}</span>
             </div>
          )}
        </div>
      );
    }
    return null;
  };

  const trendDifference = forecast.finalBalance - forecast.currentBalance;
  const isTrendPositive = trendDifference >= 0;

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'Safe': return 'text-emerald-400 border-emerald-400/20 bg-emerald-500/10';
      case 'Low Risk': return 'text-blue-400 border-blue-400/20 bg-blue-500/10';
      case 'Medium Risk': return 'text-amber-400 border-amber-400/20 bg-amber-500/10';
      case 'High Risk': return 'text-rose-400 border-rose-400/20 bg-rose-500/10';
      default: return 'text-white/50 border-white/10 bg-white/5';
    }
  };

  const getRiskIcon = (risk) => {
    switch (risk) {
      case 'Safe': return <CheckCircle2 className="w-6 h-6 text-emerald-400" />;
      case 'Low Risk': return <Activity className="w-6 h-6 text-blue-400" />;
      case 'Medium Risk': return <AlertCircle className="w-6 h-6 text-amber-400" />;
      case 'High Risk': return <Zap className="w-6 h-6 text-rose-400" />;
      default: return <BrainCircuit className="w-6 h-6 text-white/50" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Future Balance Hero Card */}
      <section className="p-8 rounded-[2.5rem] shadow-2xl bg-gradient-to-br from-black/60 to-black/40 border border-white/5 backdrop-blur-2xl relative overflow-hidden group">
        <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-20 transition-colors duration-700 ${isTrendPositive ? 'bg-brand-green' : 'bg-brand-red'}`} />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-5 h-5 text-brand-blue" />
              <p className="text-xs font-bold tracking-widest uppercase text-brand-blue">{t('analytics.insights.futureBalance', 'Future Balance')} ({days} {t('analytics.insights.days', 'Days')})</p>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tighter tabular-nums mb-2">
              {money(forecast.finalBalance)}
            </h2>
            <div className="flex items-center gap-3 mt-4">
               <span className="text-sm text-white/50">{t('analytics.insights.currentBalance', 'Current Balance')}: {money(forecast.currentBalance)}</span>
               <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${isTrendPositive ? 'bg-brand-green/20 text-brand-green' : 'bg-brand-red/20 text-brand-red'}`}>
                 {isTrendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                 {isTrendPositive ? '+' : ''}{money(trendDifference)}
               </div>
            </div>
          </div>
          
          {/* Days Selector */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${days === d ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-[var(--color-text-muted)] hover:text-white hover:bg-white/5'}`}
              >
                {d}D
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Forecast Chart */}
      <section className="p-6 rounded-[2rem] shadow-2xl bg-black/40 border border-white/5 backdrop-blur-xl relative overflow-hidden">
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast.dailyForecast} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isTrendPositive ? '#10b981' : '#f43f5e'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isTrendPositive ? '#10b981' : '#f43f5e'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff" strokeOpacity={0.05} vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => new Date(val).getDate()} 
                stroke="#ffffff" 
                strokeOpacity={0.2} 
                tick={{ fill: '#ffffff', opacity: 0.5, fontSize: 12 }} 
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                hide={true} 
                domain={['dataMin - (dataMax - dataMin) * 0.1', 'dataMax + (dataMax - dataMin) * 0.1']} 
              />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff', strokeOpacity: 0.1, strokeWidth: 2 }} />
              
              <Line 
                type="monotone" 
                dataKey="balance" 
                stroke={isTrendPositive ? '#10b981' : '#f43f5e'} 
                strokeWidth={4} 
                dot={false}
                activeDot={{ r: 6, fill: '#000000', stroke: isTrendPositive ? '#10b981' : '#f43f5e', strokeWidth: 3 }}
                fill="url(#colorBalance)"
              />

              {/* Render Event Dots */}
              {forecast.dailyForecast.map((entry, index) => {
                 if (entry.events && entry.events.length > 0) {
                   const hasPositive = entry.events.some(e => e.amount >= 0);
                   const hasNegative = entry.events.some(e => e.amount < 0);
                   let color = '#3b82f6'; // Mixed
                   if (hasPositive && !hasNegative) color = '#10b981';
                   if (!hasPositive && hasNegative) color = '#f43f5e';
                   
                   return (
                     <ReferenceDot 
                       key={`event-${index}`} 
                       x={entry.date} 
                       y={entry.balance} 
                       r={4} 
                       fill={color} 
                       stroke="#000000" 
                       strokeWidth={2} 
                     />
                   );
                 }
                 return null;
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Statistics Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-colors">
             <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-1">{t('analytics.insights.highestBalance', 'Highest Balance')}</p>
             <p className="text-2xl font-black text-white tabular-nums tracking-tight">{money(forecast.maxBalance)}</p>
             <p className="text-[10px] text-white/40 mt-1">{new Date(forecast.highestForecastDay).toLocaleDateString()}</p>
          </div>
          <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-colors">
             <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-1">{t('analytics.insights.lowestBalance', 'Lowest Balance')}</p>
             <p className={`text-2xl font-black tabular-nums tracking-tight ${forecast.minBalance < 0 ? 'text-brand-red' : 'text-white'}`}>{money(forecast.minBalance)}</p>
             <p className="text-[10px] text-white/40 mt-1">{new Date(forecast.lowestForecastDay).toLocaleDateString()}</p>
          </div>
          <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-colors">
             <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-1">{t('analytics.insights.averageBalance', 'Average Balance')}</p>
             <p className="text-2xl font-black text-white tabular-nums tracking-tight">{money(forecast.averageBalance)}</p>
          </div>
          <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-colors relative overflow-hidden">
             <div className="absolute right-0 bottom-0 opacity-10">
               <Activity className="w-24 h-24" />
             </div>
             <p className="text-xs uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Daily Spend (Avg)</p>
             <p className="text-2xl font-black text-brand-red tabular-nums tracking-tight">-{money(forecast.expectedDailySpending)}</p>
             <p className="text-[10px] text-white/40 mt-1">Weighted Model</p>
          </div>
        </div>

        {/* AI Insights List */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/20 p-6 rounded-[2rem] border border-indigo-500/30 flex flex-col gap-4">
           <div className="flex items-center gap-2 mb-2">
             <Lightbulb className="w-5 h-5 text-indigo-400" />
             <h3 className="font-bold text-white tracking-wide">{t('analytics.insights.forecastInsights', 'Forecast Insights')}</h3>
           </div>
           
           <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
             {forecast.insights.map((insight, idx) => {
               let icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />;
               let bgClass = "bg-emerald-500/10 border-emerald-500/20";
               
               if (insight.type === 'negative' || insight.type === 'critical') {
                 icon = <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />;
                 bgClass = "bg-rose-500/10 border-rose-500/20";
               } else if (insight.type === 'warning' || insight.type === 'neutral') {
                 icon = <Activity className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />;
                 bgClass = "bg-amber-500/10 border-amber-500/20";
               }

               return (
                 <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border ${bgClass} transition-all hover:bg-opacity-50`}>
                   {icon}
                   <p className="text-sm text-white/90 leading-relaxed">{t(`analytics.insights.${insight.key}`, insight.fallback)}</p>
                 </div>
               );
             })}
           </div>
        </div>

      </div>

      {/* Payday Survival Card */}
      {survival && (
        survival.hasIncomeProfile === true ? (
          <section ref={paydayCardRef} className={`p-8 rounded-[2.5rem] shadow-2xl border backdrop-blur-xl relative overflow-hidden group ${getRiskColor(survival.risk)}`}>
            {/* Top Header & Switcher */}
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-white/10 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-black/20 backdrop-blur-md">
                  {getRiskIcon(survival.risk)}
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-wide mb-1">
                    Payday Survival Prediction
                  </h2>
                  <p className="text-3xl font-black tabular-nums tracking-tight">
                    Risk Level: {survival.risk}
                  </p>
                </div>
              </div>
              
              {/* Profile Switcher */}
              {survival.availableProfiles && survival.availableProfiles.length > 0 && (
                <div className="flex items-center gap-3 bg-black/20 px-4 py-3 rounded-2xl backdrop-blur-md">
                  <span className="text-xs uppercase tracking-widest opacity-70">Tracking:</span>
                  <select 
                    className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer"
                    value={survival.selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                  >
                    {survival.availableProfiles.map(p => (
                      <option key={p.id} value={p.id} className="text-black bg-white">{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Transparency Board */}
            <div className="relative z-10 bg-black/20 p-5 rounded-3xl border border-white/5 mb-8">
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-4 flex items-center gap-2">
                 <Info className="w-4 h-4" /> Transparency Board (Isolated Account)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <p className="text-[10px] uppercase opacity-50">Profile</p>
                  <p className="font-bold text-sm truncate">{survival.incomeName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase opacity-50">Account</p>
                  <p className="font-bold text-sm truncate">{survival.availableProfiles?.find(p => p.id === survival.selectedProfileId)?.accountName || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase opacity-50">Frequency</p>
                  <p className="font-bold text-sm capitalize">{survival.availableProfiles?.find(p => p.id === survival.selectedProfileId)?.frequency || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase opacity-50">Next Income</p>
                  <p className="font-bold text-sm">{new Date(survival.nextIncomeDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase opacity-50">Amount</p>
                  <p className="font-bold text-sm tabular-nums text-brand-green">{money(survival.incomeAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase opacity-50">Current Balance</p>
                  <p className="font-bold text-sm tabular-nums">{money(survival.currentBalance)}</p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
               {/* Left Column: Explanations */}
               <div className="space-y-6">
                 <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-70 mb-3 flex items-center gap-2">
                       <CalendarDays className="w-4 h-4" /> Extra Safe Days
                    </h3>
                    <div className="bg-black/10 p-5 rounded-2xl border border-white/5">
                       {survival.runOutDate ? (
                         <p className="text-lg font-medium leading-relaxed">
                           Your balance is expected to run out on <span className="font-black">{new Date(survival.runOutDate).toLocaleDateString()}</span>, which is <span className="font-black text-rose-300">{(survival.daysUntilIncome || 0) - (survival.remainingSurvivalDays || 0)} days before</span> your next income.
                         </p>
                       ) : (
                         <p className="text-lg font-medium leading-relaxed">
                           Your balance is expected to last <span className="font-black text-brand-green">{survival.financialBuffer} extra days</span> after covering all projected expenses before payday.
                         </p>
                       )}
                       <p className="text-[10px] text-white/50 mt-4 italic border-t border-white/5 pt-3">
                         * Extra Safe Days = Remaining Balance Before Next Income / Expected Daily Variable Spending
                       </p>
                    </div>
                 </div>

                 {survival.explanations?.length > 0 && (
                   <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-70 mb-3 flex items-center gap-2">
                         <BrainCircuit className="w-4 h-4" /> Why is my risk {survival.risk}?
                      </h3>
                      <div className="space-y-3">
                        {survival.explanations.map((exp, idx) => (
                           <div key={idx} className="flex items-start gap-3 bg-black/10 p-4 rounded-xl border border-white/5">
                              <Info className="w-5 h-5 shrink-0 opacity-60 mt-0.5" />
                              <p className="text-sm font-medium leading-relaxed">{exp}</p>
                           </div>
                        ))}
                      </div>
                   </div>
                 )}
                 
                 {survival.actionableInsights?.length > 0 && (
                   <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest opacity-70 mb-3 text-brand-green flex items-center gap-2">
                         <Lightbulb className="w-4 h-4" /> Actionable Insights
                      </h3>
                      <div className="space-y-3">
                        {survival.actionableInsights.map((insight, idx) => (
                           <div key={idx} className="flex items-start gap-3 bg-brand-green/10 p-4 rounded-xl border border-brand-green/20">
                              <TrendingUp className="w-5 h-5 shrink-0 text-brand-green mt-0.5" />
                              <p className="text-sm font-medium leading-relaxed text-brand-green">{insight}</p>
                           </div>
                        ))}
                      </div>
                   </div>
                 )}
               </div>

               {/* Right Column: Timeline */}
               <div>
                 <h3 className="text-sm font-bold uppercase tracking-widest opacity-70 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Financial Timeline
                 </h3>
                 <div className="bg-black/20 p-6 rounded-3xl border border-white/5 h-full">
                    <div className="relative border-l-2 border-white/10 ml-4 space-y-8 py-2">
                      {survival.timeline?.map((step, idx) => (
                        <div key={idx} className="relative pl-8">
                           <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-black ${
                             step.type === 'start' ? 'bg-brand-blue' :
                             step.type === 'end' ? 'bg-brand-green' :
                             step.type === 'danger' ? 'bg-rose-500 animate-pulse' :
                             'bg-white/50'
                           }`} />
                           <div className="flex flex-col">
                             <span className={`text-sm font-bold uppercase tracking-wider ${
                                step.type === 'danger' ? 'text-rose-400' : 'text-white/80'
                             }`}>{step.label}</span>
                             {step.amount && <span className="text-xl font-black tabular-nums mt-1">{money(step.amount)}</span>}
                             {step.date && <span className="text-sm opacity-60 mt-1">{new Date(step.date).toLocaleDateString()}</span>}
                           </div>
                        </div>
                      ))}
                    </div>
                 </div>
               </div>
            </div>
          </section>
        ) : (
          <section className="p-8 rounded-[2.5rem] shadow-2xl border border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden group">
             <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                     <div className="p-2.5 rounded-xl bg-brand-blue/20">
                       <BrainCircuit className="w-6 h-6 text-brand-blue" />
                     </div>
                     <h2 className="text-xl font-bold tracking-wide text-white">Payday Survival Prediction</h2>
                   </div>
                   <p className="text-sm opacity-80 leading-relaxed max-w-2xl mt-4 text-[var(--color-text-muted)]">
                     No active Income Profile found. Configure an Income Profile to unlock Payday Survival predictions and see how many days your balance will last before your next payday.
                   </p>
                </div>
                <button 
                  onClick={() => navigate('/settings?tab=income')}
                  className="flex items-center gap-2 bg-brand-blue hover:bg-brand-blue/90 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-brand-blue/20 shrink-0 transition-all"
                >
                   Configure Income Profile <ArrowRight className="w-4 h-4" />
                </button>
             </div>
          </section>
        )
      )}

      {/* Sandbox Entry Point */}
      <section className="p-6 rounded-[2rem] shadow-2xl bg-gradient-to-r from-purple-500/10 to-indigo-600/10 border border-purple-500/20 backdrop-blur-xl relative overflow-hidden group mt-6">
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
