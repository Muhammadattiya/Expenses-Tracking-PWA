import { db } from '../db/db';
import api from '../api/axios';
import { getActiveUserId } from '../utils/offlineSession';

// Polyfill randomUUID if not available
const randomUUID = () => {
  if (crypto.randomUUID) return crypto.randomUUID();
  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
};

export const createTransactionLocal = async (data) => {
  const userId = getActiveUserId();
  if (!userId) throw new Error("No active user");

  const operationId = randomUUID();
  const idempotencyKey = randomUUID();
  const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const accountId = data.account?._id || data.account || data.accountId || null;
  const categoryId = data.category?._id || data.category || data.categoryId || null;
  const fromAccountId = data.from_account?._id || data.from_account || data.fromAccount || null;
  const toAccountId = data.to_account?._id || data.to_account || data.toAccount || null;

  // Resolve populated documents asynchronously from local Dexie store
  const [accountDoc, categoryDoc, fromAccountDoc, toAccountDoc] = await Promise.all([
    accountId ? db.accounts.get(accountId) : Promise.resolve(null),
    categoryId ? db.categories.get(categoryId) : Promise.resolve(null),
    fromAccountId ? db.accounts.get(fromAccountId) : Promise.resolve(null),
    toAccountId ? db.accounts.get(toAccountId) : Promise.resolve(null),
  ]);

  const transaction = {
    ...data,
    amount: Number(data.amount) || 0,
    date: data.date ? new Date(data.date).toISOString() : new Date().toISOString(),
    _id: localId,
    userId,
    status: 'pending',
    operationId,
    idempotencyKey,
    account: accountDoc ? { ...accountDoc, _id: accountId } : (data.account && typeof data.account === 'object' ? data.account : (accountId ? { _id: accountId } : null)),
    category: categoryDoc ? { ...categoryDoc, _id: categoryId } : (data.category && typeof data.category === 'object' ? data.category : (categoryId ? { _id: categoryId } : null)),
    from_account: fromAccountDoc ? { ...fromAccountDoc, _id: fromAccountId } : (data.from_account && typeof data.from_account === 'object' ? data.from_account : (fromAccountId ? { _id: fromAccountId } : null)),
    to_account: toAccountDoc ? { ...toAccountDoc, _id: toAccountId } : (data.to_account && typeof data.to_account === 'object' ? data.to_account : (toAccountId ? { _id: toAccountId } : null)),
  };

  const syncPayload = {
    ...data,
    amount: Number(data.amount) || 0,
    date: transaction.date,
    ...(data.type === 'transfer' ? {
      from_account: fromAccountId,
      to_account: toAccountId
    } : {
      account: accountId,
      category: categoryId
    })
  };

  await db.transaction('rw', db.transactions, db.syncQueue, async () => {
    await db.transactions.add(transaction);
    await db.syncQueue.add({
      operationId,
      userId,
      idempotencyKey,
      type: 'CREATE_TRANSACTION',
      localId,
      payload: syncPayload,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now()
    });
  });

  // Targeted immediate UI dispatch: inform listeners without requiring network re-fetch
  window.dispatchEvent(new CustomEvent('finova-data-updated', {
    detail: { action: 'LOCAL_TRANSACTION_CREATED', transaction }
  }));

  if (navigator.onLine) {
    drainSyncQueue();
  }

  return transaction;
};

export const updateTransactionLocal = async (id, data) => {
  const userId = getActiveUserId();
  if (!userId) throw new Error("No active user");

  const isLocal = id.startsWith('local_');
  
  await db.transaction('rw', db.transactions, db.syncQueue, async () => {
    const existing = await db.transactions.get(id);
    if (!existing) throw new Error("Transaction not found in local db");
    // F-05: Explicit user ownership check
    if (existing.userId !== userId) throw new Error("Unauthorized: transaction does not belong to active user");

    await db.transactions.update(id, data);

    if (isLocal) {
      // Coalesce updates to pending creation
      const pendingCreate = await db.syncQueue.where('localId').equals(id).first();
      if (pendingCreate && pendingCreate.type === 'CREATE_TRANSACTION') {
        await db.syncQueue.update(pendingCreate.id, {
          payload: { ...pendingCreate.payload, ...data }
        });
      }
    } else {
      // Enqueue update for server transaction
      const operationId = randomUUID();
      await db.syncQueue.add({
        operationId,
        userId,
        idempotencyKey: randomUUID(),
        type: 'UPDATE_TRANSACTION',
        serverId: id,
        payload: data,
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now()
      });
    }
  });

  if (navigator.onLine) {
    drainSyncQueue();
  }

  return { ...data, _id: id, status: isLocal ? 'pending' : 'completed' };
};

export const deleteTransactionLocal = async (id) => {
  const userId = getActiveUserId();
  if (!userId) throw new Error("No active user");

  const isLocal = id.startsWith('local_');

  await db.transaction('rw', db.transactions, db.syncQueue, async () => {
    const existing = await db.transactions.get(id);
    if (!existing) return;
    // F-05: Explicit user ownership check
    if (existing.userId !== userId) throw new Error("Unauthorized: transaction does not belong to active user");

    await db.transactions.delete(id);

    if (isLocal) {
      const pendingCreate = await db.syncQueue.where('localId').equals(id).first();
      if (pendingCreate) {
        await db.syncQueue.delete(pendingCreate.id);
      }
    } else {
      const operationId = randomUUID();
      await db.syncQueue.add({
        operationId,
        userId,
        idempotencyKey: randomUUID(),
        type: 'DELETE_TRANSACTION',
        serverId: id,
        status: 'pending',
        retryCount: 0,
        createdAt: Date.now()
      });
    }
  });

  if (navigator.onLine) {
    drainSyncQueue();
  }
};

