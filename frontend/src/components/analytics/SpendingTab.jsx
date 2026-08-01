import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, AreaChart, Area, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLanguage } from '../../contexts/LanguageContext';

const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e', '#10b981', '#ec4899', '#06b6d4', '#84cc16'];

function ChartCard({ title, children, className = '' }) { 
  return (
    <section className={`glass-panel p-6 rounded-[2rem] flex flex-col shadow-2xl border border-white/5 bg-black/20 hover:bg-black/30 transition-colors duration-500 ${className}`}>
      <h2 className="mb-6 text-xl font-bold text-[var(--color-text-main)] tracking-wide">{title}</h2>
      <div className="h-72 w-full min-h-[300px]">
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

  const totalExpense = useMemo(() => {
    return data?.categories?.reduce((sum, cat) => sum + cat.amount, 0) || 0;
  }, [data]);

  if (!data || !data.monthly) return null;

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-10">
      
      {/* Area Chart: Net Cash Flow */}
      <ChartCard title={t('analytics.netCashFlow', 'Net Cash Flow (Monthly)')}>
        <AreaChart data={data.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} dy={10} />
          <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} dx={-10} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} 
            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
            formatter={(value) => [money(value), t('analytics.net', 'Net')]}
          />
          <Area type="monotone" dataKey="balance" name={t('analytics.net', 'Net')} stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorBalance)" activeDot={{ r: 8, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
        </AreaChart>
      </ChartCard>

      {/* Line Chart: Income vs Expense */}
      <ChartCard title={t('analytics.monthlyTrend', 'Monthly Trend (Income & Expenses)')}>
        <LineChart data={data.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#ffffff10" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} dy={10} />
          <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/1000}k`} dx={-10} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
            formatter={(value) => [money(value)]}
          />
          <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px', fontWeight: '500' }} iconType="circle" />
          <Line type="monotone" dataKey="income" name={t('analytics.income', 'Income')} stroke="#10b981" strokeWidth={4} dot={{ r: 5, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
          <Line type="monotone" dataKey="expense" name={t('analytics.expense', 'Expense')} stroke="#f43f5e" strokeWidth={4} dot={{ r: 5, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 8, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2 }} />
        </LineChart>
      </ChartCard>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartCard title={t('analytics.categoryDistribution', 'Expense Distribution')} className="h-full">
          <PieChart>
            <Pie data={data.categories} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5}>
              {data.categories.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} stroke="rgba(0,0,0,0)"/>)}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '16px' }} 
              itemStyle={{ color: '#fff', fontWeight: 'bold' }} 
              formatter={(value) => [money(value)]}
            />
          </PieChart>
        </ChartCard>

        <section className="glass-panel p-6 rounded-[2rem] shadow-2xl border border-white/5 bg-black/20 flex flex-col">
          <h2 className="mb-6 text-xl font-bold text-[var(--color-text-main)] tracking-wide sticky top-0 bg-black/40 backdrop-blur-md p-2 rounded-xl z-10">{t('analytics.topCategories', 'Top Categories')}</h2>
          <div className="space-y-5 px-2">
            {data.categories.map((cat, index) => {
              const percentage = totalExpense > 0 ? ((cat.amount / totalExpense) * 100).toFixed(1) : 0;
              const color = colors[index % colors.length];
              return (
                <div key={cat.name} className="group">
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-bold text-[var(--color-text-main)]">{cat.name}</span>
                    <span className="text-sm font-bold tabular-nums" style={{ color }}>{money(cat.amount)}</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden border border-white/5 shadow-inner">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out group-hover:brightness-125" 
                      style={{ width: `${percentage}%`, backgroundColor: color, boxShadow: `0 0 10px ${color}80` }}
                    />
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-[10px] text-[var(--color-text-muted)] font-medium">{percentage}%</span>
                  </div>
                </div>
              );
            })}
            {data.categories.length === 0 && (
              <div className="text-center py-10 text-[var(--color-text-muted)]">{t('analytics.noData', 'No data')}</div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
