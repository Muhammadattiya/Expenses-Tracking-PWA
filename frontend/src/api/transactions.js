import api from "./axios";
import { db } from "../db/db";
import { getActiveUserId } from "../utils/offlineSession";
import {
  createTransactionLocal,
  updateTransactionLocal,
  deleteTransactionLocal
} from "../services/offlineFinancialService";

export const getTransactions = async () => {
  const userId = getActiveUserId();
  try {
    const response = await api.get("/transactions");
    const serverTransactions = response.data;
    
    if (userId) {
      await db.transaction('rw', db.transactions, async () => {
        const allLocal = await db.transactions.where({ userId }).toArray();
        const serverIdempKeys = new Set(serverTransactions.map(tx => tx.idempotencyKey).filter(Boolean));
        
        // Delete non-pending records AND any local pending records whose server transaction has arrived
        const idsToDelete = allLocal.filter(tx => {
          if (tx.status !== 'pending' && tx.status !== 'failed') return true;
          if (tx.idempotencyKey && serverIdempKeys.has(tx.idempotencyKey)) return true;
          return false;
        }).map(tx => tx._id);
        
        if (idsToDelete.length > 0) {
          await db.transactions.bulkDelete(idsToDelete);
        }
        
        const toInsert = serverTransactions.map(tx => ({ ...tx, userId, status: 'completed' }));
        await db.transactions.bulkPut(toInsert);
      });
    }

    return await getTransactionsOffline();
  } catch (error) {
    if (!error.response || !navigator.onLine || (error.code === 'ERR_NETWORK') || error.response?.status === 401 || error.response?.status === 403 || error.response?.status >= 500) {
      return await getTransactionsOffline();
    }
    throw error;
  }
};

export const getSkippedTransactions = async () => {
  const userId = getActiveUserId();
  if (!userId) return [];
  const txs = await db.transactions.where({ userId }).toArray();
  return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const getTransactionsOffline = async () => {
  const userId = getActiveUserId();
  if (!userId) return [];
  const txs = await db.transactions.where({ userId }).toArray();
  return txs.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// Opt-in cursor pagination. The legacy getTransactions() response remains an array
// until each consumer can migrate without changing its existing behavior.
export const getTransactionPage = async (params = {}) => {
  const response = await api.get("/transactions", { params });
  return response.data;
};

export const createTransaction = async (data) => {
  return await createTransactionLocal(data);
};

export const updateTransaction = async (id, data) => {
  return await updateTransactionLocal(id, data);
};

export const deleteTransaction = async (id) => {
  await deleteTransactionLocal(id);
  return { message: "Transaction deleted locally." };
};

export const importTransactions = async (data) => {
  const response = await api.post("/transactions/import", data);
  return response.data;
};
