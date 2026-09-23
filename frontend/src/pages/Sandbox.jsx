import React, { useState, useEffect } from 'react';
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
import { budgetService } from '../services/budgetService';
import { 
  ArrowLeft, ShoppingBag, Banknote, PieChart, CreditCard, 
  Calendar, Repeat, TrendingUp, Save, Play, X, ListPlus, 
  Sparkles, ArrowRightLeft, CheckCircle2, RotateCcw, Shield
} from 'lucide-react';

import SimulationModals from '../components/sandbox/SimulationModals';
import ResultsView from '../components/sandbox/ResultsView';
import DecisionPanel from '../components/sandbox/DecisionPanel';
import HistoryPanel from '../components/sandbox/HistoryPanel';
import TrajectoryChart from '../components/sandbox/TrajectoryChart';
import CommitPlanModal from '../components/sandbox/CommitPlanModal';
import { useNotification } from '../contexts/NotificationContext';

const SIMULATION_TYPES = [
  { id: 'purchase', icon: ShoppingBag, color: 'from-blue-500 to-cyan-500', title: 'Purchase', titleKey: 'sandbox.purchase' },
  { id: 'installment', icon: CreditCard, color: 'from-amber-600 to-orange-500', title: 'Installment Plan', titleKey: 'installments.title' },
  { id: 'salary', icon: Banknote, color: 'from-emerald-500 to-teal-500', title: 'Salary Change', titleKey: 'sandbox.salary' },
  { id: 'budget', icon: PieChart, color: 'from-purple-500 to-indigo-500', title: 'Budget Adjustment', titleKey: 'sandbox.budget' },
  { id: 'debt', icon: CreditCard, color: 'from-rose-500 to-red-500', title: 'Debt Action', titleKey: 'sandbox.debt' },
  { id: 'bill', icon: Calendar, color: 'from-amber-500 to-orange-500', title: 'Bill Payment', titleKey: 'sandbox.bill' },
  { id: 'recurring', icon: Repeat, color: 'from-pink-500 to-rose-500', title: 'Recurring Change', titleKey: 'sandbox.recurring' },
  { id: 'investment', icon: TrendingUp, color: 'from-indigo-500 to-blue-500', title: 'Investment Action', titleKey: 'sandbox.investment' }
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

  const loadMetaData = async () => {
    try {
      const [accs, cats, bdgs, bls, dbs, recs, invs] = await Promise.all([
        getAccounts(),
        getCategories(),
        budgetService.getBudgets(),
        getBills(),
        getDebts(),
        getRecurringTransactions(),
        getInvestments()
      ]);
      setAccounts(accs || []);
      setCategories(cats || []);
      setBudgets(bdgs || []);
      setBills(bls || []);
      setDebts(dbs?.debts || []);
      setRecurring(recs || []);
      setInvestments(invs || []);
    } catch (e) {
      console.error(e);
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
    try {
      await saveSimulationHistory(title, simulationResult.actions);
      notify.showToast(t('sandbox.savedSuccess'), 'success');
      loadHistory();
    } catch (error) {
      notify.showToast(error.message || 'Save Failed', 'error');
    }
  };

  const handleLoadTemplate = (type) => {
    const defaultAcc = accounts[0]?._id;
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

  const resetSimulation = () => {
    setSimulationResult(null);
    setActionQueue([]);
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
                    className="px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/90 text-xs font-bold transition-all"
                  >
                    {t('sandbox.testCash')}
                  </button>
                  <button
                    onClick={() => handleLoadTemplate('installment')}
                    className="px-3.5 py-2.5 rounded-2xl bg-[#8D6346]/40 hover:bg-[#8D6346]/60 border border-[#8D6346]/50 text-[#E8C5A8] hover:text-white text-xs font-bold transition-all shadow-sm"
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
                    return (
                      <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl bg-black/20 border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#E8C5A8]">
                            <Icon size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-wider">
                              {t(simDef.titleKey) || simDef.title}
                            </p>
                            <p className="text-[10px] text-white/50">
                              {t('sandbox.step', { step: idx + 1 })}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setActionQueue(actionQueue.filter((_, i) => i !== idx))} 
                          aria-label={t('common.delete')}
                          className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-rose-500/20 rounded-xl transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button 
                  id="btn-run-simulation"
                  onClick={() => handleRunSimulation(actionQueue)}
                  className="w-full py-4 rounded-2xl font-bold text-sm text-white shadow-[0_4px_20px_rgba(141,99,70,0.4)] transition-all bg-gradient-to-r from-[#8D6346] via-[#B88764] to-[#8D6346] hover:opacity-95 flex items-center justify-center gap-2"
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
                      className="flex flex-col items-center justify-center p-4 rounded-[2rem] bg-[#2B2321]/30 hover:bg-[#8D6346]/20 border border-white/10 hover:border-[#8D6346]/40 transition-all group backdrop-blur-[20px]"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#E8C5A8] flex items-center justify-center mb-2.5 shadow-inner group-hover:scale-105 transition-transform">
                        <Icon size={20} />
                      </div>
                      <span className="text-xs font-bold text-white/90 text-center">
                        {t(sim.titleKey) || sim.title}
                      </span>
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
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                {t('sandbox.resultsTitle')}
              </h2>
              <p className="text-xs text-white/50">
                {t('sandbox.resultsSubtitle')}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={resetSimulation} 
                className="px-4 py-2.5 rounded-2xl font-bold text-xs text-white/70 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={14} />
                <span>{t('sandbox.discard')}</span>
              </button>

              <button 
                onClick={() => {
                  const title = prompt(t('sandbox.promptSaveTitle'));
                  if (title) handleSaveSimulation(title);
                }} 
                className="px-4 py-2.5 rounded-2xl font-bold text-xs text-white/80 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-1.5 transition-colors"
              >
                <Save size={14} />
                <span>{t('sandbox.saveScenario')}</span>
              </button>

              {/* Commit to Reality Button (Phase 7) */}
              <button 
                id="btn-commit-reality"
                onClick={() => setCommitModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl font-bold text-xs text-white bg-gradient-to-r from-[#8D6346] via-[#B88764] to-[#8D6346] hover:opacity-95 shadow-[0_4px_16px_rgba(141,99,70,0.4)] flex items-center gap-1.5 transition-all"
              >
                <Sparkles size={14} />
                <span>{t('sandbox.commitToReality')}</span>
              </button>
            </div>
          </div>
          
          {/* Decision Verdict Panel */}
          <DecisionPanel 
            decision={simulationResult.decision} 
            insights={simulationResult.insights} 
          />

          {/* Multi-Month Forward Trajectory Chart */}
          <TrajectoryChart 
            projection={simulationResult.projection} 
            horizonMonths={horizonMonths}
            onHorizonChange={(m) => {
              setHorizonMonths(m);
              handleRunSimulation(simulationResult.actions, m);
            }}
          />

          {/* Before & After Quantitative Comparison */}
          <ResultsView 
            before={simulationResult.before} 
            after={simulationResult.after} 
            difference={simulationResult.difference} 
            money={money} 
            actions={simulationResult.actions || []}
          />
        </div>
      )}

      {/* Scenario Input Modal */}
      {activeModal && (
        <SimulationModals 
          type={activeModal} 
          onClose={() => setActiveModal(null)} 
          onSubmit={(payload) => {
            setActionQueue([...actionQueue, { type: activeModal, payload }]);
            setActiveModal(null);
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
