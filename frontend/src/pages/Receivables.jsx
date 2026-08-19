import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import GroupExpenses from '../components/debts/GroupExpenses';
import PersonalDebts from '../components/debts/PersonalDebts';

export default function Receivables() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('group'); // 'group' | 'personal'

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="p-4 pt-8 space-y-8 pb-24 max-w-7xl mx-auto"
    >
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 drop-shadow-sm">
          {t('debts.title', 'الديون والمستحقات')}
        </h1>
        <p className="text-white/50 text-sm drop-shadow-sm">
          {t('debts.subtitle', 'Track split bills and personal debts')}
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 relative p-1 bg-black/20 backdrop-blur-[40px] border border-white/10 shadow-inner rounded-2xl">
        {['group', 'personal'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative flex-1 min-w-[140px] py-3.5 px-4 text-sm font-bold rounded-xl transition-colors duration-300 z-10 ${activeTab === tab ? 'text-white' : 'text-white/50 hover:text-white'}`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="receivablesTab"
                className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">
              {tab === 'group' ? t('debts.tabGroupExpenses', 'مصروفات مشتركة') : t('debts.tabPersonalDebts', 'ديون شخصية')}
            </span>
          </button>
        ))}
      </div>

      <main className="mt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          >
            {activeTab === 'group' ? <GroupExpenses /> : <PersonalDebts />}
          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
  );
}
