import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Mic, Sparkle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { triggerHaptic } from '../../utils/haptics';

export default function SmartCaptureBar({ onQuickAdd, onOpenNova }) {
  const { t, lang } = useLanguage();
  const reduceMotion = useReducedMotion();
  const tapPress = reduceMotion ? undefined : { scale: 0.97 };
  const isRTL = lang === 'ar';

  const [micRippling, setMicRippling] = useState(false);
  const [novaBursting, setNovaBursting] = useState(false);

  const handleQuickAdd = () => {
    triggerHaptic('selection');
    setMicRippling(true);
    setTimeout(() => setMicRippling(false), 600);
    onQuickAdd?.();
  };

  const handleOpenNova = () => {
    triggerHaptic('selection');
    setNovaBursting(true);
    setTimeout(() => setNovaBursting(false), 600);
    onOpenNova?.();
  };

  return (
    <div 
      className="w-full relative overflow-hidden rounded-[24px] p-1.5 border border-[#8D6346]/45 shadow-[0_16px_36px_-6px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(232,197,168,0.3),inset_0_-1px_2px_rgba(0,0,0,0.8)] flex items-center gap-1.5 mb-3.5 group select-none"
      style={{
        background: 'radial-gradient(120% 120% at 50% 0%, #241B17 0%, #161214 55%, #0F0C0E 100%)',
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top Precision Light Line */}
      {!reduceMotion && (
        <motion.div
          animate={{ x: isRTL ? ['180%', '-180%'] : ['-180%', '180%'] }}
          transition={{ repeat: Infinity, duration: 8.5, ease: 'easeInOut' }}
          className="absolute top-0 inset-x-0 h-[1.5px] w-1/3 bg-gradient-to-r from-transparent via-[#E8C5A8]/60 to-transparent pointer-events-none"
        />
      )}

      {/* Quick Add Section (Sibling Control 1) */}
      <motion.button
        type="button"
        whileHover={reduceMotion ? undefined : { scale: 1.008 }}
        whileTap={tapPress}
        onClick={handleQuickAdd}
        aria-label={t('dashboard.quickAddPlaceholder')}
        className="flex-1 relative overflow-hidden flex items-center gap-3 px-3 py-2 rounded-[19px] bg-white/[0.03] hover:bg-white/[0.07] active:bg-black/40 border border-white/5 hover:border-[#8D6346]/30 transition-all text-start group/quick focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(232,197,168,0.5)] min-w-0"
      >
        {/* Burnished Copper Disc with Sonic Ripple on Click */}
        <div className="relative flex items-center justify-center shrink-0">
          {!reduceMotion && (
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.4, 0.15] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-[#8D6346] blur-[6px] pointer-events-none"
            />
          )}

          {/* Outward Sonic Acoustic Wave on Click */}
          <AnimatePresence>
            {micRippling && !reduceMotion && (
              <motion.span
                key="sonic-ripple"
                initial={{ scale: 0.8, opacity: 0.95 }}
                animate={{ scale: 2.3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-[#E8C5A8] pointer-events-none"
              />
            )}
          </AnimatePresence>

          <motion.div 
            animate={micRippling && !reduceMotion ? { scale: [1, 0.88, 1.14, 1] } : undefined}
            transition={{ duration: 0.4 }}
            className="relative w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full flex items-center justify-center transition-transform group-hover/quick:scale-105"
            style={{
              background: 'linear-gradient(135deg, #B58462 0%, #8D6346 50%, #5E3E2A 100%)',
              boxShadow: '0 3px 10px rgba(141, 99, 70, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.5), inset 0 -1px 2px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(232, 197, 168, 0.65)',
            }}
          >
            <Mic className="w-4.5 h-4.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" />
          </motion.div>
        </div>

        {/* Clean Prompt & Audio Wave Pins */}
        <div className="flex items-center justify-between min-w-0 flex-1 gap-2">
          <motion.span 
            animate={!reduceMotion ? { opacity: [0.8, 1, 0.8] } : undefined}
            transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
            className="text-[#E8C5A8]/85 text-xs sm:text-[13px] font-medium tracking-wide truncate group-hover/quick:text-white transition-colors"
          >
            {t('dashboard.quickAddPlaceholder')}
          </motion.span>

          {!reduceMotion && (
            <div className="flex items-end gap-[2px] h-3 shrink-0 opacity-65 pe-1">
              <motion.span
                animate={micRippling ? { height: '11px' } : { height: ['4px', '8px', '4px', '7px', '4px'] }}
                transition={micRippling ? { duration: 0.25 } : { repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                className="w-[2px] rounded-full bg-[#E8C5A8]"
              />
              <motion.span
                animate={micRippling ? { height: '13px' } : { height: ['7px', '3px', '9px', '4px', '7px'] }}
                transition={micRippling ? { duration: 0.25 } : { repeat: Infinity, duration: 2.8, ease: 'easeInOut', delay: 0.3 }}
                className="w-[2px] rounded-full bg-[#8D6346]"
              />
              <motion.span
                animate={micRippling ? { height: '10px' } : { height: ['4px', '9px', '5px', '3px', '4px'] }}
                transition={micRippling ? { duration: 0.25 } : { repeat: Infinity, duration: 2.4, ease: 'easeInOut', delay: 0.6 }}
                className="w-[2px] rounded-full bg-[#E8C5A8]"
              />
            </div>
          )}
        </div>
      </motion.button>

      {/* Laser-Etched Metallic Groove Divider */}
      <div className="w-[1px] h-8 bg-gradient-to-b from-transparent via-[#8D6346]/45 to-transparent shrink-0" />

      {/* Nova Section (Matching Sibling Control 2) */}
      <motion.button
        type="button"
        whileHover={reduceMotion ? undefined : { scale: 1.02 }}
        whileTap={tapPress}
        onClick={handleOpenNova}
        aria-label={t('dashboard.askNovaAction')}
        className="relative overflow-hidden flex items-center gap-2.5 px-3 py-2 rounded-[19px] bg-white/[0.03] hover:bg-white/[0.07] active:bg-black/40 border border-white/5 hover:border-[#8D6346]/30 transition-all text-start group/nova shrink-0 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_rgba(232,197,168,0.5)]"
      >
        {/* Identical Burnished Copper Disc with Starlight Burst on Click */}
        <div className="relative flex items-center justify-center shrink-0">
          {!reduceMotion && (
            <motion.div
              animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.4, 0.15] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full bg-[#8D6346] blur-[6px] pointer-events-none"
            />
          )}

          {/* Outward Starlight Burst on Click */}
          <AnimatePresence>
            {novaBursting && !reduceMotion && (
              <motion.span
                key="nova-burst"
                initial={{ scale: 0.8, opacity: 0.95 }}
                animate={{ scale: 2.3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full border-2 border-[#E8C5A8] pointer-events-none"
              />
            )}
          </AnimatePresence>

          <motion.div 
            animate={novaBursting && !reduceMotion ? { scale: [1, 0.88, 1.14, 1] } : undefined}
            transition={{ duration: 0.4 }}
            className="relative w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full flex items-center justify-center transition-transform group-hover/nova:scale-105"
            style={{
              background: 'linear-gradient(135deg, #B58462 0%, #8D6346 50%, #5E3E2A 100%)',
              boxShadow: '0 3px 10px rgba(141, 99, 70, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.5), inset 0 -1px 2px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(232, 197, 168, 0.65)',
            }}
          >
            {!reduceMotion ? (
              <motion.div
                animate={novaBursting ? { rotate: [0, 360] } : { rotate: [0, 8, -8, 0] }}
                transition={novaBursting ? { duration: 0.55, ease: 'easeOut' } : { repeat: Infinity, duration: 6, ease: 'easeInOut' }}
              >
                <Sparkle className="w-4.5 h-4.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] fill-white/30" />
              </motion.div>
            ) : (
              <Sparkle className="w-4.5 h-4.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] fill-white/30" />
            )}
          </motion.div>
        </div>

        {/* Matching Typography */}
        <span className="text-white font-bold text-xs sm:text-[13px] tracking-wide group-hover/nova:text-[#E8C5A8] transition-colors pe-1 drop-shadow-sm">
          {t('dashboard.askNovaAction')}
        </span>
      </motion.button>
    </div>
  );
}
