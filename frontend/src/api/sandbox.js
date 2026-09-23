import api from './axios';

export const runSimulation = async (simulationData, options = {}) => {
  const payload = Array.isArray(simulationData) 
    ? { actions: simulationData, ...options } 
    : simulationData;
  const response = await api.post('/sandbox/run', payload);
  return response.data?.data;
};

export const applySimulation = async (applyData) => {
  const payload = Array.isArray(applyData) ? { actions: applyData } : applyData;
  const response = await api.post('/sandbox/apply', payload);
  return response.data;
};

export const getSimulationHistory = async () => {
  const response = await api.get('/sandbox/history');
  return response.data?.data || response.data || [];
};

export const saveSimulationHistory = async (title, actions) => {
  const response = await api.post('/sandbox/history', { title, actions });
  return response.data?.data || response.data;
};

export const deleteSimulationHistory = async (id) => {
  const response = await api.delete(`/sandbox/history/${id}`);
  return response.data;
};

