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
  (error) => Promise.reject(error)
);

export default api;
