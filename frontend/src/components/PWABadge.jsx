import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, RefreshCw, X } from 'lucide-react';

export default function PWABadge() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Setup push notifications permission request logic here if needed
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  return (
    <div className="fixed bottom-24 left-4 z-[60] flex flex-col gap-3">
      {/* Install Prompt */}
      {showInstallBtn && (
        <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-lg border border-blue-500/50 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            <div className="text-sm">
              <p className="font-bold">تثبيت التطبيق</p>
              <p className="text-blue-200 text-xs">احصل على تجربة أسرع بدون إنترنت</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="bg-white/20 hover:bg-white/30 transition px-3 py-1.5 rounded-lg text-sm font-semibold"
            >
              تثبيت
            </button>
            <button
              onClick={() => setShowInstallBtn(false)}
              className="p-1.5 text-blue-200 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Update Prompt */}
      {needRefresh && (
        <div className="bg-zinc-800 text-white px-4 py-3 rounded-2xl shadow-lg border border-zinc-700 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-400" />
            <div className="text-sm">
              <p className="font-bold">تحديث جديد متاح</p>
              <p className="text-zinc-400 text-xs">اضغط للتحديث إلى أحدث نسخة</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateServiceWorker(true)}
              className="bg-amber-500 text-black hover:bg-amber-400 transition px-3 py-1.5 rounded-lg text-sm font-semibold"
            >
              تحديث
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="p-1.5 text-zinc-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
