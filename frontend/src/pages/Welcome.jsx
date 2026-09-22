import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import GoogleLoginButton from '../components/GoogleLoginButton';

export default function Welcome() {
  const { t, lang, setLang } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full flex-1 flex flex-col justify-between items-center relative select-none py-1"
    >
      {/* Top Header Bar: Finova Segmented Glass Language Switcher */}
      <header className="w-full flex justify-end shrink-0 pt-1">
        <div className="flex items-center bg-black/30 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.2)]">
          <Globe size={13} className="text-[#E8C5A8] ms-2 me-1 shrink-0 opacity-80" />
          <button
            type="button"
            onClick={() => setLang('ar')}
            className={`min-h-[32px] px-3.5 py-1 rounded-full text-xs font-semibold transition-all relative z-10 select-none flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] ${
              lang === 'ar' ? 'text-white' : 'text-white/50 hover:text-white/80'
            }`}
            aria-label="العربية"
          >
            {lang === 'ar' && (
              <motion.div
                layoutId="welcomeLangIndicator"
                className="absolute inset-0 bg-[#8D6346]/50 border border-[#8D6346]/60 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.2)] -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            عربي
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`min-h-[32px] px-3.5 py-1 rounded-full text-xs font-semibold transition-all relative z-10 select-none flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] ${
              lang === 'en' ? 'text-white' : 'text-white/50 hover:text-white/80'
            }`}
            aria-label="English"
          >
            {lang === 'en' && (
              <motion.div
                layoutId="welcomeLangIndicator"
                className="absolute inset-0 bg-[#8D6346]/50 border border-[#8D6346]/60 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_2px_rgba(255,255,255,0.2)] -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            EN
          </button>
        </div>
      </header>

      {/* Hero Group: Commanding Liquid Glass Brand Mark */}
      <section className="flex-1 flex flex-col items-center justify-center text-center my-auto py-4 w-full">
        <motion.div 
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 120, 
            damping: 20 
          }}
          className="size-52 sm:size-60 aspect-square relative flex justify-center items-center"
        >
          {/* Ambient copper backing blur */}
          <div className="absolute inset-0 bg-[#8D6346]/45 blur-[60px] rounded-full -z-10 animate-pulse" style={{ animationDuration: '3.5s' }} />

          {/* Liquid Glass Circular Housing */}
          <motion.div
            animate={{ y: shouldReduceMotion ? 0 : [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-full h-full rounded-full border border-white/20 bg-[#2B2321]/40 backdrop-blur-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_16px_40px_rgba(0,0,0,0.6)] flex items-center justify-center p-8 sm:p-9"
          >
            <svg 
              viewBox="0 0 288 288" 
              className="w-full h-full aspect-square select-none pointer-events-none"
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="welcome_copper_gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#E8C5A8" />
                  <stop offset="50%" stopColor="#8D6346" />
                  <stop offset="100%" stopColor="#3D2E2B" />
                </linearGradient>
              </defs>
              <path 
                d="M144 0C223.529 0 288 64.471 288 144C288 223.529 223.529 288 144 288C64.471 288 0 223.529 0 144C0 64.471 64.471 0 144 0ZM154.4 63.1719C143.835 63.1719 135.334 66.1431 128.896 72.0859C122.457 77.8637 119.238 85.9525 119.238 96.3525V131.239C113.585 125.523 109.06 118.79 105.904 111.395C104.647 108.476 103.63 105.473 102.853 102.385C102.598 101.374 101.693 100.667 100.657 100.667C100.152 100.668 99.6623 100.837 99.2646 101.148C98.867 101.46 98.5847 101.895 98.4619 102.385C95.6287 113.369 89.9059 123.395 81.8887 131.423C76.1301 137.163 69.3283 141.752 61.8486 144.941C58.9294 146.198 55.9247 147.215 52.8359 147.992C52.3509 148.12 51.9215 148.404 51.6152 148.801C51.3088 149.198 51.1426 149.686 51.1426 150.188C51.1427 150.689 51.309 151.176 51.6152 151.573C51.9215 151.97 52.3509 152.254 52.8359 152.382C63.8251 155.218 73.8563 160.941 81.8887 168.957C89.9069 176.986 95.6297 187.015 98.4619 198.002C98.5848 198.491 98.8671 198.925 99.2646 199.235C99.6624 199.545 100.153 199.714 100.657 199.714C101.162 199.714 101.652 199.545 102.05 199.235C102.447 198.925 102.73 198.491 102.853 198.002C105.665 187.102 111.321 177.147 119.238 169.147V234.523H150.19V159.248H218.533V136.467H150.19V102.543C150.19 97.5907 151.428 93.9586 153.904 91.6475C156.38 89.3363 160.095 88.1807 165.048 88.1807H227.942L229.429 65.4004C222.165 64.575 214.241 64.0791 205.657 63.9141C197.238 63.5839 188.654 63.4189 179.904 63.4189C171.32 63.2539 162.819 63.1719 154.4 63.1719Z" 
                fill="url(#welcome_copper_gradient)" 
              />
            </svg>
          </motion.div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex flex-col items-center mt-5 text-center px-4"
        >
          <h1 className="font-extrabold text-[42px] sm:text-[48px] text-white leading-none tracking-tight drop-shadow-md font-['Exo_2']">
            Finova
          </h1>
          <p className="font-medium text-[15px] sm:text-[16.5px] text-white/75 tracking-wide mt-2.5 max-w-[320px] leading-relaxed">
            {t('auth.tagline')}
          </p>
        </motion.div>
      </section>

      {/* Actions Group: Full-Width Mobile Action Buttons */}
      <motion.nav 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="w-full max-w-sm flex flex-col items-stretch gap-3 shrink-0 pb-2"
        aria-label="Authentication"
      >
        {/* Primary Action: Sign Up */}
        <motion.div whileTap={{ scale: 0.98 }} className="w-full">
          <Link 
            to="/signup"
            className="h-14 w-full rounded-2xl font-bold text-base text-white shadow-[0_8px_25px_rgba(141,99,70,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)] transition-all duration-300 active:scale-[0.98] bg-gradient-to-r from-[#8D6346] via-[#9E7252] to-[#A47553] hover:brightness-110 border border-white/20 flex items-center justify-center gap-2 backdrop-blur-md touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
          >
            <span>{t('auth.signup')}</span>
          </Link>
        </motion.div>

        {/* Secondary Action: Login */}
        <motion.div whileTap={{ scale: 0.98 }} className="w-full">
          <Link 
            to="/login"
            className="h-14 w-full rounded-2xl font-semibold text-base text-white/90 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-300 active:scale-[0.98] bg-white/10 border border-white/15 hover:bg-white/15 flex items-center justify-center gap-2 backdrop-blur-md touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
          >
            <span>{t('auth.login')}</span>
          </Link>
        </motion.div>

        {/* Third-Party Alternative Authentication */}
        <div className="flex flex-col items-center justify-center gap-3 mt-2">
          <div className="flex items-center justify-center gap-3 w-full px-1">
            <div className="h-px flex-1 bg-white/15" />
            <span className="text-xs font-medium text-white/50 tracking-wider whitespace-nowrap">
              {t('auth.continueWith')}
            </span>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          <div>
            <GoogleLoginButton />
          </div>
        </div>
      </motion.nav>
    </motion.div>
  );
}
