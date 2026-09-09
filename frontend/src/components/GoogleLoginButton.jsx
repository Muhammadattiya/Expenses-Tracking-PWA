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
    return <p className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">أضف VITE_GOOGLE_CLIENT_ID</p>;
  }

  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-3 mt-1">
        <motion.div whileTap={{ scale: 0.95 }} className="relative flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[rgba(76,43,54,0.3)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[rgba(76,43,54,0.5)] transition-colors overflow-hidden cursor-pointer">
          <img src="/images/google_icon.png" alt="Google" className="w-[18px] h-[18px] object-contain pointer-events-none absolute" />
          <div ref={googleBtnRef} className="absolute inset-0 opacity-[0.01] z-10 w-full h-full flex items-center justify-center" />
        </motion.div>
        <motion.button whileTap={{ scale: 0.95 }} className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[rgba(76,43,54,0.3)] backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] hover:bg-[rgba(76,43,54,0.5)] transition-colors">
          <img src="/images/apple_icon.png" alt="Apple" className="w-[18px] h-[18px] object-contain" />
        </motion.button>
      </div>
      {signInError && <ErrorMessage message={signInError} className="mt-4" />}
    </div>
  );
}
