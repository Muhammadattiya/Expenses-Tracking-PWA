import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache the manifest (injected by Vite PWA)
precacheAndRoute(self.__WB_MANIFEST || []);

// Setup SPA Navigation fallback so the app works offline
try {
  const handler = createHandlerBoundToURL('/index.html');
  const navigationRoute = new NavigationRoute(handler, {
    denylist: [new RegExp('^/api')],
  });
  registerRoute(navigationRoute);
} catch (e) {
  console.log('NavigationRoute fallback error:', e);
}

// Background Sync for failed POST/PUT/DELETE requests
const bgSyncPlugin = new BackgroundSyncPlugin('api-syncQueue', {
  maxRetentionTime: 24 * 60, // Retry for max of 24 Hours (specified in minutes)
});

// For mutations (POST, PUT, DELETE), use NetworkOnly with background sync
registerRoute(
  ({ request, url }) => url.pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  })
);

// For GET requests to the API, use NetworkFirst so it falls back to cache if offline
registerRoute(
  ({ request, url }) => url.pathname.startsWith('/api/') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
      }),
    ],
  })
);

// StaleWhileRevalidate for images, fonts, and external assets
registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'font' || request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'assets-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
      }),
    ],
  })
);

// Push Notification Scaffolding
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'لديك إشعار جديد',
      icon: '/pwa-192x192.png',
      badge: '/favicon.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
        url: data.url || '/',
      },
    };
    event.waitUntil(self.registration.showNotification(data.title || 'Finova', options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});

// Skip waiting for prompt-based updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
