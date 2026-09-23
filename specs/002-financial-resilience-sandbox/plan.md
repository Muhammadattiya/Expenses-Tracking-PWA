# Implementation Plan: Financial Resilience & Decision Ecosystem

**Branch**: `002-financial-resilience-sandbox` | **Date**: 2026-09-22 | **Spec**: [specs/002-financial-resilience-sandbox/spec.md](spec.md)

**Input**: Feature specification from `specs/002-financial-resilience-sandbox/spec.md`

---

## Summary

This feature establishes an integrated financial resilience and decision ecosystem in Finova by uniting three financial pillars—**Structured Installments & BNPL Management**, a **Dedicated Emergency Fund Shield**, and **Smart Savings Goals**—directly into an upgraded **Financial Sandbox Engine**. The engine performs deterministic multi-month discrete-event forecasting (3, 6, 12 months) with Recharts trajectory visualizations, plain-language feasibility verdicts, goal impact advisories, and an atomic "Commit to Reality" execution bridge with zero external AI dependencies.

---

## Technical Context

**Language/Version**: Node.js v20+ (Backend), JavaScript / React 19 (Frontend)  
**Primary Dependencies**: 
- Backend: Express v4, Mongoose v8, web-push, node-cron
- Frontend: Vite v6, React 19, Tailwind CSS v4, Zustand v5, Recharts v2.15, Lucide React, Axios with `axios-retry`  
**Storage**: MongoDB (via Mongoose) with multi-document ACID transactions; Client-side offline cache via Dexie IndexedDB (`FinovaOfflineDB`)  
**Testing**: Playwright (`@playwright/cli`), Node.js Test Runner  
**Target Platform**: Progressive Web App (PWA) with responsive layouts (Desktop PC 1280x800 and Mobile iPhone 14)  
**Project Type**: Full-stack web application (Express API backend + React PWA frontend)  
**Performance Goals**: Sub-15ms simulation execution in-memory, sub-50ms local UI updates via Dexie, sub-100ms API response time  
**Constraints**: 100% offline-first PWA capability, zero external AI APIs, pure CSS glassmorphism without SVG filters, Copper Brown (`#8D6346`) ambient lighting aesthetic, bilingual Arabic (RTL, default) & English (LTR) with complete localization parity  
**Scale/Scope**: 4 primary feature areas (Installments, Shield, Goal Pots, Sandbox Engine) across 12 API endpoints, 8 frontend views/components, and 2 new database models.

---

## Constitution Check

*GATE: All principles evaluated against Constitution v1.1.0. Re-check post Phase 1 design.*

- **Principle I (Financial Integrity & Atomic Reconciled Invariance)**: **PASS**. All live mutations (installment creation with down payment, single-tap monthly payment, commit-to-reality execution) execute within ACID-compliant MongoDB transactions (`session.withTransaction`). Respects `excludeFromTotal` on accounts.
- **Principle II (Deterministic Modeling & Explainable Decision Intelligence)**: **PASS**. Zero external AI APIs. Projections use pure discrete event simulation, rule-based decision matrices, and transparent algebraic formulas.
- **Principle III (Tri-Pillar Financial Resilience & Goal Governance)**: **PASS**. Establishes the three-way synergy between Emergency Fund (3-6 month essential burn), Installments (tracking BNPL and DTI $\le 40\%$), and Savings Goals (pace and opportunity cost).
- **Principle IV (Security-First Architecture & Strict Multi-Tenant Isolation)**: **PASS**. All queries, lookups, and mutations enforce `user: userId` at the query boundary.
- **Principle V (Offline-First PWA Harmony & Performance)**: **PASS**. Dexie schema updated; mutations queue via Background Sync; simulations execute in-memory on deep-cloned state snapshots.
- **Principle VI (Premium Copper Brown & Ambient Glass UI Standard)**: **PASS**. Pure CSS glassmorphism (`backdrop-blur-[32px]`, `bg-[#2B2321]/30`), `#8D6346` ambient glow, document body portaled modals, Arabic RTL default.

