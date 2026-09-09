import api from './axios';

export const getShortcutTokenStatus = async () => {
  const response = await api.get('/integrations/shortcut/token-status');
  return response.data;
};

export const generateShortcutToken = async () => {
  const response = await api.post('/integrations/shortcut/token');
  return response.data;
};

export const revokeShortcutToken = async () => {
  const response = await api.delete('/integrations/shortcut/token');
  return response.data;
};

// SMS Webhook Token (SEC-006)
export const getSmsTokenStatus = async () => {
  const response = await api.get('/integrations/sms/token-status');
  return response.data;
};

export const generateSmsToken = async () => {
  const response = await api.post('/integrations/sms/token');
  return response.data;
};

export const revokeSmsToken = async () => {
  const response = await api.delete('/integrations/sms/token');
  return response.data;
};
