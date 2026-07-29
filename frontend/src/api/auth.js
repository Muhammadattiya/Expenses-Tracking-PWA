import api from './axios';

export const signInWithGoogle = async (credential) => (await api.post('/auth/google', { credential })).data;
export const getCurrentUser = async () => (await api.get('/auth/me')).data;
export const updateProfile = async (data) => (await api.patch('/auth/me', data)).data;
export const updatePreferences = async (data) => (await api.put('/auth/preferences', data)).data;
export const deleteAllUserData = async () => api.delete('/auth/data');
