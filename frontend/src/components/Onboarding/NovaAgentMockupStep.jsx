import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function NovaAgentMockupStep({ stepData }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const userQuestion = t('onboarding.novaMockupUserMsg');
  const novaResponse = t('onboarding.novaMockupResponse');

  const [novaState, setNovaState] = useState('responding'); // idle, typing, thinking, responding
  const [typedChars, setTypedChars] = useState(userQuestion.length);

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

    setNovaState('typing');
    setTypedChars(0);

    let chars = 0;
    const interval = setInterval(() => {
      chars += 2;
      setTypedChars(chars);
      if (chars >= userQuestion.length) {
        clearInterval(interval);
        const delayTimer = setTimeout(() => {
          setNovaState('thinking');
          const thinkTimer = setTimeout(() => {
            setNovaState('responding');
          }, 1200);
          timersRef.current.push(thinkTimer);
        }, 300);
        timersRef.current.push(delayTimer);
      }
    }, 40);

    timersRef.current.push(interval);
  };

  useEffect(() => {
    return clearAllTimers;
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 pt-12 pb-16 px-4 sm:px-6 relative z-10 items-center justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Interactive Mockup Container */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative w-full pt-2">
        {/* Mockup Phone Frame */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="relative z-10 w-full max-w-[310px] h-[270px] bg-[#2B2321]/45 backdrop-blur-[32px] border border-white/15 rounded-[2.2rem] shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] overflow-hidden flex flex-col justify-between"
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#8D6346]/35 via-[#E8C5A8]/10 to-transparent blur-2xl rounded-full -z-10" />

          {/* Top Speaker / Dynamic Island */}
          <div className="h-6 w-full flex items-center justify-center pt-2 relative z-20">
            <div className="w-24 h-3 rounded-full bg-black/50 border border-white/10 flex items-center justify-center gap-1.5 px-2">
              <span className="size-1 rounded-full bg-[#E8C5A8] animate-ping" />
              <span className="text-[8px] font-bold text-white/60 tracking-wider">NOVA ADVISOR</span>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-3.5 flex flex-col gap-2.5 justify-end overflow-hidden relative z-10">
            <AnimatePresence>
              {novaState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-2.5 my-auto cursor-pointer"
                  onClick={startSimulation}
                >
                  <div className="size-10 rounded-2xl bg-gradient-to-br from-[#8D6346]/60 to-[#2B2321] border border-white/15 flex items-center justify-center shadow-lg">
                    <Sparkles size={18} className="text-[#E8C5A8]" />
                  </div>
                  <p className="text-[12.5px] text-white/75 text-center font-['Exo_2'] max-w-[200px] leading-relaxed">
                    {t('onboarding.novaMockupPrompt')}
                  </p>
                </motion.div>
              )}
              
              {(novaState === 'typing' || novaState === 'thinking' || novaState === 'responding') && (
                <motion.div
                  key="user-msg"
                  initial={{ opacity: 0, scale: 0.92, x: isRTL ? -15 : 15 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className="self-end bg-[#8D6346]/60 backdrop-blur-md px-3 py-1.5 rounded-t-2xl rounded-bl-2xl rounded-br-sm border border-white/15 max-w-[85%] text-start"
                >
                  <p className="text-[12px] text-white font-['Exo_2'] leading-relaxed" dir="auto">
                    {userQuestion.slice(0, typedChars)}
                    {novaState === 'typing' && (
                      <span className="inline-block w-[2px] h-3 ms-1 bg-white/80 align-middle animate-pulse" />
                    )}
                  </p>
                </motion.div>
              )}

              {(novaState === 'thinking') && (
                <motion.div
                  key="nova-thinking"
                  initial={{ opacity: 0, scale: 0.92, x: isRTL ? 15 : -15 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="self-start bg-black/50 backdrop-blur-md px-3 py-2 rounded-t-2xl rounded-br-2xl rounded-bl-sm border border-white/10"
                >
                  <div className="flex items-center gap-1.5 py-0.5">
                    <span className="size-1.5 rounded-full bg-[#E8C5A8] animate-pulse" style={{ animationDuration: '1s', animationDelay: '0ms' }} />
                    <span className="size-1.5 rounded-full bg-[#E8C5A8] animate-pulse" style={{ animationDuration: '1s', animationDelay: '200ms' }} />
                    <span className="size-1.5 rounded-full bg-[#E8C5A8] animate-pulse" style={{ animationDuration: '1s', animationDelay: '400ms' }} />
                  </div>
                </motion.div>
              )}

              {novaState === 'responding' && (
                <motion.div
                  key="nova-response"
                  initial={{ opacity: 0, scale: 0.92, x: isRTL ? 15 : -15 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className="self-start bg-black/55 backdrop-blur-md px-3 py-2.5 rounded-t-2xl rounded-br-2xl rounded-bl-sm border border-white/15 max-w-[92%] text-start shadow-lg"
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[#E8C5A8]">
                    <Sparkles size={11} />
                    <span className="text-[9.5px] font-bold uppercase tracking-wider">{t('onboarding.novaMockupAgentName')}</span>
                  </div>
                  <p className="text-[12px] text-white/95 font-['Exo_2'] font-medium leading-relaxed" dir="auto">
                    {novaResponse}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Glow Overlay */}
          <AnimatePresence>
            {(novaState === 'typing' || novaState === 'thinking') && (
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
              aria-label={t('onboarding.novaMockupPrompt', 'Ask Nova AI simulation')}
              className={`absolute -top-4 size-11 rounded-full flex items-center justify-center border border-transparent bg-gradient-to-br from-[#8D6346]/70 to-[#2B2321] shadow-[0_6px_16px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.25)] transform transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] ${
                novaState !== 'idle' ? 'shadow-[0_0_20px_rgba(141,99,70,0.5)] border-white/20' : ''
              }`}
            >
              <Sparkles size={18} className={novaState !== 'idle' ? 'text-[#E8C5A8]' : 'text-white/80'} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Pure Floating Typography */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="w-full max-w-[340px] px-3 py-2 z-20 text-start shrink-0 my-2"
      >
        <h2 className="font-['Exo_2'] font-bold text-white text-[21px] sm:text-[23px] leading-tight tracking-tight mb-1.5 drop-shadow-md">
          {t(stepData.titleKey, stepData.defaultTitle)}
        </h2>
        <p className="font-['Exo_2'] font-normal text-white/85 text-[14px] sm:text-[14.5px] leading-relaxed drop-shadow-sm">
          {t(stepData.descKey, stepData.defaultDesc)}
        </p>
      </motion.div>
    </div>
  );
}