---

## Project Structure

### Documentation (this feature)

```text
specs/002-financial-resilience-sandbox/
├── plan.md              # This implementation plan
├── research.md          # Technical decisions, math formulas, and alternatives
├── data-model.md        # Complete database schemas and DTO definitions
├── quickstart.md        # End-to-end runnable validation scenarios
├── contracts/           # API interface specifications
│   ├── installments-api.md
│   ├── emergency-fund-api.md
│   ├── savings-goals-api.md
│   └── sandbox-api.md
├── checklists/
│   └── requirements.md  # Spec quality validation checklist
└── tasks.md             # Implementation task list (generated via /speckit-tasks)
```

### Source Code Layout

```text
backend/
├── models/
│   ├── Installment.js           # New model: structured financing & BNPL
│   ├── SavingsGoal.js           # New model: purpose-driven savings pots
│   ├── EmergencyFund.js         # New model: user shield configuration
│   ├── Account.js               # Updated: isEmergencyFund flag
│   └── SimulationHistory.js     # Existing: stored simulation pipelines
├── routes/
│   ├── installmentRoutes.js     # New: /api/installments routes
│   ├── emergencyFundRoutes.js   # New: /api/emergency-fund routes
│   ├── savingsGoalRoutes.js     # New: /api/savings-goals routes
│   └── simulationRoutes.js      # Updated: /run multi-month & /apply bridge
├── controllers/
│   ├── installmentController.js
│   ├── emergencyFundController.js
│   ├── savingsGoalController.js
│   └── simulationController.js
└── services/
    ├── installmentService.js
    ├── emergencyFundService.js   # Dynamic essential burn rate calculation
    ├── savingsGoalService.js
    └── simulation/
        ├── simulationEngine.js   # Multi-month discrete event orchestrator
        ├── projectionEngine.js   # Discrete daily/monthly timeline calculator
        ├── stateBuilder.js       # Parallel snapshot loader with deep clone
        ├── financialCalculator.js
        └── DecisionEvaluator.js  # Verdict, recovery days, and goal delays

frontend/
├── src/
│   ├── api/
│   │   ├── installments.js
│   │   ├── emergencyFund.js
│   │   ├── savingsGoals.js
│   │   └── sandbox.js
│   ├── db/
│   │   └── db.js                 # Dexie schema v10 with installments & goals tables
│   ├── components/
│   │   ├── debts/
│   │   │   ├── InstallmentsList.jsx     # New: Installments tab in Debts
│   │   │   ├── InstallmentCard.jsx
│   │   │   └── InstallmentModal.jsx
│   │   ├── emergency/
│   │   │   └── FinancialShieldWidget.jsx # Shield gauge for Dashboard & Accounts
│   │   ├── savings/
│   │   │   ├── SavingsGoalsList.jsx
│   │   │   ├── GoalJarCard.jsx
│   │   │   └── GoalModal.jsx
│   │   └── sandbox/
│   │       ├── TrajectoryChart.jsx      # Recharts dual-curve area comparison
│   │       ├── DecisionPanel.jsx        # Verdict hero, recovery days, goal impact
│   │       ├── ResultsView.jsx
│   │       └── CommitPlanModal.jsx      # Confirmation dialog for live execution
│   ├── pages/
│   │   ├── Receivables.jsx              # Updated with 3rd "Installments" tab
│   │   ├── Accounts.jsx                 # Updated with Shield & Savings Goals
│   │   ├── Dashboard.jsx                # Updated with Shield & Goal glance
│   │   └── Sandbox.jsx                  # Upgraded multi-month timeline view
│   └── locales/
│       ├── ar.js                        # Complete Arabic translations
│       └── en.js                        # Complete English translations
```

---

## Complexity Tracking

*No constitutional violations or unjustified complexities. All designs adhere to project standards.*
