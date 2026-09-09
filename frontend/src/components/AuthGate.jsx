import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import SplashScreen from './SplashScreen';
import { getCurrentUser } from '../api/auth';
import { handleUserSessionTransition, handleSessionInvalidation } from '../utils/offlineSession';

export default function AuthGate() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const minLoadTime = new Promise(resolve => setTimeout(resolve, 2000));
    
    // Always attempt to fetch the user (cookie will be sent automatically)
    const fetchUser = getCurrentUser().then(async (u) => {
      // Validate session ownership and isolate if user switch occurred
      await handleUserSessionTransition(u);
      setUser(u);
      localStorage.setItem('auth_user', JSON.stringify(u));
    }).catch((err) => {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        // Session invalidation on server; unsets active auth_user but preserves offline data
        handleSessionInvalidation();
      } else {
        // Network failure / offline: preserve offline dataset and restore cached identity
        const cachedUser = localStorage.getItem('auth_user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch (e) {
            console.warn('[AuthGate] Failed to parse cached user:', e);
          }
        }
      }
    });

    Promise.all([fetchUser, minLoadTime]).finally(() => setLoading(false));
  }, []);

  if (loading) return <SplashScreen />;
  if (!user) return <Navigate to="/welcome" replace />;
  
  if (user && !user.hasCompletedOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (user && user.hasCompletedOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
}
