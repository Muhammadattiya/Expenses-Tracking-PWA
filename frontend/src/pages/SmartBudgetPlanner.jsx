import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { getCategories } from '../api/categories';
import { smartBudgetService } from '../api/smartBudgets';
import { ArrowRight, ArrowLeft, Target, AlertCircle, Save, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getIconComponent } from '../components/IconPicker';

export default function SmartBudgetPlanner() {
  const { t, language } = useLanguage();
  const { showToast } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [availableBudget, setAvailableBudget] = useState('');
  const [plannerName, setPlannerName] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [priorities, setPriorities] = useState({}); // { catId: 'High' }
  const [distribution, setDistribution] = useState([]);
  
  const [draftId, setDraftId] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [groupAsMaster, setGroupAsMaster] = useState(false);
  useEffect(() => {
    const draftPlan = location.state?.draftPlan;
    if (draftPlan && categories.length > 0) {
      setDraftId(draftPlan._id);
      setAvailableBudget(draftPlan.availableBudget);
      setPlannerName(draftPlan.name);
      setPeriod(draftPlan.period);
      if (draftPlan.period === 'custom') {
        setStartDate(new Date(draftPlan.startDate).toISOString().split('T')[0]);
        setEndDate(new Date(draftPlan.endDate).toISOString().split('T')[0]);
      }
      if (draftPlan.isRecurring !== undefined) {
        setIsRecurring(draftPlan.isRecurring);
      }
      if (draftPlan.groupAsMaster !== undefined) {
        setGroupAsMaster(draftPlan.groupAsMaster);
      }
      const selectedIds = draftPlan.categories.map(c => c.category._id || c.category);
      setSelectedCategoryIds(selectedIds);
      
      const newPriorities = {};
      draftPlan.categories.forEach(c => {
        newPriorities[c.category._id || c.category] = c.priority;
      });
      setPriorities(newPriorities);
      
      setDistribution(draftPlan.categories.map(c => ({
        category: c.category._id || c.category,
        priority: c.priority,
        suggestedAmount: c.suggestedAmount,
        historicalAverage: c.historicalAverage
      })));
      setStep(4);
    }
  }, [location.state, categories]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats.filter(c => c.type === 'expense'));
    } catch (err) {
      showToast(t('common.deleteError'), 'error');
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!availableBudget || availableBudget <= 0) {
        return showToast(t('addTransaction.errorMsg'), 'error');
      }
      if (period === 'custom' && (!startDate || !endDate || new Date(startDate) > new Date(endDate))) {
        return showToast(t('addTransaction.errorMsg'), 'error');
      }
      setStep(2);
    } else if (step === 2) {
      if (selectedCategoryIds.length === 0) {
        return showToast(t('smartBudget.emptyCategories'), 'error');
      }
      // Initialize priorities if not set
      const newPriorities = { ...priorities };
      selectedCategoryIds.forEach(id => {
        if (!newPriorities[id]) newPriorities[id] = 'Medium';
      });
      setPriorities(newPriorities);
      setStep(3);
    } else if (step === 3) {
      await generatePlan();
      setStep(4);
    }
  };

  const generatePlan = async () => {
    setIsLoading(true);
    try {
      const payload = {
        availableBudget: Number(availableBudget),
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        categories: selectedCategoryIds.map(id => ({
          categoryId: id,
          priority: priorities[id]
        })),
        isRecurring
      };
      const result = await smartBudgetService.generateDistribution(payload);
      setDistribution(result.map(d => ({
        ...d,
        initialSuggestedAmount: d.suggestedAmount,
        isManuallyAdjusted: false
      })));
    } catch (err) {
      showToast(t('addTransaction.errorMsg'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (catId, newAmount) => {
    const amount = Number(newAmount) || 0;
    setDistribution(prev => prev.map(d => {
      if (d.category === catId) {
        return { ...d, suggestedAmount: amount, isManuallyAdjusted: true };
      }
      return d;
    }));
  };

  const handlePercentageChange = (catId, newPercentage) => {
    const percentage = Number(newPercentage) || 0;
    const amount = Math.round((percentage / 100) * Number(availableBudget));
    handleAmountChange(catId, amount);
  };

  const handleSaveDraft = async () => {
    setIsLoading(true);
    try {
      const payload = {
        name: plannerName,
        availableBudget: Number(availableBudget),
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        categories: distribution,
        isRecurring,
        groupAsMaster
      };
      
      if (draftId) {
        await smartBudgetService.updateDraftPlan(draftId, payload);
      } else {
        const res = await smartBudgetService.saveDraftPlan(payload);
        setDraftId(res._id);
      }
      showToast(t('smartBudget.draftSaved'), 'success');
    } catch (err) {
      showToast(t('addTransaction.errorMsg'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      let currentDraftId = draftId;
      if (!currentDraftId) {
        const payload = { 
          name: plannerName, 
          availableBudget: Number(availableBudget), 
          period, 
          startDate: period === 'custom' ? startDate : undefined,
          endDate: period === 'custom' ? endDate : undefined,
          categories: distribution,
          isRecurring,
          groupAsMaster
        };
        const res = await smartBudgetService.saveDraftPlan(payload);
        currentDraftId = res._id;
      } else {
         await smartBudgetService.updateDraftPlan(draftId, { categories: distribution, availableBudget: Number(availableBudget), isRecurring, groupAsMaster });
      }

      await smartBudgetService.confirmPlan(currentDraftId);
      showToast(t('smartBudget.planConfirmed'), 'success');
      navigate('/budgets');
    } catch (err) {
      showToast(t('addTransaction.errorMsg'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const recommendations = useMemo(() => {
    const adjustedTotal = distribution.filter(d => d.isManuallyAdjusted).reduce((s, d) => s + d.suggestedAmount, 0);
    const remainingForOthers = Math.max(0, Number(availableBudget) - adjustedTotal);
    
    const others = distribution.filter(d => !d.isManuallyAdjusted);
    const othersInitialTotal = others.reduce((s, d) => s + d.initialSuggestedAmount, 0);

    const recs = {};
    let remainingDiff = remainingForOthers;
    
    for (let i = 0; i < others.length; i++) {
      const d = others[i];
      if (i === others.length - 1) {
         recs[d.category] = remainingDiff;
      } else {
         const share = othersInitialTotal > 0 
            ? Math.round((d.initialSuggestedAmount / othersInitialTotal) * remainingForOthers)
            : Math.round(remainingForOthers / others.length);
         recs[d.category] = share;
         remainingDiff -= share;
      }
    }
    return recs;
  }, [distribution, availableBudget]);

  const applyRecommendation = (catId) => {
    if (recommendations[catId] !== undefined) {
      handleAmountChange(catId, recommendations[catId]);
    }
  };

  const allocatedTotal = distribution.reduce((s, d) => s + d.suggestedAmount, 0);
  const remainingTotal = Number(availableBudget) - allocatedTotal;

  // Rendering Helpers
  const renderStepIcon = (num) => {
    const active = step >= num;
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${active ? 'bg-brand-blue text-white' : 'bg-white/10 text-white/50'}`}>
        {num}
      </div>
    );
  };

  return (
    <div className="pb-20 pt-6 px-4 max-w-lg mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Target className="text-brand-blue" />
          {t('smartBudget.title')}
        </h1>
        <p className="text-white/50 text-sm">{t('smartBudget.subtitle')}</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 -z-10 -translate-y-1/2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand-blue transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
        {renderStepIcon(1)}
        {renderStepIcon(2)}
        {renderStepIcon(3)}
        {renderStepIcon(4)}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{t('smartBudget.step1Title')}</h2>
              <p className="text-white/50 text-sm mb-4">{t('smartBudget.step1Desc')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white/70 text-sm mb-2">{t('smartBudget.availableBudget')}</label>
                <input 
                  type="number"
                  value={availableBudget}
                  onChange={e => setAvailableBudget(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-2xl font-bold outline-none focus:border-brand-blue transition-colors"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-2">{t('smartBudget.plannerName')}</label>
                <input 
                  type="text"
                  value={plannerName}
                  onChange={e => setPlannerName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-brand-blue transition-colors"
                  placeholder={t('smartBudget.namePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2">{t('smartBudget.period')}</label>
                <select 
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-brand-blue transition-colors"
                >
                  <option value="monthly">{t('budgets.monthly')}</option>
                  <option value="weekly">{t('budgets.weekly')}</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {period === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Start Date</label>
                    <input 
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-brand-blue transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">End Date</label>
                    <input 
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-[#1c1c1e] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-brand-blue transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 mt-4 gap-4">
                <div>
                  <h3 className="text-white font-medium">{t('budgets.recurring')}</h3>
                  <p className="text-white/50 text-xs mt-1">{t('budgets.recurringDesc')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                </label>
              </div>

              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 mt-4 gap-4">
                <div>
                  <h3 className="text-white font-medium">{t('smartBudget.groupAsMaster')}</h3>
                  <p className="text-white/50 text-xs mt-1">{t('smartBudget.groupAsMasterDesc')}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={groupAsMaster}
                    onChange={(e) => setGroupAsMaster(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-blue"></div>
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{t('smartBudget.step2Title')}</h2>
              <p className="text-white/50 text-sm mb-4">{t('smartBudget.step2Desc')}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map(cat => {
                const isSelected = selectedCategoryIds.includes(cat._id);
                return (
                  <button
                    key={cat._id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedCategoryIds(prev => prev.filter(id => id !== cat._id));
                      } else {
                        setSelectedCategoryIds(prev => [...prev, cat._id]);
                      }
                    }}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${isSelected ? 'bg-brand-blue/20 border-brand-blue' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                      {React.createElement(getIconComponent(cat.icon), { size: 16 })}
                    </div>
                    <span className="text-white text-sm font-medium">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{t('smartBudget.step3Title')}</h2>
              <p className="text-white/50 text-sm mb-4">{t('smartBudget.step3Desc')}</p>
            </div>

            <div className="space-y-4">
              {selectedCategoryIds.map(id => {
                const cat = categories.find(c => c._id === id);
                return (
                  <div key={id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                        {React.createElement(getIconComponent(cat.icon), { size: 20 })}
                      </div>
                      <span className="text-white font-medium">{cat.name}</span>
                    </div>
                    
                    <select
                      value={priorities[id]}
                      onChange={(e) => setPriorities(prev => ({...prev, [id]: e.target.value}))}
                      className="bg-[#1c1c1e] text-white border border-white/10 rounded-lg px-3 py-2 text-sm outline-none"
                    >
                      <option value="High">{t('smartBudget.priorityHigh')}</option>
                      <option value="Medium">{t('smartBudget.priorityMedium')}</option>
                      <option value="Low">{t('smartBudget.priorityLow')}</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{t('smartBudget.step4Title')}</h2>
              <p className="text-white/50 text-sm mb-4">{t('smartBudget.step4Desc')}</p>
            </div>

            <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-lg">
              <div className="p-5 border-b border-white/5 bg-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <p className="text-white/50 text-xs mb-1 uppercase tracking-wider font-bold">{t('smartBudget.availableBudget')}</p>
                <p className="text-white font-black text-3xl tracking-tight">{Number(availableBudget).toLocaleString()} <span className="text-sm font-medium text-white/40">{t('nav.currency')}</span></p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-white/5 rtl:divide-x-reverse">
                <div className="p-4">
                  <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1 font-bold">{t('smartBudget.allocatedAmount')}</p>
                  <p className="text-brand-blue font-bold text-xl">{allocatedTotal.toLocaleString()}</p>
                </div>
                <div className="p-4">
                  <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1 font-bold">{t('smartBudget.remainingAmount', 'المبلغ المتبقي')}</p>
                  <p className={`font-bold text-xl ${remainingTotal < 0 ? 'text-red-400' : remainingTotal > 0 ? 'text-green-400' : 'text-white'}`}>{remainingTotal.toLocaleString()}</p>
                </div>
              </div>
              <div className="h-1.5 w-full bg-black/40">
                <div className={`h-full transition-all duration-500 rounded-r-full ${remainingTotal < 0 ? 'bg-red-500' : 'bg-brand-blue'}`} style={{ width: `${Math.min(100, (allocatedTotal / Number(availableBudget)) * 100)}%` }} />
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-blue w-8 h-8" /></div>
            ) : (
              <div className="space-y-4 pb-6">
                {distribution.map(d => {
                  const cat = categories.find(c => c._id === d.category);
                  const isLow = d.suggestedAmount < (d.historicalAverage * 0.8) && d.historicalAverage > 0;
                  const percentage = ((d.suggestedAmount / Number(availableBudget)) * 100).toFixed(1);
                  const recommendation = recommendations[d.category];
                  const hasRecommendation = recommendation !== undefined && recommendation !== d.suggestedAmount;
                  
                  return (
                    <div key={d.category} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-4 transition-all hover:bg-white/10">
                      
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner" style={{ backgroundColor: `${cat?.color}15`, color: cat?.color }}>
                            {cat && React.createElement(getIconComponent(cat.icon), { size: 24 })}
                          </div>
                          <div>
                            <span className="text-white font-bold text-base block">{cat?.name}</span>
                            <span className="text-white/40 text-[11px] uppercase tracking-wider font-semibold block mt-0.5">{t('smartBudget.priority')}: {t(`smartBudget.priority${d.priority}`)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-black/20 rounded-xl p-3 border border-white/5 relative group">
                          <label className="text-[10px] text-white/50 uppercase tracking-wider font-bold block mb-1.5">{t('smartBudget.suggestedAmount', 'المبلغ')}</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              value={d.suggestedAmount}
                              onChange={(e) => handleAmountChange(d.category, e.target.value)}
                              className="bg-transparent text-white w-full text-lg font-black outline-none focus:text-brand-blue transition-colors"
                            />
                            <span className="text-white/30 text-xs font-bold">{t('nav.currency')}</span>
                          </div>
                        </div>

                        <div className="bg-black/20 rounded-xl p-3 border border-white/5 relative group">
                          <label className="text-[10px] text-white/50 uppercase tracking-wider font-bold block mb-1.5">{t('smartBudget.percentage', 'النسبة المئوية')}</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              value={percentage}
                              onChange={(e) => handlePercentageChange(d.category, e.target.value)}
                              className="bg-transparent text-white w-full text-lg font-black outline-none focus:text-brand-blue transition-colors"
                            />
                            <span className="text-white/30 text-xs font-bold">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/50 font-medium">{t('smartBudget.historicalAverage')}: <strong className="text-white">{d.historicalAverage.toLocaleString()}</strong></span>
                        </div>
                        
                        {d.basedOn && (
                          <div className="bg-black/20 rounded-lg p-2.5 border border-white/5 w-max max-w-full mt-1">
                            <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-1">
                              {t('budgets.confidenceLabel', 'This recommendation is based on:')}
                            </p>
                            <p className="text-xs font-medium text-blue-200">
                              {t('budgets.confidenceStats', '{{months}} months • {{transactions}} transactions')
                                .replace('{{months}}', d.basedOn.months)
                                .replace('{{transactions}}', d.basedOn.transactions)}
                            </p>
                          </div>
                        )}
                        
                        {hasRecommendation && (
                          <div className="bg-brand-blue/10 border border-brand-blue/20 rounded-xl p-3 flex items-center justify-between mt-1">
                             <div>
                               <p className="text-[10px] text-brand-blue/70 uppercase tracking-wider font-bold mb-0.5">{t('smartBudget.recommendationTitle', 'توصية مقترحة')}</p>
                               <p className="text-brand-blue font-bold text-sm">{recommendation.toLocaleString()} {t('nav.currency')}</p>
                             </div>
                             <button 
                               onClick={() => applyRecommendation(d.category)}
                               className="px-4 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-lg shadow hover:bg-blue-500 transition-colors"
                             >
                               {t('smartBudget.apply', 'تطبيق')}
                             </button>
                          </div>
                        )}
                      </div>

                      {isLow && (
                        <div className="bg-yellow-500/10 text-yellow-500 text-xs p-3 rounded-xl flex gap-2 items-start border border-yellow-500/20">
                          <AlertCircle size={16} className="shrink-0 mt-0.5" />
                          <span className="font-medium leading-relaxed">{t('smartBudget.warningLow')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Footer */}
      <div className="mt-10 mb-4 z-40">
        <div className="flex gap-3">
          {step > 1 && (
            <button 
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-3.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
            >
              {t('smartBudget.back')}
            </button>
          )}
          
          {step < 4 ? (
            <button 
              onClick={handleNext}
              className="flex-1 px-6 py-3.5 rounded-xl bg-brand-blue text-white font-bold hover:bg-blue-500 transition-colors flex justify-center items-center gap-2"
            >
              {t('smartBudget.next')}
              <ArrowRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
            </button>
          ) : (
            <>
              <button 
                onClick={handleSaveDraft}
                disabled={isLoading}
                className="flex-1 px-4 py-3.5 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                <span className="hidden sm:inline">{t('smartBudget.saveDraft')}</span>
              </button>
              <button 
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-[2] px-4 py-3.5 rounded-xl bg-brand-blue text-white font-bold hover:bg-blue-500 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                {t('smartBudget.confirmPlan')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
