import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldCheck, ShieldAlert, Zap, ArrowRightLeft, Settings, X, Sparkles, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getEmergencyFund, updateEmergencyFund, depositEmergencyFund } from '../../api/emergencyFund';
import { getAccounts } from '../../api/accounts';
import { getTransactions } from '../../api/transactions';
import { getDebts } from '../../api/debts';
import { getInstallments } from '../../api/installments';
import { getReceivables } from '../../api/receivables';
import { getInvestments, getGoldPrice } from '../../api/investments';
import { formatAccountName } from '../../utils/transactionFormatters';
import { calculateAccountBalances } from '../../utils/accountBalances';

export default function FinancialShieldWidget({ onUpdate = null }) {
  const { t, lang } = useLanguage();

  const money = (val) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  const [shield, setShield] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountBalances, setAccountBalances] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Modals
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  // Deposit form state
  const [depositAmount, setDepositAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [modalError, setModalError] = useState('');

  // Config state
  const [targetMonths, setTargetMonths] = useState(6);
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        shieldData,
        accs,
        txs,
        debtsData,
        installmentsData,
        receivablesData,
        investmentsData,
        goldPriceData
      ] = await Promise.all([
        getEmergencyFund().catch(() => null),
        getAccounts().catch(() => []),
        getTransactions().catch(() => []),
        getDebts().catch(() => ({ debts: [], transactions: [] })),
        getInstallments().catch(() => []),
        getReceivables().catch(() => []),
        getInvestments().catch(() => []),
        getGoldPrice().catch(() => null)
      ]);

      setShield(shieldData);
      const safeAccs = accs || [];
      setAccounts(safeAccs);

      const balMap = calculateAccountBalances({
        accounts: safeAccs,
        transactions: txs || [],
        debtTransactions: debtsData?.transactions || debtsData?.debtTransactions || [],
        installmentTransactions: installmentsData?.transactions || [],
        receivables: receivablesData || [],
        investments: investmentsData || [],
        goldPrice: goldPriceData?.price || goldPriceData || null
      });
      setAccountBalances(balMap);

      if (shieldData) {
        setTargetMonths(shieldData.targetMonths || 6);
        setLinkedAccountId(shieldData.linkedAccount?._id || '');
      }
    } catch (err) {
      console.error('[SHIELD] Failed to load shield:', err);
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

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0 || !fromAccountId) {
      setModalError(t('emergencyFund.depositValidation'));
      return;
    }

    try {
      setIsDepositing(true);
      setModalError('');
      await depositEmergencyFund({
        fromAccountId,
        amount: Number(depositAmount),
        notes: t('emergencyFund.depositNotes')
      });
      setDepositModalOpen(false);
      setDepositAmount('');
      showToast(t('emergencyFund.depositSuccess'));
      window.dispatchEvent(new CustomEvent('finova-data-updated', { detail: { action: 'EMERGENCY_FUND_DEPOSIT' } }));
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      setModalError(err?.response?.data?.message || err.message || 'Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      setIsConfiguring(true);
      setModalError('');
      await updateEmergencyFund({
        targetMonths: Number(targetMonths),
        linkedAccountId: linkedAccountId ? linkedAccountId : null
      });
      setConfigModalOpen(false);
      showToast(t('emergencyFund.updateSuccess'));
      window.dispatchEvent(new CustomEvent('finova-data-updated', { detail: { action: 'EMERGENCY_FUND_UPDATED' } }));
      await loadData();
      if (onUpdate) onUpdate();
    } catch (err) {
      setModalError(err?.response?.data?.message || err.message || 'Config failed');
    } finally {
      setIsConfiguring(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-44 rounded-3xl bg-white/5 border border-white/5 animate-pulse" />
    );
  }

  if (!shield) return null;

  const {
    essentialMonthlyBurn = 0,
    targetAmount = 0,
    currentReserveAmount = 0,
    fundingRatio = 0,
    runwayDurationMonths = 0,
    protectionTier = 'vulnerable',
    burnBreakdown = {},
    linkedAccount
  } = shield;

  const tierColors = {
    fortress: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    solid: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    basic: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    vulnerable: 'text-rose-400 border-rose-500/30 bg-rose-500/10'
  };

  return (
    <div className="relative">
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

      {/* Main Glass Shield Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-[#2B2321]/35 backdrop-blur-[32px] border border-[#8D6346]/35 p-5 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
      >
        {/* Glow Spheres */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#8D6346]/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#B28260]/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Header: Title, Protection Tier, Settings */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#8D6346]/25 border border-[#8D6346]/40 text-[#E8C5A8]">
              {protectionTier === 'vulnerable' ? (
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white drop-shadow-sm">
                  {t('emergencyFund.shieldTitle')}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${tierColors[protectionTier]}`}>
                  {t(`emergencyFund.tier${protectionTier.charAt(0).toUpperCase() + protectionTier.slice(1)}`)}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-0.5">
                {t('emergencyFund.shieldDesc')}
              </p>
            </div>
          </div>

          <button
            onClick={() => setConfigModalOpen(true)}
            aria-label={t('emergencyFund.configureShield')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Gauge & Runway Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-center pb-5 border-b border-white/10">
          {/* Circular Funding Gauge */}
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-black/40"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#8D6346]"
                  strokeDasharray={`${Math.min(100, Math.max(0, fundingRatio))}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="url(#shieldGaugeGrad)"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <defs>
                  <linearGradient id="shieldGaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8D6346" />
                    <stop offset="100%" stopColor="#E8C5A8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-base font-bold text-white tabular-nums">
                  {fundingRatio}%
                </span>
                <span className="text-[9px] text-[#E8C5A8]">
                  {t('emergencyFund.protected')}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs text-white/50 block mb-0.5">
                {t('emergencyFund.protectedReserve')}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-white tabular-nums">
                  {money(currentReserveAmount)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <Lock className="w-3 h-3 text-[#E8C5A8]" />
                <span className="text-[11px] text-[#E8C5A8]">
                  {linkedAccount?.name || t('emergencyFund.vaultPlaceholder')}
                </span>
              </div>
            </div>
          </div>

          {/* Runway Duration Badge */}
          <div className="flex flex-col justify-center sm:border-x sm:border-white/10 sm:px-4">
            <span className="text-xs text-white/50 mb-1 block">
              {t('emergencyFund.runwayMonths', { months: runwayDurationMonths })}
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white tabular-nums">
                {runwayDurationMonths}
              </span>
              <span className="text-xs text-[#E8C5A8]">
                {t('emergencyFund.months')} {t('emergencyFund.coverageBadge')}
              </span>
            </div>
            <div className="w-full bg-black/40 h-2 rounded-full mt-2 overflow-hidden border border-white/5">
              <div
                style={{ width: `${Math.min(100, (runwayDurationMonths / targetMonths) * 100)}%` }}
                className="h-full bg-gradient-to-r from-[#8D6346] to-[#E8C5A8] rounded-full"
              />
            </div>
          </div>

          {/* Essential Burn & Target */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-white/50">{t('emergencyFund.monthlyBurn')}:</span>
              <span className="font-bold text-white tabular-nums">{money(essentialMonthlyBurn)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">{t('emergencyFund.targetReserve')}:</span>
              <span className="font-bold text-[#E8C5A8] tabular-nums">{money(targetAmount)}</span>
            </div>

            {/* Quick deposit action */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setFromAccountId(accounts.find(a => a._id !== linkedAccount?._id)?._id || accounts[0]?._id || '');
                setDepositModalOpen(true);
              }}
              className="mt-3 w-full py-2 px-3 rounded-xl bg-[#8D6346] hover:bg-[#77533A] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(141,99,70,0.3)] transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              {t('emergencyFund.depositQuick')}
            </motion.button>
          </div>
        </div>

        {/* Expandable Burn Breakdown Drawer */}
        <div className="pt-3">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center justify-between w-full text-xs text-white/50 hover:text-white/80 transition-colors"
          >
            <span>{t('emergencyFund.burnBreakdown')}</span>
            {showBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <AnimatePresence>
            {showBreakdown && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs"
              >
                <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] text-white/40 block">{t('emergencyFund.bills')}</span>
                  <span className="font-bold text-white tabular-nums">{money(burnBreakdown.billsMonthly)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] text-white/40 block">{t('emergencyFund.recurring')}</span>
                  <span className="font-bold text-white tabular-nums">{money(burnBreakdown.recurringMonthly)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] text-white/40 block">{t('emergencyFund.installments')}</span>
                  <span className="font-bold text-white tabular-nums">{money(burnBreakdown.installmentsMonthly)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/20 border border-white/5">
                  <span className="text-[10px] text-white/40 block">{t('emergencyFund.baselineDiscretionary')}</span>
                  <span className="font-bold text-white tabular-nums">{money(burnBreakdown.discretionaryBaseline)}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Quick Deposit Modal */}
      {depositModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDepositModalOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md rounded-3xl bg-[#141115] border border-[#8D6346]/40 p-6 shadow-2xl text-white z-10"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#E8C5A8]" />
                <h3 className="font-bold text-base">{t('emergencyFund.depositQuick')}</h3>
              </div>
              <button onClick={() => setDepositModalOpen(false)} className="p-1 rounded-lg text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  {t('emergencyFund.fromAccountLabel')}
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A161A] border border-white/10 text-white text-sm focus:outline-none focus:border-[#8D6346]"
                >
                  <option value="">{t('savingsGoals.selectAccount') || 'Select account...'}</option>
                  {accounts.filter(a => !a.isArchived).map(acc => {
                    const bal = accountBalances.has(acc._id?.toString())
                      ? accountBalances.get(acc._id?.toString())
                      : (acc.balance_adjustment || 0);
                    return (
                      <option key={acc._id} value={acc._id} className="bg-[#1A161A]">
                        {formatAccountName(acc.name, lang)} ({money(bal)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  {t('emergencyFund.depositAmountLabel')}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-base font-bold tabular-nums focus:outline-none focus:border-[#8D6346]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDepositModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isDepositing}
                  className="flex-1 py-2.5 rounded-xl bg-[#8D6346] hover:bg-[#77533A] text-white text-xs font-bold shadow-lg disabled:opacity-50"
                >
                  {isDepositing ? t('emergencyFund.depositing') : t('emergencyFund.confirmDepositBtn')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Configuration Modal */}
      {configModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfigModalOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md rounded-3xl bg-[#141115] border border-[#8D6346]/40 p-6 shadow-2xl text-white z-10"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#E8C5A8]" />
                <h3 className="font-bold text-base">{t('emergencyFund.configureShield')}</h3>
              </div>
              <button 
                onClick={() => setConfigModalOpen(false)} 
                aria-label={t('common.close')}
                className="p-1 rounded-lg text-white/50 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  {t('emergencyFund.targetHorizon')} {t('emergencyFund.targetHorizonSubtitle')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[3, 6, 12].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetMonths(m)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        targetMonths === m
                          ? 'bg-[#8D6346] text-white border-[#8D6346]'
                          : 'bg-white/5 text-white/60 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {m} {t('emergencyFund.months')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  {t('emergencyFund.selectVaultAccount')}
                </label>
                <select
                  value={linkedAccountId}
                  onChange={(e) => setLinkedAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#1A161A] border border-white/10 text-white text-sm focus:outline-none focus:border-[#8D6346]"
                >
                  <option value="">{t('emergencyFund.autoDefaultSavings')}</option>
                  {accounts.filter(a => !a.isArchived).map(acc => {
                    const bal = accountBalances.has(acc._id?.toString())
                      ? accountBalances.get(acc._id?.toString())
                      : (acc.balance_adjustment || 0);
                    return (
                      <option key={acc._id} value={acc._id} className="bg-[#1A161A]">
                        {formatAccountName(acc.name, lang)} ({money(bal)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isConfiguring}
                  className="flex-1 py-2.5 rounded-xl bg-[#8D6346] hover:bg-[#77533A] text-white text-xs font-bold shadow-lg disabled:opacity-50"
                >
                  {isConfiguring ? t('emergencyFund.savingSettings') : t('common.saveChanges')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
