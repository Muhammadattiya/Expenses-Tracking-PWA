import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Finova Refined Splash Screen
 * Aligned with Liquid Glass & Ambient Copper Design System (DESIGN.md)
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
      className="fixed inset-0 z-[100] w-full min-h-[100dvh] bg-[#141115] overflow-hidden select-none flex flex-col items-center justify-center p-4 [contain:strict]"
      aria-label={t('splash.ariaLabel')}
      role="status"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <span className="sr-only">{t('splash.loading')}</span>

      {/* 1. Finova Ambient Copper Glow Spheres (Pure GPU CSS, Bidi-Symmetric) */}
      <div 
        aria-hidden="true" 
        className="absolute inset-0 pointer-events-none overflow-hidden select-none flex items-center justify-center"
      >
        {/* Primary central brand glow with authored breathing cadence */}
        <motion.div 
          animate={shouldReduceMotion ? { scale: 1, opacity: 0.4 } : {
            scale: [1, 1.06, 1],
            opacity: [0.36, 0.48, 0.36]
          }}
          transition={shouldReduceMotion ? {} : {
            duration: 2.8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute w-[min(460px,85vw)] h-[min(460px,85vw)] rounded-full bg-[#8D6346] blur-[120px] will-change-transform" 
        />
        {/* Atmospheric start-side glow (adapts naturally in RTL/LTR - static, no will-change) */}
        <div 
          className="absolute -top-16 start-[-10%] w-[320px] h-[320px] rounded-full bg-[#8D6346] opacity-30 blur-[130px]" 
        />
        {/* Counter ambient end-side glow (static, no will-change) */}
        <div 
          className="absolute -bottom-20 end-[-10%] w-[360px] h-[360px] rounded-full bg-[#8D6346] opacity-35 blur-[140px]" 
        />
      </div>

      {/* 2. Main Centered Brand Column */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 1 } : { scale: 0.97, opacity: 1 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0.2 : 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-6 w-full max-w-[320px]"
      >
        {/* Perfectly Symmetric Circular Liquid Glass Medallion Housing */}
        <motion.div 
          animate={shouldReduceMotion ? {} : {
            borderColor: ['rgba(255,255,255,0.1)', 'rgba(141,99,70,0.3)', 'rgba(255,255,255,0.1)']
          }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          className="w-[min(288px,65vw,36vh)] h-[min(288px,65vw,36vh)] aspect-square rounded-full relative shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 backdrop-blur-md bg-[#2B2321]/30 flex items-center justify-center overflow-hidden"
        >
          <svg 
            width="100%" 
            height="100%" 
            viewBox="0 0 288 288" 
            preserveAspectRatio="xMidYMid meet"
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full aspect-square select-none pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="finova_copper_medallion" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8D6346" stopOpacity="0.75" />
                <stop offset="50%" stopColor="#A47553" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#4A3427" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            <path 
              d="M144 0C223.529 0 288 64.471 288 144C288 223.529 223.529 288 144 288C64.471 288 0 223.529 0 144C0 64.471 64.471 0 144 0ZM154.4 63.1719C143.835 63.1719 135.334 66.1431 128.896 72.0859C122.457 77.8637 119.238 85.9525 119.238 96.3525V131.239C113.585 125.523 109.06 118.79 105.904 111.395C104.647 108.476 103.63 105.473 102.853 102.385C102.598 101.374 101.693 100.667 100.657 100.667C100.152 100.668 99.6623 100.837 99.2646 101.148C98.867 101.46 98.5847 101.895 98.4619 102.385C95.6287 113.369 89.9059 123.395 81.8887 131.423C76.1301 137.163 69.3283 141.752 61.8486 144.941C58.9294 146.198 55.9247 147.215 52.8359 147.992C52.3509 148.12 51.9215 148.404 51.6152 148.801C51.3088 149.198 51.1426 149.686 51.1426 150.188C51.1427 150.689 51.309 151.176 51.6152 151.573C51.9215 151.97 52.3509 152.254 52.8359 152.382C63.8251 155.218 73.8563 160.941 81.8887 168.957C89.9069 176.986 95.6297 187.015 98.4619 198.002C98.5848 198.491 98.8671 198.925 99.2646 199.235C99.6624 199.545 100.153 199.714 100.657 199.714C101.162 199.714 101.652 199.545 102.05 199.235C102.447 198.925 102.73 198.491 102.853 198.002C105.665 187.102 111.321 177.147 119.238 169.147V234.523H150.19V159.248H218.533V136.467H150.19V102.543C150.19 97.5907 151.428 93.9586 153.904 91.6475C156.38 89.3363 160.095 88.1807 165.048 88.1807H227.942L229.429 65.4004C222.165 64.575 214.241 64.0791 205.657 63.9141C197.238 63.5839 188.654 63.4189 179.904 63.4189C171.32 63.2539 162.819 63.1719 154.4 63.1719Z" 
              fill="url(#finova_copper_medallion)" 
            />
          </svg>
        </motion.div>

        {/* Typographic Text Group */}
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <h1 className="text-white font-bold text-[clamp(2rem,6vw,2.5rem)] leading-tight tracking-tight select-none drop-shadow-sm">
            Finova
          </h1>
          <p className="text-white/85 font-normal text-sm sm:text-base leading-snug tracking-normal select-none max-w-[280px] drop-shadow-sm">
            {t('auth.tagline')}
          </p>

          {/* Elegant Indeterminate Hairline Progress Gleam for Sighted Users */}
          <div 
            aria-hidden="true" 
            className="w-24 h-[2px] rounded-full bg-white/10 overflow-hidden relative mt-2"
          >
            {shouldReduceMotion ? (
              <div className="w-full h-full bg-[#8D6346]/50 rounded-full" />
            ) : (
              <motion.div
                className="w-10 h-full bg-gradient-to-r from-transparent via-[#E8C5A8] to-transparent rounded-full"
                animate={{
                  x: lang === 'ar' ? ['96px', '-40px'] : ['-40px', '96px']
                }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: [0.4, 0, 0.2, 1]
                }}
              />
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
