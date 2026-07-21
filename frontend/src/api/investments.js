import api from './axios';

export const getInvestments = async () => (await api.get('/investments')).data;
export const createInvestment = async (data) => (await api.post('/investments', data)).data;
export const deleteInvestment = async (id) => (await api.delete(`/investments/${id}`)).data;
export const getGoldPrice = async () => (await api.get('/investments/gold-price')).data;
