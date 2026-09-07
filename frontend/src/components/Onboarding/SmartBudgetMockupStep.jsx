import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SmartBudgetMockupStep({ stepData }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const [budgetState, setBudgetState] = useState('idle'); // idle, analyzing, suggesting, applied
  const simulationRef = useRef(null);

  const startSimulation = () => {
    if (simulationRef.current) clearTimeout(simulationRef.current);
    
    setBudgetState('analyzing');

    simulationRef.current = setTimeout(() => {
      setBudgetState('suggesting');
      simulationRef.current = setTimeout(() => {
        setBudgetState('applied');
        simulationRef.current = setTimeout(() => {
          setBudgetState('idle');
        }, 3500);
      }, 2500);
    }, 1500);
  };



  useEffect(() => {
    // Auto-start simulation shortly after component mounts
    const timer = setTimeout(startSimulation, 800);
    return () => {
      clearTimeout(timer);
      if (typeof simulationRef.current === 'number') {
        clearInterval(simulationRef.current);
        clearTimeout(simulationRef.current);
      }
    };
     
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 pt-[60px] px-6 z-10" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Interactive Mockup Container */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative mb-4 mt-2">

        <motion.div
          className="w-[100px] h-[100px] mb-4 self-center"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring', delay: 0.3 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-full h-full"
          >
            <img 
              src="/images/onboarding1.png"
              alt="Voice Illustration"
              className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              style={{ transform: "rotate(39.01deg)" }}
            />
          </motion.div>
        </motion.div>

        {/* Mockup Phone Frame */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring', delay: 0.1 }}
          className="relative z-10 w-full max-w-[230px] h-[250px] bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem] overflow-hidden flex flex-col justify-end"
        >
          {/* Content Area */}
          <div className="flex-1 p-4 flex flex-col justify-center overflow-hidden relative z-10 w-full">
            <AnimatePresence>
              {budgetState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3 w-full"
                >
                  <p className="text-[12px] text-white/50 text-center font-['Exo_2'] mb-2">
                    {isRTL ? 'ميزانية الطعام الحالية (تتجاوزها غالباً)' : 'Current Food Budget (Often exceeded)'}
                  </p>
                  <div className="bg-black/30 border border-red-500/30 p-3 rounded-2xl w-full">
                    <div className="flex justify-between text-[11px] text-white/80 mb-2 font-['Exo_2']">
                      <span>$450 spent</span>
                      <span className="text-red-400">Limit: $300</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-red-500 w-full" />
                    </div>
                  </div>
                </motion.div>
              )}
              
              {budgetState === 'analyzing' && (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm z-20"
                >
                  <Sparkles size={32} className="text-[#8D6346] animate-pulse" />
                  <p className="text-[11px] text-[#8D6346] font-bold uppercase tracking-widest font-['Exo_2']">
                    {t('onboarding.budgetMockupAnalyzing')}
                  </p>
                </motion.div>
              )}

              {(budgetState === 'suggesting' || budgetState === 'applied') && (
                <motion.div
                  key="suggesting"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 w-full"
                >
                  <div className="flex items-center justify-center gap-2 mb-1 text-[#8D6346]">
                    <Sparkles size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t('onboarding.budgetMockupSuggestion')}</span>
                  </div>
                  <div className={`bg-black/30 border transition-colors duration-500 p-3 rounded-2xl w-full ${budgetState === 'applied' ? 'border-green-500/30' : 'border-[#8D6346]/40 shadow-[0_0_15px_rgba(141,99,70,0.2)]'}`}>
                    <div className="flex justify-between text-[11px] text-white/80 mb-2 font-['Exo_2']">
                      <span>{t('onboarding.budgetMockupSpent', { spent: '$450' }, '$450 spent').replace('{spent}')}</span>
                      <span className={budgetState === 'applied' ? 'text-green-400 font-bold' : 'text-[#e2b897]'}>{t('onboarding.budgetMockupLimit', { limit: '$500' }, 'Limit: $500').replace('{limit}')}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <motion.div 
                        initial={{ width: '100%', backgroundColor: '#ef4444' }}
                        animate={budgetState === 'applied' ? { width: '90%', backgroundColor: '#22c55e' } : {}}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full" 
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Magic Overlay Glow */}
          <AnimatePresence>
            {(budgetState === 'analyzing' || budgetState === 'suggesting') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-0 bottom-16 h-[60%] bg-gradient-to-t from-[#8D6346]/20 to-transparent flex flex-col items-center justify-end z-0 pointer-events-none pb-4"
              >
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mock Nav Bar */}
          <div className="h-16 bg-[#1a1412]/60 backdrop-blur-xl border-t border-white/10 flex items-center justify-center px-6 relative z-20">
            <button
              onClick={startSimulation}
              className={`absolute -top-6 size-14 rounded-full flex items-center justify-center border-2 border-transparent bg-gradient-to-br from-[#4a3424] to-[#2a1d15] shadow-[0_8px_20px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2)] transform transition-all duration-300 hover:scale-105 ${budgetState !== 'idle' ? 'shadow-[0_0_20px_rgba(141,99,70,0.5)] border-white/20' : ''}`}
            >
              <Target size={24} className={budgetState !== 'idle' ? 'text-[#e2b897]' : 'text-white/80'} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Text Area */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full flex flex-col items-start pb-4 z-20"
      >
        <p className="font-['Exo_2'] text-left" dir={isRTL ? 'rtl' : 'ltr'}>
          <span className="font-bold text-white tracking-tight drop-shadow-sm text-[22px] block mb-2">
            {t(stepData.titleKey, stepData.defaultTitle)}
          </span>
          <span className="block font-medium tracking-[-0.01em] text-[15px] leading-[1.5em] text-white/70">
            {t(stepData.descKey, stepData.defaultDesc)}
          </span>
        </p>
      </motion.div>
    </div>
  );
}
