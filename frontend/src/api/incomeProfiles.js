import api from './axios';

export const getIncomeProfiles = async () => {
  const response = await api.get('/income-profiles');
  return response.data;
};

export const createIncomeProfile = async (profileData) => {
  const response = await api.post('/income-profiles', profileData);
  return response.data;
};

export const updateIncomeProfile = async (id, profileData) => {
  const response = await api.put(`/income-profiles/${id}`, profileData);
  return response.data;
};

export const deleteIncomeProfile = async (id) => {
  const response = await api.delete(`/income-profiles/${id}`);
  return response.data;
};
