import React, { useRef, useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function AnalyticsTabs({ activeTab, setActiveTab }) {
  const { t, lang } = useLanguage();
  const containerRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({});

  const tabs = [
    { id: 'overview', label: t('analytics.tabs.overview', 'Overview') },
    { id: 'spending', label: t('analytics.tabs.spending', 'Spending') },
    { id: 'planning', label: t('analytics.tabs.planning', 'Planning') },
    { id: 'assets', label: t('analytics.tabs.assets', 'Assets') },
    { id: 'liabilities', label: t('analytics.tabs.liabilities', 'Liabilities') },
    { id: 'insights', label: t('analytics.tabs.insights', 'Insights') }
  ];

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Find the active button
    const activeBtn = containerRef.current.querySelector(`[data-tab-id="${activeTab}"]`);
    if (activeBtn) {
      setIndicatorStyle({
        width: `${activeBtn.offsetWidth}px`,
        transform: `translateX(${activeBtn.offsetLeft}px)`
      });
    }
  }, [activeTab, lang]);

  return (
    <div className="w-full flex justify-center mt-4 mb-8 relative z-0">
      <div 
        ref={containerRef}
        className="relative flex items-center p-1.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-x-auto scrollbar-hide shadow-inner w-full lg:w-auto"
      >
        <div 
          className="absolute top-1.5 bottom-1.5 left-0 bg-gradient-to-b from-brand-blue/80 to-brand-blue rounded-full shadow-lg transition-all duration-500 ease-out z-0"
          style={indicatorStyle}
        />
        
        {tabs.map(tab => (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative z-10 px-6 py-3 rounded-full whitespace-nowrap text-sm font-bold transition-all duration-300 ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
