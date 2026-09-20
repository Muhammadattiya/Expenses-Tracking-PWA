import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import App from './App.jsx'
import SelfHealingErrorBoundary from './components/SelfHealingErrorBoundary.jsx'
import { initPwaAutoUpdate, initDynamicImportInterceptor } from './utils/pwaUpdate.js'

// Initialize disaster recovery interceptor and PWA automated update listeners
initDynamicImportInterceptor();
initPwaAutoUpdate();

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
    <SelfHealingErrorBoundary>
      <App />
      <SpeedInsights />
    </SelfHealingErrorBoundary>
  </StrictMode>,
)
