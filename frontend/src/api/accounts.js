import api from "./axios";
import { db } from "../db/db";
import { getActiveUserId } from "../utils/offlineSession";

export const getAccounts = async () => {
  const userId = getActiveUserId();
  try {
    const response = await api.get("/accounts");
    const sortedData = (response.data || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (userId) {
      const serverAccounts = sortedData.map(acc => ({ ...acc, userId }));
      await db.transaction('rw', db.accounts, async () => {
        const localAccounts = await db.accounts.where({ userId }).toArray();
        const serverIds = new Set(serverAccounts.map(a => a._id));
        const idsToDelete = localAccounts.filter(a => !serverIds.has(a._id)).map(a => a._id);
        if (idsToDelete.length > 0) {
          await db.accounts.bulkDelete(idsToDelete);
        }
        await db.accounts.bulkPut(serverAccounts);
      });
    }
    return sortedData;
  } catch (error) {
    if (!error.response || !navigator.onLine || (error.code === 'ERR_NETWORK') || error.response?.status === 401 || error.response?.status === 403 || error.response?.status >= 500) {
      if (!userId) return [];
      const offline = await db.accounts.where({ userId }).toArray();
      return offline.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    throw error;
  }
};

export const createAccount = async (data) => {
  const response = await api.post("/accounts", data);
  return response.data;
};

export const updateAccount = async (id, data) => {
  const response = await api.put(`/accounts/${id}`, data);
  return response.data;
};

export const deleteAccount = async (id) => {
  const response = await api.delete(`/accounts/${id}`);
  return response.data;
};

export const reorderAccounts = async (orderedIds) => {
  const response = await api.put("/accounts/reorder", { orderedIds });
  const userId = getActiveUserId();
  const sortedData = (response.data || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (userId && Array.isArray(sortedData)) {
    const serverAccounts = sortedData.map(acc => ({ ...acc, userId }));
    await db.accounts.bulkPut(serverAccounts);
  }
  window.dispatchEvent(new CustomEvent('finova-data-updated', { detail: { action: 'ACCOUNTS_REORDERED' } }));
  return sortedData;
};