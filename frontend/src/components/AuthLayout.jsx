import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { AmbientBackground } from './ui';

export default function AuthLayout() {
  const { language } = useLanguage();
  const location = useLocation();
  const isWelcome = location.pathname === '/welcome';
  const hasValidAuthUser = (() => {
    try {
      const raw = localStorage.getItem('auth_user');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Boolean(parsed && (parsed._id || parsed.id || parsed.email));
    } catch {
      return false;
    }
  })();

  if (hasValidAuthUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <main
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="w-full min-h-[100dvh] min-h-[-webkit-fill-available] relative text-white flex flex-col justify-between items-center overflow-x-hidden"
    >
      {/* Universal Pure CSS Ambient Glow (Dashboard theme) */}
      <AmbientBackground variant="dashboard" />

      <div
        className="w-full max-w-[420px] px-4 sm:px-6 relative z-10 flex-1 flex flex-col items-center justify-between pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]"
      >
        <Outlet />
      </div>
    </main>
  );
}
