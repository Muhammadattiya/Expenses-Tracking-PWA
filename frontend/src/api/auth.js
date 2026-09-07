import api from './axios';

export const signInWithGoogle = async (credential) => (await api.post('/auth/google', { credential })).data;
export const registerUser = async (data) => (await api.post('/auth/register', data)).data;
export const loginUser = async (data) => (await api.post('/auth/login', data)).data;
export const getCurrentUser = async () => (await api.get('/auth/me')).data;
export const updateProfile = async (data) => (await api.patch('/auth/me', data)).data;
export const updatePreferences = async (data) => (await api.put('/auth/preferences', data)).data;
export const completeOnboarding = async () => (await api.put('/auth/complete-onboarding')).data;
export const resetOnboarding = async () => (await api.put('/auth/reset-onboarding')).data;
export const deleteAllUserData = async () => api.delete('/auth/data');
export const logoutUser = async () => (await api.post('/auth/logout')).data;
export const changePassword = async (data) => (await api.put('/auth/change-password', data)).data;
