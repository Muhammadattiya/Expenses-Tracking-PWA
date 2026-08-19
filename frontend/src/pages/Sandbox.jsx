import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { runSimulation, saveSimulationHistory, getSimulationHistory } from '../api/sandbox';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { getBills } from '../api/bills';
import { getDebts } from '../api/debts';
import { getRecurringTransactions } from '../api/recurringTransactions';
import { getInvestments } from '../api/investments';
import { budgetService } from '../services/budgetService';
import { ArrowLeft, ShoppingBag, Banknote, PieChart, CreditCard, Calendar, Repeat, TrendingUp, Save, Play, X, ListPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import SimulationModals from '../components/sandbox/SimulationModals';
import ResultsView from '../components/sandbox/ResultsView';
import DecisionPanel from '../components/sandbox/DecisionPanel';
import HistoryPanel from '../components/sandbox/HistoryPanel';
import { useNotification } from '../contexts/NotificationContext';

const SIMULATION_TYPES = [
  { id: 'purchase', icon: ShoppingBag, color: 'from-blue-500 to-cyan-500', title: 'Purchase' },
  { id: 'salary', icon: Banknote, color: 'from-emerald-500 to-teal-500', title: 'Salary Change' },
  { id: 'budget', icon: PieChart, color: 'from-purple-500 to-indigo-500', title: 'Budget Adjustment' },
  { id: 'debt', icon: CreditCard, color: 'from-rose-500 to-red-500', title: 'Debt Action' },
  { id: 'bill', icon: Calendar, color: 'from-amber-500 to-orange-500', title: 'Bill Payment' },
  { id: 'recurring', icon: Repeat, color: 'from-pink-500 to-rose-500', title: 'Recurring Change' },
  { id: 'investment', icon: TrendingUp, color: 'from-indigo-500 to-blue-500', title: 'Investment Action' }
];

export default function Sandbox() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const notify = useNotification();
  
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value || 0);

  const [activeModal, setActiveModal] = useState(null);
  const [actionQueue, setActionQueue] = useState([]);
  const [simulationResult, setSimulationResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Meta data for dropdowns
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
      setAccounts(accs);
      setCategories(cats);
      setBudgets(bdgs);
      setBills(bls);
      setDebts(dbs?.debts || []);
      setRecurring(recs);
      setInvestments(invs);
    } catch (e) {
      console.error(e);
    }
  };

  const loadHistory = async () => {
    try {
      const hist = await getSimulationHistory();
      setHistory(hist);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunSimulation = async (actionsToRun = actionQueue) => {
    if (!actionsToRun || actionsToRun.length === 0) return;
    setIsLoading(true);
    try {
      const result = await runSimulation(actionsToRun);
      setSimulationResult({ actions: actionsToRun, ...result });
      setActiveModal(null);
    } catch (error) {
      notify.error('Simulation Failed', error.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSimulation = async (title) => {
    if (!simulationResult) return;
    try {
      await saveSimulationHistory(title, simulationResult.actions);
      notify.success('Saved', 'Simulation saved to history.');
      loadHistory();
    } catch (error) {
      notify.error('Save Failed', error.message);
    }
  };

  const resetSimulation = () => {
    setSimulationResult(null);
    setActionQueue([]);
  };

  return (
    <div className="p-4 pt-8 animate-fade-in space-y-8 pb-24 max-w-7xl mx-auto">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors border border-white/10">
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-main)]" />
        </button>
        <div>
          <p className="text-brand-blue text-xs font-bold tracking-widest uppercase mb-1">AI Decision Engine</p>
          <h1 className="text-3xl md:text-4xl font-black text-[var(--color-text-main)] tracking-tight">Financial Sandbox</h1>
        </div>
      </header>

      {/* Main Sandbox Area */}
      {!simulationResult ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            
            {/* Action Queue Section */}
            {actionQueue.length > 0 && (
              <div className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2.5rem] p-6 animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[var(--color-text-main)] flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-brand-blue" />
                    Action Pipeline
                  </h2>
                  <span className="text-xs bg-brand-blue text-white px-3 py-1 rounded-full font-bold">{actionQueue.length} Actions</span>
                </div>
                
                <div className="space-y-3 mb-6">
                  {actionQueue.map((action, idx) => {
                    const simDef = SIMULATION_TYPES.find(s => s.id === action.type);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-black/10 shadow-inner border border-white/5 p-4 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl bg-gradient-to-br ${simDef.color}`}>
                            <simDef.icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider">{simDef.title}</p>
                            <p className="text-xs text-[var(--color-text-muted)]">Step {idx + 1}</p>
                          </div>
                        </div>
                        <button onClick={() => setActionQueue(actionQueue.filter((_, i) => i !== idx))} className="p-2 text-[var(--color-text-muted)] hover:text-brand-red bg-white/5 hover:bg-brand-red/10 rounded-xl transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => handleRunSimulation(actionQueue)}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-blue to-indigo-600 hover:from-brand-blue/90 hover:to-indigo-500 text-white px-8 py-4 rounded-2xl text-base font-black uppercase tracking-widest transition-all shadow-xl hover:shadow-brand-blue/20 hover:-translate-y-1"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Evaluate Decision Pipeline
                </button>
              </div>
            )}

            <h2 className="text-xl font-bold text-[var(--color-text-main)]">Add Scenario to Pipeline</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {SIMULATION_TYPES.map(sim => (
                <button
                  key={sim.id}
                  onClick={() => setActiveModal(sim.id)}
                  className="flex flex-col items-center justify-center p-6 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2.5rem] hover:bg-white/5 transition-all group"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${sim.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <sim.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-bold text-[var(--color-text-main)]">{sim.title}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="xl:col-span-1">
            <HistoryPanel history={history} onRun={(actions) => handleRunSimulation(actions)} onDelete={loadHistory} />
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-2xl font-black text-[var(--color-text-main)]">Decision Results</h2>
            <div className="flex gap-3">
               <button onClick={resetSimulation} className="px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-bold text-[var(--color-text-main)] transition-colors">
                 Discard & New
               </button>
               <button onClick={() => {
                 const title = prompt('Enter a name for this simulation pipeline:');
                 if (title) handleSaveSimulation(title);
               }} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-bold transition-all shadow-lg hover:shadow-brand-blue/20">
                 <Save className="w-4 h-4" /> Save Configuration
               </button>
            </div>
          </div>
          
          <DecisionPanel decision={simulationResult.decision} insights={simulationResult.insights} />
          <ResultsView before={simulationResult.before} after={simulationResult.after} difference={simulationResult.difference} money={money} />
        </div>
      )}

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
      
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center">
           <div className="bg-black border border-white/10 rounded-2xl p-6 flex items-center gap-3">
             <div className="w-5 h-5 border-2 border-brand-blue border-t-transparent rounded-full animate-spin" />
             <span className="text-sm font-medium text-white">Evaluating Pipeline...</span>
           </div>
        </div>
      )}
    </div>
  );
}
