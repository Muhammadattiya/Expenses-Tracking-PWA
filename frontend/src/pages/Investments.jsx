import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, TrendingDown, TrendingUp, Trash2, Coins, LineChart, Activity, Pencil } from 'lucide-react';
import { createInvestment, deleteInvestment, getGoldPrice, getInvestments, updateInvestment } from '../api/investments';
import { useLanguage } from '../contexts/LanguageContext';
import InvestmentModal from '../components/modals/InvestmentModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import { InvestmentsSkeleton } from '../components/ui/Skeletons';

export default function Investments() {
  const { t, lang } = useLanguage();
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { 
    style: 'currency', 
    currency: 'EGP', 
    maximumFractionDigits: 2 
  }).format(value || 0);

  const goldUnitPrice = (gold, karat) => Number(karat || 24) === 21 ? gold?.perGram21 : gold?.perGram24;

  const [investments, setInvestments] = useState([]);
  const [gold, setGold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true); 
    setError('');
    
    // Try to load cached gold price immediately for faster UX
    const cachedGold = localStorage.getItem('cachedGoldPrice');
    if (cachedGold) {
      try { setGold(JSON.parse(cachedGold)); } catch (e) {}
    }

    const [itemsResult, priceResult] = await Promise.allSettled([getInvestments(), getGoldPrice()]);
    
    if (itemsResult.status === 'fulfilled') {
      setInvestments(itemsResult.value);
    } else {
      setError(itemsResult.reason.response?.data?.message || t('investments.loadError', 'تعذر تحميل الاستثمارات.'));
    }
    
    if (priceResult.status === 'fulfilled') {
      setGold(priceResult.value);
      localStorage.setItem('cachedGoldPrice', JSON.stringify(priceResult.value));
    } else if (!cachedGold) {
      // Only show error if we also don't have a cached version
      setError(priceResult.reason.response?.data?.message || t('investments.goldPriceError', 'تعذر جلب سعر الذهب الحالي.'));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unitValue = (item) => item.type === 'gold' ? goldUnitPrice(gold, item.karat) || 0 : (item.currentPrice || item.purchasePrice);
  
  const totals = useMemo(() => investments.reduce((acc, item) => {
    acc.purchase += item.quantity * item.purchasePrice; 
    acc.current += item.quantity * unitValue(item); 
    return acc;
  }, { purchase: 0, current: 0 }), [investments, gold]);

  const profit = totals.current - totals.purchase;
  const isProfit = profit >= 0;

  const handleSaveInvestment = async (formData) => {
    if (editingInvestment) {
      await updateInvestment(editingInvestment._id, formData);
    } else {
      await createInvestment(formData);
    }
    await load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const id = deleteId;
    setDeleteId(null);
    // Optimistic UI update
    const previous = [...investments];
    setInvestments(investments.filter(item => item._id !== id));
    try {
      await deleteInvestment(id);
    } catch (err) {
      // Revert if failed
      setInvestments(previous);
      alert(t('investments.deleteError', 'حدث خطأ أثناء الحذف'));
    }
  };

  if (loading && !investments.length) {
    return <InvestmentsSkeleton />;
  }

  return (
    <div className="p-4 pt-8 animate-fade-in space-y-6 pb-24">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-brand-blue text-sm font-medium uppercase tracking-widest mb-1">
            {t('investments.updatesOnOpen', 'يتحدث عند فتح الصفحة')}
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight">
            {t('investments.title', 'الاستثمارات')}
          </h1>
        </div>
        
        <button 
          onClick={() => { setEditingInvestment(null); setIsModalOpen(true); }}
          className="bg-brand-blue hover:bg-brand-blue/90 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-brand-blue/20"
        >
          <Plus className="w-5 h-5" />
          {t('investments.addInvestment', 'إضافة استثمار')}
        </button>
      </header>

      {error && (
        <div className="rounded-2xl bg-brand-red/10 p-4 border border-brand-red/20 text-sm text-brand-red font-medium flex items-center gap-2">
          <Activity className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Hero Card (Total Wealth) */}
      <section className="p-8 rounded-[2rem] shadow-2xl bg-gradient-to-br from-amber-500/20 to-amber-900/10 border border-amber-500/30 backdrop-blur-xl relative overflow-hidden group transition-all duration-500">
        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-700">
          <TrendingUp className="w-32 h-32 text-amber-400" />
        </div>
        
        <div className="relative z-10">
          <p className="text-sm font-bold tracking-widest uppercase mb-2 text-amber-200/80">
            {t('investments.totalCurrentValue', 'إجمالي القيمة الحالية')}
          </p>
          <h2 className="text-5xl font-black mb-4 tracking-tight text-amber-400 tabular-nums">
            {money(totals.current)}
          </h2>
          
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md border ${isProfit ? 'bg-brand-green/10 border-brand-green/20 text-brand-green' : 'bg-brand-red/10 border-brand-red/20 text-brand-red'}`}>
            {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span className="font-bold tracking-wide">
              {money(profit)} {isProfit ? t('investments.profit', 'ربح') : t('investments.loss', 'خسارة')}
            </span>
          </div>
        </div>
      </section>

      {/* Live Gold Prices Ticker */}
      {gold && (
        <section className="flex flex-wrap items-center gap-4 p-4 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-amber-400 font-bold px-4 border-r border-white/10 last:border-0">
            <Coins className="w-5 h-5" />
            <span>{t('investments.liveGoldPrices', 'أسعار الذهب مباشر')}</span>
          </div>
          <div className="flex items-center gap-6 px-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{t('investments.karat21', 'عيار 21')}</span>
              <span className="font-mono font-medium text-white">{money(gold.perGram21)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{t('investments.karat24', 'عيار 24')}</span>
              <span className="font-mono font-medium text-white">{money(gold.perGram24)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Investments Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {investments.map((item) => { 
          const current = item.quantity * unitValue(item); 
          const itemProfit = current - (item.quantity * item.purchasePrice); 
          const isItemProfit = itemProfit >= 0;
          
          return (
            <article 
              key={item._id} 
              className="bg-black/30 p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-white/10 hover:bg-white/5 transition-all duration-300"
            >
              {/* Decorative background blob */}
              <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl -z-10 opacity-20 transition-colors duration-500 ${isItemProfit ? 'bg-brand-green' : 'bg-brand-red'}`} />
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-2xl text-amber-400 border border-white/5 group-hover:scale-110 transition-transform">
                    {item.type === 'gold' ? <Coins className="w-6 h-6" /> : <LineChart className="w-6 h-6 text-brand-blue" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white leading-tight">{item.name}</h3>
                    {item.type === 'stock' && item.symbol && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-[var(--color-text-muted)]">
                        {item.symbol}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { setEditingInvestment(item); setIsModalOpen(true); }} 
                    className="text-[var(--color-text-muted)] hover:text-brand-blue hover:bg-brand-blue/10 p-2 rounded-xl transition-all focus:opacity-100"
                    aria-label="Edit investment"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setDeleteId(item._id)} 
                    className="text-[var(--color-text-muted)] hover:text-brand-red hover:bg-brand-red/10 p-2 rounded-xl transition-all focus:opacity-100"
                    aria-label="Delete investment"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--color-text-muted)]">
                    {item.type === 'gold' ? t('investments.weightGrams', 'الكمية/الوزن') : t('investments.quantity', 'الكمية')}
                  </span>
                  <span className="font-mono font-medium text-white">{item.quantity}</span>
                </div>
                {item.type === 'stock' && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--color-text-muted)]">
                      {t('investments.currentPrice', 'السعر الحالي للسهم')}
                    </span>
                    <span className="font-mono font-medium text-white">{money(item.currentPrice || item.purchasePrice)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[var(--color-text-muted)]">
                    {t('investments.purchasePrice', 'سعر الشراء')}
                  </span>
                  <span className="font-mono font-medium text-white">{money(item.purchasePrice)}</span>
                </div>

                <div className="pt-4 border-t border-white/5 flex flex-col gap-1">
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                      {t('investments.currentValue', 'القيمة الحالية')}
                    </span>
                    <span className="text-xl font-bold font-mono text-white tracking-tight">
                      {money(current)}
                    </span>
                  </div>
                  <div className={`flex justify-end items-center gap-1 text-sm font-medium ${isItemProfit ? 'text-brand-green' : 'text-brand-red'}`}>
                    {isItemProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span>{money(Math.abs(itemProfit))}</span>
                  </div>
                </div>
              </div>
            </article>
          ); 
        })}
        
        {investments.length === 0 && !loading && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-[var(--color-text-muted)] bg-white/5 border border-white/5 rounded-[2rem] border-dashed">
            <Coins className="w-16 h-16 mb-4 opacity-20" />
            <p>{t('investments.noInvestments', 'لا توجد استثمارات مضافة حالياً')}</p>
          </div>
        )}
      </section>

      <InvestmentModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingInvestment(null); }} 
        initialData={editingInvestment}
        onSave={handleSaveInvestment}
      />

      <ConfirmModal
        open={!!deleteId}
        title={t('investments.deleteTitle', 'حذف الاستثمار')}
        message={t('investments.deleteConfirm', 'هل أنت متأكد من حذف هذا الاستثمار؟ لا يمكن التراجع عن هذا الإجراء.')}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
