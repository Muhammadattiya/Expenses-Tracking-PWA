import api from "./axios";
import { db } from "../db/db";
import { getActiveUserId } from "../utils/offlineSession";

export const getCategories = async () => {
  const userId = getActiveUserId();
  try {
    const response = await api.get("/categories");
    const sortedData = (response.data || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    if (userId) {
      const serverCategories = sortedData.map(cat => ({ ...cat, userId }));
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
    return sortedData;
  } catch (error) {
    if (!error.response || !navigator.onLine || (error.code === 'ERR_NETWORK') || error.response?.status === 401 || error.response?.status === 403 || error.response?.status >= 500) {
      if (!userId) return [];
      const offline = await db.categories.where({ userId }).toArray();
      return offline.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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

export const reorderCategories = async (orderedIds) => {
  const response = await api.put("/categories/reorder", { orderedIds });
  const userId = getActiveUserId();
  const sortedData = (response.data || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  if (userId && Array.isArray(sortedData)) {
    const serverCategories = sortedData.map(cat => ({ ...cat, userId }));
    await db.categories.bulkPut(serverCategories);
  }
  window.dispatchEvent(new CustomEvent('finova-data-updated', { detail: { action: 'CATEGORIES_REORDERED' } }));
  return sortedData;
};