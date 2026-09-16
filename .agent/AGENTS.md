# Finova - Expenses & Investments Tracker (PWA)

## Project Overview
Finova is an offline-first, Progressive Web App (PWA) designed for tracking personal expenses, income, investments, and receivables. The application targets Arabic-speaking users with RTL (Right-to-Left) support as default. 

## Technology Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Routing**: React Router DOM v7
- **Offline / PWA**: 
  - `vite-plugin-pwa` with `injectManifest` strategy.
  - Workbox for background sync, caching strategies (NetworkFirst for GET, NetworkOnly with BackgroundSync for Mutations).
  - IndexedDB powered by `Dexie` (database name: `FinovaOfflineDB`) for caching and offline queues.
- **Charts / Visualizations**: Recharts
- **Icons**: Lucide React
- **API Client**: Axios with `axios-retry`
- **Other**: PapaParse (CSV)

### Backend
- **Environment**: Node.js + Express
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT (JSON Web Tokens)
- **Background Jobs**: `node-cron`
- **Push Notifications**: `web-push`
- **Core Entities**: Transactions, Accounts, Categories, Investments, Receivables, Analytics.

## Architectural Patterns & Agent Guidelines

1. **Offline-First Capabilities**
   - The frontend heavily relies on offline functionality. When modifying data fetching or mutation logic, ALWAYS ensure compatibility with the existing Dexie + Workbox setup.
   - Mutations (POST/PUT/DELETE) trigger Background Sync via Workbox when offline.
   - GET requests use `NetworkFirst` fallback to cache via Workbox API cache, and are often mirrored into Dexie for immediate local UI updates.

2. **Language and Localization**
   - The application supports both Arabic (ar) and English (en). The language depends on the user's preference in the application.
   - Any new feature, UI component, alert, or placeholder MUST be implemented using the localization files (`ar.js` and `en.js`). NEVER hardcode fallback Arabic or English strings in the UI components directly if the translation is missing.
   - The UI must dynamically support both RTL (Right-to-Left) and LTR (Left-to-Right) reading directions based on the active language.

3. **Styling (Tailwind CSS v4) & Premium Copper Brown & Ambient Glass UI Design**
   - The project uses Tailwind CSS v4 and Framer Motion for animations.
   - **CRITICAL UI/UX RULE**: The app uses **Copper Brown (`#8D6346`)** with its ambient light glow as the core visual identity, modeled directly from the **Dashboard** and **Debts** screens.
     - **Pure CSS Glassmorphism (No SVG Filters)**: Per explicit design decision, SVG displacement filters (`#glass-filter-_r_b_`) and chromatic aberration filters are phased out. Surfaces rely on pure, high-performance CSS: `backdrop-blur-[32px]`, `backdrop-blur-xl`, translucent surface fills (`bg-[#2B2321]/30`, `bg-black/20`), and subtle borders (`border-white/10`, `border-[#8D6346]/30`).
     - **Main Background & Ambient Light**: Deep dark background (`#141115` for Dashboard, `#100E11` for Debts) with `#8D6346` ambient glow blur spheres (`bg-[#8D6346] rounded-full blur-[120px] opacity-30` to `opacity-60`).
     - **Inner Elements**: Use `bg-white/15` or `bg-black/20`, `shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]` for nested active states (like the segmented control pill) to create physical depth.
     - **Active Elements / Branding**: Use `#8D6346` (Copper/Brown) for active icons, buttons, and primary highlights within the glass. Accentuate with `#E8C5A8` (Copper Light) for labels and `#3D2E2B` for dark borders.
     - **Financial Indicators**: `#34C759` (Brand Green) for Gain / Income / Owed To Me, `#FF3B30` (Brand Red) for Loss / Expense / I Owe, `#F59E0B` (Amber) for warnings, `#007AFF` (Blue) for bills.
     - **Typography**: Hero metrics should use large, bold, tabular numbers (`tabular-nums tracking-tight`). Text should use `text-white/90` for primary, `text-white/50` for secondary, and `drop-shadow-sm` for emphasis.
     - **Fluid Navigation**: ALWAYS use `<AnimatePresence mode="wait">` and `<motion.div>` (or section) for view changes. Standard page transition: `initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }}`.
     - **Micro-Interactions**: Replace standard buttons with `<motion.button whileTap={{ scale: 0.95 }}>` (or `0.98` for large buttons). Add `transition-colors` and `hover:text-white` to create a physical, tactile feel.
     - **Segmented Controls**: Build tabs/toggles using a shared `layoutId` on an absolute `motion.div` background to create a smooth, native sliding indicator.
     - **Charts**: Never use flat charts. Always inject SVG gradients (`<linearGradient>`) in Recharts and customized tooltips with blur effects.

4. **State Management (Zustand)**
   - Global states (e.g., Auth, Theme, offline status) are managed via Zustand. Check `src/contexts` or Zustand stores before implementing prop-drilling or new Context providers.

