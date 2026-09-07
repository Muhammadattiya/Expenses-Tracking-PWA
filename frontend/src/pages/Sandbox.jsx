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
    <div className="pb-24 pt-6 px-4 max-w-7xl mx-auto min-h-screen relative animate-fade-in space-y-8">
      <div className="fixed inset-0 -z-10 bg-[#100E11]" />
      
      {/* Background Glowing Ellipses */}
      <div className="absolute top-[0px] left-[0px] w-[250px] h-[250px] bg-[#8D6346] opacity-40 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[30%] right-[0px] w-[250px] h-[250px] bg-[#8D6346] opacity-30 blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-[0px] left-[0px] w-[300px] h-[300px] bg-[#8D6346] opacity-30 blur-[150px] rounded-full pointer-events-none -z-10" />
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors border border-white/10">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <p className="text-[#8D6346] text-xs font-bold tracking-widest uppercase mb-1">AI Decision Engine</p>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Financial Sandbox</h1>
          </div>
        </div>
      </header>

      {/* Main Sandbox Area */}
      {!simulationResult ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            
            {/* Action Queue Section */}
            {actionQueue.length > 0 && (
              <div className="liquidglass rounded-[2.5rem] p-6 animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-[#8D6346]" />
                    Action Pipeline
                  </h2>
                  <span className="text-xs bg-[#8D6346] text-white px-3 py-1 rounded-full font-bold">{actionQueue.length} Actions</span>
                </div>
                
                <div className="space-y-3 mb-6">
                  {actionQueue.map((action, idx) => {
                    const simDef = SIMULATION_TYPES.find(s => s.id === action.type);
                    return (
                      <div key={idx} className="flex items-center justify-between liquidglass p-4 rounded-2xl mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-[#8D6346]/20 border border-[#8D6346]/40">
                            <simDef.icon className="w-4 h-4 text-[#8D6346]" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider">{simDef.title}</p>
                            <p className="text-xs text-white/50">Step {idx + 1}</p>
                          </div>
                        </div>
                        <button onClick={() => setActionQueue(actionQueue.filter((_, i) => i !== idx))} className="p-2 text-white/50 hover:text-white bg-white/5 hover:bg-[#8D6346] rounded-xl transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button 
                  onClick={() => handleRunSimulation(actionQueue)}
                  className="w-full py-4 rounded-full font-black text-base uppercase tracking-widest text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Evaluate Decision Pipeline
                </button>
              </div>
            )}

            <h2 className="text-xl font-bold text-white/90">Add Scenario to Pipeline</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {SIMULATION_TYPES.map(sim => (
                <button
                  key={sim.id}
                  onClick={() => setActiveModal(sim.id)}
                  className="flex flex-col items-center justify-center p-6 liquidglass rounded-[2.5rem] hover:bg-white/5 transition-all group"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/40 flex items-center justify-center mb-4 shadow-inner group-hover:scale-110 transition-transform`}>
                    <sim.icon className="w-6 h-6 text-[#8D6346]" />
                  </div>
                  <span className="text-sm font-bold text-white/90">{sim.title}</span>
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
            <h2 className="text-2xl font-black text-white">Decision Results</h2>
            <div className="flex gap-3">
               <button onClick={resetSimulation} className="px-5 py-3 rounded-full font-bold text-sm text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 flex items-center justify-center backdrop-blur-md">
                 Discard & New
               </button>
               <button onClick={() => {
                 const title = prompt('Enter a name for this simulation pipeline:');
                 if (title) handleSaveSimulation(title);
               }} className="px-5 py-3 rounded-full font-bold text-sm text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md">
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
           <div className="liquidglass rounded-[2rem] p-6 flex items-center gap-3 shadow-2xl">
             <div className="w-5 h-5 border-2 border-[#8D6346] border-t-transparent rounded-full animate-spin" />
             <span className="text-sm font-medium text-white/90">Evaluating Pipeline...</span>
           </div>
        </div>
      )}
    </div>
  );
}
