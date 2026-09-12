import api from "./axios";
import { db } from "../db/db";
import { getActiveUserId } from "../utils/offlineSession";

export const getCategories = async () => {
  const userId = getActiveUserId();
  try {
    const response = await api.get("/categories");
    if (userId) {
      const serverCategories = response.data.map(cat => ({ ...cat, userId }));
      await db.transaction('rw', db.categories, async () => {
        const localCategories = await db.categories.where({ userId }).toArray();
        const serverIds = new Set(serverCategories.map(c => c._id));
        const idsToDelete = localCategories.filter(c => !serverIds.has(c._id)).map(c => c._id);
        if (idsToDelete.length > 0) {
          await db.categories.bulkDelete(idsToDelete);
        }
        await db.categories.bulkPut(serverCategories);
      });
    }
    return response.data;
  } catch (error) {
    if (!error.response || !navigator.onLine || (error.code === 'ERR_NETWORK') || error.response?.status === 401 || error.response?.status === 403 || error.response?.status >= 500) {
      if (!userId) return [];
      return await db.categories.where({ userId }).toArray();
    }
    throw error;
  }
};

export const createCategory = async (data) => {
  const response = await api.post("/categories", data);
  return response.data;
};

export const updateCategory = async (id, data) => {
  const response = await api.put(`/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};