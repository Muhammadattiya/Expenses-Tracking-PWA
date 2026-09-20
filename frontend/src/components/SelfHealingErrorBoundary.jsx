import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import en from '../locales/en.js';
import ar from '../locales/ar.js';

const RECOVERY_KEY = 'finova_self_healing_attempt';
const RECOVERY_WINDOW_MS = 30000;

export default class SelfHealingErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isResetting: false,
    };
    this.healthyTimer = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    // If the app runs smoothly for 5 seconds, clear any previous recovery markers
    this.healthyTimer = setTimeout(() => {
      try {
        sessionStorage.removeItem(RECOVERY_KEY);
      } catch {
        // Ignore storage errors in private browsing modes
      }
    }, 5000);
  }

  componentWillUnmount() {
    if (this.healthyTimer) {
      clearTimeout(this.healthyTimer);
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SelfHealingErrorBoundary] Error caught:', error, errorInfo);

    try {
      const lastAttempt = sessionStorage.getItem(RECOVERY_KEY);
      const now = Date.now();

      // Silent one-time disaster recovery:
      // If we haven't attempted a recovery in the last 30 seconds, clear caches and reload cleanly.
      if (!lastAttempt || now - Number(lastAttempt) > RECOVERY_WINDOW_MS) {
        sessionStorage.setItem(RECOVERY_KEY, String(now));

        if ('caches' in window) {
          caches
            .keys()
            .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            .catch(() => {})
            .finally(() => {
              window.location.reload();
            });
        } else {
          window.location.reload();
        }
      }
    } catch (e) {
      console.warn('[SelfHealingErrorBoundary] Auto-recovery failed to execute reload:', e);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHardReset = async () => {
    this.setState({ isResetting: true });
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      sessionStorage.removeItem(RECOVERY_KEY);
      sessionStorage.removeItem('finova_chunk_reload_guard');
    } catch (e) {
      console.warn('[SelfHealingErrorBoundary] Reset error:', e);
    } finally {
      window.location.reload();
    }
  };

  getTranslations() {
    let lang = 'en';
    try {
      const stored = localStorage.getItem('finova_language');
      if (stored) {
        const parsed = JSON.parse(stored);
        lang = parsed?.state?.lang || parsed?.lang || 'en';
      } else if (document.documentElement.lang === 'ar') {
        lang = 'ar';
      }
    } catch {
      lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
    }

    const dict = lang === 'ar' ? ar : en;
    return {
      dir: lang === 'ar' ? 'rtl' : 'ltr',
      title: dict.pwa?.crashTitle || 'Something went wrong',
      desc: dict.pwa?.crashDesc || 'Finova encountered an unexpected issue. Please reload or reset local cache to continue.',
      reloadBtn: dict.pwa?.reloadBtn || 'Reload Application',
      resetBtn: dict.pwa?.resetCacheBtn || 'Reset Cache & Restart',
    };
  }

  render() {
    if (this.state.hasError) {
      const { dir, title, desc, reloadBtn, resetBtn } = this.getTranslations();

      return (
        <div
          dir={dir}
          className="fixed inset-0 z-[99999] bg-[#141115] text-white flex items-center justify-center p-4 overflow-hidden select-none"
        >
          {/* Ambient Glow Orbs */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#8D6346] rounded-full blur-[140px] opacity-35 pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#8D6346] rounded-full blur-[120px] opacity-25 pointer-events-none" />

          <div className="relative w-full max-w-md bg-[#1C1819]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] text-center flex flex-col items-center">
            {/* Top Glow Accent */}
            <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-[#E8C5A8]/30 to-transparent" />

            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-2xl bg-[#8D6346]/20 border border-[#8D6346]/40 flex items-center justify-center text-[#E8C5A8] mb-5 shadow-inner">
              <AlertTriangle className="w-8 h-8 text-[#E8C5A8]" />
            </div>

            {/* Title & Description */}
            <h2 className="text-xl font-bold tracking-tight text-white mb-2">
              {title}
            </h2>
            <p className="text-sm text-[#E8C5A8]/75 leading-relaxed mb-6">
              {desc}
            </p>

            {/* Action Buttons */}
            <div className="w-full flex flex-col gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                disabled={this.state.isResetting}
                className="w-full bg-[#8D6346] hover:bg-[#9E7151] active:scale-[0.98] text-white font-semibold py-3 px-4 rounded-xl shadow-[0_4px_16px_rgba(141,99,70,0.4)] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{reloadBtn}</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReset}
                disabled={this.state.isResetting}
                className="w-full bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10 text-white/70 hover:text-white font-medium py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{resetBtn}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
