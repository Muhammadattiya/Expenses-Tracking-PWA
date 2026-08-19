import api from './axios';
import { db } from '../db/db';

export const getDebts = async () => {
  try {
    const response = await api.get('/debts');
    
    // Sync with offline DB
    if (response.data) {
      await db.debts.clear();
      await db.debtTransactions.clear();
      
      if (response.data.debts && response.data.debts.length > 0) {
        await db.debts.bulkPut(response.data.debts);
      }
      if (response.data.transactions && response.data.transactions.length > 0) {
        await db.debtTransactions.bulkPut(response.data.transactions);
      }
    }
    
    return response.data;
  } catch (error) {
    if (!error.response && error.message === 'Network Error') {
      const debts = await db.debts.toArray();
      const transactions = await db.debtTransactions.toArray();
      return { debts, transactions };
    }
    throw error;
  }
};

export const createDebt = async (debtData) => {
  const response = await api.post('/debts', debtData);
  return response.data;
};

export const addDebtTransaction = async (debtId, transactionData) => {
  const response = await api.post(`/debts/${debtId}/transactions`, transactionData);
  return response.data;
};

export const deleteDebt = async (debtId) => {
  const response = await api.delete(`/debts/${debtId}`);
  return response.data;
};

export const updateDebt = async (debtId, debtData) => {
  const response = await api.put(`/debts/${debtId}`, debtData);
  return response.data;
};
