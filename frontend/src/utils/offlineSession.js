import { clearOfflineData } from '../db/db';

export const ACTIVE_USER_ID_KEY = 'finova_active_user_id';
export const AUTH_USER_KEY = 'auth_user';

/**
 * Safely extracts the user ID string from a user object or string ID.
 * Supports MongoDB _id and id properties.
 */
export const extractUserId = (user) => {
  if (!user) return null;
  if (typeof user === 'string') return user;
  return user._id || user.id || null;
};

/**
 * Retrieves the currently recorded active offline user ID.
 * Falls back to extracting from auth_user if available.
 */
export const getActiveUserId = () => {
  try {
    const storedId = localStorage.getItem(ACTIVE_USER_ID_KEY);
    if (storedId) return storedId;

    const authUserStr = localStorage.getItem(AUTH_USER_KEY);
    if (authUserStr) {
      const authUser = JSON.parse(authUserStr);
      const extracted = extractUserId(authUser);
      if (extracted) {
        localStorage.setItem(ACTIVE_USER_ID_KEY, extracted);
        return extracted;
      }
    }
  } catch (e) {
    console.warn('[OfflineSession] Failed to read active user ID:', e);
  }
  return null;
};

/**
 * Sets the active user ID in localStorage.
 */
export const setActiveUserId = (userId) => {
  if (userId) {
    localStorage.setItem(ACTIVE_USER_ID_KEY, userId);
  } else {
    localStorage.removeItem(ACTIVE_USER_ID_KEY);
  }
};

/**
 * Safely purges Workbox api-cache from CacheStorage.
 */
export const purgeCacheStorage = async () => {
  try {
    if ('caches' in window) {
      await caches.delete('api-cache');
    }
    // Also notify Service Worker controller if active
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_USER_DATA' });
    }
  } catch (e) {
    console.warn('[OfflineSession] Failed to purge api-cache:', e);
  }
};

/**
 * Safely deletes the Workbox Background Sync IndexedDB database
 * to prevent orphaned mutations from executing across user transitions.
 */
export const purgeWorkboxBackgroundSync = async () => {
  try {
    if ('indexedDB' in window) {
      await new Promise((resolve) => {
        const req = window.indexedDB.deleteDatabase('workbox-background-sync');
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
        req.onblocked = () => resolve(false);
      });
    }
  } catch (e) {
    console.warn('[OfflineSession] Failed to delete workbox-background-sync database:', e);
  }
};

/**
 * Centralized User Session Transition Handler.
 * 
 * Rules:
 * 1. FIRST USER: If no prior offline user ID exists, but stale unowned data exists,
 *    we verify if auth_user belonged to this user; if unowned/unverifiable, we purge to prevent leakage.
 * 2. SAME USER: If incomingUserId === storedActiveUserId, PRESERVE all offline data and sync queue.
 * 3. DIFFERENT USER (User Switch): If incomingUserId !== storedActiveUserId, this is a confirmed
 *    user switch. We atomically purge Dexie, api-cache, and BackgroundSync before the new user
 *    can consume or execute stale offline state.
 */
export const handleUserSessionTransition = async (incomingUser) => {
  const incomingUserId = extractUserId(incomingUser);
  if (!incomingUserId) {
    return { switched: false, preserved: true };
  }

  const storedActiveUserId = localStorage.getItem(ACTIVE_USER_ID_KEY);

  if (!storedActiveUserId) {
    // Check if there was an existing auth_user before this transition
    const existingAuthUser = localStorage.getItem(AUTH_USER_KEY);
    if (existingAuthUser) {
      try {
        const parsed = JSON.parse(existingAuthUser);
        const priorId = extractUserId(parsed);
        if (priorId && priorId !== incomingUserId) {
          // Confirmed switch from previously un-indexed user
          console.info('[OfflineSession] Prior user identity differed. Purging stale offline state.');
          await clearOfflineData().catch(console.warn);
          await purgeCacheStorage();
          await purgeWorkboxBackgroundSync();
        }
      } catch (e) {
        // Corrupted auth_user; purge to be safe
        await clearOfflineData().catch(console.warn);
        await purgeCacheStorage();
        await purgeWorkboxBackgroundSync();
      }
    }
    // Record current user as active offline owner
    setActiveUserId(incomingUserId);
    return { switched: false, preserved: true };
  }

  if (storedActiveUserId === incomingUserId) {
    // SAME USER: Non-negotiable Offline-First rule: preserve data!
    return { switched: false, preserved: true };
  }

  // CONFIRMED USER SWITCH (storedActiveUserId !== incomingUserId)
  console.info(`[OfflineSession] Confirmed user switch: ${storedActiveUserId} -> ${incomingUserId}. Isolating previous user data.`);
  
  // 1. Wipe Dexie offline databases (budgets, debts, syncQueue, etc.)
  await clearOfflineData().catch(console.warn);

  // 2. Wipe Workbox CacheStorage (api-cache)
  await purgeCacheStorage();

  // 3. Wipe Workbox Background Sync queue
  await purgeWorkboxBackgroundSync();

  // 4. Update the active offline owner to the new user
  setActiveUserId(incomingUserId);

  return { switched: true, preserved: false };
};

/**
 * Handles session invalidation (401/403 HTTP responses).
 * Removes local authenticated session token metadata (auth_user)
 * so the application router redirects to /welcome, BUT PRESERVES
 * Dexie offline records, api-cache, and syncQueue for the same user.
 */
export const handleSessionInvalidation = () => {
  localStorage.removeItem(AUTH_USER_KEY);
  // NOTE: We intentionally DO NOT clear ACTIVE_USER_ID_KEY here.
  // This ensures that when the user signs back in, we know whether it is the SAME user!
};

/**
 * Handles explicit user logout (online or offline).
 * Performs complete local purge of all offline financial state,
 * cached API responses, mutation queues, and stored identity.
 */
export const handleExplicitLogout = async () => {
  // 1. Clear Dexie IndexedDB
  await clearOfflineData().catch(console.warn);

  // 2. Clear Workbox CacheStorage
  await purgeCacheStorage();

  // 3. Clear Workbox Background Sync
  await purgeWorkboxBackgroundSync();

  // 4. Remove localStorage identity markers and user-scoped caches
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(ACTIVE_USER_ID_KEY);
  
  // Clear any finova_cache_* keys (e.g., scoped receivables/investments)
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('finova_cache_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[OfflineSession] Failed to clear finova_cache keys:', e);
  }
};
