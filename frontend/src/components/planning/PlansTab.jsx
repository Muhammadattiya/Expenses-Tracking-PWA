import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Plus, 
  Sparkles, 
  Award, 
  Filter, 
  TrendingUp, 
  Loader2, 
  CheckCircle, 
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import GoalJarCard from '../savings/GoalJarCard';
import GoalModal from '../savings/GoalModal';
import GoalContributeModal from '../savings/GoalContributeModal';
import ConfirmModal from '../modals/ConfirmModal';
import SavingsAdvicePanel from './SavingsAdvicePanel';
import { 
  getSavingsGoals, 
  createSavingsGoal, 
  updateSavingsGoal, 
  deleteSavingsGoal, 
  contributeToGoal 
} from '../../api/savingsGoals';
import { getAccounts } from '../../api/accounts';
import { getTransactions } from '../../api/transactions';
import { getEmergencyFund } from '../../api/emergencyFund';
import { getDebts } from '../../api/debts';
import { getInstallments } from '../../api/installments';
import { getReceivables } from '../../api/receivables';
import { getInvestments, getGoldPrice } from '../../api/investments';
import { calculateAccountBalances } from '../../utils/accountBalances';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { generateGoalAdvices } from '../../services/financialAdviceEngine';
import { triggerHaptic } from '../../utils/haptics';

