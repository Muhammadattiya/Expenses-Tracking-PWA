import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import Layout from './components/Layout';
import AuthGate from './components/AuthGate';
import AuthLayout from './components/AuthLayout';
import PWABadge from './components/PWABadge';
import { Analytics } from '@vercel/analytics/react';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import './index.css';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const AddTransaction = lazy(() => import('./pages/AddTransaction'));
const Investments = lazy(() => import('./pages/Investments'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const AnalyticsPage = lazy(() => import('./pages/Analytics'));
const Receivables = lazy(() => import('./pages/Receivables'));
const Bills = lazy(() => import('./pages/Bills'));
const Budgets = lazy(() => import('./pages/Budgets'));
const SmartBudgetPlanner = lazy(() => import('./pages/SmartBudgetPlanner'));
const Sandbox = lazy(() => import('./pages/Sandbox'));
const Onboarding = lazy(() => import('./pages/Onboarding'));

const Welcome = lazy(() => import('./pages/Welcome'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));

function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <NotificationProvider>
          <BrowserRouter>
            <PWABadge />
            <Analytics />
            <Suspense fallback={<SplashScreen />}>
              <Routes>
                {/* Public Routes */}
                <Route element={<AuthLayout />}>
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                </Route>

                {/* Protected Routes */}
                <Route element={<AuthGate />}>
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route element={<Layout />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/add" element={<AddTransaction />} />
                    <Route path="/investments" element={<Investments />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/receivables" element={<Receivables />} />
                    <Route path="/bills" element={<Bills />} />
                    <Route path="/budgets" element={<Budgets />} />
                    <Route path="/budgets/smart-planner" element={<SmartBudgetPlanner />} />
                    <Route path="/sandbox" element={<Sandbox />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </NotificationProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
