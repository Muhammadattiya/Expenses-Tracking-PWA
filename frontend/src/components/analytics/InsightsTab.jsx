import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getForecast, getSurvival } from '../../api/forecast';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Activity, AlertCircle, CheckCircle2, Zap, CalendarDays, Wallet, BrainCircuit, ArrowRight, Lightbulb, FlaskConical, Info } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

function InsightsTabComponent({ money, filters }) {
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
  const [activeSubTab, setActiveSubTab] = useState('forecast');

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
      <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl text-center">
        <AlertCircle className="w-12 h-12 text-[#FF3B30] mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">{t('analytics.insights.errorTitle')}</h3>
        <p className="text-[var(--color-text-muted)] max-w-md mb-6">{t('analytics.insights.errorDesc')}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-[#8D6346] hover:bg-[#8D6346]/90 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-[#8D6346]/20"
        >
          {t('analytics.insights.retry')}
        </button>
      </div>
    );
  }

  if (forecast?.isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl text-center">
        <Activity className="w-16 h-16 text-[#8D6346] mb-4 opacity-50" />
        <h3 className="text-2xl font-bold text-white mb-2">{t('analytics.insights.emptyStateTitle')}</h3>
        <p className="text-[var(--color-text-muted)] max-w-md mb-6">{t('analytics.insights.emptyStateDesc')}</p>
        <button 
          onClick={() => navigate('/add-transaction')}
          className="bg-[#8D6346] hover:bg-[#8D6346]/90 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-[#8D6346]/20"
        >
          {t('analytics.insights.addTransactionsBtn')}
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
          <p className="text-2xl font-black tabular-nums tracking-tight text-[#E8C5A8] mb-3 whitespace-nowrap">{money(data.balance)}</p>
          
          {data.events && data.events.length > 0 && (
            <div className="space-y-2 mt-2 pt-2 border-t border-white/10">
              <p className="text-[11px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-white/60 mb-1.5">{t('analytics.insights.upcomingEvents')}</p>
              {data.events.map((e, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <span className="text-xs text-white/90 truncate max-w-[120px]">{e.title || 'Event'}</span>
                  <span className={`text-xs font-bold tabular-nums tracking-tight whitespace-nowrap ${e.amount >= 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                    {e.amount >= 0 ? '+' : '-'}{money(Math.abs(e.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          {(data.income > 0 || data.expense > 0) && data.events?.length === 0 && (
             <div className="flex justify-between gap-4 mt-2 pt-2 border-t border-white/10">
               <span className="text-xs text-white/50">{t('analytics.insights.dailySpendAvg')}</span>
               <span className="text-xs text-[#FF3B30] font-bold tabular-nums tracking-tight whitespace-nowrap">-{money(data.expense)}</span>
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
      case 'Safe': return 'text-[#34C759] border-[#34C759]/20 bg-[#34C759]/10';
      case 'Low Risk': return 'text-[#007AFF] border-[#007AFF]/20 bg-[#007AFF]/10';
      case 'Medium Risk': return 'text-[#F59E0B] border-[#F59E0B]/20 bg-[#F59E0B]/10';
      case 'High Risk': return 'text-[#FF3B30] border-[#FF3B30]/20 bg-[#FF3B30]/10';
      default: return 'text-white/50 border-white/10 bg-white/5';
    }
  };

  const getRiskIcon = (risk) => {
    switch (risk) {
      case 'Safe': return <CheckCircle2 className="w-6 h-6 text-[#34C759]" />;
      case 'Low Risk': return <Activity className="w-6 h-6 text-[#007AFF]" />;
      case 'Medium Risk': return <AlertCircle className="w-6 h-6 text-[#F59E0B]" />;
      case 'High Risk': return <Zap className="w-6 h-6 text-[#FF3B30]" />;
      default: return <BrainCircuit className="w-6 h-6 text-white/50" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Sub-Tab Navigation */}
      <div className="flex flex-col items-center mb-8">
        <div role="tablist" aria-label={t('analytics.insights.paydaySurvival')} className="flex bg-black/40 p-1.5 rounded-2xl relative z-10 w-full max-w-md mx-auto border border-white/10 shadow-inner">
          <motion.button
            role="tab"
            aria-selected={activeSubTab === 'forecast'}
            id="subtab-forecast"
            aria-controls="subpanel-forecast"
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveSubTab('forecast')}
            className={`relative flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold ltr:tracking-wide rtl:tracking-normal transition-all z-10 min-h-[44px] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70 ${
              activeSubTab === 'forecast' 
                ? 'text-[#E8C5A8] drop-shadow-sm font-black' 
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            {activeSubTab === 'forecast' && (
              <motion.div
                layoutId="insightsSubTabs"
                className="absolute inset-0 bg-[#8D6346]/25 border border-[#8D6346]/40 shadow-[0_2px_12px_rgba(141,99,70,0.3)] rounded-xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{t('analytics.insights.balanceForecast')}</span>
          </motion.button>
          <motion.button
            role="tab"
            aria-selected={activeSubTab === 'payday'}
            id="subtab-payday"
            aria-controls="subpanel-payday"
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveSubTab('payday')}
            className={`relative flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold ltr:tracking-wide rtl:tracking-normal transition-all z-10 min-h-[44px] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70 ${
              activeSubTab === 'payday' 
                ? 'text-[#E8C5A8] drop-shadow-sm font-black' 
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            {activeSubTab === 'payday' && (
              <motion.div
                layoutId="insightsSubTabs"
                className="absolute inset-0 bg-[#8D6346]/25 border border-[#8D6346]/40 shadow-[0_2px_12px_rgba(141,99,70,0.3)] rounded-xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{t('analytics.insights.paydaySurvival')}</span>
          </motion.button>
        </div>
        <p className="text-xs text-white/50 text-center max-w-lg mt-3 px-4 leading-relaxed">
          {activeSubTab === 'forecast' ? t('analytics.insights.forecastSubDesc') : t('analytics.insights.paydaySubDesc')}
        </p>
      </div>

      {activeSubTab === 'forecast' && (
        <div role="tabpanel" id="subpanel-forecast" aria-labelledby="subtab-forecast" className="space-y-6 animate-fade-in">
          {/* Future Balance Hero Card */}
          <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute -end-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-20 bg-[#8D6346]" />
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit className="w-5 h-5 text-[#E8C5A8]" />
                  <p className="text-xs font-bold ltr:tracking-wider ltr:uppercase rtl:tracking-normal text-[#E8C5A8] drop-shadow-sm">{t('analytics.insights.futureBalance')} ({days} {t('analytics.insights.days')})</p>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight tabular-nums mb-2 drop-shadow-sm whitespace-nowrap">
                  {money(forecast.finalBalance)}
                </h2>
                <div className="flex items-center gap-3 mt-4">
                   <span className="text-xs sm:text-sm text-white/60 font-medium whitespace-nowrap">{t('analytics.insights.currentBalance')}: <span className="font-bold text-white/80 tabular-nums">{money(forecast.currentBalance)}</span></span>
                   <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${isTrendPositive ? 'bg-[#34C759]/20 text-[#34C759]' : 'bg-[#FF3B30]/20 text-[#FF3B30]'}`}>
                     {isTrendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                     <span className="tabular-nums tracking-tight font-bold">{isTrendPositive ? '+' : ''}{money(trendDifference)}</span>
                   </div>
                </div>
              </div>
              
              {/* Days Selector */}
              <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md w-full sm:w-auto justify-center sm:justify-start shadow-inner">
                {[7, 30, 90].map(d => (
                  <button
                    key={d}
                    onClick={() => setDays(d)}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold tabular-nums transition-all min-h-[44px] flex items-center justify-center active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70 ${days === d ? 'bg-[#8D6346]/25 text-[#E8C5A8] border border-[#8D6346]/40 shadow-[0_2px_12px_rgba(141,99,70,0.3)]' : 'text-[var(--color-text-muted)] hover:text-white hover:bg-white/5'}`}
                  >
                    {d}D
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Forecast Chart */}
          <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2.5rem] relative overflow-hidden">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecast.dailyForecast} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastColorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={isTrendPositive ? '#34C759' : '#FF3B30'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={isTrendPositive ? '#34C759' : '#FF3B30'} stopOpacity={0}/>
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
                    stroke={isTrendPositive ? '#34C759' : '#FF3B30'} 
                    strokeWidth={4} 
                    dot={false}
                    activeDot={{ r: 6, fill: '#000000', stroke: isTrendPositive ? '#34C759' : '#FF3B30', strokeWidth: 3 }}
                    fill="url(#forecastColorBalance)"
                  />

                  {/* Render Event Dots */}
                  {forecast.dailyForecast.map((entry, index) => {
                    if (entry.events && entry.events.length > 0) {
                      const hasPositive = entry.events.some(e => e.amount >= 0);
                      const hasNegative = entry.events.some(e => e.amount < 0);
                      let dotColor = '#8D6346';
                      if (hasPositive && !hasNegative) dotColor = '#34C759';
                      if (!hasPositive && hasNegative) dotColor = '#FF3B30';
                      
                      return (
                        <ReferenceDot 
                          key={`event-${index}`} 
                          x={entry.date} 
                          y={entry.balance} 
                          r={4} 
                          fill={dotColor} 
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
              <div className="bg-black/10 shadow-inner p-5 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-colors">
                 <p className="text-xs font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-white/60 mb-1.5">{t('analytics.insights.highestBalance')}</p>
                 <p className="text-2xl font-black text-white tabular-nums tracking-tight whitespace-nowrap">{money(forecast.maxBalance)}</p>
                 <p className="text-xs font-medium text-white/50 mt-1.5">{new Date(forecast.highestForecastDay).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
              </div>
              <div className="bg-black/10 shadow-inner p-5 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-colors">
                 <p className="text-xs font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-white/60 mb-1.5">{t('analytics.insights.lowestBalance')}</p>
                 <p className={`text-2xl font-black tabular-nums tracking-tight whitespace-nowrap ${forecast.minBalance < 0 ? 'text-[#FF3B30]' : 'text-white'}`}>{money(forecast.minBalance)}</p>
                 <p className="text-xs font-medium text-white/50 mt-1.5">{new Date(forecast.lowestForecastDay).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</p>
              </div>
              <div className="bg-black/10 shadow-inner p-5 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-colors">
                 <p className="text-xs font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-white/60 mb-1.5">{t('analytics.insights.averageBalance')}</p>
                 <p className="text-2xl font-black text-white tabular-nums tracking-tight whitespace-nowrap">{money(forecast.averageBalance)}</p>
              </div>
              <div className="bg-black/10 shadow-inner p-5 rounded-[2.5rem] border border-white/5 hover:border-white/10 transition-colors relative overflow-hidden">
                 <div className="absolute end-0 bottom-0 opacity-10">
                   <Activity className="w-24 h-24" />
                 </div>
                 <p className="text-xs font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-white/60 mb-1.5">{t('analytics.insights.dailySpendAvg')}</p>
                 <p className="text-2xl font-black text-[#FF3B30] tabular-nums tracking-tight whitespace-nowrap">-{money(forecast.expectedDailySpending)}</p>
                 <p className="text-xs font-medium text-white/50 mt-1.5">{t('analytics.insights.weightedModel')}</p>
              </div>
            </div>

            {/* AI Insights List */}
            <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/5 shadow-xl p-6 rounded-[2.5rem] flex flex-col gap-4">
               <div className="flex items-center gap-2 mb-2">
                 <Lightbulb className="w-5 h-5 text-[#8D6346]" />
                 <h3 className="font-bold text-white ltr:tracking-wide rtl:tracking-normal">{t('analytics.insights.forecastInsights')}</h3>
               </div>
               
               <div className="flex flex-col gap-3 flex-1 overflow-y-auto pe-2 custom-scrollbar">
                 {forecast.insights.map((insight, idx) => {
                   let icon = <CheckCircle2 className="w-5 h-5 text-[#34C759] mt-0.5 shrink-0" />;
                   let bgClass = "bg-[#34C759]/10 border-[#34C759]/20";
                   
                   if (insight.type === 'negative' || insight.type === 'critical') {
                     icon = <AlertCircle className="w-5 h-5 text-[#FF3B30] mt-0.5 shrink-0" />;
                     bgClass = "bg-[#FF3B30]/10 border-[#FF3B30]/20";
                   } else if (insight.type === 'warning' || insight.type === 'neutral') {
                     icon = <Activity className="w-5 h-5 text-[#F59E0B] mt-0.5 shrink-0" />;
                     bgClass = "bg-[#F59E0B]/10 border-[#F59E0B]/20";
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
        </div>
      )}

      {activeSubTab === 'payday' && (
        <div role="tabpanel" id="subpanel-payday" aria-labelledby="subtab-payday" className="animate-fade-in">
          {/* Payday Survival Card */}
          {survival && (
            survival.hasIncomeProfile === true ? (
              <div ref={paydayCardRef} className="space-y-6">
                {/* Top Header Card */}
                <section className={`bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/5 shadow-xl p-8 rounded-[2.5rem] relative overflow-hidden group ${getRiskColor(survival.risk)}`}>
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3.5 rounded-2xl bg-black/20 backdrop-blur-md border border-white/5">
                        {getRiskIcon(survival.risk)}
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold ltr:tracking-wide rtl:tracking-normal mb-1">
                          {t('analytics.insights.paydaySurvival')}
                        </h2>
                        <p className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight whitespace-nowrap">
                          {t('analytics.insights.riskLevel')}: {t(`analytics.insights.risk.${survival.risk?.toLowerCase().replace(' ', '_')}`, survival.risk)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Profile Switcher */}
                    {survival.availableProfiles && survival.availableProfiles.length > 0 && (
                      <div className="flex items-center justify-between md:justify-start gap-3 bg-black/20 px-4 py-3 rounded-2xl backdrop-blur-md border border-white/5 w-full md:w-auto">
                        <span className="text-xs font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-70 whitespace-nowrap">{t('analytics.insights.tracking')}</span>
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
                </section>

                {/* Transparency Board */}
                <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/5 shadow-xl p-6 md:p-8 rounded-[2.5rem] relative overflow-hidden group">
                  <h3 className="text-xs sm:text-sm font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-70 mb-4 flex items-center gap-2">
                     <Info className="w-4 h-4" /> {t('analytics.insights.transparencyBoard')}
                  </h3>
                  <div className="bg-black/10 shadow-inner p-6 rounded-[2.5rem] border border-white/5">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
                      <div>
                        <p className="text-[11px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-60 mb-1">{t('analytics.insights.profile')}</p>
                        <p className="font-bold text-sm truncate whitespace-nowrap">{survival.incomeName}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-60 mb-1">{t('analytics.insights.account')}</p>
                        <p className="font-bold text-sm truncate whitespace-nowrap">{survival.availableProfiles?.find(p => p.id === survival.selectedProfileId)?.accountName || '---'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-60 mb-1">{t('analytics.insights.frequency')}</p>
                        <p className="font-bold text-sm capitalize">
                          {(() => {
                            const freq = survival.availableProfiles?.find(p => p.id === survival.selectedProfileId)?.frequency;
                            return freq ? t(`recurring.${freq}`, freq) : '---';
                          })()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-60 mb-1">{t('analytics.insights.nextIncome')}</p>
                        <p className="font-bold text-sm whitespace-nowrap">{survival.nextIncomeDate ? new Date(survival.nextIncomeDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US') : '---'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-60 mb-1">{t('analytics.insights.amount')}</p>
                        <p className="font-bold text-sm tabular-nums tracking-tight text-[#34C759] whitespace-nowrap">{money(survival.incomeAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-60 mb-1">{t('analytics.insights.currentBalance')}</p>
                        <p className="font-bold text-sm tabular-nums tracking-tight whitespace-nowrap">{money(survival.currentBalance)}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Details Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                   {/* Left Column: Explanations & Safe Days */}
                   <div className="lg:col-span-2 space-y-6">
                     {/* Extra Safe Days */}
                     <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/5 shadow-xl p-6 md:p-8 rounded-[2.5rem]">
                        <h3 className="text-xs sm:text-sm font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-70 mb-4 flex items-center gap-2">
                           <CalendarDays className="w-4 h-4" /> {t('analytics.insights.extraSafeDays')}
                        </h3>
                        <div className="bg-black/10 p-6 rounded-[2.5rem] border border-white/5 shadow-inner">
                           {survival.runOutDate ? (
                             <p className="text-base sm:text-lg font-medium leading-relaxed">
                               {t('analytics.insights.runOutMessagePrefix')}{' '}
                               <span className="font-black tabular-nums tracking-tight whitespace-nowrap">{new Date(survival.runOutDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                               {t('analytics.insights.runOutMessageMiddle')}{' '}
                               <span className="font-black text-[#FF3B30] tabular-nums tracking-tight whitespace-nowrap">
                                 {(survival.daysUntilIncome || 0) - (survival.remainingSurvivalDays || 0)}{' '}
                                 {t('analytics.insights.daysBeforeNextIncome')}
                                </span>
                             </p>
                           ) : (
                             <p className="text-base sm:text-lg font-medium leading-relaxed">
                               {t('analytics.insights.bufferMessagePrefix')}{' '}
                               <span className="font-black text-[#34C759] tabular-nums tracking-tight whitespace-nowrap">
                                 {survival.financialBuffer} {t('analytics.insights.extraSafeDays')}
                               </span>{' '}
                               {t('analytics.insights.bufferMessageSuffix')}
                             </p>
                           )}
                           <p className="text-xs text-white/50 mt-4 italic border-t border-white/5 pt-4 leading-relaxed">
                             {t('analytics.insights.formulaNote')}
                           </p>
                        </div>
                     </section>

                     {/* Insights and Explanations */}
                     {(survival.explanations?.length > 0 || survival.actionableInsights?.length > 0) && (
                       <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/5 shadow-xl p-6 md:p-8 rounded-[2.5rem] space-y-8">
                          {survival.explanations?.length > 0 && (
                            <div>
                               <h3 className="text-xs font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-70 mb-4 flex items-center gap-2">
                                  <BrainCircuit className="w-4 h-4" /> {t('analytics.insights.riskAnalysis')}
                               </h3>
                               <div className="flex flex-wrap gap-4 w-full">
                                 {survival.explanations.map((exp, idx) => (
                                    <div key={idx} className="flex-1 min-w-[240px] flex items-start gap-4 p-4 rounded-[1.5rem] bg-white/5 border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all hover:-translate-y-1 hover:bg-white/10">
                                       <div className="p-2.5 rounded-xl bg-black/20 shadow-inner shrink-0">
                                          <Info className="w-5 h-5 text-white/70" />
                                       </div>
                                       <p className="text-sm font-medium leading-relaxed text-white/90 pt-1">{exp}</p>
                                    </div>
                                 ))}
                               </div>
                            </div>
                          )}
                          
                          {survival.actionableInsights?.length > 0 && (
                            <div>
                               <h3 className="text-xs font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-70 mb-4 text-[#34C759] flex items-center gap-2">
                                  <Lightbulb className="w-4 h-4" /> {t('analytics.insights.actionableInsights')}
                               </h3>
                               <div className="flex flex-wrap gap-4 w-full">
                                 {survival.actionableInsights.map((insight, idx) => (
                                    <div key={idx} className="flex-1 min-w-[240px] flex items-start gap-4 p-4 rounded-[1.5rem] bg-[#34C759]/10 border border-[#34C759]/20 shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all hover:-translate-y-1 hover:bg-[#34C759]/15">
                                       <div className="p-2.5 rounded-xl bg-[#34C759]/20 shadow-inner shrink-0">
                                          <TrendingUp className="w-5 h-5 text-[#34C759]" />
                                       </div>
                                       <p className="text-sm font-medium leading-relaxed text-[#34C759] pt-1">{insight}</p>
                                    </div>
                                 ))}
                               </div>
                            </div>
                          )}
                       </section>
                     )}
                   </div>

                   {/* Right Column: Balance Descent Chart */}
                   <div className="lg:col-span-1">
                     <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/5 shadow-xl p-6 md:p-8 rounded-[2.5rem] h-full flex flex-col">
                       <h3 className="text-xs sm:text-sm font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal opacity-70 mb-6 flex items-center gap-2">
                          <Activity className="w-4 h-4" /> {t('analytics.insights.balanceDescent')}
                       </h3>
                       <div className="bg-black/10 shadow-inner p-4 rounded-[2.5rem] border border-white/5 flex-1 relative min-h-[300px]">
                          {survival.chartData && survival.chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={survival.chartData} margin={lang === 'ar' ? { top: 10, right: -20, left: 0, bottom: 0 } : { top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="survivalColorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={survival.risk === 'High Risk' ? '#FF3B30' : '#8D6346'} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={survival.risk === 'High Risk' ? '#FF3B30' : '#8D6346'} stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis 
                                  dataKey="date" 
                                  stroke="rgba(255,255,255,0.2)" 
                                  tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}} 
                                  tickFormatter={(val) => new Date(val).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}
                                  tickMargin={10}
                                />
                                <YAxis 
                                  stroke="rgba(255,255,255,0.2)" 
                                  tick={{fill: 'rgba(255,255,255,0.4)', fontSize: 10}}
                                  tickFormatter={(val) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { notation: 'compact' }).format(val)}
                                  domain={['auto', 'auto']}
                                />
                                <RechartsTooltip 
                                  contentStyle={{ backgroundColor: 'rgba(28,24,25,0.95)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                                  labelFormatter={(label) => new Date(label).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  formatter={(value) => [money(value), t('analytics.insights.balance')]}
                                />
                                <ReferenceLine y={0} stroke="#FF3B30" strokeDasharray="3 3" strokeWidth={1} />
                                <Area 
                                  type="monotone" 
                                  dataKey="balance" 
                                  stroke={survival.risk === 'High Risk' ? '#FF3B30' : '#8D6346'} 
                                  strokeWidth={3} 
                                  fillOpacity={1} 
                                  fill="url(#survivalColorBalance)" 
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center h-full text-white/40 text-sm">{t('analytics.insights.noData')}</div>
                          )}
                       </div>
                     </section>
                   </div>
                </div>
              </div>
            ) : (
              <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-8 rounded-[2.5rem] relative overflow-hidden group">
                 <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                       <div className="flex items-center gap-3 mb-2">
                         <div className="p-2.5 rounded-xl bg-[#8D6346]/20">
                           <BrainCircuit className="w-6 h-6 text-[#8D6346]" />
                         </div>
                         <h2 className="text-xl font-bold ltr:tracking-wide rtl:tracking-normal text-white">{t('analytics.insights.noIncomeProfileTitle')}</h2>
                       </div>
                       <p className="text-sm text-white/60 leading-relaxed max-w-2xl mt-3">
                         {t('analytics.insights.noIncomeProfileDesc')}
                       </p>
                    </div>
                    <button 
                      onClick={() => navigate('/profile?view=income')}
                      className="flex items-center gap-2 bg-[#8D6346] hover:bg-[#8D6346]/90 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-[#8D6346]/20 shrink-0 transition-all min-h-[44px]"
                    >
                       {t('analytics.insights.configureIncomeProfile')} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </button>
                 </div>
              </section>
            )
          )}
        </div>
      )}

    </div>
  );
}

export default React.memo(InsightsTabComponent);
