import { useEffect, useState } from 'react';
import { HandCoins, Plus, CheckCircle2, Pencil, Trash2, Users, Clock, X, PartyPopper, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DebtsSectionSkeleton } from '../ui/Skeletons';
import { getAccounts } from '../../api/accounts';
import { getCategories } from '../../api/categories';
import { createReceivable, getReceivables, recordPayment, updateReceivable, deleteReceivable } from '../../api/receivables';
import CustomSelect from '../ui/CustomSelect';
import { useLanguage } from '../../contexts/LanguageContext';
import ConfirmModal from '../modals/ConfirmModal';
import GroupExpenseModal from '../modals/GroupExpenseModal';
import SettlementCelebration from './SettlementCelebration';

export default function GroupExpenses() {
  const { t, lang } = useLanguage();
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(value || 0);
  
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filter, setFilter] = useState('all');
  const [celebration, setCelebration] = useState({ open: false, title: '', subtitle: '', personName: '' });
  
  const getGroupExpenseStatus = (item) => {
    return item.participants.every(p => (p.owedAmount - p.paidAmount) <= 0) ? 'settled' : 'active';
  };
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const load = async () => {
    try {
      const [receivables, accountList, categoryList] = await Promise.all([getReceivables(), getAccounts(), getCategories()]);
      setItems(receivables);
      setAccounts(accountList);
      setCategories(categoryList.filter(c => c.type === 'expense'));
    } catch {
      setError(t('receivables.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    if (data._id) {
      await updateReceivable(data._id, data);
    } else {
      await createReceivable(data);
    }
    setError('');
    await load();
  };

  const pay = async (item, participant) => {
    const values = payment[participant._id] || {};
    const amt = Number(values.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setError(t('receivables.validationPaymentAmount'));
      return;
    }
    const left = participant.owedAmount - participant.paidAmount;
    if (amt > left) {
      setError(t('receivables.validationPaymentExceeds'));
      return;
    }
    const targetAccount = values.account || accounts[0]?._id;
    if (!targetAccount) {
      setError(t('receivables.validationSelectAccount'));
      return;
    }

    const willBeFriendSettled = amt >= left;
    const otherUnsettled = item.participants.filter(p => p._id !== participant._id && (p.owedAmount - p.paidAmount > 0));
    const willBeBillSettled = willBeFriendSettled && otherUnsettled.length === 0;

    setIsPaying(prev => ({ ...prev, [participant._id]: true }));
    try {
      await recordPayment(item._id, participant._id, { amount: amt, account: targetAccount });
      if (willBeBillSettled) {
        setCelebration({
          open: true,
          title: t('debts.groupCelebrationTitle'),
          subtitle: t('debts.groupCelebrationSubtitle'),
          personName: item.title
        });
      }
      setPayment({ ...payment, [participant._id]: {} });
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('receivables.paymentError'));
    } finally {
      setIsPaying(prev => ({ ...prev, [participant._id]: false }));
    }
  };

  const editItem = (item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const deleteItem = (item) => {
    setItemToDelete(item);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteReceivable(itemToDelete._id);
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('receivables.deleteError'));
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  if (isLoading) {
    return <DebtsSectionSkeleton />;
  }

  // Calculate Totals for Hero Card
  const totalIPaid = items.reduce((sum, item) => sum + (item.paidAmount || 0), 0);
  const totalMyShare = items.reduce((sum, item) => {
    return sum + (item.paidAmount - (item.receivedAmount || 0) - item.participants.reduce((s, p) => s + p.owedAmount, 0));
  }, 0);
  const totalOwedToMe = items.reduce((sum, item) => {
    return sum + item.participants.reduce((s, p) => s + (p.owedAmount - p.paidAmount), 0);
  }, 0);

  return (
    <div className="space-y-6">
      
      {/* Hero Metrics (Flattened grid, no nested card wrapper) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* Main: Owed to Me from Groups */}
        <div className="flex items-center justify-between p-5 sm:p-6 rounded-[2rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group hover:border-brand-green/30 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[16px] bg-brand-green/10 border border-brand-green/20 flex items-center justify-center shadow-inner shrink-0 text-brand-green">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-medium text-white/70 block">{t('debts.totalOwedToMe')}</span>
              {totalOwedToMe === 0 && items.length > 0 ? (
                <span className="text-[11px] font-semibold text-brand-green flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 animate-pulse" /> {t('debts.allGroupSettled')}
                </span>
              ) : (
                <span className="text-[11px] text-white/40 block mt-0.5">
                  {items.filter(i => getGroupExpenseStatus(i) !== 'settled').length} {t('debts.active')}
                </span>
              )}
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-['Exo_2'] tabular-nums tracking-tight text-white drop-shadow-md">
            {money(totalOwedToMe)}
          </h2>
        </div>

        {/* Supporting: Total Paid & My Share */}
        <div className="p-5 sm:p-6 rounded-[2rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex items-center justify-around gap-4">
          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-medium text-white/60 mb-1">{t('debts.totalIPaid')}</span>
            <span className="text-lg sm:text-xl font-bold font-['Exo_2'] text-brand-green tabular-nums tracking-tight">
              {money(totalIPaid)}
            </span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-medium text-white/60 mb-1">{t('debts.totalMyShare')}</span>
            <span className="text-lg sm:text-xl font-bold font-['Exo_2'] text-[#E8C5A8] tabular-nums tracking-tight">
              {money(totalMyShare)}
            </span>
          </div>
        </div>
      </section>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <h2 className="text-[17px] font-semibold text-white/90">{t('debts.groupExpensesList')}</h2>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Segmented Control Filter */}
          <div className="flex bg-black/20 p-1 rounded-full shadow-inner relative flex-1 sm:flex-none h-11 items-center border border-white/5">
            {['all', 'active', 'settled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 sm:flex-none px-4 h-full min-h-[44px] flex items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-colors relative z-10 capitalize ${filter === f ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                {filter === f && <motion.div layoutId="geFilter" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                {f === 'all' ? t('debts.all', 'All') : t(`debts.${f}`)}
              </button>
            ))}
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="h-11 min-h-[44px] flex items-center justify-center gap-2 rounded-full bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 shadow-inner px-5 font-semibold text-sm text-[#E8C5A8] hover:bg-[#8D6346]/30 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus size={18} /> <span>{t('receivables.addTitle')}</span>
          </motion.button>
        </div>
      </div>

      {error && (
        <div role="alert" className="text-sm text-brand-red bg-brand-red/10 p-3.5 rounded-xl border border-brand-red/20 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button 
            type="button" 
            onClick={() => setError('')} 
            aria-label={t('common.close') || 'Close'}
            className="p-1 text-brand-red/70 hover:text-brand-red transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-16 px-6 text-white/70 flex flex-col items-center bg-black/20 backdrop-blur-[32px] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] rounded-[2.5rem] max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#E8C5A8] flex items-center justify-center mb-4 shadow-inner">
            <Users size={32} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1.5">{t('receivables.noItems')}</h3>
          <p className="text-sm text-white/50 max-w-sm mb-6 leading-relaxed">
            {t('debts.emptyGroupDescription')}
          </p>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="h-11 min-h-[44px] flex items-center justify-center gap-2 rounded-full bg-[#8D6346]/25 backdrop-blur-[10px] border border-[#8D6346]/40 shadow-inner px-6 font-semibold text-sm text-[#E8C5A8] hover:bg-[#8D6346]/35 transition-colors"
          >
            <Plus size={18} /> <span>{t('debts.addFirstReceivable')}</span>
          </motion.button>
        </div>
      ) : (() => {
        const filteredItems = items.filter(item => {
          if (filter === 'all') return true;
          return getGroupExpenseStatus(item) === filter;
        }).sort((a, b) => {
          if (filter === 'all') {
            const aStatus = getGroupExpenseStatus(a);
            const bStatus = getGroupExpenseStatus(b);
            if (aStatus === 'active' && bStatus === 'settled') return -1;
            if (aStatus === 'settled' && bStatus === 'active') return 1;
          }
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });

        if (filteredItems.length === 0) {
          return (
            <div className="text-center py-12 px-6 text-white/50 bg-black/20 backdrop-blur-[32px] border border-white/10 rounded-[2.5rem] max-w-lg mx-auto">
              <p className="text-sm">{t('debts.noItemsFilter', 'No debts found for this filter.')}</p>
            </div>
          );
        }

        return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isSettled = getGroupExpenseStatus(item) === 'settled';
            const actualShare = item.paidAmount - (item.receivedAmount || 0) - item.participants.reduce((s, p) => s + p.owedAmount, 0);
            const totalFriendsOwed = item.participants.reduce((s, p) => s + p.owedAmount, 0);
            const totalFriendsPaid = item.participants.reduce((s, p) => s + p.paidAmount, 0);
            const groupProgressPercent = totalFriendsOwed > 0 
              ? Math.min(100, Math.round((totalFriendsPaid / totalFriendsOwed) * 100))
              : 100;
            return (
              <motion.section 
                key={item._id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#2B2321]/30 backdrop-blur-[32px] border shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2rem] flex flex-col group h-full transition-all ${
                  isSettled 
                    ? 'border-brand-green/25 hover:border-brand-green/35 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_20px_rgba(52,199,89,0.08)]' 
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                
                <div className="flex justify-between items-start mb-5 gap-3">
                  <div className="flex gap-3 items-center min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-[10px] bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#8D6346] shadow-inner flex items-center justify-center shrink-0">
                      <HandCoins size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold font-['Exo_2'] text-[18px] text-white truncate max-w-[200px] sm:max-w-xs" title={item.title}>
                          {item.title}
                        </h2>
                        {isSettled ? (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-brand-green/15 text-brand-green border border-brand-green/30 flex items-center gap-1 shadow-[0_0_10px_rgba(52,199,89,0.15)] shrink-0">
                            {t('debts.settled')} <PartyPopper className="w-3 h-3 text-brand-green" />
                          </span>
                        ) : (
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-black/20 text-white/90 border border-white/5 flex items-center gap-1 shadow-inner shrink-0">
                            {t('debts.active')} <Clock className="w-3 h-3 text-orange-500" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      type="button"
                      onClick={() => editItem(item)} 
                      className="w-10 h-10 bg-white/5 hover:bg-white/15 border border-white/5 transition-colors rounded-full flex items-center justify-center text-white/70 hover:text-white active:scale-95 shrink-0" 
                      aria-label={`${t('common.edit')} ${item.title}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button 
                      type="button"
                      onClick={() => deleteItem(item)} 
                      className="w-10 h-10 bg-white/5 hover:bg-white/15 border border-white/5 transition-colors rounded-full flex items-center justify-center text-white/70 hover:text-white active:scale-95 shrink-0" 
                      aria-label={`${t('common.delete')} ${item.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                
                {/* Financial Summary Strip (Cohesive 3-column micro-grid) */}
                <div className="bg-black/25 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-2xl p-4 mb-6">
                  <div className="grid grid-cols-3 gap-2 text-center divide-x divide-white/5 rtl:divide-x-reverse">
                    <div className="flex flex-col">
                      <span className="text-[11px] text-white/50 mb-1">{t('debts.totalBill')}</span>
                      <span className="font-semibold text-xs sm:text-sm text-white font-['Exo_2'] tabular-nums">
                        {money(item.paidAmount)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-white/50 mb-1">{t('debts.collected')}</span>
                      <span className="font-semibold text-xs sm:text-sm text-brand-green font-['Exo_2'] tabular-nums">
                        {money(item.receivedAmount || 0)}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-white/50 mb-1">{t('debts.netShare')}</span>
                      <span className="font-semibold text-xs sm:text-sm text-[#E8C5A8] font-['Exo_2'] tabular-nums">
                        {money(actualShare)}
                      </span>
                    </div>
                  </div>

                  {/* Group Settlement Progress Track with Liquid Glow */}
                  {totalFriendsOwed > 0 && (
                    <div className="mt-3.5 pt-2.5 border-t border-white/5">
                      <div className="flex justify-between text-[11px] text-white/50 mb-1.5 tabular-nums">
                        <span>{t('debts.collected')}: <span className="text-white/80">{money(totalFriendsPaid)}</span> / {money(totalFriendsOwed)}</span>
                        <span className="font-medium text-white/70">{groupProgressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 relative ${
                            isSettled 
                              ? 'bg-gradient-to-r from-emerald-500 to-brand-green shadow-[0_0_10px_rgba(52,199,89,0.5)]' 
                              : 'bg-gradient-to-r from-emerald-600 to-brand-green shadow-[0_0_8px_rgba(52,199,89,0.4)]'
                          }`}
                          style={{ width: `${groupProgressPercent}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Friends Breakdown Section */}
                <div className="mt-auto flex flex-col">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3.5">
                    <h3 className="text-sm font-semibold text-white/90">{t('receivables.friendsOwes')}</h3>
                    <span className="text-xs text-white/50">{item.participants.length}</span>
                  </div>
                  
                  <div className="space-y-3">
                    {item.participants.map((participant) => {
                      const left = participant.owedAmount - participant.paidAmount;
                      const values = payment[participant._id] || {};
                      const isFriendSettled = left <= 0;
                      
                      return (
                        <div key={participant._id} className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-2xl p-3.5 flex flex-col gap-3">
                          <div className="flex justify-between items-center gap-2">
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-semibold text-white text-sm truncate" title={participant.name}>{participant.name}</span>
                              <span className="text-[11px] text-white/50 mt-0.5 tabular-nums">
                                {t('receivables.paidPart')} <span className="text-white/80">{money(participant.paidAmount)}</span> / {money(participant.owedAmount)}
                              </span>
                            </div>
                            {isFriendSettled ? (
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-brand-green/10 text-brand-green border border-brand-green/20 flex items-center gap-1 shadow-inner shrink-0">
                                <CheckCircle2 className="w-3.5 h-3.5" /> {t('debts.settled')}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setPayment({ ...payment, [participant._id]: { ...values, amount: String(left) } })}
                                className="text-xs font-bold text-brand-red font-['Exo_2'] tabular-nums shrink-0 hover:opacity-80 transition-opacity flex items-center gap-1"
                                title={t('receivables.tapToFill')}
                              >
                                <span>{money(left)}</span>
                              </button>
                            )}
                          </div>

                          {!isFriendSettled && (
                            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                              <div className="flex gap-2">
                                <div className="flex-1 min-w-0 relative">
                                  <input 
                                    className="w-full bg-black/30 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-[30px] ps-3.5 pe-14 py-2 text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#8D6346]/60 focus:ring-1 focus:ring-[#8D6346]/50 focus:shadow-[0_0_12px_rgba(141,99,70,0.25)] transition-all disabled:opacity-50" 
                                    type="number" 
                                    min="0.01" 
                                    step="any" 
                                    max={left} 
                                    disabled={isPaying[participant._id]} 
                                    aria-label={`${t('receivables.amountToCollect')} - ${participant.name}`} 
                                    placeholder={t('receivables.amountToCollect')} 
                                    value={values.amount || ''} 
                                    onChange={(e) => setPayment({ ...payment, [participant._id]: { ...values, amount: e.target.value } })} 
                                  />
                                  <motion.button 
                                    whileTap={{ scale: 0.95 }} 
                                    type="button" 
                                    disabled={isPaying[participant._id]} 
                                    onClick={() => setPayment({ ...payment, [participant._id]: { ...values, amount: String(left) } })} 
                                    className="absolute end-1.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 hover:bg-[#8D6346]/30 border border-white/10 text-white/90 transition-colors" 
                                    title={t('receivables.tapToFill')} 
                                  > 
                                    {t('receivables.quickFillFull')} 
                                  </motion.button>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CustomSelect 
                                    buttonClassName="w-full bg-black/30 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-3.5 py-2 text-xs sm:text-[13px] text-white/90 flex justify-between items-center" 
                                    value={values.account || accounts[0]?._id || ''} 
                                    disabled={isPaying[participant._id]} 
                                    onChange={(v) => setPayment({ ...payment, [participant._id]: { ...values, account: v } })} 
                                    options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                                    placeholder={t('receivables.depositAccount')} 
                                  /> 
                                </div>
                              </div>
                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                disabled={isPaying[participant._id]}
                                onClick={() => pay(item, participant)} 
                                className="w-full h-11 min-h-[44px] rounded-full bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 shadow-inner font-semibold text-white text-xs sm:text-sm hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {isPaying[participant._id] ? (
                                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></span>
                                ) : null}
                                <span>{t('receivables.collect')}</span>
                              </motion.button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isSettled && (
                    <div className="mt-4 pt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-full bg-brand-green/15 border border-brand-green/30 text-brand-green text-xs font-semibold shadow-[0_0_15px_rgba(52,199,89,0.15)]">
                      <PartyPopper size={16} className="text-brand-green" />
                      <span>{t('debts.fullySettled')}</span>
                    </div>
                  )}
                </div>
              </motion.section>
            );
          })}
        </div>
        );
      })()}

      {/* How it works info card */}
      <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[30px] flex items-start gap-4">
        <div className="w-10 h-10 rounded-[10px] bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#8D6346] flex items-center justify-center shrink-0">
          <Users size={18} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-white mb-1">
            {t('receivables.howItWorksTitle')}
          </h4>
          <p className="text-[13px] text-white/70 leading-relaxed font-normal">
            {t('receivables.infoTextPart1')}<strong className="text-white/95 font-semibold">{t('receivables.infoTextHighlight')}</strong>{t('receivables.infoTextPart2')}
          </p>
        </div>
      </div>

      {/* Modals */}
      <GroupExpenseModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSave={handleSave} 
        initialData={editingItem} 
        accounts={accounts} 
        categories={categories} 
      />

      <ConfirmModal
        open={deleteModalOpen}
        title={t('receivables.deleteTitle')}
        message={t('receivables.confirmDelete')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      />

      {/* Group Settlement Triumph Celebration Toast */}
      <SettlementCelebration
        open={celebration.open}
        onClose={() => setCelebration({ ...celebration, open: false })}
        title={celebration.title}
        subtitle={celebration.subtitle}
        personName={celebration.personName}
      />
    </div>
  );
}
