import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Coffee, Utensils, Zap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function VoiceMockupStep({ stepData }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const [voiceMockupState, setVoiceMockupState] = useState('idle'); // idle, listening, confirming
  const [voiceWordCount, setVoiceWordCount] = useState(0);

  const spokenWords = [
    t('onboarding.voiceMockupWord1'),
    t('onboarding.voiceMockupWord2'),
    t('onboarding.voiceMockupWord3'),
    t('onboarding.voiceMockupWord4'),
    t('onboarding.voiceMockupWord5'),
    t('onboarding.voiceMockupWord6'),
    t('onboarding.voiceMockupWord7'),
    t('onboarding.voiceMockupWord8'),
    t('onboarding.voiceMockupWord9'),
    t('onboarding.voiceMockupWord10')
  ];

  const voiceTransactions = [
    [t('onboarding.voiceMockupMerchant1'), t('onboarding.voiceMockupCat1'), '$5.00', <Coffee size={14} key="coffee" />],
    [t('onboarding.voiceMockupMerchant2'), t('onboarding.voiceMockupCat2'), '$120.00', <Zap size={14} key="zap" />]
  ];

  const simulationRef = useRef(null);

  const startSimulation = () => {
    if (simulationRef.current) clearTimeout(simulationRef.current);

    setVoiceMockupState('listening');
    setVoiceWordCount(0);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVoiceWordCount(count);
      if (count >= spokenWords.length) {
        clearInterval(interval);
        simulationRef.current = setTimeout(() => {
          setVoiceMockupState('confirming');
          // Reset after a while
          simulationRef.current = setTimeout(() => {
            setVoiceMockupState('idle');
          }, 3500);
        }, 1000);
      }
    }, 300); // speed of talking

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
          <div className="flex-1 p-4 flex flex-col gap-2 justify-end overflow-hidden relative z-10">
            <AnimatePresence mode="wait">
              {voiceMockupState === 'idle' && (
                <motion.p
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[12px] text-white/50 text-center mb-auto mt-8 font-['Exo_2']"
                >
                  {t('onboarding.voiceMockupIdleText')}
                </motion.p>
              )}
              {voiceMockupState === 'listening' && (
                <motion.div
                  key="listening"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-auto rounded-2xl border border-white/10 bg-black/30 p-3 shadow-inner backdrop-blur-md"
                >
                  <p className="text-[10px] uppercase tracking-widest text-[#8D6346] font-bold">
                    {t('onboarding.voiceMockupListening')}
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-white font-['Exo_2']" dir="auto">
                    "{spokenWords.slice(0, voiceWordCount).join(' ')}
                    <span className="inline-block w-1.5 h-4 ml-1 bg-white/70 align-middle animate-pulse rounded-full" />
                    "
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Listening Overlay Red Halo */}
          <AnimatePresence>
            {voiceMockupState === 'listening' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-red-500/10 to-transparent flex flex-col items-center justify-center z-0 pointer-events-none"
              >
                <div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center animate-pulse">
                  <div className="size-10 rounded-full bg-red-500/20 flex items-center justify-center animate-ping" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirmation Overlay */}
          <AnimatePresence>
            {voiceMockupState === 'confirming' && (
              <motion.div
                initial={{ opacity: 0, y: '100%' }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col justify-end p-3 z-30"
              >
                <div className="bg-[#2a1d15]/80 backdrop-blur-[30px] border border-white/10 p-3 rounded-2xl w-full flex flex-col gap-2 shadow-2xl">
                  <p className="text-[10px] text-white/60 font-semibold uppercase tracking-wider font-['Exo_2']">
                    {t('onboarding.voiceMockupFound')}
                  </p>
                  <div className="max-h-[140px] overflow-y-auto flex flex-col gap-2 pr-1" style={{ scrollbarWidth: 'none' }}>
                    {voiceTransactions.map(([merchant, category, amount, icon], i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-[14px] bg-black/20 border border-white/5">
                        <div className="size-8 rounded-full bg-[rgba(141,99,70,0.3)] flex items-center justify-center text-white/90">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-white/90 text-[12px] font-medium truncate font-['Exo_2']">{merchant}</p>
                          <p className="text-white/50 text-[10px] truncate font-['Exo_2']">{category}</p>
                        </div>
                        <p className="text-[#e2b897] text-[13px] font-bold font-['Exo_2']">{amount}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setVoiceMockupState('idle')} className="flex-1 bg-white/5 text-white/70 text-[11px] py-2 rounded-xl font-medium border border-white/10 hover:bg-white/10 transition-colors">
                      {t('onboarding.voiceMockupEdit')}
                    </button>
                    <button onClick={() => setVoiceMockupState('idle')} className="flex-[1.5] bg-[#8D6346] text-white/90 text-[12px] py-2 rounded-xl font-bold hover:bg-[#a67a5b] transition-colors shadow-lg">
                      {t('onboarding.save')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mock Nav Bar */}
          <div className="h-16 bg-[#1a1412]/60 backdrop-blur-xl border-t border-white/10 flex items-center justify-center px-6 relative z-20">
            <button
              onClick={startSimulation}
              className={`absolute -top-6 size-14 rounded-full flex items-center justify-center border-2 border-transparent bg-gradient-to-br from-[#4a3424] to-[#2a1d15] shadow-[0_8px_20px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2)] transform transition-all duration-300 hover:scale-105 ${voiceMockupState === 'listening' ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-gradient-to-br from-red-900/40 to-[#2a1d15]' : ''
                }`}
            >
              <Mic size={24} className={voiceMockupState === 'listening' ? 'text-red-400' : 'text-white/80'} />
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
