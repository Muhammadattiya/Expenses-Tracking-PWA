import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react';

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
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col items-center gap-3 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

const Toast = ({ toast, onClose }) => {
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
        return <Bell className="w-5 h-5 text-brand-blue" />;
      default:
        return <Info className="w-5 h-5 text-brand-blue" />;
    }
  };

  const getBgClass = () => {
    switch (type) {
      case 'success':
        return 'bg-[var(--color-surface)]/90 border-brand-green/20 shadow-[0_4px_20px_rgba(52,199,89,0.15)]';
      case 'error':
        return 'bg-[var(--color-surface)]/90 border-brand-red/20 shadow-[0_4px_20px_rgba(255,59,48,0.15)]';
      case 'info':
      default:
        return 'bg-[var(--color-surface)]/90 border-brand-blue/20 shadow-[0_4px_20px_rgba(0,122,255,0.15)]';
    }
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-xl animate-fade-in w-full transition-all duration-300 ${getBgClass()}`}>
      <div className="shrink-0 p-2 bg-white/5 rounded-full">
        {getIcon()}
      </div>
      <p className="flex-1 text-sm font-semibold text-white leading-relaxed">
        {message}
      </p>
      <button
        onClick={onClose}
        className="shrink-0 p-2 text-[var(--color-text-muted)] hover:text-white hover:bg-white/10 rounded-full transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
