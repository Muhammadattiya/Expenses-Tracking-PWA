import React from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Finova Exact Splash Screen Clone from Figma (node-id=85-1288)
 * https://www.figma.com/design/OZypl111NOImWFSjRFYKgB/Finova?node-id=85-1288
 */
export default function SplashScreen() {
  const { t, lang } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ 
        opacity: 0, 
        transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } 
      }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] w-full min-h-[100dvh] bg-[#141115] overflow-hidden overscroll-none touch-none select-none flex flex-col items-center justify-center"
      aria-label="Finova Launch"
      role="status"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* 1. Exact Figma Background Glow Vector (#166:3841) */}
      <div 
        aria-hidden="true"
        className="absolute pointer-events-none -left-[84px] -top-[17px] w-[557px] h-[877px] max-w-none overflow-hidden"
      >
        <svg 
          width="1289" 
          height="1537" 
          viewBox="0 0 1289 1537" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
        >
          <g filter="url(#splash_glow_0)">
            <circle cx="806.205" cy="722.794" r="116.515" fill="#8D6346" fillOpacity="0.48"/>
          </g>
          <g filter="url(#splash_glow_1)">
            <circle cx="494.164" cy="410.753" r="116.515" fill="#8D6346" fillOpacity="0.48"/>
          </g>
          <g filter="url(#splash_glow_2)">
            <circle cx="482.163" cy="1054.84" r="116.515" fill="#8D6346" fillOpacity="0.48"/>
          </g>
          <defs>
            <filter id="splash_glow_0" x="324.042" y="240.631" width="964.325" height="964.325" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="182.8" result="effect1_foregroundBlur"/>
            </filter>
            <filter id="splash_glow_1" x="83.4108" y="0" width="821.507" height="821.507" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="147.1" result="effect1_foregroundBlur"/>
            </filter>
            <filter id="splash_glow_2" x="0" y="572.675" width="964.325" height="964.325" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="182.8" result="effect1_foregroundBlur"/>
            </filter>
          </defs>
        </svg>
      </div>

      {/* 2. Main Centered Column (#116:2155) */}
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center gap-6 w-[288px]"
      >
        {/* Exact Medallion Boolean Subtract (#112:2080) */}
        <div 
          className="w-[288px] h-[288px] rounded-full relative shrink-0 shadow-[inset_0_-1px_2px_rgba(255,255,255,0.2),0_4px_24px_rgba(0,0,0,0.35)]"
        >
          <svg 
            width="288" 
            height="288" 
            viewBox="0 0 288 288" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full select-none pointer-events-none"
          >
            <path 
              d="M144 0C223.529 0 288 64.471 288 144C288 223.529 223.529 288 144 288C64.471 288 0 223.529 0 144C0 64.471 64.471 0 144 0ZM154.4 63.1719C143.835 63.1719 135.334 66.1431 128.896 72.0859C122.457 77.8637 119.238 85.9525 119.238 96.3525V131.239C113.585 125.523 109.06 118.79 105.904 111.395C104.647 108.476 103.63 105.473 102.853 102.385C102.598 101.374 101.693 100.667 100.657 100.667C100.152 100.668 99.6623 100.837 99.2646 101.148C98.867 101.46 98.5847 101.895 98.4619 102.385C95.6287 113.369 89.9059 123.395 81.8887 131.423C76.1301 137.163 69.3283 141.752 61.8486 144.941C58.9294 146.198 55.9247 147.215 52.8359 147.992C52.3509 148.12 51.9215 148.404 51.6152 148.801C51.3088 149.198 51.1426 149.686 51.1426 150.188C51.1427 150.689 51.309 151.176 51.6152 151.573C51.9215 151.97 52.3509 152.254 52.8359 152.382C63.8251 155.218 73.8563 160.941 81.8887 168.957C89.9069 176.986 95.6297 187.015 98.4619 198.002C98.5848 198.491 98.8671 198.925 99.2646 199.235C99.6624 199.545 100.153 199.714 100.657 199.714C101.162 199.714 101.652 199.545 102.05 199.235C102.447 198.925 102.73 198.491 102.853 198.002C105.665 187.102 111.321 177.147 119.238 169.147V234.523H150.19V159.248H218.533V136.467H150.19V102.543C150.19 97.5907 151.428 93.9586 153.904 91.6475C156.38 89.3363 160.095 88.1807 165.048 88.1807H227.942L229.429 65.4004C222.165 64.575 214.241 64.0791 205.657 63.9141C197.238 63.5839 188.654 63.4189 179.904 63.4189C171.32 63.2539 162.819 63.1719 154.4 63.1719Z" 
              fill="#8D6346" 
              fillOpacity="0.3"
            />
          </svg>
        </div>

        {/* Text Frame (#116:2154) */}
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-white font-['Exo_2'] font-semibold text-[40px] leading-tight tracking-tight select-none">
            Finova
          </h1>
          <p className="text-white font-['Exo_2'] font-semibold text-[16px] leading-snug tracking-normal select-none">
            {t('auth.tagline')}
          </p>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
