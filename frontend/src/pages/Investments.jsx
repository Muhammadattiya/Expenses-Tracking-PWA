import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { createInvestment, deleteInvestment, getGoldPrice, getInvestments } from '../api/investments';

const money = (value) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(value || 0);
const goldUnitPrice = (gold, karat) => Number(karat || 24) === 21 ? gold?.perGram21 : gold?.perGram24;

export default function Investments() {
  const [investments, setInvestments] = useState([]);
  const [gold, setGold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ type: 'gold', karat: 21, name: 'ذهب عيار 21', symbol: '', quantity: '', purchasePrice: '', currency: 'EGP' });
  const load = async () => {
    setLoading(true); setError('');
    const [itemsResult, priceResult] = await Promise.allSettled([getInvestments(), getGoldPrice()]);
    if (itemsResult.status === 'fulfilled') setInvestments(itemsResult.value);
    else setError(itemsResult.reason.response?.data?.message || 'تعذر تحميل الاستثمارات.');
    if (priceResult.status === 'fulfilled') setGold(priceResult.value);
    else setError(priceResult.reason.response?.data?.message || 'تعذر جلب سعر الذهب الحالي.');
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
      setForm({ type: 'gold', karat: 21, name: 'ذهب عيار 21', symbol: '', quantity: '', purchasePrice: '', currency: 'EGP' }); await load();
    } catch (err) { setError(err.response?.data?.message || 'تعذر حفظ الاستثمار.'); }
  };
  if (loading) return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="animate-spin text-blue-400" /></div>;
  const profit = totals.current - totals.purchase;
  return <div className="space-y-5">
    <header><p className="text-blue-400 text-sm">يتحدث عند فتح الصفحة</p><h1 className="text-2xl font-bold">الاستثمارات</h1></header>
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-400/15 to-yellow-600/5 p-5"><p className="text-sm text-gray-400">إجمالي القيمة الحالية</p><p className="text-3xl font-bold">{money(totals.current)}</p><p className={profit >= 0 ? 'text-green-400 mt-1' : 'text-red-400 mt-1'}>{money(profit)} {profit >= 0 ? 'ربح' : 'خسارة'}</p>{gold && <p className="mt-4 text-xs text-amber-200">عيار 21: {money(gold.perGram21)} للجرام · عيار 24: {money(gold.perGram24)} للجرام</p>}</section>
    <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3"><h2 className="font-bold flex gap-2 items-center"><Plus size={18}/> إضافة استثمار</h2><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, name: event.target.value === 'gold' ? 'ذهب عيار 21' : '', currency: 'EGP' })} className="field"><option value="gold">ذهب</option><option value="stock">سهم</option></select>{form.type === 'gold' && <select className="field" value={form.karat} onChange={(event) => { const karat = Number(event.target.value); setForm({ ...form, karat, name: `ذهب عيار ${karat}` }); }}><option value={21}>ذهب عيار 21</option><option value={24}>ذهب عيار 24</option></select>}<input className="field" required placeholder={form.type === 'gold' ? 'وصف الاستثمار' : 'اسم السهم'} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/>{form.type === 'stock' && <input className="field" placeholder="رمز السهم (AAPL)" value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })}/>}<div className="grid grid-cols-2 gap-3"><input className="field" required type="number" step="any" min="0" placeholder={form.type === 'gold' ? 'الوزن بالجرام' : 'الكمية'} value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })}/><input className="field" required type="number" step="any" min="0" placeholder="سعر الشراء للوحدة (ج.م)" value={form.purchasePrice} onChange={(event) => setForm({ ...form, purchasePrice: event.target.value })}/></div><button className="w-full rounded-2xl bg-blue-500 py-3 font-bold">حفظ الاستثمار</button></form>
    {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
    <div className="space-y-3">{investments.map((item) => { const current = item.quantity * unitValue(item); const itemProfit = current - item.quantity * item.purchasePrice; return <article key={item._id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex justify-between"><div><h3 className="font-bold">{item.name}</h3><p className="text-xs text-gray-400">{item.quantity} × {money(item.purchasePrice)}</p><p className={itemProfit >= 0 ? 'text-green-400 text-sm mt-2' : 'text-red-400 text-sm mt-2'}>{itemProfit >= 0 ? <TrendingUp size={15} className="inline"/> : <TrendingDown size={15} className="inline"/>} {money(itemProfit)}</p></div><button onClick={async () => { await deleteInvestment(item._id); setInvestments(investments.filter((entry) => entry._id !== item._id)); }} className="text-red-400"><Trash2 size={18}/></button></article>; })}</div>
  </div>;
}
