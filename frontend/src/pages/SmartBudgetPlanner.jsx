import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { getCategories, createCategory } from '../api/categories';
import { getAccounts } from '../api/accounts';
import { getEmergencyFund } from '../api/emergencyFund';
import { getSavingsGoals } from '../api/savingsGoals';
import { getTransactions } from '../api/transactions';
import { calculateAccountBalances } from '../utils/accountBalances';
import { smartBudgetService } from '../api/smartBudgets';
import { ArrowRight, ArrowLeft, Target, AlertCircle, Save, Check, Loader2, ShieldCheck, PiggyBank, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getIconComponent } from '../components/IconPicker';
import SurplusTransferModal from '../components/planning/SurplusTransferModal';

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

  // Financial Context for Surplus Allocation
  const [accounts, setAccounts] = useState([]);
  const [emergencyShield, setEmergencyShield] = useState(null);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [isSurplusModalOpen, setIsSurplusModalOpen] = useState(false);
  const [surplusTargetType, setSurplusTargetType] = useState('emergency');

  const categoriesMap = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      map.set(c._id, c);
    }
    return map;
  }, [categories]);

  const selectedCategorySet = useMemo(() => {
    return new Set(selectedCategoryIds);
  }, [selectedCategoryIds]);

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
    loadFinancialContext();
  }, []);

  const loadFinancialContext = async () => {
    try {
      const [accs, shield, goals, txs] = await Promise.all([
        getAccounts().catch(() => []),
        getEmergencyFund().catch(() => null),
        getSavingsGoals().catch(() => []),
        getTransactions().catch(() => [])
      ]);
      const safeAccs = accs || [];
      const balMap = calculateAccountBalances({ accounts: safeAccs, transactions: txs || [] });
      const enrichedAccounts = safeAccs.map(a => ({
        ...a,
        balance: balMap.get(a._id?.toString()) ?? (a.balance_adjustment || 0)
      }));
      setAccounts(enrichedAccounts);
      setEmergencyShield(shield || null);
      setSavingsGoals(goals || []);
    } catch (err) {
      console.error('[SMART_PLANNER] Failed to load financial context:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await getCategories();
      setCategories(cats.filter(c => c.type === 'expense'));
    } catch (err) {
      showToast(t('common.deleteError'), 'error');
    }
  };

  const handleNext = async () => {
    if (isLoading) return;

    if (step === 1) {
      const budgetNum = Number(availableBudget);
      if (!budgetNum || isNaN(budgetNum) || budgetNum <= 0) {
        return showToast(t('smartBudget.enterValidBudget'), 'error');
      }
      if (period === 'custom') {
        if (!startDate || !endDate) {
          return showToast(t('smartBudget.invalidDateRange'), 'error');
        }
        if (new Date(startDate) > new Date(endDate)) {
          return showToast(t('smartBudget.invalidDateRange'), 'error');
        }
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
      const success = await generatePlan();
      if (success) {
        setStep(4);
      }
    }
  };

  const generatePlan = async () => {
    setIsLoading(true);
    try {
      const payload = {
        availableBudget: Math.max(0, Number(availableBudget) || 0),
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        categories: selectedCategoryIds.map(id => ({
          categoryId: id,
          priority: priorities[id] || 'Medium'
        })),
        isRecurring
      };
      const result = await smartBudgetService.generateDistribution(payload);
      if (!result || !Array.isArray(result) || result.length === 0) {
        throw new Error('Empty distribution result');
      }
      setDistribution(result.map(d => ({
        ...d,
        suggestedAmount: Math.max(0, Number(d.suggestedAmount) || 0),
        initialSuggestedAmount: Math.max(0, Number(d.suggestedAmount) || 0),
        isManuallyAdjusted: false
      })));
      return true;
    } catch (err) {
      console.error('[SMART_PLANNER_GENERATE_ERROR]:', err);
      showToast(t('smartBudget.generationFailed'), 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = useCallback((catId, newAmount) => {
    const amount = Math.max(0, Number(newAmount) || 0);
    setDistribution(prev => prev.map(d => {
      if (d.category === catId) {
        return { ...d, suggestedAmount: amount, isManuallyAdjusted: true };
      }
      return d;
    }));
  }, []);

  const handlePercentageChange = useCallback((catId, newPercentage) => {
    const rawVal = Number(newPercentage);
    const percentage = isNaN(rawVal) ? 0 : Math.max(0, Math.min(1000, rawVal));
    const budgetTotal = Math.max(0, Number(availableBudget) || 0);
    const amount = Math.round((percentage / 100) * budgetTotal);
    handleAmountChange(catId, amount);
  }, [availableBudget, handleAmountChange]);

  const handleSaveDraft = async () => {
    if (isLoading) return;
    if (distribution.length === 0) {
      return showToast(t('smartBudget.emptyCategories'), 'error');
    }

    setIsLoading(true);
    try {
      const payload = {
        name: plannerName.trim(),
        availableBudget: Math.max(0, Number(availableBudget) || 0),
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
      console.error('[SMART_PLANNER_SAVE_DRAFT_ERROR]:', err);
      const msg = err.response?.data?.message || t('common.saveError');
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (isLoading) return;
    if (distribution.length === 0) {
      return showToast(t('smartBudget.emptyCategories'), 'error');
    }

    setIsLoading(true);
    try {
      let currentDraftId = draftId;
      if (!currentDraftId) {
        const payload = { 
          name: plannerName.trim(), 
          availableBudget: Math.max(0, Number(availableBudget) || 0), 
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
      console.error('[SMART_PLANNER_CONFIRM_ERROR]:', err);
      const msg = err.response?.data?.message || t('common.saveError');
      showToast(msg, 'error');
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

  const applyRecommendation = useCallback((catId) => {
    if (recommendations[catId] !== undefined) {
      handleAmountChange(catId, recommendations[catId]);
    }
  }, [recommendations, handleAmountChange]);

  const { allocatedTotal, remainingTotal } = useMemo(() => {
    const allocated = distribution.reduce((s, d) => s + (d.suggestedAmount || 0), 0);
    const budgetVal = Number(availableBudget) || 0;
    return {
      allocatedTotal: allocated,
      remainingTotal: budgetVal - allocated
    };
  }, [distribution, availableBudget]);

  const openSurplusModal = useCallback((type) => {
    setSurplusTargetType(type);
    setIsSurplusModalOpen(true);
  }, []);

  const handleSurplusTransferSuccess = async ({ amount, targetType, addToBudgetPlan, selectedGoal }) => {
    if (!addToBudgetPlan) return;

    const targetCategoryName = targetType === 'emergency'
      ? t('smartBudget.emergencyCategoryName')
      : targetType === 'savings'
      ? t('smartBudget.savingsCategoryName')
      : (selectedGoal ? selectedGoal.title : t('smartBudget.goalsCategoryName'));

    // 1. Look for existing category in categories array
    let matchingCat = categories.find(c => {
      const cName = c.name?.toLowerCase() || '';
      if (targetType === 'emergency') {
        return cName.includes('emergency') || cName.includes('طوارئ') || cName.includes('طوارىء');
      }
      if (targetType === 'savings') {
        return cName.includes('saving') || cName.includes('ادخار');
      }
      if (targetType === 'goals') {
        return cName.includes(selectedGoal?.title?.toLowerCase() || 'goal') || cName.includes('هدف') || cName.includes('ادخار');
      }
      return false;
    });

    // 2. If no matching category found, create one via createCategory API
    if (!matchingCat) {
      try {
        const newCatPayload = {
          name: targetCategoryName,
          type: 'expense',
          icon: targetType === 'emergency' ? 'Shield' : targetType === 'savings' ? 'PiggyBank' : 'Target',
          color: '#8D6346'
        };
        matchingCat = await createCategory(newCatPayload);
        if (matchingCat) {
          setCategories(prev => [...prev, matchingCat]);
        }
      } catch (err) {
        console.error('[SMART_PLANNER] Failed to create matching category:', err);
      }
    }

    if (matchingCat) {
      const catId = matchingCat._id;
      setSelectedCategoryIds(prev => prev.includes(catId) ? prev : [...prev, catId]);
      setPriorities(prev => ({ ...prev, [catId]: prev[catId] || 'High' }));

      setDistribution(prev => {
        const existingIndex = prev.findIndex(d => (d.category?._id || d.category) === catId);
        if (existingIndex >= 0) {
          return prev.map((d, idx) => {
            if (idx === existingIndex) {
              return {
                ...d,
                suggestedAmount: d.suggestedAmount + Number(amount),
                isManuallyAdjusted: true
              };
            }
            return d;
          });
        } else {
          return [
            ...prev,
            {
              category: catId,
              priority: 'High',
              suggestedAmount: Number(amount),
              historicalAverage: 0,
              initialSuggestedAmount: Number(amount),
              isManuallyAdjusted: true
            }
          ];
        }
      });
    }
  };

  // Rendering Helpers
  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  const stepLabels = [
    t('smartBudget.step1Title') || (language === 'ar' ? 'الميزانية' : 'Budget'),
    t('smartBudget.step2Title') || (language === 'ar' ? 'الفئات' : 'Categories'),
    t('smartBudget.step3Title') || (language === 'ar' ? 'الأولويات' : 'Priorities'),
    t('smartBudget.step4Title') || (language === 'ar' ? 'المراجعة' : 'Review')
  ];

  const renderStepItem = (num) => {
    const isCurrent = step === num;
    const isPast = step > num;
    
    let stateClasses = 'text-white/30 border border-transparent liquidglass';
    if (isCurrent) {
      stateClasses = 'text-white bg-[#8D6346] backdrop-blur-md border border-white/40 shadow-[0_0_16px_rgba(141,99,70,0.7),inset_0_1px_1px_rgba(255,255,255,0.3)] ring-2 ring-[#8D6346]/40';
    } else if (isPast) {
      stateClasses = 'text-[#E8C5A8] bg-[#8D6346]/70 backdrop-blur-md border border-[#8D6346]/50 shadow-[0_0_10px_rgba(141,99,70,0.4)]';
    }

    return (
      <div 
        key={num} 
        className="flex flex-col items-center gap-1.5 z-10"
        aria-current={isCurrent ? 'step' : undefined}
      >
        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${stateClasses}`}>
          {isPast ? <Check size={14} className="stroke-[3]" /> : num}
        </div>
        <span className={`text-[10px] sm:text-xs font-semibold hidden sm:block transition-colors max-w-[80px] sm:max-w-[100px] text-center truncate ${isCurrent ? 'text-white drop-shadow-sm' : isPast ? 'text-[#E8C5A8]' : 'text-white/30'}`}>
          {stepLabels[num - 1]}
        </span>
      </div>
    );
  };

  return (
    <div className="pb-32 pt-6 px-4 max-w-xl lg:max-w-3xl mx-auto min-h-screen relative selection:bg-[#8D6346]/40 selection:text-white">
      <div className="fixed inset-0 -z-10 bg-[#100E11] overflow-hidden">
        <div className="absolute top-[-50px] left-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-40 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-[30%] right-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-30 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-[#8D6346] opacity-30 blur-[150px] rounded-full pointer-events-none" />
      </div>
      <div className="mb-8 flex items-center gap-4">
        {step === 1 && (
          <motion.button 
            whileTap={{ scale: 0.92 }}
            type="button"
            onClick={() => navigate('/budgets')} 
            aria-label={t('smartBudget.backToBudgets') || t('common.back')}
            className="w-12 h-12 shrink-0 flex items-center justify-center rounded-[2rem] bg-[rgba(141,99,70,0.4)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[rgba(141,99,70,0.6)] transition-colors text-white touch-manipulation"
          >
            <BackIcon size={24} />
          </motion.button>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Target className="text-[#8D6346]" />
            {t('smartBudget.title')}
          </h1>
          <p className="text-white/50 text-xs sm:text-sm">{t('smartBudget.subtitle')}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-8 relative px-2">
        <div className="absolute top-4 sm:top-4.5 left-6 right-6 h-1.5 liquidglass border border-white/5 shadow-inner -z-0 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#8D6346] via-[#B8865C] to-[#E8C5A8] shadow-[0_0_12px_rgba(141,99,70,0.6)] transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />
        </div>
        {renderStepItem(1)}
        {renderStepItem(2)}
        {renderStepItem(3)}
        {renderStepItem(4)}
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
                <label className="block text-white/70 text-sm mb-2 font-medium">{t('smartBudget.availableBudget')}</label>
                <div className="relative">
                  <input 
                    type="number"
                    inputMode="decimal"
                    min="1"
                    step="any"
                    value={availableBudget}
                    onChange={e => {
                      const val = e.target.value;
                      setAvailableBudget(val === '' ? '' : Math.max(0, Number(val)));
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-2xl font-black outline-none focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 transition-all tabular-nums tracking-tight caret-[#E8C5A8] shadow-inner placeholder:text-white/20"
                    placeholder="0.00"
                  />
                  <span className="absolute end-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold pointer-events-none">
                    {t('nav.currency')}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">{t('smartBudget.plannerName')}</label>
                <input 
                  type="text"
                  value={plannerName}
                  onChange={e => setPlannerName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 transition-all caret-[#E8C5A8] shadow-inner placeholder:text-white/30 text-sm sm:text-base"
                  placeholder={t('smartBudget.namePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-white/70 text-sm mb-2 font-medium">{t('smartBudget.period')}</label>
                <select 
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="w-full bg-[#1c1c1e] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 transition-all text-sm sm:text-base cursor-pointer"
                >
                  <option value="monthly">{t('budgets.monthly')}</option>
                  <option value="weekly">{t('budgets.weekly')}</option>
                  <option value="custom">{t('smartBudget.custom') || t('budgets.custom')}</option>
                </select>
              </div>

              {period === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">{t('smartBudget.startDate')}</label>
                    <input 
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full liquidglass bg-[#1c1c1e] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#8D6346] transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">{t('smartBudget.endDate')}</label>
                    <input 
                      type="date"
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full liquidglass bg-[#1c1c1e] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-[#8D6346] transition-colors [color-scheme:dark]"
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
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8D6346]"></div>
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
                  <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8D6346]"></div>
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

            {categories.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-[2rem] bg-white/5 border border-white/10">
                <Target size={40} className="mx-auto text-white/30 mb-3" />
                <h3 className="text-white font-bold text-base mb-1">{t('smartBudget.noCategoriesAvailable')}</h3>
                <p className="text-white/50 text-xs max-w-xs mx-auto mb-4">{t('smartBudget.noCategoriesDesc')}</p>
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="px-5 py-2.5 rounded-full bg-[#8D6346] hover:bg-[#8D6346]/80 text-white text-xs font-bold transition-all shadow-md touch-manipulation"
                >
                  {t('smartBudget.createCategory')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {categories.map(cat => {
                  const isSelected = selectedCategorySet.has(cat._id);
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
                      className={`flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl border transition-all text-start min-h-[56px] touch-manipulation backdrop-blur-md ${
                        isSelected 
                          ? 'bg-gradient-to-br from-[#8D6346]/35 to-[#2B2321]/60 border-[#8D6346] shadow-[0_4px_16px_rgba(141,99,70,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div 
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all shrink-0 border"
                        style={{ 
                          backgroundColor: `${cat.color}20`, 
                          borderColor: isSelected ? cat.color : `${cat.color}40`,
                          color: cat.color, 
                          boxShadow: isSelected ? `0 0 12px ${cat.color}60` : 'none' 
                        }}
                      >
                        {React.createElement(getIconComponent(cat.icon), { size: 18 })}
                      </div>
                      <span className="text-white text-sm font-semibold truncate" title={cat.name}>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
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

            <div className="space-y-3 sm:space-y-4">
              {selectedCategoryIds.map(id => {
                const cat = categoriesMap.get(id);
                if (!cat) return null;
                const priority = priorities[id] || 'Medium';
                const priorityColorClass = priority === 'High'
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 focus:border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : priority === 'Low'
                  ? 'border-sky-500/40 bg-sky-500/15 text-sky-300 focus:border-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.15)]'
                  : 'border-[#8D6346]/40 bg-[#8D6346]/20 text-[#E8C5A8] focus:border-[#8D6346] shadow-[0_0_12px_rgba(141,99,70,0.2)]';

                return (
                  <div key={id} className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-3.5 sm:p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                        {React.createElement(getIconComponent(cat.icon), { size: 20 })}
                      </div>
                      <span className="text-white font-medium text-sm sm:text-base truncate" title={cat.name}>{cat.name}</span>
                    </div>
                    
                    <select
                      value={priority}
                      onChange={(e) => setPriorities(prev => ({...prev, [id]: e.target.value}))}
                      className={`rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold outline-none cursor-pointer min-h-[44px] touch-manipulation border transition-all shrink-0 ${priorityColorClass}`}
                    >
                      <option value="High" className="bg-[#1C1819] text-amber-300">{t('smartBudget.priorityHigh')}</option>
                      <option value="Medium" className="bg-[#1C1819] text-[#E8C5A8]">{t('smartBudget.priorityMedium')}</option>
                      <option value="Low" className="bg-[#1C1819] text-sky-300">{t('smartBudget.priorityLow')}</option>
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

            <div className="bg-[#2B2321]/30 backdrop-blur-[32px] rounded-[2rem] border border-white/10 overflow-hidden flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <div className="p-5 border-b border-white/5 bg-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#8D6346]/15 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <p className="text-white/50 text-xs mb-1 uppercase tracking-wider font-bold">{t('smartBudget.availableBudget')}</p>
                <p className="text-white font-black text-2xl sm:text-3xl tracking-tight drop-shadow-sm">{Number(availableBudget).toLocaleString()} <span className="text-sm font-medium text-white/40">{t('nav.currency')}</span></p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-white/5 rtl:divide-x-reverse">
                <div className="p-4 bg-[#8D6346]/10 border-e border-white/5">
                  <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1 font-bold">{t('smartBudget.allocatedAmount')}</p>
                  <p className="text-[#E8C5A8] font-bold text-lg sm:text-xl tabular-nums">{allocatedTotal.toLocaleString()}</p>
                </div>
                <div className={`p-4 transition-colors ${remainingTotal < 0 ? 'bg-rose-500/10' : remainingTotal > 0 ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                  <p className="text-white/50 text-[10px] uppercase tracking-wider mb-1 font-bold">{t('smartBudget.remainingAmount')}</p>
                  <p className={`font-bold text-lg sm:text-xl tabular-nums ${remainingTotal < 0 ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.3)]' : remainingTotal > 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,199,89,0.3)]' : 'text-white'}`}>{remainingTotal.toLocaleString()}</p>
                </div>
              </div>
              <div 
                role="progressbar"
                aria-valuenow={allocatedTotal}
                aria-valuemin={0}
                aria-valuemax={Math.max(1, Number(availableBudget) || 1)}
                className="h-2 w-full bg-black/40 overflow-hidden"
              >
                <div className={`h-full transition-all duration-500 rounded-r-full ${remainingTotal < 0 ? 'bg-gradient-to-r from-red-600 via-rose-500 to-red-400 shadow-[0_0_12px_rgba(244,63,94,0.6)]' : 'bg-gradient-to-r from-[#8D6346] via-[#B8865C] to-[#E8C5A8] shadow-[0_0_12px_rgba(141,99,70,0.5)]'}`} style={{ width: `${Math.min(100, (allocatedTotal / (Number(availableBudget) || 1)) * 100)}%` }} />
              </div>
            </div>

            {/* Surplus Budget Allocation Suggestions */}
            {remainingTotal > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#2B2321]/30 backdrop-blur-[32px] rounded-[2rem] border border-[#8D6346]/40 p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-36 h-36 bg-[#8D6346]/20 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
                
                <div className="flex items-start gap-3 mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/30 flex items-center justify-center text-[#E8C5A8] shadow-inner shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                        {t('smartBudget.surplusTitle')}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold tabular-nums shadow-[0_0_10px_rgba(52,199,89,0.2)]">
                        +{remainingTotal.toLocaleString()} {t('nav.currency')}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
                      {t('smartBudget.surplusDesc')}
                    </p>
                  </div>
                </div>

                {/* Suggestion Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
                  {/* 1. Emergency Fund (Resilience Emerald) */}
                  <motion.button
                    data-testid="surplus-btn-emergency"
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => openSurplusModal('emergency')}
                    className="flex flex-col items-start p-4 rounded-2xl bg-white/5 hover:bg-emerald-500/5 border border-white/10 hover:border-emerald-500/40 transition-all text-start group shadow-inner cursor-pointer touch-manipulation min-h-[72px]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(52,199,89,0.25)] mb-2.5 group-hover:scale-105 transition-transform">
                      <ShieldCheck size={18} />
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors block">
                      {t('smartBudget.assignToEmergency')}
                    </span>
                    <span className="text-[11px] text-white/50 block mt-0.5 leading-snug">
                      {t('smartBudget.assignToEmergencyDesc')}
                    </span>
                  </motion.button>

                  {/* 2. Savings Account (Signature Copper) */}
                  <motion.button
                    data-testid="surplus-btn-savings"
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => openSurplusModal('savings')}
                    className="flex flex-col items-start p-4 rounded-2xl bg-white/5 hover:bg-[#8D6346]/10 border border-white/10 hover:border-[#8D6346]/60 transition-all text-start group shadow-inner cursor-pointer touch-manipulation min-h-[72px]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#8D6346]/25 border border-[#8D6346]/45 flex items-center justify-center text-[#E8C5A8] shadow-[0_0_12px_rgba(141,99,70,0.3)] mb-2.5 group-hover:scale-105 transition-transform">
                      <PiggyBank size={18} />
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-[#E8C5A8] transition-colors block">
                      {t('smartBudget.assignToSavings')}
                    </span>
                    <span className="text-[11px] text-white/50 block mt-0.5 leading-snug">
                      {t('smartBudget.assignToSavingsDesc')}
                    </span>
                  </motion.button>

                  {/* 3. Planning & Goals (Ambition Indigo) */}
                  <motion.button
                    data-testid="surplus-btn-goals"
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => openSurplusModal('goals')}
                    className="flex flex-col items-start p-4 rounded-2xl bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/40 transition-all text-start group shadow-inner cursor-pointer touch-manipulation min-h-[72px]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)] mb-2.5 group-hover:scale-105 transition-transform">
                      <Target size={18} />
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors block">
                      {t('smartBudget.assignToGoals')}
                    </span>
                    <span className="text-[11px] text-white/50 block mt-0.5 leading-snug">
                      {t('smartBudget.assignToGoalsDesc')}
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#8D6346] w-8 h-8" /></div>
            ) : (
              <div className="space-y-4 pb-6">
                {distribution.map(d => {
                  const cat = categoriesMap.get(d.category);
                  const isLow = d.suggestedAmount < (d.historicalAverage * 0.8) && d.historicalAverage > 0;
                  const percentage = Number(availableBudget) > 0 
                    ? ((d.suggestedAmount / Number(availableBudget)) * 100).toFixed(1) 
                    : '0.0';
                  const recommendation = recommendations[d.category];
                  const hasRecommendation = recommendation !== undefined && recommendation !== d.suggestedAmount;
                  
                  return (
                    <div key={d.category} className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-4 sm:p-5 flex flex-col gap-4 transition-all hover:border-white/20">
                      
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-inner shrink-0" style={{ backgroundColor: `${cat?.color}15`, color: cat?.color }}>
                            {cat && React.createElement(getIconComponent(cat.icon), { size: 22 })}
                          </div>
                          <div className="min-w-0">
                            <span className="text-white font-bold text-sm sm:text-base block truncate max-w-[180px] sm:max-w-xs" title={cat?.name}>{cat?.name}</span>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                d.priority === 'High' 
                                  ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                                  : d.priority === 'Low'
                                  ? 'text-sky-300 bg-sky-500/15 border-sky-500/30'
                                  : 'text-[#E8C5A8] bg-[#8D6346]/20 border-[#8D6346]/40'
                              }`}>
                                {t(`smartBudget.priority${d.priority}`)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)] focus-within:border-[#8D6346]/60 focus-within:shadow-[0_0_14px_rgba(141,99,70,0.25)] transition-all relative group">
                          <label className="text-[10px] text-white/50 uppercase tracking-wider font-bold block mb-1.5">{t('smartBudget.suggestedAmount')}</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="any"
                              value={d.suggestedAmount}
                              onChange={(e) => handleAmountChange(d.category, e.target.value)}
                              className="bg-transparent text-white w-full text-base sm:text-lg font-black outline-none focus:text-[#E8C5A8] transition-colors tabular-nums tracking-tight caret-[#E8C5A8] selection:bg-[#8D6346]/40"
                            />
                            <span className="text-white/30 text-xs font-bold shrink-0">{t('nav.currency')}</span>
                          </div>
                        </div>

                        <div className="bg-black/25 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)] focus-within:border-[#8D6346]/60 focus-within:shadow-[0_0_14px_rgba(141,99,70,0.25)] transition-all relative group">
                          <label className="text-[10px] text-white/50 uppercase tracking-wider font-bold block mb-1.5">{t('smartBudget.percentage')}</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max="1000"
                              step="0.1"
                              value={percentage}
                              onChange={(e) => handlePercentageChange(d.category, e.target.value)}
                              className="bg-transparent text-white w-full text-base sm:text-lg font-black outline-none focus:text-[#E8C5A8] transition-colors tabular-nums tracking-tight caret-[#E8C5A8] selection:bg-[#8D6346]/40"
                            />
                            <span className="text-white/30 text-xs font-bold shrink-0">%</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-white/50 font-medium">{t('smartBudget.historicalAverage')}: <strong className="text-white tabular-nums">{d.historicalAverage.toLocaleString()}</strong></span>
                        </div>
                        
                        {d.basedOn && (
                          <div className="bg-black/20 rounded-lg p-2.5 border border-white/5 w-max max-w-full mt-1">
                            <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-1">
                              {t('budgets.confidenceLabel')}
                            </p>
                            <p className="text-xs font-medium text-[#E8C5A8]">
                              {t('budgets.confidenceStats')
                                .replace('{{months}}', d.basedOn.months)
                                .replace('{{transactions}}', d.basedOn.transactions)}
                            </p>
                          </div>
                        )}
                        
                        {hasRecommendation && (
                          <div className="bg-gradient-to-r from-[#8D6346]/20 via-[#8D6346]/10 to-transparent border border-[#8D6346]/35 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 mt-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]">
                             <div>
                               <p className="text-[10px] text-[#E8C5A8] uppercase tracking-wider font-bold mb-0.5">{t('smartBudget.recommendationTitle')}</p>
                               <p className="text-white font-bold text-sm tabular-nums">{recommendation.toLocaleString()} <span className="text-xs font-normal text-white/50">{t('nav.currency')}</span></p>
                             </div>
                             <button 
                               onClick={() => applyRecommendation(d.category)}
                               className="px-3.5 sm:px-4 py-2 bg-[#8D6346] text-white text-xs font-bold rounded-xl shadow-[0_2px_10px_rgba(141,99,70,0.3)] hover:bg-[#8D6346]/85 transition-colors touch-manipulation min-h-[36px]"
                             >
                               {t('smartBudget.apply')}
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
      <div className="mt-8 mb-4 z-40">
        <div className="flex gap-3">
          {step > 1 && (
            <motion.button 
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-5 sm:px-6 py-3.5 rounded-full font-semibold text-sm sm:text-[15px] text-white/80 hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 flex items-center justify-center backdrop-blur-md touch-manipulation min-h-[48px]"
            >
              {t('smartBudget.back')}
            </motion.button>
          )}
          
          {step < 4 ? (
            <motion.button 
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleNext}
              className="flex-1 py-3.5 rounded-full font-bold text-sm sm:text-[15px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md touch-manipulation min-h-[48px]"
            >
              {t('smartBudget.next')}
              <ArrowRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
            </motion.button>
          ) : (
            <>
              <motion.button 
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={handleSaveDraft}
                disabled={isLoading}
                className="flex-1 py-3.5 rounded-full font-bold text-xs sm:text-[15px] text-white/80 hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 flex items-center justify-center gap-2 backdrop-blur-md disabled:opacity-50 touch-manipulation min-h-[48px]"
              >
                <Save size={18} />
                <span className="hidden sm:inline">{t('smartBudget.saveDraft')}</span>
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleConfirm}
                disabled={isLoading}
                className="flex-[2] py-3.5 rounded-full font-bold text-xs sm:text-[15px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md disabled:opacity-50 disabled:pointer-events-none touch-manipulation min-h-[48px]"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                {t('smartBudget.confirmPlan')}
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* Surplus Transfer Modal */}
      <SurplusTransferModal
        isOpen={isSurplusModalOpen}
        onClose={() => setIsSurplusModalOpen(false)}
        targetType={surplusTargetType}
        remainingAmount={remainingTotal > 0 ? remainingTotal : 0}
        accounts={accounts}
        emergencyShield={emergencyShield}
        savingsGoals={savingsGoals}
        onSuccess={handleSurplusTransferSuccess}
      />
    </div>
  );
}
