import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Target, PiggyBank, ShieldCheck, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

function PlanningTabs({ activeTab, setActiveTab }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);

  const tabs = [
    { id: 'budgets', label: t('planning.tabs.budgets') || (isRTL ? 'الميزانيات' : 'Budgets'), icon: Target },
    { id: 'savings', label: t('planning.tabs.savings') || (isRTL ? 'المدخرات' : 'Savings'), icon: PiggyBank },
    { id: 'emergency', label: t('planning.tabs.emergency') || (isRTL ? 'درع الطوارئ' : 'Emergency Fund'), icon: ShieldCheck },
    { id: 'plans', label: t('planning.tabs.plans') || (isRTL ? 'الخطط والأهداف' : 'Plans & Goals'), icon: Sparkles }
  ];

  useEffect(() => {
    const activeBtn = document.getElementById(`planning-tab-${activeTab}`);
    if (activeBtn && containerRef.current) {
      activeBtn.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeTab, reduceMotion]);

  const handleSelect = (id) => {
    triggerHaptic('selection');
    setActiveTab(id);
  };

  const handleKeyDown = (e, currentIndex) => {
    const isNext = isRTL ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
    const isPrev = isRTL ? e.key === 'ArrowRight' : e.key === 'ArrowLeft';

    if (isNext) {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      handleSelect(tabs[nextIndex].id);
      document.getElementById(`planning-tab-${tabs[nextIndex].id}`)?.focus();
    } else if (isPrev) {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      handleSelect(tabs[prevIndex].id);
      document.getElementById(`planning-tab-${tabs[prevIndex].id}`)?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      handleSelect(tabs[0].id);
      document.getElementById(`planning-tab-${tabs[0].id}`)?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      handleSelect(tabs[tabs.length - 1].id);
      document.getElementById(`planning-tab-${tabs[tabs.length - 1].id}`)?.focus();
    }
  };

  return (
    <div className="w-full flex justify-center mt-2 md:mt-4 mb-6 md:mb-8">
      <div 
        ref={containerRef}
        role="tablist"
        aria-label={t('planning.title') || 'Planning Hub'}
        className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto hide-scrollbar scrollbar-hide no-scrollbar relative p-1.5 liquidglass border border-white/5 shadow-inner rounded-full max-w-full md:max-w-2xl overscroll-x-contain scroll-smooth snap-x snap-mandatory px-1.5 sm:px-2.5 [&::-webkit-scrollbar]:hidden mx-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              id={`planning-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              onClick={() => handleSelect(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`relative shrink-0 min-h-[42px] sm:min-h-[44px] py-2 sm:py-2.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold rounded-full transition-colors duration-300 z-10 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap snap-start outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70 ${
                isActive ? 'text-[#E8C5A8] drop-shadow-sm' : 'text-white/60 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="planningActiveTabPill"
                  className="absolute inset-0 bg-[#8D6346]/25 border border-[#8D6346]/40 rounded-full shadow-[0_2px_12px_rgba(141,99,70,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Icon size={16} className="relative z-10 shrink-0" />
              <span className="relative z-10 whitespace-nowrap">
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(PlanningTabs);
