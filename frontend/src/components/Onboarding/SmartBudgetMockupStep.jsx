import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SmartBudgetMockupStep({ stepData }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const [budgetState, setBudgetState] = useState('suggesting'); // idle, analyzing, suggesting, applied
  const timersRef = useRef([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(id => {
      clearTimeout(id);
      clearInterval(id);
    });
    timersRef.current = [];
  };

  const startSimulation = () => {
    clearAllTimers();
    setBudgetState('analyzing');

    const suggestTimer = setTimeout(() => {
      setBudgetState('applied');
      const resetTimer = setTimeout(() => {
        setBudgetState('suggesting');
      }, 4000);
      timersRef.current.push(resetTimer);
    }, 1200);

    timersRef.current.push(suggestTimer);
  };

  useEffect(() => {
    return clearAllTimers;
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 pt-12 pb-12 px-4 sm:px-6 relative z-10 items-center justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Interactive Mockup Container */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative w-full pt-2">
        {/* Mockup Phone Frame */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="relative z-10 w-full max-w-[310px] h-[270px] bg-[#2B2321]/50 backdrop-blur-[32px] border border-white/20 rounded-[2.2rem] shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] overflow-hidden flex flex-col justify-between"
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#8D6346]/40 via-[#E8C5A8]/15 to-transparent blur-2xl rounded-full -z-10" />

          {/* Top Speaker / Dynamic Island */}
          <div className="h-6 w-full flex items-center justify-center pt-2 relative z-20">
            <div className="w-24 h-3 rounded-full bg-black/50 border border-white/10 flex items-center justify-center gap-1.5 px-2">
              <span className="size-1 rounded-full bg-[#8D6346] animate-pulse" />
              <span className="text-[8px] font-bold text-white/70 tracking-wider">AI BUDGETS</span>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-3.5 flex flex-col justify-center overflow-hidden relative z-10 w-full">
            <AnimatePresence mode="wait">
              {budgetState === 'analyzing' ? (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center justify-center gap-2 py-4 z-20"
                >
                  <Sparkles size={32} className="text-[#E8C5A8] animate-spin" style={{ animationDuration: '3s' }} />
                  <p className="text-[12px] text-[#E8C5A8] font-bold uppercase tracking-widest font-['Exo_2']">
                    {t('onboarding.budgetMockupAnalyzing')}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="budget-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-2.5 w-full text-start"
                >
                  {/* Budget Card 1: Dining with AI smart recommendation */}
                  <div className={`transition-all duration-500 p-2.5 rounded-2xl w-full border backdrop-blur-md shadow-lg ${
                    budgetState === 'applied' 
                      ? 'bg-[#1F1918]/90 border-[#34C759]/50 shadow-[0_0_20px_rgba(52,199,89,0.2)]' 
                      : 'bg-[#1F1918]/85 border-[#8D6346]/40 shadow-[0_0_20px_rgba(141,99,70,0.2)]'
                  }`}>
                    <div className="flex justify-between items-center text-[12px] text-white/95 mb-1.5 font-['Exo_2']">
                      <span className="font-semibold text-white/90">
                        {isRTL ? 'مطاعم ومقاهي' : 'Dining & Cafes'}
                      </span>
                      <span className={`text-[11px] font-bold ${budgetState === 'applied' ? 'text-[#34C759]' : 'text-[#E8C5A8]'}`}>
                        {budgetState === 'applied' ? (isRTL ? 'ميزانية موزونة $500' : '$500 balanced') : (isRTL ? 'تجاوزت $450' : '$450 spent')}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div 
                        initial={false}
                        animate={{ 
                          width: budgetState === 'applied' ? '90%' : '100%', 
                          backgroundColor: budgetState === 'applied' ? '#34C759' : '#ef4444' 
                        }}
                        transition={{ duration: 0.6 }}
                        className="h-full rounded-full" 
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-white/60 font-['Exo_2']">
                      <span className="flex items-center gap-1 text-[#E8C5A8]">
                        <Sparkles size={10} />
                        {budgetState === 'applied' ? (isRTL ? 'تم التعديل الذكي' : 'Smart adjusted') : (isRTL ? 'اقتراح نوفا: حد $500' : 'Nova: $500 limit')}
                      </span>
                      <span className={budgetState === 'applied' ? 'text-[#34C759] font-medium' : 'text-red-400 font-medium'}>
                        {budgetState === 'applied' ? (isRTL ? 'متبقي $50' : '$50 left') : (isRTL ? 'فوق الحد بـ $50' : '+$50 over')}
                      </span>
                    </div>
                  </div>

                  {/* Budget Card 2: Groceries */}
                  <div className="bg-[#1F1918]/70 border border-white/10 p-2.5 rounded-2xl w-full shadow-inner backdrop-blur-md">
                    <div className="flex justify-between items-center text-[11.5px] text-white/80 mb-1 font-['Exo_2']">
                      <span>{isRTL ? 'السوبر ماركت' : 'Groceries'}</span>
                      <span className="text-[#34C759] font-bold text-[11px]">{isRTL ? 'متبقي 900 ج.م' : '$90 left'}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#34C759] w-[70%] rounded-full" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Glow Overlay */}
          <AnimatePresence>
            {(budgetState === 'analyzing' || budgetState === 'suggesting') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-0 bottom-12 h-[50%] bg-gradient-to-t from-[#8D6346]/20 to-transparent pointer-events-none"
              />
            )}
          </AnimatePresence>

          {/* Mock Nav Bar */}
          <div className="h-12 bg-black/50 backdrop-blur-xl border-t border-white/10 flex items-center justify-center px-6 relative z-20">
            <button
              type="button"
              onClick={startSimulation}
              aria-label={t('onboarding.budgetMockupAnalyzing', 'Analyze smart budgets simulation')}
              className={`absolute -top-4 size-11 rounded-full flex items-center justify-center border border-transparent bg-gradient-to-br from-[#8D6346]/70 to-[#2B2321] shadow-[0_6px_16px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.25)] transform transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] ${
                budgetState !== 'idle' ? 'shadow-[0_0_20px_rgba(141,99,70,0.5)] border-white/20' : ''
              }`}
            >
              <Target size={18} className={budgetState !== 'idle' ? 'text-[#E8C5A8]' : 'text-white/80'} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Pure Floating Typography */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="w-full max-w-[340px] px-1 text-start shrink-0 my-1.5 bg-transparent"
      >
        <h2 className="font-['Exo_2'] font-bold text-white text-[21px] sm:text-[23px] leading-tight tracking-tight mb-1.5">
          {t(stepData.titleKey, stepData.defaultTitle)}
        </h2>
        <p className="font-['Exo_2'] font-normal text-white/85 text-[14px] sm:text-[14.5px] leading-relaxed">
          {t(stepData.descKey, stepData.defaultDesc)}
        </p>
      </motion.div>
    </div>
  );
}
