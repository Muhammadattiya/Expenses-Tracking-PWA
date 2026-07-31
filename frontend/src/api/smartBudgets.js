import api from './axios';

export const smartBudgetService = {
  /**
   * Generates a deterministic distribution (Does NOT save)
   * @param {Object} data { availableBudget, categories: [{categoryId, priority}], period }
   */
  generateDistribution: async (data) => {
    const response = await api.post('/smart-budgets/generate', data);
    return response.data;
  },

  /**
   * Saves a draft plan
   * @param {Object} data { name, period, availableBudget, categories }
   */
  saveDraftPlan: async (data) => {
    const response = await api.post('/smart-budgets', data);
    return response.data;
  },

  /**
   * Confirms a plan and creates real Budgets
   * @param {string} id - Plan ID
   */
  confirmPlan: async (id) => {
    const response = await api.post(`/smart-budgets/${id}/confirm`);
    return response.data;
  },

  /**
   * Gets all smart budget plans history
   */
  getPlans: async () => {
    const response = await api.get('/smart-budgets');
    return response.data;
  },

  /**
   * Get a single plan by ID
   */
  getPlanById: async (id) => {
    const res = await api.get(`/smart-budgets/${id}`);
    return res.data;
  },

  /**
   * Delete a plan
   */
  deletePlan: async (id) => {
    const res = await api.delete(`/smart-budgets/${id}`);
    return res.data;
  },

  /**
   * Updates a draft plan (manual overrides)
   * @param {string} id - Plan ID
   * @param {Object} data - { categories, availableBudget }
   */
  updateDraftPlan: async (id, data) => {
    const response = await api.put(`/smart-budgets/${id}`, data);
    return response.data;
  }
};
