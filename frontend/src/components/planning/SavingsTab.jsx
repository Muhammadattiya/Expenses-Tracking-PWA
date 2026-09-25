import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PiggyBank, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ArrowRightLeft, 
  Wallet, 
  Building2, 
  Check, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Settings2, 
  X, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { getAccounts, updateAccount } from '../../api/accounts';
import { getTransactions, createTransaction } from '../../api/transactions';
import { getDebts } from '../../api/debts';
import { getInstallments } from '../../api/installments';
import { getReceivables } from '../../api/receivables';
import { getInvestments, getGoldPrice } from '../../api/investments';
import { calculateAccountBalances } from '../../utils/accountBalances';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { getIconComponent } from '../IconPicker';
import SavingsCashFlowChart from './SavingsCashFlowChart';
import { triggerHaptic } from '../../utils/haptics';
import { 
  formatTransactionTitle, 
  formatAccountName, 
  formatAccountType 
} from '../../utils/transactionFormatters';

export default function SavingsTab() {
  const { t, lang } = useLanguage();
  const { showToast } = useNotification();

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [allDebtTransactions, setAllDebtTransactions] = useState([]);
  const [allInstallmentTransactions, setAllInstallmentTransactions] = useState([]);
  const [allReceivables, setAllReceivables] = useState([]);
  const [investmentsValue, setInvestmentsValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // Modals
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [designateModalOpen, setDesignateModalOpen] = useState(false);
  
  // Deposit form state
  const [depositAmount, setDepositAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositError, setDepositError] = useState('');

  const money = (val) =>
    new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0
    }).format(val || 0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        accs, 
        txs, 
        debtsData, 
        installmentsData, 
        receivablesData, 
        investmentsData, 
        goldPriceData
      ] = await Promise.all([
        getAccounts().catch(() => []),
        getTransactions().catch(() => []),
        getDebts().catch(() => ({ debts: [], transactions: [] })),
        getInstallments().catch(() => ({ installments: [], transactions: [] })),
        getReceivables().catch(() => []),
        getInvestments().catch(() => []),
        getGoldPrice().catch(() => null)
      ]);
      setAccounts(accs || []);
      setTransactions(txs || []);
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

      // Find savings account
      const savingsAccs = (accs || []).filter(a => a.isSavingsAccount && !a.isArchived);
      if (savingsAccs.length > 0) {
        setSelectedAccountId(prev => {
          if (prev && savingsAccs.some(a => a._id === prev)) return prev;
          return savingsAccs[0]._id;
        });
      } else {
        setSelectedAccountId(null);
      }
    } catch (err) {
      console.error('[SAVINGS_TAB] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (depositModalOpen && !isDepositing) setDepositModalOpen(false);
        if (designateModalOpen) setDesignateModalOpen(false);
      }
    };
    if (depositModalOpen || designateModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [depositModalOpen, designateModalOpen, isDepositing]);

  const savingsAccounts = useMemo(() => {
    return accounts.filter(a => a.isSavingsAccount && !a.isArchived);
  }, [accounts]);

  const activeSavingsAccount = useMemo(() => {
    if (!selectedAccountId) return savingsAccounts[0] || null;
    return savingsAccounts.find(a => a._id === selectedAccountId) || savingsAccounts[0] || null;
  }, [savingsAccounts, selectedAccountId]);

  // Compute live balance for all accounts
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

  // Compute live balance for the active savings account
  const liveSavingsBalance = useMemo(() => {
    if (!activeSavingsAccount) return 0;
    const accIdStr = activeSavingsAccount._id.toString();
    return accountBalances.get(accIdStr) ?? (activeSavingsAccount.balance_adjustment || 0);
  }, [activeSavingsAccount, accountBalances]);

  // Compute 6-Month Cash Flow (In vs Out)
  const cashFlowHistory = useMemo(() => {
    if (!activeSavingsAccount) return [];
    const accIdStr = activeSavingsAccount._id.toString();
    const monthsData = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthLabel = d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short' });

      let inflow = 0;
      let outflow = 0;

      transactions.forEach(t => {
        const txDate = new Date(t.date);
        if (txDate.getFullYear() === year && txDate.getMonth() === month) {
          const amt = Number(t.amount) || 0;
          const tAcc = (t.account?._id || t.account)?.toString();
          const tFrom = (t.from_account?._id || t.from_account)?.toString();
          const tTo = (t.to_account?._id || t.to_account)?.toString();

          if (t.type === 'transfer') {
            if (tTo === accIdStr) inflow += amt;
            if (tFrom === accIdStr) outflow += amt;
          } else if (tAcc === accIdStr) {
            if (t.type === 'income' || t.type === 'settlement') inflow += amt;
            else if (t.type === 'expense') outflow += amt;
          }
        }
      });

      monthsData.push({
        monthLabel,
        inflow: Math.round(inflow),
        outflow: Math.round(outflow)
      });
    }

    return monthsData;
  }, [activeSavingsAccount, transactions, lang]);

  // Current calendar month inflow / outflow
  const currentMonthMetrics = useMemo(() => {
    if (!cashFlowHistory || cashFlowHistory.length === 0) return { inflow: 0, outflow: 0, net: 0 };
    const latest = cashFlowHistory[cashFlowHistory.length - 1];
    return {
      inflow: latest.inflow,
      outflow: latest.outflow,
      net: latest.inflow - latest.outflow
    };
  }, [cashFlowHistory]);

  // Recent transactions for this savings account
  const recentSavingsTransactions = useMemo(() => {
    if (!activeSavingsAccount) return [];
    const accIdStr = activeSavingsAccount._id.toString();

    return transactions
      .filter(t => {
        const tAcc = (t.account?._id || t.account)?.toString();
        const tFrom = (t.from_account?._id || t.from_account)?.toString();
        const tTo = (t.to_account?._id || t.to_account)?.toString();
        return tAcc === accIdStr || tFrom === accIdStr || tTo === accIdStr;
      })
      .slice(0, 5);
  }, [activeSavingsAccount, transactions]);

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0 || !fromAccountId) {
      setDepositError(t('emergencyFund.depositValidation') || 'Please select an account and valid amount');
      return;
    }

    if (fromAccountId === activeSavingsAccount?._id) {
      setDepositError(t('planning.savings.sourceAccountDifferent') || (lang === 'ar' ? 'يجب اختيار حساب مصدر مختلف عن حساب الادخار' : 'Source and savings account must be different'));
      return;
    }

    try {
      setIsDepositing(true);
      setDepositError('');
      await createTransaction({
        type: 'transfer',
        amount: Number(depositAmount),
        from_account: fromAccountId,
        to_account: activeSavingsAccount._id,
        date: new Date(),
        title: lang === 'ar' 
          ? `إيداع في حساب الادخار (${activeSavingsAccount.name})` 
          : `Savings Deposit: ${formatAccountName(activeSavingsAccount.name, 'en')}`,
        notes: lang === 'ar' ? 'إيداع مدخرات' : 'Savings Deposit'
      });

      setDepositModalOpen(false);
      setDepositAmount('');
      setFromAccountId('');
      showToast(t('common.saveSuccess') || 'Deposit completed', 'success');
      await loadData();
    } catch (err) {
      console.error('[SAVINGS_DEPOSIT_ERROR]:', err);
      setDepositError(err?.response?.data?.message || err.message || 'Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleDesignateAccount = async (accId) => {
    try {
      await updateAccount(accId, { isSavingsAccount: true });
      showToast(t('common.saveSuccess') || 'Savings account designated', 'success');
      setDesignateModalOpen(false);
      setSelectedAccountId(accId);
      await loadData();
    } catch (err) {
      console.error('[DESIGNATE_SAVINGS_ERROR]:', err);
      showToast(err?.response?.data?.message || 'Failed to designate account', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 rounded-[2.5rem] bg-white/5 border border-white/10" />
        <div className="h-64 rounded-[2rem] bg-white/5 border border-white/10" />
      </div>
    );
  }

  // If no savings account is set
  if (!activeSavingsAccount) {
    return (
      <div className="w-full">
        <div className="relative overflow-hidden rounded-[2.5rem] p-8 bg-black/20 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-[40px] text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-[#8D6346]/20 rounded-full blur-[90px] pointer-events-none" />
          
          <div className="relative z-10 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#E8C5A8] flex items-center justify-center mx-auto mb-4 shadow-inner">
              <PiggyBank size={32} />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              {t('planning.savings.noAccountTitle') || 'No Savings Account Configured'}
            </h3>
            <p className="text-sm text-white/50 mb-6 leading-relaxed">
              {t('planning.savings.noAccountDesc') || 'Designate a savings account to monitor your automated wealth accumulation and liquidity flows.'}
            </p>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setDesignateModalOpen(true)}
              className="px-6 py-3.5 rounded-full bg-[#8D6346]/30 border border-[#8D6346]/50 shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] active:scale-[0.98] text-white font-bold text-sm hover:bg-[#8D6346]/45 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} />
              <span>{t('planning.savings.chooseAccount') || 'Select Savings Account'}</span>
            </motion.button>
          </div>
        </div>

        {/* Modal to pick an existing account to designate as savings */}
        {designateModalOpen && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div 
              role="dialog"
              aria-modal="true"
              aria-labelledby="designate-savings-title"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#1C1817] border border-white/10 rounded-[2rem] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 id="designate-savings-title" className="text-lg font-bold text-white">
                  {t('planning.savings.chooseAccount') || 'Select Savings Account'}
                </h3>
                <button 
                  data-testid="close-designate-modal"
                  onClick={() => setDesignateModalOpen(false)}
                  aria-label={t('common.close')}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/5 text-white/60 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs text-white/50 mb-4">
                {t('planning.savings.chooseAccountDesc')}
              </p>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {accounts.filter(a => !a.isArchived).map(acc => {
                  const AccIcon = getIconComponent(acc.icon, 'Wallet');
                  return (
                    <motion.button
                      key={acc._id}
                      data-testid="designate-account-item"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleDesignateAccount(acc._id)}
                      className="w-full min-h-[44px] flex items-center justify-between p-3.5 rounded-2xl bg-white/5 hover:bg-[#8D6346]/20 border border-white/5 hover:border-[#8D6346]/40 transition-all text-start"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                          style={{ 
                            backgroundColor: `${acc.color || '#8D6346'}20`,
                            borderColor: `${acc.color || '#8D6346'}40`,
                            color: acc.color || '#E8C5A8'
                          }}
                        >
                          <AccIcon size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{formatAccountName(acc.name, lang)}</div>
                          <div className="text-[11px] text-white/40 capitalize">{formatAccountType(acc.type, t)}</div>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-white/40 rtl:rotate-180" />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  const AccIconComponent = getIconComponent(activeSavingsAccount.icon, 'PiggyBank');

  return (
    <div className="w-full space-y-6">
      {/* Multi-account selector if user has more than 1 savings account */}
      {savingsAccounts.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {savingsAccounts.map(acc => (
            <button
              key={acc._id}
              onClick={() => {
                triggerHaptic('selection');
                setSelectedAccountId(acc._id);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeSavingsAccount._id === acc._id
                  ? 'bg-[#8D6346] text-white shadow-md'
                  : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
              }`}
            >
              <span>{formatAccountName(acc.name, lang)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Hero Savings Account Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] p-6 sm:p-8 bg-black/20 border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-[40px] group"
      >
        <div 
          className="absolute -top-16 -end-16 w-56 h-56 rounded-full blur-[80px] pointer-events-none opacity-30"
          style={{ backgroundColor: activeSavingsAccount.color || '#8D6346' }}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="flex items-center gap-3.5">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner"
                style={{ 
                  backgroundColor: `${activeSavingsAccount.color || '#8D6346'}25`,
                  borderColor: `${activeSavingsAccount.color || '#8D6346'}40`,
                  color: activeSavingsAccount.color || '#E8C5A8'
                }}
              >
                <AccIconComponent size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {formatAccountName(activeSavingsAccount.name, lang)}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#8D6346]/20 text-[#E8C5A8] border border-[#8D6346]/40">
                    {t('planning.savings.designatedAccount') || 'Savings Account'}
                  </span>
                </div>
                <div className="text-xs text-white/50 mt-1 flex items-center gap-2">
                  <span className="capitalize">{formatAccountType(activeSavingsAccount.type, t)}</span>
                  {activeSavingsAccount.cardLast4 && (
                    <>
                      <span>•</span>
                      <span>•••• {activeSavingsAccount.cardLast4}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setDesignateModalOpen(true)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors border border-white/5"
              title={t('planning.savings.changeAccount') || 'Change Account'}
            >
              <Settings2 size={16} />
            </motion.button>
          </div>

          {/* Balance Display */}
          <div className="mb-6">
            <div className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1">
              {t('common.balance') || 'Current Balance'}
            </div>
            <div className="text-3xl sm:text-5xl font-black text-white tracking-tight tabular-nums drop-shadow-sm">
              {money(liveSavingsBalance)}
            </div>
          </div>

          {/* Quick Metrics Bar & Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-white/10">
            <div className="grid grid-cols-2 gap-3 flex-1">
              <div className="bg-black/30 border border-white/5 rounded-2xl p-3 flex flex-col">
                <span className="text-[10px] text-white/50 flex items-center gap-1">
                  <TrendingUp size={11} className="text-emerald-400" />
                  {t('planning.savings.totalInflow') || 'This Month In'}
                </span>
                <span className="text-sm font-bold text-emerald-400 tabular-nums mt-0.5">
                  +{money(currentMonthMetrics.inflow)}
                </span>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-2xl p-3 flex flex-col">
                <span className="text-[10px] text-white/50 flex items-center gap-1">
                  <TrendingDown size={11} className="text-rose-400" />
                  {t('planning.savings.totalOutflow') || 'This Month Out'}
                </span>
                <span className="text-sm font-bold text-rose-400 tabular-nums mt-0.5">
                  -{money(currentMonthMetrics.outflow)}
                </span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setDepositModalOpen(true)}
              className="px-5 py-3 rounded-full bg-[#8D6346]/30 border border-[#8D6346]/50 shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] active:scale-[0.98] text-white font-bold text-sm hover:bg-[#8D6346]/45 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <Plus size={16} />
              <span>{t('planning.savings.deposit') || 'Deposit Funds'}</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Cash Flow Movement Chart Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-[2.5rem] p-6 bg-black/20 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-[40px]"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="text-[#8D6346]" size={18} />
              {t('planning.savings.cashFlowTitle') || 'Money In & Out Movement'}
            </h3>
            <p className="text-xs text-white/50 mt-0.5">
              {t('planning.savings.cashFlowSubtitle') || 'Monthly liquidity flow into and out of your savings account'}
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {t('planning.savings.inflow') || 'In'}
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              {t('planning.savings.outflow') || 'Out'}
            </span>
          </div>
        </div>

        <SavingsCashFlowChart data={cashFlowHistory} />
      </motion.div>

      {/* Recent Activity List */}
      {recentSavingsTransactions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white/80 px-1">
            {t('planning.savings.recentActivity') || 'Recent Account Activity'}
          </h4>

          <div className="space-y-2">
            {recentSavingsTransactions.map(tx => {
              const accIdStr = activeSavingsAccount._id.toString();
              const isMoneyIn = (tx.type === 'transfer' && (tx.to_account?._id || tx.to_account)?.toString() === accIdStr) ||
                               (tx.type === 'income' || tx.type === 'settlement');

              return (
                <div 
                  key={tx._id}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isMoneyIn ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {isMoneyIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <div className="font-bold text-white truncate max-w-[200px]">
                        {formatTransactionTitle(tx, lang, t)}
                      </div>
                      <div className="text-[10px] text-white/40">
                        {new Date(tx.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div className={`font-black tabular-nums ${isMoneyIn ? 'text-emerald-400' : 'text-white/80'}`}>
                    {isMoneyIn ? `+${money(tx.amount)}` : `-${money(tx.amount)}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {depositModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="savings-deposit-modal-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[#1C1817] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="savings-deposit-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="text-[#8D6346]" size={20} />
                {t('planning.savings.deposit') || 'Deposit Funds into Savings'}
              </h3>
              <button 
                onClick={() => setDepositModalOpen(false)}
                aria-label={t('common.close')}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/5 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {depositError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{depositError}</span>
              </div>
            )}

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label htmlFor="savings-deposit-source" className="block text-xs font-medium text-white/60 mb-1.5">
                  {t('emergencyFund.fromAccountLabel') || 'Source Account'}
                </label>
                <select
                  id="savings-deposit-source"
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-[#8D6346]"
                  required
                >
                  <option value="">{t('emergencyFund.chooseAccount') || 'Select account...'}</option>
                  {accounts
                    .filter(a => !a.isArchived && a._id !== activeSavingsAccount?._id)
                    .map(a => (
                      <option key={a._id} value={a._id}>
                        {formatAccountName(a.name, lang)} ({formatAccountType(a.type, t)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="savings-deposit-amount" className="block text-xs font-medium text-white/60 mb-1.5">
                  {t('emergencyFund.depositAmountLabel') || 'Amount to Deposit (EGP)'}
                </label>
                <input
                  id="savings-deposit-amount"
                  type="number"
                  min="1"
                  step="any"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white text-sm font-bold tabular-nums focus:outline-none focus:border-[#8D6346]"
                  required
                />
              </div>

              <div className="pt-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isDepositing}
                  className="w-full py-3.5 rounded-full bg-[#8D6346]/30 border border-[#8D6346]/50 shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] active:scale-[0.98] font-semibold text-white hover:bg-[#8D6346]/45 text-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isDepositing ? (t('emergencyFund.depositing') || 'Transferring...') : (t('planning.savings.deposit') || 'Confirm Deposit')}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Designate Savings Account Modal */}
      {designateModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="designate-savings-modal-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[#1C1817] border border-white/10 rounded-[2rem] p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="designate-savings-modal-title" className="text-lg font-bold text-white">
                {t('planning.savings.chooseAccount') || 'Select Savings Account'}
              </h3>
              <button 
                data-testid="close-designate-modal"
                onClick={() => setDesignateModalOpen(false)}
                aria-label={t('common.close')}
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/5 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-white/50 mb-4">
              {t('planning.savings.selectSavingsAccountDesc')}
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {accounts.filter(a => !a.isArchived).map(acc => {
                const AccIcon = getIconComponent(acc.icon, 'Wallet');
                const isCurrent = acc._id === activeSavingsAccount._id;

                return (
                  <motion.button
                    key={acc._id}
                    data-testid="designate-account-item"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDesignateAccount(acc._id)}
                    className={`w-full min-h-[44px] flex items-center justify-between p-3.5 rounded-2xl border transition-all text-start ${
                      isCurrent 
                        ? 'bg-[#8D6346]/20 border-[#8D6346]/60' 
                        : 'bg-white/5 hover:bg-[#8D6346]/10 border-white/5 hover:border-[#8D6346]/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{ 
                          backgroundColor: `${acc.color || '#8D6346'}20`,
                          borderColor: `${acc.color || '#8D6346'}40`,
                          color: acc.color || '#E8C5A8'
                        }}
                      >
                        <AccIcon size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          {formatAccountName(acc.name, lang)}
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" />
                          )}
                        </div>
                        <div className="text-[11px] text-white/40 capitalize">{formatAccountType(acc.type, t)}</div>
                      </div>
                    </div>
                    {isCurrent ? (
                      <Check size={18} className="text-[#34C759]" />
                    ) : (
                      <ChevronRight size={16} className="text-white/40 rtl:rotate-180" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
