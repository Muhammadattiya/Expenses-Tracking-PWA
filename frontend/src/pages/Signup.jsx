import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { registerUser } from '../api/auth';
import GoogleLoginButton from '../components/GoogleLoginButton';
import ErrorMessage from '../components/ui/ErrorMessage';

export default function Signup() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await registerUser({ name, email, password });
      localStorage.setItem('auth_user', JSON.stringify(result.user));
      window.location.assign('/'); 
    } catch (err) {
      setError(err.response?.data?.message || t('auth.googleError'));
      setLoading(false);
    }
  };

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
      className="w-full flex flex-col min-h-[100dvh] justify-center py-6"
    >
      <div className="flex justify-between items-center mb-8">
        <Link 
          to="/welcome" 
          className="p-3 bg-white/5 backdrop-blur-[30px] border border-white/10 rounded-full text-white/70 hover:text-white transition-colors"
        >
          <BackIcon size={24} />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 drop-shadow-sm">
          {t('auth.signup')}
        </h1>
        <div className="w-12" /> {/* Spacer */}
      </div>

      <form 
        onSubmit={handleSubmit} 
        className="w-full bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 p-6 rounded-[2.5rem] space-y-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)]"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/90 px-2 drop-shadow-sm">{t('auth.name')}</label>
            <input 
              type="text"
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/30 backdrop-blur-md border border-white/5 rounded-3xl px-5 py-4 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-blue/60 transition-all duration-300 shadow-inner" 
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/90 px-2 drop-shadow-sm">{t('auth.email')}</label>
            <input 
              type="email"
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/30 backdrop-blur-md border border-white/5 rounded-3xl px-5 py-4 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-blue/60 transition-all duration-300 shadow-inner" 
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/90 px-2 drop-shadow-sm">{t('auth.password')}</label>
            <input 
              type="password"
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/30 backdrop-blur-md border border-white/5 rounded-3xl px-5 py-4 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-brand-blue/60 transition-all duration-300 shadow-inner" 
            />
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        <motion.button 
          whileTap={{ scale: 0.95 }}
          disabled={loading} 
          type="submit"
          className="relative overflow-hidden flex w-full items-center justify-center gap-2 rounded-[2.5rem] bg-white/10 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] py-4 font-bold hover:bg-white/20 transition-colors duration-300 disabled:opacity-50 mt-4 text-white group"
        >
          {loading ? <Loader2 size={20} className="animate-spin drop-shadow-md z-10" /> : null}
          <span className="drop-shadow-md z-10 text-lg font-['Exo_2']">{t('auth.signup')}</span>
        </motion.button>
      </form>

      <div className="w-full flex flex-col items-center gap-4 mt-8">
        <div className="flex items-center justify-center gap-2 w-full max-w-[200px]">
          <div className="h-[1px] flex-1 bg-white/30" />
          <span className="font-['Exo_2'] text-sm text-white/50">{t('auth.continueWith')}</span>
          <div className="h-[1px] flex-1 bg-white/30" />
        </div>
        <div className="flex items-center justify-center mt-1">
           <GoogleLoginButton />
        </div>
      </div>

      <div className="mt-8 text-center text-white/70">
        {t('auth.alreadyHaveAccount')}{' '}
        <Link to="/login" className="text-white font-bold hover:underline">
          {t('auth.login')}
        </Link>
      </div>
    </motion.div>
  );
}
