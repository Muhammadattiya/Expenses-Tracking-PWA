import { useState, useEffect, useMemo } from "react";
import { Plus, Wallet, Pencil, Trash2, X, Star, ArrowLeft, Loader2, ArrowUpDown, Check, GripVertical, Shield, Target } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { getAccounts, createAccount, updateAccount, deleteAccount, reorderAccounts } from "../../api/accounts";
import { getTransactions } from "../../api/transactions";
import { getDebts } from "../../api/debts";
import { getInstallments } from "../../api/installments";
import { getReceivables } from "../../api/receivables";
import { getInvestments, getGoldPrice } from "../../api/investments";
import ConfirmModal from "../modals/ConfirmModal";
import IconPicker, { getIconComponent } from "../IconPicker";
import FinancialShieldWidget from "../emergency/FinancialShieldWidget";
import SavingsGoalsList from "../savings/SavingsGoalsList";
import { useNotification } from "../../contexts/NotificationContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { triggerHaptic } from "../../utils/haptics";

export default function AccountManagement({ onBack }) {
  const { showToast } = useNotification();
  const { t, lang } = useLanguage();

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [allDebtTransactions, setAllDebtTransactions] = useState([]);
  const [allInstallmentTransactions, setAllInstallmentTransactions] = useState([]);
  const [allReceivables, setAllReceivables] = useState([]);
  const [investmentsValue, setInvestmentsValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Add Account State
  const [addAccountModalOpen, setAddAccountModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');
  const [newAccountIcon, setNewAccountIcon] = useState('Wallet');
  const [newAccountColor, setNewAccountColor] = useState('#3b82f6');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountCardLast4, setNewAccountCardLast4] = useState('');
  const [newAccountExcludeFromTotal, setNewAccountExcludeFromTotal] = useState(false);
  const [newAccountIsSavingsAccount, setNewAccountIsSavingsAccount] = useState(false);
  const [newAccountIsEmergencyFund, setNewAccountIsEmergencyFund] = useState(false);

  // Edit Account State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [editCardLast4, setEditCardLast4] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [editExcludeFromTotal, setEditExcludeFromTotal] = useState(false);
  const [editIsSavingsAccount, setEditIsSavingsAccount] = useState(false);
  const [editIsEmergencyFund, setEditIsEmergencyFund] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View Section State ('accounts' | 'savings')
  const [activeSection, setActiveSection] = useState('accounts');

  // Arrange / Reorder State
  const [isArranging, setIsArranging] = useState(false);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const activeAccounts = useMemo(() => accounts.filter(a => !a.isArchived), [accounts]);

  const handleToggleArrange = async () => {
    triggerHaptic('light');
    if (isArranging) {
      if (hasOrderChanged) {
        setIsSavingOrder(true);
        try {
          const orderedIds = activeAccounts.map(a => a._id);
          await reorderAccounts(orderedIds);
          showToast(t('settings.reorderSuccess') || 'Order saved successfully', 'success');
        } catch (error) {
          console.error("Error saving account order:", error);
          showToast(t('settings.reorderError') || 'Failed to save order', 'error');
        } finally {
          setIsSavingOrder(false);
        }
      }
      setIsArranging(false);
      setHasOrderChanged(false);
    } else {
      setIsArranging(true);
      setHasOrderChanged(false);
    }
  };

  const handleReorder = (newActiveAccounts) => {
    setAccounts(prev => {
      const archived = prev.filter(a => a.isArchived);
      return [...newActiveAccounts, ...archived];
    });
    setHasOrderChanged(true);
    triggerHaptic('selection');
  };

  const fetchData = async () => {
    try {
      const [accs, trans, debtsData, installmentsData, receivablesData, investmentsData, goldPriceData] = await Promise.all([
        getAccounts(),
        getTransactions(),
        getDebts().catch(() => ({ debts: [], transactions: [] })),
        getInstallments().catch(() => ({ installments: [], transactions: [] })),
        getReceivables().catch(() => []),
        getInvestments().catch(() => []),
        getGoldPrice().catch(() => null)
      ]);
      setAccounts(accs);
      setTransactions(trans);
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
    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const isInvestmentAccount = (a) => a?.type === 'investment' || a?.name === 'Investments' || a?.name === 'استثمارات';

  const accountBalances = useMemo(() => {
    const balances = new Map();
    accounts.forEach(account => {
      const accId = account._id?.toString();
      if (!accId) return;
      if (isInvestmentAccount(account)) {
        balances.set(accId, investmentsValue);
        return;
      }
      let balance = account.balance_adjustment || 0;
      transactions.forEach(t => {
        const amt = Number(t.amount) || 0;
        const tAccId = (t.account?._id || t.account)?.toString();
        const tFromId = (t.from_account?._id || t.from_account)?.toString();
        const tToId = (t.to_account?._id || t.to_account)?.toString();

        if (t.type === 'income' && tAccId === accId) balance += amt;
        else if (t.type === 'expense' && tAccId === accId) balance -= amt;
        else if (t.type === 'transfer') {
          if (tToId === accId) balance += amt;
          if (tFromId === accId) balance -= amt;
        } else if (t.type === 'settlement' && tAccId === accId) balance += amt;
      });

      allDebtTransactions.forEach(dt => {
        const dtAccId = (dt.account?._id || dt.account)?.toString();
        if (dtAccId === accId) {
          if (dt.type === 'loan') {
            if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') balance += dt.amount;
            else balance -= dt.amount;
          } else if (dt.type === 'repayment') {
            if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') balance -= dt.amount;
            else balance += dt.amount;
          }
        }
      });

      allInstallmentTransactions.forEach(it => {
        const itAccId = (it.account?._id || it.account)?.toString();
        if (itAccId === accId) {
          balance -= (Number(it.amount) || 0);
        }
      });

      allReceivables.forEach(r => {
        const paidFromId = (r.paidFrom?._id || r.paidFrom)?.toString();
        const recToId = (r.receivedTo?._id || r.receivedTo)?.toString();
        if (paidFromId === accId) balance -= r.paidAmount;
        if (recToId === accId) balance += r.receivedAmount;
        if (r.participants) {
          r.participants.forEach(p => {
            if (p.payments) {
              p.payments.forEach(pay => {
                const payAccId = (pay.account?._id || pay.account)?.toString();
                if (payAccId === accId) balance += pay.amount;
              });
            }
          });
        }
      });

      balances.set(accId, balance);
    });
    return balances;
  }, [accounts, transactions, allDebtTransactions, allInstallmentTransactions, allReceivables, investmentsValue]);

  const getAccountBalance = (account) => {
    const accId = account?._id?.toString();
    return accountBalances.get(accId) ?? (account?.balance_adjustment || 0);
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    const trimmed = newAccountName.trim();
    if (!trimmed) {
      showToast(t('settings.nameRequired') || t('profile.nameRequired'), 'error');
      return;
    }
    setIsAdding(true);
    try {
      await createAccount({
        name: trimmed,
        type: newAccountType,
        icon: newAccountIcon,
        color: newAccountColor,
        balance_adjustment: Number(newAccountBalance) || 0,
        cardLast4: newAccountCardLast4,
        excludeFromTotal: newAccountExcludeFromTotal,
        isSavingsAccount: newAccountIsSavingsAccount,
        isEmergencyFund: newAccountIsEmergencyFund
      });
      setNewAccountName("");
      setNewAccountBalance("");
      setNewAccountIcon("Wallet");
      setNewAccountColor("#3b82f6");
      setNewAccountCardLast4("");
      setNewAccountExcludeFromTotal(false);
      setNewAccountIsSavingsAccount(false);
      setNewAccountIsEmergencyFund(false);
      setAddAccountModalOpen(false);
      await fetchData();
      showToast(t('settings.addSuccess'), 'success');
    } catch (error) {
      console.error("Error adding account:", error);
      showToast(error.response?.data?.message || t('settings.addError'), 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const openEditModal = (account) => {
    setEditingItem(account);
    setEditName(account.name);
    setEditIcon(account.icon || 'Wallet');
    setEditColor(account.color || '#3b82f6');
    setEditCardLast4(account.cardLast4 || '');
    setEditBalance(getAccountBalance(account));
    setEditExcludeFromTotal(account.excludeFromTotal || false);
    setEditIsSavingsAccount(account.isSavingsAccount || false);
    setEditIsEmergencyFund(account.isEmergencyFund || false);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingItem(null);
    setEditName('');
    setEditIcon('');
    setEditColor('#3b82f6');
    setEditCardLast4('');
    setEditIsEmergencyFund(false);
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    const trimmed = editName.trim();
    if (!trimmed) {
      showToast(t('settings.nameRequired') || t('profile.nameRequired'), 'error');
      return;
    }
    setIsUpdating(true);
    try {
      const currentBalance = getAccountBalance(editingItem);
      const newBalance = Number(editBalance);
      let newAdjustment = editingItem.balance_adjustment || 0;
      if (!isNaN(newBalance) && newBalance !== currentBalance) {
        newAdjustment += (newBalance - currentBalance);
      }
      await updateAccount(editingItem._id, { 
        name: trimmed, 
        icon: editIcon, 
        color: editColor, 
        type: editingItem.type, 
        cardLast4: editCardLast4, 
        balance_adjustment: newAdjustment, 
        excludeFromTotal: editExcludeFromTotal, 
        isSavingsAccount: editIsSavingsAccount,
        isEmergencyFund: editIsEmergencyFund
      });
      await fetchData();
      closeEditModal();
      showToast(t('settings.editSuccess'), 'success');
    } catch (error) {
      showToast(error.response?.data?.message || t('settings.editError'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = (account) => {
    setSelectedAccount(account);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount(selectedAccount._id);
      await fetchData();
      setDeleteModalOpen(false);
      setSelectedAccount(null);
      showToast(t('settings.deleteSuccess'), 'success');
    } catch (error) {
      console.error("Error deleting item:", error);
      showToast(error.response?.data?.message || t('settings.deleteError'), 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#8D6346]/20 border border-[#8D6346]/30 flex items-center justify-center shadow-inner">
          <Loader2 className="w-7 h-7 text-[#8D6346] animate-spin" />
        </div>
        <span className="text-white/60 text-sm font-medium">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <section className="relative z-10 flex flex-col w-full h-full">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            aria-label={t('common.back')}
            className="w-12 h-12 flex shrink-0 items-center justify-center rounded-[2rem] bg-[#8D6346]/40 backdrop-blur-[32px] border border-white/10 border-t-white/30 border-s-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[#8D6346]/60 transition-colors"
          >
            <ArrowLeft size={20} className="text-white/90 rtl:rotate-180" />
          </motion.button>
          <h3 className="text-xl font-bold flex items-center gap-2 text-white drop-shadow-sm">
            {activeSection === 'accounts' ? (
              <>
                <Wallet className="w-6 h-6 text-[#8D6346]" /> {t('settings.accountsTitle')}
              </>
            ) : (
              <>
                <Target className="w-6 h-6 text-[#8D6346]" /> {t('savingsGoals.title') || 'أهداف الادخار الذكية'}
              </>
            )}
          </h3>
        </div>

        {activeSection === 'accounts' && activeAccounts.length > 1 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleToggleArrange}
            disabled={isSavingOrder}
            className={`px-3.5 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold transition-all ${
              isArranging
                ? 'bg-[#8D6346] text-white shadow-[0_4px_16px_rgba(141,99,70,0.4)]'
                : 'bg-[#8D6346]/20 text-[#E8C5A8] border border-[#8D6346]/30 hover:bg-[#8D6346]/30'
            }`}
          >
            {isSavingOrder ? (
              <Loader2 size={15} className="animate-spin text-white" />
            ) : isArranging ? (
              <>
                <Check size={15} />
                <span>{t('settings.doneArranging')}</span>
              </>
            ) : (
              <>
                <ArrowUpDown size={15} />
                <span>{t('settings.arrange')}</span>
              </>
            )}
          </motion.button>
        )}
      </div>

      {/* Segmented Control Tabs */}
      <div className="flex justify-center mb-6">
        <div 
          role="tablist"
          className="flex p-1 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full h-12 items-center w-full max-w-md"
        >
          {[
            { id: 'accounts', label: t('settings.accountsTitle') || 'الحسابات والمحافظ', icon: Wallet },
            { id: 'savings', label: t('savingsGoals.title') || 'أهداف الادخار', icon: Target }
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isSelected = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-section-${tab.id}`}
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  triggerHaptic('selection');
                  setActiveSection(tab.id);
                }}
                className={`relative flex-1 px-4 h-full min-h-[44px] flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold rounded-full transition-colors duration-300 z-10 ${
                  isSelected ? 'text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="accountManagementTab"
                    className="absolute inset-0 bg-[#8D6346]/30 border border-[#8D6346]/40 rounded-full shadow-sm"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <TabIcon size={16} className="relative z-10" />
                <span className="relative z-10 truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSection === 'savings' ? (
          <motion.div
            key="savings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          >
            <SavingsGoalsList onDataChange={fetchData} />
          </motion.div>
        ) : (
          <motion.div
            key="accounts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="flex flex-col"
          >
            <div className="mb-6">
              <FinancialShieldWidget onUpdate={fetchData} />
            </div>

            {isArranging ? (
              <Reorder.Group
                axis="y"
                values={activeAccounts}
                onReorder={handleReorder}
                className="flex flex-col gap-3 mb-8"
              >
                {activeAccounts.map((acc) => {
                  const AccIcon = getIconComponent(acc.icon, 'Wallet');
                  return (
                    <Reorder.Item
                      key={acc._id}
                      value={acc}
                      className="py-3.5 px-3 flex items-center justify-between gap-3 bg-[#8D6346]/10 border border-[#8D6346]/30 rounded-2xl shadow-md select-none touch-none cursor-grab active:cursor-grabbing group"
                      whileDrag={{ scale: 1.02, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2.5 rounded-xl shadow-inner transition-transform group-hover:scale-105" style={{ backgroundColor: `${acc.color || '#3b82f6'}20`, color: acc.color || '#3b82f6', border: `1px solid ${acc.color || '#3b82f6'}30` }}>
                          <AccIcon size={20} />
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="text-white/90 font-bold text-sm truncate">{isInvestmentAccount(acc) ? t('settings.investmentsAccount') : acc.name}</span>
                          <span className="text-[11px] text-white/50 capitalize truncate">{acc.type === 'cash' ? t('settings.cash') : acc.type === 'bank' ? t('settings.bank') : isInvestmentAccount(acc) ? t('investments.title') : t('settings.wallet')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/20 border border-white/5">
                          <span className="font-bold text-[#8D6346] tabular-nums tracking-tight text-sm">{getAccountBalance(acc).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                          <span className="text-[10px] text-[#8D6346]/80 font-bold">{t('settings.egp')}</span>
                        </div>
                        <div className="p-1.5 text-[#E8C5A8] opacity-80 group-hover:opacity-100 transition-opacity">
                          <GripVertical size={20} />
                        </div>
                      </div>
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            ) : (
              <ul className="flex flex-col gap-4 mb-8">
                {activeAccounts.map((acc) => {
                  const AccIcon = getIconComponent(acc.icon, 'Wallet');
                  return (
                    <li key={acc._id} className="py-4 px-2 flex items-center justify-between gap-3 group">
                      <div className="p-3 rounded-2xl shadow-inner transition-transform group-hover:scale-110" style={{ backgroundColor: `${acc.color || '#3b82f6'}20`, color: acc.color || '#3b82f6', border: `1px solid ${acc.color || '#3b82f6'}30` }}>
                        <AccIcon size={22} />
                      </div>
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white/90 font-bold text-base">{isInvestmentAccount(acc) ? t('settings.investmentsAccount') : acc.name}</span>
                          {acc.isEmergencyFund && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Shield size={10} />
                              {t('emergencyFund.shieldTitle')}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-white/50 capitalize">{acc.type === 'cash' ? t('settings.cash') : acc.type === 'bank' ? t('settings.bank') : isInvestmentAccount(acc) ? t('investments.title') : t('settings.wallet')}</span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#8D6346]/10 border border-[#8D6346]/20 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)]">
                          <span className="font-black text-[#8D6346] tabular-nums tracking-tight text-lg drop-shadow-sm">{getAccountBalance(acc).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                          <span className="text-xs text-[#8D6346]/80 font-bold">{t('settings.egp')}</span>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={async () => {
                              if (acc.isDefault) return;
                              try {
                                await updateAccount(acc._id, { isDefault: true });
                                fetchData();
                              } catch (e) {
                                showToast(t('settings.updateError'), 'error');
                              }
                            }}
                            aria-label={t('settings.setAsDefault')}
                            className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors rounded-xl border ${acc.isDefault ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 shadow-inner' : 'bg-white/5 border-transparent hover:bg-white/10 text-white/40 hover:text-yellow-500'}`}
                            title={t('settings.setAsDefault')}
                          >
                            <Star size={18} fill={acc.isDefault ? "currentColor" : "none"} />
                          </motion.button>
                          {!acc.isSystemAccount && !isInvestmentAccount(acc) && (
                            <>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => openEditModal(acc)}
                                aria-label={t('common.edit')}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 transition-colors rounded-xl text-white/40 hover:text-white"
                              >
                                <Pencil size={18} />
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteAccount(acc)}
                                aria-label={t('common.delete')}
                                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-red-500/5 border border-transparent hover:bg-red-500/10 hover:border-red-500/20 transition-colors rounded-xl text-red-400/60 hover:text-red-400"
                              >
                                <Trash2 size={18} />
                              </motion.button>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {activeAccounts.length === 0 && (
                  <div className="py-16 flex flex-col items-center justify-center text-center opacity-70 bg-white/5 rounded-[2rem] border border-white/5 p-6">
                    <Wallet size={40} className="mb-4 text-[#8D6346]/60" />
                    <p className="text-white/80 font-bold text-base mb-1">{t('settings.noAccounts')}</p>
                  </div>
                )}
              </ul>
            )}

            {!isArranging && (
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setAddAccountModalOpen(true)}
                className="bg-[#8D6346]/10 border border-[#8D6346]/20 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] w-full py-4 flex items-center justify-center rounded-[24px] text-[#8D6346] hover:bg-[#8D6346]/20 transition-all duration-300 gap-2 mt-2 font-bold min-h-[48px]"
              >
                <Plus className="w-5 h-5" /> {t('settings.addAccountBtn')}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      {editModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 w-full max-w-sm flex flex-col gap-4 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold font-['Exo_2'] text-white">
                {t('settings.editAccount')}
              </h3>
              <button onClick={closeEditModal} disabled={isUpdating} aria-label={t('common.close')} className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/50 hover:text-white transition-colors disabled:opacity-50">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={submitEdit} className="flex flex-col gap-4 mt-2">
              {(editingItem?.isSystemAccount || isInvestmentAccount(editingItem)) ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-white/50">{t('settings.systemAccountNotice')}</p>
                  <label className="flex items-center w-full justify-between gap-2 px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                    <span className="text-sm font-medium text-white/90">{t('settings.excludeFromTotal')}</span>
                    <input type="checkbox" checked={editExcludeFromTotal} onChange={(e) => setEditExcludeFromTotal(e.target.checked)} className="w-5 h-5 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
                  </label>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">{t('settings.nameLabel')}</label>
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-base text-white focus:outline-none focus:border-[#8D6346]/50" required />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">{t('settings.balanceLabel')}</label>
                      <input type="number" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-base text-white focus:outline-none focus:border-[#8D6346]/50" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">{t('settings.cardLast4')}</label>
                      <input type="text" maxLength="4" pattern="\d{4}" value={editCardLast4} onChange={(e) => setEditCardLast4(e.target.value)} placeholder="1234" className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-base text-white focus:outline-none focus:border-[#8D6346]/50" />
                    </div>
                    <div className="flex items-end pb-0.5">
                      <label className="flex items-center w-full justify-between gap-2 px-3 py-2.5 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                        <span className="text-[11px] font-medium text-white/90">{t('settings.excludeFromTotal')}</span>
                        <input type="checkbox" checked={editExcludeFromTotal} onChange={(e) => setEditExcludeFromTotal(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
                      </label>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                      <span className="text-xs font-medium text-white/90">{t('settings.isSavingsAccount')}</span>
                      <input type="checkbox" checked={editIsSavingsAccount} onChange={(e) => setEditIsSavingsAccount(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
                    </label>
                    <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                      <span className="text-xs font-medium text-white/90">{t('emergencyFund.isEmergencyFundAccount')}</span>
                      <input type="checkbox" checked={editIsEmergencyFund} onChange={(e) => setEditIsEmergencyFund(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
                    </label>
                  </div>
                </>
              )}

              {!editingItem?.isSystemAccount && (
                <div className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-3xl p-2">
                  <IconPicker
                    type="account"
                    selectedIcon={editIcon}
                    onSelect={setEditIcon}
                    selectedColor={editColor}
                    onColorSelect={setEditColor}
                    colorClass="text-[#8D6346]"
                  />
                </div>
              )}

              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={isUpdating}
                className="w-full py-3.5 mt-2 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[15px] hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2"
              >
                {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : t('settings.saveChanges')}
              </motion.button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {addAccountModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 w-full max-w-sm flex flex-col max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold font-['Exo_2'] text-white">
                {t('settings.addAccountBtn')}
              </h3>
              <button onClick={() => { if (!isAdding) setAddAccountModalOpen(false); }} disabled={isAdding} aria-label={t('common.close')} className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-white/50 hover:text-white transition-colors disabled:opacity-50">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.nameLabel')}</label>
                  <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-base text-white focus:outline-none focus:border-[#8D6346]/50" required />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.accountType')}</label>
                  <select value={newAccountType} onChange={(e) => setNewAccountType(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-base text-white focus:outline-none focus:border-[#8D6346]/50 appearance-none">
                    <option value="cash" className="bg-[#2B2321] text-white">{t('settings.cash')}</option>
                    <option value="bank" className="bg-[#2B2321] text-white">{t('settings.bank')}</option>
                    <option value="wallet" className="bg-[#2B2321] text-white">{t('settings.wallet')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.balanceLabel')}</label>
                  <input type="number" value={newAccountBalance} onChange={(e) => setNewAccountBalance(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-base text-white focus:outline-none focus:border-[#8D6346]/50" required />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.cardLast4')}</label>
                  <input type="text" maxLength="4" pattern="\d{4}" value={newAccountCardLast4} onChange={(e) => setNewAccountCardLast4(e.target.value)} placeholder="1234" className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-base text-white focus:outline-none focus:border-[#8D6346]/50" />
                </div>
              </div>

              <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                <span className="text-xs font-medium text-white/90">{t('settings.excludeFromTotal')}</span>
                <input type="checkbox" checked={newAccountExcludeFromTotal} onChange={(e) => setNewAccountExcludeFromTotal(e.target.checked)} className="w-5 h-5 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                  <span className="text-xs font-medium text-white/90">{t('settings.isSavingsAccount')}</span>
                  <input type="checkbox" checked={newAccountIsSavingsAccount} onChange={(e) => setNewAccountIsSavingsAccount(e.target.checked)} className="w-5 h-5 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
                </label>
                <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                  <span className="text-xs font-medium text-white/90">{t('emergencyFund.isEmergencyFundAccount')}</span>
                  <input type="checkbox" checked={newAccountIsEmergencyFund} onChange={(e) => setNewAccountIsEmergencyFund(e.target.checked)} className="w-5 h-5 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
                </label>
              </div>

              <div className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-3xl p-2 mt-2">
                <IconPicker type="account" selectedIcon={newAccountIcon} onSelect={setNewAccountIcon} selectedColor={newAccountColor} onColorSelect={setNewAccountColor} colorClass="text-[#8D6346]" />
              </div>

              <motion.button whileTap={{ scale: 0.95 }} type="submit" disabled={isAdding} className="w-full py-3.5 mt-3 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[15px] hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2">
                {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : (<><Plus className="w-5 h-5" /> {t('settings.addAccountBtn')}</>)}
              </motion.button>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        open={deleteModalOpen}
        title={t('settings.deleteAccountTitle')}
        message={`${t('settings.deleteAccountConfirm')} "${selectedAccount?.name}"?`}
        confirmText={isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('settings.deleteBtn')}
        cancelText={t('settings.cancelBtn')}
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => {
          if (isDeleting) return;
          setDeleteModalOpen(false);
          setSelectedAccount(null);
        }}
      />
    </section>
  );
}
