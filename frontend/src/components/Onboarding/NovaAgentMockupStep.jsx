import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function NovaAgentMockupStep({ stepData }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const [novaState, setNovaState] = useState('idle'); // idle, typing, thinking, responding
  const [typedChars, setTypedChars] = useState(0);

  const userQuestion = t('onboarding.novaMockupUserMsg');
  const novaResponse = t('onboarding.novaMockupResponse');

  const simulationRef = useRef(null);

  const startSimulation = () => {
    if (simulationRef.current) clearTimeout(simulationRef.current);

    setNovaState('typing');
    setTypedChars(0);

    let chars = 0;
    const interval = setInterval(() => {
      chars += 2; // type speed
      setTypedChars(chars);
      if (chars >= userQuestion.length) {
        clearInterval(interval);
        simulationRef.current = setTimeout(() => {
          setNovaState('thinking');
          simulationRef.current = setTimeout(() => {
            setNovaState('responding');
            simulationRef.current = setTimeout(() => {
              setNovaState('idle');
            }, 4500);
          }, 1500); // thinking time
        }, 500); // delay after typing
      }
    }, 50);

    simulationRef.current = interval;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="flex-1 p-4 flex flex-col gap-3 justify-end overflow-hidden relative z-10">
            <AnimatePresence>
              {novaState === 'idle' && (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px] text-white/50 text-center mb-auto mt-8 font-['Exo_2']"
                >
                  {t('onboarding.novaMockupPrompt')}
                </motion.p>
              )}
              
              {(novaState === 'typing' || novaState === 'thinking' || novaState === 'responding') && (
                <motion.div
                  key="user-msg"
                  initial={{ opacity: 0, scale: 0.9, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className="self-end bg-[rgba(141,99,70,0.6)] backdrop-blur-md px-4 py-2 rounded-t-[16px] rounded-bl-[16px] rounded-br-sm border border-white/10 max-w-[85%]"
                >
                  <p className="text-[13px] text-white font-['Exo_2']" dir="auto">
                    {userQuestion.slice(0, typedChars)}
                    {novaState === 'typing' && (
                      <span className="inline-block w-[2px] h-3 ml-0.5 bg-white/70 align-middle animate-pulse" />
                    )}
                  </p>
                </motion.div>
              )}

              {(novaState === 'thinking') && (
                <motion.div
                  key="nova-thinking"
                  initial={{ opacity: 0, scale: 0.9, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -20 }}
                  className="self-start bg-black/40 backdrop-blur-md px-4 py-3 rounded-t-[16px] rounded-br-[16px] rounded-bl-sm border border-white/10"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="size-1.5 rounded-full bg-[#8D6346] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="size-1.5 rounded-full bg-[#8D6346] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="size-1.5 rounded-full bg-[#8D6346] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}

              {novaState === 'responding' && (
                <motion.div
                  key="nova-response"
                  initial={{ opacity: 0, scale: 0.9, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className="self-start bg-black/40 backdrop-blur-md px-4 py-3 rounded-t-[16px] rounded-br-[16px] rounded-bl-sm border border-white/10 max-w-[90%]"
                >
                  <div className="flex items-center gap-2 mb-1 text-[#8D6346]">
                    <Sparkles size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{t('onboarding.novaMockupAgentName')}</span>
                  </div>
                  <p className="text-[13px] text-white/90 font-['Exo_2'] font-medium leading-relaxed" dir="auto">
                    {novaResponse}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Magic Overlay Glow */}
          <AnimatePresence>
            {(novaState === 'typing' || novaState === 'thinking') && (
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
              className={`absolute -top-6 size-14 rounded-full flex items-center justify-center border-2 border-transparent bg-gradient-to-br from-[#4a3424] to-[#2a1d15] shadow-[0_8px_20px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2)] transform transition-all duration-300 hover:scale-105 ${novaState !== 'idle' ? 'shadow-[0_0_20px_rgba(141,99,70,0.5)] border-white/20' : ''}`}
            >
              <Sparkles size={24} className={novaState !== 'idle' ? 'text-[#e2b897]' : 'text-white/80'} />
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
        <p className="font-['Exo_2'] font-medium tracking-[-0.022em] text-white/90 text-left text-[32px] leading-[1.1em]" dir={isRTL ? 'rtl' : 'ltr'}>
          <span className="font-bold text-white drop-shadow-sm text-[20px] mr-1 block mb-2">{t(stepData.titleKey, stepData.defaultTitle)}</span>
          <span className="block mt-2 font-normal text-[16px] leading-[1.4em] text-white/70">
            {t(stepData.descKey, stepData.defaultDesc)}
          </span>
        </p>
      </motion.div>
    </div>
  );
}
