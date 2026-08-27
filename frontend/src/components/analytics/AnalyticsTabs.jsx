import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

export default function AnalyticsTabs({ activeTab, setActiveTab }) {
  const { t } = useLanguage();

  const tabs = [
    { id: 'overview', label: t('analytics.tabs.overview', 'Overview') },
    { id: 'spending', label: t('analytics.tabs.spending', 'Spending') },
    { id: 'income', label: t('analytics.tabs.income', 'Income') },
    { id: 'planning', label: t('analytics.tabs.planning', 'Planning') },
    { id: 'assets', label: t('analytics.tabs.assets', 'Assets') },
    { id: 'liabilities', label: t('analytics.tabs.liabilities', 'Liabilities') },
    { id: 'insights', label: t('analytics.tabs.insights', 'Insights') }
  ];

  return (
    <div className="w-full flex justify-center mt-4 mb-8">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 relative p-1.5 bg-black/20 backdrop-blur-[40px] border border-white/10 shadow-inner rounded-2xl w-full lg:w-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 lg:flex-none min-w-[120px] py-3.5 px-4 text-sm font-bold rounded-xl transition-colors duration-300 z-10 ${activeTab === tab.id ? 'text-white' : 'text-white/50 hover:text-white'}`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="analyticsTabs"
                className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
