import api from './axios';

export const runSimulation = async (actions) => {
  const response = await api.post('/sandbox/run', { actions });
  return response.data.data;
};

export const getSimulationHistory = async () => {
  const response = await api.get('/sandbox/history');
  return response.data.data;
};

export const saveSimulationHistory = async (title, actions) => {
  const response = await api.post('/sandbox/history', { title, actions });
  return response.data.data;
};

export const deleteSimulationHistory = async (id) => {
  const response = await api.delete(`/sandbox/history/${id}`);
  return response.data.data;
};
