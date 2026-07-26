import api from './axios';

export const getBills = async () => {
  const response = await api.get('/bills');
  return response.data;
};

export const createBill = async (data) => {
  const response = await api.post('/bills', data);
  return response.data;
};

export const updateBill = async (id, data) => {
  const response = await api.put(`/bills/${id}`, data);
  return response.data;
};

export const deleteBill = async (id) => {
  const response = await api.delete(`/bills/${id}`);
  return response.data;
};

export const payBill = async (id, transactionId) => {
  const response = await api.post(`/bills/${id}/pay`, { transactionId });
  return response.data;
};
