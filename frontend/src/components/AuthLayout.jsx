import { Outlet, Navigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function AuthLayout() {
  const { language } = useLanguage();
  const token = localStorage.getItem('auth_token');
  
  if (token) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <main dir={language === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-[#141115] relative overflow-hidden text-white flex flex-col justify-center items-center">
      {/* Background Orbs */}
      <div className="absolute -top-10 -left-10 w-64 h-64 bg-[#8D6346] rounded-full filter blur-[147px] opacity-80 pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-[#8D6346] rounded-full filter blur-[182px] opacity-80 pointer-events-none" />
      
      <div className="w-full max-w-sm px-6 relative z-10 flex flex-col items-center">
        <Outlet />
      </div>
    </main>
  );
}
