import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, MessageSquareText, CheckCircle2, Zap, Sparkles } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function EffortlessTrackingStep({ stepData }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  // Mode cycle: 'back_tap' -> 'sms_logging'
  const [activeFeature, setActiveFeature] = useState('back_tap'); // 'back_tap' or 'sms_logging'
  const [tapRipple, setTapRipple] = useState(false);
  const [smsParsed, setSmsParsed] = useState(false);

  const timerRef = useRef(null);

  const startSimulation = () => {
    // Feature 1: Back Tap
    setActiveFeature('back_tap');
    setTapRipple(false);

    // Trigger double tap ripple
    setTimeout(() => {
      setTapRipple(true);
    }, 600);

    // Switch to Feature 2: SMS logging after 3.2s
    timerRef.current = setTimeout(() => {
      setActiveFeature('sms_logging');
      setSmsParsed(false);

      // Trigger auto-parse confirmation
      setTimeout(() => {
        setSmsParsed(true);
      }, 1000);

      // Loop back after 4s
      timerRef.current = setTimeout(() => {
        startSimulation();
      }, 3800);
    }, 3200);
  };

  useEffect(() => {
    startSimulation();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 pt-[60px] px-6 z-10" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Interactive Mockup Container */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative mb-4 mt-2">
        {/* Floating Top Graphic */}
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
              alt="Effortless Tracking Illustration"
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
          className="relative z-10 w-full max-w-[230px] h-[250px] bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem] overflow-hidden flex flex-col justify-between p-4"
        >
          {/* Top Feature Switcher Pills */}
          <div className="flex justify-center gap-1.5 z-10">
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-300 flex items-center gap-1 ${
              activeFeature === 'back_tap' 
                ? 'bg-[#8D6346]/40 border border-[#8D6346]/60 text-white shadow-sm' 
                : 'bg-white/5 text-white/40 border border-white/5'
            }`}>
              <Zap size={10} className={activeFeature === 'back_tap' ? 'text-[#E8C5A8]' : 'text-white/40'} />
              <span>Back Tap</span>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all duration-300 flex items-center gap-1 ${
              activeFeature === 'sms_logging' 
                ? 'bg-[#8D6346]/40 border border-[#8D6346]/60 text-white shadow-sm' 
                : 'bg-white/5 text-white/40 border border-white/5'
            }`}>
              <MessageSquareText size={10} className={activeFeature === 'sms_logging' ? 'text-[#E8C5A8]' : 'text-white/40'} />
              <span>SMS Auto-Log</span>
            </div>
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
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E8C5A8] shadow-inner relative z-10">
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
                    className="w-full bg-white/[0.07] border border-white/15 rounded-xl p-2.5 flex items-center justify-between shadow-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-[#34C759] shrink-0 shadow-[0_0_6px_rgba(52,199,89,0.8)]" />
                      <div className="min-w-0 text-start">
                        <span className="text-[11px] font-bold text-white block truncate">
                          {isRTL ? 'قهوة الصباح' : 'Morning Coffee'}
                        </span>
                        <span className="text-[9.5px] text-white/50 block">
                          {isRTL ? 'نقرتين سريعتين ⚡' : 'Double Tap ⚡'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[12px] font-black text-white tabular-nums shrink-0">
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
                  className="flex flex-col items-center justify-center w-full gap-2"
                >
                  {/* Bank SMS Message Bubble */}
                  <div className="w-full bg-white/[0.06] border border-white/10 rounded-xl p-2.5 shadow-md text-start">
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-white/60">
                      <MessageSquareText size={11} className="text-[#007AFF]" />
                      <span>{isRTL ? 'رسالة بنكية (CIB)' : 'Bank SMS (CIB)'}</span>
                    </div>
                    <div className="text-[10.5px] font-medium text-white/90 leading-tight">
                      {isRTL ? 'تم سحب 250 ج.م لدى كارفور' : 'Purchase: 250 EGP at Carrefour'}
                    </div>
                  </div>

                  {/* Auto Logged Pill Indicator */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: smsParsed ? 1 : 0, scale: smsParsed ? 1 : 0.8 }}
                    transition={{ type: "spring", bounce: 0.4 }}
                    className="w-full bg-[#34C759]/15 border border-[#34C759]/30 rounded-full px-2.5 py-1.5 flex items-center justify-between shadow-inner"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <CheckCircle2 size={12} className="text-[#34C759] shrink-0" />
                      <span className="text-[10px] font-bold text-[#34C759] truncate">
                        {t('onboarding.autoLoggedBadge')}
                      </span>
                    </div>
                    <span className="text-[10.5px] font-black text-white tabular-nums shrink-0">
                      -250 EGP
                    </span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Accent Line */}
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto" />
        </motion.div>
      </div>

      {/* Text Container matching other onboarding screens */}
      <div className="flex flex-col items-center justify-center text-center mt-2 px-2 pb-8">
        <h1 className="text-[22px] font-bold text-white tracking-wide mb-2 font-['Exo_2']">
          {t(stepData.titleKey, stepData.defaultTitle)}
        </h1>
        <p className="text-[13.5px] text-white/60 leading-relaxed max-w-[320px] font-['Exo_2']">
          {t(stepData.descKey, stepData.defaultDesc)}
        </p>
      </div>
    </div>
  );
}
