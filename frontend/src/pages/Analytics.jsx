import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, AreaChart, Area, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getAnalytics } from '../api/analytics';
import { getAccounts } from '../api/accounts';
import { getCategories } from '../api/categories';
import { Loader2, Download, Filter, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#10b981', '#ec4899', '#06b6d4', '#84cc16'];

export default function Analytics() {
  const { t, lang } = useLanguage();
  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value || 0);
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', search: '', account: '', category: '' });
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const loadData = async () => {
    try {
      const result = await getAnalytics(filters);
      if (result.monthly) {
        result.monthly = result.monthly.map(m => ({
          ...m,
          balance: m.income - m.expense
        }));
      }
      setData(result);
    } catch (err) {
      console.error(err);
    }
  };

  const loadOptions = async () => {
    try {
      const accs = await getAccounts();
      const cats = await getCategories();
      setAccounts(accs);
      setCategories(cats);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.from, filters.to, filters.account, filters.category]); 

  useEffect(() => {
    loadOptions();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const exportReport = () => { 
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); 
    const url = URL.createObjectURL(blob); 
    const link = document.createElement('a'); 
    link.href = url; link.download = `analytics-${new Date().toISOString().slice(0,10)}.json`; 
    link.click(); 
    URL.revokeObjectURL(url); 
  };

  if (!data) return (
    <div className="min-h-[60vh] grid place-items-center p-4">
      <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
    </div>
  );

  const cards = [
    [t('analytics.income', 'الدخل'), data.summary.income, 'text-brand-green', 'bg-brand-green/10 border-brand-green/20'], 
    [t('analytics.expenses', 'المصروفات'), data.summary.expense, 'text-brand-red', 'bg-brand-red/10 border-brand-red/20'], 
    [t('analytics.cashFlow', 'التدفق النقدي'), data.summary.balance, 'text-brand-blue', 'bg-brand-blue/10 border-brand-blue/20']
  ];

  return (
    <div className="p-4 pt-8 animate-fade-in space-y-6">
      
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-brand-blue text-sm font-medium mb-1 tracking-wide">{t('analytics.overview', 'نظرة عامة')}</p>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)] tracking-wide">{t('analytics.title', 'التقارير والإحصائيات')}</h1>
        </div>
        <button onClick={exportReport} className="flex items-center gap-2 bg-brand-blue/20 text-brand-blue border border-brand-blue/30 px-3 py-2 rounded-xl text-sm hover:bg-brand-blue/30 transition shadow-lg">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline font-medium">{t('analytics.export', 'تصدير')}</span>
        </button>
      </header>

      {/* Filters Toggle Button for Mobile */}
      <button 
        onClick={() => setShowFilters(!showFilters)}
        className="w-full flex items-center justify-center gap-2 glass-panel p-3 text-[var(--color-text-main)] md:hidden font-medium"
      >
        {showFilters ? <X className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
        {showFilters ? t('analytics.hideFilters', 'إخفاء الفلاتر') : t('analytics.filterResults', 'تصفية النتائج')}
      </button>

      {/* Filters Section */}
      <form 
        className={`${showFilters ? 'block' : 'hidden'} md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 glass-panel p-5 rounded-[2rem]`}
        onSubmit={handleSearchSubmit}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--color-text-muted)] px-1">{t('analytics.fromDate', 'من تاريخ')}</label>
          <input type="date" className="field" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })}/>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--color-text-muted)] px-1">{t('analytics.toDate', 'إلى تاريخ')}</label>
          <input type="date" className="field" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })}/>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--color-text-muted)] px-1">{t('analytics.account', 'الحساب')}</label>
          <select 
            className="field"
            value={filters.account} 
            onChange={(e) => setFilters({ ...filters, account: e.target.value })}
          >
            <option value="" className="bg-[var(--color-surface)]">{t('analytics.allAccounts', 'كل الحسابات')}</option>
            {accounts.map(acc => (
              <option key={acc._id} value={acc._id} className="bg-[var(--color-surface)]">{acc.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[var(--color-text-muted)] px-1">{t('analytics.category', 'الفئة')}</label>
          <select 
            className="field"
            value={filters.category} 
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="" className="bg-[var(--color-surface)]">{t('analytics.allCategories', 'كل الفئات')}</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id} className="bg-[var(--color-surface)]">{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
           <label className="text-xs font-medium text-[var(--color-text-muted)] px-1">{t('analytics.searchLabel', 'بحث')}</label>
           <div className="flex gap-2">
             <input 
               type="text" 
               placeholder={t('analytics.searchPlaceholder', 'بحث بالاسم...')}
               className="field"
               value={filters.search} 
               onChange={(e) => setFilters({ ...filters, search: e.target.value })}
             />
             <button type="submit" className="bg-brand-blue text-[var(--color-text-main)] rounded-xl px-4 font-medium hover:bg-brand-blue/90 transition shadow-lg">
               {t('analytics.searchBtn', 'بحث')}
             </button>
           </div>
        </div>
      </form>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(([title, value, color, bgClass]) => (
          <div className={`glass-panel border-white/10 p-6 flex flex-col justify-center items-center text-center ${bgClass} rounded-[2rem] shadow-lg`} key={title}>
            <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2">{title}</p>
            <p className={`text-2xl font-bold tracking-wider ${color}`}>{money(value)}</p>
          </div>
        ))}
      </section>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. Monthly Trend (Line) */}
        <ChartCard title={t('analytics.monthlyTrend', 'الاتجاه الشهري (دخل ومصروف)')}>
          <LineChart data={data.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#ffffff12" strokeDasharray="3 3"/>
            <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
            <Line type="monotone" dataKey="income" name={t('analytics.income', 'الدخل')} stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
            <Line type="monotone" dataKey="expense" name={t('analytics.expense', 'المصروف')} stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }} />
          </LineChart>
        </ChartCard>

        {/* 2. New: Net Balance Trend (Area) */}
        <ChartCard title={t('analytics.netCashFlow', 'صافي التدفق النقدي (شهرياً)')}>
          <AreaChart data={data.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ffffff12" strokeDasharray="3 3"/>
            <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
            <Area type="monotone" dataKey="balance" name={t('analytics.net', 'الصافي')} stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
          </AreaChart>
        </ChartCard>

        {/* 3. Category Distribution (Pie) */}
        <ChartCard title={t('analytics.categoryDistribution', 'توزيع المصروفات حسب الفئة')}>
          <PieChart>
            <Pie data={data.categories} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
              {data.categories.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} stroke="rgba(0,0,0,0)"/>)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
          </PieChart>
        </ChartCard>

        {/* 4. New: Top Accounts Distribution (Bar) */}
        <ChartCard title={t('analytics.accountDistribution', 'توزيع الرصيد على الحسابات')}>
          <BarChart data={data.accounts} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
            <CartesianGrid stroke="#ffffff12" strokeDasharray="3 3"/>
            <XAxis type="number" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
            <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} cursor={{fill: '#ffffff10'}} />
            <Bar dataKey="amount" name={t('analytics.balance', 'الرصيد')} radius={[0, 4, 4, 0]}>
              {data.accounts.map((entry, index) => (
                <Cell key={entry.name} fill={entry.amount >= 0 ? '#10b981' : '#f43f5e'} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

      </div>

      {/* Lists / Tables Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ListCard title={t('analytics.topCategories', 'أعلى فئات الصرف')} rows={data.categories} color="text-red-400" money={money} noDataText={t('analytics.noData', 'لا توجد بيانات في هذه الفترة.')} />
        <ListCard title={t('analytics.topAccounts', 'أعلى الحسابات (التدفق الصافي)')} rows={data.accounts} color="text-blue-400" money={money} noDataText={t('analytics.noData', 'لا توجد بيانات في هذه الفترة.')} />
      </div>


    </div>
  );
}

function ChartCard({ title, children }) { 
  return (
    <section className="glass-panel p-5 rounded-[2rem] flex flex-col shadow-lg">
      <h2 className="mb-4 text-lg font-semibold text-[var(--color-text-main)]">{title}</h2>
      <div className="h-64 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  ); 
}

function ListCard({ title, rows, color, money, noDataText }) { 
  return (
    <section className="glass-panel p-6 rounded-[2rem] shadow-lg">
      <h2 className="mb-5 text-lg font-semibold text-[var(--color-text-main)]">{title}</h2>
      <div className="space-y-3">
        {rows.length ? rows.map((row) => (
          <div className="flex justify-between items-center bg-black/20 p-3.5 rounded-xl border border-white/5 hover:bg-black/30 transition-colors" key={row.name}>
            <span className="text-sm text-[var(--color-text-main)] font-medium">{row.name}</span>
            <span className={`text-sm font-bold tracking-wide ${color}`}>{money(row.amount)}</span>
          </div>
        )) : <p className="text-sm text-[var(--color-text-muted)] text-center py-4">{noDataText}</p>}
      </div>
    </section>
  ); 
}
