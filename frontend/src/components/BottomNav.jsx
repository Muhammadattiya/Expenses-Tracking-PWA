import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, TrendingUp, Settings, User, ChartNoAxesCombined, HandCoins, CalendarClock, Target } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function BottomNav() {
  const { t } = useLanguage();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { path: '/add', icon: PlusCircle, label: t('nav.add') },
    { path: '/investments', icon: TrendingUp, label: t('nav.investments') },
    { path: '/analytics', icon: ChartNoAxesCombined, label: t('nav.analytics') },
    { path: '/receivables', icon: HandCoins, label: t('nav.receivables') },
    { path: '/bills', icon: CalendarClock, label: t('nav.bills') },
    { path: '/budgets', icon: Target, label: t('nav.budgets') },
    { path: '/settings', icon: Settings, label: t('nav.settings') },
    { path: '/profile', icon: User, label: t('nav.profile') }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 flex justify-center pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div dir="rtl" className="bg-black/15 dark:bg-black/40 backdrop-blur-2xl border border-white/10 dark:border-white/5 rounded-[2rem] w-full max-w-md mx-auto shadow-[0_8px_32px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-x-auto scrollbar-hide">
        <div className="flex justify-between items-center gap-1 px-2 py-2.5 min-w-max">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all duration-300 w-16 shrink-0 ${isActive
                  ? 'text-[var(--color-text-main)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${isActive ? 'bg-[var(--color-border)]' : ''}`}>
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`} />
                  </div>
                  {isActive ? (
                    <span className="text-[9px] font-bold tracking-wide animate-fade-in">{item.label}</span>
                  ) : (
                    <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
