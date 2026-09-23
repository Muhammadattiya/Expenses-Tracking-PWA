import api from './axios';
import { db } from '../db/db';
import { getActiveUserId } from '../utils/offlineSession';

export const getSavingsGoals = async () => {
  try {
    const response = await api.get('/savings-goals');
    const goals = response.data?.data || [];

    if (db.savingsGoals) {
      await db.savingsGoals.clear();
      if (goals && goals.length > 0) {
        await db.savingsGoals.bulkPut(goals);
      }
    }

    return goals;
  } catch (error) {
    if (!error.response || !navigator.onLine) {
      const activeUserId = getActiveUserId();
      const goals = activeUserId && db.savingsGoals
        ? await db.savingsGoals.where('user').equals(activeUserId).toArray()
        : (db.savingsGoals ? await db.savingsGoals.toArray() : []);
      return goals;
    }
    throw error;
  }
};

export const createSavingsGoal = async (goalData) => {
  const response = await api.post('/savings-goals', goalData);
  return response.data?.data;
};

export const updateSavingsGoal = async (id, goalData) => {
  const response = await api.put(`/savings-goals/${id}`, goalData);
  return response.data?.data;
};

export const deleteSavingsGoal = async (id) => {
  const response = await api.delete(`/savings-goals/${id}`);
  return response.data;
};

export const contributeToGoal = async (id, contributeData) => {
  const response = await api.post(`/savings-goals/${id}/contribute`, contributeData);
  return response.data?.data;
};
