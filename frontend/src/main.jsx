import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.jsx'

// In development, unregister any service workers to prevent aggressive caching and 504 errors
if (import.meta.env.DEV) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <SpeedInsights />
  </StrictMode>,
)
