import { logoutUser } from '../api/auth';
import { handleExplicitLogout } from './offlineSession';

export const handleLogout = async () => {
  try {
    // 1. Invalidate tokens server-side and clear HttpOnly cookie if online
    await logoutUser();
  } catch (error) {
    // If the device is offline, or the server is temporarily unreachable,
    // or the session was already expired/revoked (401/403):
    // OFFLINE LOGOUT REQUIREMENT: Network failure MUST NOT prevent local logout!
    console.warn('[Logout] Server logout encountered an issue (proceeding with local purge):', error?.message || error);
  }

  // 2. Perform centralized local explicit logout:
  // - Purges Dexie IndexedDB (budgets, debts, syncQueue)
  // - Purges Workbox CacheStorage (api-cache)
  // - Purges Workbox Background Sync (workbox-background-sync)
  // - Removes auth_user and finova_active_user_id
  await handleExplicitLogout();

  // 3. Navigate to root (AuthGate cleanly directs unauthenticated state to /welcome)
  window.location.assign('/');
};

