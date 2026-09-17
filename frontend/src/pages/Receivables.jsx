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
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }} 
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="w-full pb-40 max-w-7xl mx-auto pt-6 sm:pt-2 px-4 sm:px-6"
    >
      {/* Background Glowing Ellipses (Matching Onboarding theme) */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#100E11] overflow-hidden">
        <div className="absolute top-[-50px] left-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-40 blur-[120px] rounded-full" />
        <div className="absolute top-[30%] right-[-50px] w-[250px] h-[250px] bg-[#8D6346] opacity-30 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-50px] left-[-50px] w-[300px] h-[300px] bg-[#8D6346] opacity-30 blur-[150px] rounded-full" />
      </div>
      <header className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-['Exo_2'] font-bold tracking-tight text-white/95 drop-shadow-sm">
            {t('debts.title')}
          </h1>
          <p className="text-white/50 text-sm sm:text-base drop-shadow-sm mt-0.5">
            {t('debts.subtitle')}
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex justify-center mb-8">
        <div 
          role="tablist" 
          aria-label={t('debts.title')}
          className="flex p-1 bg-black/20 backdrop-blur-[10px] border border-white/5 shadow-inner rounded-full h-12 items-center w-full max-w-sm sm:w-fit"
        >
          {['group', 'personal'].map((tab) => (
            <button
              key={tab}
              role="tab"
              id={`tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls={`panel-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 sm:flex-none px-6 h-full min-h-[44px] flex items-center justify-center text-sm sm:text-[15px] font-semibold rounded-full transition-colors duration-300 z-10 ${activeTab === tab ? 'text-white' : 'text-white/50 hover:text-white'}`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="receivablesTab"
                  className="absolute inset-0 bg-[#8D6346]/20 border border-[#8D6346]/30 rounded-full shadow-sm"
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

      <main className="w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
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