export default function PlansTab() {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();
  const isAr = lang === 'ar';

  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [allDebtTransactions, setAllDebtTransactions] = useState([]);
  const [allInstallmentTransactions, setAllInstallmentTransactions] = useState([]);
  const [allReceivables, setAllReceivables] = useState([]);
  const [investmentsValue, setInvestmentsValue] = useState(0);
  const [shield, setShield] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'achieved'

  // Modals
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [targetGoal, setTargetGoal] = useState(null);
  const [isContributing, setIsContributing] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const money = (val) =>
    new Intl.NumberFormat(isAr ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        goalsData, 
        accsData, 
        txsData, 
        shieldData,
        debtsData,
        installmentsData,
        receivablesData,
        investmentsData,
        goldPriceData
      ] = await Promise.all([
        getSavingsGoals().catch(() => []),
        getAccounts().catch(() => []),
        getTransactions().catch(() => []),
        getEmergencyFund().catch(() => null),
        getDebts().catch(() => ({ debts: [], transactions: [] })),
        getInstallments().catch(() => ({ installments: [], transactions: [] })),
        getReceivables().catch(() => []),
        getInvestments().catch(() => []),
        getGoldPrice().catch(() => null)
      ]);
      setGoals(goalsData || []);
      setAccounts(accsData || []);
      setTransactions(txsData || []);
      setShield(shieldData || null);
      setAllDebtTransactions(debtsData.transactions || []);
      setAllInstallmentTransactions(installmentsData.transactions || []);
      setAllReceivables(receivablesData || []);

      let invValue = 0;
      if (investmentsData && investmentsData.length > 0) {
        investmentsData.forEach(inv => {
          if (inv.type === 'gold' && goldPriceData) {
            const currentPrice = inv.karat === 24 ? goldPriceData.perGram24 : goldPriceData.perGram21;
            invValue += Number(inv.quantity) * currentPrice;
          } else {
            invValue += Number(inv.quantity) * Number(inv.currentPrice || inv.purchasePrice);
          }
        });
      }
      setInvestmentsValue(invValue);
    } catch (err) {
      console.error('[PLANS_TAB] Failed to load goals and financial state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Live authoritative account balance map
  const accountBalances = useMemo(() => {
    return calculateAccountBalances({
      accounts,
      transactions,
      debtTransactions: allDebtTransactions,
      installmentTransactions: allInstallmentTransactions,
      receivables: allReceivables,
      investmentsValue
    });
  }, [accounts, transactions, allDebtTransactions, allInstallmentTransactions, allReceivables, investmentsValue]);

  // Synchronize goals with live account balances for dedicated accounts
  const syncedGoals = useMemo(() => {
    return goals.map(g => {
      let currentAmount = Number(g.currentAmount) || 0;
      if (g.allocationType === 'dedicated' && g.linkedAccountId) {
        const accId = (g.linkedAccountId?._id || g.linkedAccountId)?.toString();
        if (accountBalances.has(accId)) {
          currentAmount = Math.max(0, accountBalances.get(accId));
        }
      }
      const targetAmount = Number(g.targetAmount) || 1;
      const progressPercent = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
      const status = currentAmount >= targetAmount ? 'achieved' : (g.status === 'achieved' ? 'active' : g.status);
      return {
        ...g,
        currentAmount,
        progressPercent,
        status
      };
    });
  }, [goals, accountBalances]);

  // Summary Metrics
  const totalTarget = syncedGoals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  const totalSaved = syncedGoals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  const totalMonthlyPace = syncedGoals
    .filter(g => g.status === 'active')
    .reduce((sum, g) => sum + (Number(g.requiredMonthlyPace) || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  // Filtered Goals
  const filteredGoals = syncedGoals.filter((g) => {
    if (filter === 'active') return g.status === 'active';
    if (filter === 'achieved') return g.status === 'achieved' || g.currentAmount >= g.targetAmount;
    return true;
  });

  // Calculate dynamic personalized advices
  const advices = useMemo(() => {
    return generateGoalAdvices({
      goals: syncedGoals,
      transactions,
      accounts,
      shield,
      lang
    });
  }, [syncedGoals, transactions, accounts, shield, lang]);

  // Handlers
  const handleOpenCreate = () => {
    triggerHaptic('selection');
    setEditingGoal(null);
    setGoalModalOpen(true);
  };

  const handleOpenEdit = (goal) => {
    triggerHaptic('selection');
    setEditingGoal(goal);
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async (goalData) => {
    try {
      setIsSavingGoal(true);
      if (editingGoal) {
        await updateSavingsGoal(editingGoal._id, goalData);
        showToast(t('savingsGoals.updateSuccess') || 'Goal updated', 'success');
      } else {
        await createSavingsGoal(goalData);
        showToast(t('savingsGoals.createSuccess') || 'Goal created', 'success');
      }
      setGoalModalOpen(false);
      setEditingGoal(null);
      await loadData();
    } catch (err) {
      console.error('[PLANS_TAB] Save error:', err);
      showToast(err.response?.data?.message || t('common.error'), 'error');
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleOpenDelete = (goal) => {
    triggerHaptic('selection');
    setDeletingGoal(goal);
    setDeleteModalOpen(true);
  };

  const handleDeleteGoal = async () => {
    if (!deletingGoal) return;
    try {
      setIsDeleting(true);
      await deleteSavingsGoal(deletingGoal._id);
      showToast(t('savingsGoals.deleteSuccess') || 'Goal deleted', 'success');
      setDeleteModalOpen(false);
      setDeletingGoal(null);
      await loadData();
    } catch (err) {
      console.error('[PLANS_TAB] Delete error:', err);
      showToast(err.response?.data?.message || t('common.error'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenContribute = (goal) => {
    triggerHaptic('selection');
    setTargetGoal(goal);
    setContributeModalOpen(true);
  };

  const handleContribute = async ({ fromAccountId, amount, notes }) => {
    if (!targetGoal) return;
    try {
      setIsContributing(true);
      await contributeToGoal(targetGoal._id, { fromAccountId, amount, notes });
      showToast(t('savingsGoals.contributeSuccess') || 'Contribution saved', 'success');
      setContributeModalOpen(false);
      setTargetGoal(null);
      await loadData();
    } catch (err) {
      console.error('[PLANS_TAB] Contribution error:', err);
      showToast(err.response?.data?.message || t('common.error'), 'error');
    } finally {
      setIsContributing(false);
    }
  };

  const handleAskNova = () => {
    const prompt = isAr
      ? `أهلاً Nova، راجع أهدافي المالية الحالية وفائض دخلي الشهري ونمط إنفاقي، وزودني بخطة استراتيجية عملية خطوة بخطوة للوصول لأهدافي بشكل أسرع دون ضغط على نفقاتي الأساسية.`
      : `Hello Nova, review my current financial goals, monthly surplus, and spending patterns, and give me a clear step-by-step strategy to achieve my targets faster without risking essential expenses.`;

    window.dispatchEvent(new CustomEvent('open-nova-agent', {
      detail: { initialPrompt: prompt }
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-44 rounded-[2.5rem] bg-white/5 border border-white/10" />
        <div className="h-64 rounded-[2rem] bg-white/5 border border-white/10" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header & Quick Action */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Sparkles className="text-[#8D6346]" size={22} />
            {t('planning.plans.title') || 'Strategic Goals & Action Plans'}
          </h2>
          <p className="text-xs text-white/50 mt-0.5">
            {t('planning.plans.subtitle') || 'Turn your life ambitions into structured targets with automated pacing'}
          </p>
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#8D6346] hover:bg-[#A37352] text-white rounded-2xl font-bold text-xs sm:text-sm shadow-[0_4px_16px_rgba(141,99,70,0.3)] transition-all shrink-0"
        >
          <Plus size={16} />
          <span>{t('planning.plans.newGoal') || 'New Goal'}</span>
        </motion.button>
      </div>

      {/* Aggregate Goals Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] p-6 sm:p-8 bg-black/20 border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-[40px] group"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#8D6346]/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <span className="text-xs text-white/50 uppercase tracking-wider font-medium">
                {t('savingsGoals.totalSaved') || 'Total Accumulated Across Goals'}
              </span>
              <div className="text-3xl sm:text-5xl font-black text-white tracking-tight tabular-nums mt-1 drop-shadow-sm">
                {money(totalSaved)}
              </div>
            </div>

            <div className="flex flex-col sm:items-end">
              <span className="text-xs text-white/50 uppercase tracking-wider font-medium">
                {t('savingsGoals.totalTarget') || 'Aggregate Target'}
              </span>
              <div className="text-lg sm:text-2xl font-bold text-[#E8C5A8] tabular-nums mt-0.5">
                {money(totalTarget)}
              </div>
            </div>
          </div>

          {/* Aggregate Progress Bar */}
          <div className="space-y-2 mb-6">
            <div className="w-full h-3.5 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${overallProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-[#8D6346] via-[#E8C5A8] to-[#34C759] shadow-[0_0_12px_rgba(141,99,70,0.5)]"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-white/50">
              <span className="font-bold text-[#E8C5A8] tabular-nums">
                {overallProgress}% {isAr ? 'مكتمل' : 'Achieved'}
              </span>
              <span>
                {goals.filter(g => g.status === 'active').length} {isAr ? 'أهداف نشطة' : 'Active Goals'}
              </span>
            </div>
          </div>

          {/* Monthly Required Pace Pill */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="text-white/60 font-medium">
              {t('savingsGoals.requiredPace') || 'Combined Monthly Pace Required'}:
            </span>
            <span className="font-black text-emerald-400 tabular-nums text-sm">
              {money(totalMonthlyPace)} /{isAr ? 'شهر' : 'mo'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      {goals.length > 0 && (
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/5 rounded-2xl">
            {[
              { id: 'all', label: t('savingsGoals.filterAll') || 'All Goals' },
              { id: 'active', label: t('savingsGoals.filterActive') || 'Active' },
              { id: 'achieved', label: t('savingsGoals.filterAchieved') || 'Achieved' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  triggerHaptic('selection');
                  setFilter(f.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filter === f.id
                    ? 'bg-[#8D6346] text-white shadow-sm'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-white/40 font-medium px-1">
            {filteredGoals.length} {isAr ? 'هدف' : 'goals'}
          </span>
        </div>
      )}

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-3xl border border-white/5 p-8 backdrop-blur-md">
          <div className="w-16 h-16 rounded-full bg-[#8D6346]/10 flex items-center justify-center text-[#8D6346] mx-auto mb-4 border border-[#8D6346]/20">
            <Target size={32} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {filter === 'achieved' 
              ? (isAr ? 'لا توجد أهداف مكتملة بعد' : 'No achieved goals yet')
              : (isAr ? 'لا توجد أهداف نشطة حالياً' : 'No active goals yet')}
          </h3>
          <p className="text-white/50 text-xs sm:text-sm max-w-sm mx-auto mb-6">
            {isAr
              ? 'حدد طموحاتك القادمة سواء لشراء سيارة، زواج، رحلة، أو استثمار وسيتولى Finova حساب وتيرة الادخار المطلوبة.'
              : 'Set your upcoming ambitions and Finova will calculate the exact monthly pacing needed to reach them.'}
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenCreate}
            className="px-6 py-3 bg-[#8D6346] hover:bg-[#A37352] text-white rounded-xl font-bold text-sm shadow-[0_4px_16px_rgba(141,99,70,0.3)] transition-all"
          >
            {t('savingsGoals.addGoal') || 'Create First Goal'}
          </motion.button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredGoals.map((goal) => (
              <GoalJarCard
                key={goal._id}
                goal={goal}
                onContribute={handleOpenContribute}
                onEdit={handleOpenEdit}
                onDelete={handleOpenDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Dynamic Personalized Advices Panel */}
      <SavingsAdvicePanel advices={advices} onAskNova={handleAskNova} />

      {/* Goal Modal (Enhanced with Savings Account selector) */}
      <GoalModal
        open={goalModalOpen}
        onClose={() => {
          setGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
        accounts={accounts}
        accountBalances={accountBalances}
        initialGoal={editingGoal}
        isSaving={isSavingGoal}
      />

      {/* Contribute Modal */}
      <GoalContributeModal
        open={contributeModalOpen}
        onClose={() => {
          setContributeModalOpen(false);
          setTargetGoal(null);
        }}
        onContribute={handleContribute}
        goal={targetGoal}
        accounts={accounts}
        isContributing={isContributing}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title={t('savingsGoals.deleteGoal') || 'Delete Goal'}
        message={t('savingsGoals.confirmDelete') || 'Are you sure you want to delete this goal?'}
        confirmText={t('common.delete') || 'Delete'}
        cancelText={t('common.cancel') || 'Cancel'}
        confirmColor="red"
        onConfirm={handleDeleteGoal}
        onCancel={() => {
          setDeleteModalOpen(false);
          setDeletingGoal(null);
        }}
      />
    </div>
  );
}
