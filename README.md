# Finova - Expenses & Investments Tracker (PWA) 🚀

Finova is a premium, production-grade, offline-first personal finance management application. It offers a native-app-like experience entirely on the web, designed with a focus on high performance, dynamic aesthetics, and robust functionality. It primarily targets Arabic-speaking users with RTL (Right-to-Left) support as default.

## 🌟 Overview
Finova allows users to effortlessly track their daily expenses, incomes, transfers, and settlements across multiple accounts. It supports deep analytics, receivable/payable tracking, and investment portfolios (including gold/USD tracking). 

With its **Offline-First Architecture**, Finova uses IndexedDB (via Dexie.js) to store data locally and queue mutations while offline, smoothly syncing with the backend in the background when the connection is restored.

## 📱 Features

1. **Offline-First PWA**: Installs to the home screen. Caches all data locally. Queues actions when offline and syncs automatically when online.
2. **SMS-to-Transaction (Local Regex Parsing)**: Converts bank SMS notifications into transactions automatically using a webhook endpoint. No external AI APIs are used for maximum privacy. SMS transactions are flagged for manual review.
3. **Dynamic UI & Glassmorphism**: Stunning UI with dynamic responsive backgrounds, blur effects, and smooth micro-animations.
4. **Skeleton Loading**: Zero blocking spinners. Content loads instantly with beautiful shimmer skeletons.
5. **Virtualized Lists**: Capable of scrolling through tens of thousands of transactions without lag.
6. **Localization**: Fully supports Arabic (RTL) and English (LTR) with instant language switching (Arabic as default).
7. **Dark/Light Mode**: First-class support for system and manual theme preferences.

## 🛠️ Tech Stack

### Frontend (`/frontend`)
- **React 19** + **Vite**
- **Tailwind CSS v4**
- **Zustand** for state management
- **React Router v7**
- **Vite PWA (Workbox)** + **Dexie.js** for offline capabilities
- **Recharts** & **Lucide React**

### Backend (`/backend`)
- **Node.js** + **Express**
- **MongoDB** (via Mongoose)
- **JWT Authentication**
- **Web Push Notifications**
- **node-cron** for background jobs

## 📁 Project Structure

- **`/frontend`**: The PWA Client containing all React components, views, and offline database logic.
- **`/backend`**: The REST API Server handling authentication, transaction logic, and SMS webhooks.
- **`SMS_FEATURE.md`**: Detailed documentation on the SMS webhook parsing architecture.

## 🚀 Quick Start
*See individual `package.json` files in `frontend` and `backend` for run scripts.*