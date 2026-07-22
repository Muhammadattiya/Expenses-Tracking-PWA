import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        "Content-Type": "application/json",
    },
});

const offlineQueueKey = 'offline_request_queue';
const readQueue = () => JSON.parse(localStorage.getItem(offlineQueueKey) || '[]');
const saveQueue = (queue) => localStorage.setItem(offlineQueueKey, JSON.stringify(queue));

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config;
    if (config && !config._offlineQueued && !navigator.onLine && !['get', 'head'].includes(config.method?.toLowerCase())) {
      saveQueue([...readQueue(), { url: config.url, method: config.method, data: config.data, headers: { 'Content-Type': 'application/json' } }]);
      return Promise.reject(new Error('تم حفظ العملية لتُرسل تلقائيًا عند عودة الإنترنت.'));
    }
    return Promise.reject(error);
  },
);

window.addEventListener('online', async () => {
  const queue = readQueue();
  const remaining = [];
  for (const request of queue) {
    try { await api({ ...request, _offlineQueued: true }); } catch { remaining.push(request); }
  }
  saveQueue(remaining);
});

export default api;
