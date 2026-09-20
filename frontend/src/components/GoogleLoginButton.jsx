import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ErrorMessage from './ui/ErrorMessage';
import { signInWithGoogle } from '../api/auth';
import { handleUserSessionTransition } from '../utils/offlineSession';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';

export default function GoogleLoginButton() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [signInError, setSignInError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleBtnRef = useRef(null);

  useEffect(() => {
    if (!clientId) return;
    const script = document.createElement('script'); 
    script.src = 'https://accounts.google.com/gsi/client'; 
    script.async = true;
    script.onload = () => {
      window.google.accounts.id.initialize({ 
        client_id: clientId, 
        callback: async ({ credential }) => {
          try {
            setSignInError('');
            const result = await signInWithGoogle(credential);
            await handleUserSessionTransition(result.user);
            localStorage.setItem('auth_user', JSON.stringify(result.user));
            // Trigger a hard reload to ensure context providers and state are fresh
            window.location.assign('/'); 
          } catch (error) {
            setSignInError(error.response?.data?.message || t('auth.googleError'));
          }
        }
      });
      if (googleBtnRef.current && !googleBtnRef.current.hasChildNodes()) {
        window.google.accounts.id.renderButton(googleBtnRef.current, { type: 'icon', shape: 'circle', size: 'large' });
      }
    };
    document.head.appendChild(script); 
    return () => script.remove();
  }, [clientId, navigate, t]);

  if (!clientId) {
    return <p className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">{t('auth.googleConfigMissing')}</p>;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-3 mt-1">
        <motion.div 
          whileTap={{ scale: 0.95 }} 
          className="relative flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-[40px] border border-white/10 border-t-white/20 border-s-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] transition-colors overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
          role="button"
          tabIndex={0}
          aria-label="Sign in with Google"
          onKeyDown={(e) => { 
            if (e.key === 'Enter' || e.key === ' ') { 
              e.preventDefault();
              googleBtnRef.current?.querySelector('div[role=button]')?.click(); 
            } 
          }}
        >
          <img src="/images/google_icon.png" alt="Google" className="w-[18px] h-[18px] object-contain pointer-events-none absolute" />
          <div ref={googleBtnRef} className="absolute inset-0 opacity-[0.01] z-10 w-full h-full flex items-center justify-center" />
        </motion.div>
        <motion.button 
          whileTap={{ scale: 0.95 }} 
          className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-[40px] border border-white/10 border-t-white/20 border-s-white/20 shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141115]"
          aria-label="Sign in with Apple"
          onClick={() => alert(t('auth.appleComingSoon', 'Apple Sign-In is coming soon'))}
        >
          <img src="/images/apple_icon.png" alt="Apple" className="w-[18px] h-[18px] object-contain" />
        </motion.button>
      </div>
      {signInError && <ErrorMessage message={signInError} className="mt-4" />}
    </div>
  );
}
