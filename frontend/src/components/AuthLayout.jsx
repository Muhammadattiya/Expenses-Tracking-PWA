import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function AuthLayout() {
  const { language } = useLanguage();
  const location = useLocation();
  const token = localStorage.getItem('auth_token');
  const isWelcome = location.pathname === '/welcome';
  
  if (token) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <main 
      dir={language === 'ar' ? 'rtl' : 'ltr'} 
      className={`w-full max-w-full bg-[#141115] relative text-white flex flex-col justify-center items-center ${
        isWelcome 
          ? 'min-h-[100dvh] py-8' 
          : 'min-h-screen py-6'
      }`}
    >
      {/* Background Orbs */}
      <div className="absolute -top-10 -left-10 w-64 h-64 bg-[#8D6346] rounded-full filter blur-[140px] opacity-75 pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#8D6346] rounded-full filter blur-[160px] opacity-75 pointer-events-none" />
      
      <div 
        className={`w-full max-w-sm px-6 relative z-10 flex flex-col items-center ${
          isWelcome 
            ? 'h-full justify-center pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]' 
            : ''
        }`}
      >
        <Outlet />
      </div>
    </main>
  );
}
