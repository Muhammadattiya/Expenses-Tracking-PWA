import { useEffect, useState } from 'react';
import { User, Plus, CheckCircle2, Trash2, Edit2, Wallet, ArrowDownRight, ArrowUpRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListSkeleton } from '../ui/Skeletons';
import { getAccounts } from '../../api/accounts';
import { getDebts, createDebt, addDebtTransaction, deleteDebt, updateDebt } from '../../api/debts';
import CustomSelect from '../ui/CustomSelect';
import { useLanguage } from '../../contexts/LanguageContext';
import ConfirmModal from '../modals/ConfirmModal';
import PersonalDebtModal from '../modals/PersonalDebtModal';

export default function PersonalDebts() {
  const { t, lang } = useLanguage();
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(value || 0);
  
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [filter, setFilter] = useState('all');
  
  // Add Transaction form
  const [activeTxDebt, setActiveTxDebt] = useState(null);
  const [txForm, setTxForm] = useState({ amount: '', type: 'repayment', account: '' });

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
    try {
      await addDebtTransaction(activeTxDebt, {
        amount: Number(txForm.amount),
        type: txForm.type,
        account: txForm.account
      });
      setActiveTxDebt(null);
      setTxForm({ amount: '', type: 'repayment', account: accounts[0]?._id || '' });
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('debts.saveError'));
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDebt(itemToDelete._id);
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('debts.deleteError'));
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
  const totalIOwe = items.filter(i => i.type === 'i_owe').reduce((s, i) => s + i.remainingAmount, 0);
  const totalOwedToMe = items.filter(i => i.type === 'owed_to_me').reduce((s, i) => s + i.remainingAmount, 0);

  return (
    <div className="space-y-6">
      
      {/* Hero Card */}
      <section className="bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 md:p-8 rounded-[2rem] flex flex-col justify-center gap-6 group">
        <div className="relative z-10 w-full flex flex-col gap-5 max-w-xs mx-auto">
          {/* I OWE Block */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                 <ArrowDownRight className="w-5 h-5 text-brand-red" />
              </div>
              <span className="text-[14px] font-medium text-white/90">{t('debts.iOwe')}</span>
            </div>
            <h2 className="text-2xl font-bold font-['Exo_2'] tabular-nums tracking-tight text-white drop-shadow-md">
              {money(totalIOwe)}
            </h2>
          </div>
          
          {/* OWED TO ME Block */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                 <ArrowUpRight className="w-5 h-5 text-brand-green" />
              </div>
              <span className="text-[14px] font-medium text-white/90">{t('debts.owedToMe')}</span>
            </div>
            <h2 className="text-2xl font-bold font-['Exo_2'] tabular-nums tracking-tight text-white drop-shadow-md">
              {money(totalOwedToMe)}
            </h2>
          </div>
        </div>
      </section>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-[17px] font-medium text-white/90">{t('debts.personalDebtsList')}</h2>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Segmented Control Filter */}
          <div className="flex bg-black/20 p-1 rounded-full shadow-inner relative flex-1 sm:flex-none">
            {['all', 'active', 'settled'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-bold transition-colors relative z-10 capitalize ${filter === f ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
              >
                {filter === f && <motion.div layoutId="pdFilter" className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] -z-10" />}
                {f === 'all' ? t('debts.all', 'All') : t(`debts.${f}`)}
              </button>
            ))}
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setModalOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-full bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 shadow-inner px-4 py-2 font-medium text-sm text-[#8D6346] hover:bg-[#8D6346]/30 transition-colors whitespace-nowrap"
          >
            <Plus size={16} /> <span>{t('debts.addDebt')}</span>
          </motion.button>
        </div>
      </div>

      {error && <p className="text-sm text-brand-red bg-brand-red/10 p-3 rounded-xl border border-brand-red/20">{error}</p>}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)] flex flex-col items-center bg-black/20 backdrop-blur-[40px] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] rounded-[2.5rem]">
          <Wallet size={48} className="mb-4 opacity-50" />
          <p>{t('debts.noDebts')}</p>
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
            <div className="text-center py-12 text-white/50 bg-black/20 backdrop-blur-[40px] border border-white/10 rounded-[2.5rem]">
              <p>{t('debts.noItemsFilter', 'No debts found for this filter.')}</p>
            </div>
          );
        }

        return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isSettled = item.status === 'settled';
            const isIOwe = item.type === 'i_owe';
            const colorClass = isIOwe ? 'text-brand-red' : 'text-brand-green';
            const bgClass = isIOwe ? 'bg-brand-red/10 border-brand-red/10' : 'bg-brand-green/10 border-brand-green/10';
            
            return (
              <motion.section 
                key={item._id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-[#2B2321]/30 backdrop-blur-[32px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 rounded-[2rem] flex flex-col group h-full transition-all ${activeTxDebt === item._id ? 'ring-1 ring-[#8D6346]/50 shadow-2xl z-10' : ''}`}
              >
                
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4 items-center">
                    <div className={`w-10 h-10 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner ${colorClass}`}>
                      <User size={20} />
                    </div>
                    <div>
                      <h2 className="font-semibold font-['Exo_2'] text-[17px] text-white">{item.personName}</h2>
                      <p className={`text-[12px] font-medium tracking-wide mt-0.5 ${colorClass}`}>
                        {isIOwe ? t('debts.iOwe') : t('debts.owedToMe')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setItemToEdit(item); setModalOpen(true); }} className="w-7 h-7 bg-white/10 hover:bg-white/20 transition-colors rounded-full flex items-center justify-center" aria-label="Edit">
                      <Edit2 size={12}/>
                    </button>
                    <button onClick={() => { setItemToDelete(item); setDeleteModalOpen(true); }} className="w-7 h-7 bg-white/10 hover:bg-white/20 transition-colors rounded-full flex items-center justify-center" aria-label="Delete">
                      <Trash2 size={12}/>
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col gap-4 mb-8">
                  <div className="flex justify-between items-center bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-5 py-3">
                    <span className="text-[13px] text-white/70">{t('debts.totalAmount')}</span>
                    <span className="font-semibold font-['Exo_2'] text-[15px] text-white/90">{money(item.initialAmount)}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-2xl p-4 flex flex-col justify-center">
                      <p className="text-[12px] text-white/50 mb-1.5">{t('debts.remaining')}</p>
                      <p className="font-semibold font-['Exo_2'] text-lg text-white">{money(item.remainingAmount)}</p>
                    </div>
                    <div className="bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-2xl p-4 flex flex-col justify-center">
                      <p className="text-[12px] text-white/50 mb-1.5">{t('debts.status')}</p>
                      {item.status === 'settled' ? (
                        <p className="font-semibold text-[14px] text-white/90 flex items-center gap-1.5">
                          {t('debts.settled')} <CheckCircle2 className={`w-4 h-4 ${colorClass}`} />
                        </p>
                      ) : (
                        <p className="font-semibold text-[14px] text-white/90 flex items-center gap-1.5">
                          {t('debts.active')} <Clock className="w-4 h-4 text-orange-500" />
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {item.status !== 'settled' && activeTxDebt !== item._id && (
                  <div className="mt-auto flex gap-3">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setActiveTxDebt(item._id); setTxForm(f => ({ ...f, type: 'repayment', account: accounts[0]?._id || '' })); }} className="flex-1 py-3 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-[14px] hover:bg-[#8D6346]/30 transition-colors">
                      {t('debts.settle')}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setActiveTxDebt(item._id); setTxForm(f => ({ ...f, type: 'loan', account: accounts[0]?._id || '' })); }} className="flex-1 py-3 rounded-[30px] bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner text-white/90 font-medium text-[14px] hover:bg-white/10 transition-colors">
                      {t('debts.loan')}
                    </motion.button>
                  </div>
                )}

                {activeTxDebt === item._id && (
                  <form onSubmit={submitTransaction} className="mt-auto border-t border-white/10 pt-5 space-y-4 animate-fade-in">
                    <h3 className="text-[15px] font-medium text-white/90">{t('debts.addTransactionTitle')}</h3>
                    
                    <div className="flex bg-black/20 shadow-inner p-1 rounded-[30px] border border-white/5">
                      <button type="button" onClick={() => setTxForm({ ...txForm, type: 'repayment' })} className={`flex-1 py-2 text-[13px] font-medium rounded-[24px] transition-all ${txForm.type === 'repayment' ? 'bg-[#8D6346]/30 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}>
                        {t('debts.repayment')}
                      </button>
                      <button type="button" onClick={() => setTxForm({ ...txForm, type: 'loan' })} className={`flex-1 py-2 text-[13px] font-medium rounded-[24px] transition-all ${txForm.type === 'loan' ? 'bg-white/20 text-white shadow-sm' : 'text-white/50 hover:text-white'}`}>
                        {t('debts.loan')}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <input 
                        required 
                        className="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none" 
                        type="number" 
                        min="1" 
                        max={txForm.type === 'repayment' ? item.remainingAmount : undefined} 
                        placeholder={t('debts.amount')} 
                        value={txForm.amount} 
                        onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} 
                      />
                      <CustomSelect 
                        buttonClassName="w-full bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-[30px] px-4 py-2.5 text-[13px] text-white/90 flex justify-between items-center"
                        value={txForm.account} 
                        onChange={(v) => setTxForm({ ...txForm, account: v })} 
                        options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                        placeholder={t('debts.account')} 
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <motion.button whileTap={{ scale: 0.95 }} type="submit" className="flex-1 py-3 rounded-[30px] bg-[#8D6346]/20 backdrop-blur-[10px] border border-[#8D6346]/30 text-white shadow-inner font-medium text-sm hover:bg-[#8D6346]/30 transition-colors">
                        {t('debts.saveTransaction')}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => setActiveTxDebt(null)} className="flex-1 py-3 rounded-[30px] bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner text-white/90 font-medium text-sm hover:bg-white/10 transition-colors">
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
        title={t('debts.title')}
        message={t('debts.deleteConfirm')}
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
