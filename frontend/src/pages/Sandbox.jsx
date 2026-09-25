import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { 
  runSimulation, 
  applySimulation, 
  saveSimulationHistory, 
  getSimulationHistory 
} from '../api/sandbox';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { getBills } from '../api/bills';
import { getDebts } from '../api/debts';
import { getRecurringTransactions } from '../api/recurringTransactions';
import { getInvestments } from '../api/investments';
import { getTransactions } from '../api/transactions';
import { getInstallments } from '../api/installments';
import { getReceivables } from '../api/receivables';
import { calculateAccountBalances } from '../utils/accountBalances';
import { budgetService } from '../services/budgetService';
import { 
  ArrowLeft, ShoppingBag, Banknote, PieChart, CreditCard, 
  Calendar, Repeat, TrendingUp, Save, Play, X, ListPlus, 
  Sparkles, ArrowRightLeft, CheckCircle2, RotateCcw, Shield,
  Edit3, Sliders
} from 'lucide-react';

import SimulationModals from '../components/sandbox/SimulationModals';
import FocusedDecisionCard from '../components/sandbox/FocusedDecisionCard';
import HistoryPanel from '../components/sandbox/HistoryPanel';
import CommitPlanModal from '../components/sandbox/CommitPlanModal';
import { useNotification } from '../contexts/NotificationContext';

const SIMULATION_TYPES = [
  { id: 'purchase', icon: ShoppingBag, title: 'Purchase', titleKey: 'sandbox.purchase', subKey: 'sandbox.hints.purchaseSub' },
  { id: 'installment', icon: CreditCard, title: 'Installment Plan', titleKey: 'installments.title', subKey: 'sandbox.hints.installmentSub' },
  { id: 'salary', icon: Banknote, title: 'Salary Change', titleKey: 'sandbox.salary', subKey: 'sandbox.hints.salarySub' },
  { id: 'budget', icon: PieChart, title: 'Budget Adjustment', titleKey: 'sandbox.budget', subKey: 'sandbox.hints.budgetSub' },
  { id: 'debt', icon: CreditCard, title: 'Debt Action', titleKey: 'sandbox.debt', subKey: 'sandbox.hints.debtSub' },
  { id: 'bill', icon: Calendar, title: 'Bill Payment', titleKey: 'sandbox.bill', subKey: 'sandbox.hints.billSub' },
  { id: 'recurring', icon: Repeat, title: 'Recurring Change', titleKey: 'sandbox.recurring', subKey: 'sandbox.hints.recurringSub' },
  { id: 'investment', icon: TrendingUp, title: 'Investment Action', titleKey: 'sandbox.investment', subKey: 'sandbox.hints.investmentSub' }
];

