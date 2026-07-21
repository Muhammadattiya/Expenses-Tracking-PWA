import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import { createInvestment, deleteInvestment, getGoldPrice, getInvestments } from '../api/investments';

const money = (value, currency = 'EGP') => new Intl.NumberFormat('ar-EG', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value || 0);

export default function Investments() {
  const [investments, setInvestments] = useState([]);
  const [gold, setGold] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ type: 'gold', name: 'ذهب', symbol: '', quantity: '', purchasePrice: '', currency: 'USD' });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [items, price] = await Promise.all([getInvestments(), getGoldPrice().catch(() => null)]);
      setInvestments(items); setGold(price);
    } catch (err) { setError(err.response?.data?.message || 'تعذر تحميل الاستثمارات.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const totals = useMemo(() => investments.reduce((acc, item) => {
    const purchase = item.quantity * item.purchasePrice;
    const currentUnit = item.type === 'gold' && gold?.perGram ? gold.perGram * (item.currency === 'EGP' ? 1 : 1) : item.purchasePrice;
    const current = item.quantity * currentUnit;
    acc.purchase += purchase; acc.current += current; return acc;
  }, { purchase: 0, current: 0 }), [investments, gold]);
  const submit = async (event) => {
    event.preventDefault();
    try { await createInvestment({ ...form, quantity: Number(form.quantity), purchasePrice: Number(form.purchasePrice) }); setForm({ type: 'gold', name: 'ذهب', symbol: '', quantity: '', purchasePrice: '', currency: 'USD' }); await load(); }
    catch (err) { setError(err.response?.data?.message || 'تعذر حفظ الاستثمار.'); }
  };
  const currentValue = (item) => item.type === 'gold' && gold ? item.quantity * gold.perGram : item.quantity * item.purchasePrice;

  if (loading) return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="animate-spin text-blue-400" /></div>;
  return <div className="space-y-5">
    <header><p className="text-blue-400 text-sm">تحديث عند فتح التطبيق</p><h1 className="text-2xl font-bold">الاستثمارات</h1></header>
    <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-400/15 to-yellow-600/5 p-5">
      <p className="text-sm text-gray-400">إجمالي القيمة الحالية</p><p className="text-3xl font-bold">{money(totals.current)}</p>
      <p className={(totals.current - totals.purchase) >= 0 ? 'text-green-400 mt-1' : 'text-red-400 mt-1'}>{money(totals.current - totals.purchase)} {totals.current >= totals.purchase ? 'ربح' : 'خسارة'}</p>
      {gold && <p className="mt-4 text-xs text-amber-200">سعر جرام الذهب الآن: {money(gold.perGram, gold.currency)} · {new Date(gold.updatedAt).toLocaleString('ar-EG')}</p>}
    </section>
    <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/5 p-5 space-y-3">
      <h2 className="font-bold flex gap-2 items-center"><Plus size={18} /> إضافة استثمار</h2>
      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, name: e.target.value === 'gold' ? 'ذهب' : '', currency: e.target.value === 'gold' ? 'USD' : 'EGP' })} className="field"><option value="gold">ذهب</option><option value="stock">سهم</option></select>
      <input className="field" required placeholder={form.type === 'gold' ? 'نوع الذهب (مثال: عيار 21)' : 'اسم السهم'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      {form.type === 'stock' && <input className="field" placeholder="رمز السهم (AAPL)" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />}
      <div className="grid grid-cols-2 gap-3"><input className="field" required type="number" step="any" min="0" placeholder={form.type === 'gold' ? 'الوزن بالجرام' : 'الكمية'} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}/><input className="field" required type="number" step="any" min="0" placeholder="سعر الشراء للوحدة" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}/></div>
      <button className="w-full rounded-2xl bg-blue-500 py-3 font-bold">حفظ الاستثمار</button>
    </form>
    {error && <p className="text-sm text-red-300">{error}</p>}
    <div className="space-y-3">{investments.map((item) => { const value = currentValue(item); const profit = value - item.quantity * item.purchasePrice; return <article key={item._id} className="rounded-2xl border border-white/10 bg-white/5 p-4 flex justify-between"><div><h3 className="font-bold">{item.name}</h3><p className="text-xs text-gray-400">{item.quantity} × {money(item.purchasePrice, item.currency)}</p><p className={profit >= 0 ? 'text-green-400 text-sm mt-2' : 'text-red-400 text-sm mt-2'}>{profit >= 0 ? <TrendingUp size={15} className="inline"/> : <TrendingDown size={15} className="inline"/>} {money(profit, item.currency)}</p></div><button onClick={async () => { await deleteInvestment(item._id); setInvestments(investments.filter((i) => i._id !== item._id)); }} className="text-red-400"><Trash2 size={18}/></button></article>; })}</div>
  </div>;
}
