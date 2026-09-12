import api from "./axios";
import { db } from "../db/db";
import { getActiveUserId } from "../utils/offlineSession";

export const getAccounts = async () => {
  const userId = getActiveUserId();
  try {
    const response = await api.get("/accounts");
    if (userId) {
      const serverAccounts = response.data.map(acc => ({ ...acc, userId }));
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
    return response.data;
  } catch (error) {
    if (!error.response || !navigator.onLine || (error.code === 'ERR_NETWORK') || error.response?.status === 401 || error.response?.status === 403 || error.response?.status >= 500) {
      if (!userId) return [];
      return await db.accounts.where({ userId }).toArray();
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