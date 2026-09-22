import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { AmbientBackground } from './ui';

/**
 * Finova Refined Splash Screen
 * Aligned with Liquid Glass & Ambient Copper Design System from Dashboard & Onboarding
 */
export default function SplashScreen() {
  const { t, lang } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        scale: shouldReduceMotion ? 1 : 0.98,
        transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } 
      }}
      transition={{ duration: 0.2 }}
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[100] w-full min-h-screen text-white flex flex-col justify-between selection:bg-[#8D6346]/40 overflow-x-hidden select-none"
      aria-label={t('splash.ariaLabel', 'Finova Loading Screen')}
      role="status"
    >
      <span className="sr-only">{t('splash.loading', 'Loading...')}</span>

      {/* Universal Ambient Copper Glow (Exact Theme from Dashboard & Onboarding) */}
      <AmbientBackground variant="dashboard" />

      {/* Top Header / Optical Balance Spacer */}
      <header className="w-full max-w-md mx-auto pt-[max(1.25rem,env(safe-area-inset-top))] px-4 shrink-0 flex justify-center items-center pointer-events-none" />

      {/* Main Flow Canvas — Natural Full-Height Proportions (Matching Onboarding) */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col justify-center items-center">
        {/* Perfectly Symmetric Circular Liquid Glass Medallion Housing */}
        <motion.div 
          initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: shouldReduceMotion ? 0.2 : 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="size-52 sm:size-60 aspect-square rounded-full relative shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_20px_50px_rgba(0,0,0,0.7)] border border-white/20 backdrop-blur-2xl bg-[#2B2321]/45 flex items-center justify-center p-8 sm:p-9 overflow-hidden"
        >
          {/* Ambient copper backing blur */}
          <div className="absolute inset-0 bg-[#8D6346]/40 blur-[50px] rounded-full -z-10 animate-pulse" style={{ animationDuration: '3.5s' }} />

          {/* Subtle metallic sweep shimmer */}
          {!shouldReduceMotion && (
            <motion.div
              className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none -skew-x-12"
              animate={{ x: ['-100%', '150%'] }}
              transition={{ repeat: Infinity, repeatDelay: 3, duration: 2, ease: "easeInOut" }}
            />
          )}

          <svg 
            width="100%" 
            height="100%" 
            viewBox="0 0 288 288" 
            preserveAspectRatio="xMidYMid meet"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full aspect-square select-none pointer-events-none relative z-10"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="finova_copper_medallion" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#E8C5A8" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#8D6346" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#3D2E2B" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <path 
              d="M144 0C223.529 0 288 64.471 288 144C288 223.529 223.529 288 144 288C64.471 288 0 223.529 0 144C0 64.471 64.471 0 144 0ZM154.4 63.1719C143.835 63.1719 135.334 66.1431 128.896 72.0859C122.457 77.8637 119.238 85.9525 119.238 96.3525V131.239C113.585 125.523 109.06 118.79 105.904 111.395C104.647 108.476 103.63 105.473 102.853 102.385C102.598 101.374 101.693 100.667 100.657 100.667C100.152 100.668 99.6623 100.837 99.2646 101.148C98.867 101.46 98.5847 101.895 98.4619 102.385C95.6287 113.369 89.9059 123.395 81.8887 131.423C76.1301 137.163 69.3283 141.752 61.8486 144.941C58.9294 146.198 55.9247 147.215 52.8359 147.992C52.3509 148.12 51.9215 148.404 51.6152 148.801C51.3088 149.198 51.1426 149.686 51.1426 150.188C51.1427 150.689 51.309 151.176 51.6152 151.573C51.9215 151.97 52.3509 152.254 52.8359 152.382C63.8251 155.218 73.8563 160.941 81.8887 168.957C89.9069 176.986 95.6297 187.015 98.4619 198.002C98.5848 198.491 98.8671 198.925 99.2646 199.235C99.6624 199.545 100.153 199.714 100.657 199.714C101.162 199.714 101.652 199.545 102.05 199.235C102.447 198.925 102.73 198.491 102.853 198.002C105.665 187.102 111.321 177.147 119.238 169.147V234.523H150.19V159.248H218.533V136.467H150.19V102.543C150.19 97.5907 151.428 93.9586 153.904 91.6475C156.38 89.3363 160.095 88.1807 165.048 88.1807H227.942L229.429 65.4004C222.165 64.575 214.241 64.0791 205.657 63.9141C197.238 63.5839 188.654 63.4189 179.904 63.4189C171.32 63.2539 162.819 63.1719 154.4 63.1719Z" 
              fill="url(#finova_copper_medallion)" 
            />
          </svg>
        </motion.div>

        {/* Typographic Text Group */}
        <div className="flex flex-col items-center text-center mt-6">
          <h1 className="text-white font-extrabold text-[42px] sm:text-[48px] leading-none tracking-tight select-none drop-shadow-md font-['Exo_2']">
            Finova
          </h1>
          <p className="text-white/80 font-medium text-[15.5px] sm:text-[17px] leading-relaxed select-none max-w-[320px] font-['Exo_2'] mt-2.5">
            {t('auth.tagline', 'صياغة جديدة لتعاملك مع المال')}
          </p>

          {/* Elegant Indeterminate Hairline Progress Gleam */}
          <div 
            aria-hidden="true" 
            className="w-28 h-[2.5px] rounded-full bg-white/10 overflow-hidden relative mt-4"
          >
            {shouldReduceMotion ? (
              <div className="w-full h-full bg-[#8D6346]/60 rounded-full" />
            ) : (
              <motion.div
                className="w-12 h-full bg-gradient-to-r from-transparent via-[#E8C5A8] to-transparent rounded-full"
                animate={{
                  x: lang === 'ar' ? ['112px', '-48px'] : ['-48px', '112px']
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: [0.4, 0, 0.2, 1]
                }}
              />
            )}
          </div>
        </div>
      </main>

      {/* Bottom Hallmark Anchor (Anchored firmly above safe area) */}
      <footer className="w-full max-w-md mx-auto pb-[max(1.75rem,env(safe-area-inset-bottom))] px-5 pt-3 shrink-0 flex flex-col items-center select-none pointer-events-none">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 border border-white/10 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <span className="size-2 rounded-full bg-[#34C759] shadow-[0_0_8px_rgba(52,199,89,0.7)] animate-pulse" />
          <span className="text-xs font-semibold text-white/70 tracking-wide font-['Exo_2']">
            {t('splash.secureEngine', 'المنظومة المالية الذكية • دون اتصال')}
          </span>
        </div>
      </footer>
    </motion.div>
  );
}
