import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { registerUser } from '../api/auth';
import { handleUserSessionTransition } from '../utils/offlineSession';
import GoogleLoginButton from '../components/GoogleLoginButton';
import ErrorMessage from '../components/ui/ErrorMessage';

export default function Signup() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const [name, setName] = useState('');
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
      const result = await registerUser({ name, email, password });
      await handleUserSessionTransition(result.user);
      localStorage.setItem('auth_user', JSON.stringify(result.user));
      window.location.assign('/'); 
    } catch (err) {
      setError(err.response?.data?.message || t('auth.signupError'));
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
          {t('auth.signup')}
        </h1>
        <div className="w-11" /> {/* Spacer */}
      </div>

      <form 
        onSubmit={handleSubmit} 
        className="w-full bg-[#2B2321]/30 backdrop-blur-xl border border-white/10 border-t-white/25 border-s-white/20 p-5 sm:p-7 rounded-[2rem] sm:rounded-[2.5rem] space-y-5 sm:space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)]"
      >
        <div className="space-y-3.5 sm:space-y-4">
          <div>
            <label htmlFor="signup-name" className="mb-1.5 block text-xs sm:text-sm font-medium text-white/85 px-1.5 drop-shadow-sm">
              {t('auth.name')}
            </label>
            <input 
              id="signup-name"
              type="text"
              required 
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/30 hover:bg-black/40 hover:border-white/20 border border-white/10 focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 focus:shadow-[0_0_16px_rgba(141,99,70,0.35)] focus:bg-black/50 rounded-2xl sm:rounded-3xl px-4 sm:px-5 py-3.5 sm:py-4 text-sm sm:text-base text-white placeholder-white/40 outline-none transition-all duration-300 shadow-inner" 
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="mb-1.5 block text-xs sm:text-sm font-medium text-white/85 px-1.5 drop-shadow-sm">
              {t('auth.email')}
            </label>
            <input 
              id="signup-email"
              type="email"
              required 
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/30 hover:bg-black/40 hover:border-white/20 border border-white/10 focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 focus:shadow-[0_0_16px_rgba(141,99,70,0.35)] focus:bg-black/50 rounded-2xl sm:rounded-3xl px-4 sm:px-5 py-3.5 sm:py-4 text-sm sm:text-base text-white placeholder-white/40 outline-none transition-all duration-300 shadow-inner" 
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-1.5 block text-xs sm:text-sm font-medium text-white/85 px-1.5 drop-shadow-sm">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input 
                id="signup-password"
                type={showPassword ? "text" : "password"}
                required 
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/30 hover:bg-black/40 hover:border-white/20 border border-white/10 focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 focus:shadow-[0_0_16px_rgba(141,99,70,0.35)] focus:bg-black/50 rounded-2xl sm:rounded-3xl ps-4 sm:ps-5 pe-12 py-3.5 sm:py-4 text-sm sm:text-base text-white placeholder-white/40 outline-none transition-all duration-300 shadow-inner" 
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
          className="h-12 sm:h-[50px] w-full rounded-full font-semibold text-sm sm:text-base text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md mt-5 sm:mt-6 disabled:opacity-50 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
        >
          {loading ? <Loader2 size={18} className="animate-spin text-white" /> : null}
          <span>{t('auth.signup')}</span>
        </motion.button>
      </form>

      <div className="w-full flex flex-col items-center gap-4 mt-6 sm:mt-8">
        <div className="flex items-center justify-center gap-3 w-full max-w-[220px]">
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-white/20 to-white/5" />
          <span className="text-xs sm:text-sm text-white/50">{t('auth.continueWith')}</span>
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-white/20 to-white/5" />
        </div>
        <div className="flex items-center justify-center mt-1">
          <GoogleLoginButton />
        </div>
      </div>

      <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-white/70">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link to="/login" className="text-white font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] rounded-md px-1">
          {t('auth.login')}
        </Link>
      </div>
    </motion.div>
  );
}
