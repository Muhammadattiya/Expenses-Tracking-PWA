import api from "./axios";

export const getTransactions = async () => {
  const response = await api.get("/transactions");
  return response.data;
};

// Opt-in cursor pagination. The legacy getTransactions() response remains an array
// until each consumer can migrate without changing its existing behavior.
export const getTransactionPage = async (params = {}) => {
  const response = await api.get("/transactions", { params });
  return response.data;
};

export const createTransaction = async (data) => {
  const response = await api.post("/transactions", data);
  return response.data;
};

export const updateTransaction = async (id, data) => {
  const response = await api.put(`/transactions/${id}`, data);
  return response.data;
};

export const deleteTransaction = async (id) => {
  const response = await api.delete(`/transactions/${id}`);
  return response.data;
};

export const importTransactions = async (data) => {
  const response = await api.post("/transactions/import", data);
  return response.data;
};
