import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';

export default function AnalyticsTabs({ activeTab, setActiveTab }) {
  const { t } = useLanguage();

  const tabs = [
    { id: 'overview', label: t('analytics.tabs.overview') },
    { id: 'spending', label: t('analytics.tabs.spending') },
    { id: 'income', label: t('analytics.tabs.income') },
    { id: 'planning', label: t('analytics.tabs.planning') },
    { id: 'assets', label: t('analytics.tabs.assets') },
    { id: 'liabilities', label: t('analytics.tabs.liabilities') },
    { id: 'insights', label: t('analytics.tabs.insights') }
  ];

  return (
    <div className="w-full flex justify-center mt-4 mb-8">
      <div className="flex gap-2 overflow-x-auto hide-scrollbar relative p-[5px] liquidglass border border-white/5 shadow-inner rounded-[85px] w-full lg:w-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 lg:flex-none min-w-[120px] py-3.5 px-4 text-sm font-bold rounded-[80px] transition-colors duration-300 z-10 ${activeTab === tab.id ? 'text-white' : 'text-white/50 hover:text-white'}`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="analyticsTabs"
                className="absolute inset-0 bg-white/10 border border-white/20 rounded-[80px] shadow-[0_0_15px_rgba(255,255,255,0.1)]"
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
