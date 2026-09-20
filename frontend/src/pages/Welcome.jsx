import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
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
      className="w-full flex flex-col items-center justify-center my-auto py-4 relative"
    >
      {/* Top-Corner Floating Language Switcher */}
      <button
        type="button"
        onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
        className="absolute top-2 end-2 z-20 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
        aria-label="Switch language"
      >
        {lang === 'ar' ? 'English' : 'عربي'}
      </button>

      {/* Top Section: Logo & Text */}
      <div className="flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 100, 
            damping: 20, 
            duration: 0.8 
          }}
          className="w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] max-w-[70vw] max-h-[35vh] relative flex justify-center items-center"
        >
          <motion.img 
            src="/images/finova_logo.png" 
            aria-hidden="true"
            width={280}
            height={280}
            className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
            animate={{ y: shouldReduceMotion ? 0 : [0, -8, 0] }}
            transition={{ 
              repeat: Infinity, 
              duration: 4, 
              ease: "easeInOut" 
            }}
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="flex flex-col items-center gap-2 mt-2 text-center"
        >
          <h1 className="font-semibold text-[44px] sm:text-[48px] text-white leading-none tracking-tight">Finova</h1>
          <p className="font-semibold text-[16px] text-white/90 tracking-wide">{t('auth.tagline')}</p>
        </motion.div>
      </div>

      {/* Bottom Section: Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="w-full max-w-[280px] sm:max-w-xs flex flex-col items-stretch mt-8 pointer-events-auto"
      >
        <div className="flex flex-col gap-3">
          {/* Primary Action: Sign Up */}
          <motion.div whileTap={{ scale: 0.95 }} className="w-full">
            <Link 
              to="/signup"
              className="flex h-[48px] w-full items-center justify-center rounded-[40px] bg-[#8D6346] text-white hover:bg-[#E8C5A8] hover:text-[#3D2E2B] shadow-[0_4px_20px_rgba(141,99,70,0.35),inset_0_1px_1px_rgba(255,255,255,0.2)] font-semibold transition-all duration-200 text-[18px] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
            >
              {t('auth.signup')}
            </Link>
          </motion.div>

          {/* Secondary Action: Login */}
          <motion.div whileTap={{ scale: 0.95 }} className="w-full">
            <Link 
              to="/login"
              className="flex h-[48px] w-full items-center justify-center rounded-[40px] bg-white/10 text-white border border-white/15 hover:bg-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-200 text-[18px] touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
            >
              {t('auth.login')}
            </Link>
          </motion.div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 mt-6">
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="h-px flex-1 bg-white/20" />
            <span className="text-[14px] text-white/70 whitespace-nowrap">{t('auth.continueWith')}</span>
            <div className="h-px flex-1 bg-white/20" />
          </div>

          <div>
            <GoogleLoginButton />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
