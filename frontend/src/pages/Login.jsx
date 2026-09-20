import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { loginUser } from '../api/auth';
import { handleUserSessionTransition } from '../utils/offlineSession';
import GoogleLoginButton from '../components/GoogleLoginButton';
import ErrorMessage from '../components/ui/ErrorMessage';

export default function Login() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await loginUser({ email, password });
      await handleUserSessionTransition(result.user);
      localStorage.setItem('auth_user', JSON.stringify(result.user));
      window.location.assign('/'); 
    } catch (err) {
      setError(err.response?.data?.message || t('auth.invalidCredentials'));
      setLoading(false);
    }
  };

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <motion.div
      initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: shouldReduceMotion ? 0 : -20 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="w-full flex flex-col justify-center py-2 sm:py-4"
    >
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <Link 
          to="/welcome" 
          aria-label={t('common.back', 'Back')}
          className="w-11 h-11 flex items-center justify-center bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-full text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
        >
          <BackIcon size={22} />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-sm">
          {t('auth.login')}
        </h1>
        <div className="w-11" /> {/* Spacer */}
      </div>

      <motion.form 
        onSubmit={handleSubmit} 
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          type: 'spring', 
          stiffness: 280, 
          damping: 24, 
          mass: 0.85,
          delay: 0.08 
        }}
        className="relative overflow-hidden w-full bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-black/35 backdrop-blur-[32px] border border-white/10 p-6 sm:p-8 rounded-[28px] space-y-5 sm:space-y-6 shadow-[0_24px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-1px_1px_rgba(0,0,0,0.3)]"
      >
        {/* Specular top rim light */}
        <div className="pointer-events-none absolute -top-px inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        
        {/* Ambient warm corner glow */}
        <div className="pointer-events-none absolute -top-16 -end-16 w-36 h-36 bg-[#8D6346]/20 rounded-full blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -start-16 w-36 h-36 bg-[#8D6346]/15 rounded-full blur-2xl" />

        <div className="relative z-10 space-y-3.5 sm:space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-xs sm:text-sm font-medium text-white/85 px-1.5 drop-shadow-sm">
              {t('auth.email')}
            </label>
            <input 
              id="login-email"
              type="email"
              required 
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/30 hover:bg-black/45 hover:border-white/20 border border-white/10 focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 focus:shadow-[0_0_16px_rgba(141,99,70,0.35)] focus:bg-black/55 rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 text-sm sm:text-base text-white placeholder-white/40 outline-none transition-all duration-300 shadow-inner" 
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-xs sm:text-sm font-medium text-white/85 px-1.5 drop-shadow-sm">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input 
                id="login-password"
                type={showPassword ? "text" : "password"}
                required 
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/30 hover:bg-black/45 hover:border-white/20 border border-white/10 focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 focus:shadow-[0_0_16px_rgba(141,99,70,0.35)] focus:bg-black/55 rounded-2xl ps-4 sm:ps-5 pe-12 py-3.5 sm:py-4 text-sm sm:text-base text-white placeholder-white/40 outline-none transition-all duration-300 shadow-inner" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-all p-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {/* Primary Action Button (Signature BillCard 'Pay Now' Style) */}
        <motion.button 
          whileTap={{ scale: 0.98 }}
          disabled={loading} 
          type="submit"
          className="relative z-10 h-12 sm:h-[50px] w-full rounded-full font-semibold text-sm sm:text-base text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md mt-5 sm:mt-6 disabled:opacity-50 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
        >
          {loading ? <Loader2 size={18} className="animate-spin text-white" /> : null}
          <span>{t('auth.login')}</span>
        </motion.button>
      </motion.form>

      <motion.div 
        initial={shouldReduceMotion ? {} : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
        className="w-full flex flex-col items-center gap-4 mt-6 sm:mt-8"
      >
        <div className="flex items-center justify-center gap-3 w-full max-w-[220px]">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-white/5" />
          <span className="text-xs sm:text-sm text-white/50">{t('auth.continueWith')}</span>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/20 to-white/5" />
        </div>
        <div className="flex items-center justify-center mt-1">
          <GoogleLoginButton />
        </div>
      </motion.div>

      <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-white/70">
        {t('auth.dontHaveAccount')}{' '}
        <Link to="/signup" className="text-white font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] rounded-md px-1">
          {t('auth.signup')}
        </Link>
      </div>
    </motion.div>
  );
}
