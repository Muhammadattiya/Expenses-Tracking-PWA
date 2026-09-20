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
      className="w-full flex flex-col items-center justify-center my-auto py-2 relative"
    >
      {/* Top Header Bar: Finova Segmented Glass Language Switcher */}
      <div className="w-full max-w-sm flex justify-end px-2 pt-1 mb-2">
        <div className="flex items-center bg-black/30 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.2)]">
          <Globe size={13} className="text-[#E8C5A8] ms-2 me-1 shrink-0 opacity-80" />
          <button
            type="button"
            onClick={() => setLang('ar')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all relative z-10 select-none ${
              lang === 'ar' ? 'text-white' : 'text-white/50 hover:text-white/80'
            }`}
            aria-label="العربية"
          >
            {lang === 'ar' && (
              <motion.div
                layoutId="welcomeLangIndicator"
                className="absolute inset-0 bg-[#8D6346]/40 border border-[#8D6346]/60 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            عربي
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all relative z-10 select-none ${
              lang === 'en' ? 'text-white' : 'text-white/50 hover:text-white/80'
            }`}
            aria-label="English"
          >
            {lang === 'en' && (
              <motion.div
                layoutId="welcomeLangIndicator"
                className="absolute inset-0 bg-[#8D6346]/40 border border-[#8D6346]/60 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.2)] -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            EN
          </button>
        </div>
      </div>

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
          className="w-[200px] h-[200px] sm:w-[260px] sm:h-[260px] max-w-[65vw] max-h-[32vh] relative flex justify-center items-center"
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
          className="flex flex-col items-center gap-2 mt-1 text-center"
        >
          <h1 className="font-semibold text-[40px] sm:text-[46px] text-white leading-none tracking-tight">Finova</h1>
          <p className="font-semibold text-[15px] sm:text-[16px] text-white/90 tracking-wide">{t('auth.tagline')}</p>
        </motion.div>
      </div>

      {/* Bottom Section: Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="w-full max-w-[280px] sm:max-w-xs flex flex-col items-stretch mt-7 pointer-events-auto"
      >
        <div className="flex flex-col gap-3">
          {/* Primary Action: Sign Up (Finova Signature BillCard Button Style) */}
          <motion.div whileTap={{ scale: 0.98 }} className="w-full">
            <Link 
              to="/signup"
              className="h-[48px] w-full rounded-full font-semibold text-[16px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
            >
              <span>{t('auth.signup')}</span>
            </Link>
          </motion.div>

          {/* Secondary Action: Login */}
          <motion.div whileTap={{ scale: 0.98 }} className="w-full">
            <Link 
              to="/login"
              className="h-[48px] w-full rounded-full font-semibold text-[16px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-white/10 border border-white/15 hover:bg-white/15 hover:border-white/25 flex items-center justify-center gap-2 backdrop-blur-md touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
            >
              <span>{t('auth.login')}</span>
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
