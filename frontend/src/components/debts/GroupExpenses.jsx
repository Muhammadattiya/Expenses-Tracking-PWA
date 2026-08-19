import { useEffect, useState } from 'react';
import { HandCoins, Plus, CheckCircle2, Pencil, Trash2, Users } from 'lucide-react';
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
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const load = async () => {
    try {
      const [receivables, accountList, categoryList] = await Promise.all([getReceivables(), getAccounts(), getCategories()]);
      setItems(receivables);
      setAccounts(accountList);
      setCategories(categoryList.filter(c => c.type === 'expense'));
    } catch {
      setError(t('receivables.loadError', 'تعذر تحميل المبالغ المستحقة.'));
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
      setError(err.response?.data?.message || t('receivables.paymentError', 'تعذر تسجيل السداد.'));
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
      setError(err.response?.data?.message || t('receivables.deleteError', 'تعذر حذف المبلغ المستحق.'));
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
      <section className="relative overflow-hidden p-8 bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2.5rem] flex flex-col justify-center items-center text-center group">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/20 to-purple-900/10 opacity-50 group-hover:opacity-70 transition-opacity duration-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-blue/30 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 w-full">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-brand-blue/20 rounded-2xl border border-brand-blue/30 text-brand-blue">
              <Users size={28} />
            </div>
          </div>
          <p className="text-sm font-medium text-[var(--color-text-muted)] tracking-wider uppercase mb-2">
            {t('debts.totalOwedToMe', 'Total Owed to Me from Groups')}
          </p>
          <h2 className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-white mb-8 drop-shadow-md">
            {money(totalOwedToMe)}
          </h2>

          <div className="flex flex-col md:flex-row justify-center gap-4 w-full max-w-xl mx-auto">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs text-[var(--color-text-muted)] mb-1">{t('debts.totalIPaid', 'Total I Paid')}</span>
              <span className="font-bold text-lg text-white">{money(totalIPaid)}</span>
            </div>
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center">
              <span className="text-xs text-[var(--color-text-muted)] mb-1">{t('debts.totalMyShare', 'Total My Share')}</span>
              <span className="font-bold text-lg text-brand-red">{money(totalMyShare)}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-black/20 backdrop-blur-[40px] border border-white/10 shadow-inner p-4 text-sm text-[var(--color-text-main)] leading-relaxed rounded-2xl flex items-start gap-3">
        <div className="p-2 bg-brand-blue/20 text-brand-blue rounded-lg shrink-0"><Users size={20} /></div>
        <span dangerouslySetInnerHTML={{__html: t('receivables.infoText', 'المبلغ الذي دفعته سيتم خصمه بالكامل، ولكن <strong>نصيبك الفعلي فقط</strong> سيُسجل كمصروف (الفرق بين ما دفعته، ما استلمته، وما على أصدقائك). المدفوعات المستلمة تعتبر تسوية للحساب بدون التأثير على التقارير.')}} />
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t('debts.groupExpensesList', 'Group Expenses')}</h2>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingItem(null); setModalOpen(true); }}
          className="flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-3 font-bold text-white hover:bg-brand-blue/90 transition-colors shadow-lg shadow-brand-blue/20"
        >
          <Plus size={20} /> {t('receivables.addTitle', 'Add Group Expense')}
        </motion.button>
      </div>

      {error && <p className="text-sm text-brand-red bg-brand-red/10 p-3 rounded-xl border border-brand-red/20">{error}</p>}

      {/* Grid */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)] flex flex-col items-center bg-black/20 backdrop-blur-[40px] border border-white/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)] rounded-[2.5rem]">
          <Users size={48} className="mb-4 opacity-50" />
          <p>{t('receivables.noItems', 'No group expenses found')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((item) => {
            const actualShare = item.paidAmount - (item.receivedAmount || 0) - item.participants.reduce((s, p) => s + p.owedAmount, 0);
            return (
              <motion.section 
                key={item._id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.2)] p-6 rounded-[2.5rem] flex flex-col group hover:border-white/20 transition-colors h-full"
              >
                
                <div className="flex justify-between items-start mb-4">
                  <h2 className="font-bold flex gap-2 items-center text-lg text-white">
                    <div className="p-2 bg-brand-blue/20 rounded-xl text-brand-blue">
                      <HandCoins size={20} />
                    </div>
                    {item.title}
                  </h2>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => editItem(item)} className="p-2 text-[var(--color-text-muted)] hover:text-brand-blue transition bg-white/5 rounded-lg"><Pencil size={16}/></button>
                    <button onClick={() => deleteItem(item)} className="p-2 text-[var(--color-text-muted)] hover:text-brand-red transition bg-white/5 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs mb-6">
                  <span className="bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-lg text-[var(--color-text-main)] font-medium">
                    {t('receivables.iPaid', 'دفعت')} {money(item.paidAmount)}
                  </span>
                  {item.receivedAmount > 0 && (
                    <span className="bg-brand-green/10 border border-brand-green/20 px-2.5 py-1.5 rounded-lg text-brand-green font-medium">
                      {t('receivables.iReceived', 'استلمت')} {money(item.receivedAmount)} {t('receivables.immediately', 'فورا')}
                    </span>
                  )}
                  {actualShare > 0 && (
                    <span className="flex items-center gap-1.5 bg-brand-red/10 border border-brand-red/20 px-2.5 py-1.5 rounded-lg text-brand-red font-medium">
                      <span>{t('receivables.myShare', 'نصيبك:')} {money(actualShare)}</span>
                      {item.expenseCategory && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-brand-red/50 mx-0.5"></span>
                          <span className="text-[10px] bg-brand-red/20 px-1.5 py-0.5 rounded">{item.expenseCategory.name}</span>
                        </>
                      )}
                    </span>
                  )}
                </div>

                <div className="mt-auto space-y-4">
                  <h3 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{t('receivables.friendsOwes', 'مستحقات الأصدقاء')}</h3>
                  {item.participants.map((participant) => {
                    const left = participant.owedAmount - participant.paidAmount;
                    const values = payment[participant._id] || {};
                    
                    return (
                      <div key={participant._id} className="border-t border-white/5 pt-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-white">{participant.name}</span>
                            <span className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                              {t('receivables.paidPart', 'المدفوع:')} {money(participant.paidAmount)} / {t('receivables.remainingPart', 'المتبقي:')} <strong className="text-white font-medium">{money(left)}</strong>
                            </span>
                          </div>
                          {left <= 0 && <CheckCircle2 className="text-brand-green" size={20} />}
                        </div>

                        {left > 0 && (
                          <div className="mt-2 flex flex-col gap-2">
                            <div className="flex gap-2">
                              <input 
                                className="w-1/3 bg-black/30 border border-white/5 rounded-xl p-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50" 
                                type="number" 
                                max={left} 
                                placeholder={t('receivables.amount', 'المبلغ')} 
                                value={values.amount || ''} 
                                onChange={(e) => setPayment({ ...payment, [participant._id]: { ...values, amount: e.target.value } })} 
                              />
                              <div className="flex-1">
                                <CustomSelect 
                                  value={values.account || ''} 
                                  onChange={(v) => setPayment({ ...payment, [participant._id]: { ...values, account: v } })} 
                                  options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} 
                                  placeholder={t('receivables.receivingAccount', 'الحساب المستلم')} 
                                />
                              </div>
                            </div>
                            <motion.button 
                              whileTap={{ scale: 0.95 }}
                              onClick={() => pay(item, participant)} 
                              className="w-full rounded-xl bg-brand-green/10 text-brand-green border border-brand-green/20 font-bold py-2 text-sm hover:bg-brand-green/20 transition-colors"
                            >
                              {t('receivables.collect', 'تحصيل المبلغ')}
                            </motion.button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </div>
      )}

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
        title={t('receivables.deleteDebtTitle', 'حذف المبلغ المستحق')}
        message={t('receivables.confirmDelete', 'هل أنت متأكد من حذف هذا المبلغ المستحق؟ سيتم التراجع عن المعاملات المرتبطة به.')}
        confirmText={t('receivables.deleteBtn', 'حذف')}
        cancelText={t('receivables.cancelBtn', 'إلغاء')}
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
