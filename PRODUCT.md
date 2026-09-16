# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- Primary: Individual personal finance managers seeking to track daily expenses, incomes, transfers, debts/receivables, and multi-asset investments (Gold, USD).
- Demographics & Scope: Arabic-speaking (default RTL) and English-speaking users; salaried employees, freelancers, and independent professionals managing both predictable and irregular cash flows.
- Situation: Mobile-first daily use for rapid expense entry on the move, weekly/monthly budget monitoring, and long-term asset & debt tracking across multiple accounts.

## Product Purpose
- Finova exists to eliminate friction, cognitive load, and anxiety around personal finance.
- It provides a native-feeling, offline-first Progressive Web App (PWA) that operates with zero latency, syncing seamlessly in the background when connectivity is present.
- Success means frictionless transaction capture, complete local data reliability offline, clear debt and investment visibility, and intelligent AI-driven financial suggestions that keep users solvent and growing.

## Positioning
- Unlike generic web budgeting apps or cumbersome banking portals, Finova pairs Apple's ultra-clear "Liquid Glass" visual craft (warm Copper Brown `#8D6346` aesthetic with crystal translucency revealing what lies beneath) with offline-first PWA resilience (Workbox + Dexie.js).
- Features voice-driven quick add ("speak your transactions"), an AI assistant with direct data control, smart budget suggestions, and AI cash-flow forecasting for employees and freelancers, fully optimized for Arabic RTL and English.

## Operating Context
- Environments: Mobile smartphones (iOS Safari PWA, Android Chrome PWA) as primary touchpoints, with full desktop browser parity.
- Touchpoints: Daily quick-logging moments (at checkout, transit, dining), end-of-month salary budget allocations, debt reconciliation, and gold/foreign currency valuation checks.
- Network conditions: Designed to function flawlessly in offline or intermittent connectivity environments (subway, travel, cellular drops).

## Capabilities and Constraints
- **Core Capabilities**:
  - Offline-First Architecture: Workbox BackgroundSync and Dexie.js (`FinovaOfflineDB`) IndexedDB caching and mutation queueing.
  - Multi-Account Management: Cash, Bank, and Digital Wallets, with support for `excludeFromTotal`.
  - Transaction Tracking: Income, Expense, Transfer with category classification and virtualized scrolling (`react-virtuoso`).
  - Debts & Receivables: Tracking "I owe" vs "Owed to me" with settlement history.
  - Investment Portfolio: Tracking gold holdings and USD / foreign currency balances.
  - Budgets & Analytics: Dynamic budget threshold alerts (50%, 75%, 90%, 100%, Exceeded), Recharts visualizations with custom gradient tooltips, and Web Push notifications.
  - AI Features: Voice-based quick add, AI agent with real data control, smart budget suggestions, and predictive forecasting for freelancers and employees.
- **Constraints & Hard Rules**:
  - Pure CSS Liquid Glass: Apple-grade crystal-clear Liquid Glass with high optical translucency, engineered so the user can distinctly see what is underneath (background glows, textures, underlying scroll content) without muddy opacity. Strictly no SVG displacement or chromatic aberration filters (relying on pure CSS `backdrop-blur-[32px]`, crisp translucent fills `bg-[#2B2321]/30` / `bg-black/20`, and subtle specular rim borders `border-white/10`).
  - Modal Layering: Modals must mount via `createPortal(..., document.body)` to avoid z-index stacking conflicts with page animations and `BottomNav`.
  - Window Scroll: Long virtualized lists must use window scroll to avoid nested/double scrollbars.
  - Tabular Figures: All financial figures, balances, and metrics must use `tabular-nums tracking-tight`.
  - Confirmations: Destructive actions must use `<ConfirmModal />`, never native `window.confirm`.
  - Localization: Zero hardcoded fallback strings; dynamic RTL/LTR support powered by `src/locales/ar.js` and `en.js`.

## Brand Commitments
- **Name**: Finova.
- **Visual Identity**: Apple-inspired dark "Liquid Glass" with warm copper highlights (`#8D6346`), deep obsidian backgrounds (`#141115` Dashboard, `#100E11` Debts), and warm radial ambient glow spheres (`opacity-30` to `opacity-60`). The glass is ultra-clear and optic—designed so content and atmospheric lights underneath remain clearly discernible.
- **Typography**: 'Exo 2' sans-serif with tabular figures.
- **Voice & Tone**: High-craft, empowering, reassuring, and precise. Friendly and jargon-free in both Arabic and English.

## Evidence on Hand
- Codebase structure: React 19 + Vite frontend (`/frontend`) and Node.js/Express/MongoDB backend (`/backend`).
- Master Design System: [design-system/finova/MASTER.md](file:///d:/expenses-tracker/design-system/finova/MASTER.md).
- Architecture & Agent Guidelines: [.agents/AGENTS.md](file:///d:/expenses-tracker/.agents/AGENTS.md).
- Localization files: `frontend/src/locales/ar.js` and `frontend/src/locales/en.js`.
- Dexie offline store: `frontend/src/db/db.js`.
- PWA manifest and assets: `frontend/public/manifest.webmanifest`.

## Product Principles
- **Frictionless Immediacy**: Logging transactions takes seconds, via voice or minimal taps. Skeletons and optimistic local updates ensure zero blocking spinners.
- **Offline-First Resilience**: Local data is the immediate source of truth; network issues never interrupt user flow or cause data loss.
- **Actionable Financial Clarity**: Numbers are scannable, honest, and context-rich without visual clutter.
- **Intelligent Agency**: AI provides active utility (voice entry, data actions, predictive cash-flow forecasting, budget tips) while keeping the user in full control.
- **Liquid Glass Tactility**: Surfaces emulate Apple's ultra-clear liquid glass with pure physical depth, genuine optical clarity showing what lies beneath, and fluid spring motion on every interaction.

## Accessibility & Inclusion
- Native RTL support as default for Arabic, dynamically flipping to LTR for English using logical CSS properties (`ms-`, `me-`, `start-`, `end-`).
- WCAG AA/AAA compliance for text contrasts on dark surfaces (`text-white/90` primary text achieves 18.7:1 contrast; financial green `#34C759` achieves 9.46:1 contrast).
- Generous mobile touch targets (minimum 44x44px) with spring micro-interactions (`whileTap={{ scale: 0.95 }}`).
