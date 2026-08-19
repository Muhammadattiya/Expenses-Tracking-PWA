import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Target, CalendarClock } from 'lucide-react';
import { getIconComponent } from '../IconPicker';

export default function PlanningTab({ budgets, bills, money }) {
  const { t } = useLanguage();

  return (
    <div className="space-y-10 animate-fade-in pb-10">
      
      <section className="bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] p-6 lg:p-8 rounded-[2.5rem]">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-brand-blue/20 rounded-2xl text-brand-blue">
            <Target className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-main)] tracking-wide">{t('nav.budgets', 'Budgets')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets?.length ? budgets.map((b) => {
            const spent = b.spent || 0;
            const percentage = Math.min((spent / b.amount) * 100, 100);
            const isDanger = percentage > 90;
            const CatIcon = b.category?.icon ? getIconComponent(b.category.icon, 'Layers') : Target;
            const color = b.category?.color || '#3b82f6';
            
            return (
              <div className="bg-black/10 shadow-inner p-6 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-colors group relative overflow-hidden" key={b._id}>
                {/* Background glow */}
                <div 
                  className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"
                  style={{ backgroundColor: color }}
                />
                
                <div className="flex items-start justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: `${color}20`, color: color }}
                    >
                      <CatIcon size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--color-text-main)] truncate max-w-[150px]">
                        {b.category?.name || t('analytics.allCategories', 'All Categories')}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{b.period}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 relative z-10">
                  <div className="flex justify-between items-baseline">
                     <span className="text-2xl font-bold tabular-nums tracking-tight text-[var(--color-text-main)]">
                       {money(spent)}
                     </span>
                     <span className="text-sm font-medium text-[var(--color-text-muted)]">
                       / {money(b.amount)}
                     </span>
                  </div>
                  
                  <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out`}
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: isDanger ? '#f43f5e' : color,
                        boxShadow: `0 0 10px ${isDanger ? '#f43f5e' : color}80`
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full py-12 text-center">
              <p className="text-[var(--color-text-muted)]">{t('analytics.noData', 'No data')}</p>
            </div>
          )}
        </div>
      </section>
      
    </div>
  );
}
