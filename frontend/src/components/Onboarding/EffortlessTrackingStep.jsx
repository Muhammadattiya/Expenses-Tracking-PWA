import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, MessageSquareText, CheckCircle2, Zap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function EffortlessTrackingStep({ stepData }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const [activeFeature, setActiveFeature] = useState('back_tap'); // 'back_tap' or 'sms_logging'
  const [tapRipple, setTapRipple] = useState(false);
  const [smsParsed, setSmsParsed] = useState(false);

  const timersRef = useRef([]);

  const clearAllTimers = () => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
  };

  const startSimulation = () => {
    clearAllTimers();

    // Feature 1: Back Tap
    setActiveFeature('back_tap');
    setTapRipple(false);

    // Trigger double tap ripple
    const rippleTimer = setTimeout(() => {
      setTapRipple(true);
    }, 600);
    timersRef.current.push(rippleTimer);

    // Switch to Feature 2: SMS logging after 3.2s
    const switchTimer = setTimeout(() => {
      setActiveFeature('sms_logging');
      setSmsParsed(false);

      // Trigger auto-parse confirmation
      const parseTimer = setTimeout(() => {
        setSmsParsed(true);
      }, 1000);
      timersRef.current.push(parseTimer);

      // Loop back after 4s
      const loopTimer = setTimeout(() => {
        startSimulation();
      }, 3800);
      timersRef.current.push(loopTimer);
    }, 3200);
    timersRef.current.push(switchTimer);
  };

  useEffect(() => {
    startSimulation();
    return clearAllTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 py-1 px-4 sm:px-6 relative z-10 items-center justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Interactive Mockup Container */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative w-full py-1">
        {/* Mockup Phone Frame */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="relative z-10 w-full max-w-[310px] h-[240px] bg-[#2B2321]/45 backdrop-blur-[32px] border border-white/15 rounded-[2.2rem] shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] overflow-hidden flex flex-col justify-between p-3.5"
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#8D6346]/35 via-[#E8C5A8]/10 to-transparent blur-2xl rounded-full -z-10" />

          {/* Top Feature Switcher Pills */}
          <div className="flex justify-center gap-2 z-10">
            <button
              type="button"
              onClick={() => setActiveFeature('back_tap')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer font-['Exo_2'] ${
                activeFeature === 'back_tap' 
                  ? 'bg-[#8D6346] border border-[#8D6346] text-white shadow-[0_2px_8px_rgba(141,99,70,0.4)]' 
                  : 'bg-white/5 text-white/50 border border-white/5 hover:text-white/80'
              }`}
            >
              <Zap size={12} className={activeFeature === 'back_tap' ? 'text-[#E8C5A8]' : 'text-white/40'} />
              <span>{t('onboarding.backTapFeature')}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFeature('sms_logging')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-300 flex items-center gap-1.5 cursor-pointer font-['Exo_2'] ${
                activeFeature === 'sms_logging' 
                  ? 'bg-[#8D6346] border border-[#8D6346] text-white shadow-[0_2px_8px_rgba(141,99,70,0.4)]' 
                  : 'bg-white/5 text-white/50 border border-white/5 hover:text-white/80'
              }`}
            >
              <MessageSquareText size={12} className={activeFeature === 'sms_logging' ? 'text-[#E8C5A8]' : 'text-white/40'} />
              <span>{t('onboarding.smsAutoLogFeature')}</span>
            </button>
          </div>

          {/* Simulation Content Canvas */}
          <div className="flex-1 flex flex-col items-center justify-center relative w-full overflow-hidden my-2">
            <AnimatePresence mode="wait">
              {activeFeature === 'back_tap' ? (
                <motion.div
                  key="back_tap"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center w-full relative"
                >
                  {/* Phone Tap Animation */}
                  <div className="relative mb-3 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center text-[#E8C5A8] shadow-inner relative z-10">
                      <Smartphone size={24} />
                    </div>

                    {/* Ripple Pulses */}
                    {tapRipple && (
                      <>
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0.9 }}
                          animate={{ scale: 2.2, opacity: 0 }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="absolute w-12 h-12 rounded-2xl border-2 border-[#8D6346] pointer-events-none"
                        />
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0.9 }}
                          animate={{ scale: 1.7, opacity: 0 }}
                          transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                          className="absolute w-12 h-12 rounded-2xl border border-[#E8C5A8] pointer-events-none"
                        />
                      </>
                    )}
                  </div>

                  {/* Logged Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: tapRipple ? 1 : 0, y: tapRipple ? 0 : 15 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="w-full bg-[#2B2321]/80 border border-white/15 rounded-xl p-3 flex items-center justify-between shadow-xl"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#34C759] shrink-0 shadow-[0_0_8px_rgba(52,199,89,0.8)]" />
                      <div className="min-w-0 text-start">
                        <span className="text-[12px] font-bold text-white block truncate font-['Exo_2']">
                          {t('onboarding.morningCoffee')}
                        </span>
                        <span className="text-[10px] text-white/60 block font-['Exo_2']">
                          {t('onboarding.doubleTapShortcut')}
                        </span>
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-white tabular-nums shrink-0 font-['Exo_2']">
                      -50 EGP
                    </span>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="sms_logging"
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center w-full gap-2.5"
                >
                  {/* Bank SMS Message Bubble */}
                  <div className="w-full bg-[#2B2321]/80 border border-white/15 rounded-xl p-3 shadow-lg text-start">
                    <div className="flex items-center gap-1.5 mb-1 text-[10.5px] font-bold text-white/60 font-['Exo_2']">
                      <MessageSquareText size={12} className="text-[#007AFF]" />
                      <span>{t('onboarding.bankSmsCib')}</span>
                    </div>
                    <div className="text-[11.5px] font-medium text-white/95 leading-tight font-['Exo_2']">
                      {t('onboarding.purchaseCarrefour')}
                    </div>
                  </div>

                  {/* Auto Logged Pill Indicator */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: smsParsed ? 1 : 0, scale: smsParsed ? 1 : 0.8 }}
                    transition={{ type: "spring", bounce: 0.4 }}
                    className="w-full bg-[#34C759]/20 border border-[#34C759]/40 rounded-full px-3 py-1.5 flex items-center justify-between shadow-inner"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 size={13} className="text-[#34C759] shrink-0" />
                      <span className="text-[11px] font-bold text-[#34C759] truncate font-['Exo_2']">
                        {t('onboarding.autoLoggedBadge')}
                      </span>
                    </div>
                    <span className="text-[11.5px] font-bold text-white tabular-nums shrink-0 font-['Exo_2']">
                      -250 EGP
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Home Indicator */}
          <div className="w-16 h-1 bg-white/20 rounded-full mx-auto" />
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
