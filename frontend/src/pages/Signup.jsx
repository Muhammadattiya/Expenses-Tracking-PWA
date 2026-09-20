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
      className="w-full flex flex-col min-h-[100dvh] justify-center py-6"
    >
      <div className="flex justify-between items-center mb-8">
        <Link 
          to="/welcome" 
          aria-label={t('common.back', 'Back')}
          className="p-3 bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-full text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
        >
          <BackIcon size={24} />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
          {t('auth.signup')}
        </h1>
        <div className="w-12" /> {/* Spacer */}
      </div>

      <form 
        onSubmit={handleSubmit} 
        className="w-full bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-s-white/20 p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)]"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="signup-name" className="mb-1.5 block text-sm font-medium text-white/90 px-2 drop-shadow-sm">
              {t('auth.name')}
            </label>
            <input 
              id="signup-name"
              type="text"
              required 
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/30 backdrop-blur-md border border-white/10 focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] rounded-3xl px-5 py-4 text-white placeholder-white/50 outline-none transition-all duration-300 shadow-inner" 
            />
          </div>
          <div>
            <label htmlFor="signup-email" className="mb-1.5 block text-sm font-medium text-white/90 px-2 drop-shadow-sm">
              {t('auth.email')}
            </label>
            <input 
              id="signup-email"
              type="email"
              required 
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/30 backdrop-blur-md border border-white/10 focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] rounded-3xl px-5 py-4 text-white placeholder-white/50 outline-none transition-all duration-300 shadow-inner" 
            />
          </div>
          <div>
            <label htmlFor="signup-password" className="mb-1.5 block text-sm font-medium text-white/90 px-2 drop-shadow-sm">
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
                className="w-full bg-black/30 backdrop-blur-md border border-white/10 focus:border-[#8D6346] focus:ring-2 focus:ring-[#8D6346]/40 focus:shadow-[0_0_12px_rgba(141,99,70,0.3)] rounded-3xl ps-5 pe-12 py-4 text-white placeholder-white/50 outline-none transition-all duration-300 shadow-inner" 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                className="absolute end-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-1.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
          className="h-[50px] w-full rounded-full font-semibold text-[16px] text-white shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_1px_rgba(255,255,255,0.18)] transition-all duration-300 active:scale-[0.98] bg-[#8D6346]/30 border border-[#8D6346]/50 hover:bg-[#8D6346]/45 hover:border-[#8D6346]/70 flex items-center justify-center gap-2 backdrop-blur-md mt-6 disabled:opacity-50 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
        >
          {loading ? <Loader2 size={18} className="animate-spin text-white" /> : null}
          <span>{t('auth.signup')}</span>
        </motion.button>
      </form>

      <div className="w-full flex flex-col items-center gap-4 mt-8">
        <div className="flex items-center justify-center gap-2 w-full max-w-[200px]">
          <div className="h-[1px] flex-1 bg-white/30" />
          <span className="text-sm text-white/50">{t('auth.continueWith')}</span>
          <div className="h-[1px] flex-1 bg-white/30" />
        </div>
        <div className="flex items-center justify-center mt-1">
          <GoogleLoginButton />
        </div>
      </div>

      <div className="mt-8 text-center text-white/70">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link to="/login" className="text-white font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] rounded-md px-1">
          {t('auth.login')}
        </Link>
      </div>
    </motion.div>
  );
}
