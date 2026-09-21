import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import SplashScreen from './SplashScreen';
import { getCurrentUser } from '../api/auth';
import { getTransactions } from '../api/transactions';
import { getAccounts } from '../api/accounts';
import { getActiveUserId, handleUserSessionTransition, handleSessionInvalidation } from '../utils/offlineSession';

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
    
    // Extended minimum exposure (1000ms) to showcase the brand mark and cover backend latency
    const minLoadTime = new Promise(resolve => setTimeout(resolve, 1000));
    // Safe maximum ceiling (2500ms) to ensure the user is never indefinitely blocked
    const maxSplashTimeout = new Promise(resolve => setTimeout(resolve, 2500));
    
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

    // If an authenticated user session is detected, pre-warm core data during the splash
    const activeUserId = getActiveUserId();
    const dataTasks = [];
    if (activeUserId) {
      dataTasks.push(getTransactions().catch(() => []));
      dataTasks.push(getAccounts().catch(() => []));
    }

    Promise.race([
      Promise.all([fetchUser, ...dataTasks, minLoadTime]),
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

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <SplashScreen key="splash-screen" />
      ) : !user ? (
        <Navigate to="/welcome" replace key="nav-welcome" />
      ) : !user.hasCompletedOnboarding && location.pathname !== '/onboarding' ? (
        <Navigate to="/onboarding" replace key="nav-onboarding" />
      ) : user.hasCompletedOnboarding && location.pathname === '/onboarding' ? (
        <Navigate to="/" replace key="nav-dashboard" />
      ) : (
        <motion.div
          key="auth-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="contents"
        >
          <Outlet />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
