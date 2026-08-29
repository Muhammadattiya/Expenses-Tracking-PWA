# Finova - Frontend UI/UX Developer Guide

Welcome to the Finova project! This guide is designed to help UI/UX and Frontend engineers understand the architecture, technology stack, and best practices of our Progressive Web App (PWA). You have full creative freedom to enhance and overhaul the visual design, provided the core functionality, offline capabilities, and localization requirements remain intact.

## 🛠 Technology Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **State Management**: Zustand
- **Routing**: React Router DOM v7
- **Icons**: Lucide React
- **Charts**: Recharts
- **Offline / Database**: `vite-plugin-pwa` (Workbox), Dexie (IndexedDB)
- **API Client**: Axios (with `axios-retry`)

---

## 🎨 Design Philosophy & Aesthetic Guidelines

The current design system is heavily inspired by Apple's design language, utilizing a premium **"Liquid Glass"** aesthetic. While you are encouraged to improve the UI, keep the following principles in mind if you wish to maintain the current premium feel:

1. **Liquid Glass Containers**: 
   - We use deep, reflective backgrounds. 
   - Current standard pattern: `bg-black/20 backdrop-blur-[40px] border border-white/10 border-t-white/30 border-l-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_2px_rgba(255,255,255,0.3)] rounded-[2.5rem]`.
2. **Fluid Motion & Micro-Interactions**:
   - Always use `<AnimatePresence mode="wait">` for page transitions.
   - Standard page transition: `initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }}`.
   - Use `<motion.button whileTap={{ scale: 0.95 }}>` instead of rigid buttons.
3. **Typography**:
   - Use tabular numbers for financial metrics (`tabular-nums tracking-tight`).
4. **Data Visualization**:
   - Avoid flat charts. Inject SVG gradients (`<linearGradient>`) in Recharts and customize tooltips with blur effects to match the glass aesthetic.

---

## ⚙️ Preserving Core Functionality (The Golden Rules)

As you redesign the interface, you must strictly adhere to the following rules to ensure the app's complex logic does not break:

### 1. Localization & RTL Support (CRITICAL)
The app supports both Arabic (RTL) and English (LTR). 
- **NEVER** hardcode text directly into the UI components.
- Always use the `useLanguage` hook:
  ```javascript
  const { t, lang } = useLanguage();
  // Usage: {t('namespace.keyName', 'Fallback Text')}
  ```
- Any new text you add must be placed inside `src/locales/ar.js` and `src/locales/en.js`.
- Rely on Tailwind's logical properties (e.g., `ms-4`, `pe-2`, `start-0`) instead of physical properties (`ml-4`, `pr-2`, `left-0`) so the layout flips automatically for Arabic.

### 2. Offline-First Architecture (PWA)
Finova works completely offline. 
- **API Calls**: Do not change how API requests are made. They are integrated with a custom Service Worker (`sw.js`) and IndexedDB (Dexie) for background sync and caching.
- If you redesign a form, ensure the submit handler still calls the exact same API service functions without altering the payload structure.

### 3. State Management
- Global states (Authentication, Theme, User Preferences) are managed via **Zustand** stores or Context providers.
- Avoid introducing prop-drilling or new Context providers for global state if a Zustand store already exists or can be extended.

### 4. Modals and Z-Index Contexts
- **CRITICAL**: Always use React Portals for Modals to prevent `z-index` stacking context issues with page transitions and the Bottom Navigation Bar.
- Standard Modal implementation:
  ```javascript
  import { createPortal } from 'react-dom';
  
  return createPortal(
    <div className="fixed inset-0 z-[100] ..."> ... </div>, 
    document.body
  );
  ```

### 5. Layouts and Scrolling
- Ensure there are **NO double scrollbars** in the application.
- For long lists (e.g., using `react-virtuoso`), prefer `useWindowScroll={true}` without fixed heights, relying on the native browser scroll. This ensures mobile browser headers hide naturally when scrolling down.
- Maintain the usage of `min-h-screen` or `h-full` on the main layout wrappers.

### 6. Destructive Actions
- **Never** use the native browser `window.confirm()` for actions like deleting an account, budget, or transaction.
- Always utilize the custom `<ConfirmModal />` component located in `src/components/modals/ConfirmModal.jsx`.

---

## 🚀 Getting Started

1. Check out the components in `src/components/`. We encourage keeping components stateless and reusable where possible.
2. The core pages are in `src/pages/`.
3. If you're building a new UI feature, verify it on both mobile and desktop views, and toggle the language to ensure RTL layout behaves perfectly.

Happy Designing! 🎨✨
