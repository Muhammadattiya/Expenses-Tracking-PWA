import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import InstallPrompt from './InstallPrompt';
import { useLanguage } from '../contexts/LanguageContext';
import { useNetwork } from '../hooks/useNetwork';
import AgentButton from './agent/AgentButton';

export default function Layout() {
  const { lang, t } = useLanguage();
  const { isOnline } = useNetwork();

  return (
    <div className="relative min-h-screen bg-[var(--color-background)] text-[var(--color-text-main)] font-sans selection:bg-brand-blue/30" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-500/90 backdrop-blur-md text-white text-xs text-center py-1.5 shadow-md flex items-center justify-center gap-2 font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
          {t('common.offline', 'أنت تتصفح بدون إنترنت. سيتم حفظ تغييراتك ومزامنتها لاحقاً.')}
        </div>
      )}

      {/* خلينا المساحة اللي تحت فاضية عشان الـ BottomNav ميغطيش على المحتوى */}
      <main className="pb-32 px-5 pt-8 max-w-md mx-auto min-h-screen animate-fade-in">
        <Outlet />
      </main>
      <InstallPrompt />
      
      <AgentButton />
      <BottomNav />
    </div>
  );
}
