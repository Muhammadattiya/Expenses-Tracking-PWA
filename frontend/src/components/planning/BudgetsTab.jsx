import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { budgetService } from '../../services/budgetService';
import { getCategories } from '../../api/categories';
import { getTransactions } from '../../api/transactions';
import { smartBudgetService } from '../../api/smartBudgets';
import { getCurrentUser } from '../../api/auth';

import MasterBudgetCard from '../Budget/MasterBudgetCard';
import BudgetCard from '../Budget/BudgetCard';
import BudgetModal from '../Budget/BudgetModal';
import MasterBudgetModal from '../Budget/MasterBudgetModal';
import ConfirmModal from '../modals/ConfirmModal';
import CustomSelect from '../ui/CustomSelect';
import { Plus, Target, ArrowRight, FlaskConical } from 'lucide-react';
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

export default function BudgetsTab() {
  const { t, lang } = useLanguage();
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
        smartBudgetService.getPlans().catch(() => [])
      ]);
      
      const prefs = user?.user?.preferences || user?.preferences || {};
      setBudgets(budgetsData || []);
      setCategories(catsData || []);
      setUserPreferences(prefs);
      setDraftPlans(Array.isArray(draftsData) ? draftsData.filter(d => d.status === 'draft') : []);
      
      await calculateSpent(budgetsData || [], prefs);
    } catch (err) {
      console.error('Failed to load budgets', err);
      showToast(t('common.loadError') || 'Failed to load budgets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSpent = async (budgetsList, preferences = {}) => {
    const now = new Date();
    
    // Preferences
    const prefMonthStart = preferences.trackingStartDayMonthly ?? 1;
    const prefWeekStart = preferences.trackingStartDayWeekly ?? 6;
    
    // Month bounds
    let monthStart = new Date(now.getFullYear(), now.getMonth(), prefMonthStart);
    const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const actualMonthStartDay = Math.min(prefMonthStart, lastDayOfCurrentMonth);
    
    if (now.getDate() < actualMonthStartDay) {
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

  const handleEditPlan = async (planData) => {
    if (!planToEdit) return;
    try {
      await smartBudgetService.updateDraftPlan(planToEdit._id, planData);
      showToast(t('smartBudget.editSuccess'), 'success');
      setIsPlanEditModalOpen(false);
      setPlanToEdit(null);
      loadData();
    } catch (err) {
      console.error('Failed to update plan', err);
      showToast(t('common.error'), 'error');
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      await smartBudgetService.deletePlan(planToDelete._id);
      showToast(t('smartBudget.deleteSuccess'), 'success');
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
      const catId = typeof b.category === 'object' ? b.category?._id : b.category;
      if (filterCategory !== 'all' && catId !== filterCategory) return false;
      return true;
    });
  }, [budgets, filterPeriod, filterCategory]);

  const groupedDisplayItems = useMemo(() => {
    const items = [];
    const processedPlanIds = new Set();

    filteredBudgets.forEach(b => {
      if (b.smartBudgetPlan && typeof b.smartBudgetPlan === 'object' && b.smartBudgetPlan.groupAsMaster) {
        const planId = b.smartBudgetPlan._id;
        if (!processedPlanIds.has(planId)) {
          processedPlanIds.add(planId);
          const relatedBudgets = budgets.filter(rb => 
            rb.smartBudgetPlan && 
            (typeof rb.smartBudgetPlan === 'object' ? rb.smartBudgetPlan._id : rb.smartBudgetPlan) === planId
          );
          items.push({
            type: 'master',
            plan: b.smartBudgetPlan,
            budgets: relatedBudgets
          });
        }
      } else {
        items.push({
          type: 'standalone',
          budget: b
        });
      }
    });

    return items;
  }, [filteredBudgets, budgets]);

  return (
    <div className="w-full">
      {/* Action Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Target className="text-[#8D6346]" size={22} />
            {t('budgets.title') || 'Category Budgets'}
          </h2>
          <p className="text-xs text-white/50 mt-0.5">
            {t('budgets.subtitle') || 'Control your spending across essential & discretionary categories'}
          </p>
        </div>

        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setBudgetToEdit(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#8D6346] hover:bg-[#A37352] text-white rounded-2xl font-bold text-xs sm:text-sm shadow-[0_4px_16px_rgba(141,99,70,0.3)] transition-all shrink-0"
        >
          <Plus size={16} />
          <span>{t('budgets.addBudget')}</span>
        </motion.button>
      </div>

      {/* Hero Card */}
      {!isLoading && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden p-6 sm:p-8 rounded-[2.5rem] bg-black/20 border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-[40px] flex flex-col justify-center items-center text-center group mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#8D6346]/20 to-[#141115]/50 opacity-50 group-hover:opacity-70 transition-opacity duration-700" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#8D6346]/20 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 w-full">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-[#8D6346]/20 rounded-2xl border border-[#8D6346]/30 text-[#8D6346] shadow-inner">
                <Target size={28} />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-medium text-white/50 tracking-wider uppercase mb-2">
              {t('budgets.totalRemaining')}
            </p>
            <h2 className={`text-3xl sm:text-5xl font-black tabular-nums tracking-tight mb-6 drop-shadow-sm ${
              budgets.reduce((s, b) => s + (b.amount || 0), 0) < budgets.reduce((s, b) => s + (spentData[b._id] || 0), 0) 
                ? 'text-brand-red' 
                : 'text-white/90'
            }`}>
              {(budgets.reduce((s, b) => s + (b.amount || 0), 0) - budgets.reduce((s, b) => s + (spentData[b._id] || 0), 0)).toLocaleString()} {t('nav.currency')}
            </h2>

            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full max-w-xl mx-auto">
              <div className="flex-1 bg-black/30 border border-white/5 shadow-inner rounded-2xl p-4 flex flex-col items-center">
                <span className="text-[11px] text-white/50 mb-1 uppercase tracking-wider">{t('budgets.totalBudgeted')}</span>
                <span className="font-bold text-base sm:text-lg text-white/90 tabular-nums">{budgets.reduce((s, b) => s + (b.amount || 0), 0).toLocaleString()} {t('nav.currency')}</span>
              </div>
              <div className="flex-1 bg-black/30 border border-white/5 shadow-inner rounded-2xl p-4 flex flex-col items-center">
                <span className="text-[11px] text-white/50 mb-1 uppercase tracking-wider">{t('budgets.totalSpent')}</span>
                <span className="font-bold text-base sm:text-lg text-[#E8C5A8] tabular-nums">{budgets.reduce((s, b) => s + (spentData[b._id] || 0), 0).toLocaleString()} {t('nav.currency')}</span>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Smart Budget Planner Entry */}
      <motion.div 
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/budgets/smart-planner')}
        className="relative overflow-hidden bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem] p-5 sm:p-6 mb-6 cursor-pointer group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#8D6346]/20 to-transparent opacity-50" />
        <div className="absolute right-0 top-0 w-32 h-32 bg-[#8D6346]/20 rounded-full blur-[50px] pointer-events-none group-hover:bg-[#8D6346]/40 transition-colors" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h3 className="text-white/90 font-bold text-base sm:text-lg mb-1 flex items-center gap-2 drop-shadow-sm">
              <Target className="text-[#8D6346]" size={20} />
              {t('smartBudget.entryButton')}
            </h3>
            <p className="text-white/50 text-xs sm:text-sm">{t('smartBudget.entryDesc')}</p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/30 shadow-inner flex items-center justify-center text-[#8D6346] group-hover:scale-110 transition-transform shrink-0">
            <ArrowRight size={22} className={lang === 'ar' ? 'rotate-180' : ''} />
          </div>
        </div>
      </motion.div>

      {/* Sandbox Entry */}
      <motion.div 
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/sandbox')}
        className="relative overflow-hidden liquidglass rounded-[2rem] p-5 sm:p-6 mb-8 cursor-pointer group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#8D6346]/20 to-transparent opacity-50" />
        <div className="absolute right-0 top-0 w-32 h-32 bg-[#8D6346]/20 rounded-full blur-[50px] pointer-events-none group-hover:bg-[#8D6346]/40 transition-colors" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h3 className="text-white/90 font-bold text-base sm:text-lg mb-1 flex items-center gap-2 drop-shadow-sm">
              <FlaskConical className="text-[#8D6346]" size={20} />
              {t('sandbox.title') || (lang === 'ar' ? 'بيئة المحاكاة المالية' : 'Financial Sandbox')}
            </h3>
            <p className="text-white/50 text-xs sm:text-sm max-w-[90%]">
              {t('sandbox.subtitle') || (lang === 'ar' ? 'جرّب القرارات والسيناريوهات بأمان قبل تطبيقها' : 'Test "What-if" scenarios safely without affecting your real data.')}
            </p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/30 shadow-inner flex items-center justify-center text-[#8D6346] group-hover:scale-110 transition-transform shrink-0">
            <ArrowRight size={22} className={lang === 'ar' ? 'rotate-180' : ''} />
          </div>
        </div>
      </motion.div>

      {!isLoading && draftPlans.length > 0 && (
        <div className="mb-8">
          <h2 className="text-white/90 font-bold mb-4 drop-shadow-sm">{t('smartBudget.drafts')}</h2>
          <div className="space-y-3">
            {draftPlans.map(draft => (
              <div 
                key={draft._id} 
                className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem] p-5 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-white/90 font-bold text-base sm:text-lg drop-shadow-sm">{draft.name || t('smartBudget.untitledDraft')}</h3>
                  <p className="text-white/50 text-xs sm:text-sm mt-1 tabular-nums">
                    {draft.availableBudget?.toLocaleString()} {t('nav.currency')} • {draft.categories?.length || 0} {t('smartBudget.categories')}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/budgets/smart-planner', { state: { draftPlan: draft } })}
                  className="px-4 py-2 bg-[#8D6346]/10 border border-[#8D6346]/20 hover:bg-[#8D6346] hover:text-white text-[#8D6346] rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-inner"
                >
                  {t('smartBudget.resume')}
                </motion.button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && budgets.length > 0 && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6 pb-2">
            <div className="relative min-w-[130px] z-50">
              <CustomSelect 
                value={filterPeriod}
                onChange={setFilterPeriod}
                options={[
                  { value: 'all', label: t('budgets.allPeriods') },
                  { value: 'monthly', label: t('budgets.monthly') },
                  { value: 'weekly', label: t('budgets.weekly') }
                ]}
                buttonClassName="w-full flex justify-between items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs sm:text-sm hover:bg-white/10 transition-colors shadow-lg backdrop-blur-md"
              />
            </div>
            
            <div className="relative min-w-[150px] z-40">
              <CustomSelect 
                value={filterCategory}
                onChange={setFilterCategory}
                options={[
                  { value: 'all', label: t('budgets.allCategories') },
                  ...categories.filter(c => c.type === 'expense').map(c => ({
                    value: c._id, 
                    label: c.name,
                    icon: c.icon
                  }))
                ]}
                buttonClassName="w-full flex justify-between items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-xs sm:text-sm hover:bg-white/10 transition-colors shadow-lg backdrop-blur-md"
              />
            </div>
          </div>
        </>
      )}

      {/* Grid of Budgets */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : groupedDisplayItems.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/5 p-8 backdrop-blur-md">
          <div className="w-16 h-16 rounded-full bg-[#8D6346]/10 flex items-center justify-center text-[#8D6346] mx-auto mb-4 border border-[#8D6346]/20">
            <Target size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{t('budgets.noBudgets')}</h3>
          <p className="text-white/50 text-sm max-w-sm mx-auto mb-6">
            {t('budgets.noBudgetsDesc')}
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setBudgetToEdit(null);
              setIsModalOpen(true);
            }}
            className="px-6 py-3 bg-[#8D6346] hover:bg-[#A37352] text-white rounded-xl font-bold text-sm shadow-[0_4px_16px_rgba(141,99,70,0.3)] transition-all"
          >
            {t('budgets.createFirst') || (lang === 'ar' ? 'إنشاء أول ميزانية' : 'Create First Budget')}
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  : categories.find(c => c._id === budget.category) || { name: t('nav.category') };
                  
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
        defaultPeriod={userPreferences?.trackingPeriod || 'monthly'}
      />

      <ConfirmModal
        open={!!budgetToDelete}
        title={t('budgets.confirmDelete')}
        message={t('budgets.deleteConfirmMessage')}
        confirmText={t('settings.deleteBtn')}
        cancelText={t('settings.cancelBtn')}
        confirmColor="red"
        onConfirm={handleDeleteBudget}
        onCancel={() => setBudgetToDelete(null)}
      />

      <MasterBudgetModal
        isOpen={isPlanEditModalOpen}
        planToEdit={planToEdit}
        onClose={() => {
          setIsPlanEditModalOpen(false);
          setPlanToEdit(null);
        }}
        onSave={handleEditPlan}
      />

      <ConfirmModal
        open={isPlanConfirmModalOpen}
        title={t('smartBudget.deletePlanConfirm')}
        message={t('smartBudget.deletePlanWarning')}
        confirmText={t('settings.deleteBtn')}
        cancelText={t('settings.cancelBtn')}
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
