import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Sparkles, Pencil } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import CustomSelect from '../ui/CustomSelect';
import { getAccounts } from '../../api/accounts';

export default function InvestmentModal({ isOpen, onClose, onSave, initialData = null }) {
  const { t } = useLanguage();
  
  const [form, setForm] = useState({ 
    type: 'gold', 
    karat: 21, 
    name: t('investments.gold21Name', 'ذهب عيار 21'), 
    symbol: '', 
    quantity: '', 
    purchasePrice: initialData?.purchasePrice || '',
    currentPrice: initialData?.currentPrice || '',
    currency: 'EGP',
    from_account: ''
  });
  
  const [accounts, setAccounts] = useState([]);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await getAccounts();
        setAccounts(data);
      } catch (e) {
        console.error("Failed to load accounts", e);
      }
    };
    fetchAccounts();
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        let updatedName = initialData.name;
        if (initialData.type === 'gold') {
          if (initialData.karat === 21 && (updatedName === 'ذهب عيار 21' || updatedName === '21k Gold')) {
            updatedName = t('investments.gold21Name', 'ذهب عيار 21');
          } else if (initialData.karat === 24 && (updatedName === 'ذهب عيار 24' || updatedName === '24k Gold')) {
            updatedName = t('investments.gold24Name', 'ذهب عيار 24');
          }
        }
        setForm({ ...initialData, name: updatedName });
      } else {
        setForm({ 
          type: 'gold', 
          karat: 21, 
          name: t('investments.gold21Name', 'ذهب عيار 21'), 
          symbol: '', 
          quantity: '', 
          purchasePrice: '', 
          currentPrice: '',
          currency: 'EGP',
          from_account: ''
        });
      }
      setError('');
    }
  }, [isOpen, initialData, t]);

  if (!isOpen) return null;

  const submit = async (event) => {
    event.preventDefault(); 
    setError('');
    setIsSubmitting(true);
    try {
      await onSave({ 
        ...form, 
        karat: Number(form.karat), 
        quantity: Number(form.quantity), 
        purchasePrice: Number(form.purchasePrice),
        transferTitle: t('investments.transferTitle', 'استثمار في {name}').replace('{name}', form.name)
      });
      // Reset form
      setForm({ 
        type: 'gold', 
        karat: 21, 
        name: t('investments.gold21Name', 'ذهب عيار 21'), 
        symbol: '', 
        quantity: '', 
        purchasePrice: '', 
        currency: 'EGP',
        from_account: ''
      });
      onClose();
    } catch (err) { 
      setError(err.response?.data?.message || err.message || t('investments.saveError', 'تعذر حفظ الاستثمار.')); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-[#111] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#111]/80 backdrop-blur-xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-blue/20 rounded-xl text-brand-blue">
              {initialData ? <Pencil className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              {initialData ? t('investments.editInvestment', 'تعديل استثمار') : t('investments.addInvestment', 'إضافة استثمار')}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-[var(--color-text-muted)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-6 rounded-2xl bg-brand-red/10 p-4 border border-brand-red/20 text-sm text-brand-red font-medium flex items-center gap-2">
              <X className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form id="investment-form" onSubmit={submit} className="space-y-5">
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-text-muted)] px-1">{t('investments.investmentType', 'نوع الاستثمار')}</label>
              <CustomSelect 
                value={form.type} 
                onChange={(val) => setForm({ 
                  ...form, 
                  type: val, 
                  name: val === 'gold' ? t('investments.gold21Name', 'ذهب عيار 21') : '', 
                  currency: 'EGP' 
                })} 
                options={[
                  {value: 'gold', label: t('investments.gold', 'ذهب')}, 
                  {value: 'stock', label: t('investments.stock', 'سهم')}
                ]} 
              />
            </div>

            {form.type === 'gold' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-sm font-medium text-[var(--color-text-muted)] px-1">{t('investments.selectKarat', 'اختر العيار')}</label>
                <CustomSelect 
                  value={form.karat} 
                  onChange={(val) => { 
                    const karat = Number(val); 
                    setForm({ 
                      ...form, 
                      karat, 
                      name: karat === 24 ? t('investments.gold24Name', 'ذهب عيار 24') : t('investments.gold21Name', 'ذهب عيار 21') 
                    }); 
                  }} 
                  options={[
                    {value: 21, label: t('investments.gold21Name', 'ذهب عيار 21')}, 
                    {value: 24, label: t('investments.gold24Name', 'ذهب عيار 24')}
                  ]} 
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--color-text-muted)] px-1">
                {form.type === 'gold' ? t('investments.investmentDesc', 'وصف الاستثمار') : t('investments.stockName', 'اسم السهم')}
              </label>
              <input 
                className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 transition-all" 
                required 
                placeholder={form.type === 'gold' ? t('investments.investmentDesc', 'وصف الاستثمار') : t('investments.stockName', 'اسم السهم')} 
                value={form.name} 
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>

            {form.type === 'stock' && (
              <div className="space-y-1.5 animate-fade-in">
                <label className="text-sm font-medium text-[var(--color-text-muted)] px-1">{t('investments.stockSymbol', 'رمز السهم (AAPL)')}</label>
                <input 
                  className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 transition-all uppercase" 
                  placeholder={t('investments.stockSymbol', 'رمز السهم (AAPL)')} 
                  value={form.symbol} 
                  onChange={(event) => setForm({ ...form, symbol: event.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-text-muted)] px-1">
                  {form.type === 'gold' ? t('investments.weightGrams', 'الوزن بالجرام') : t('investments.quantity', 'الكمية')}
                </label>
                <input 
                  className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 transition-all" 
                  required 
                  type="number" 
                  step="any" 
                  min="0" 
                  placeholder="0.00"
                  value={form.quantity} 
                  onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--color-text-muted)] px-1">
                  {t('investments.purchasePrice', 'سعر الشراء')}
                </label>
                <input 
                  className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 transition-all" 
                  required 
                  type="number" 
                  step="any" 
                  min="0" 
                  placeholder="0.00"
                  value={form.purchasePrice} 
                  onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })}
                />
              </div>
            </div>

            {form.type === 'stock' && (
              <div className="space-y-1.5 animate-fade-in mt-4">
                <label className="text-sm font-medium text-[var(--color-text-muted)] px-1">
                  {t('investments.currentPrice', 'السعر الحالي للسهم')}
                </label>
                <input 
                  className="w-full bg-black/30 border border-white/5 rounded-2xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 transition-all" 
                  type="number" 
                  step="any" 
                  min="0" 
                  placeholder="0.00"
                  value={form.currentPrice} 
                  onChange={(event) => setForm({ ...form, currentPrice: event.target.value })}
                />
              </div>
            )}

            {!initialData && (
              <div className="space-y-1.5 animate-fade-in border-t border-white/5 pt-4 mt-2">
                <label className="text-sm font-medium text-[var(--color-text-muted)] px-1">
                  {t('investments.deductFromAccount', 'خصم قيمة الاستثمار من حساب؟ (اختياري)')}
                </label>
                <CustomSelect 
                  value={form.from_account} 
                  onChange={(val) => setForm({ ...form, from_account: val })} 
                  options={[
                    { value: '', label: t('investments.noAccountSelected', 'بدون خصم (تجاوز)') },
                    ...accounts.map(acc => ({ value: acc._id, label: acc.name }))
                  ]} 
                />
              </div>
            )}

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-[#111]/80 backdrop-blur-xl">
          <button 
            type="submit"
            form="investment-form"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-brand-blue py-4 font-bold text-[var(--color-text-main)] hover:bg-brand-blue/90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              initialData ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />
            )}
            {initialData ? t('investments.saveChanges', 'حفظ التعديلات') : t('investments.saveInvestment', 'حفظ الاستثمار')}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
