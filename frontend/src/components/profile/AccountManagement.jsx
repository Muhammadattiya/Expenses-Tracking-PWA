import { useState, useEffect } from "react";
import { Plus, Wallet, Pencil, Trash2, X, Star, ArrowLeft, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getAccounts, createAccount, updateAccount, deleteAccount } from "../../api/accounts";
import { getTransactions } from "../../api/transactions";
import { getDebts } from "../../api/debts";
import { getReceivables } from "../../api/receivables";
import { getInvestments, getGoldPrice } from "../../api/investments";
import ConfirmModal from "../modals/ConfirmModal";
import SplashScreen from "../SplashScreen";
import IconPicker, { getIconComponent } from "../IconPicker";
import { useNotification } from "../../contexts/NotificationContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function AccountManagement({ onBack }) {
  const { showToast } = useNotification();
  const { t, lang } = useLanguage();

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [allDebtTransactions, setAllDebtTransactions] = useState([]);
  const [allReceivables, setAllReceivables] = useState([]);
  const [investmentsValue, setInvestmentsValue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Add Account State
  const [addAccountModalOpen, setAddAccountModalOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('cash');
  const [newAccountIcon, setNewAccountIcon] = useState('Wallet');
  const [newAccountColor, setNewAccountColor] = useState('#3b82f6');
  const [newAccountBalance, setNewAccountBalance] = useState('');
  const [newAccountCardLast4, setNewAccountCardLast4] = useState('');
  const [newAccountExcludeFromTotal, setNewAccountExcludeFromTotal] = useState(false);
  const [newAccountIsSavingsAccount, setNewAccountIsSavingsAccount] = useState(false);

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
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [accs, trans, debtsData, receivablesData, investmentsData, goldPriceData] = await Promise.all([
        getAccounts(),
        getTransactions(),
        getDebts().catch(() => ({ debts: [], transactions: [] })),
        getReceivables().catch(() => []),
        getInvestments().catch(() => []),
        getGoldPrice().catch(() => null)
      ]);
      setAccounts(accs);
      setTransactions(trans);
      setAllDebtTransactions(debtsData.transactions || []);
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

  const getAccountBalance = (account) => {
    if (account.type === 'investment') return investmentsValue;
    let balance = account.balance_adjustment || 0;
    transactions.forEach(t => {
      const amt = Number(t.amount) || 0;
      const tAccId = (t.account?._id || t.account)?.toString();
      const tFromId = (t.from_account?._id || t.from_account)?.toString();
      const tToId = (t.to_account?._id || t.to_account)?.toString();
      const accId = account._id?.toString();

      if (t.type === 'income' && tAccId === accId) balance += amt;
      else if (t.type === 'expense' && tAccId === accId) balance -= amt;
      else if (t.type === 'transfer') {
        if (tToId === accId) balance += amt;
        if (tFromId === accId) balance -= amt;
      } else if (t.type === 'settlement' && tAccId === accId) balance += amt;
    });

    allDebtTransactions.forEach(dt => {
      if ((dt.account?._id || dt.account) === account._id) {
        if (dt.type === 'loan') {
          if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') balance += dt.amount; // Borrowed money -> got money
          else balance -= dt.amount; // Lent money -> lost money
        } else if (dt.type === 'repayment') {
          if (dt.debtId?.type === 'i_owe' || dt.debtType === 'i_owe') balance -= dt.amount; // Repaid money -> lost money
          else balance += dt.amount; // Got paid back -> got money
        }
      }
    });

    allReceivables.forEach(r => {
      if ((r.paidFrom?._id || r.paidFrom) === account._id) balance -= r.paidAmount;
      if ((r.receivedTo?._id || r.receivedTo) === account._id) balance += r.receivedAmount;
      if (r.participants) {
        r.participants.forEach(p => {
          if (p.payments) {
            p.payments.forEach(pay => {
              if ((pay.account?._id || pay.account) === account._id) balance += pay.amount;
            });
          }
        });
      }
    });
    
    return balance;
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    try {
      await createAccount({
        name: newAccountName,
        type: newAccountType,
        icon: newAccountIcon,
        color: newAccountColor,
        balance_adjustment: Number(newAccountBalance) || 0,
        cardLast4: newAccountCardLast4,
        excludeFromTotal: newAccountExcludeFromTotal,
        isSavingsAccount: newAccountIsSavingsAccount
      });
      setNewAccountName("");
      setNewAccountBalance("");
      setNewAccountIcon("Wallet");
      setNewAccountColor("#3b82f6");
      setNewAccountCardLast4("");
      setNewAccountExcludeFromTotal(false);
      setNewAccountIsSavingsAccount(false);
      setAddAccountModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error adding account:", error);
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
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingItem(null);
    setEditName('');
    setEditIcon('');
    setEditColor('#3b82f6');
    setEditCardLast4('');
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setIsUpdating(true);
    try {
      const currentBalance = getAccountBalance(editingItem);
      const newBalance = Number(editBalance);
      let newAdjustment = editingItem.balance_adjustment || 0;
      if (!isNaN(newBalance) && newBalance !== currentBalance) {
        newAdjustment += (newBalance - currentBalance);
      }
      await updateAccount(editingItem._id, { 
        name: editName, 
        icon: editIcon, 
        color: editColor, 
        type: editingItem.type, 
        cardLast4: editCardLast4, 
        balance_adjustment: newAdjustment, 
        excludeFromTotal: editExcludeFromTotal, 
        isSavingsAccount: editIsSavingsAccount 
      });
      await fetchData();
      closeEditModal();
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
    } catch (error) {
      console.error("Error deleting item:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <motion.section 
      key="accounts"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="relative z-10 flex flex-col w-full h-full"
    >
      <div className="flex items-center gap-3 mb-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onBack}
          className="w-12 h-12 flex shrink-0 items-center justify-center rounded-[2rem] bg-[rgba(141,99,70,0.4)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[rgba(141,99,70,0.6)] transition-colors"
        >
          <ArrowLeft size={20} className={`text-white/90 ${lang === 'ar' ? 'rotate-180' : ''}`} />
        </motion.button>
        <h3 className="text-xl font-bold flex items-center gap-2 text-white drop-shadow-sm">
          <Wallet className="w-6 h-6 text-[#8D6346]" /> {t('settings.accountsTitle')}
        </h3>
      </div>

      <ul className="flex flex-col gap-4 mb-8">
        {accounts.filter(a => !a.isArchived).map((acc) => {
          const AccIcon = getIconComponent(acc.icon, 'Wallet');
          return (
            <li key={acc._id} className="py-4 px-2 flex items-center justify-between gap-3 group">
              <div className="p-3 rounded-2xl shadow-inner transition-transform group-hover:scale-110" style={{ backgroundColor: `${acc.color || '#3b82f6'}20`, color: acc.color || '#3b82f6', border: `1px solid ${acc.color || '#3b82f6'}30` }}>
                <AccIcon size={22} />
              </div>
              <div className="flex flex-col flex-1">
                <span className="text-white/90 font-bold text-base">{acc.type === 'investment' ? t('settings.investmentsAccount') : acc.name}</span>
                <span className="text-xs text-white/50 capitalize">{acc.type === 'cash' ? t('settings.cash') : acc.type === 'bank' ? t('settings.bank') : acc.type === 'investment' ? t('investments.title') : t('settings.wallet')}</span>
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
                    className={`p-2 transition-colors rounded-xl border ${acc.isDefault ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30 shadow-inner' : 'bg-white/5 border-transparent hover:bg-white/10 text-white/40 hover:text-yellow-500'}`}
                    title={t('settings.setAsDefault')}
                  >
                    <Star size={16} fill={acc.isDefault ? "currentColor" : "none"} />
                  </motion.button>
                  {!acc.isSystemAccount && (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => openEditModal(acc)}
                        className="p-2 bg-white/5 border border-transparent hover:border-white/10 hover:bg-white/10 transition-colors rounded-xl text-white/40 hover:text-white"
                      >
                        <Pencil size={16} />
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteAccount(acc)}
                        className="p-2 bg-red-500/5 border border-transparent hover:bg-red-500/10 hover:border-red-500/20 transition-colors rounded-xl text-red-400/60 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </motion.button>
                    </>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setAddAccountModalOpen(true)}
        className="bg-[#8D6346]/10 border border-[#8D6346]/20 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.1)] w-full py-4 flex items-center justify-center rounded-[24px] text-[#8D6346] hover:bg-[#8D6346]/20 transition-all duration-300 gap-2 mt-2 font-bold"
      >
        <Plus className="w-5 h-5" /> {t('settings.addAccountBtn')}
      </motion.button>

      {/* Edit Modal */}
      {editModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] rounded-[2rem] p-6 w-full max-w-sm flex flex-col gap-4 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold font-['Exo_2'] text-white">
                {t('settings.editAccount')}
              </h3>
              <button onClick={closeEditModal} className="text-white/50 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={submitEdit} className="flex flex-col gap-4 mt-2">
              {editingItem?.isSystemAccount ? (
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
                      <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50" required />
                    </div>
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">{t('settings.balanceLabel')}</label>
                      <input type="number" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-white/50 mb-1.5">{t('settings.cardLast4')}</label>
                      <input type="text" maxLength="4" pattern="\d{4}" value={editCardLast4} onChange={(e) => setEditCardLast4(e.target.value)} placeholder="1234" className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50" />
                    </div>
                    <div className="flex items-end pb-0.5">
                      <label className="flex items-center w-full justify-between gap-2 px-3 py-2.5 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                        <span className="text-[11px] font-medium text-white/90">{t('settings.excludeFromTotal')}</span>
                        <input type="checkbox" checked={editExcludeFromTotal} onChange={(e) => setEditExcludeFromTotal(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
                      </label>
                    </div>
                  </div>
                  <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                    <span className="text-xs font-medium text-white/90">{t('settings.isSavingsAccount')}</span>
                    <input type="checkbox" checked={editIsSavingsAccount} onChange={(e) => setEditIsSavingsAccount(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
                  </label>
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
              <button onClick={() => setAddAccountModalOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.nameLabel')}</label>
                  <input type="text" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50" required />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.accountType')}</label>
                  <select value={newAccountType} onChange={(e) => setNewAccountType(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50 appearance-none">
                    <option value="cash" className="bg-[#2B2321] text-white">{t('settings.cash')}</option>
                    <option value="bank" className="bg-[#2B2321] text-white">{t('settings.bank')}</option>
                    <option value="wallet" className="bg-[#2B2321] text-white">{t('settings.wallet')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.balanceLabel')}</label>
                  <input type="number" value={newAccountBalance} onChange={(e) => setNewAccountBalance(e.target.value)} className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50" required />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">{t('settings.cardLast4')}</label>
                  <input type="text" maxLength="4" pattern="\d{4}" value={newAccountCardLast4} onChange={(e) => setNewAccountCardLast4(e.target.value)} placeholder="1234" className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#8D6346]/50" />
                </div>
              </div>

              <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                <span className="text-xs font-medium text-white/90">{t('settings.excludeFromTotal')}</span>
                <input type="checkbox" checked={newAccountExcludeFromTotal} onChange={(e) => setNewAccountExcludeFromTotal(e.target.checked)} className="w-5 h-5 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
              </label>

              <label className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] cursor-pointer hover:bg-black/30 transition-colors">
                <span className="text-xs font-medium text-white/90">{t('settings.isSavingsAccount')}</span>
                <input type="checkbox" checked={newAccountIsSavingsAccount} onChange={(e) => setNewAccountIsSavingsAccount(e.target.checked)} className="w-5 h-5 rounded border-gray-600 text-[#8D6346] focus:ring-[#8D6346]/50 bg-black/50" />
              </label>

              <div className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-3xl p-2 mt-2">
                <IconPicker type="account" selectedIcon={newAccountIcon} onSelect={setNewAccountIcon} selectedColor={newAccountColor} onColorSelect={setNewAccountColor} colorClass="text-[#8D6346]" />
              </div>

              <motion.button whileTap={{ scale: 0.95 }} type="submit" className="w-full py-3.5 mt-3 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[15px] hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> {t('settings.addAccountBtn')}
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
    </motion.section>
  );
}
