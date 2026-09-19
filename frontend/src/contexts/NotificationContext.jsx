import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageContext } from './LanguageContext';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const langContext = useContext(LanguageContext);
  const t = langContext?.t || ((k) => k);
  const lang = langContext?.lang || 'ar';

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const handleServiceWorkerMessage = (event) => {
      if (event.data && event.data.type === 'PUSH_NOTIFICATION') {
        showToast(`${event.data.title}: ${event.data.body}`, 'push', 6000);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [showToast]);

  useEffect(() => {
    window.__finovaToast = showToast;
    return () => {
      delete window.__finovaToast;
    };
  }, [showToast]);

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      
      {/* Dynamic Safe-Area Aware Toasts Container - Sits safely below header icons and status bar/notch */}
      <div 
        role="region"
        aria-label={t('common.notifications') || (lang === 'ar' ? 'الإشعارات' : 'Notifications')}
        aria-live="polite"
        className="fixed top-[max(3.75rem,calc(env(safe-area-inset-top)+3.25rem))] inset-x-0 z-[1000] flex flex-col items-center gap-2.5 px-4 pointer-events-none"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <AnimatePresence mode="popLayout">
          {toasts.slice(-3).map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

const Toast = ({ toast, onClose }) => {
  const { id, message, type, duration } = toast;
  const langContext = useContext(LanguageContext);
  const t = langContext?.t || ((k) => k);
  const lang = langContext?.lang || 'ar';

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  // Keyboard accessibility: dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const getVisuals = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 [html.light_&]:text-emerald-600 shrink-0" />,
          badge: 'bg-emerald-500/15 border-emerald-500/25',
          glow: 'bg-emerald-500/20',
          role: 'status',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-400 [html.light_&]:text-red-600 shrink-0" />,
          badge: 'bg-red-500/15 border-red-500/25',
          glow: 'bg-red-500/20',
          role: 'alert',
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 [html.light_&]:text-amber-600 shrink-0" />,
          badge: 'bg-amber-500/15 border-amber-500/25',
          glow: 'bg-amber-500/20',
          role: 'alert',
        };
      case 'push':
        return {
          icon: <Bell className="w-5 h-5 text-[#E8C5A8] [html.light_&]:text-[#8D6346] shrink-0" />,
          badge: 'bg-[#8D6346]/20 border-[#8D6346]/35',
          glow: 'bg-[#8D6346]/25',
          role: 'status',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-[#E8C5A8] [html.light_&]:text-[#8D6346] shrink-0" />,
          badge: 'bg-[#8D6346]/20 border-[#8D6346]/35',
          glow: 'bg-[#8D6346]/25',
          role: 'status',
        };
    }
  };

  const { icon, badge, glow, role } = getVisuals();

  return (
    <motion.div
      layout
      role={role}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.8, bottom: 0.1 }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -25 || info.velocity.y < -200) {
          onClose();
        }
      }}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}
      className="pointer-events-auto relative w-full max-w-sm sm:max-w-md bg-[#181415]/95 [html.light_&]:bg-[#FAF7F5]/98 backdrop-blur-2xl border border-white/15 [html.light_&]:border-[#8D6346]/25 rounded-[1.4rem] p-3.5 sm:p-4 shadow-[0_20px_45px_rgba(0,0,0,0.7)] [html.light_&]:shadow-[0_12px_36px_rgba(141,99,70,0.18)] flex items-center justify-between gap-3 overflow-hidden select-none cursor-grab active:cursor-grabbing"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Hairline Specular Reflection */}
      <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-white/25 [html.light_&]:via-[#8D6346]/30 to-transparent pointer-events-none" />

      {/* Ambient Color Glow */}
      <div className={`absolute -top-6 -end-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-40 ${glow}`} />

      {/* Content wrapper */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`shrink-0 p-2 rounded-full border shadow-inner ${badge}`}>
          {icon}
        </div>
        <p className="flex-1 text-sm font-semibold text-white/95 [html.light_&]:text-[#1c1410] leading-snug drop-shadow-sm break-words">
          {message}
        </p>
      </div>

      {/* 44x44px Accessible Touch Target Dismiss Button */}
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        aria-label={t('common.close') || (lang === 'ar' ? 'إغلاق' : 'Close')}
        className="shrink-0 min-w-[44px] min-h-[44px] -me-1.5 flex items-center justify-center text-white/50 [html.light_&]:text-[#7c6d66] hover:text-white [html.light_&]:hover:text-[#1c1410] hover:bg-white/10 [html.light_&]:hover:bg-black/5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8D6346]"
      >
        <X className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
};
