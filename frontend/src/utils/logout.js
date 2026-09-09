import { logoutUser } from '../api/auth';
import { clearOfflineData } from '../db/db';

export const handleLogout = async () => {
  try {
    // 1. Invalidate tokens server-side
    await logoutUser().catch(console.error);
    
    // 2. Clear localStorage
    localStorage.removeItem('auth_user');
    
    // 3. Clear IndexedDB (offline data)
    await clearOfflineData();
    
    // 4. Clear Service Worker api-cache
    if ('caches' in window) {
      await caches.delete('api-cache');
    }
    
    // 5. Redirect to welcome page
    window.location.assign('/');
  } catch (error) {
    console.error('Error during logout:', error);
    // Fallback redirect if something fails
    window.location.assign('/');
  }
};
