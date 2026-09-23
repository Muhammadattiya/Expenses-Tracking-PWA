# Quickstart Validation Guide: Financial Resilience & Decision Ecosystem

**Feature**: `002-financial-resilience-sandbox`  
**Date**: 2026-09-22  
**Status**: Completed  

This guide details end-to-end validation scenarios proving that **Installments**, the **Emergency Fund Shield**, **Smart Savings Goals**, and the **Financial Sandbox** operate in complete harmony.

---

## Prerequisites

1. MongoDB running locally or connected via `.env`.
2. Backend dependencies installed (`npm install` in `backend/`).
3. Frontend dependencies installed (`npm install` in `frontend/`).
4. Automated tests use Playwright with credentials:
   - Email: `gemini@gmail.com`
   - Password: `123456789`

---

## Scenario 1: Structured Installment Lifecycle & DTI Tracking

### Goal
Verify that creating an installment increases monthly burden, displays countdown, and updates upon payment.

1. **Setup**: Authenticate and navigate to the Debts page (`/debts` or `/receivables`).
2. **Action**:
   - Switch to the **أقساط والتزامات (Installments)** tab.
   - Click **"إضافة قسط جديد" (Add New Installment)**.
   - Enter: Title: `iPhone 15 ValU`, Total: `36,000 EGP`, Down Payment: `6,000 EGP`, Monthly: `2,500 EGP`, Duration: `12 months`, Due Day: `5th`, Linked Account: `Checking`.
3. **Expected Outcome**:
   - Installment appears with progress bar `0 من 12 قسطاً مكتملة`.
   - Total Monthly Burden reflects `+2,500 EGP/month`.
   - Debt-to-Income (DTI) ratio updates.
4. **Payment Action**:
   - Click **"سداد قسط هذا الشهر" (Pay This Month)**.
5. **Expected Outcome**:
   - Progress bar updates to `1 من 12 قسطاً مكتملة (متبقي 27,500 ج.م)`.
   - Expense transaction of 2,500 EGP appears in the linked checking account.

---

## Scenario 2: Emergency Fund Shield & Dynamic Burn Rate

### Goal
Verify that the emergency fund calculates required reserves from active bills, recurring items, and installments.

1. **Setup**: Navigate to Dashboard or Accounts.
2. **Action**:
   - Open the **Financial Shield (درع الأمان)** widget.
   - Select a 6-month coverage target.
3. **Expected Outcome**:
   - System aggregates: Monthly Bills + Recurring Expenses + Monthly Installments (including the 2,500 EGP from Scenario 1) + Discretionary Baseline.
   - Target Reserve Goal equals: `Essential Monthly Burn * 6`.
   - Liquid reserves reflect current funding ratio (%) and runway in months.
4. **Deposit Action**:
   - Tap **"تحويل للطوارئ" (Deposit to Shield)** and transfer 10,000 EGP.
5. **Expected Outcome**:
   - Emergency shield funding percentage increments immediately without page reload.
   - Transferred funds are marked untouchable and isolated from spendable cash.

---

## Scenario 3: Smart Savings Goals & Milestone Tracking

### Goal
Verify that creating a goal calculates monthly pace and tracks pace health.

1. **Setup**: Navigate to Accounts / Goals.
2. **Action**:
   - Click **"إنشاء هدف توفير" (Create Savings Goal)**.
   - Title: `مقدم سيارة (Car Down Payment)`, Target: `60,000 EGP`, Deadline: 10 months from today, Type: `Virtual Jar` in Savings Account.
3. **Expected Outcome**:
   - Required Monthly Pace displays `6,000 EGP/month`.
   - Goal card renders countdown (`متبقي 10 أشهر`) with 0% progress.
4. **Contribution Action**:
   - Click **"إيداع في الهدف" (Contribute)** and deposit 15,000 EGP (25%).
5. **Expected Outcome**:
   - 25% milestone celebration animation triggers.
   - Goal status reflects `على المسار الصحيح (On Track)`.

---

## Scenario 4: Financial Sandbox Multi-Month Simulation & Verdict

### Goal
Prove that the Sandbox models future cash flows, warns against emergency fund breaches, and calculates goal delays with zero external AI.

1. **Setup**: Navigate to `/sandbox`.
2. **Action**:
   - Add a Purchase scenario: `Amount: 40,000 EGP` from checking account.
   - Select a 6-month simulation horizon.
   - Click **"Evaluate Decision Pipeline"**.
3. **Expected Outcome**:
   - **Trajectory Chart**: Displays a Recharts dual-curve area graph. The simulated curve shows an initial 40,000 EGP dip.
   - **Safety Floor**: If the dip crosses below the Emergency Fund reserve line, the intersection pulses red.
   - **Verdict Card**: Displays `خطر مالي مباشر (Critical Risk)` or `ممكن مع الحذر (Caution)` with explicit plain-language rationale.
   - **Opportunity Cost**: States exact delay for the Car Goal: `💡 هذا الشراء سيؤخر تحقيق هدف 'مقدم سيارة' بمقدار شهرين ونصف`.
   - **Recovery Runway**: States exact days to recover spent cash (e.g., `68 days`).
   - **Trade-off Advice**: Proposes the "Cash vs. Installments" alternative.

---

## Scenario 5: "Commit to Reality" Execution

### Goal
Verify that an approved simulation atomically writes to live records.

1. **Setup**: On the simulation results screen of Scenario 4, click **"تطبيق الخطة في الواقع" (Commit to Reality)**.
2. **Action**: Confirm the confirmation dialog.
3. **Expected Outcome**:
   - Success toast appears: `تم تطبيق الخطة المالية بنجاح في حسابك الحقيقي`.
   - Live checking account balance reflects the deduction.
   - Emergency shield and savings goal timelines update immediately.
