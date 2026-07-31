import api from '../api/axios';
import { db } from '../db/db';

export const budgetService = {
  getBudgets: async () => {
    try {
      const response = await api.get('/budgets');
      
      // Sync to offline DB
      if (response.data && Array.isArray(response.data)) {
        await db.budgets.clear();
        await db.budgets.bulkPut(response.data.map(b => ({
          ...b,
          // Extract category ID if it's populated to ensure indexing works
          category: typeof b.category === 'object' ? b.category._id : b.category
        })));
      }
      return response.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Fallback to offline DB
        return await db.budgets.toArray();
      }
      throw error;
    }
  },

  createBudget: async (budgetData) => {
    const response = await api.post('/budgets', budgetData);
    if (response.data) {
      const b = response.data;
      await db.budgets.put({
        ...b,
        category: typeof b.category === 'object' ? b.category._id : b.category
      });
    }
    return response.data;
  },

  updateBudget: async (id, budgetData) => {
    const response = await api.put(`/budgets/${id}`, budgetData);
    if (response.data) {
      const b = response.data;
      await db.budgets.put({
        ...b,
        category: typeof b.category === 'object' ? b.category._id : b.category
      });
    }
    return response.data;
  },

  deleteBudget: async (id) => {
    await api.delete(`/budgets/${id}`);
    await db.budgets.delete(id);
  },

  getRecommendation: async (categoryId, period) => {
    try {
      const response = await api.get('/budgets/recommendation', {
        params: { categoryId, period }
      });
      return response.data;
    } catch (error) {
      if (!navigator.onLine) {
        // Fallback: Calculate locally using Dexie
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
        
        const txs = await db.transactions
          .where('date')
          .aboveOrEqual(sixMonthsAgo.toISOString())
          .toArray();
          
        const catTxs = txs.filter(tx => tx.category === categoryId && tx.type === 'expense');
        
        if (catTxs.length === 0) return { amount: 0, basedOn: { months: 0, transactions: 0 } };
        
        // Sort by date ascending
        catTxs.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const totalSpent = catTxs.reduce((sum, tx) => sum + tx.amount, 0);
        const firstTxDate = new Date(catTxs[0].date);
        const now = new Date();
        const msInDay = 1000 * 60 * 60 * 24;
        let daysSpan = (now - firstTxDate) / msInDay;
        
        if (daysSpan < 30) daysSpan = 30;
        
        let recommended = 0;
        if (period === 'monthly') {
          recommended = totalSpent / (daysSpan / 30.44);
        } else if (period === 'weekly') {
          recommended = totalSpent / (daysSpan / 7);
        }
        
        if (recommended > 0) {
          recommended = Math.round(recommended / 10) * 10;
          if (recommended === 0 && totalSpent > 0) recommended = 10;
        }
        
        return { 
          amount: recommended,
          basedOn: {
            months: Math.max(1, Math.round(daysSpan / 30.44)),
            transactions: catTxs.length
          }
        };
      }
      throw error;
    }
  }
};
