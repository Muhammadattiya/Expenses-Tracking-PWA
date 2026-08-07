import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { budgetService } from '../services/budgetService';
import { getCategories } from '../api/categories';
import { getTransactions } from '../api/transactions';
import { smartBudgetService } from '../api/smartBudgets';
import { getCurrentUser } from '../api/auth';
import { db } from '../db/db';
import MasterBudgetCard from '../components/Budget/MasterBudgetCard';
import BudgetCard from '../components/Budget/BudgetCard';
import BudgetModal from '../components/Budget/BudgetModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import FormModal from '../components/modals/FormModal';
import CustomSelect from '../components/ui/CustomSelect';
import { Plus, Target, Filter, ChevronDown, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const SkeletonCard = () => (
  <div className="bg-white/5 rounded-3xl p-5 border border-white/5 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/10" />
        <div className="space-y-2">
          <div className="w-24 h-4 bg-white/10 rounded" />
          <div className="w-16 h-3 bg-white/5 rounded" />
        </div>
      </div>
    </div>
    <div className="space-y-3 pt-2">
      <div className="flex justify-between">
        <div className="w-20 h-4 bg-white/10 rounded" />
        <div className="w-16 h-6 bg-white/10 rounded" />
      </div>
      <div className="h-4 w-full bg-white/5 rounded-full" />
    </div>
  </div>
);

export default function Budgets() {
  const { t, language } = useLanguage();
  const { showToast } = useNotification();
  const navigate = useNavigate();
  
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [spentData, setSpentData] = useState({});
  const [draftPlans, setDraftPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState({});
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState(null);
  const [budgetToDelete, setBudgetToDelete] = useState(null);

  const [planToEdit, setPlanToEdit] = useState(null);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [isPlanEditModalOpen, setIsPlanEditModalOpen] = useState(false);
  const [isPlanConfirmModalOpen, setIsPlanConfirmModalOpen] = useState(false);
  const [planNameInput, setPlanNameInput] = useState('');

  // Filters
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [budgetsData, catsData, user, draftsData] = await Promise.all([
        budgetService.getBudgets(),
        getCategories(),
        getCurrentUser(),
        smartBudgetService.getPlans().catch(() => []) // gracefully handle if it fails
      ]);
      
      setBudgets(budgetsData);
      setCategories(catsData);
      setUserPreferences(user?.preferences || {});
      setDraftPlans(draftsData.filter(d => d.status === 'draft'));
      
      await calculateSpent(budgetsData, user?.preferences || {});
    } catch (err) {
      console.error('Failed to load budgets', err);
      showToast(t('common.deleteError') || 'Failed to load budgets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSpent = async (budgetsList, preferences = {}) => {
    const now = new Date();
    
    // Preferences
    const prefMonthStart = preferences.budgetStartDayMonthly ?? 1;
    const prefWeekStart = preferences.budgetStartDayWeekly ?? 6;
    
    // Month bounds
    let monthStart = new Date(now.getFullYear(), now.getMonth(), prefMonthStart);
    // If the prefMonthStart is 31 but the current month has 30 days, Date automatically rolls over to the 1st of next month.
    // To prevent this, we cap the start day to the last day of the current month.
    const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const actualMonthStartDay = Math.min(prefMonthStart, lastDayOfCurrentMonth);
    
    if (now.getDate() < actualMonthStartDay) {
      // We are in the previous budget month cycle
      const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      monthStart = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(prefMonthStart, lastDayOfPrevMonth));
    } else {
      monthStart = new Date(now.getFullYear(), now.getMonth(), actualMonthStartDay);
    }
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(monthEnd.getDate() - 1);
    monthEnd.setHours(23, 59, 59, 999);
    
    // Week bounds
    const day = now.getDay();
    // Calculate difference to the preferred week start day (e.g. 6 for Saturday)
    // Formula: (day - prefWeekStart + 7) % 7 gives days since prefWeekStart
    const diffToWeekStart = (day - prefWeekStart + 7) % 7; 
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToWeekStart);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const recentTx = await getTransactions();

    const spentMap = {};

    for (const b of budgetsList) {
      const catId = typeof b.category === 'object' ? String(b.category?._id || '') : String(b.category || '');
      
      let categoryTx = recentTx.filter(tx => {
        const txCatId = typeof tx.category === 'object' ? String(tx.category?._id || '') : String(tx.category || '');
        return tx.type === 'expense' && txCatId === catId;
      });

      if (b.account) {
        const bAccId = typeof b.account === 'object' ? String(b.account?._id || '') : String(b.account);
        categoryTx = categoryTx.filter(tx => {
          const txAccId = typeof tx.account === 'object' ? String(tx.account?._id || '') : String(tx.account || '');
          const txFromAccId = typeof tx.from_account === 'object' ? String(tx.from_account?._id || '') : String(tx.from_account || '');
          return txAccId === bAccId || txFromAccId === bAccId;
        });
      }

      let total = 0;
      const budgetPeriod = b.period || 'monthly';
      if (budgetPeriod === 'monthly') {
        const monthlyTx = categoryTx.filter(tx => {
          const d = new Date(tx.date);
          return d >= monthStart && d <= monthEnd;
        });
        total = monthlyTx.reduce((sum, tx) => sum + tx.amount, 0);
      } else if (budgetPeriod === 'weekly') {
        const weeklyTx = categoryTx.filter(tx => {
          const d = new Date(tx.date);
          return d >= weekStart && d <= weekEnd;
        });
        total = weeklyTx.reduce((sum, tx) => sum + tx.amount, 0);
      } else if (budgetPeriod === 'custom' && b.startDate && b.endDate) {
        const customStart = new Date(b.startDate);
        const customEnd = new Date(b.endDate);
        customStart.setHours(0, 0, 0, 0);
        customEnd.setHours(23, 59, 59, 999);
        const customTx = categoryTx.filter(tx => {
          const d = new Date(tx.date);
          return d >= customStart && d <= customEnd;
        });
        total = customTx.reduce((sum, tx) => sum + tx.amount, 0);
      }

      spentMap[b._id] = total;
    }

    setSpentData(spentMap);
  };

  const handleSaveBudget = async (budgetData) => {
    try {
      if (budgetToEdit) {
        await budgetService.updateBudget(budgetToEdit._id, budgetData);
        showToast(t('budgets.saveSuccess') || 'Budget saved', 'success');
      } else {
        await budgetService.createBudget(budgetData);
        showToast(t('budgets.saveSuccess') || 'Budget saved', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to save budget', err);
      const msg = err.response?.data?.message || t('common.deleteError') || 'Error saving budget';
      showToast(msg, 'error');
    }
  };

  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;
    try {
      await budgetService.deleteBudget(budgetToDelete._id);
      showToast(t('budgets.deleteSuccess') || 'Budget deleted', 'success');
      loadData();
    } catch (err) {
      console.error('Failed to delete budget', err);
      showToast(t('common.deleteError') || 'Error deleting budget', 'error');
    } finally {
      setBudgetToDelete(null);
    }
  };

  const handleEditPlan = async () => {
    if (!planToEdit || !planNameInput.trim()) return;
    try {
      await smartBudgetService.updateDraftPlan(planToEdit._id, { name: planNameInput.trim() });
      showToast(t('smartBudget.renameSuccess', 'Plan renamed successfully'), 'success');
      setIsPlanEditModalOpen(false);
      setPlanToEdit(null);
      loadData();
    } catch (err) {
      console.error('Failed to rename plan', err);
      showToast(t('common.error', 'An error occurred'), 'error');
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      await smartBudgetService.deletePlan(planToDelete._id);
      showToast(t('smartBudget.deleteSuccess', 'Master Budget deleted'), 'success');
      setIsPlanConfirmModalOpen(false);
      setPlanToDelete(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete plan', err);
      showToast(t('common.deleteError') || 'Error deleting plan', 'error');
    }
  };

  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      if (filterPeriod !== 'all' && b.period !== filterPeriod) return false;
      const catId = typeof b.category === 'object' ? b.category._id : b.category;
      if (filterCategory !== 'all' && catId !== filterCategory) return false;
      return true;
    });
  }, [budgets, filterPeriod, filterCategory]);

  const groupedDisplayItems = useMemo(() => {
    const items = [];
    const masterGroups = {}; 

    filteredBudgets.forEach(budget => {
      if (budget.smartBudgetPlan && budget.smartBudgetPlan.groupAsMaster) {
        const planId = budget.smartBudgetPlan._id;
        if (!masterGroups[planId]) {
          masterGroups[planId] = {
            type: 'master',
            plan: budget.smartBudgetPlan,
            budgets: [],
            totalAmount: 0,
            totalSpent: 0
          };
          items.push(masterGroups[planId]);
        }
        masterGroups[planId].budgets.push(budget);
        masterGroups[planId].totalAmount += (budget.amount || 0);
        masterGroups[planId].totalSpent += (spentData[budget._id] || 0);
      } else {
        items.push({ type: 'single', budget });
      }
    });

    return items;
  }, [filteredBudgets, spentData]);

  return (
    <div className="pb-24 pt-6 px-4 max-w-7xl mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <Target className="text-brand-blue" size={32} />
            {t('budgets.title')}
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">{t('budgets.subtitle')}</p>
        </div>
        <button
          onClick={() => {
            setBudgetToEdit(null);
            setIsModalOpen(true);
          }}
          className="bg-brand-blue hover:bg-brand-blue/90 text-white px-6 py-3.5 rounded-2xl shadow-lg shadow-brand-blue/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 font-bold"
        >
          <Plus size={20} />
          {t('budgets.addBudget')}
        </button>
      </div>

      {/* Hero Card */}
      {!isLoading && (
        <section className="relative overflow-hidden p-8 rounded-[2rem] bg-black/40 border border-white/5 backdrop-blur-xl shadow-2xl flex flex-col justify-center items-center text-center group mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-purple-900/10 opacity-50 group-hover:opacity-70 transition-opacity duration-700" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-blue/30 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 w-full">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-brand-blue/20 rounded-2xl border border-brand-blue/30 text-brand-blue">
                <Target size={28} />
              </div>
            </div>
            <p className="text-sm font-medium text-[var(--color-text-muted)] tracking-wider uppercase mb-2">
              {t('budgets.totalRemaining', 'Total Remaining')}
            </p>
            <h2 className={`text-4xl md:text-5xl font-bold tabular-nums tracking-tight mb-8 drop-shadow-md ${
              budgets.reduce((s, b) => s + (b.amount || 0), 0) < budgets.reduce((s, b) => s + (spentData[b._id] || 0), 0) 
                ? 'text-brand-red' 
                : 'text-white'
            }`}>
              {(budgets.reduce((s, b) => s + (b.amount || 0), 0) - budgets.reduce((s, b) => s + (spentData[b._id] || 0), 0)).toLocaleString()} {t('nav.currency')}
            </h2>

            <div className="flex flex-col md:flex-row justify-center gap-4 w-full max-w-xl mx-auto">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">{t('budgets.totalBudgeted', 'Total Budgeted')}</span>
                <span className="font-bold text-lg text-white">{budgets.reduce((s, b) => s + (b.amount || 0), 0).toLocaleString()} {t('nav.currency')}</span>
              </div>
              <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-xs text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">{t('budgets.totalSpent', 'Total Spent')}</span>
                <span className="font-bold text-lg text-brand-blue">{budgets.reduce((s, b) => s + (spentData[b._id] || 0), 0).toLocaleString()} {t('nav.currency')}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Smart Budget Planner Entry */}
      <div 
        onClick={() => navigate('/budgets/smart-planner')}
        className="relative overflow-hidden bg-gradient-to-r from-brand-blue/20 to-purple-500/20 border border-brand-blue/30 rounded-[2rem] p-6 mb-8 cursor-pointer hover:border-brand-blue/60 transition-all flex items-center justify-between group shadow-lg"
      >
        <div className="absolute right-0 top-0 w-32 h-32 bg-brand-blue/20 rounded-full blur-[50px] pointer-events-none group-hover:bg-brand-blue/40 transition-colors" />
        <div className="relative z-10">
          <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
            <Target className="text-brand-blue" size={20} />
            {t('smartBudget.entryButton', 'Smart Planner')}
          </h3>
          <p className="text-white/60 text-sm">{t('smartBudget.entryDesc', 'Let us distribute your budget for you')}</p>
        </div>
        <div className="relative z-10 w-12 h-12 rounded-2xl bg-brand-blue/20 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform">
          <ArrowRight size={24} className={language === 'ar' ? 'rotate-180' : ''} />
        </div>
      </div>

      {!isLoading && draftPlans.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white font-bold mb-4">{t('smartBudget.drafts', 'Recent Drafts')}</h2>
          <div className="space-y-3">
            {draftPlans.map(draft => (
              <div 
                key={draft._id} 
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-white font-medium">{draft.name || t('smartBudget.untitledDraft', 'Untitled Draft')}</h3>
                  <p className="text-white/50 text-sm">
                    {draft.availableBudget?.toLocaleString()} {t('nav.currency')} • {draft.categories?.length || 0} {t('smartBudget.categories', 'categories')}
                  </p>
                </div>
                <button
                  onClick={() => navigate('/budgets/smart-planner', { state: { draftPlan: draft } })}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {t('smartBudget.resume', 'Resume')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && budgets.length > 0 && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6 pb-2">
            <div className="relative min-w-[140px] z-50">
              <CustomSelect 
                value={filterPeriod}
                onChange={setFilterPeriod}
                options={[
                  { value: 'all', label: t('budgets.allPeriods') },
                  { value: 'monthly', label: t('budgets.monthly') },
                  { value: 'weekly', label: t('budgets.weekly') }
                ]}
                buttonClassName="w-full flex justify-between items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm hover:bg-white/10 transition-colors shadow-lg backdrop-blur-md"
              />
            </div>
            
            <div className="relative min-w-[160px] z-40">
              <CustomSelect 
                value={filterCategory}
                onChange={setFilterCategory}
                options={[
                  { value: 'all', label: t('budgets.allCategories') },
                  ...categories.filter(c => c.type === 'expense').map(c => ({
                    value: c._id, 
                    label: c.name,
                    icon: c.icon,
                    color: c.color
                  }))
                ]}
                buttonClassName="w-full flex justify-between items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm hover:bg-white/10 transition-colors shadow-lg backdrop-blur-md"
              />
            </div>
          </div>
        </>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : groupedDisplayItems.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-xl mt-8"
        >
          <div className="w-20 h-20 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Target className="w-10 h-10 text-brand-blue/80" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{t('budgets.noBudgets')}</h3>
          <p className="text-white/50 mb-8 max-w-[80%] mx-auto text-sm leading-relaxed">
            {t('budgets.emptyDesc')}
          </p>
          <button
            onClick={() => {
              setBudgetToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-8 py-4 bg-white hover:bg-gray-100 text-black rounded-2xl transition-all font-bold inline-flex items-center gap-2 shadow-[0_10px_40px_rgba(255,255,255,0.1)] active:scale-95"
          >
            <Plus size={20} />
            {t('budgets.addBudget')}
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {groupedDisplayItems.map((item, index) => {
              if (item.type === 'master') {
                return (
                  <MasterBudgetCard 
                    key={item.plan._id}
                    plan={item.plan}
                    budgets={item.budgets}
                    spentData={spentData}
                    onEdit={budget => { setBudgetToEdit(budget); setIsModalOpen(true); }}
                    onDelete={budget => setBudgetToDelete(budget)}
                    onEditPlan={plan => { setPlanToEdit(plan); setPlanNameInput(plan.name || ''); setIsPlanEditModalOpen(true); }}
                    onDeletePlan={plan => { setPlanToDelete(plan); setIsPlanConfirmModalOpen(true); }}
                    index={index}
                    categories={categories}
                  />
                );
              } else {
                const budget = item.budget;
                const mappedCategory = typeof budget.category === 'object' 
                  ? budget.category 
                  : categories.find(c => c._id === budget.category) || { name: t('nav.category', 'Category') };
                  
                const fullBudget = { ...budget, category: mappedCategory };
                
                return (
                  <BudgetCard
                    key={budget._id}
                    budget={fullBudget}
                    spent={spentData[budget._id] || 0}
                    index={index}
                    onEdit={b => { setBudgetToEdit(b); setIsModalOpen(true); }}
                    onDelete={b => setBudgetToDelete(b)}
                  />
                );
              }
            })}
          </AnimatePresence>
        </div>
      )}

        <BudgetModal 
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setBudgetToEdit(null);
          }}
          onSave={handleSaveBudget}
          budgetToEdit={budgetToEdit}
          categories={categories}
          defaultPeriod={userPreferences?.budgetPeriod || 'monthly'}
        />

        <ConfirmModal
          open={!!budgetToDelete}
          title={t('budgets.confirmDelete', 'Delete Budget')}
          message={t('budgets.deleteConfirmMessage', 'Are you sure you want to delete this budget?')}
          confirmText={t('settings.deleteBtn', 'Delete')}
          cancelText={t('settings.cancelBtn', 'Cancel')}
          confirmColor="red"
          onConfirm={handleDeleteBudget}
          onCancel={() => setBudgetToDelete(null)}
        />

        <FormModal
          open={isPlanEditModalOpen}
          title={t('smartBudget.renamePlan', 'Rename Master Budget')}
          onSave={handleEditPlan}
          onCancel={() => {
            setIsPlanEditModalOpen(false);
            setPlanToEdit(null);
          }}
          saveText={t('common.save', 'Save')}
        >
          <div className="space-y-4">
            <input 
              type="text" 
              value={planNameInput}
              onChange={(e) => setPlanNameInput(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-blue"
              placeholder={t('smartBudget.planNamePlaceholder', 'Enter master budget name')}
            />
          </div>
        </FormModal>

        <ConfirmModal
          open={isPlanConfirmModalOpen}
          title={t('smartBudget.deletePlanConfirm', 'Delete Master Budget?')}
          message={t('smartBudget.deletePlanWarning', 'Are you sure you want to delete this Master Budget? All sub-budgets grouped within it will also be permanently deleted. This action cannot be undone.')}
          confirmText={t('settings.deleteBtn', 'Delete')}
          cancelText={t('settings.cancelBtn', 'Cancel')}
          confirmColor="red"
          onConfirm={handleDeletePlan}
          onCancel={() => {
            setIsPlanConfirmModalOpen(false);
            setPlanToDelete(null);
          }}
        />
    </div>
  );
}
