import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import GoogleLoginButton from '../components/GoogleLoginButton';

export default function Welcome() {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full h-full max-h-[100dvh] flex flex-col items-center justify-between overflow-hidden touch-none select-none min-h-0"
    >
      {/* Top Section: Logo & Text */}
      <div className="flex flex-col items-center justify-center gap-1 sm:gap-2 flex-1 min-h-0 w-full">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 100, 
            damping: 20, 
            duration: 0.8 
          }}
          className="w-[min(58vw,260px)] h-[min(58vw,260px)] max-h-[30vh] sm:w-[280px] sm:h-[280px] sm:max-h-[36vh] aspect-square relative flex justify-center items-center shrink-0"
        >
          <motion.img 
             src="/images/finova_logo.png" 
             alt="Finova Logo" 
             className="w-full h-full object-contain pointer-events-none drop-shadow-2xl"
             animate={{ y: [0, -6, 0] }}
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
          className="flex flex-col items-center gap-1 sm:gap-2 mt-1 sm:mt-2 text-center"
        >
          <h1 className="font-['Exo_2'] font-semibold text-[36px] xs:text-[42px] sm:text-[48px] text-white leading-none tracking-tight">Finova</h1>
          <p className="font-['Exo_2'] font-medium text-[14px] sm:text-[16px] text-white/80 tracking-wide">Redefining your money.</p>
        </motion.div>
      </div>

      {/* Bottom Section: Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="w-full max-w-[210px] xs:max-w-[230px] flex flex-col items-stretch gap-3.5 sm:gap-4 shrink-0 pointer-events-auto"
      >
        <div className="flex flex-col gap-3 sm:gap-4">
          <motion.div whileTap={{ scale: 0.95 }} className="w-full">
            <Link 
              to="/login"
              className="flex h-[46px] sm:h-[48px] w-full items-center justify-center rounded-[40px] bg-[rgba(141,99,70,0.3)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] font-['Exo_2'] text-[16px] sm:text-[18px] text-white transition-all hover:bg-[rgba(141,99,70,0.4)] touch-manipulation"
            >
              {t('auth.login')}
            </Link>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }} className="w-full">
            <Link 
              to="/signup"
              className="flex h-[46px] sm:h-[48px] w-full items-center justify-center rounded-[40px] bg-[rgba(141,99,70,0.3)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] font-['Exo_2'] text-[16px] sm:text-[18px] text-white transition-all hover:bg-[rgba(141,99,70,0.4)] touch-manipulation"
            >
              {t('auth.signup')}
            </Link>
          </motion.div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 mt-0.5">
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="h-[0.5px] flex-1 bg-white/40" />
            <span className="font-['Exo_2'] text-[13px] sm:text-[14px] text-white/80 whitespace-nowrap">{t('auth.continueWith')}</span>
            <div className="h-[0.5px] flex-1 bg-white/40" />
          </div>

          <div className="mt-0.5">
            <GoogleLoginButton />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
