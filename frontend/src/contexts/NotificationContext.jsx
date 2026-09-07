import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  return (
    <NotificationContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toasts Container */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-[90%] md:max-w-sm px-4 pointer-events-none">
        <div className="relative w-full">
          <AnimatePresence>
            {toasts.map((toast, index) => (
              <Toast
                key={toast.id}
                toast={toast}
                index={toasts.length - 1 - index}
                onClose={() => removeToast(toast.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </NotificationContext.Provider>
  );
};

const Toast = ({ toast, index, onClose }) => {
  const { id, message, type, duration } = toast;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'push':
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[#8D6346]" />;
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ 
        opacity: 1 - index * 0.15, 
        y: index * 12, 
        scale: 1 - index * 0.05,
        zIndex: 100 - index
      }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
      className="pointer-events-auto absolute top-0 w-full liquidglass flex items-center gap-3 p-4 rounded-3xl border border-white/10"
    >
      <div className="shrink-0 p-2 bg-white/15 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]">
        {getIcon()}
      </div>
      <p className="flex-1 text-sm font-semibold text-white/90 leading-relaxed drop-shadow-sm">
        {message}
      </p>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="shrink-0 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-colors"
      >
        <X className="w-4 h-4" />
      </motion.button>
    </motion.div>
  );
};
