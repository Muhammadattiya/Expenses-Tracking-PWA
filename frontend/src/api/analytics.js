import api from './axios';
export const getAnalytics = async (params) => (await api.get('/analytics', { params })).data;
