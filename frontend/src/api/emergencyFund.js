import api from './axios';

export const getEmergencyFund = async () => {
  const response = await api.get('/emergency-fund');
  return response.data?.data;
};

export const updateEmergencyFund = async (configData) => {
  const response = await api.put('/emergency-fund', configData);
  return response.data?.data;
};

export const depositEmergencyFund = async (depositData) => {
  const response = await api.post('/emergency-fund/deposit', depositData);
  return response.data;
};
