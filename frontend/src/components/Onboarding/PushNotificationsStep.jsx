import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { subscribeToNotifications } from '../../api/notifications';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export default function PushNotificationsStep({ stepData, onRegisterNext, setLoadingGlobal }) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';

  const [notifState, setNotifState] = useState('animating'); // animating, pulse
  const timersRef = useRef([]);

  const addTimer = (timerId) => {
    timersRef.current.push(timerId);
    return timerId;
  };

  const handleFinish = async () => {
    setLoadingGlobal(true);
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator) {
        // Strict 2s timeout on Notification.requestPermission()
        const permission = await Promise.race([
          Notification.requestPermission().catch(() => 'default'),
          new Promise(resolve => setTimeout(() => resolve('timeout'), 2000))
        ]);

        if (permission === 'granted') {
          // Strict 1.5s timeout on navigator.serviceWorker.ready to prevent hanging if SW is not active
          const registration = await Promise.race([
            navigator.serviceWorker.ready.catch(() => null),
            new Promise(resolve => setTimeout(() => resolve(null), 1500))
          ]);

          if (registration && registration.pushManager) {
            const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (vapidKey) {
              try {
                const subscription = await Promise.race([
                  registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey)
                  }),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
                ]);
                if (subscription) {
                  await subscribeToNotifications(subscription).catch(err => {
                    console.warn('Backend push registration warn:', err);
                  });
                }
              } catch (subErr) {
                console.warn('Push subscription failed:', subErr);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Push error:', error);
    } finally {
      setLoadingGlobal(false);
    }
    return true; // Always proceed with finish
  };

  useEffect(() => {
    if (onRegisterNext) {
      // Pass handleFinish directly so await nextAction() actually calls it!
      onRegisterNext(handleFinish);
    }
  }, [onRegisterNext]);

  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setNotifState('pulse');
      const reset = setTimeout(() => setNotifState('animating'), 1200);
      timersRef.current.push(reset);
    }, 4000);
    timersRef.current.push(pulseInterval);

    return () => {
      timersRef.current.forEach(id => {
        clearTimeout(id);
        clearInterval(id);
      });
      timersRef.current = [];
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 py-1 px-4 sm:px-6 relative z-10 items-center justify-between" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Interactive Mockup Container */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative w-full py-1">
        {/* Mockup Phone Frame */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="relative z-10 w-full max-w-[310px] h-[240px] bg-[#2B2321]/50 backdrop-blur-[32px] border border-white/20 rounded-[2.2rem] shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.2)] overflow-hidden flex flex-col justify-between"
        >
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#8D6346]/40 via-[#E8C5A8]/15 to-transparent blur-2xl rounded-full -z-10" />

          {/* Lockscreen Header / Clock */}
          <div className="pt-3 px-4 flex flex-col items-center relative z-20">
            <span className="text-[10px] font-semibold text-white/60 tracking-wider font-['Exo_2']">
              {isRTL ? 'الإثنين، ٢١ سبتمبر' : 'Monday, September 21'}
            </span>
            <span className="text-[28px] font-black text-white/95 tracking-tight font-['Exo_2'] tabular-nums leading-none mt-0.5">
              9:41
            </span>
          </div>

          {/* Content Area / Notification Layer */}
          <div className="flex-1 px-3.5 flex flex-col justify-center overflow-hidden relative z-10 w-full">
            <motion.div
              key="popup"
              initial={{ opacity: 0, y: -15, scale: 0.94 }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: notifState === 'pulse' ? 1.02 : 1 
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="w-full bg-[#1F1918]/90 backdrop-blur-2xl border border-white/20 shadow-[0_14px_32px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.25)] rounded-2xl p-3 flex items-start gap-2.5 cursor-pointer"
              role="status"
              aria-live="polite"
            >
              <div className="w-8 h-8 rounded-xl bg-[#8D6346]/50 flex items-center justify-center shrink-0 shadow-inner border border-white/20 text-[#E8C5A8]">
                <Bell size={16} className={notifState === 'pulse' ? 'animate-bounce' : ''} />
              </div>
              <div className="flex flex-col min-w-0 flex-1 text-start">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-[#E8C5A8] font-['Exo_2'] uppercase tracking-wider">{t('onboarding.pushMockupAgent')}</span>
                  <span className="text-[9px] text-white/60 font-medium font-['Exo_2']">{t('onboarding.pushMockupNow')}</span>
                </div>
                <p className="text-[12.5px] font-bold text-white leading-tight mb-0.5 font-['Exo_2']">{t('onboarding.pushMockupAlert')}</p>
                <p className="text-[11px] text-white/80 leading-[1.3em] font-['Exo_2']">
                  {t('onboarding.pushMockupBody')}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Mock Bottom Home Indicator & Quick Action */}
          <div className="h-11 bg-black/50 backdrop-blur-xl border-t border-white/10 flex items-center justify-center px-6 relative z-20">
            <div className="w-16 h-1 bg-white/20 rounded-full" />
          </div>
        </motion.div>
      </div>

      {/* Pure Floating Typography */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="w-full max-w-[340px] px-1 text-start shrink-0 my-1.5 bg-transparent"
      >
        <h2 className="font-['Exo_2'] font-bold text-white text-[21px] sm:text-[23px] leading-tight tracking-tight mb-1.5">
          {t(stepData.titleKey, stepData.defaultTitle)}
        </h2>
        <p className="font-['Exo_2'] font-normal text-white/85 text-[14px] sm:text-[14.5px] leading-relaxed">
          {t(stepData.descKey, stepData.defaultDesc)}
        </p>
      </motion.div>
    </div>
  );
}
