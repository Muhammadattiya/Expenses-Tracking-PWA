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
      {/* Ambient Copper Background exactly like Dashboard */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#141115]">
        <div className="absolute top-[340px] right-[-50px] w-[233px] h-[233px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
        <div className="absolute top-[28px] left-[-74px] w-[295px] h-[295px] bg-[#8D6346] rounded-full blur-[120px] opacity-60" />
      </div>
      <header className="mb-6 flex flex-col gap-1">
        <h1 className="text-[24px] font-['Exo_2'] font-semibold tracking-tight text-white/90 drop-shadow-sm">
          {t('debts.title')}
        </h1>
        <p className="text-white/50 text-[16px] drop-shadow-sm">
          {t('debts.subtitle')}
        </p>
      </header>

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <div className="flex p-1 liquidglass !bg-[#8D6346]/15 rounded-[30px] w-fit">
          {['group', 'personal'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-6 py-2.5 text-[15px] font-medium rounded-[24px] transition-colors duration-300 z-10 ${activeTab === tab ? 'text-white' : 'text-white/50 hover:text-white'}`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="receivablesTab"
                  className="absolute inset-0 bg-white/10 border border-white/5 rounded-[24px] shadow-sm"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">
                {tab === 'group' ? t('debts.tabGroupExpenses') : t('debts.tabPersonalDebts')}
              </span>
            </button>
          ))}
        </div>
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
