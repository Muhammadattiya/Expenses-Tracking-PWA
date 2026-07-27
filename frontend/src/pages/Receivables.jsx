import { useEffect, useState, useMemo } from 'react';
import { HandCoins, Plus, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { ListSkeleton } from '../components/ui/Skeletons';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { createReceivable, getReceivables, recordPayment, updateReceivable, deleteReceivable } from '../api/receivables';
import CustomSelect from '../components/ui/CustomSelect';
import { useLanguage } from '../contexts/LanguageContext';
import ConfirmModal from '../components/modals/ConfirmModal';

export default function Receivables() {
  const { t, lang } = useLanguage();
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(value || 0);
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ _id: null, title: '', paidAmount: '', paidFrom: '', receivedAmount: '', receivedTo: '', expenseCategory: '', participants: [{ name: '', owedAmount: '' }] });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const load = async () => {
    try {
      const [receivables, accountList, categoryList] = await Promise.all([getReceivables(), getAccounts(), getCategories()]);
      setItems(receivables);
      setAccounts(accountList);
      
      const expenseCats = categoryList.filter(c => c.type === 'expense');
      setCategories(expenseCats);
      
      setForm((value) => ({ ...value, paidFrom: value.paidFrom || accountList[0]?._id || '', receivedTo: value.receivedTo || '', expenseCategory: value.expenseCategory || expenseCats[0]?._id || '' }));
    } catch {
      setError(t('receivables.loadError', 'تعذر تحميل المبالغ المستحقة.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addParticipant = () => setForm({ ...form, participants: [...form.participants, { name: '', owedAmount: '' }] });
  const removeParticipant = (index) => setForm({ ...form, participants: form.participants.filter((_, i) => i !== index) });

  const netExpense = Math.max(0, (Number(form.paidAmount) || 0) - (Number(form.receivedAmount) || 0) - form.participants.reduce((sum, p) => sum + (Number(p.owedAmount) || 0), 0));

  const submit = async (event) => {
    event.preventDefault();
    try {
      const data = {
        ...form,
        paidAmount: Number(form.paidAmount),
        receivedAmount: Number(form.receivedAmount) || 0,
        participants: form.participants.map((p) => ({ ...p, owedAmount: Number(p.owedAmount) }))
      };
      
      if (form._id) {
        await updateReceivable(form._id, data);
      } else {
        await createReceivable(data);
      }
      
      setForm({ _id: null, title: '', paidAmount: '', paidFrom: accounts[0]?._id || '', receivedAmount: '', receivedTo: '', expenseCategory: categories[0]?._id || '', participants: [{ name: '', owedAmount: '' }] });
      setError('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('receivables.saveError', 'تعذر حفظ المبلغ المستحق.'));
    }
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
    setForm({
      _id: item._id,
      title: item.title,
      paidAmount: item.paidAmount,
      paidFrom: item.paidFrom?._id || '',
      receivedAmount: item.receivedAmount || '',
      receivedTo: item.receivedTo?._id || '',
      expenseCategory: item.expenseCategory?._id || categories[0]?._id || '',
      participants: item.participants.map(p => ({ _id: p._id, name: p.name, owedAmount: p.owedAmount }))
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      <div className="animate-fade-in p-4 space-y-6">
        <ListSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="p-4 pt-8 animate-fade-in space-y-6">
      <header>
        <p className="text-brand-blue text-sm">{t('receivables.headerNotice', 'تسديدات الأصدقاء لا تُحتسب كدخل')}</p>
        <h1 className="text-2xl font-bold">{t('receivables.title', 'المبالغ المستحقة')}</h1>
      </header>
      
      <p className="glass-panel border-brand-blue/30 bg-brand-blue/10 p-4 text-sm text-[var(--color-text-main)] leading-relaxed rounded-[2rem]" dangerouslySetInnerHTML={{__html: t('receivables.infoText', 'المبلغ الذي دفعته سيتم خصمه بالكامل، ولكن <strong>نصيبك الفعلي فقط</strong> سيُسجل كمصروف (الفرق بين ما دفعته، ما استلمته، وما على أصدقائك). المدفوعات المستلمة تعتبر تسوية للحساب بدون التأثير على التقارير.')}}>
      </p>

      <form onSubmit={submit} className="space-y-4 glass-panel p-6 rounded-[2rem]">
        <h2 className="text-lg font-bold">{form._id ? t('receivables.editTitle', 'تعديل مبلغ مستحق') : t('receivables.addTitle', 'إضافة مبلغ مستحق')}</h2>
        
        <input required className="field text-lg" placeholder={t('receivables.outingName', 'اسم الخروجة أو الفاتورة')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        
        <label className="text-sm font-medium text-[var(--color-text-main)] block">{t('receivables.totalPaid', 'ما دفعته الإجمالي')}</label>
        <div className="grid grid-cols-2 gap-3">
          <input required className="field" type="number" min="1" placeholder={t('receivables.paidAmount', 'المبلغ اللي دفعته')} value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} />
          <CustomSelect value={form.paidFrom} onChange={(v) => setForm({ ...form, paidFrom: v })} options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} placeholder={t('receivables.selectAccount', 'اختر الحساب')} />
        </div>

        <label className="text-sm font-medium text-[var(--color-text-main)] block pt-2">{t('receivables.receivedImmediately', 'ما استلمته فورا (اختياري)')}</label>
        <div className="grid grid-cols-2 gap-3">
          <input className="field" type="number" min="0" max={form.paidAmount || undefined} placeholder={t('receivables.amountReceived', 'المبلغ اللي وصلك')} value={form.receivedAmount} onChange={(e) => setForm({ ...form, receivedAmount: e.target.value })} />
          <CustomSelect value={form.receivedTo} onChange={(v) => setForm({ ...form, receivedTo: v })} options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} placeholder={t('receivables.receivingAccount', 'الحساب المستلم')} />
        </div>

        <div className="space-y-3 pt-4 border-t border-white/10">
          <label className="text-sm font-medium text-[var(--color-text-main)] block">{t('receivables.friendsOwes', 'مستحقات الأصدقاء')}</label>
          {form.participants.map((participant, index) => (
            <div className="flex gap-2" key={index}>
              <div className="grid grid-cols-2 gap-3 flex-1">
                <input required className="field" placeholder={t('receivables.personName', 'اسم الشخص')} value={participant.name} onChange={(e) => setForm({ ...form, participants: form.participants.map((p, i) => i === index ? { ...p, name: e.target.value } : p) })} />
                <input required className="field" type="number" min="1" placeholder={t('receivables.amountOwed', 'مستحق عليه')} value={participant.owedAmount} onChange={(e) => setForm({ ...form, participants: form.participants.map((p, i) => i === index ? { ...p, owedAmount: e.target.value } : p) })} />
              </div>
              {form.participants.length > 1 && (
                <button type="button" onClick={() => removeParticipant(index)} className="p-3 bg-brand-red/10 text-brand-red rounded-xl hover:bg-brand-red/20 transition">
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
        
        <button type="button" onClick={addParticipant} className="text-sm font-medium text-brand-blue hover:text-brand-blue/80 transition-colors">{t('receivables.addPerson', '+ إضافة شخص آخر')}</button>
        
        <div className="bg-white/5 border border-white/5 rounded-xl p-4 mt-2 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-text-muted)]">{t('receivables.yourShare', 'نصيبك من المصروف (سيُسجل في التقارير):')}</span>
              <span className="font-bold text-brand-blue tracking-wide">{money(netExpense)}</span>
            </div>
            
            <div className="border-t border-white/10 pt-3">
              <label className="text-sm font-medium text-[var(--color-text-main)] block mb-2">{t('receivables.expenseCategory', 'فئة المصروف (لنصيبك)')}</label>
              <CustomSelect 
                value={form.expenseCategory} 
                onChange={(v) => setForm({ ...form, expenseCategory: v })} 
                options={categories.map(c => ({ value: c._id, label: c.name, icon: c.icon, color: c.color }))} 
                placeholder={t('receivables.selectCategory', 'اختر الفئة')} 
              />
            </div>
          </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 flex justify-center items-center gap-2 rounded-xl bg-brand-blue py-3.5 font-bold text-[var(--color-text-main)] hover:bg-brand-blue/90 transition">
            <Plus size={20} /> {form._id ? t('receivables.saveChanges', 'حفظ التعديلات') : t('receivables.recordPaymentBtn', 'تسجيل الدفعة')}
          </button>
          {form._id && (
            <button type="button" onClick={() => setForm({ _id: null, title: '', paidAmount: '', paidFrom: accounts[0]?._id || '', receivedAmount: '', receivedTo: '', expenseCategory: categories[0]?._id || '', participants: [{ name: '', owedAmount: '' }] })} className="px-5 rounded-xl bg-white/10 font-bold text-[var(--color-text-main)] hover:bg-white/20 transition">
              {t('receivables.cancel', 'إلغاء')}
            </button>
          )}
        </div>
      </form>

      {error && <p className="text-sm text-brand-red bg-brand-red/10 p-3 rounded-xl border border-brand-red/20">{error}</p>}

      <div className="space-y-4">
        {items.map((item) => {
          const actualShare = item.paidAmount - (item.receivedAmount || 0) - item.participants.reduce((s, p) => s + p.owedAmount, 0);
          return (
            <section key={item._id} className="glass-panel p-5 rounded-[2rem]">
              <div className="flex justify-between items-start">
                <h2 className="font-bold flex gap-2 items-center text-lg">
                  <HandCoins size={20} className="text-brand-blue" />
                  {item.title}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => editItem(item)} className="p-2 text-[var(--color-text-muted)] hover:text-brand-blue transition bg-white/5 rounded-lg"><Pencil size={16}/></button>
                  <button onClick={() => deleteItem(item)} className="p-2 text-[var(--color-text-muted)] hover:text-brand-red transition bg-white/5 rounded-lg"><Trash2 size={16}/></button>
                </div>
              </div>
              
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-[var(--color-text-main)]">
                  {t('receivables.iPaid', 'دفعت')} {money(item.paidAmount)}
                </span>
                {item.receivedAmount > 0 && (
                  <span className="bg-brand-green/10 border border-brand-green/20 px-2.5 py-1 rounded-lg text-brand-green">
                    {t('receivables.iReceived', 'استلمت')} {money(item.receivedAmount)} {t('receivables.immediately', 'فورا')}
                  </span>
                )}
                {actualShare > 0 && (
                  <span className="flex items-center gap-1.5 bg-brand-red/10 border border-brand-red/20 px-2.5 py-1 rounded-lg text-brand-red">
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

              <div className="mt-4 space-y-4">
                {item.participants.map((participant) => {
                  const left = participant.owedAmount - participant.paidAmount;
                  const values = payment[participant._id] || {};
                  
                  return (
                    <div key={participant._id} className="border-t border-white/5 pt-4">
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--color-text-main)]">{participant.name}</span>
                          <span className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            {t('receivables.paidPart', 'المدفوع:')} {money(participant.paidAmount)} / {t('receivables.remainingPart', 'المتبقي:')} <strong className="text-[var(--color-text-main)] font-medium">{money(left)}</strong>
                          </span>
                        </div>
                        {left <= 0 && <CheckCircle2 className="text-brand-green" size={24} />}
                      </div>

                      {left > 0 && (
                        <div className="mt-3 flex flex-col gap-3">
                          <div className="flex gap-2">
                            <input className="field w-1/3" type="number" max={left} placeholder={t('receivables.amount', 'المبلغ')} value={values.amount || ''} onChange={(e) => setPayment({ ...payment, [participant._id]: { ...values, amount: e.target.value } })} />
                            <div className="flex-1">
                              <CustomSelect value={values.account || ''} onChange={(v) => setPayment({ ...payment, [participant._id]: { ...values, account: v } })} options={accounts.filter(a => !a.isArchived).map(a => ({ value: a._id, label: a.name, icon: a.icon, color: a.color }))} placeholder={t('receivables.receivingAccount', 'الحساب المستلم')} />
                            </div>
                          </div>
                          <button onClick={() => pay(item, participant)} className="w-full rounded-xl bg-brand-green/10 text-brand-green border border-brand-green/20 font-bold py-3 hover:bg-brand-green/20 transition-colors">
                            {t('receivables.collect', 'تحصيل المبلغ')}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

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
