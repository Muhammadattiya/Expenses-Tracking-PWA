import api from './axios';
import { db } from '../db/db';

export const getInvestments = async () => {
  try {
    const response = await api.get('/investments');
    const data = response.data;
    if (Array.isArray(data) && db.investments) {
      await db.investments.clear();
      await db.investments.bulkPut(data);
    }
    return data;
  } catch (error) {
    if (!navigator.onLine && db.investments) {
      const offlineData = await db.investments.toArray();
      if (offlineData && offlineData.length) return offlineData;
    }
    throw error;
  }
};

export const createInvestment = async (data) => {
  const result = (await api.post('/investments', data)).data;
  if (result && db.investments) {
    await db.investments.put(result);
  }
  return result;
};

export const updateInvestment = async (id, data) => {
  const result = (await api.put(`/investments/${id}`, data)).data;
  if (result && db.investments) {
    await db.investments.put(result);
  }
  return result;
};

export const deleteInvestment = async (id, revertTransaction = false) => {
  const result = (await api.delete(`/investments/${id}`, { params: { revertTransaction } })).data;
  if (db.investments) {
    await db.investments.delete(id);
  }
  return result;
};

export const getGoldPrice = async () => (await api.get('/investments/gold-price')).data;

