import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertCircle, ArrowRight } from 'lucide-react';
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

  const [notifState, setNotifState] = useState('idle'); // idle, animating

  const handleFinish = async () => {
    setLoadingGlobal(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey)
        });
        await subscribeToNotifications(subscription);
      }
    } catch (error) {
      console.error('Push error:', error);
    }
    setLoadingGlobal(false);
    return true; // proceed with finish
  };

  useEffect(() => {
    if (onRegisterNext) {
      onRegisterNext(() => handleFinish);
    }
  }, [onRegisterNext]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifState('animating');
      const interval = setInterval(() => {
        setNotifState('idle');
        setTimeout(() => setNotifState('animating'), 1000);
      }, 4000);
      return () => clearInterval(interval);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 pt-[60px] px-6 z-10" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Interactive Mockup Container */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center relative mb-4 mt-2">

        <motion.div
          className="w-[100px] h-[100px] mb-4 self-center"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring', delay: 0.3 }}
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            className="w-full h-full"
          >
            <img 
              src="/images/onboarding1.png"
              alt="Voice Illustration"
              className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              style={{ transform: "rotate(39.01deg)" }}
            />
          </motion.div>
        </motion.div>

        {/* Mockup Phone Frame */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.6, type: 'spring', delay: 0.1 }}
          className="relative z-10 w-full max-w-[230px] h-[250px] bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2rem] overflow-hidden flex flex-col justify-end"
        >
          {/* Content Area */}
          <div className="flex-1 p-4 flex flex-col justify-start pt-8 overflow-hidden relative z-10 w-full">
            <AnimatePresence>
              {notifState === 'animating' && (
                <motion.div
                  key="popup"
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                  transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                  className="w-full bg-black/30 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[16px] p-3 flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-transparent flex items-center justify-center shrink-0 overflow-hidden shadow-inner border border-white/10">
                    <img src="/images/finova-logo-dark.png" className="w-full h-full object-cover" alt="Finova" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[11px] font-bold text-white/90 font-['Exo_2'] uppercase tracking-wide">{t('onboarding.pushMockupAgent')}</span>
                      <span className="text-[10px] text-white/50 font-medium">{t('onboarding.pushMockupNow')}</span>
                    </div>
                    <p className="text-[13px] font-semibold text-white/95 leading-tight mb-1">{t('onboarding.pushMockupAlert')}</p>
                    <p className="text-[12px] text-white/70 leading-[1.3em]">
                      {t('onboarding.pushMockupBody')}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Magic Overlay Glow */}
          <div className="absolute inset-x-0 top-0 h-[50%] bg-gradient-to-b from-[#8D6346]/10 to-transparent flex flex-col items-center justify-start z-0 pointer-events-none" />

          {/* Mock Nav Bar */}
          <div className="h-16 bg-[#1a1412]/60 backdrop-blur-xl border-t border-white/10 flex items-center justify-center px-6 relative z-20">
            <div className="absolute -top-6 size-14 rounded-full flex items-center justify-center border-2 border-[#8D6346]/30 bg-gradient-to-br from-[#4a3424] to-[#2a1d15] shadow-[0_8px_20px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.2)]">
              <Bell size={24} className="text-[#e2b897] animate-pulse" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Text Area */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="w-full flex flex-col items-start pb-4 z-20"
      >
        <p className="font-['Exo_2'] text-left" dir={isRTL ? 'rtl' : 'ltr'}>
          <span className="font-bold text-white tracking-tight drop-shadow-sm text-[22px] block mb-2">
            {t(stepData.titleKey, stepData.defaultTitle)}
          </span>
          <span className="block font-medium tracking-[-0.01em] text-[15px] leading-[1.5em] text-white/70">
            {t(stepData.descKey, stepData.defaultDesc)}
          </span>
        </p>
      </motion.div>
    </div>
  );
}
