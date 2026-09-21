import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Coffee, Zap } from 'lucide-react';
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

    setVoiceMockupState('listening');
    setVoiceWordCount(0);

    let count = 0;
    const interval = setInterval(() => {
      count++;
      setVoiceWordCount(count);
      if (count >= spokenWords.length) {
        clearInterval(interval);
        const confirmTimer = setTimeout(() => {
          setVoiceMockupState('confirming');
          const resetTimer = setTimeout(() => {
            setVoiceMockupState('idle');
          }, 3500);
          timersRef.current.push(resetTimer);
        }, 1000);
        timersRef.current.push(confirmTimer);
      }
    }, 280);

    timersRef.current.push(interval);
  };

  useEffect(() => {
    const timer = setTimeout(startSimulation, 800);
    timersRef.current.push(timer);
    return clearAllTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          className="relative z-10 w-full max-w-[310px] h-[270px] bg-[#2B2321]/45 backdrop-blur-[32px] border border-white/15 rounded-[2.2rem] shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] overflow-hidden flex flex-col justify-between"
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#8D6346]/35 via-[#E8C5A8]/10 to-transparent blur-2xl rounded-full -z-10" />

          {/* Top Speaker / Dynamic Island */}
          <div className="h-6 w-full flex items-center justify-center pt-2 relative z-20">
            <div className="w-20 h-3 rounded-full bg-black/50 border border-white/10 flex items-center justify-center gap-1.5 px-2">
              <span className="size-1 rounded-full bg-[#8D6346] animate-pulse" />
              <span className="text-[8px] font-bold text-white/50 tracking-wider">NOVA VOICE</span>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-4 flex flex-col justify-center overflow-hidden relative z-10">
            <AnimatePresence mode="wait">
              {voiceMockupState === 'idle' && (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-3 my-auto cursor-pointer"
                  onClick={startSimulation}
                >
                  {/* Pulsing Audio Visualizer Waves */}
                  <div className="flex items-center gap-1.5 h-10">
                    {[40, 75, 50, 95, 60, 85, 45, 70, 30].map((h, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [`${h * 0.3}%`, `${h}%`, `${h * 0.3}%`] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.1, ease: "easeInOut" }}
                        className="w-1 rounded-full bg-gradient-to-t from-[#8D6346] to-[#E8C5A8]"
                      />
                    ))}
                  </div>
                  <p className="text-[12.5px] text-white/70 text-center font-['Exo_2']">
                    {t('onboarding.voiceMockupIdleText')}
                  </p>
                </motion.div>
              )}
              {voiceMockupState === 'listening' && (
                <motion.div
                  key="listening"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="rounded-2xl border border-white/10 bg-black/50 p-3.5 shadow-inner backdrop-blur-md text-start"
                >
                  <p className="text-[10px] uppercase tracking-widest text-[#E8C5A8] font-bold flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-red-500 animate-ping" />
                    {t('onboarding.voiceMockupListening')}
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-white font-['Exo_2']" dir="auto">
                    "{spokenWords.slice(0, voiceWordCount).join(' ')}
                    <span className="inline-block w-1.5 h-4 ms-1 bg-[#8D6346] align-middle animate-pulse rounded-full" />
                    "
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Listening Overlay Ambient Halo */}
          <AnimatePresence>
            {voiceMockupState === 'listening' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-red-500/15 to-transparent flex flex-col items-center justify-center z-0 pointer-events-none"
              />
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
                className="absolute inset-0 bg-black/75 backdrop-blur-md flex flex-col justify-end p-3 z-30"
              >
                <div className="bg-[#2B2321]/95 backdrop-blur-[30px] border border-white/15 p-3 rounded-2xl w-full flex flex-col gap-2 shadow-2xl">
                  <p className="text-[10.5px] text-[#E8C5A8] font-semibold uppercase tracking-wider font-['Exo_2']">
                    {t('onboarding.voiceMockupFound')}
                  </p>
                  <div className="max-h-[120px] flex flex-col gap-1.5 pr-1 overflow-hidden">
                    {voiceTransactions.map(([merchant, category, amount, icon], i) => (
                      <div key={i} className="flex items-center gap-2.5 p-2 rounded-xl bg-black/30 border border-white/5">
                        <div className="size-7 rounded-full bg-[#8D6346]/40 flex items-center justify-center text-white/90 shrink-0">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center text-start">
                          <p className="text-white/95 text-[12px] font-medium truncate font-['Exo_2']">{merchant}</p>
                          <p className="text-white/50 text-[10px] truncate font-['Exo_2']">{category}</p>
                        </div>
                        <p className="text-[#E8C5A8] text-[12px] font-bold font-['Exo_2'] tabular-nums">{amount}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button 
                      type="button"
                      onClick={() => setVoiceMockupState('idle')} 
                      className="flex-1 bg-white/5 text-white/70 text-[11px] py-1.5 rounded-xl font-medium border border-white/10 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                    >
                      {t('onboarding.voiceMockupEdit')}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setVoiceMockupState('idle')} 
                      className="flex-[1.5] bg-[#8D6346] text-white text-[11px] py-1.5 rounded-xl font-semibold hover:bg-[#a67a5b] transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8D6346]"
                    >
                      {t('onboarding.save')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mock Nav Bar */}
          <div className="h-12 bg-black/50 backdrop-blur-xl border-t border-white/10 flex items-center justify-center px-6 relative z-20">
            <button
              type="button"
              onClick={startSimulation}
              aria-label={t('quickAdd.listen', 'Start voice recording simulation')}
              className={`absolute -top-4 size-11 rounded-full flex items-center justify-center border border-transparent bg-gradient-to-br from-[#8D6346]/70 to-[#2B2321] shadow-[0_6px_16px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.25)] transform transition-all duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] ${
                voiceMockupState === 'listening' ? 'border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.5)] bg-gradient-to-br from-red-900/60 to-[#2B2321]' : ''
              }`}
            >
              <Mic size={18} className={voiceMockupState === 'listening' ? 'text-red-400 animate-pulse' : 'text-white/95'} />
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
