import api from "./axios";
import { db } from "../db/db";
import { getActiveUserId } from "../utils/offlineSession";
import {
  createTransactionLocal,
  updateTransactionLocal,
  deleteTransactionLocal
} from "../services/offlineFinancialService";

let activeSyncPromise = null;

/**
 * Authoritative transaction synchronization.
 * Uses chunked cursor-based pagination (/transactions/sync) to fetch ALL transactions
 * in bounded pages without risking O(N) memory exhaustion or silent truncation.
 *
 * CRITICAL FINANCIAL INTEGRITY RULES:
 * 1. Partial sync MUST NEVER purge or delete existing local transactions.
 * 2. Pending and local offline transactions MUST NOT be overwritten or deleted.
 * 3. Obsolete completed records are only pruned after the entire cursor sequence
 *    has completed successfully (syncComplete === true).
 * 4. Network failures or partial downloads gracefully fall back to existing local data.
 */
export const getTransactions = async () => {
  const userId = getActiveUserId();
  if (!userId) return [];

  // Deduplicate concurrent sync calls (e.g. initial dashboard + account loads)
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    try {
      if (navigator.onLine) {
        if (typeof navigator !== 'undefined' && navigator.locks && navigator.locks.request) {
          await navigator.locks.request('finova_transactions_sync', { mode: 'exclusive' }, async () => {
            await syncTransactionsAuthoritative(userId);
          });
        } else {
          await syncTransactionsAuthoritative(userId);
        }
      }
    } catch (error) {
      console.warn("Transaction synchronization failed or offline; using local cache:", error);
    } finally {
      activeSyncPromise = null;
    }
    return await getTransactionsOffline();
  })();

  return activeSyncPromise;
};

/**
 * Synchronize transactions from the server in safe, bounded chunks.
 */
const syncTransactionsAuthoritative = async (userId) => {
  let cursor = null;
  let hasMore = true;
  let syncComplete = false;
  const seenServerIds = new Set();
  const seenServerIdempKeys = new Set();
  const pageSize = 200;

  // Snapshot completed records present in Dexie BEFORE sync begins.
  // This guarantees that any new transactions created or uploaded concurrently
  // while sync is executing are immune from obsolete pruning.
  const initialCompletedIds = new Set(
    (await db.transactions.where({ userId }).toArray())
      .filter(tx => tx.status === 'completed' && typeof tx._id === 'string' && !tx._id.startsWith('local_'))
      .map(tx => tx._id)
  );

  try {
    while (hasMore) {
      const params = { limit: pageSize };
      if (cursor) params.cursor = cursor;

      const response = await api.get("/transactions/sync", { params });
      const data = response.data;

      if (!data || !Array.isArray(data.items)) {
        throw new Error("Invalid sync response format from server");
      }

      const { items, nextCursor, hasMore: moreItems, syncComplete: isComplete } = data;

      for (const item of items) {
        seenServerIds.add(item._id);
        if (item.idempotencyKey) {
          seenServerIdempKeys.add(item.idempotencyKey);
        }
      }

      // Upsert the page into local Dexie cache incrementally
      if (items.length > 0) {
        await db.transaction('rw', db.transactions, async () => {
          // If any pending local transaction matches an arriving server idempotencyKey, remove the pending copy
          if (seenServerIdempKeys.size > 0) {
            const lingeringPending = await db.transactions
              .where({ userId })
              .filter(tx => (tx.status === 'pending' || tx.status === 'failed') && tx.idempotencyKey && seenServerIdempKeys.has(tx.idempotencyKey))
              .toArray();

            if (lingeringPending.length > 0) {
              await db.transactions.bulkDelete(lingeringPending.map(tx => tx._id));
            }
          }

          const toUpsert = items.map(tx => ({
            ...tx,
            userId,
            status: 'completed'
          }));
          await db.transactions.bulkPut(toUpsert);
        });
      }

      if (!moreItems || !nextCursor || isComplete) {
        syncComplete = true;
        hasMore = false;
      } else {
        cursor = nextCursor;
      }
    }

    // ONLY after complete, exhaustive synchronization across all pages:
    // Safely prune obsolete completed records that existed in Dexie when sync started
    // but were not returned by the server. Records created or uploaded during the sync
    // were not in initialCompletedIds and are therefore strictly protected.
    if (syncComplete && initialCompletedIds.size > 0) {
      await db.transaction('rw', db.transactions, async () => {
        const idsToDelete = [];
        for (const id of initialCompletedIds) {
          if (!seenServerIds.has(id)) {
            idsToDelete.push(id);
          }
        }
        if (idsToDelete.length > 0) {
          await db.transactions.bulkDelete(idsToDelete);
        }
      });
    }
  } catch (error) {
    // If /transactions/sync is 404 (e.g. during deployment transitions), fallback to legacy /transactions safely
    if (error.response?.status === 404) {
      console.warn("GET /transactions/sync unavailable (404), falling back to legacy /transactions without purge");
      const legacyResponse = await api.get("/transactions");
      const serverTxs = Array.isArray(legacyResponse.data) ? legacyResponse.data : (legacyResponse.data?.transactions || []);
      if (serverTxs.length > 0) {
        await db.transaction('rw', db.transactions, async () => {
          const toUpsert = serverTxs.map(tx => ({ ...tx, userId, status: 'completed' }));
          await db.transactions.bulkPut(toUpsert);
        });
      }
      return;
    }
    throw error;
  }
};

export const getSkippedTransactions = async () => {
  return await getTransactionsOffline();
};

export const getTransactionsOffline = async () => {
  const userId = getActiveUserId();
  if (!userId) return [];
  const txs = await db.transactions.where({ userId }).toArray();
  return txs.sort((a, b) => {
    const dateA = new Date(a.date).getTime() || 0;
    const dateB = new Date(b.date).getTime() || 0;
    if (dateB !== dateA) return dateB - dateA;
    const createdA = new Date(a.createdAt || 0).getTime() || 0;
    const createdB = new Date(b.createdAt || 0).getTime() || 0;
    return createdB - createdA;
  });
};

/**
 * Dedicated export endpoint: fetches complete authoritative backup directly from backend.
 * Falls back to local Dexie transactions + accounts + categories if offline.
 */
export const exportTransactionsApi = async () => {
  const userId = getActiveUserId();

  if (navigator.onLine) {
    try {
      const response = await api.get("/transactions/export");
      if (response?.data?.transactions) {
        return response.data;
      }
    } catch (e) {
      console.warn("GET /transactions/export failed, falling back to local database export:", e);
    }
  }

  // Offline fallback: assemble from local database
  const [localTxs, localAccounts, localCategories] = await Promise.all([
    getTransactionsOffline(),
    userId ? db.accounts.where({ userId }).toArray().catch(() => []) : [],
    userId ? db.categories.where({ userId }).toArray().catch(() => []) : []
  ]);

  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    accounts: localAccounts.map(({ name, type, icon, color }) => ({ name, type, icon, color })),
    categories: localCategories.map(({ name, type, icon, color }) => ({ name, type, icon, color })),
    transactions: localTxs.map(t => ({
      title: t.title,
      amount: t.amount,
      type: t.type,
      date: t.date,
      account: t.account ? { name: t.account.name, type: t.account.type } : undefined,
      category: t.category ? { name: t.category.name, type: t.category.type } : undefined,
      from_account: t.from_account ? { name: t.from_account.name, type: t.from_account.type } : undefined,
      to_account: t.to_account ? { name: t.to_account.name, type: t.to_account.type } : undefined,
      investment: t.investment ? { name: t.investment.name, symbol: t.investment.symbol } : undefined,
    }))
  };
};

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
