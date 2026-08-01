import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import GroupExpenses from '../components/debts/GroupExpenses';
import PersonalDebts from '../components/debts/PersonalDebts';

export default function Receivables() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('group'); // 'group' | 'personal'

  return (
    <div className="p-4 pt-8 animate-fade-in space-y-8 pb-24 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-main)] mb-2">
          {t('debts.title', 'الديون والمستحقات')}
        </h1>
        <p className="text-[var(--color-text-muted)] text-sm">
          {t('debts.subtitle', 'Track split bills and personal debts')}
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        <button
          onClick={() => setActiveTab('group')}
          className={`flex-1 min-w-[140px] py-3.5 px-4 text-sm font-bold rounded-2xl transition-all duration-300 ${activeTab === 'group' ? 'bg-brand-blue text-[var(--color-text-main)] shadow-lg shadow-brand-blue/20 scale-[1.02]' : 'bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-text-main)] border border-white/5'}`}
        >
          {t('debts.tabGroupExpenses', 'مصروفات مشتركة')}
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`flex-1 min-w-[140px] py-3.5 px-4 text-sm font-bold rounded-2xl transition-all duration-300 ${activeTab === 'personal' ? 'bg-brand-blue text-[var(--color-text-main)] shadow-lg shadow-brand-blue/20 scale-[1.02]' : 'bg-white/5 text-[var(--color-text-muted)] hover:bg-white/10 hover:text-[var(--color-text-main)] border border-white/5'}`}
        >
          {t('debts.tabPersonalDebts', 'ديون شخصية')}
        </button>
      </div>

      <main className="mt-2">
        {activeTab === 'group' ? <GroupExpenses /> : <PersonalDebts />}
      </main>
    </div>
  );
}
