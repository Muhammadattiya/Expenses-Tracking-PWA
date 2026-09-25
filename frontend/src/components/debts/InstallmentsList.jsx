import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CreditCard, PieChart, ShieldAlert, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getInstallments, createInstallment, updateInstallment, deleteInstallment, payInstallment } from '../../api/installments';
import { getAccounts } from '../../api/accounts';
import InstallmentCard from './InstallmentCard';
import InstallmentModal from './InstallmentModal';
import ConfirmModal from '../modals/ConfirmModal';

const moneyFormatters = {
  ar: new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0
  }),
  en: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0
  })
};

export default function InstallmentsList() {
  const { t, lang } = useLanguage();

  const money = useCallback((val) => {
    return (moneyFormatters[lang] || moneyFormatters.en).format(val || 0);
  }, [lang]);

  const [installments, setInstallments] = useState([]);
  const [summary, setSummary] = useState({
    totalMonthlyBurden: 0,
    totalRemainingObligations: 0,
    activeCount: 0,
    monthlyIncome: 0,
    debtToIncomeRatio: 0,
    dtiStatus: 'healthy'
  });

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // 'all', 'active', 'settled'

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState(null);
  const [deletingInstallment, setDeletingInstallment] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [res, accs] = await Promise.all([
        getInstallments(),
        getAccounts()
      ]);
      setInstallments(res.installments || []);
      if (res.summary) setSummary(res.summary);
      setAccounts(accs || []);
    } catch (err) {
      console.error('[INSTALLMENTS] Failed to load installments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleSave = async (formData) => {
    if (editingInstallment) {
      await updateInstallment(editingInstallment._id, formData);
      showToast(t('installments.saveSuccess'));
    } else {
      await createInstallment(formData);
      showToast(t('installments.createSuccess'));
    }
    await loadData();
  };

  const handleDelete = async () => {
    if (!deletingInstallment) return;
    try {
      await deleteInstallment(deletingInstallment._id);
      setDeletingInstallment(null);
      showToast(t('installments.deleteSuccess'));
      await loadData();
    } catch (err) {
      console.error('[INSTALLMENTS] Failed to delete installment:', err);
      showToast(err?.response?.data?.message || t('common.error'));
      setDeletingInstallment(null);
    }
  };

  const handlePay = async (inst) => {
    try {
      setPayingId(inst._id);
      await payInstallment(inst._id, { accountId: inst.linkedAccountId?._id || inst.linkedAccountId });
      showToast(t('installments.paidSuccess'));
      await loadData();
    } catch (err) {
      console.error('[INSTALLMENTS] Pay failed:', err);
      showToast(err?.response?.data?.message || t('common.error'));
    } finally {
      setPayingId(null);
    }
  };

  const filteredInstallments = useMemo(() => {
    return installments.filter(i => {
      if (filter === 'active') return i.status === 'active';
      if (filter === 'settled') return i.status === 'settled';
      return true;
    });
  }, [installments, filter]);

  return (
    <div className="space-y-6 pb-36">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[110] px-4 py-2.5 rounded-2xl bg-[#8D6346] text-white text-xs font-semibold shadow-2xl flex items-center gap-2 border border-white/20"
          >
            <Sparkles className="w-4 h-4 text-[#E8C5A8]" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aggregate Burden & DTI Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-[#2B2321]/30 backdrop-blur-xl border border-[#8D6346]/30 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.37)]"
      >
        <div className="absolute top-0 end-0 w-64 h-64 bg-[#8D6346]/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-semibold text-[#E8C5A8] uppercase tracking-wider block mb-1">
              {t('installments.totalMonthlyBurden')}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tabular-nums tracking-tight">
                {money(summary.totalMonthlyBurden)}
              </span>
              <span className="text-xs text-white/60">
                / {t('savingsGoals.perMonth')}
              </span>
            </div>
          </div>

          {/* Action button - Signature Finova Copper Glass Pill */}
          <motion.button
            id="btn-add-installment"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingInstallment(null);
              setModalOpen(true);
            }}
            className="min-h-[44px] py-2.5 px-5 rounded-full font-semibold text-xs sm:text-sm text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center gap-2 backdrop-blur-md"
          >
            <Plus className="w-4 h-4" />
            {t('installments.addInstallment')}
          </motion.button>
        </div>

        {/* Secondary Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10">
          <div>
            <span className="text-[11px] text-white/60 block">
              {t('installments.totalRemaining')}
            </span>
            <span className="text-sm font-bold text-white/90 tabular-nums">
              {money(summary.totalRemainingObligations)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-white/60 block">
              {t('installments.activeCount')}
            </span>
            <span className="text-sm font-bold text-[#E8C5A8] tabular-nums">
              {summary.activeCount}
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <span className="text-[11px] text-white/60 block">
              {t('installments.dtiRatio')}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-sm font-bold tabular-nums ${
                summary.dtiStatus === 'critical' ? 'text-rose-400' :
                summary.dtiStatus === 'caution' ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {summary.debtToIncomeRatio}%
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                summary.dtiStatus === 'critical' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' :
                summary.dtiStatus === 'caution' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              }`}>
                {t(`installments.dti${summary.dtiStatus.charAt(0).toUpperCase() + summary.dtiStatus.slice(1)}`)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div 
          role="tablist"
          aria-label={t('installments.title')}
          className="flex items-center p-1 rounded-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner h-12"
        >
          {['active', 'settled', 'all'].map(tabKey => (
            <button
              key={tabKey}
              role="tab"
              id={`installment-filter-${tabKey}`}
              aria-selected={filter === tabKey}
              aria-controls="installment-cards-grid"
              onClick={() => setFilter(tabKey)}
              className={`relative flex items-center justify-center min-h-[44px] px-5 rounded-full text-xs font-semibold transition-colors duration-300 z-10 ${
                filter === tabKey ? 'text-white' : 'text-white/50 hover:text-white'
              }`}
            >
              {filter === tabKey && (
                <motion.div
                  layoutId="installmentFilterTab"
                  className="absolute inset-0 bg-[#8D6346]/30 border border-[#8D6346]/40 rounded-full shadow-sm"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">
                {t(`installments.status${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`)}
              </span>
            </button>
          ))}
        </div>

        <span className="text-xs text-white/60">
          {filteredInstallments.length} {t('installments.title')}
        </span>
      </div>

      {/* List of Installment Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(n => (
            <div key={n} className="h-44 rounded-2xl bg-white/5 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : filteredInstallments.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl bg-[#2B2321]/15 border border-dashed border-[#8D6346]/25">
          <CreditCard className="w-10 h-10 text-[#8D6346]/50 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-white/80 mb-1">
            {t('installments.emptyTitle')}
          </h4>
          <p className="text-xs text-white/50 max-w-sm mx-auto mb-4">
            {t('installments.emptySubtitle')}
          </p>
          <motion.button
            id="btn-add-installment-empty"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingInstallment(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 min-h-[44px] py-2.5 px-5 rounded-full font-semibold text-xs text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 backdrop-blur-md"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('installments.addInstallment')}
          </motion.button>
        </div>
      ) : (
        <div id="installment-cards-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredInstallments.map(inst => (
              <InstallmentCard
                key={inst._id}
                installment={inst}
                onPay={handlePay}
                onEdit={(item) => {
                  setEditingInstallment(item);
                  setModalOpen(true);
                }}
                onDelete={(item) => setDeletingInstallment(item)}
                isPaying={payingId === inst._id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}


      {/* Creation / Edit Modal */}
      <InstallmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={(item) => setDeletingInstallment(item)}
        installmentToEdit={editingInstallment}
        accounts={accounts}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={Boolean(deletingInstallment)}
        isOpen={Boolean(deletingInstallment)}
        onCancel={() => setDeletingInstallment(null)}
        onClose={() => setDeletingInstallment(null)}
        onConfirm={handleDelete}
        title={t('installments.deleteInstallment')}
        message={t('installments.confirmDelete')}
        confirmText={t('installments.deleteInstallment')}
        danger={true}
      />
    </div>
  );
}
