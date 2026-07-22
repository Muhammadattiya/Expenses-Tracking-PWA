import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, TrendingUp, Settings, User, ChartNoAxesCombined, HandCoins } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'الرئيسية' },
    { path: '/add', icon: PlusCircle, label: 'إضافة' },
    { path: '/investments', icon: TrendingUp, label: 'استثمار' },
    { path: '/analytics', icon: ChartNoAxesCombined, label: '\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631' },
    { path: '/receivables', icon: HandCoins, label: '\u0627\u0644\u0645\u0633\u062a\u062d\u0642\u0627\u062a' },
    { path: '/settings', icon: Settings, label: 'الإعدادات' },
    { path: '/profile', icon: User, label: 'حسابي' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
      <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 flex justify-around items-center gap-1 overflow-x-auto shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
        
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex min-w-13 flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 ${
                isActive 
                  ? 'text-blue-500 bg-white/10' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5' 
              }`
            }
          >
            {/* الحل هنا: تمرير isActive كمحتوى داخلي للـ NavLink */}
            {({ isActive }) => (
              <>
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

      </div>
    </div>
  );
}