let isDraining = false;

export const drainSyncQueue = async () => {
  if (isDraining) return;
  if (!navigator.onLine) return;

  const runDrain = async () => {
    const userId = getActiveUserId();
    if (!userId) return;

    try {
      const pendingItems = await db.syncQueue
        .where('status').equals('pending')
        .sortBy('createdAt');
      
      const userItems = pendingItems.filter(item => item.userId === userId);

      for (const item of userItems) {
        if (!navigator.onLine) break;

        const queueKey = item.id != null ? item.id : (await db.syncQueue.where('operationId').equals(item.operationId).first())?.id;

        try {
          if (item.type === 'CREATE_TRANSACTION') {
            const response = await api.post('/transactions', {
              ...item.payload,
              idempotencyKey: item.idempotencyKey
            });
            const serverTx = response.data;
            
            await db.transaction('rw', db.transactions, db.syncQueue, async () => {
              if (item.localId) {
                await db.transactions.delete(item.localId);
              }
              if (item.idempotencyKey) {
                const lingering = await db.transactions.where({ idempotencyKey: item.idempotencyKey }).toArray();
                for (const l of lingering) {
                  if (l._id !== serverTx._id) {
                    await db.transactions.delete(l._id);
                  }
                }
              }
              await db.transactions.put({ ...serverTx, userId, status: 'completed' });
              if (queueKey != null) await db.syncQueue.delete(queueKey);
            });
          } else if (item.type === 'UPDATE_TRANSACTION') {
             await api.put(`/transactions/${item.serverId}`, item.payload);
             if (queueKey != null) await db.syncQueue.delete(queueKey);
          } else if (item.type === 'DELETE_TRANSACTION') {
             try {
               await api.delete(`/transactions/${item.serverId}`);
             } catch (delErr) {
               // F-02: 404 on DELETE indicates the resource is already removed on the server.
               // Treat as idempotent success (e.g., lost response on prior attempt).
               if (delErr.response?.status === 404) {
                 // Idempotent success: final server state already matches user intent
               } else {
                 throw delErr;
               }
             }
             if (queueKey != null) await db.syncQueue.delete(queueKey);
          }
        } catch (error) {
          const status = error.response?.status;
          if (status === 401) {
            break; // Stop draining on auth error to preserve queue for re-login
          } else if (status === 400 || status === 404 || status === 409 || status === 422) {
            // F-02 & F-03: Permanent client/conflict error:
            // Mark queue item failed, and update local transaction state if it exists
            await db.transaction('rw', db.transactions, db.syncQueue, async () => {
              if (queueKey != null) {
                await db.syncQueue.update(queueKey, { 
                  status: 'failed', 
                  lastError: error.response?.data?.message || error.message 
                });
              }
              // Guard with item.localId to avoid Dexie DataError on undefined key
              if (item.localId) {
                const localTx = await db.transactions.get(item.localId);
                if (localTx) {
                  await db.transactions.update(item.localId, { 
                    status: 'failed', 
                    syncError: error.response?.data?.message || error.message 
                  });
                }
              }
            });
          } else {
            // Transient network error or 5xx, stop and retry later
            break;
          }
        }
      }
      
      // Dispatch event for UI reaction if needed
      window.dispatchEvent(new CustomEvent('finova-sync-status', { detail: { syncing: false } }));
      window.dispatchEvent(new CustomEvent('finova-data-updated'));
    } finally {
      isDraining = false;
    }
  };

  // Primary: Web Locks API
  if (navigator.locks && navigator.locks.request) {
    await navigator.locks.request('finova_sync_drain', { mode: 'exclusive', ifAvailable: true }, async (lock) => {
      if (!lock) return;
      isDraining = true;
      await runDrain();
    });
  } else {
    // F-04: Robust fallback mutex for environments without Web Locks
    // Token-Double-Check verification with delay to avoid check-then-act races
    const lockKey = 'finova_sync_drain_lock';
    const lockExpiry = Date.now() - 30000;
    const existingLock = localStorage.getItem(lockKey);
    
    if (existingLock) {
      const parts = existingLock.split(':');
      const lockTimestamp = parseInt(parts[1] || parts[0], 10);
      if (lockTimestamp && lockTimestamp > lockExpiry) {
        return; // Another tab actively holds the unexpired lock
      }
    }
    
    const candidateToken = randomUUID() + ':' + Date.now();
    localStorage.setItem(lockKey, candidateToken);
    
    // Non-blocking 50ms jitter delay for cross-tab double check
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (localStorage.getItem(lockKey) !== candidateToken) {
      return; // Another tab overwrote our lock candidate during the verification window; yield
    }
    
    isDraining = true;
    try {
      await runDrain();
    } finally {
      if (localStorage.getItem(lockKey) === candidateToken) {
        localStorage.removeItem(lockKey);
      }
    }
  }
};

window.addEventListener('online', drainSyncQueue);
