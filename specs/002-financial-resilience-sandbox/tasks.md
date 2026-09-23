# Tasks: Financial Resilience & Decision Ecosystem

**Feature**: `002-financial-resilience-sandbox`  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)  
**Status**: Ready for Implementation  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema migrations, shared API clients, and bilingual localization dictionaries.

- [X] T001 Register Dexie IndexedDB schema version 10 with `installments` and `savingsGoals` tables in `frontend/src/db/db.js`
- [X] T002 [P] Initialize Arabic localization keys for Installments, Financial Shield, Savings Goals, and Sandbox Verdicts in `frontend/src/locales/ar.js`
- [X] T003 [P] Initialize English localization keys for Installments, Financial Shield, Savings Goals, and Sandbox Verdicts in `frontend/src/locales/en.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core model extensions, routing mounts, and client API modules that block all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Extend `Account` schema with `isEmergencyFund: { type: Boolean, default: false }` in `backend/models/Account.js`
- [X] T005 [P] Create frontend API client wrappers for Installments, Emergency Fund, and Savings Goals in `frontend/src/api/installments.js`, `frontend/src/api/emergencyFund.js`, and `frontend/src/api/savingsGoals.js`
- [X] T006 [P] Mount route prefixes (`/api/installments`, `/api/emergency-fund`, `/api/savings-goals`) with JWT protection in `backend/app.js`

**Checkpoint**: Foundation ready — user story implementation can proceed.

---

## Phase 3: User Story 1 - Structured Installment & BNPL Management (Priority: P1) 🎯 MVP

**Goal**: Enable users to record, monitor, and pay structured BNPL plans, bank personal loans, and Gam'eya with automated monthly burden and Debt-to-Income (DTI) tracking.

**Independent Test**: Navigate to the Debts page, open the "Installments" tab, create a 12-month installment contract (36,000 EGP total, 6,000 EGP down, 2,500 EGP/month), verify monthly burden indicator updates, and log a payment to advance the counter to 1 of 12.

### Implementation for User Story 1

- [X] T007 [P] [US1] Create `Installment` Mongoose model with fields (`title`, `provider`, `totalAmount`, `downPayment`, `monthlyAmount`, `totalMonths`, `paidMonths`, `dueDayOfMonth`, `linkedAccountId`, `status`, `autoPay`, `nextDueDate`) and compound indexes in `backend/models/Installment.js`
- [X] T008 [US1] Implement `installmentService.js` with CRUD, aggregate monthly burden, DTI ratio computation, single-tap payment logging, and calendar due-day clamping `Math.min(dueDayOfMonth, daysInMonth)` in `backend/services/installmentService.js`
- [X] T009 [US1] Implement `installmentController.js` and define routes (`GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/pay`) in `backend/controllers/installmentController.js` and `backend/routes/installmentRoutes.js`
- [X] T010 [P] [US1] Create `InstallmentCard.jsx` displaying provider badge, progress bar (`paidMonths / totalMonths`), countdown, and one-tap payment button in `frontend/src/components/debts/InstallmentCard.jsx`
- [X] T011 [P] [US1] Create portaled `InstallmentModal.jsx` for creating and editing installment plans in `frontend/src/components/debts/InstallmentModal.jsx`
- [X] T012 [US1] Implement `InstallmentsList.jsx` and integrate the third tab `أقساط والتزامات (Installments)` into `frontend/src/pages/Receivables.jsx`
- [X] T013 [US1] Add automated installment payment matching and due-date notification check job in `backend/services/cronJobs.js`

**Checkpoint**: User Story 1 is fully functional and testable independently as the core MVP increment.

---

## Phase 4: User Story 2 - Establishing and Protecting the Emergency Fund Shield (Priority: P1)

**Goal**: Provide a dedicated Financial Shield widget calculating the essential monthly burn rate from bills, recurring commitments, and installments, protecting a 3-6 month liquid reserve.

**Independent Test**: Open the Financial Shield widget on the Dashboard, set a 6-month horizon, verify essential burn aggregates active obligations + installments, and transfer funds to observe the live shield percentage gauge update.

### Implementation for User Story 2

- [X] T014 [P] [US2] Create `EmergencyFund` configuration schema (`targetMonths`, `linkedAccountId`, `customMonthlyBurnOverride`) in `backend/models/EmergencyFund.js`
- [X] T015 [US2] Implement `emergencyFundService.js` calculating dynamic essential monthly burn rate, target amount, funding ratio, and runway duration in `backend/services/emergencyFundService.js`
- [X] T016 [US2] Implement `emergencyFundController.js` and routes (`GET /`, `PUT /`, `POST /deposit`) in `backend/controllers/emergencyFundController.js` and `backend/routes/emergencyFundRoutes.js`
- [X] T017 [P] [US2] Create `FinancialShieldWidget.jsx` with circular progress gauge, protection tier badge, and quick-transfer modal in `frontend/src/components/emergency/FinancialShieldWidget.jsx`
- [X] T018 [US2] Integrate `FinancialShieldWidget` into `frontend/src/pages/Dashboard.jsx` and `frontend/src/pages/Accounts.jsx`

**Checkpoint**: User Stories 1 and 2 operate in harmony; installments dynamically elevate the required emergency reserve.

---

## Phase 5: User Story 3 - Purpose-Driven Smart Savings Goals (Priority: P2)

**Goal**: Transform passive savings accounts into interactive goal pots with deadlines, milestone animations, and automated monthly contribution pace tracking.

**Independent Test**: Create a savings goal for "Car Down Payment" (60,000 EGP, 10 months deadline), verify monthly pace calculates to 6,000 EGP/month, and deposit 15,000 EGP to trigger the 25% milestone celebration.

### Implementation for User Story 3

- [X] T019 [P] [US3] Create `SavingsGoal` Mongoose model with fields (`title`, `category`, `targetAmount`, `currentAmount`, `targetDate`, `priority`, `allocationType`, `linkedAccountId`, `status`) in `backend/models/SavingsGoal.js`
- [X] T020 [US3] Implement `savingsGoalService.js` calculating required monthly pace `(Target - Current) / Months`, pace health, and transfer contribution in `backend/services/savingsGoalService.js`
- [X] T021 [US3] Implement `savingsGoalController.js` and routes (`GET /`, `POST /`, `PUT /:id`, `DELETE /:id`, `POST /:id/contribute`) in `backend/controllers/savingsGoalController.js` and `backend/routes/savingsGoalRoutes.js`
- [X] T022 [P] [US3] Create `GoalJarCard.jsx` with milestone progress bars (25%, 50%, 75%, 100%), pace status badges, and quick deposit action in `frontend/src/components/savings/GoalJarCard.jsx`
- [X] T023 [P] [US3] Create portaled `GoalModal.jsx` for creating/editing savings goal pots in `frontend/src/components/savings/GoalModal.jsx`
- [X] T024 [US3] Implement `SavingsGoalsList.jsx` and integrate into `frontend/src/pages/Accounts.jsx`

**Checkpoint**: User Stories 1, 2, and 3 are functional; users have complete tracking for obligations, safety reserves, and goals.

---

## Phase 6: User Story 4 - Multi-Month Trajectory Simulation & Decision Intelligence (Priority: P1)

**Goal**: Upgrade the Financial Sandbox to run deterministic discrete event simulations over 3, 6, or 12 months, plotting trajectory curves against the emergency floor, delivering plain-language verdicts, and calculating goal delay costs.

**Independent Test**: Add a 30,000 EGP purchase in the Sandbox, select a 6-month horizon, verify the Recharts trajectory graph shows baseline vs. simulated balance curves, and confirm the verdict alerts if the emergency fund floor is breached.

### Implementation for User Story 4

- [X] T025 [P] [US4] Update `stateBuilder.js` to load read-only snapshots of `Installment`, `SavingsGoal`, and `EmergencyFund` in `backend/services/simulation/stateBuilder.js`
- [X] T026 [US4] Implement `projectionEngine.js` calculating discrete daily/monthly trajectories across 3, 6, and 12 months using conservative hybrid spending models in `backend/services/simulation/projectionEngine.js`
- [X] T027 [US4] Update `DecisionEvaluator.js` to compute human verdicts (`safe`, `caution`, `critical`), exact recovery days, savings goal delay durations, and trade-off suggestions in `backend/services/simulation/DecisionEvaluator.js`
- [X] T028 [US4] Implement installment scenario handler and integrate forward projection into `backend/services/simulation/simulationEngine.js`
- [X] T029 [P] [US4] Create `TrajectoryChart.jsx` using Recharts area chart with SVG linear gradients, emergency safety floor reference line, and glass tooltips in `frontend/src/components/sandbox/TrajectoryChart.jsx`
- [X] T030 [US4] Redesign `DecisionPanel.jsx` and `ResultsView.jsx` to render human verdicts, recovery runway, and goal delay impact cards in `frontend/src/components/sandbox/DecisionPanel.jsx` and `frontend/src/components/sandbox/ResultsView.jsx`
- [X] T031 [US4] Add pre-built "Cash vs. Installments" scenario template to the pipeline builder in `frontend/src/pages/Sandbox.jsx`

**Checkpoint**: Financial Sandbox functions as an intelligent, predictive decision engine connected to real-world commitments.

---

## Phase 7: User Story 5 - "Commit to Reality" Execution Bridge (Priority: P3)

**Goal**: Allow users to atomically apply an approved simulation pipeline into live accounts, debts, and budgets with a single confirmation.

**Independent Test**: Run an installment simulation in the Sandbox, click "Commit to Reality", confirm the dialog, and verify that live transactions and installment records are created immediately.

### Implementation for User Story 5

- [X] T032 [US5] Implement `applySimulation` endpoint executing pipeline actions inside an ACID MongoDB transaction session in `backend/controllers/simulationController.js` and `backend/routes/simulationRoutes.js`
- [X] T033 [P] [US5] Create portaled `CommitPlanModal.jsx` summarizing all live changes before execution in `frontend/src/components/sandbox/CommitPlanModal.jsx`
- [X] T034 [US5] Wire "تطبيق الخطة في الواقع" button with toast notification and cache refresh in `frontend/src/pages/Sandbox.jsx`

**Checkpoint**: Full end-to-end loop complete — from scenario simulation to live account execution.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Bilingual localization audit, automated Playwright verification, and quickstart validation.

- [X] T035 [P] Audit all new UI views in both Arabic (RTL) and English (LTR) ensuring zero raw technical keys or hardcoded text in `frontend/src/locales/ar.js` and `frontend/src/locales/en.js`
- [X] T036 [P] Create automated Playwright test suite for Installment lifecycle, Shield calculation, and Sandbox simulation in `tests/e2e/financial-resilience.spec.js`
- [X] T037 Execute and validate all 5 scenarios from `quickstart.md` ensuring 100% test pass rate

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup — blocks all User Stories.
- **User Stories (Phases 3–7)**:
  - **US1 (Installments)**: Can start after Phase 2.
  - **US2 (Emergency Fund)**: Depends on US1 (burn rate includes monthly installments).
  - **US3 (Savings Goals)**: Can start after Phase 2 (runs in parallel with US1/US2).
  - **US4 (Sandbox Engine)**: Depends on US1, US2, and US3 (orchestrates data from all three).
  - **US5 (Commit Bridge)**: Depends on US4.
- **Polish (Phase 8)**: Depends on all user stories being complete.

---

## Parallel Opportunities

```bash
# Phase 1 Parallel Setup:
Task T002: "Initialize Arabic localization in frontend/src/locales/ar.js"
Task T003: "Initialize English localization in frontend/src/locales/en.js"

# Phase 2 Parallel Foundational:
Task T005: "Create API wrappers in frontend/src/api/"
Task T006: "Mount route prefixes in backend/app.js"

# Phase 3 Parallel Tasks:
Task T010: "Create InstallmentCard.jsx"
Task T011: "Create InstallmentModal.jsx"
```

---

## Implementation Strategy: MVP First

1. **Step 1**: Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. **Step 2**: Implement Phase 3 (**User Story 1: Installments**).
3. **Step 3 (MVP Validation)**: Test Installment tracking and payments independently in the Debts view.
4. **Step 4**: Implement Phase 4 (Emergency Shield) and Phase 5 (Savings Goals).
5. **Step 5**: Implement Phase 6 (Sandbox Multi-Month Engine) and Phase 7 (Commit Bridge).
6. **Step 6**: Execute Phase 8 (Polish & Playwright Automated Tests).