5. **PWA & Service Worker (`sw.js`)**
   - The custom service worker (`src/sw.js`) handles push notifications, offline routing, and background sync. Do not override this behavior unless specifically asked to fix a PWA-related issue.
   - Push notifications are scaffolded and supported.

6. **File Structure**
   - `backend/routes/` and `backend/controllers/`: Handle API endpoints. Always keep business logic in controllers or services, not routes.
   - `frontend/src/db/db.js`: Contains Dexie schema. Increment `db.version()` if you add or modify IndexedDB tables.
   - `frontend/src/components/`: Reusable React components. Keep them stateless where possible.

When asked to implement new features or modify existing ones, consult these guidelines to maintain consistency with the Finova architecture.

7. **User-Friendly Communication & UI**
   - **CRITICAL**: Never expose code-like variable names, translation keys (e.g., `settings.balanceLabel`), or raw technical identifiers to the user either in the UI or in conversational responses. 
   - Always use human-readable, user-friendly text that is easy to understand.
   - If a translation key falls back to rendering itself on the screen, fix the localization files immediately.

8. **UI/UX & Mobile Patterns**
   - **Modals**: Always use `createPortal(<div className="fixed inset-0 z-[100]...">...</div>, document.body)` for Modals to prevent `z-index` stacking context issues with page animations and `BottomNav`.
   - **Scrolling**: For long lists (e.g., `react-virtuoso`), prefer `useWindowScroll={true}` without fixed heights, to rely on the native browser scroll. This naturally hides headers when scrolling and avoids nested scrollbars. **CRITICAL**: Ensure no double scrollbars exist in any layout view. Use `h-full` or `min-h-screen` correctly to allow the main window scroll.

9. **Balance Calculations**
   - Accounts can have an `excludeFromTotal` boolean flag. When calculating the global "Total Balance" across all accounts, you MUST filter out accounts where `excludeFromTotal` is true. Transactions within these accounts remain visible.

10. **Problem Solving & Best Practices**
    - **CRITICAL**: Never take the easy or lazy way out ("استسهال"). Always search for and implement the most appropriate and robust solution that aligns perfectly with the project's rules, architecture, and technology stack (e.g., PWA constraints, MongoDB features, Zustand state).

11. **Notifications & Logging Standards**
    - **Notifications**: The backend uses `web-push`. Scheduled notifications (bills, recurring, daily reminders) are handled in `backend/services/cronJobs.js`.
    - **Production Logging**: Keep logs extremely concise on production to avoid flooding the server (Render). 
      - Use standard prefixes: `[CRON]`, `[PUSH]`, `[ERROR]`, `[WARNING]`, `[VAPID]`.
      - Only log high-value events during successful operations (e.g., cron started/finished, total processed count).
      - **DO NOT** log individual payloads, subscriptions, or verbose DB queries during normal execution.
      - **Error Logging**: Do NOT swallow exceptions. Always log full error details in `catch` blocks including Message, Stack Trace, and Status Code.

12. **Budget Feature Guidelines (Lessons Learned)**
    - **Data Fetching (Transactions)**: When calculating spent amounts for budgets in `Budgets.jsx`, ALWAYS fetch transactions using the API (`getTransactions()` from `api/transactions.js`), which utilizes the Service Worker's `api-cache` CacheStorage. Do NOT query `db.transactions` (IndexedDB) directly for transactions, as they are not stored there.
    - **Confirmations**: Never use native `window.confirm` for destructive actions like deleting a budget. Always implement the `ConfirmModal` component from `src/components/modals/ConfirmModal.jsx`.
    - **Localization**: Any new UI elements or settings (e.g., budget preferences in `Settings.jsx`) MUST support both Arabic (`ar.js`) and English (`en.js`). Do NOT hardcode Arabic fallback text in translation keys if the English translation is missing. Ensure all keys are properly added to `src/locales`.
    - **Notifications & Background Checks**:
      - Budget thresholds (50%, 75%, 90%, 100%, Exceeded, and New Cycles) are calculated dynamically in `backend/services/budgetEngine.js` (`checkBudgetThresholds`).
      - To prevent spam, the `Budget` model tracks `notificationState` (booleans for thresholds and `lastPeriodStart` to detect new cycles).
      - The threshold check is triggered in two ways to ensure both real-time feedback and edge-case coverage:
        1. **Instant Updates**: Triggered asynchronously within `backend/services/transactionService.js` upon transaction creation, modification, or deletion.
        2. **Cron Jobs**: Triggered periodically within `backend/services/cronJobs.js` to catch period rollovers, trigger "New Cycle" notifications, and reset the `notificationState`.
    - **Key Files**: 
      - Frontend: `frontend/src/pages/Budgets.jsx`, `frontend/src/components/Budget/BudgetCard.jsx`, `frontend/src/components/Budget/BudgetModal.jsx`, `frontend/src/services/budgetService.js`
      - Backend: `backend/controllers/budgetController.js`, `backend/services/budgetEngine.js`, `backend/models/Budget.js`, `backend/services/transactionService.js`, `backend/services/cronJobs.js`
