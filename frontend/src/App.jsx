import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AddTransaction from './pages/AddTransaction';
import Investments from './pages/Investments';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';
import Receivables from './pages/Receivables';
import AuthGate from './components/AuthGate';
import './index.css';

function App() {
  return (
    <AuthGate><BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add" element={<AddTransaction />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/receivables" element={<Receivables />} />
        </Route>
      </Routes>
    </BrowserRouter></AuthGate>
  );
}

export default App;
