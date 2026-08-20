import api from './axios';

export const parseQuickAddText = async (text) => {
  const response = await api.post('/quick-add/parse', { text });
  return response.data;
};

export const confirmQuickAddTransactions = async (transactions) => {
  const response = await api.post('/quick-add/confirm', { transactions });
  return response.data;
};

export const migrateCategories = async () => {
  const response = await api.post('/quick-add/migrate-categories');
  return response.data;
};
