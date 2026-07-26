# Finova - Progressive Web App (PWA) 🚀

Finova is a premium, production-grade, offline-first personal finance management application. It offers a native-app-like experience entirely on the web, designed with a focus on high performance, dynamic aesthetics, and robust functionality.

## 🌟 Overview

Finova allows users to effortlessly track their daily expenses, incomes, transfers, and settlements across multiple accounts. It supports deep analytics, receivable/payable tracking, and investment portfolios (including gold/USD tracking).
With its **Offline-First Architecture**, Finova uses IndexedDB (via Dexie.js) to store data locally and queue mutations while offline, smoothly syncing with the backend in the background when the connection is restored.

## 🛠️ Tech Stack

### Frontend

- **React 19**: Modern component-based UI.
- **Vite**: Ultra-fast build tool and development server.
- **Tailwind CSS v4**: Utility-first CSS framework for rapid UI styling.
- **React Router v7**: Declarative routing for React.
- **Zustand**: Fast and scalable state management.
- **Workbox (Vite PWA)**: Service workers, precaching, StaleWhileRevalidate strategies, and Background Sync.
- **Dexie.js**: Minimalist IndexedDB wrapper for offline storage and queueing.
- **React Virtuoso**: Powerful list virtualization for rendering thousands of transactions smoothly.
- **Recharts**: Beautiful and highly customizable charts for analytics.
- **Axios**: Configured with `axios-retry` for resilient HTTP requests.
- Backend
- **Node.js & Express**: Fast, unopinionated, minimalist web framework.
- **MongoDB (Mongoose)**: NoSQL database with composite indexes and `.lean()` query optimizations for maximum speed.
- **JWT**: Stateless user authentication.
- **Web Push**: For native push notifications.

---

## 📁 Project Structure

### `/frontend` - The PWA Client

```
/frontend
│
├── index.html                   # Entry point for the Vite app
├── package.json                 # Frontend dependencies and scripts
├── vite.config.js               # Vite & PWA Plugin configuration
│
├── /public                      # Static assets (icons, manifest.webmanifest)
│
└── /src
    ├── main.jsx                 # React root render & Service Worker registration
    ├── App.jsx                  # Main router, layout wrapper, and offline sync hooks
    ├── index.css                # Global CSS, Tailwind entry, and theme variables
    ├── sw.js                    # Custom Service Worker containing Workbox strategies
    │
    ├── /api                     # Axios instance & API wrappers
    │   ├── axios.js             # Axios setup with interceptors, offline queuing, & retries
    │   ├── accounts.js          # API calls for Accounts
    │   └── transactions.js      # API calls for Transactions
    │
    ├── /components              # Reusable React components
    │   ├── Layout.jsx           # Main layout containing BottomNav and offline indicators
    │   ├── BottomNav.jsx        # Sticky bottom navigation bar
    │   ├── /cards               # Display cards (TransactionCard, AccountCard)
    │   ├── /modals              # Popup dialogs (EditTransaction, ConfirmModal)
    │   └── /ui                  # Generic UI components (Skeletons, CustomSelect)
    │
    ├── /contexts                # React Context Providers
    │   ├── LanguageContext.jsx  # i18n support (Arabic & English)
    │   └── NotificationContext.jsx # Toast notification system
    │
    ├── /db                      # Local Database setup
    │   └── db.js                # Dexie.js instance (FinovaOfflineDB)
    │
    ├── /hooks                   # Custom React Hooks
    │   └── useNetwork.js        # Hook to monitor online/offline browser state
    │
    └── /pages                   # Main Application Views
        ├── Dashboard.jsx        # Home page: balances and virtualized transaction list
        ├── Analytics.jsx        # Charts, breakdown of spending, and category limits
        ├── AddTransaction.jsx   # Form to insert income/expense/transfer
        ├── Receivables.jsx      # Debt and loan tracking interface
        ├── Investments.jsx      # Portfolio tracker (Gold, USD, etc.)
        └── Settings.jsx         # User preferences, language, and theme toggle
```

### `/backend` - The REST API Server

```
/backend
│
├── server.js                    # Express application entry point & middleware setup
├── package.json                 # Backend dependencies
│
├── /config
│   └── db.js                    # MongoDB connection logic
│
├── /models                      # Mongoose Schemas (with performance indexes)
│   ├── User.js                  # User credentials and metadata
│   ├── Transaction.js           # Core transactions (Income/Expense/Transfer)
│   ├── Account.js               # User accounts (Cash, Bank, Wallet)
│   └── Category.js              # Categories (Food, Transport, etc.)
│
├── /controllers                 # Route handlers bridging HTTP and Services
│   └── transactionController.js # Handles requests for transactions
│
├── /services                    # Core Business Logic (DB Queries)
│   └── transactionService.js    # Highly optimized .lean() queries
│
└── /routes                      # Express Router definitions
    ├── auth.js                  # Authentication endpoints
    └── transactions.js          # Transaction CRUD endpoints
```

## 🚀 Key Features

1. **Offline-First PWA**: Installs to the home screen. Caches all data locally. Queues actions when offline and syncs automatically when online.
2. **Dynamic UI & Glassmorphism**: Stunning UI with dynamic responsive backgrounds, blur effects, and smooth micro-animations.
3. **Skeleton Loading**: Zero blocking spinners. Content loads instantly with beautiful shimmer skeletons.
4. **Virtualized Lists**: Capable of scrolling through tens of thousands of transactions without lag.
5. **Localization**: Fully supports Arabic (RTL) and English (LTR) with instant language switching.
6. **Dark/Light Mode**: First-class support for system and manual theme preferences.
