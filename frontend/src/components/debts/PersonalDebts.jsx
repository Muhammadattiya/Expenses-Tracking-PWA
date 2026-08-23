import { useEffect, useState } from 'react';
import { User, Plus, CheckCircle2, Trash2, Edit2, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
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
  
  // Add Transaction form
  const [activeTxDebt, setActiveTxDebt] = useState(null);
  const [txForm, setTxForm] = useState({ amount: '', type: 'repayment', account: '' });

  const load = async () => {
    try {
      const [data, accountList] = await Promise.all([getDebts(), getAccounts()]);
      setItems(data.debts);
      setAccounts(accountList);
    } catch {
      setError(t('debts.loadError', 'Could not load debts.'));
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
      setError(err.response?.data?.message || t('debts.saveError', 'Could not save transaction.'));
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDebt(itemToDelete._id);
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('debts.deleteError', 'Could not delete debt.'));
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
      <section className="relative overflow-hidden p-8 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2.5rem] flex flex-col justify-center items-center text-center group">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/10 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-700" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-red/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 w-full flex flex-col md:flex-row gap-6 md:gap-12 justify-center items-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2 text-[var(--color-text-muted)]">
              <ArrowDownRight className="w-5 h-5 text-brand-red" />
              <span className="text-sm font-medium uppercase tracking-wider">{t('debts.iOwe', 'I Owe')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-brand-red drop-shadow-md">
              {money(totalIOwe)}
            </h2>
          </div>
          
          <div className="hidden md:block w-px h-16 bg-white/10"></div>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2 text-[var(--color-text-muted)]">
              <ArrowUpRight className="w-5 h-5 text-brand-green" />
              <span className="text-sm font-medium uppercase tracking-wider">{t('debts.owedToMe', 'Owed To Me')}</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-brand-green drop-shadow-md">
              {money(totalOwedToMe)}
            </h2>
          </div>
        </div>
      </section>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t('debts.personalDebtsList', 'Personal Debts')}</h2>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-3 font-bold text-white hover:bg-brand-blue/90 transition-colors shadow-lg shadow-brand-blue/20"
        >
          <Plus size={20} /> {t('debts.addDebt', 'Add Debt')}
        </motion.button>
      </div>

      {error && <p className="text-sm text-brand-red bg-brand-red/10 p-3 rounded-xl border border-brand-red/20">{error}</p>}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)] flex flex-col items-center bg-black/20 backdrop-blur-[40px] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] rounded-[2.5rem]">
          <Wallet size={48} className="mb-4 opacity-50" />
          <p>{t('debts.noDebts', 'No personal debts found')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((item) => {
            const isIOwe = item.type === 'i_owe';
            const colorClass = isIOwe ? 'text-brand-red' : 'text-brand-green';
            const bgClass = isIOwe ? 'bg-brand-red/10 border-brand-red/10' : 'bg-brand-green/10 border-brand-green/10';
            
            return (
              <motion.section 
                key={item._id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.2)] p-6 rounded-[2.5rem] flex flex-col group hover:border-white/20 transition-colors h-full ${activeTxDebt === item._id ? 'ring-2 ring-brand-blue/30 shadow-2xl z-10' : ''}`}
              >
                
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4 items-center">
                    <div className={`p-3 rounded-2xl border ${bgClass} ${colorClass}`}>
                      <User size={24} />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-white">{item.personName}</h2>
                      <p className={`text-xs font-medium uppercase tracking-wider ${colorClass}`}>
                        {isIOwe ? t('debts.iOwe', 'I Owe') : t('debts.owedToMe', 'Owed To Me')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setItemToEdit(item); setModalOpen(true); }} className="p-2 transition-opacity text-[var(--color-text-muted)] hover:text-brand-blue bg-white/5 rounded-lg">
                      <Edit2 size={16}/>
                    </button>
                    <button onClick={() => { setItemToDelete(item); setDeleteModalOpen(true); }} className="p-2 transition-opacity text-[var(--color-text-muted)] hover:text-brand-red bg-white/5 rounded-lg">
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between items-center bg-black/10 border border-white/5 rounded-xl px-4 py-2.5 mb-4 shadow-inner">
                  <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">{t('debts.totalAmount', 'الإجمالي')}</span>
                  <span className="font-bold text-sm text-white/90">{money(item.initialAmount)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black/10 shadow-inner border border-white/5 rounded-xl p-4 flex flex-col justify-center">
                    <p className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{t('debts.remaining', 'Remaining')}</p>
                    <p className="font-bold text-xl text-white">{money(item.remainingAmount)}</p>
                  </div>
                  <div className="bg-black/10 shadow-inner border border-white/5 rounded-xl p-4 flex flex-col justify-center items-center text-center">
                    {item.status === 'settled' ? (
                      <>
                        <CheckCircle2 size={24} className="text-brand-green mb-1" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-green">{t('debts.settled', 'Settled')}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-yellow mb-2 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-brand-yellow">{t('debts.active', 'Active')}</span>
                      </>
                    )}
                  </div>
                </div>

                {item.status !== 'settled' && activeTxDebt !== item._id && (
                  <div className="mt-auto flex gap-3">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setActiveTxDebt(item._id); setTxForm(f => ({ ...f, type: 'repayment', account: accounts[0]?._id || '' })); }} className="flex-1 py-3 rounded-xl bg-brand-blue/10 text-brand-blue font-bold text-sm hover:bg-brand-blue/20 transition-colors">
                      {t('debts.settle', 'Settle / Repay')}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setActiveTxDebt(item._id); setTxForm(f => ({ ...f, type: 'loan', account: accounts[0]?._id || '' })); }} className="flex-1 py-3 rounded-xl bg-white/5 text-[var(--color-text-main)] font-bold text-sm hover:bg-white/10 hover:text-white transition-colors border border-white/5">
                      {t('debts.loan', 'Add Loan')}
                    </motion.button>
                  </div>
                )}

                {activeTxDebt === item._id && (
                  <form onSubmit={submitTransaction} className="mt-auto border-t border-white/5 pt-4 space-y-4 animate-fade-in">
                    <h3 className="text-sm font-bold text-white">{t('debts.addTransactionTitle', 'Record Payment or Loan')}</h3>
                    
                    <div className="flex bg-black/20 shadow-inner p-1 rounded-xl border border-white/5">
                      <button type="button" onClick={() => setTxForm({ ...txForm, type: 'repayment' })} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${txForm.type === 'repayment' ? 'bg-brand-blue text-white shadow-md' : 'text-white/50 hover:text-white'}`}>
                        {t('debts.repayment', 'Repayment')}
                      </button>
                      <button type="button" onClick={() => setTxForm({ ...txForm, type: 'loan' })} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${txForm.type === 'loan' ? 'bg-white/20 text-white shadow-md' : 'text-white/50 hover:text-white'}`}>
                        {t('debts.loan', 'Add Loan')}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <input 
                        required 
                        className="w-full bg-black/30 border border-white/5 rounded-xl p-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50" 
                        type="number" 
                        min="1" 
                        max={txForm.type === 'repayment' ? item.remainingAmount : undefined} 
                        placeholder={t('debts.amount', 'Amount')} 
                        value={txForm.amount} 
                        onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })} 
                      />
                      <CustomSelect 
                        value={txForm.account} 
                        onChange={(v) => setTxForm({ ...txForm, account: v })} 
                        options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                        placeholder={t('debts.account', 'Account')} 
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <motion.button whileTap={{ scale: 0.95 }} type="submit" className="flex-1 py-2.5 rounded-xl bg-brand-green text-black font-bold text-sm hover:bg-brand-green/90 transition-colors">
                        {t('debts.saveTransaction', 'Save')}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => setActiveTxDebt(null)} className="px-5 py-2.5 rounded-xl bg-white/10 font-bold text-sm text-white hover:bg-white/20 transition-colors">
                        {t('debts.cancel', 'Cancel')}
                      </motion.button>
                    </div>
                  </form>
                )}
              </motion.section>
            );
          })}
        </div>
      )}

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
        title={t('debts.title', 'Debts & Receivables')}
        message={t('debts.deleteConfirm', 'Are you sure you want to delete this debt and all its history?')}
        confirmText={t('receivables.deleteBtn', 'Delete')}
        cancelText={t('receivables.cancelBtn', 'Cancel')}
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
