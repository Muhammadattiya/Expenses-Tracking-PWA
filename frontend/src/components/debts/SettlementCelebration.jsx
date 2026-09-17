import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

export default function SettlementCelebration({ open, onClose, title, subtitle, personName }) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div 
          role="status" 
          aria-live="polite"
          className="fixed top-6 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[130] flex justify-center pointer-events-none"
        >
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
            className="pointer-events-auto relative w-full max-w-md bg-[#1C1819]/90 backdrop-blur-2xl border border-brand-green/35 shadow-[0_20px_50px_rgba(0,0,0,0.7),0_0_30px_rgba(52,199,89,0.25)] rounded-[24px] p-4 sm:p-5 overflow-hidden"
          >
            {/* Top specular highlight rim */}
            <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-brand-green/40 to-transparent" />
            
            {/* Ambient copper-emerald glow */}
            <div className="absolute -top-10 -end-10 w-24 h-24 bg-brand-green/20 blur-2xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-10 -start-10 w-24 h-24 bg-[#8D6346]/20 blur-2xl rounded-full pointer-events-none" />

            {/* Radiant Sparkle Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
              {[
                { top: '15%', left: '10%', delay: 0.1, size: 8, color: '#34C759' },
                { top: '25%', right: '15%', delay: 0.2, size: 10, color: '#E8C5A8' },
                { top: '65%', left: '20%', delay: 0.3, size: 7, color: '#34C759' },
                { top: '70%', right: '25%', delay: 0.15, size: 9, color: '#8D6346' },
                { top: '40%', left: '50%', delay: 0.25, size: 6, color: '#E8C5A8' },
              ].map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0, y: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0], 
                    scale: [0, 1.2, 0.4], 
                    y: [-5, -20, -35] 
                  }}
                  transition={{ 
                    duration: 2.2, 
                    delay: p.delay, 
                    ease: "easeOut",
                    repeat: 1 
                  }}
                  style={{ 
                    position: 'absolute', 
                    top: p.top, 
                    left: p.left, 
                    right: p.right, 
                    width: p.size, 
                    height: p.size,
                    backgroundColor: p.color,
                    borderRadius: '50%',
                    boxShadow: `0 0 8px ${p.color}`
                  }}
                />
              ))}
            </div>

            <div className="relative z-10 flex items-start gap-3.5">
              {/* Luminous Emblem */}
              <div className="w-11 h-11 rounded-[16px] bg-brand-green/15 border border-brand-green/30 flex items-center justify-center text-brand-green shadow-inner shrink-0 mt-0.5">
                <motion.div
                  animate={{ scale: [1, 1.08, 1], rotate: [0, 4, -4, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: [0.16, 1, 0.3, 1] }}
                >
                  <PartyPopper className="w-5 h-5" />
                </motion.div>
              </div>

              {/* Text Block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold font-['Exo_2'] text-white drop-shadow-sm truncate">
                    {title}
                  </h4>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-green/15 text-brand-green border border-brand-green/30 shadow-inner shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>{t('debts.completed')}</span>
                  </span>
                </div>

                {personName && (
                  <p className="text-xs font-medium text-[#E8C5A8] mt-0.5 truncate">
                    {personName}
                  </p>
                )}

                <p className="text-xs text-white/70 mt-1 leading-relaxed">
                  {subtitle}
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={onClose}
                aria-label={t('debts.close')}
                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0 active:scale-95"
              >
                <X size={15} />
              </button>
            </div>

            {/* Bottom Progress Timer Bar */}
            <div className="mt-3 w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4.5, ease: 'linear' }}
                className="h-full bg-gradient-to-r from-brand-green to-emerald-400 rounded-full"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
