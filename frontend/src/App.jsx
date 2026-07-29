import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import AuthGate from './components/AuthGate';
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

function App() {
  return (
    <AuthGate>
      <LanguageProvider>
        <ThemeProvider>
          <NotificationProvider>
            <BrowserRouter>
              <PWABadge />
              <Analytics />
              <Suspense fallback={<div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
                <Routes>
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
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </NotificationProvider>
        </ThemeProvider>
      </LanguageProvider>
    </AuthGate>
  );
}

export default App;
