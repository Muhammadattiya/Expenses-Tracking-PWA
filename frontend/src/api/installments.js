import api from './axios';
import { db } from '../db/db';
import { getActiveUserId } from '../utils/offlineSession';

export const getInstallments = async () => {
  try {
    const response = await api.get('/installments');
    
    if (response.data && response.data.data) {
      const { installments } = response.data.data;
      if (db.installments) {
        await db.installments.clear();
        if (installments && installments.length > 0) {
          await db.installments.bulkPut(installments);
        }
      }
    }
    
    return response.data.data || { summary: {}, installments: [], transactions: [] };
  } catch (error) {
    if (!error.response || !navigator.onLine) {
      const activeUserId = getActiveUserId();
      const installments = activeUserId && db.installments
        ? await db.installments.where('user').equals(activeUserId).toArray()
        : (db.installments ? await db.installments.toArray() : []);
      
      const totalMonthlyBurden = installments
        .filter(i => i.status === 'active')
        .reduce((sum, i) => sum + (i.monthlyAmount || 0), 0);
      const totalRemainingObligations = installments
        .filter(i => i.status === 'active')
        .reduce((sum, i) => sum + (((i.totalMonths || 0) - (i.paidMonths || 0)) * (i.monthlyAmount || 0)), 0);

      return {
        summary: {
          totalMonthlyBurden,
          totalRemainingObligations,
          activeCount: installments.filter(i => i.status === 'active').length,
          debtToIncomeRatio: 0
        },
        installments
      };
    }
    throw error;
  }
};

export const createInstallment = async (installmentData) => {
  const response = await api.post('/installments', installmentData);
  return response.data;
};

export const updateInstallment = async (id, installmentData) => {
  const response = await api.put(`/installments/${id}`, installmentData);
  return response.data;
};

export const deleteInstallment = async (id) => {
  const response = await api.delete(`/installments/${id}`);
  if (db.installments) {
    try {
      await db.installments.delete(id);
    } catch (e) {
      console.warn('Failed to delete from Dexie:', e);
    }
  }
  return response.data;
};

export const payInstallment = async (id, paymentData = {}) => {
  const response = await api.post(`/installments/${id}/pay`, paymentData);
  return response.data;
};
