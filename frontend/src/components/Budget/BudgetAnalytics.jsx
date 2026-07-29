import React, { useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { BarChart2 } from 'lucide-react';

export default function BudgetAnalytics({ budgets, spentData, categories }) {
  const { t } = useLanguage();

  const chartData = useMemo(() => {
    if (!budgets || budgets.length === 0) return [];
    
    return budgets.map(b => {
      const cat = categories.find(c => c._id === (typeof b.category === 'object' ? b.category._id : b.category));
      const amount = b.amount || 0;
      const spent = spentData[b._id] || 0;
      const utilization = amount > 0 ? (spent / amount) * 100 : 0;
      
      let color = '#3b82f6'; // blue
      if (utilization >= 100) color = '#ef4444'; // red
      else if (utilization >= 85) color = '#f97316'; // orange
      else if (utilization >= 70) color = '#eab308'; // yellow
      
      return {
        name: cat ? cat.name : 'Unknown',
        amount,
        spent,
        color,
        utilization
      };
    }).sort((a, b) => b.utilization - a.utilization);
  }, [budgets, spentData, categories]);

  if (chartData.length === 0) return null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 backdrop-blur-md border border-white/10 p-3 rounded-2xl shadow-xl">
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.fill }}>
              {entry.name === 'amount' ? t('budgets.amount') : t('budgets.spent')}: {entry.value.toLocaleString()} {t('nav.currency')}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mb-8"
    >
      <div className="bg-white/5 dark:bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-xl shadow-lg">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <BarChart2 className="text-brand-blue" />
          {t('budgets.budgetUtilization')}
        </h2>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barSize={12}
            >
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => value > 1000 ? `${(value/1000).toFixed(1)}k` : value}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Legend wrapperStyle={{ fontSize: '12px', opacity: 0.8 }} />
              
              <Bar dataKey="amount" name={t('budgets.amount')} fill="rgba(255,255,255,0.2)" radius={[10, 10, 10, 10]} />
              <Bar dataKey="spent" name={t('budgets.spent')} radius={[10, 10, 10, 10]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
