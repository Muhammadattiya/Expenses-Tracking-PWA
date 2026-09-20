/**
 * Finova PWA Update & Disaster Recovery Utility
 * - Instant controller change detection & clean reload
 * - Mobile background resume update checks
 * - Dynamic import / preload error interceptor (zero white screens)
 */

let refreshing = false;
let hadControllerOnLoad = false;

const CHUNK_RELOAD_KEY = 'finova_chunk_reload_guard';

/**
 * Trigger clean recovery when dynamic import / chunk fails to load
 */
export function triggerChunkRecovery() {
  const lastAttempt = sessionStorage.getItem(CHUNK_RELOAD_KEY);
  const now = Date.now();

  // Guard against infinite reload loops: allow 1 recovery attempt per 20 seconds
  if (!lastAttempt || now - Number(lastAttempt) > 20000) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));

    // Clear client caches so stale or corrupt chunks are purged
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch((e) => console.warn('Cache clearing error during recovery:', e))
        .finally(() => {
          window.location.reload();
        });
    } else {
      window.location.reload();
    }
  }
}

/**
 * Initialize controller change detection and background resume check
 */
export function initPwaAutoUpdate() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) {
    return;
  }

  // Record if this client was already controlled when the page booted
  hadControllerOnLoad = Boolean(navigator.serviceWorker.controller);

  // Detect when a new service worker takes over (instant takeover via clientsClaim)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;

    // If there was no controller on initial load, this is the first install.
    // Do not reload in front of a first-time visitor; simply mark controller as active.
    if (!hadControllerOnLoad) {
      hadControllerOnLoad = true;
      return;
    }

    refreshing = true;
    window.location.reload();
  });

  // Background Resume Check: When returning from background or mobile home screen
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.update().catch((err) => {
            console.debug('SW resume update check failed:', err);
          });
        })
        .catch(() => {});
    }
  });
}

/**
 * Initialize dynamic import error interceptors to prevent white screens
 */
export function initDynamicImportInterceptor() {
  // 1. Vite script preload error event
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    triggerChunkRecovery();
  });

  // 2. Unhandled promise rejections from failed dynamic imports
  window.addEventListener('unhandledrejection', (event) => {
    const message = event.reason?.message || String(event.reason || '');
    const isChunkError =
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('error loading dynamically imported module') ||
      message.includes('Importing a module script failed') ||
      event.reason?.name === 'ChunkLoadError';

    if (isChunkError) {
      event.preventDefault();
      triggerChunkRecovery();
    }
  });

  // Reset guard after 5 seconds of healthy running
  setTimeout(() => {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }, 5000);
}
