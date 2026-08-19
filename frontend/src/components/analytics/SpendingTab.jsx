import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, AreaChart, Area, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#10b981', '#ec4899', '#06b6d4', '#84cc16'];

function ChartCard({ title, children, className = '' }) { 
  return (
    <section className={`relative overflow-hidden bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem] group transition-all duration-500 ${className}`}>
      {/* Background glow effects */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-blue/10 rounded-full blur-3xl group-hover:bg-brand-blue/20 transition-colors duration-700 pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-brand-purple/10 rounded-full blur-3xl group-hover:bg-brand-purple/20 transition-colors duration-700 pointer-events-none" />
      
      <h2 className="mb-8 text-xl font-bold text-white tracking-wide relative z-10">
         {title}
      </h2>
      <div className="h-72 w-full min-h-[300px] relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  ); 
}

export default function SpendingTab({ data }) {
  const { t, lang } = useLanguage();

  const money = (value) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value || 0);

  const totalExpense = data?.summary?.expense || 0;
  const totalIncome = data?.summary?.income || 0;

  if (!data || !data.monthly) return null;

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-10">
      
      {/* Overview Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Expense Card */}
        <section className="relative overflow-hidden bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem] group flex flex-col justify-between min-h-[160px] transition-all duration-500 hover:scale-[1.02] hover:bg-black/30">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-brand-red/10 rounded-full blur-3xl group-hover:bg-brand-red/20 transition-colors duration-700 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-brand-red/10 border border-brand-red/20 flex items-center justify-center shadow-inner">
              <TrendingDown className="w-6 h-6 text-brand-red" />
            </div>
            <h3 className="text-white/70 font-bold text-lg tracking-wide">{t('analytics.expense', 'Expense')}</h3>
          </div>
          <div className="relative z-10">
            <span className="text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight drop-shadow-md">{money(totalExpense)}</span>
          </div>
        </section>

        {/* Income Card */}
        <section className="relative overflow-hidden bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem] group flex flex-col justify-between min-h-[160px] transition-all duration-500 hover:scale-[1.02] hover:bg-black/30">
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-brand-green/10 rounded-full blur-3xl group-hover:bg-brand-green/20 transition-colors duration-700 pointer-events-none" />
          <div className="relative z-10 flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-brand-green/10 border border-brand-green/20 flex items-center justify-center shadow-inner">
              <TrendingUp className="w-6 h-6 text-brand-green" />
            </div>
            <h3 className="text-white/70 font-bold text-lg tracking-wide">{t('analytics.income', 'Income')}</h3>
          </div>
          <div className="relative z-10">
            <span className="text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight drop-shadow-md">{money(totalIncome)}</span>
          </div>
        </section>

      </div>
      
      {/* Area Chart: Net Cash Flow */}
      <ChartCard title={t('analytics.netCashFlow', 'Net Cash Flow (Monthly)')}>
        <AreaChart data={data.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} dy={10} />
          <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} dx={-10} />
          <Tooltip 
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }} 
            itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '15px' }}
            formatter={(value) => [money(value), t('analytics.net', 'Net')]}
          />
          <Area type="monotone" dataKey="balance" name={t('analytics.net', 'Net')} stroke="#3b82f6" strokeWidth={5} fillOpacity={1} fill="url(#colorBalance)" activeDot={{ r: 8, fill: '#3b82f6', stroke: '#fff', strokeWidth: 3 }} animationDuration={1500} />
        </AreaChart>
      </ChartCard>

      {/* Line Chart: Income vs Expense */}
      <ChartCard title={t('analytics.monthlyTrend', 'Monthly Trend (Income & Expenses)')}>
        <LineChart data={data.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
             <linearGradient id="colorIncome" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
             </linearGradient>
             <linearGradient id="colorExpense" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#fb7185" />
             </linearGradient>
          </defs>
          <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} dy={10} />
          <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} dx={-10} />
          <Tooltip 
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2, strokeDasharray: '3 3' }}
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}
            formatter={(value) => [money(value)]}
          />
          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: 'bold' }} iconType="circle" />
          <Line type="monotone" dataKey="income" name={t('analytics.income', 'Income')} stroke="url(#colorIncome)" strokeWidth={4} dot={{ r: 0 }} activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 3 }} animationDuration={1500} />
          <Line type="monotone" dataKey="expense" name={t('analytics.expense', 'Expense')} stroke="url(#colorExpense)" strokeWidth={4} dot={{ r: 0 }} activeDot={{ r: 8, fill: '#f43f5e', stroke: '#fff', strokeWidth: 3 }} animationDuration={1500} />
        </LineChart>
      </ChartCard>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard title={t('analytics.categoryDistribution', 'Expense Distribution')} className="h-full">
          <PieChart>
            <defs>
              {data.categories.map((entry, index) => {
                const color = colors[index % colors.length];
                return (
                  <linearGradient key={`grad-${index}`} id={`pieGrad-${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={1}/>
                    <stop offset="100%" stopColor={color} stopOpacity={0.6}/>
                  </linearGradient>
                )
              })}
            </defs>
            <Pie data={data.categories} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={8} cornerRadius={10} animationDuration={1500}>
              {data.categories.map((entry, index) => <Cell key={entry.name} fill={`url(#pieGrad-${index})`} stroke="rgba(0,0,0,0)"/>)}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }} 
              itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '15px' }} 
              formatter={(value, name) => [money(value), name]}
            />
          </PieChart>
        </ChartCard>

        {/* Bar Chart: Expenses by Category */}
        <ChartCard title={t('analytics.expensesByCategory', 'Expenses by Category')} className="h-full">
          <BarChart data={data.categories} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
            <defs>
              {data.categories.map((entry, index) => {
                const color = colors[index % colors.length];
                return (
                  <linearGradient key={`barGrad-${index}`} id={`barGrad-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity={0.6}/>
                    <stop offset="100%" stopColor={color} stopOpacity={1}/>
                  </linearGradient>
                )
              })}
            </defs>
            <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} />
            <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} width={80} />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '20px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}
              formatter={(value, name) => [money(value), name]}
            />
            <Bar dataKey="amount" radius={[0, 10, 10, 0]} animationDuration={1500} barSize={20}>
              {data.categories.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`url(#barGrad-${index})`} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <section className="relative overflow-hidden bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 rounded-[2.5rem] flex flex-col group lg:col-span-2">
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-brand-green/10 rounded-full blur-3xl group-hover:bg-brand-green/20 transition-colors duration-700 pointer-events-none" />
          
          <h2 className="mb-6 text-xl font-bold text-white tracking-wide sticky top-0 z-10">{t('analytics.topCategories', 'Top Categories')}</h2>
          <div className="space-y-6 px-2 relative z-10">
            {data.categories.map((cat, index) => {
              const percentage = totalExpense > 0 ? ((cat.amount / totalExpense) * 100).toFixed(1) : 0;
              const color = colors[index % colors.length];
              return (
                <div key={cat.name} className="group/item">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-white group-hover/item:text-[var(--color-text-main)] transition-colors">{cat.name}</span>
                    <span className="text-sm font-black tabular-nums" style={{ color }}>{money(cat.amount)}</span>
                  </div>
                  <div className="w-full bg-black/10 shadow-inner rounded-full h-3 overflow-hidden border border-white/5">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out group-hover/item:brightness-125" 
                      style={{ width: `${percentage}%`, backgroundColor: color, boxShadow: `0 0 15px ${color}90` }}
                    />
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-[10px] text-white/50 font-bold tracking-widest">{percentage}%</span>
                  </div>
                </div>
              );
            })}
            {data.categories.length === 0 && (
              <div className="text-center py-10 text-white/40 font-medium tracking-wide">{t('analytics.noData', 'No data')}</div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
