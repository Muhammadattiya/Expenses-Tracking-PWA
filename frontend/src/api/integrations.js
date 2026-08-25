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
