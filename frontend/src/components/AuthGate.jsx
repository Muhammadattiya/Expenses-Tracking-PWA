import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import SplashScreen from './SplashScreen';
import { getCurrentUser } from '../api/auth';
import { handleUserSessionTransition, handleSessionInvalidation } from '../utils/offlineSession';

export default function AuthGate() {
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('auth_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    
    // Smooth aesthetic mark exposure (350ms)
    const minLoadTime = new Promise(resolve => setTimeout(resolve, 350));
    // Hard ceiling: NEVER freeze user on splash for more than 1200ms
    const maxSplashTimeout = new Promise(resolve => setTimeout(resolve, 1200));
    
    // Attempt backend session validation without indefinite hang
    const fetchUser = getCurrentUser({
      timeout: 3500,
      'axios-retry': { retries: 0 }
    }).then(async (u) => {
      if (!isMounted) return;
      await handleUserSessionTransition(u);
      setUser(u);
      localStorage.setItem('auth_user', JSON.stringify(u));
    }).catch((err) => {
      if (!isMounted) return;
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        // Session explicitly revoked by server
        handleSessionInvalidation();
        setUser(null);
      } else {
        // Network timeout / cold backend / offline: keep cached user
        const cachedUser = localStorage.getItem('auth_user');
        if (cachedUser) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch (e) {
            console.warn('[AuthGate] Failed to parse cached user:', e);
            setUser(null);
          }
        }
      }
    });

    Promise.race([
      Promise.all([fetchUser, minLoadTime]),
      maxSplashTimeout
    ]).finally(() => {
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  if (!user.hasCompletedOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (user.hasCompletedOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
