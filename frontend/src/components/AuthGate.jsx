import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import SplashScreen from './SplashScreen';
import { getCurrentUser } from '../api/auth';

export default function AuthGate() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const minLoadTime = new Promise(resolve => setTimeout(resolve, 2000));
    
    const token = localStorage.getItem('auth_token');
    if (!token) {
      minLoadTime.then(() => setLoading(false));
      return;
    }
    
    const fetchUser = getCurrentUser().then(u => {
      setUser(u);
      localStorage.setItem('auth_user', JSON.stringify(u));
    }).catch((err) => {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } else {
        const cachedUser = localStorage.getItem('auth_user');
        if (cachedUser) setUser(JSON.parse(cachedUser));
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
