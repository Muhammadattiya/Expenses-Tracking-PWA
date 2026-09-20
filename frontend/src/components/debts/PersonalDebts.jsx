import { useEffect, useState } from 'react';
import { User, Plus, CheckCircle2, Trash2, Edit2, Wallet, ArrowDownRight, ArrowUpRight, Clock, X, PartyPopper, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DebtsSectionSkeleton } from '../ui/Skeletons';
import { getAccounts } from '../../api/accounts';
import { getDebts, createDebt, addDebtTransaction, deleteDebt, updateDebt } from '../../api/debts';
import CustomSelect from '../ui/CustomSelect';
import { useLanguage } from '../../contexts/LanguageContext';
import ConfirmModal from '../modals/ConfirmModal';
import PersonalDebtModal from '../modals/PersonalDebtModal';
import SettlementCelebration from './SettlementCelebration';

export default function PersonalDebts() {
  const { t, lang } = useLanguage();
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(value || 0);
  
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals & Celebrations
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [filter, setFilter] = useState('all');
  const [celebration, setCelebration] = useState({ open: false, title: '', subtitle: '', personName: '' });
  
  // Add Transaction form
  const [activeTxDebt, setActiveTxDebt] = useState(null);
  const [txForm, setTxForm] = useState({ amount: '', type: 'repayment', account: '' });
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    try {
      const [data, accountList] = await Promise.all([getDebts(), getAccounts()]);
      setItems(data.debts);
      setAccounts(accountList);
    } catch {
      setError(t('debts.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSaveDebt = async (data) => {
    await createDebt(data);
    setError('');
    await load();
  };

  const submitTransaction = async (e) => {
    e.preventDefault();
    const amt = Number(txForm.amount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setError(t('debts.validationAmount'));
      return;
    }
    const activeDebtObj = items.find(i => i._id === activeTxDebt);
    if (txForm.type === 'repayment') {
      if (activeDebtObj && amt > activeDebtObj.remainingAmount) {
        setError(t('debts.validationRepaymentExceeds'));
        return;
      }
    }
    const willBeSettled = activeDebtObj && (txForm.type === 'repayment' && amt >= activeDebtObj.remainingAmount);

    setIsSubmittingTx(true);
    try {
      await addDebtTransaction(activeTxDebt, {
        amount: amt,
        type: txForm.type,
        account: txForm.account
      });
      if (willBeSettled) {
        setCelebration({
          open: true,
          title: t('debts.celebrationTitle'),
          subtitle: t('debts.celebrationSubtitle'),
          personName: activeDebtObj.personName
        });
      }
      setActiveTxDebt(null);
      setTxForm({ amount: '', type: 'repayment', account: accounts[0]?._id || '' });
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('debts.saveError'));
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteDebt(itemToDelete._id);
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('debts.deleteError'));
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
  const totalIOwe = items.filter(i => i.type === 'i_owe').reduce((s, i) => s + i.remainingAmount, 0);
  const totalOwedToMe = items.filter(i => i.type === 'owed_to_me').reduce((s, i) => s + i.remainingAmount, 0);

  return (
    <div className="space-y-6">
      
      {/* Hero Metrics (Flattened grid, no nested card wrapper) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {/* I OWE Block */}
        <div className={`flex items-center justify-between p-5 sm:p-6 rounded-[2rem] bg-[#2B2321]/30 backdrop-blur-[32px] border shadow-[0_8px_32px_rgba(0,0,0,0.3)] group transition-all ${
          totalIOwe === 0
            ? 'border-brand-green/35 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_24px_rgba(52,199,89,0.12)]' 
            : 'border-white/10 hover:border-brand-red/30'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-12 h-12 rounded-[16px] border flex items-center justify-center shadow-inner shrink-0 ${
              totalIOwe === 0
                ? 'bg-brand-green/15 border-brand-green/30 text-brand-green' 
                : 'bg-brand-red/10 border-brand-red/20 text-brand-red'
            }`}>
               {totalIOwe === 0 ? (
                 <ShieldCheck className="w-6 h-6 animate-pulse" />
               ) : (
                 <ArrowDownRight className="w-6 h-6" />
               )}
            </div>
            <div>
              <span className="text-xs sm:text-sm font-medium text-white/70 block">{t('debts.iOwe')}</span>
              {totalIOwe === 0 ? (
                <span className="text-[11px] font-semibold text-brand-green flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3" /> {t('debts.debtFree')}
                </span>
              ) : (
                <span className="text-[11px] text-white/40 block mt-0.5">
                  {items.filter(i => i.type === 'i_owe' && i.status !== 'settled').length} {t('debts.active')}
                </span>
              )}
            </div>
          </div>
          <h2 className={`text-2xl sm:text-3xl font-bold font-['Exo_2'] tabular-nums tracking-tight drop-shadow-md ${
            totalIOwe === 0 ? 'text-brand-green' : 'text-white'
          }`}>
            {money(totalIOwe)}
          </h2>
        </div>
        
        {/* OWED TO ME Block */}
        <div className="flex items-center justify-between p-5 sm:p-6 rounded-[2rem] bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] group hover:border-brand-green/30 transition-all">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-[16px] bg-brand-green/10 border border-brand-green/20 flex items-center justify-center shadow-inner shrink-0">
               <ArrowUpRight className="w-6 h-6 text-brand-green" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-medium text-white/70 block">{t('debts.owedToMe')}</span>
              {totalOwedToMe === 0 && items.some(i => i.type === 'owed_to_me') ? (
                <span className="text-[11px] font-semibold text-brand-green flex items-center gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3" /> {t('debts.allCollected')}
                </span>
              ) : (
                <span className="text-[11px] text-white/40 block mt-0.5">
                  {items.filter(i => i.type === 'owed_to_me' && i.status !== 'settled').length} {t('debts.active')}
                </span>
              )}
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-['Exo_2'] tabular-nums tracking-tight text-white drop-shadow-md">
            {money(totalOwedToMe)}
          </h2>
        </div>
      </section>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <h2 className="text-[17px] font-semibold text-white/90">{t('debts.personalDebtsList')}</h2>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Segmented Control Filter */}
          <div className="flex bg-black/20 p-1 rounded-full shadow-inner relative flex-1 sm:flex-none h-11 items-center border border-white/5">
            {['all', 'active', 'settled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 sm:flex-none px-4 h-full min-h-[44px] flex items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-colors relative z-10 capitalize ${filter === f ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                {filter === f && <motion.div layoutId="pdFilter" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                {f === 'all' ? t('debts.all', 'All') : t(`debts.${f}`)}
              </button>
            ))}
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setModalOpen(true)}
            className="h-11 min-h-[44px] flex items-center justify-center gap-2 rounded-full bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 shadow-inner px-5 font-semibold text-sm text-[#E8C5A8] hover:bg-[#8D6346]/30 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus size={18} /> <span>{t('debts.addDebt')}</span>
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
            <Wallet size={32} />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1.5">{t('debts.noDebts')}</h3>
          <p className="text-sm text-white/50 max-w-sm mb-6 leading-relaxed">
            {t('debts.emptyDescription')}
          </p>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setModalOpen(true)}
            className="h-11 min-h-[44px] flex items-center justify-center gap-2 rounded-full bg-[#8D6346]/25 backdrop-blur-[10px] border border-[#8D6346]/40 shadow-inner px-6 font-semibold text-sm text-[#E8C5A8] hover:bg-[#8D6346]/35 transition-colors"
          >
            <Plus size={18} /> <span>{t('debts.addFirstDebt')}</span>
          </motion.button>
        </div>
      ) : (() => {
        const filteredItems = items.filter(item => {
          if (filter === 'all') return true;
          return item.status === filter;
        }).sort((a, b) => {
          if (filter === 'all') {
            if (a.status === 'active' && b.status === 'settled') return -1;
            if (a.status === 'settled' && b.status === 'active') return 1;
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
            const isSettled = item.status === 'settled';
            const isIOwe = item.type === 'i_owe';
            const colorClass = isIOwe ? 'text-brand-red' : 'text-brand-green';
            const bgBadgeClass = isIOwe ? 'bg-brand-red/10 text-brand-red border-brand-red/20' : 'bg-brand-green/10 text-brand-green border-brand-green/20';
            const settledAmount = Math.max(0, item.initialAmount - item.remainingAmount);
            const progressPercent = item.initialAmount > 0 
              ? Math.min(100, Math.round((settledAmount / item.initialAmount) * 100))
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
                } ${activeTxDebt === item._id ? 'ring-1 ring-[#8D6346]/50 shadow-2xl z-10' : ''}`}
              >
                
                {/* Header: Person + Badges + Actions */}
                <div className="flex justify-between items-start mb-5 gap-3">
                  <div className="flex gap-3 items-center min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-[14px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner shrink-0 ${colorClass}`}>
                      <User size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold font-['Exo_2'] text-[17px] text-white truncate" title={item.personName}>{item.personName}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border shadow-inner ${bgBadgeClass}`}>
                          {isIOwe ? t('debts.iOwe') : t('debts.owedToMe')}
                        </span>
                        {isSettled ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-green/15 text-brand-green border border-brand-green/30 flex items-center gap-1 shadow-[0_0_10px_rgba(52,199,89,0.15)] shrink-0">
                            <PartyPopper className="w-3 h-3 text-brand-green" /> {t('debts.settled')}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/30 text-white/70 border border-white/5 flex items-center gap-1 shadow-inner shrink-0">
                            <Clock className="w-3 h-3 text-orange-400" /> {t('debts.active')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      type="button"
                      onClick={() => { setItemToEdit(item); setModalOpen(true); }} 
                      className="w-10 h-10 bg-white/5 hover:bg-white/15 border border-white/5 transition-colors rounded-full flex items-center justify-center text-white/70 hover:text-white active:scale-95 shrink-0" 
                      aria-label={`${t('common.edit')} ${item.personName}`}
                    >
                      <Edit2 size={15}/>
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setItemToDelete(item); setDeleteModalOpen(true); }} 
                      className="w-10 h-10 bg-white/5 hover:bg-white/15 border border-white/5 transition-colors rounded-full flex items-center justify-center text-white/70 hover:text-white active:scale-95 shrink-0" 
                      aria-label={`${t('common.delete')} ${item.personName}`}
                    >
                      <Trash2 size={15}/>
                    </button>
                  </div>
                </div>
                
                {/* Hero Metric Block: Remaining Balance + Settlement Progress */}
                <div className="bg-black/25 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-2xl p-4 mb-6">
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-white/50">{t('debts.remaining')}</span>
                    <span className="text-xs text-white/50 tabular-nums">
                      {t('debts.totalAmount')}: <span className="text-white/85 font-medium">{money(item.initialAmount)}</span>
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold font-['Exo_2'] tabular-nums tracking-tight text-white drop-shadow-sm mb-3">
                    {money(item.remainingAmount)}
                  </div>

                  {/* Visual Progress Track with Liquid Glow */}
                  <div className="pt-2 border-t border-white/5">
                    <div className="flex justify-between text-[11px] text-white/50 mb-1.5 tabular-nums">
                      <span>{t('debts.settlementProgress')}: <span className="text-white/75">{money(settledAmount)}</span></span>
                      <span className="font-medium text-white/70">{progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 relative ${
                          isSettled 
                            ? 'bg-gradient-to-r from-emerald-500 to-brand-green shadow-[0_0_10px_rgba(52,199,89,0.5)]' 
                            : isIOwe 
                              ? 'bg-gradient-to-r from-red-600 to-brand-red shadow-[0_0_8px_rgba(255,59,48,0.4)]' 
                              : 'bg-gradient-to-r from-emerald-600 to-brand-green shadow-[0_0_8px_rgba(52,199,89,0.4)]'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {isSettled && (
                  <div className="mt-auto pt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-brand-green/15 border border-brand-green/30 text-brand-green text-xs font-semibold shadow-[0_0_15px_rgba(52,199,89,0.15)]">
                    <PartyPopper size={16} className="text-brand-green" />
                    <span>{t('debts.settledInFull')}</span>
                  </div>
                )}

                {item.status !== 'settled' && activeTxDebt !== item._id && (
                  <div className="mt-auto flex gap-3">
                    <motion.button 
                      whileTap={{ scale: 0.95 }} 
                      onClick={() => { setActiveTxDebt(item._id); setTxForm(f => ({ ...f, type: 'repayment', account: accounts[0]?._id || '' })); }} 
                      className="flex-1 h-12 min-h-[44px] rounded-full bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-semibold text-sm hover:bg-[#8D6346]/30 transition-colors flex items-center justify-center"
                    >
                      {isIOwe ? t('debts.payDebt') : t('debts.collectDebt')}
                    </motion.button>
                    <motion.button 
                      whileTap={{ scale: 0.95 }} 
                      onClick={() => { setActiveTxDebt(item._id); setTxForm(f => ({ ...f, type: 'loan', account: accounts[0]?._id || '' })); }} 
                      className="flex-1 h-12 min-h-[44px] rounded-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner text-white/90 font-semibold text-sm hover:bg-white/10 transition-colors flex items-center justify-center"
                    >
                      {isIOwe ? t('debts.borrowMore') : t('debts.lendMore')}
                    </motion.button>
                  </div>
                )}

                {activeTxDebt === item._id && (
                  <form onSubmit={submitTransaction} className="mt-auto border-t border-white/10 pt-5 space-y-4 animate-fade-in">
                    <h4 className="text-[15px] font-medium text-white/90">
                      {isIOwe ? t('debts.recordPaymentOrBorrow') : t('debts.recordCollectionOrLend')}
                    </h4>
                    
                    <div className="flex bg-black/20 shadow-inner p-1 rounded-full border border-white/5 h-11 items-center">
                      <button 
                        type="button" 
                        onClick={() => setTxForm({ ...txForm, type: 'repayment' })} 
                        className={`flex-1 h-full min-h-[44px] flex items-center justify-center text-xs sm:text-sm font-semibold rounded-full transition-all ${txForm.type === 'repayment' ? 'bg-[#8D6346]/30 text-white shadow-sm border border-[#8D6346]/40' : 'text-white/50 hover:text-white'}`}
                      >
                        {isIOwe ? t('debts.payDebt') : t('debts.collectDebt')}
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setTxForm({ ...txForm, type: 'loan' })} 
                        className={`flex-1 h-full min-h-[44px] flex items-center justify-center text-xs sm:text-sm font-semibold rounded-full transition-all ${txForm.type === 'loan' ? 'bg-white/20 text-white shadow-sm border border-white/20' : 'text-white/50 hover:text-white'}`}
                      >
                        {isIOwe ? t('debts.borrowMore') : t('debts.lendMore')}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <input 
                          required 
                          id={`pd-amount-${item._id}`}
                          aria-label={t('debts.amount')}
                          disabled={isSubmittingTx}
                          className="w-full bg-black/20 backdrop-blur-[10px] border border-white/10 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#8D6346]/60 focus:ring-1 focus:ring-[#8D6346]/50 focus:shadow-[0_0_12px_rgba(141,99,70,0.25)] transition-all disabled:opacity-50" 
                          type="number" 
                          min="0.01" 
                          step="any"
                          max={txForm.type === 'repayment' ? item.remainingAmount : undefined} 
                          placeholder={t('debts.amount')} 
                          value={txForm.amount} 
                          onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} 
                        />
                        {txForm.type === 'repayment' && (
                          <div className="pt-1.5 space-y-1.5">
                            <p className="text-[11px] text-white/50 px-3 tabular-nums">
                              {t('debts.maxRepaymentHelper')} <span className="text-white/80 font-medium">{money(item.remainingAmount)}</span>
                            </p>
                            {/* Smart Quick Fill Chips */}
                            <div className="flex flex-wrap items-center gap-1.5 px-2">
                              <span className="text-[10px] text-white/40">{t('debts.quickFillFull')}:</span>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                type="button"
                                onClick={() => setTxForm(f => ({ ...f, amount: String(item.remainingAmount) }))}
                                className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-white/10 hover:bg-[#8D6346]/25 border border-white/10 hover:border-[#8D6346]/40 text-white/90 transition-colors flex items-center gap-1"
                                title={t('debts.tapToFill')}
                              >
                                <span>100%</span>
                                <span className="text-white/60">({money(item.remainingAmount)})</span>
                              </motion.button>
                              {item.remainingAmount > 10 && (
                                <motion.button
                                  whileTap={{ scale: 0.95 }}
                                  type="button"
                                  onClick={() => setTxForm(f => ({ ...f, amount: String((item.remainingAmount / 2).toFixed(2)) }))}
                                  className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors"
                                >
                                  50%
                                </motion.button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <CustomSelect 
                        buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-[13px] text-white/90 flex justify-between items-center"
                        value={txForm.account} 
                        onChange={(v) => setTxForm({ ...txForm, account: v })} 
                        options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                        placeholder={t('debts.account')} 
                        disabled={isSubmittingTx}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <motion.button 
                        whileTap={{ scale: 0.95 }} 
                        type="submit" 
                        disabled={isSubmittingTx}
                        className="flex-1 py-3 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-sm hover:bg-[#8D6346]/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSubmittingTx ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true"></span>
                        ) : null}
                        <span>{t('debts.saveTransaction')}</span>
                      </motion.button>
                      <motion.button 
                        whileTap={{ scale: 0.95 }} 
                        type="button" 
                        disabled={isSubmittingTx}
                        onClick={() => setActiveTxDebt(null)} 
                        className="flex-1 py-3 rounded-[30px] bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner text-white/90 font-medium text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                      >
                        {t('debts.cancel')}
                      </motion.button>
                    </div>
                  </form>
                )}
              </motion.section>
            );
          })}
        </div>
        );
      })()}

      {/* Modals */}
      <PersonalDebtModal
        isOpen={modalOpen}
        initialData={itemToEdit}
        onClose={() => { setModalOpen(false); setItemToEdit(null); }}
        onSave={async (data) => {
          if (itemToEdit) {
            await updateDebt(itemToEdit._id, data);
          } else {
            await handleSaveDebt(data);
          }
          await load();
          setModalOpen(false);
          setItemToEdit(null);
        }}
        accounts={accounts}
      />

      <ConfirmModal
        open={deleteModalOpen}
        title={t('debts.deleteDebtTitle')}
        message={t('debts.deleteConfirm')}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      />

      {/* Triumph Settlement Celebration Toast */}
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
