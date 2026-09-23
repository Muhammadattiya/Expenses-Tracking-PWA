# Research & Technical Decisions: Financial Resilience & Decision Ecosystem

**Feature**: `002-financial-resilience-sandbox`  
**Date**: 2026-09-22  
**Status**: Completed  

---

## 1. Installments (الأقساط) Architecture & Payment Lifecycle

### Decision: Dedicated `Installment` Collection with Dual-Mode Settlement
We introduce a standalone `Installment` Mongoose model (`backend/models/Installment.js`) with an explicit lifecycle (`active`, `settled`, `paused`). Monthly settlement uses a **dual-mode engine**:
1. **Automated Matching / Debit**: On the installment's `dueDayOfMonth`, a background job (`cronJobs.js`) checks whether an automatic payment was executed, or matches incoming bank SMS webhooks (e.g., ValU/Bank debit notifications).
2. **Manual Fallback**: If no automated transaction occurred, the user receives a push notification on their due date, and the UI displays a single-tap **"سداد قسط هذا الشهر" (Pay This Month's Installment)** button.

### Rationale
- Decoupling installments from informal peer-to-peer debts (`Debt` collection) prevents schema pollution. Informal debts are binary (`i_owe` vs `owed_to_me`), whereas installments require structured amortization properties (down payments, duration, paid months counters, and due days).
- Single-tap payment logging automatically generates a standard `Transaction` of type `'expense'` and category `'Installments'` (`أقساط`), ensuring global analytics, cash flow charts, and monthly burn calculations remain unified without custom ledger hacks.

### Alternatives Considered
- *Extending the existing `Debt` model*: Rejected because overloading informal debts with contract durations, provider names, and automated monthly payment schedules violates single-responsibility and complicates reconciliation.
- *Modeling as simple `RecurringTransaction`*: Rejected because recurring transactions lack finite duration (total vs paid months), down payment tracking, and remaining balance amortization.

---

## 2. Emergency Fund (درع الطوارئ) Calculation & Isolation

### Decision: Formulaic Shield Engine with Account-Level Segregation
The Emergency Fund shield is computed dynamically in a dedicated service (`backend/services/emergencyFundService.js`) and mirrored to client state:
$$\text{Essential Monthly Burn Rate} = \text{Monthly Bills} + \text{Monthly Recurring Expenses} + \text{Monthly Installments} + \text{Baseline Essential Living Spend}$$
$$\text{Target Reserve Goal} = \text{Essential Monthly Burn Rate} \times \text{Target Horizon (3 or 6 Months)}$$
$$\text{Funding Ratio} = \frac{\text{Current Protected Reserve}}{\text{Target Reserve Goal}} \times 100$$

### Rationale
- Essential expenses fluctuate when bills change or new installments are taken on. Computing the burn rate dynamically from actual active obligations guarantees the emergency target reflects real-world commitments rather than a static guess.
- To prevent accidental spending, designated emergency accounts are visually isolated on the Dashboard and flagged with `isEmergencyFund: true`.

### Alternatives Considered
- *Static manual target entry*: Rejected because users rarely recalculate their target when living costs, rents, or installment obligations rise.

---

## 3. Smart Savings Goals & Hybrid Allocation Model

### Decision: Dedicated `SavingsGoal` Entity with Hybrid Account Linking
Users can configure savings goals with either:
1. **Dedicated Account Mapping (1-to-1)**: A dedicated bank or wallet account whose full balance represents the goal.
2. **Virtual Goal Jars (Many-to-1)**: Multiple goals allocated within a shared primary savings account (`allocationType: 'virtual_jar'`).

### Rationale
- Based on Clarification Q1, users have varied banking setups: some maintain separate sub-accounts, while others keep all savings in a single bank account and want virtual "envelopes" or "jars" without the overhead of opening multiple bank accounts.
- Automated pace calculation:
$$\text{Required Monthly Pace} = \frac{\text{Target Amount} - \text{Current Saved Amount}}{\text{Months Remaining Until Target Date}}$$

### Alternatives Considered
- *Pure virtual allocations only*: Rejected because users who already have dedicated accounts (e.g., an investment deposit account or gold certificate wallet) should be able to map them directly.

---

## 4. Multi-Month Trajectory Forecasting & Deterministic Modeling

### Decision: Day-by-Day / Month-by-Month Discrete Event Simulation
The Financial Sandbox forward projection executes entirely in Node.js on the server and in JavaScript on the client:
1. Projects time forward across $N \in [3, 6, 12]$ months (90 to 365 days).
2. Incorporates scheduled salary/income, active recurring bills, recurring expenses, and active installment payment schedules.
3. Variable discretionary spending is modeled conservatively using the higher value between active category budgets and 60-day historical averages (Clarification Q3).
4. Dual-curve output: `baselineBalance(t)` vs. `simulatedBalance(t)`, evaluated against `emergencySafetyFloor(t)`.

### Rationale
- Complies strictly with Constitution Principle II: zero external AI APIs, zero token costs, sub-15ms computation, and 100% deterministic accounting.
- The conservative hybrid spending model prevents overly optimistic projections, stress-testing whether the user can realistically maintain their lifestyle while taking on new financial decisions.

---

## 5. "Commit to Reality" Transactional Execution

### Decision: Atomic MongoDB Multi-Document Transactions (`session.withTransaction`)
When the user approves a simulation and clicks **"تطبيق الخطة في الواقع"**:
1. Client sends `POST /api/sandbox/apply` with the approved pipeline actions.
2. The controller opens a MongoDB transaction session.
3. For each action: creates the live expense/income `Transaction`, creates the `Installment` record, or updates the `Budget` document.
4. Commits atomically. If any write fails, the entire batch rolls back, guaranteeing zero partial states (Constitution Principle I).
