import api from './axios';

export const getForecast = async (accountId = '', days = 30) => {
  const response = await api.get('/forecast', {
    params: { accountId, days }
  });
  return response.data;
};

export const getSurvival = async (profileId = '') => {
  const response = await api.get('/forecast/survival', {
    params: { profileId }
  });
  return response.data;
};
