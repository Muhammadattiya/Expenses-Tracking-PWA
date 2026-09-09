import axios from "axios";
import axiosRetry from "axios-retry";
import { db } from "../db/db";
import { getActiveUserId } from "../utils/offlineSession";

const rawApiUrl = import.meta.env.VITE_API_URL;
// In production, route API calls through the same-origin reverse proxy (/api).
// Even if Vercel still has the old onrender.com URL in its environment variables,
// we force /api in production to guarantee first-party cookie isolation.
const getBaseURL = () => {
  if (import.meta.env.PROD) {
    return (rawApiUrl && !rawApiUrl.includes('onrender.com')) ? rawApiUrl : '/api';
  }
  return rawApiUrl || 'http://localhost:5000/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
    timeout: 30000, // 30 seconds timeout to accommodate backend cold starts
});

// Configure robust retry strategy for transient network failures
axiosRetry(api, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  }
});

api.interceptors.request.use((config) => {
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (config && !config._offlineQueued && !navigator.onLine && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      const activeUserId = getActiveUserId();
      if (!activeUserId) {
        console.warn('[Offline Sync] Mutation rejected: No authenticated active user ID found. Cannot queue ownerless mutation.');
        return Promise.reject(error);
      }
      try {
        await db.syncQueue.add({
          userId: activeUserId,
          url: config.url,
          method: config.method,
          data: config.data,
          timestamp: Date.now()
        });
        return Promise.reject(new Error('تم حفظ العملية لتُرسل تلقائيًا عند عودة الإنترنت. (وضع الأوفلاين)'));
      } catch (err) {
        console.error('Failed to add to offline sync queue', err);
      }
    }
    return Promise.reject(error);
  },
);

// Intelligent Background Sync Trigger
window.addEventListener('online', async () => {
  const activeUserId = getActiveUserId();
  if (!activeUserId) return;

  const queue = await db.syncQueue.toArray();
  if (queue.length === 0) return;
  
  console.log(`[Offline Sync] Attempting to sync ${queue.length} items for user ${activeUserId}...`);
  for (const request of queue) {
    // SEC-CACHE-001 INVARIANT: Queued item MUST belong to currently active authenticated user.
    // Never replay unowned items or items belonging to another user.
    if (!request.userId || request.userId !== activeUserId) {
      console.warn(`[Offline Sync] Quarantining item ${request.id}: ownership mismatch (queued: ${request.userId}, active: ${activeUserId})`);
      continue;
    }
    try { 
      await api({ 
        url: request.url, 
        method: request.method, 
        data: request.data, 
        headers: { 'Content-Type': 'application/json' },
        _offlineQueued: true 
      }); 
      await db.syncQueue.delete(request.id);
    } catch (e) {
      console.error('[Offline Sync] Failed to sync item', request, e);
    }
  }
});

export default api;
