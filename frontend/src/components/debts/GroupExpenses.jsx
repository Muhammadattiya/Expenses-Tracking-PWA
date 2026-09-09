import { useEffect, useState } from 'react';
import { HandCoins, Plus, CheckCircle2, Pencil, Trash2, Users, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListSkeleton } from '../ui/Skeletons';
import { getAccounts } from '../../api/accounts';
import { getCategories } from '../../api/categories';
import { createReceivable, getReceivables, recordPayment, updateReceivable, deleteReceivable } from '../../api/receivables';
import CustomSelect from '../ui/CustomSelect';
import { useLanguage } from '../../contexts/LanguageContext';
import ConfirmModal from '../modals/ConfirmModal';
import GroupExpenseModal from '../modals/GroupExpenseModal';

export default function GroupExpenses() {
  const { t, lang } = useLanguage();
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(value || 0);
  
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [filter, setFilter] = useState('all');
  
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
    try {
      await recordPayment(item._id, participant._id, { amount: Number(values.amount), account: values.account });
      setPayment({ ...payment, [participant._id]: {} });
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('receivables.paymentError'));
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
    if (!itemToDelete) return;
    try {
      await deleteReceivable(itemToDelete._id);
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('receivables.deleteError'));
    } finally {
      setDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in space-y-6">
        <ListSkeleton count={4} />
      </div>
    );
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
      
      {/* Hero Card */}
      <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 md:p-8 rounded-[2rem] flex flex-col justify-center items-center text-center group">
        <div className="relative z-10 w-full flex flex-col items-center">
          <div className="w-12 h-12 rounded-[14px] bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#8D6346] flex items-center justify-center mb-4 shadow-inner">
            <Users size={24} />
          </div>
          
          <p className="text-[15px] font-medium text-white/90 mb-1">
            {t('debts.totalOwedToMe')}
          </p>
          <h2 className="text-3xl md:text-[32px] font-bold font-['Exo_2'] tabular-nums tracking-tight text-white mb-6 drop-shadow-md">
            {money(totalOwedToMe)}
          </h2>

          <div className="w-full max-w-xs space-y-4">
            <div className="flex flex-col items-center">
              <span className="text-[13px] text-white/80 mb-2">{t('debts.totalIPaid')}</span>
              <div className="w-full bg-[#1A261E] border border-brand-green/30 rounded-[30px] py-2.5 flex items-center justify-center shadow-inner">
                <span className="font-medium text-[15px] text-brand-green">{money(totalIPaid)}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-[13px] text-white/80 mb-2">{t('debts.totalMyShare')}</span>
              <div className="w-full bg-[#2A1717] border border-brand-red/30 rounded-[30px] py-2.5 flex items-center justify-center shadow-inner">
                <span className="font-medium text-[15px] text-brand-red">{money(totalMyShare)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-[17px] font-medium text-white/90">{t('debts.groupExpensesList')}</h2>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Segmented Control Filter */}
          <div className="flex bg-black/20 p-1 rounded-full shadow-inner relative flex-1 sm:flex-none">
            {['all', 'active', 'settled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-full text-xs font-bold transition-colors relative z-10 capitalize ${filter === f ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                {filter === f && <motion.div layoutId="geFilter" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                {f === 'all' ? t('debts.all', 'All') : t(`debts.${f}`)}
              </button>
            ))}
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 shadow-inner px-4 py-2 font-medium text-sm text-[#8D6346] hover:bg-[#8D6346]/30 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus size={16} /> <span>{t('receivables.addTitle')}</span>
          </motion.button>
        </div>
      </div>

      {error && <p className="text-sm text-brand-red bg-brand-red/10 p-3 rounded-xl border border-brand-red/20">{error}</p>}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)] flex flex-col items-center bg-black/20 backdrop-blur-[40px] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] rounded-[2.5rem]">
          <Users size={48} className="mb-4 opacity-50" />
          <p>{t('receivables.noItems')}</p>
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
            <div className="text-center py-12 text-white/50 bg-black/20 backdrop-blur-[40px] border border-white/10 rounded-[2.5rem]">
              <p>{t('debts.noItemsFilter', 'No debts found for this filter.')}</p>
            </div>
          );
        }

        return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isSettled = getGroupExpenseStatus(item) === 'settled';
            const actualShare = item.paidAmount - (item.receivedAmount || 0) - item.participants.reduce((s, p) => s + p.owedAmount, 0);
            return (
              <motion.section 
                key={item._id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2rem] flex flex-col group h-full transition-all"
              >
                
                <div className="flex justify-between items-center mb-5">
                  <h2 className="font-semibold font-['Exo_2'] flex gap-3 items-center text-[18px] text-white flex-wrap">
                    <div className="w-8 h-8 rounded-[10px] bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#8D6346] shadow-inner flex items-center justify-center shrink-0">
                      <HandCoins size={16} />
                    </div>
                    <span>{item.title}</span>
                    {isSettled ? (
                      <span className="mx-2 text-[11px] px-2.5 py-0.5 rounded-full bg-black/20 text-white/90 border border-white/5 flex items-center gap-1 shadow-inner">
                        {t('debts.settled')} <CheckCircle2 className="w-3 h-3 text-brand-green" />
                      </span>
                    ) : (
                      <span className="mx-2 text-[11px] px-2.5 py-0.5 rounded-full bg-black/20 text-white/90 border border-white/5 flex items-center gap-1 shadow-inner">
                        {t('debts.active')} <Clock className="w-3 h-3 text-orange-500" />
                      </span>
                    )}
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={() => editItem(item)} className="w-7 h-7 bg-white/10 hover:bg-white/20 transition-colors rounded-full flex items-center justify-center" aria-label="Edit">
                      <Pencil size={12} className="text-white/70" />
                    </button>
                    <button onClick={() => deleteItem(item)} className="w-7 h-7 bg-white/10 hover:bg-white/20 transition-colors rounded-full flex items-center justify-center" aria-label="Delete">
                      <Trash2 size={12} className="text-white/70" />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2.5 mb-8">
                  <span className="w-fit bg-white/10 border border-white/5 px-3 py-1.5 rounded-[30px] text-white/90 text-[13px] font-medium shadow-inner">
                    {t('receivables.iPaid')} {money(item.paidAmount)}
                  </span>
                  {item.receivedAmount > 0 && (
                    <span className="w-fit bg-[#1A261E] border border-brand-green/30 px-3 py-1.5 rounded-[30px] text-brand-green text-[13px] font-medium shadow-inner">
                      {t('receivables.iReceived')} {money(item.receivedAmount)}
                    </span>
                  )}
                  {actualShare > 0 && (
                    <span className="w-fit bg-[#2A1717] border border-brand-red/30 px-3 py-1.5 rounded-[30px] text-brand-red text-[13px] font-medium shadow-inner">
                      {t('receivables.myShare')} {money(actualShare)}
                    </span>
                  )}
                </div>

                <div className="mt-auto">
                  <div className="border-b border-white/20 pb-2 mb-4">
                    <h3 className="text-[15px] font-medium text-white/90">{t('receivables.friendsOwes')}</h3>
                  </div>
                  
                  <div className="space-y-6">
                    {item.participants.map((participant) => {
                      const left = participant.owedAmount - participant.paidAmount;
                      const values = payment[participant._id] || {};
                      
                      return (
                        <div key={participant._id} className="flex flex-col gap-2.5">
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="font-semibold text-white text-[15px]">{participant.name}</span>
                              <span className="text-[12px] text-brand-red mt-0.5">
                                {t('receivables.paidPart')} {money(participant.paidAmount)} / {t('receivables.remainingPart')} {money(left)}
                              </span>
                            </div>
                            {left <= 0 && <div className="w-5 h-5 rounded-full bg-brand-green/20 flex items-center justify-center border border-brand-green/50"><CheckCircle2 className="text-brand-green w-3 h-3" /></div>}
                          </div>

                          {left > 0 && (
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <input 
                                  className="flex-1 min-w-0 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2 text-sm text-white/70 placeholder-white/40 focus:outline-none" 
                                  type="number" 
                                  max={left} 
                                  placeholder={t('receivables.amount')} 
                                  value={values.amount || ''} 
                                  onChange={(e) => setPayment({ ...payment, [participant._id]: { ...values, amount: e.target.value } })} 
                                />
                                <div className="flex-1 min-w-0">
                                  <CustomSelect 
                                    buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-[13px] text-white/70 flex justify-between items-center"
                                    value={values.account || ''} 
                                    onChange={(v) => setPayment({ ...payment, [participant._id]: { ...values, account: v } })} 
                                    options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                                    placeholder={t('receivables.receivingAccount')} 
                                  />
                                </div>
                              </div>
                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={() => pay(item, participant)} 
                                className="w-full rounded-[30px] bg-[rgba(141,99,70,0.15)] backdrop-blur-[10px] border border-[rgba(141,99,70,0.3)] shadow-inner font-medium text-white/90 py-2.5 text-[14px] hover:bg-[rgba(141,99,70,0.25)] transition-colors mt-1"
                              >
                                {t('receivables.collect')}
                              </motion.button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.section>
            );
          })}
        </div>
        );
      })()}

      {/* Disclaimer Box */}
      <div className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[30px] flex items-start gap-4">
        <div className="w-10 h-10 rounded-[10px] bg-[#8D6346]/20 border border-[#8D6346]/30 text-[#8D6346] flex items-center justify-center shrink-0">
          <Users size={18} />
        </div>
        <p className="text-[14px] text-white/80 leading-relaxed font-medium">
          {t('receivables.infoTextPart1')}<strong className="text-white">{t('receivables.infoTextHighlight')}</strong>{t('receivables.infoTextPart2')}
        </p>
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
        title={t('receivables.deleteDebtTitle')}
        message={t('receivables.confirmDelete')}
        confirmText={t('receivables.deleteBtn')}
        cancelText={t('receivables.cancelBtn')}
        confirmColor="red"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalOpen(false);
          setItemToDelete(null);
        }}
      />
    </div>
  );
}
