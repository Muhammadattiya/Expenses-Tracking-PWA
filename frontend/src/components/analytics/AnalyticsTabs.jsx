import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

function AnalyticsTabsComponent({ activeTab, setActiveTab }) {
  const { t, lang } = useLanguage();
  const isRTL = lang === 'ar';
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);

  const tabs = [
    { id: 'overview', label: t('analytics.tabs.overview') },
    { id: 'spending', label: t('analytics.tabs.spending') },
    { id: 'income', label: t('analytics.tabs.income') },
    { id: 'planning', label: t('analytics.tabs.planning') },
    { id: 'assets', label: t('analytics.tabs.assets') },
    { id: 'liabilities', label: t('analytics.tabs.liabilities') },
    { id: 'insights', label: t('analytics.tabs.insights') }
  ];

  useEffect(() => {
    const activeBtn = document.getElementById(`tab-${activeTab}`);
    if (activeBtn && containerRef.current) {
      // Smoothly scroll active tab into view in container
      activeBtn.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeTab, reduceMotion]);

  const handleKeyDown = (e, currentIndex) => {
    const isNext = isRTL ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
    const isPrev = isRTL ? e.key === 'ArrowRight' : e.key === 'ArrowLeft';

    if (isNext) {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      setActiveTab(tabs[nextIndex].id);
      document.getElementById(`tab-${tabs[nextIndex].id}`)?.focus();
    } else if (isPrev) {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      setActiveTab(tabs[prevIndex].id);
      document.getElementById(`tab-${tabs[prevIndex].id}`)?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab(tabs[0].id);
      document.getElementById(`tab-${tabs[0].id}`)?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveTab(tabs[tabs.length - 1].id);
      document.getElementById(`tab-${tabs[tabs.length - 1].id}`)?.focus();
    }
  };

  return (
    <div className="w-full flex justify-center mt-2 md:mt-4 mb-6 md:mb-8">
      <div 
        ref={containerRef}
        role="tablist"
        aria-label={t('analytics.tabsTitle')}
        className="flex gap-2 overflow-x-auto hide-scrollbar scrollbar-hide no-scrollbar relative p-[5px] liquidglass border border-white/5 shadow-inner rounded-[85px] w-full lg:w-auto overscroll-x-contain scroll-smooth snap-x snap-mandatory px-3 lg:px-[5px] [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] rtl:[mask-image:linear-gradient(to_left,transparent,black_16px,black_calc(100%-16px),transparent)] lg:[mask-image:none] lg:snap-none [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab, idx) => (
          <motion.button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            whileTap={reduceMotion ? undefined : { scale: 0.96 }}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`relative flex-1 lg:flex-none min-w-[110px] sm:min-w-[120px] min-h-[44px] py-3 px-3.5 sm:px-4 text-xs sm:text-sm font-bold ltr:tracking-wide rtl:tracking-normal rounded-[80px] transition-colors duration-300 z-10 flex items-center justify-center whitespace-nowrap snap-start outline-none focus-visible:ring-2 focus-visible:ring-[#E8C5A8]/70 ${activeTab === tab.id ? 'text-[#E8C5A8] drop-shadow-sm' : 'text-white/50 hover:text-white'}`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="analyticsTabs"
                className="absolute inset-0 bg-[#8D6346]/25 border border-[#8D6346]/40 rounded-[80px] shadow-[0_2px_12px_rgba(141,99,70,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)]"
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span className="relative z-10">
              {tab.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default React.memo(AnalyticsTabsComponent);
