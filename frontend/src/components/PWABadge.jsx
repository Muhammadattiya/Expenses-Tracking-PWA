import React, { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, RefreshCw, X, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWABadge() {
  const { lang, t } = useLanguage();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
      if (r) {
        window.__pwa_registration = r;
        // Check for updates every hour
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);

        // Check for updates when the app comes back to the foreground (very important for mobile)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            r.update();
          }
        });
      }
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
    <div 
      className="fixed top-4 inset-x-4 z-[95] flex flex-col gap-3 max-w-md mx-auto pointer-events-none"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <AnimatePresence>
        {/* Install Prompt Banner */}
        {showInstallBtn && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
            className="pointer-events-auto liquidglass bg-[#1C1819]/90 backdrop-blur-2xl border border-white/15 rounded-[1.4rem] p-3.5 px-4 shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3 overflow-hidden relative"
          >
            {/* Top Border Glow */}
            <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#8D6346]/25 border border-[#8D6346]/50 flex items-center justify-center text-[#E8C5A8] shrink-0 shadow-inner">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[13px] text-white tracking-wide truncate">
                  {t('pwa.installTitle')}
                </p>
                <p className="text-[11px] text-[#E8C5A8]/75 font-medium truncate">
                  {t('pwa.installDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-[#8D6346] hover:bg-[#9E7151] active:scale-95 text-white font-semibold text-[12px] px-3.5 py-1.5 rounded-xl shadow-[0_2px_10px_rgba(141,99,70,0.4)] transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E8C5A8]" />
                <span>{t('pwa.installBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowInstallBtn(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-all active:scale-90"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Update Available Prompt Banner */}
        {needRefresh && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
            className="pointer-events-auto liquidglass bg-[#1C1819]/90 backdrop-blur-2xl border border-white/15 rounded-[1.4rem] p-3.5 px-4 shadow-[0_16px_40px_rgba(0,0,0,0.6)] flex items-center justify-between gap-3 overflow-hidden relative"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#8D6346]/25 border border-[#8D6346]/50 flex items-center justify-center text-[#E8C5A8] shrink-0 shadow-inner">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-[13px] text-white tracking-wide truncate">
                  {t('pwa.updateTitle')}
                </p>
                <p className="text-[11px] text-[#E8C5A8]/75 font-medium truncate">
                  {t('pwa.updateDesc')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  updateServiceWorker(true);
                  // Force a reload if the SW event doesn't trigger the automatic one
                  setTimeout(() => window.location.reload(), 1500);
                }}
                className="bg-[#8D6346] hover:bg-[#9E7151] active:scale-95 text-white font-semibold text-[12px] px-3.5 py-1.5 rounded-xl shadow-[0_2px_10px_rgba(141,99,70,0.4)] transition-all"
              >
                {t('pwa.updateBtn')}
              </button>
              <button
                type="button"
                onClick={() => setNeedRefresh(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-all active:scale-90"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
