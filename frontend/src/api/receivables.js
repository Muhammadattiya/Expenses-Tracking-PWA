import api from './axios';
export const getReceivables = async () => (await api.get('/receivables')).data;
export const createReceivable = async (data) => (await api.post('/receivables', data)).data;
export const updateReceivable = async (id, data) => (await api.put(`/receivables/${id}`, data)).data;
export const deleteReceivable = async (id) => (await api.delete(`/receivables/${id}`)).data;
export const recordPayment = async (id, participantId, data) => (await api.post(`/receivables/${id}/participants/${participantId}/payments`, data)).data;