export default function Sandbox() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const notify = useNotification();
  
  const money = (value) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(value || 0);

  const [activeModal, setActiveModal] = useState(null);
  const [actionQueue, setActionQueue] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [horizonMonths, setHorizonMonths] = useState(6);

  // Commit Modal State
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Save Scenario Modal State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTitleInput, setSaveTitleInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Metadata for dropdowns
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [bills, setBills] = useState([]);
  const [debts, setDebts] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [investments, setInvestments] = useState([]);

  useEffect(() => {
    loadMetaData();
    loadHistory();
  }, []);

  useEffect(() => {
    if (activeModal && (accounts.length === 0 || categories.length === 0)) {
      loadMetaData();
    }
  }, [activeModal, accounts.length, categories.length]);

  const loadMetaData = async () => {
    try {
      const results = await Promise.allSettled([
        getAccounts(),
        getCategories(),
        budgetService.getBudgets(),
        getBills(),
        getDebts(),
        getRecurringTransactions(),
        getInvestments(),
        getTransactions(),
        getInstallments(),
        getReceivables()
      ]);

      const [
        accsRes, catsRes, bdgsRes, blsRes, dbsRes, 
        recsRes, invsRes, txsRes, instsRes, recvsRes
      ] = results;

      const rawAccounts = accsRes.status === 'fulfilled' && accsRes.value ? accsRes.value : [];
      const activeAccounts = rawAccounts.filter(a => !a.isArchived);

      const allTransactions = txsRes.status === 'fulfilled' && txsRes.value ? txsRes.value : [];
      const debtsData = dbsRes.status === 'fulfilled' && dbsRes.value ? dbsRes.value : {};
      const debtTransactions = debtsData.transactions || [];
      const installmentsData = instsRes.status === 'fulfilled' && instsRes.value ? instsRes.value : {};
      const installmentTransactions = installmentsData.transactions || [];
      const receivablesData = recvsRes.status === 'fulfilled' && recvsRes.value ? recvsRes.value : [];
      const investmentsData = invsRes.status === 'fulfilled' && invsRes.value ? invsRes.value : [];

      let invValue = 0;
      if (Array.isArray(investmentsData)) {
        investmentsData.forEach(inv => {
          invValue += Number(inv.quantity || 0) * Number(inv.currentPrice || inv.purchasePrice || 0);
        });
      }

      const balancesMap = calculateAccountBalances({
        accounts: activeAccounts,
        transactions: allTransactions,
        debtTransactions,
        installmentTransactions,
        receivables: receivablesData,
        investmentsValue: invValue
      });

      const accountsWithBalance = activeAccounts.map(acc => ({
        ...acc,
        calculatedBalance: balancesMap.get(acc._id?.toString()) ?? Number(acc.balance_adjustment || 0)
      }));

      setAccounts(accountsWithBalance);

      if (catsRes.status === 'fulfilled' && catsRes.value) {
        setCategories(catsRes.value);
      }
      if (bdgsRes.status === 'fulfilled' && bdgsRes.value) {
        setBudgets(bdgsRes.value);
      }
      if (blsRes.status === 'fulfilled' && blsRes.value) {
        setBills(blsRes.value);
      }
      if (dbsRes.status === 'fulfilled' && dbsRes.value) {
        setDebts(dbsRes.value?.debts || dbsRes.value || []);
      }
      if (recsRes.status === 'fulfilled' && recsRes.value) {
        setRecurring(recsRes.value);
      }
      if (invsRes.status === 'fulfilled' && invsRes.value) {
        setInvestments(invsRes.value);
      }
    } catch (e) {
      console.error('Failed to load metadata in sandbox:', e);
    }
  };

  const loadHistory = async () => {
    try {
      const hist = await getSimulationHistory();
      setHistory(hist || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunSimulation = async (actionsToRun = actionQueue, horizon = horizonMonths) => {
    if (!actionsToRun || actionsToRun.length === 0) return;
    setIsLoading(true);
    try {
      const result = await runSimulation(actionsToRun, { horizonMonths: horizon });
      setSimulationResult({ actions: actionsToRun, ...result });
      setActiveModal(null);
    } catch (error) {
      notify.showToast(error.response?.data?.message || error.message || 'Simulation Failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSimulation = async (title) => {
    if (!simulationResult) return;
    const finalTitle = title?.trim() || (lang === 'ar' ? 'سيناريو محاكاة' : 'Simulation Scenario');
    setIsSaving(true);
    try {
      await saveSimulationHistory(finalTitle, simulationResult.actions);
      notify.showToast(t('sandbox.savedSuccess'), 'success');
      setSaveModalOpen(false);
      setSaveTitleInput('');
      loadHistory();
    } catch (error) {
      notify.showToast(error.message || 'Save Failed', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadTemplate = (type) => {
    const defaultAcc = (accounts.find(a => !a.excludeFromTotal && (a.calculatedBalance ?? a.balance ?? 0) > 0) || accounts[0])?._id;
    if (type === 'cash') {
      const actions = [{
        type: 'purchase',
        payload: {
          amount: 30000,
          accountId: defaultAcc,
          notes: lang === 'ar' ? 'شراء كاش (30,000 ج.م)' : 'Cash Purchase (30,000 EGP)'
        }
      }];
      setActionQueue(actions);
      handleRunSimulation(actions, horizonMonths);
    } else {
      const actions = [{
        type: 'installment',
        payload: {
          title: lang === 'ar' ? 'شراء بالتقسيط (30,000 ج.م)' : 'Installment Purchase (30,000 EGP)',
          provider: 'valU',
          totalAmount: 30000,
          downPayment: 6000,
          totalMonths: 12,
          monthlyAmount: 2000,
          dueDayOfMonth: 15,
          linkedAccountId: defaultAcc
        }
      }];
      setActionQueue(actions);
      handleRunSimulation(actions, horizonMonths);
    }
  };

  const handleConfirmCommit = async () => {
    if (!simulationResult || !simulationResult.actions) return;
    setIsCommitting(true);
    try {
      await applySimulation(simulationResult.actions);
      notify.showToast(t('sandbox.commitSuccess'), 'success');
      setCommitModalOpen(false);
      resetSimulation();
      await loadMetaData();
    } catch (error) {
      notify.showToast(error.response?.data?.message || error.message || t('sandbox.commitFailed'), 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  // Scenario Edit/Modify State
  const [editingActionIndex, setEditingActionIndex] = useState(null);
  const [editingActionData, setEditingActionData] = useState(null);

  const handleOpenModify = (index = 0) => {
    const targetAction = simulationResult?.actions?.[index] || actionQueue[index];
    if (!targetAction) return;
    setEditingActionIndex(index);
    setEditingActionData(targetAction);
    setActiveModal(targetAction.type);
  };

  const handleAdjustScenario = (newActions) => {
    setActionQueue(newActions);
    handleRunSimulation(newActions, horizonMonths);
  };

  const resetSimulation = () => {
    setSimulationResult(null);
    setActionQueue([]);
    setEditingActionIndex(null);
    setEditingActionData(null);
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-7xl mx-auto min-h-screen relative space-y-6">
      <div className="fixed inset-0 -z-10 bg-[#100E11]" />
      
      {/* Background Glowing Ambient Light */}
      <div className="absolute top-[0px] start-[0px] w-[250px] h-[250px] bg-[#8D6346] opacity-35 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[30%] end-[0px] w-[250px] h-[250px] bg-[#8D6346] opacity-25 blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-[0px] start-[0px] w-[300px] h-[300px] bg-[#8D6346] opacity-25 blur-[150px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            aria-label={t('common.back')}
            className="w-12 h-12 flex shrink-0 items-center justify-center rounded-[2rem] bg-[#8D6346]/40 backdrop-blur-[32px] border border-white/10 hover:bg-[#8D6346]/60 transition-colors"
          >
            <ArrowLeft size={20} className="text-white/90 rtl:rotate-180" />
          </button>
          <div>
            <p className="text-[#E8C5A8] text-xs font-bold tracking-widest uppercase mb-0.5">
              {t('sandbox.decisionIntelligence')}
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t('sandbox.title')}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Sandbox Area */}
      {!simulationResult ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-5">
            
            {/* Pre-built "Cash vs. Installments" Template Card */}
            <div className="rounded-[2.5rem] bg-gradient-to-br from-[#8D6346]/25 via-[#2B2321]/40 to-black/30 border border-[#8D6346]/40 p-6 backdrop-blur-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 text-[#E8C5A8]">
                    <ArrowRightLeft size={16} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                      {t('sandbox.templateBadge')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {t('sandbox.cashVsInstallmentsTitle')}
                  </h3>
                  <p className="text-xs text-white/60 mt-1 max-w-lg leading-relaxed">
                    {t('sandbox.cashVsInstallmentsDesc')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleLoadTemplate('cash')}
                    className="px-4 py-3 min-h-[44px] rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-xs font-bold transition-all flex items-center justify-center"
                  >
                    {t('sandbox.testCash')}
                  </button>
                  <button
                    onClick={() => handleLoadTemplate('installment')}
                    className="px-4 py-3 min-h-[44px] rounded-2xl bg-[#8D6346]/40 hover:bg-[#8D6346]/60 border border-[#8D6346]/50 text-[#E8C5A8] hover:text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center"
                  >
                    {t('sandbox.testInstallment')}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Queue Section */}
            {actionQueue.length > 0 && (
              <div className="rounded-[2.5rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-[#8D6346]" />
                    {t('sandbox.actionPipeline')}
                  </h2>
                  <span className="text-xs bg-[#8D6346] text-white px-3 py-1 rounded-full font-bold">
                    {actionQueue.length} {t('sandbox.actions')}
                  </span>
                </div>
                
                <div className="space-y-2.5 mb-5">
                  {actionQueue.map((action, idx) => {
                    const simDef = SIMULATION_TYPES.find(s => s.id === action.type) || { title: action.type, icon: ShoppingBag };
                    const Icon = simDef.icon;
                    const ap = action.payload || {};
                    let detailText = '';
                    if (action.type === 'purchase') {
                      detailText = `${ap.notes ? `${ap.notes} • ` : ''}-${money(ap.amount)}`;
                    } else if (action.type === 'installment') {
                      const downStr = ap.downPayment > 0 ? `${lang === 'ar' ? 'مقدم' : 'Down'} ${money(ap.downPayment)} + ` : '';
                      detailText = `${ap.title || ''} • ${downStr}${money(ap.monthlyAmount)}/${lang === 'ar' ? 'شهر' : 'mo'} × ${ap.totalMonths} ${t('sandbox.months')}`;
                    } else if (action.type === 'salary') {
                      detailText = `+${money(ap.newAmount)}/${lang === 'ar' ? 'شهر' : 'mo'}`;
                    } else if (action.type === 'debt') {
                      detailText = `${ap.action === 'borrow' ? '+' : '-'}${money(ap.amount)}`;
                    } else if (action.type === 'bill') {
                      detailText = `-${money(ap.amount)}`;
                    } else if (action.type === 'investment') {
                      detailText = `${ap.action === 'buy' ? '-' : '+'}${money(ap.amount)}`;
                    }

                    return (
                      <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-black/20 border border-white/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#E8C5A8] shrink-0">
                            <Icon size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/60 font-bold">
                                {idx + 1}
                              </span>
                              <p className="text-xs font-bold text-white uppercase tracking-wider truncate">
                                {t(simDef.titleKey) || simDef.title}
                              </p>
                            </div>
                            {detailText && (
                              <p className="text-[11px] text-[#E8C5A8] font-medium truncate mt-0.5">
                                {detailText}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button 
                            type="button"
                            onClick={() => handleOpenModify(idx)} 
                            aria-label={t('common.edit')}
                            className="w-10 h-10 min-w-[40px] min-h-[40px] text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setActionQueue(actionQueue.filter((_, i) => i !== idx))} 
                            aria-label={t('common.delete')}
                            className="w-10 h-10 min-w-[40px] min-h-[40px] text-white/50 hover:text-rose-400 bg-white/5 hover:bg-rose-500/20 rounded-xl transition-colors flex items-center justify-center"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button 
                  id="btn-run-simulation"
                  onClick={() => handleRunSimulation(actionQueue)}
                  className="w-full min-h-[48px] py-4 rounded-2xl font-bold text-sm text-white shadow-[0_4px_20px_rgba(141,99,70,0.4)] transition-all bg-gradient-to-r from-[#8D6346] via-[#B88764] to-[#8D6346] hover:opacity-95 flex items-center justify-center gap-2"
                >
                  <Play size={16} className="fill-current" />
                  <span>{t('sandbox.runEvaluation')}</span>
                </button>
              </div>
            )}

            {/* Scenario Buttons Grid */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-white px-1">
                {t('sandbox.addScenario')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SIMULATION_TYPES.map(sim => {
                  const Icon = sim.icon;
                  return (
                    <button
                      key={sim.id}
                      onClick={() => setActiveModal(sim.id)}
                      aria-haspopup="dialog"
                      aria-label={`${t(sim.titleKey) || sim.title}: ${t(sim.subKey)}`}
                      className="flex flex-col items-center justify-between p-4 min-h-[124px] rounded-[2rem] bg-[#2B2321]/30 hover:bg-[#8D6346]/20 border border-white/10 hover:border-[#8D6346]/40 transition-all group backdrop-blur-[20px] text-center"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#E8C5A8] flex items-center justify-center mb-2 shadow-inner group-hover:scale-105 transition-transform shrink-0">
                        <Icon size={20} />
                      </div>
                      <div className="w-full">
                        <span className="text-xs font-bold text-white/90 block mb-1">
                          {t(sim.titleKey) || sim.title}
                        </span>
                        <span className="text-[10px] text-white/50 group-hover:text-white/70 transition-colors line-clamp-2 leading-snug">
                          {t(sim.subKey)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* History Panel */}
          <div className="xl:col-span-1">
            <HistoryPanel history={history} onRun={(actions) => handleRunSimulation(actions)} onDelete={loadHistory} />
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="pt-2 pb-64 sm:pb-56">
          <FocusedDecisionCard 
            simulationResult={simulationResult}
            accounts={accounts}
            onCommit={() => setCommitModalOpen(true)}
            onDiscard={resetSimulation}
            onSave={() => {
              setSaveTitleInput('');
              setSaveModalOpen(true);
            }}
            onModifyScenario={() => handleOpenModify(0)}
            onAdjustScenario={handleAdjustScenario}
            money={money}
          />
        </div>
      )}

      {/* Scenario Input Modal */}
      {activeModal && (
        <SimulationModals 
          type={activeModal} 
          initialValues={editingActionData}
          onClose={() => {
            setActiveModal(null);
            setEditingActionIndex(null);
            setEditingActionData(null);
          }} 
          onSubmit={(payload, finalType = activeModal) => {
            if (editingActionIndex !== null) {
              const baseList = simulationResult?.actions || actionQueue;
              const newActions = [...baseList];
              newActions[editingActionIndex] = { type: finalType, payload };
              setActionQueue(newActions);
              setActiveModal(null);
              setEditingActionIndex(null);
              setEditingActionData(null);
              handleRunSimulation(newActions, horizonMonths);
            } else {
              const newActions = [...actionQueue, { type: finalType, payload }];
              setActionQueue(newActions);
              setActiveModal(null);
            }
          }}
          metadata={{ accounts, categories, budgets, bills, debts, recurring, investments }}
        />
      )}

      {/* Commit to Reality Modal */}
      <CommitPlanModal
        open={commitModalOpen}
        onClose={() => setCommitModalOpen(false)}
        actions={simulationResult?.actions || []}
        onConfirm={handleConfirmCommit}
        isCommitting={isCommitting}
      />

      {/* Save Scenario In-App Glass Modal */}
      {saveModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => !isSaving && setSaveModalOpen(false)} 
          />
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-scenario-title"
            className="bg-[#1C1819] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl relative z-10 animate-scale-in flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#1C1819]/95 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/40 text-[#E8C5A8] flex items-center justify-center">
                  <Save size={18} />
                </div>
                <div>
                  <h3 id="save-scenario-title" className="text-lg font-bold text-white">
                    {t('sandbox.saveScenarioModalTitle')}
                  </h3>
                  <p className="text-xs text-white/50">
                    {t('sandbox.saveScenarioModalDesc')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => !isSaving && setSaveModalOpen(false)}
                aria-label={t('common.close')}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveSimulation(saveTitleInput);
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1.5">
                <label htmlFor="scenario-title-input" className="text-xs text-[var(--color-text-muted)] font-medium">
                  {t('sandbox.promptSaveTitle')}
                </label>
                <input 
                  id="scenario-title-input"
                  type="text"
                  autoFocus
                  required
                  value={saveTitleInput}
                  onChange={(e) => setSaveTitleInput(e.target.value)}
                  placeholder={t('sandbox.scenarioNamePlaceholder')}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-white/40 focus:border-[#8D6346] outline-none text-sm transition-colors"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  disabled={isSaving}
                  className="flex-1 py-3.5 min-h-[44px] bg-white/5 hover:bg-white/10 rounded-full font-bold text-sm text-white transition-colors border border-white/10"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3.5 min-h-[44px] rounded-full font-bold text-sm text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/40 border border-[#8D6346]/60 hover:bg-[#8D6346]/60 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} />
                  <span>{t('sandbox.saveScenario')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="rounded-[2rem] bg-[#1A1617]/95 border border-white/10 p-6 flex items-center gap-3 shadow-2xl">
            <div className="w-5 h-5 border-2 border-[#8D6346] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold text-white/90">
              {t('sandbox.evaluating')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
