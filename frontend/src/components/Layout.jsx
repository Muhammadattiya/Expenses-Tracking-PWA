import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import InstallPrompt from './InstallPrompt';

export default function Layout() {
  return (
    <div className="relative min-h-screen bg-black text-white font-sans selection:bg-white/20" dir="rtl">
      {/* خلينا المساحة اللي تحت فاضية عشان الـ BottomNav ميغطيش على المحتوى */}
      <main className="pb-24 px-5 pt-8 max-w-md mx-auto h-full">
        <Outlet />
      </main>
      <InstallPrompt />
      
      <BottomNav />
    </div>
  );
}
