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
      className="w-full flex flex-col items-center h-[100dvh] justify-center py-6"
    >
      {/* Top Section: Logo & Text */}
      <div className="flex flex-col items-center gap-1.5 flex-1 justify-center max-h-[60vh]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 100, 
            damping: 20, 
            duration: 0.8 
          }}
          className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] relative flex justify-center items-center"
        >
          <motion.img 
             src="/images/finova_logo.png" 
             alt="Finova Logo" 
             className="w-full h-full object-contain"
             animate={{ y: [0, -8, 0] }}
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
          className="flex flex-col items-center gap-2 mt-2"
        >
          <h1 className="font-['Exo_2'] font-semibold text-[42px] sm:text-[48px] text-white leading-none">Finova</h1>
          <p className="font-['Exo_2'] font-semibold text-[15px] sm:text-[16px] text-white">Redefining your money.</p>
        </motion.div>
      </div>

      {/* Bottom Section: Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="w-[180px] flex flex-col items-stretch gap-4 mt-6 pb-4"
      >
        <div className="flex flex-col gap-4">
          <motion.div whileTap={{ scale: 0.95 }} className="w-full">
            <Link 
              to="/login"
              className="flex h-[48px] w-full items-center justify-center rounded-[40px] bg-[rgba(141,99,70,0.3)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] font-['Exo_2'] text-[18px] text-white transition-all hover:bg-[rgba(141,99,70,0.4)]"
            >
              {t('auth.login')}
            </Link>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }} className="w-full">
            <Link 
              to="/signup"
              className="flex h-[48px] w-full items-center justify-center rounded-[40px] bg-[rgba(141,99,70,0.3)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] font-['Exo_2'] text-[18px] text-white transition-all hover:bg-[rgba(141,99,70,0.4)]"
            >
              {t('auth.signup')}
            </Link>
          </motion.div>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 mt-1">
          <div className="flex items-center justify-center gap-2 w-full">
            <div className="h-[0.5px] flex-1 bg-white/50" />
            <span className="font-['Exo_2'] text-[14px] text-white/80">{t('auth.continueWith')}</span>
            <div className="h-[0.5px] flex-1 bg-white/50" />
          </div>

          <div className="mt-1">
            <GoogleLoginButton />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
