import { useEffect, useState, useRef } from 'react';
import { Loader2, WalletCards } from 'lucide-react';
import { getCurrentUser, signInWithGoogle } from '../api/auth';

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signInError, setSignInError] = useState('');
  const [googleScriptLoaded, setGoogleScriptLoaded] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const googleBtnRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return setLoading(false);
    getCurrentUser().then(u => {
      setUser(u);
      localStorage.setItem('auth_user', JSON.stringify(u));
    }).catch((err) => {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } else {
        const cachedUser = localStorage.getItem('auth_user');
        if (cachedUser) setUser(JSON.parse(cachedUser));
      }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user || !clientId) return;
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
            localStorage.setItem('auth_token', result.token);
            localStorage.setItem('auth_user', JSON.stringify(result.user));
            setUser(result.user);
          } catch (error) {
            setSignInError(error.response?.data?.message || 'تعذر إكمال تسجيل الدخول. تأكد أن الخادم يعمل ثم حاول مجددًا.');
            setLoading(false);
          }
        }
      });
      setGoogleScriptLoaded(true);
    };
    document.head.appendChild(script); 
    return () => script.remove();
  }, [user, clientId]);

  useEffect(() => {
    if (!loading && !user && clientId && googleScriptLoaded && googleBtnRef.current) {
      if (!googleBtnRef.current.hasChildNodes()) {
        window.google.accounts.id.renderButton(googleBtnRef.current, { theme: 'outline', size: 'large', width: 280, text: 'continue_with' });
      }
    }
  }, [user, clientId, loading, googleScriptLoaded]);

  if (loading) return <div className="min-h-screen grid place-items-center bg-zinc-950"><Loader2 className="animate-spin text-blue-400" /></div>;
  if (user) return children;
  
  return (
    <main dir="rtl" className="min-h-screen grid place-items-center bg-zinc-950 p-6 text-center text-white">
      <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-8">
        <WalletCards className="mx-auto mb-4 text-blue-400" size={42}/>
        <h1 className="text-2xl font-bold">Finova</h1>
        <p className="my-3 text-sm text-gray-400">سجّل دخولك لحماية حساباتك ومعاملاتك.</p>
        
        {clientId ? (
          <div ref={googleBtnRef} className="flex justify-center min-h-[40px]"/>
        ) : (
          <p className="rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">أضف VITE_GOOGLE_CLIENT_ID في ملف البيئة لتفعيل تسجيل Google.</p>
        )}
        
        {signInError && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{signInError}</p>}
      </section>
    </main>
  );
}
