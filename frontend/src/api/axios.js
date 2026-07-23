import axios from "axios";
import axiosRetry from "axios-retry";
import { db } from "../db/db";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 15000, // 15 seconds timeout
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
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (config && !config._offlineQueued && !navigator.onLine && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      try {
        await db.syncQueue.add({
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
  const queue = await db.syncQueue.toArray();
  if (queue.length === 0) return;
  
  console.log(`[Offline Sync] Attempting to sync ${queue.length} items...`);
  for (const request of queue) {
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
