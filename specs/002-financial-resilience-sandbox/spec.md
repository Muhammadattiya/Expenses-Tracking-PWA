# Feature Specification: Financial Resilience & Decision Ecosystem

**Feature Branch**: `002-financial-resilience-sandbox`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Create and update the feature specification based on sand.md (Installments in Debts, Dedicated Emergency Fund, Smart Savings Goals, and Upgraded Financial Sandbox Engine)."

## Clarifications

### Session 2026-09-22
- Q: How should smart savings goals be linked to your financial accounts? (FR-008) → A: Option C: Hybrid Support (Support both dedicated 1-to-1 account mapping and multiple virtual goal jars allocated within an account).
- Q: When an installment's monthly due date arrives, how should the payment transaction be processed in the application? (FR-004) → A: Dual Mode: Automatic detection/deduction on due date when enabled or matched via bank notification; if not automatically executed/detected, fallback to manual one-tap payment confirmation with reminder alerts.
- Q: How should everyday discretionary spending be estimated when projecting multi-month cash flows in the Financial Sandbox? (FR-014) → A: Option C: Conservative Hybrid (Use the higher value between active budget limits and the 60-day historical average to stress-test real habits).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Structured Installment & BNPL Management (Priority: P1)

Users with structured recurring financial commitments (Buy-Now-Pay-Later like ValU, Souhoola, Sympl, Tabby, Tamara, or bank loans, car payments, and community Gam'eya) need a dedicated place to track their multi-month installment schedules, observe their aggregate monthly burden, and log single-tap monthly payments.

**Why this priority**: Installments represent the largest recurring cash flow obligation for modern households. Failing to track structured monthly commitments distorts available spending cash and compromises bill payments.

**Independent Test**: Can be tested independently by navigating to the Debts page, creating a 12-month installment plan for an electronics purchase (e.g., 36,000 EGP total with 6,000 EGP down payment and 2,500 EGP/month), verifying that the monthly burden updates, and logging a monthly payment to advance the counter to 1 of 12.

**Acceptance Scenarios**:
1. **Given** an active user on the Debts page, **When** they select the "Installments" tab, **Then** they see a hero summary of their total monthly installment burden and active installment contracts.
2. **Given** an active installment contract with auto-pay or matched banking notifications, **When** the due date arrives, **Then** the payment is automatically registered, completed months counter increments by one, and remaining balance decreases.
3. **Given** an installment without automated detection, **When** the due date arrives, **Then** the system sends a reminder notification and provides a single-tap "Pay This Month's Installment" button to manually log the payment.
4. **Given** multiple active installments, **When** total monthly installments exceed 40% of the user's recorded monthly income, **Then** the system visually flags the Debt-to-Income (DTI) ratio with a prominent cautionary advisory.

---

### User Story 2 - Establishing and Protecting the Emergency Fund Shield (Priority: P1)

Users need to establish a dedicated, protected liquid emergency fund covering 3 to 6 months of essential living expenses, keeping this reserve visually and operationally distinct from everyday discretionary cash.

**Why this priority**: An emergency fund is the bedrock of personal financial solvency. Without a clear shield, users easily conflate long-term safety reserves with spendable balances and face overdrafts during income disruptions.

**Independent Test**: Can be tested independently by setting an emergency coverage target (e.g., 3 months), observing the calculated target amount based on active bills and fixed obligations, depositing funds via a quick-transfer action, and verifying that the shield gauge reflects the funded ratio.

**Acceptance Scenarios**:
1. **Given** an authenticated user on the Dashboard or Accounts view, **When** they view the Financial Shield widget, **Then** they see their current liquid reserve, the target required for their chosen horizon (3 or 6 months), and the exact percentage funded.
2. **Given** an emergency fund target of 60,000 EGP with 45,000 EGP saved, **When** the user views the widget, **Then** it clearly states that 4.5 months of essential expenses are protected and that 15,000 EGP remains to reach complete fortress security.
3. **Given** money allocated to the emergency fund account, **When** calculating general spendable cash on the Dashboard, **Then** emergency funds are distinctly isolated so the user does not mistakenly treat them as disposable income.

---

### User Story 3 - Purpose-Driven Smart Savings Goals (Priority: P2)

Users with specific life milestones (such as marriage, car down payment, annual vacation, or real estate) want to convert passive savings accounts into active goal pots with target amounts, target dates, and automated monthly contribution tracking.

**Why this priority**: Passive savings accounts lack psychological motivation and accountability. Providing visual pots with countdowns and pace advisories dramatically improves goal attainment rates.

**Independent Test**: Can be tested independently by creating a savings goal (e.g., "Car Down Payment", 60,000 EGP target, deadline in 12 months), verifying that the system calculates the required 5,000 EGP/month pace, and logging a contribution to observe milestone celebrations.

**Acceptance Scenarios**:
1. **Given** a user creating a savings goal with a target amount and deadline, **When** the goal is saved, **Then** the system automatically calculates the required monthly deposit pace: `(Target - Current) / Months Remaining`.
2. **Given** an active savings goal, **When** the user deposits their monthly target, **Then** the goal status reflects "On Track" with a celebratory milestone badge when crossing 25%, 50%, 75%, or 100% completion.
3. **Given** a goal where deposits have fallen behind schedule, **When** the user views the goal card, **Then** it highlights the revised monthly contribution required to hit the original deadline.

---

### User Story 4 - Multi-Month Trajectory Simulation & Decision Intelligence (Priority: P1)

Users considering major purchases, new recurring commitments, salary changes, or installment plans want to simulate the future impact on their cash runway, emergency fund, and goals over a 3, 6, or 12-month horizon before spending any money.

**Why this priority**: Pure day-0 calculations do not show compounding effects of recurring commitments or installments. Multi-month forecasting delivers actionable clarity without relying on external generative AI services.

**Independent Test**: Can be tested by queueing a 30,000 EGP purchase in the Financial Sandbox, observing the 6-month trajectory chart showing baseline versus simulated balance curves against the red Emergency Shield floor, and receiving a clear human verdict with exact recovery days.

**Acceptance Scenarios**:
1. **Given** a user in the Financial Sandbox, **When** they add an action to the pipeline and run the evaluation, **Then** they see a dual-trajectory area chart comparing their projected baseline path against the simulated path over 3, 6, or 12 months.
2. **Given** a simulated purchase that dips into the Emergency Fund threshold, **When** the evaluation completes, **Then** the system outputs a "Critical Risk" verdict warning that emergency runway drops below acceptable safety standards.
3. **Given** an approved simulation, **When** the results view renders, **Then** it presents the exact recovery runway in days (e.g., *"45 days to recover spent cash"*), trade-off suggestions (e.g., *"Split into installments"*), and goal impact (e.g., *"Delays Car Goal by 2 months"*).

---

### User Story 5 - "Commit to Reality" Execution Bridge (Priority: P3)

Users who have modeled an optimal financial decision in the Sandbox want to apply the scenario directly into their live accounts with a single confirmation, eliminating redundant manual data entry.

**Why this priority**: Bridges the gap between contemplation and action, transforming the Sandbox from a passive calculator into an active execution tool.

**Independent Test**: Can be tested by running an installment simulation, clicking "Commit to Reality", confirming the prompt, and verifying that the installment and initial down payment transaction appear immediately in live accounts and the Debts page.

**Acceptance Scenarios**:
1. **Given** a completed simulation result, **When** the user clicks "Commit Plan to Reality", **Then** a clear confirmation modal lists all live changes that will occur.
2. **Given** user confirmation, **When** the backend processes the request, **Then** all simulated actions (transactions, budget updates, or installment contracts) are committed atomically into real database records.

---

### Edge Cases

- **Zero Income / Complete Income Loss Scenario**: When a user simulates complete job or income loss (`simulatedIncome = 0`), the discrete-event engine steps forward day-by-day subtracting fixed bills, active installments, and baseline daily burn. It calculates the exact calendar date of "Day Zero" (تاريخ نفاذ السيولة) when cash hits 0, plotting the steep depletion curve and classifying the decision immediately as "Critical Risk" with freeze recommendations.
- **Installment Payoff Ahead of Schedule**: When a user settles all remaining installments at once, the system atomically closes the contract (`status: 'settled'`), records the lump-sum expense in a single transaction, and removes the recurring monthly burden from future burn rate calculations.
- **Goal Over-Funding (>100%)**: When a deposit causes a savings goal's balance to equal or exceed its target (`currentAmount >= targetAmount`), the system permits the transaction, marks `status: 'achieved'`, sets `requiredMonthlyPace = 0`, displays a celebratory gold/emerald milestone banner ("تم تحقيق الهدف بنجاح!"), and offers explicit user actions to either archive the goal or transfer surplus funds to another goal.
- **Calendar Due Date Clamping (29th, 30th, 31st)**: For installments or bills due on days 29, 30, or 31, the effective execution day for month $M$ in year $Y$ is clamped via `Math.min(dueDayOfMonth, new Date(Y, M + 1, 0).getDate())`. For example, in February with 28 days, a due day of 31 executes on February 28, while preserving the user's permanent `dueDayOfMonth: 31` attribute for subsequent 31-day months.
- **Simultaneous Emergency Depletion and Bill Default**: When a simulated pipeline causes both an emergency fund safety floor breach and an unpaid bill due to insufficient funds, the system ranks the bill default as the primary Critical alert to warn against immediate service cutoff or penalties.
- **Offline Simulation Fallback**: When the user runs the Financial Sandbox while offline or disconnected from the server, an isomorphic client-side simulation engine executes against the local Dexie IndexedDB snapshot (`FinovaOfflineDB`), displaying a "وضع المحاكاة المحلي (بيانات غير متصلة)" badge. Any "Commit to Reality" action executed while offline is queued in Dexie's `syncQueue` for atomic cloud reconciliation upon network restoration.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated "Installments" (أقساط والتزامات) view within the Debts section (`Receivables.jsx`) using a 3-tab segmented control ("لي", "علي", "أقساط") with a smooth sliding Copper Brown pill (`layoutId="activeDebtTab"`). The view MUST display a summary header of aggregate monthly burden (`totalMonthlyBurden`) and total remaining debt (`totalRemainingObligations`), status filter buttons ("الكل", "نشطة", "مكتملة"), and an "إضافة قسط جديد" action opening a portaled creation modal.
- **FR-002**: System MUST record and display structured installment attributes: Title, Provider (ValU, Souhoola, Sympl, Tabby, Tamara, CIB, NBE, Banque Misr, Gam'eya, or Other), Total Amount, Down Payment, Fixed Monthly Payment, Total Duration (months), Completed Months, Monthly Due Day (1-31), Linked Account, and Status. The `InstallmentCard` MUST render:
  - A horizontal progress bar filled with `#8D6346` gradient showing `Math.round((paidMonths / totalMonths) * 100)%`.
  - A counter string formatted as "شهر X من Y" (e.g., "شهر 4 من 12") / "Month X of Y".
  - A countdown string: "الاستحقاق القادم: خلال X يوم (DD MMM)" / "Next due: in X days (DD MMM)", with an Amber badge if $\le 3$ days and Red badge if overdue.
- **FR-003**: System MUST calculate and display the Debt-to-Income (DTI) ratio: `(Total Monthly Installment Burden / Total Monthly Net Income) * 100`. It MUST evaluate DTI against three measurable thresholds:
  - $\le 30\%$: **Healthy** (Green) — debt burden is sustainable.
  - $30.1\% - 40.0\%$: **Caution** (Amber) — elevated debt burden, caution advised.
  - $> 40.0\%$: **Critical Warning** (Rose/Red) — dangerous debt load, prominent alert banner warning against additional financing. If monthly income is unrecorded or zero, system prompts the user to set their income.
- **FR-004**: System MUST support a deterministic dual-mode payment engine for installments:
  - **Priority 1 (Automated Check)**: On the due date at 08:00 AM, background cron checks if `autoPay === true` or matches an incoming bank notification/webhook. If matched, it automatically debits the linked account, logs an expense `Transaction`, increments `paidMonths`, updates `nextDueDate` (with calendar clamping), and dispatches a push notification.
  - **Priority 2 (Manual Fallback)**: If no automated transaction occurred, system sends a due-date reminder push notification and enables a prominent "سداد قسط هذا الشهر" (Pay This Month's Installment) button on the `InstallmentCard`, allowing single-tap logging with instant balance deduction.
- **FR-005**: System MUST provide a dedicated Emergency Fund shield metric calculated strictly via:
  $$\text{Essential Monthly Burn Rate} = \text{Monthly Bills} + \text{Monthly Recurring Expenses} + \text{Active Monthly Installments} + \text{Baseline Essential Living Spend}$$
  where `Baseline Essential Living Spend` is quantified as the sum of active category budgets for essential categories (Groceries/Food, Housing, Utilities, Healthcare) or the 60-day historical average spend in those categories if no budgets exist. A user manual override `customMonthlyBurnOverride` takes precedence when provided.
- **FR-006**: System MUST allow users to configure their emergency coverage horizon (defaulting to 3 months for basic protection and 6 months for complete fortress security).
- **FR-007**: System MUST visually isolate protected emergency funds on the Dashboard via a dedicated "Financial Shield" (درع الأمان المالي) widget positioned prominently below the Total Balance hero and above Quick Actions. The widget MUST render:
  - Circular or arc SVG progress gauge displaying `fundingRatio = (currentReserveAmount / targetAmount) * 100`.
  - Runway duration pill: "يغطي X.X شهر مصاريف" / "Covers X.X months of expenses" (Green $\ge 3$ months, Amber 1-3 months, Rose $< 1$ month).
  - Explicit visual separation between "رصيد محمي للطوارئ" (Protected Emergency Reserve) and "الرصيد المتاح للإنفاق" (Discretionary Spendable Balance = Total Balance - Emergency Reserve).
- **FR-008**: System MUST support visual Savings Goals with attributes: Goal Name, Category, Target Amount, Current Balance, Target Date, Required Monthly Pace, Priority, and flexible Account Linking (supporting both dedicated 1-to-1 account mapping and virtual goal jars allocated within a shared account).
- **FR-009**: System MUST automatically compute required monthly deposit pace for all savings goals: `Math.ceil((Target Amount - Current Balance) / Math.max(1, Months Remaining))`.
- **FR-010**: System MUST track pace status for each goal: "Ahead of Schedule" (contributions $\ge 120\%$ of pace), "On Track" ($90\% - 119\%$), or "Behind Schedule" ($< 90\%$).
- **FR-011**: System MUST provide celebratory visual milestones when goals cross 25%, 50%, 75%, and 100% completion.
- **FR-012**: System MUST allow single-tap contributions from checking accounts into designated goal pots.
- **FR-013**: Financial Sandbox MUST project account balances and cash flows forward across selectable horizons: 3 months (90 daily steps), 6 months (180 daily steps), and 12 months (365 daily steps). Recharts trajectory graph requirements:
  - Dual `<Area>` curves with `<linearGradient>` fills: Baseline trajectory (`#8D6346` copper gradient) vs. Simulated trajectory (Emerald `#34C759` if solvent, Rose `#FF3B30` if dipping below floor).
  - Dashed horizontal `<ReferenceLine>` at `safetyFloorBalance` labeled "خط الأمان (Emergency Floor)" with `#F59E0B` stroke.
  - Customized tooltip using pure CSS backdrop blur (`backdrop-blur-md bg-black/80 border border-white/10`) showing Date, Baseline Balance, Simulated Balance, and Delta.
  - Safe empty/single-month fallback rendering: when historical data is sparse or fewer than 7 days exist, the chart renders a stable horizontal baseline without throwing rendering exceptions.
- **FR-014**: Financial Sandbox projection MUST account for scheduled recurring income, active recurring bills, recurring expenses, active monthly installment payments, and estimate variable discretionary spending using a conservative hybrid selection formula:
  $$\text{Monthly Discretionary Spend} = \sum_{c \in \text{Variable Categories}} \max(\text{Active Budget Limit}(c), \text{60-Day Historical Monthly Average}(c))$$
  stepping daily discretionary outflow at $\text{Monthly Discretionary Spend} / 30$.
- **FR-015**: Financial Sandbox MUST classify decision feasibility using a mutually exclusive and collectively exhaustive evaluation matrix:
  1. **Critical Risk (خطر مالي حرج - Rose)**: Evaluated first. Triggered IF minimum projected balance $< 0$ at any point in the horizon, OR balance breaches emergency safety floor by $> 25\%$ of the floor amount, OR resulting DTI $> 40\%$, OR daily savings rate $\le 0$ with an unbuffered deficit.
  2. **Viable with Caution (قابل للتطبيق مع الحذر - Amber)**: Evaluated second. Triggered IF NOT Critical Risk AND (balance dips into emergency safety floor by $\le 25\%$, OR resulting DTI is between $30.1\%$ and $40\%$, OR recovery runway is between 91 and 180 days, OR an active high-priority Savings Goal deadline is delayed by $> 30$ days).
  3. **Safe & Recommended (آمن وموصى به - Emerald)**: Evaluated third. Triggered for all remaining states (balance stays strictly above 100% of emergency safety floor, DTI $\le 30\%$, recovery runway $\le 90$ days, and no high-priority goal delayed $> 30$ days).
- **FR-016**: Financial Sandbox MUST evaluate whether simulated actions dip below the Emergency Fund safety floor and trigger critical alerts if breached.
- **FR-017**: Financial Sandbox MUST compute the exact recovery time in days:
  $$\text{Daily Savings Rate} = \frac{\text{Monthly Net Income} - \text{Essential Monthly Burn} - \text{Variable Spend}}{30}$$
  $$\text{Recovery Days} = \begin{cases} \lceil \text{Cash Outflow} / \text{Daily Savings Rate} \rceil & \text{if Daily Savings Rate} > 0 \\ \text{null (Unrecoverable Deficit)} & \text{if Daily Savings Rate} \le 0 \end{cases}$$
  When `recoveryDays === null`, UI displays "لا يوجد تعافي تلقائي (عجز في التدفق النقدي الشهري)" / "No automatic recovery (Monthly cash flow deficit)" and flags the verdict as Critical Risk.
- **FR-018**: Financial Sandbox MUST evaluate the opportunity cost of simulated actions on active Savings Goals, calculating `delayDays` and `delayMonths` for each goal and presenting plain-language delay impacts.
- **FR-019**: Financial Sandbox MUST provide a pre-built "Cash vs. Installments" template comparing 100% upfront payment against a 20% down payment with 6 or 12 monthly installments.
- **FR-020**: Financial Sandbox MUST provide a "Commit to Reality" execution action wrapped in an ACID MongoDB transaction session (`session.withTransaction`) on backend and a Dexie transaction (`db.transaction('rw', ... )`) on client, ensuring all created transactions, installment contracts, and budget adjustments succeed or roll back atomically.
- **FR-021**: All financial calculations in the Sandbox and Emergency Fund MUST run deterministically in-memory without external AI models or third-party APIs.
- **FR-022**: All views, alerts, labels, and descriptions MUST support both Arabic (RTL, default) and English (LTR) with complete localization parity and zero technical variable names or raw keys displayed.
- **FR-023**: All modal interfaces (`InstallmentModal.jsx`, `GoalModal.jsx`, `CommitPlanModal.jsx`) MUST render via document body portal (`createPortal(..., document.body)`) to prevent z-index layering conflicts with mobile navigation bars.

### Key Entities

- **Installment**: Represents a structured financing contract or loan with attributes: `title`, `provider`, `providerName`, `totalAmount`, `downPayment`, `monthlyAmount`, `totalMonths`, `paidMonths`, `dueDayOfMonth`, `linkedAccountId`, `category`, `status`, `autoPay`, `startDate`, `nextDueDate`, `notes`.
- **EmergencyFundShield**: Represents the user's liquid safety buffer with attributes: `targetMonths`, `essentialMonthlyBurn`, `targetAmount`, `currentReserveAmount`, `fundingRatio`, `runwayDurationMonths`, `protectionTier` ('vulnerable' | 'basic' | 'solid' | 'fortress'), `burnBreakdown`, `linkedAccount`.
- **SavingsGoal**: Represents a purpose-driven savings pot with attributes: `title`, `category`, `icon`, `color`, `targetAmount`, `currentAmount`, `targetDate`, `priority`, `allocationType` ('dedicated' | 'virtual_jar'), `linkedAccountId`, `status` ('active' | 'achieved' | 'paused' | 'cancelled').
- **SimulationTimelinePoint**: Represents a discrete projected point in time with attributes: `date`, `baselineBalance`, `simulatedBalance`, `safetyFloorBalance`, `eventsOnDay`.
- **DecisionVerdict**: Represents the synthesized human-readable evaluation with attributes: `status` ('safe' | 'caution' | 'critical'), `titleAr`, `titleEn`, `reasonAr`, `reasonEn`, `recoveryDays`, `emergencyRunwayMonths`, `debtToIncomeRatio`, `goalDelays`, `tradeOffSuggestions`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can set up a new multi-month installment plan in under 45 seconds.
- **SC-002**: Users can log their monthly installment payment in a single tap, with balance updates reflected in under 100 milliseconds.
- **SC-003**: The Financial Sandbox calculates and renders a 12-month forward trajectory projection in under 15 milliseconds without network latency.
- **SC-004**: 100% of simulated decisions provide an explicit feasibility verdict, recovery time in days, and goal impact without ambiguous numerical scores.
- **SC-005**: 100% of emergency fund calculations and simulation projections function entirely offline via local browser cache and service workers.
- **SC-006**: 0% accidental spending of emergency reserves: users report clear distinction between spendable checking cash and protected emergency funds.

---

## Assumptions

- Users earn recurring income on predictable monthly cycles (or have an established monthly average).
- Essential burn rate calculations assume that past recurring bills and recurring expenses reflect mandatory baseline commitments.
- The standard recommended emergency fund default is set to 3 months for basic protection and 6 months for complete security, fully customizable by the user.
- All financial projections assume a stable currency basis (Egyptian Pound EGP default, with multi-currency support) without speculative interest rate fluctuations.
