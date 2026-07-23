import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { createInvestment, deleteInvestment, getGoldPrice, getInvestments } from '../api/investments';
import CustomSelect from '../components/ui/CustomSelect';
import { useLanguage } from '../contexts/LanguageContext';

export default function Investments() {
  const { t, lang } = useLanguage();
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value || 0);
  const goldUnitPrice = (gold, karat) => Number(karat || 24) === 21 ? gold?.perGram21 : gold?.perGram24;

  const [investments, setInvestments] = useState([]);
  const [gold, setGold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ type: 'gold', karat: 21, name: t('investments.gold21Name', 'ذهب عيار 21'), symbol: '', quantity: '', purchasePrice: '', currency: 'EGP' });
  const load = async () => {
    setLoading(true); setError('');
    const [itemsResult, priceResult] = await Promise.allSettled([getInvestments(), getGoldPrice()]);
    if (itemsResult.status === 'fulfilled') setInvestments(itemsResult.value);
    else setError(itemsResult.reason.response?.data?.message || t('investments.loadError', 'تعذر تحميل الاستثمارات.'));
    if (priceResult.status === 'fulfilled') setGold(priceResult.value);
    else setError(priceResult.reason.response?.data?.message || t('investments.goldPriceError', 'تعذر جلب سعر الذهب الحالي.'));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const unitValue = (item) => item.type === 'gold' ? goldUnitPrice(gold, item.karat) || 0 : item.purchasePrice;
  const totals = useMemo(() => investments.reduce((acc, item) => {
    acc.purchase += item.quantity * item.purchasePrice; acc.current += item.quantity * unitValue(item); return acc;
  }, { purchase: 0, current: 0 }), [investments, gold]);
  const submit = async (event) => {
    event.preventDefault(); setError('');
    try {
      await createInvestment({ ...form, karat: Number(form.karat), quantity: Number(form.quantity), purchasePrice: Number(form.purchasePrice) });
      setForm({ type: 'gold', karat: 21, name: t('investments.gold21Name', 'ذهب عيار 21'), symbol: '', quantity: '', purchasePrice: '', currency: 'EGP' }); await load();
    } catch (err) { setError(err.response?.data?.message || t('investments.saveError', 'تعذر حفظ الاستثمار.')); }
  };
  if (loading) return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="animate-spin text-blue-400" /></div>;
  const profit = totals.current - totals.purchase;
  return <div className="p-4 pt-8 animate-fade-in space-y-6">
    <header><p className="text-brand-blue text-sm">{t('investments.updatesOnOpen', 'يتحدث عند فتح الصفحة')}</p><h1 className="text-2xl font-bold">{t('investments.title', 'الاستثمارات')}</h1></header>
    <section className="glass-panel border-amber-500/20 bg-amber-500/5 p-6 rounded-[2rem]"><p className="text-sm text-[var(--color-text-muted)]">{t('investments.totalCurrentValue', 'إجمالي القيمة الحالية')}</p><p className="text-3xl font-bold tracking-wide">{money(totals.current)}</p><p className={profit >= 0 ? 'text-brand-green mt-1 font-medium' : 'text-brand-red mt-1 font-medium'}>{money(profit)} {profit >= 0 ? t('investments.profit', 'ربح') : t('investments.loss', 'خسارة')}</p>{gold && <p className="mt-4 text-xs text-[var(--text-gold)]">{t('investments.karat21', 'عيار 21')}: {money(gold.perGram21)} {t('investments.perGram', 'للجرام')} · {t('investments.karat24', 'عيار 24')}: {money(gold.perGram24)} {t('investments.perGram', 'للجرام')}</p>}</section>
    <form onSubmit={submit} className="glass-panel p-6 rounded-[2rem] space-y-4"><h2 className="font-bold flex gap-2 items-center text-lg"><Plus size={20} className="text-brand-blue"/> {t('investments.addInvestment', 'إضافة استثمار')}</h2><CustomSelect value={form.type} onChange={(val) => setForm({ ...form, type: val, name: val === 'gold' ? t('investments.gold21Name', 'ذهب عيار 21') : '', currency: 'EGP' })} options={[{value: 'gold', label: t('investments.gold', 'ذهب')}, {value: 'stock', label: t('investments.stock', 'سهم')}]} placeholder={t('investments.investmentType', 'نوع الاستثمار')} />{form.type === 'gold' && <CustomSelect value={form.karat} onChange={(val) => { const karat = Number(val); setForm({ ...form, karat, name: karat === 24 ? t('investments.gold24Name', 'ذهب عيار 24') : t('investments.gold21Name', 'ذهب عيار 21') }); }} options={[{value: 21, label: t('investments.gold21Name', 'ذهب عيار 21')}, {value: 24, label: t('investments.gold24Name', 'ذهب عيار 24')}]} placeholder={t('investments.selectKarat', 'اختر العيار')} />}<input className="field" required placeholder={form.type === 'gold' ? t('investments.investmentDesc', 'وصف الاستثمار') : t('investments.stockName', 'اسم السهم')} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/>{form.type === 'stock' && <input className="field" placeholder={t('investments.stockSymbol', 'رمز السهم (AAPL)')} value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })}/>}<div className="grid grid-cols-2 gap-3"><input className="field" required type="number" step="any" min="0" placeholder={form.type === 'gold' ? t('investments.weightGrams', 'الوزن بالجرام') : t('investments.quantity', 'الكمية')} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })}/><input className="field" required type="number" step="any" min="0" placeholder={t('investments.purchasePrice', 'سعر الشراء للوحدة (ج.م)')} value={form.purchasePrice} onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })}/></div><button className="w-full rounded-xl bg-brand-blue py-3.5 font-bold text-[var(--color-text-main)] hover:bg-brand-blue/90 transition-colors">{t('investments.saveInvestment', 'حفظ الاستثمار')}</button></form>
    {error && <p className="rounded-xl bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>}
    <div className="space-y-3">{investments.map((item) => { const current = item.quantity * unitValue(item); const itemProfit = current - item.quantity * item.purchasePrice; return <article key={item._id} className="glass-panel p-4 flex justify-between items-center group"><div><h3 className="font-bold text-lg">{item.name}</h3><p className="text-sm text-[var(--color-text-muted)] mt-1">{item.quantity} × {money(item.purchasePrice)}</p><p className={itemProfit >= 0 ? 'text-brand-green text-sm mt-2 font-medium' : 'text-brand-red text-sm mt-2 font-medium'}>{itemProfit >= 0 ? <TrendingUp size={16} className="inline mr-1"/> : <TrendingDown size={16} className="inline mr-1"/>} {money(itemProfit)}</p></div><button onClick={async () => { await deleteInvestment(item._id); setInvestments(investments.filter((entry) => entry._id !== item._id)); }} className="text-[var(--color-text-muted)] hover:text-brand-red bg-white/5 p-2 rounded-xl transition-colors"><Trash2 size={20}/></button></article>; })}</div>
  </div>;
}
