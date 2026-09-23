import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import PlanningTabs from '../components/planning/PlanningTabs';
import BudgetsTab from '../components/planning/BudgetsTab';
import SavingsTab from '../components/planning/SavingsTab';
import EmergencyFundTab from '../components/planning/EmergencyFundTab';
import PlansTab from '../components/planning/PlansTab';

const VALID_TABS = ['budgets', 'savings', 'emergency', 'plans'];

export default function Planning() {
  const { t, lang } = useLanguage();
  const isAr = lang === 'ar';
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab = VALID_TABS.includes(tabParam) ? tabParam : 'budgets';

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab }, { replace: true });
  };

  return (
    <div className="min-h-screen text-white p-4 md:p-6 pb-28 max-w-6xl mx-auto relative overflow-hidden">
      {/* Ambient Copper Glow Blurs */}
      <div 
        aria-hidden="true" 
        className="fixed top-20 -right-24 w-96 h-96 bg-[#8D6346] rounded-full blur-[140px] opacity-25 pointer-events-none -z-10" 
      />
      <div 
        aria-hidden="true" 
        className="fixed bottom-24 -left-24 w-96 h-96 bg-[#8D6346] rounded-full blur-[160px] opacity-20 pointer-events-none -z-10" 
      />

      {/* Page Header */}
      <header className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8D6346]/15 border border-[#8D6346]/30 text-[#E8C5A8] text-xs font-semibold mb-2">
              <Compass size={14} className="shrink-0 text-[#E8C5A8]" />
              <span>{t('planning.title') || (isAr ? 'التخطيط المالي' : 'Financial Planning')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white/95">
              {t('planning.title') || (isAr ? 'التخطيط المالي' : 'Financial Planning')}
            </h1>
            <p className="text-xs sm:text-sm text-white/50 mt-1 max-w-xl">
              {t('planning.subtitle') || (isAr ? 'الميزانيات، حسابات الادخار، درع الطوارئ، والأهداف الاستراتيجية' : 'Budgets, savings accounts, emergency resilience, and strategic goals')}
            </p>
          </div>
        </div>
      </header>

      {/* Segmented Planning Tabs */}
      <PlanningTabs activeTab={activeTab} setActiveTab={handleTabChange} />

      {/* Tab Panels */}
      <main>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`panel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`planning-tab-${activeTab}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            {activeTab === 'budgets' && <BudgetsTab />}
            {activeTab === 'savings' && <SavingsTab />}
            {activeTab === 'emergency' && <EmergencyFundTab />}
            {activeTab === 'plans' && <PlansTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
