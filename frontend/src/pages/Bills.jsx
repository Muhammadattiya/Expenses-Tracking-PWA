import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, Plus, CheckCircle2, Pencil, Trash2, CalendarDays, Wallet, Bell, HandCoins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ListSkeleton } from '../components/ui/Skeletons';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { getBills, createBill, updateBill, deleteBill } from '../api/bills';
import CustomSelect from '../components/ui/CustomSelect';
import { useLanguage } from '../contexts/LanguageContext';

export default function Bills() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(value || 0);
  
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [form, setForm] = useState({
    _id: null,
    name: '',
    expectedAmount: '',
    category: '',
    account: '',
    dueDate: new Date().toISOString().split('T')[0],
    repeat: 'never',
    reminderEnabled: false,
    reminderDaysBefore: 1,
    notificationEnabled: true,
    notes: ''
  });

  const load = async () => {
    try {
      const [billsData, accountsData, categoriesData] = await Promise.all([
        getBills(),
        getAccounts(),
        getCategories()
      ]);
      setItems(billsData);
      setAccounts(accountsData);
      setCategories(categoriesData.filter(c => c.type === 'expense'));
      
      setForm(prev => ({
        ...prev,
        account: prev.account || (accountsData.length > 0 ? accountsData[0]._id : ''),
        category: prev.category || (categoriesData.filter(c => c.type === 'expense').length > 0 ? categoriesData.filter(c => c.type === 'expense')[0]._id : '')
      }));
    } catch {
      setError(t('common.loadError', 'تعذر تحميل البيانات'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      const data = {
        ...form,
        expectedAmount: Number(form.expectedAmount),
      };
      
      if (form._id) {
        await updateBill(form._id, data);
      } else {
        await createBill(data);
      }
      
      closeModal();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('common.saveError', 'تعذر حفظ البيانات'));
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setForm({
        _id: item._id,
        name: item.name,
        expectedAmount: item.expectedAmount,
        category: item.category?._id || item.category,
        account: item.account?._id || item.account,
        dueDate: new Date(item.dueDate).toISOString().split('T')[0],
        repeat: item.repeat || 'never',
        reminderEnabled: item.reminderEnabled,
        reminderDaysBefore: item.reminderDaysBefore,
        notificationEnabled: item.notificationEnabled,
        notes: item.notes || ''
      });
    } else {
      setForm({
        _id: null,
        name: '',
        expectedAmount: '',
        category: categories.length > 0 ? categories[0]._id : '',
        account: accounts.length > 0 ? accounts[0]._id : '',
        dueDate: new Date().toISOString().split('T')[0],
        repeat: 'never',
        reminderEnabled: false,
        reminderDaysBefore: 1,
        notificationEnabled: true,
        notes: ''
      });
    }
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError('');
  };

  const deleteItem = async (id) => {
    if (!window.confirm(t('bills.confirmDelete', 'هل أنت متأكد من حذف هذه الفاتورة؟'))) return;
    try {
      await deleteBill(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || t('common.deleteError', 'تعذر الحذف'));
    }
  };

  const handlePay = (bill) => {
    navigate('/add', {
      state: {
        billId: bill._id,
        defaultAmount: bill.expectedAmount,
        defaultName: bill.name,
        defaultCategory: bill.category?._id,
        defaultAccount: bill.account?._id
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'text-brand-green bg-brand-green/10 border-brand-green/20';
      case 'overdue': return 'text-brand-red bg-brand-red/10 border-brand-red/20';
      case 'due_today': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      default: return 'text-brand-blue bg-brand-blue/10 border-brand-blue/20'; // upcoming
    }
  };

  const repeatOptions = [
    { value: 'never', label: t('recurring.never', 'بدون تكرار') },
    { value: 'weekly', label: t('recurring.weekly', 'أسبوعياً') },
    { value: 'monthly', label: t('recurring.monthly', 'شهرياً') },
    { value: 'yearly', label: t('recurring.yearly', 'سنوياً') }
  ];

  const reminderOptions = [
    { value: 0, label: t('bills.sameDay', 'نفس اليوم') },
    { value: 1, label: t('bills.oneDayBefore', 'قبل يوم') },
    { value: 3, label: t('bills.threeDaysBefore', 'قبل 3 أيام') },
    { value: 7, label: t('bills.sevenDaysBefore', 'قبل أسبوع') }
  ];

  if (isLoading) {
    return (
      <div className="animate-fade-in p-4 space-y-6">
        <ListSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="p-4 pt-8 animate-fade-in pb-24">
      <header className="flex justify-center items-center mb-8 mt-2">
        <h1 className="text-2xl font-bold flex gap-3 items-center text-[var(--color-text-main)]">
          <CalendarClock className="text-brand-blue w-7 h-7" />
          {t('bills.title', 'الفواتير والمصروفات')}
        </h1>
      </header>

      {error && <p className="text-sm text-brand-red bg-brand-red/10 p-3 rounded-xl border border-brand-red/20 mb-4">{error}</p>}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-[var(--color-text-muted)] space-y-5 flex-1">
          <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-2 shadow-inner border border-white/5">
            <CalendarClock size={40} className="text-[var(--color-text-muted)]" />
          </div>
          <p className="text-xl font-bold text-[var(--color-text-main)]">{t('bills.noBills', 'لا توجد فواتير مضافة')}</p>
          <button onClick={() => openModal()} className="text-[var(--color-text-main)] font-bold px-8 py-3.5 rounded-2xl bg-brand-blue hover:bg-blue-600 transition-colors shadow-[0_4px_12px_rgba(0,122,255,0.3)]">
            {t('bills.addBill', 'إضافة فاتورة جديدة')}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item._id} className="glass-panel p-5 rounded-[2rem] border border-white/5 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110" />
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-[var(--color-text-main)]">{item.name}</h3>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusColor(item.status)}`}>
                        {t(`bills.status.${item.status}`, item.status)}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-brand-blue tracking-tight">
                      {money(item.expectedAmount)}
                    </div>
                  </div>
                  
                  <div className="flex gap-1">
                    <button onClick={() => openModal(item)} className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition bg-white/5 rounded-xl hover:bg-white/10"><Pencil size={16}/></button>
                    <button onClick={() => deleteItem(item._id)} className="p-2 text-[var(--color-text-muted)] hover:text-brand-red transition bg-white/5 rounded-xl hover:bg-brand-red/10"><Trash2 size={16}/></button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs mb-5">
                  <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <CalendarDays size={14} className="text-[var(--color-text-main)]" />
                    <span>{new Date(item.dueDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}</span>
                  </div>
                  {item.repeat !== 'never' && (
                    <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                      <HandCoins size={14} className="text-brand-green" />
                      <span>{t(`recurring.${item.repeat}`, item.repeat)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                    <Wallet size={14} className="text-orange-400" />
                    <span className="truncate max-w-[100px]">{item.account?.name || '-'}</span>
                  </div>
                  {item.reminderEnabled && (
                    <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
                      <Bell size={14} className="text-brand-blue" />
                      <span>{item.reminderDaysBefore === 0 ? t('bills.sameDay', 'نفس اليوم') : `${item.reminderDaysBefore} d`}</span>
                    </div>
                  )}
                </div>

                {item.status !== 'paid' ? (
                  <button 
                    onClick={() => handlePay(item)} 
                    className="w-full py-3.5 rounded-xl bg-brand-blue/10 text-brand-blue font-bold flex items-center justify-center gap-2 hover:bg-brand-blue hover:text-white transition-all active:scale-95"
                  >
                    <CheckCircle2 size={18} />
                    {t('bills.payNow', 'دفع الآن')}
                  </button>
                ) : (
                  <div className="w-full py-3.5 rounded-xl bg-brand-green/10 text-brand-green font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} />
                    {t('bills.status.paid', 'مدفوعة')}
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() => openModal()}
            className="w-full mt-6 py-4 rounded-2xl bg-[var(--color-surface)] border border-dashed border-white/20 hover:border-brand-blue/50 text-[var(--color-text-muted)] hover:text-brand-blue transition-all flex items-center justify-center gap-2 font-bold"
          >
            <Plus size={20} />
            {t('bills.addBill', 'إضافة فاتورة جديدة')}
          </button>
        </>
      )}

      {/* Add/Edit Modal using createPortal to prevent BottomNav overlap */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1c1c1e] w-full max-w-md rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xl font-bold text-[var(--color-text-main)]">
                {form._id ? t('bills.editBill', 'تعديل فاتورة') : t('bills.addBill', 'إضافة فاتورة')}
              </h2>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white">
                ✕
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              <form id="billForm" onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 ml-1">{t('bills.name', 'اسم الفاتورة')}</label>
                  <input required className="field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={t('bills.name', 'مثال: فاتورة الكهرباء')} />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 ml-1">{t('bills.amount', 'المبلغ')}</label>
                    <input required type="number" min="0" className="field" value={form.expectedAmount} onChange={e => setForm({...form, expectedAmount: e.target.value})} placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 ml-1">{t('bills.dueDate', 'تاريخ الاستحقاق')}</label>
                    <input required type="date" className="field" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 ml-1">{t('addTransaction.category', 'الفئة')}</label>
                    <CustomSelect value={form.category} onChange={v => setForm({...form, category: v})} options={categories.map(c => ({value: c._id, label: c.name, icon: c.icon}))} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 ml-1">{t('addTransaction.account', 'الحساب')}</label>
                    <CustomSelect value={form.account} onChange={v => setForm({...form, account: v})} options={accounts.filter(a => !a.isArchived).map(a => ({value: a._id, label: a.name, icon: a.icon, color: a.color}))} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 ml-1">{t('bills.repeat', 'التكرار')}</label>
                  <CustomSelect value={form.repeat} onChange={v => setForm({...form, repeat: v})} options={repeatOptions} />
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold text-[var(--color-text-main)]">{t('bills.reminder', 'تفعيل التذكير')}</label>
                    <button
                      type="button"
                      onClick={() => setForm({...form, reminderEnabled: !form.reminderEnabled})}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${form.reminderEnabled ? 'bg-brand-blue' : 'bg-gray-600'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${form.reminderEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  
                  {form.reminderEnabled && (
                    <div className="animate-fade-in pt-2">
                      <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-1.5 ml-1">{t('bills.reminderDays', 'وقت التذكير')}</label>
                      <CustomSelect value={form.reminderDaysBefore} onChange={v => setForm({...form, reminderDaysBefore: Number(v)})} options={reminderOptions} />
                    </div>
                  )}
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-white/5 bg-black/20">
              <button form="billForm" type="submit" className="w-full py-3.5 rounded-xl bg-brand-blue text-white font-bold text-lg hover:bg-blue-600 transition-colors shadow-lg active:scale-95">
                {t('modals.save', 'حفظ')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
