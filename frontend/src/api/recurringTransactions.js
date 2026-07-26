import api from './axios';

export const getRecurringTransactions = async () => {
  const response = await api.get('/recurring-transactions');
  return response.data;
};

export const createRecurringTransaction = async (data) => {
  const response = await api.post('/recurring-transactions', data);
  return response.data;
};

export const updateRecurringTransaction = async (id, data) => {
  const response = await api.put(`/recurring-transactions/${id}`, data);
  return response.data;
};

export const deleteRecurringTransaction = async (id) => {
  const response = await api.delete(`/recurring-transactions/${id}`);
  return response.data;
};

export const toggleRecurringActive = async (id) => {
  const response = await api.patch(`/recurring-transactions/${id}/toggle`);
  return response.data;
};
