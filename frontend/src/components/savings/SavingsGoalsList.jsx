import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, Plus, Sparkles, Award, Filter, 
  TrendingUp, Loader2, CheckCircle, RefreshCw 
} from 'lucide-react';
import GoalJarCard from './GoalJarCard';
import GoalModal from './GoalModal';
import GoalContributeModal from './GoalContributeModal';
import ConfirmModal from '../modals/ConfirmModal';
import { 
  getSavingsGoals, 
  createSavingsGoal, 
  updateSavingsGoal, 
  deleteSavingsGoal, 
  contributeToGoal 
} from '../../api/savingsGoals';
import { getAccounts } from '../../api/accounts';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';

export default function SavingsGoalsList({ onDataChange = null }) {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();

  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
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
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [goalsData, accsData] = await Promise.all([
        getSavingsGoals(),
        getAccounts()
      ]);
      setGoals(goalsData || []);
      setAccounts(accsData || []);
    } catch (err) {
      console.error('[SAVINGS_GOALS] Failed to fetch goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Summary Metrics
  const totalTarget = goals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  const totalSaved = goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  const totalMonthlyPace = goals
    .filter(g => g.status === 'active')
    .reduce((sum, g) => sum + (Number(g.requiredMonthlyPace) || 0), 0);
  const overallProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  // Filtered Goals
  const filteredGoals = goals.filter((g) => {
    if (filter === 'active') return g.status === 'active';
    if (filter === 'achieved') return g.status === 'achieved' || g.currentAmount >= g.targetAmount;
    return true;
  });

  // Handlers
  const handleOpenCreate = () => {
    setEditingGoal(null);
    setGoalModalOpen(true);
  };

  const handleOpenEdit = (goal) => {
    setEditingGoal(goal);
    setGoalModalOpen(true);
  };

  const handleSaveGoal = async (goalData) => {
    try {
      setIsSavingGoal(true);
      if (editingGoal) {
        await updateSavingsGoal(editingGoal._id, goalData);
        showToast(t('savingsGoals.updateSuccess'), 'success');
      } else {
        await createSavingsGoal(goalData);
        showToast(t('savingsGoals.createSuccess'), 'success');
      }
      setGoalModalOpen(false);
      setEditingGoal(null);
      await loadData();
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('[SAVINGS_GOALS] Save error:', err);
      showToast(err.response?.data?.message || t('common.error'), 'error');
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleOpenDelete = (goal) => {
    setDeletingGoal(goal);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingGoal) return;
    try {
      setIsDeleting(true);
      await deleteSavingsGoal(deletingGoal._id);
      showToast(t('savingsGoals.deleteSuccess'), 'success');
      setDeleteModalOpen(false);
      setDeletingGoal(null);
      await loadData();
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('[SAVINGS_GOALS] Delete error:', err);
      showToast(err.response?.data?.message || t('common.error'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenContribute = (goal) => {
    setTargetGoal(goal);
    setContributeModalOpen(true);
  };

  const handleConfirmContribute = async ({ goalId, amount, fromAccountId, notes }) => {
    try {
      setIsContributing(true);
      const res = await contributeToGoal(goalId, { amount, fromAccountId, notes });
      const updatedGoal = res.goal;

      // Celebrate milestones
      if (updatedGoal.progressPercent >= 100) {
        showToast(t('savingsGoals.milestone100'), 'success');
      } else if (updatedGoal.progressPercent >= 75 && (!targetGoal?.progressPercent || targetGoal.progressPercent < 75)) {
        showToast(t('savingsGoals.milestone75'), 'success');
      } else if (updatedGoal.progressPercent >= 50 && (!targetGoal?.progressPercent || targetGoal.progressPercent < 50)) {
        showToast(t('savingsGoals.milestone50'), 'success');
      } else if (updatedGoal.progressPercent >= 25 && (!targetGoal?.progressPercent || targetGoal.progressPercent < 25)) {
        showToast(t('savingsGoals.milestone25'), 'success');
      } else {
        showToast(t('savingsGoals.depositSuccess'), 'success');
      }

      setContributeModalOpen(false);
      setTargetGoal(null);
      await loadData();
      if (onDataChange) onDataChange();
    } catch (err) {
      console.error('[SAVINGS_GOALS] Contribution error:', err);
      showToast(err.response?.data?.message || t('common.error'), 'error');
    } finally {
      setIsContributing(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Overview Header Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="absolute top-0 end-0 w-48 h-48 bg-[#8D6346] rounded-full blur-[90px] opacity-25 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-[#8D6346]/30 border border-[#8D6346]/40 flex items-center justify-center text-[#E8C5A8]">
                <Target size={18} />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {t('savingsGoals.title')}
              </h3>
            </div>
            <p className="text-xs text-white/60">
              {t('savingsGoals.subtitle')}
            </p>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenCreate}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#8D6346] via-[#B88764] to-[#8D6346] text-white font-bold text-xs shadow-[0_4px_20px_rgba(141,99,70,0.4)] flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shrink-0"
          >
            <Plus size={16} />
            <span>{t('savingsGoals.addGoal')}</span>
          </motion.button>
        </div>

        {/* Global Stats Grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/5">
          <div className="p-3.5 rounded-2xl bg-black/20 border border-white/5 flex flex-col">
            <span className="text-[11px] text-white/50">{t('savingsGoals.totalSaved')}</span>
            <span className="text-lg font-black text-emerald-400 tabular-nums">{money(totalSaved)}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/20 border border-white/5 flex flex-col">
            <span className="text-[11px] text-white/50">{t('savingsGoals.totalTarget')}</span>
            <span className="text-lg font-black text-white/90 tabular-nums">{money(totalTarget)}</span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-black/20 border border-white/5 flex flex-col">
            <span className="text-[11px] text-white/50">{t('savingsGoals.monthlyCommitment')}</span>
            <span className="text-lg font-black text-[#E8C5A8] tabular-nums">{money(totalMonthlyPace)}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 p-1 bg-black/20 rounded-2xl border border-white/5">
          {[
            { id: 'all', label: t('savingsGoals.tabAll') },
            { id: 'active', label: t('savingsGoals.tabActive') },
            { id: 'achieved', label: t('savingsGoals.tabAchieved') }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === tab.id
                  ? 'bg-[#8D6346] text-white shadow-sm'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          aria-label={t('common.refresh')}
          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Goals Grid / List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#8D6346]/20 border border-[#8D6346]/30 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#8D6346] animate-spin" />
          </div>
          <span className="text-xs text-white/50">{t('common.loading')}</span>
        </div>
      ) : filteredGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
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
      ) : (
        <div className="py-16 flex flex-col items-center justify-center text-center p-6 bg-white/[0.02] border border-white/5 rounded-[2.5rem]">
          <div className="w-16 h-16 rounded-full bg-[#8D6346]/10 border border-[#8D6346]/20 flex items-center justify-center text-[#8D6346] mb-3">
            <Target size={28} />
          </div>
          <h4 className="text-white font-bold text-sm mb-1">
            {filter === 'achieved' 
              ? t('savingsGoals.noAchieved')
              : t('savingsGoals.noGoals')}
          </h4>
          <p className="text-xs text-white/50 max-w-xs mb-4">
            {t('savingsGoals.noGoalsDesc')}
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-[#8D6346]/30 border border-[#8D6346]/40 text-[#E8C5A8] hover:text-white text-xs font-bold transition-all"
          >
            {t('savingsGoals.addFirstGoal')}
          </motion.button>
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      <GoalModal
        open={goalModalOpen}
        onClose={() => { setGoalModalOpen(false); setEditingGoal(null); }}
        onSave={handleSaveGoal}
        accounts={accounts}
        initialGoal={editingGoal}
        isSaving={isSavingGoal}
      />

      {/* Quick Deposit Modal */}
      <GoalContributeModal
        open={contributeModalOpen}
        onClose={() => { setContributeModalOpen(false); setTargetGoal(null); }}
        goal={targetGoal}
        accounts={accounts}
        onContribute={handleConfirmContribute}
        isSubmitting={isContributing}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={deleteModalOpen}
        title={t('savingsGoals.deleteGoal')}
        message={`${t('savingsGoals.confirmDelete')} "${deletingGoal?.title}"`}
        confirmText={isDeleting ? t('common.deleting') : t('common.delete')}
        cancelText={t('common.cancel')}
        confirmColor="red"
        onConfirm={handleConfirmDelete}
        onCancel={() => { if (!isDeleting) setDeleteModalOpen(false); }}
      />
    </div>
  );
}
