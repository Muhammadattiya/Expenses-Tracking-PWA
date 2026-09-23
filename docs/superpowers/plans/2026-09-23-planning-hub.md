# Planning Hub (Budgets, Savings, Emergency Fund, Plans) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the floating action button (FAB) "Budgets" into "Planning" (`/planning`), hosting a unified 4-tab financial planning ecosystem with query-param tab routing (`?tab=budgets|savings|emergency|plans`): keeping Budgets intact, adding Savings account tracking with cash-flow analytics, isolating the Emergency Fund (moving Financial Shield from the Dashboard to this tab), and building an ambitious Plans tab with savings goals, account linking, dynamic personalized savings advice, and Ask Nova AI strategic guidance.

**Architecture:** A unified responsive page `Planning.jsx` controlling active tab states via `useSearchParams` (`?tab=...`), delegating each domain to specialized modular tab components (`BudgetsTab`, `SavingsTab`, `EmergencyFundTab`, `PlansTab`). Money flows are calculated from real-time transaction history and visualized with SVG gradient Recharts. Personalized advice is dynamically derived from live burn rates, category spending habits, and goal deadlines.

**Tech Stack:** React 19, React Router DOM v7 (`useSearchParams`), Tailwind CSS v4, Framer Motion, Recharts, Dexie IndexedDB (`FinovaOfflineDB`), Lucide React, Axios.

**Spec & Conventions:** Conforms to [AGENTS.md](file:///d:/expenses-tracker/.agents/AGENTS.md) (Copper Brown `#8D6346`, pure CSS glassmorphism, no SVG filters, no double scrollbars, zero technical key leaks, bilingual AR/EN support, Playwright test accounts).

---

## Global Constraints

- **Theme & Identity**: Core accent `#8D6346` (Copper Brown), deep dark surfaces (`#141115` / `#100E11`), pure CSS glassmorphism (`backdrop-blur-[32px]`, `border-[#8D6346]/30`, `border-white/10`). Absolutely no SVG displacement or chromatic aberration filters.
- **Routing Pattern**: Uses the exact pattern of Analytics: `/planning?tab=budgets`, `/planning?tab=savings`, `/planning?tab=emergency`, `/planning?tab=plans`. Existing `/budgets` redirects to `/planning?tab=budgets`.
- **Dashboard Integrity**: `FinancialShieldWidget` is removed completely from [Dashboard.jsx](file:///d:/expenses-tracker/frontend/src/pages/Dashboard.jsx) and placed exclusively inside the Emergency Fund tab of Planning.
- **Localization**: All labels, tab titles, tooltips, validation messages, and advice strings must be defined in both [ar.js](file:///d:/expenses-tracker/frontend/src/locales/ar.js) and [en.js](file:///d:/expenses-tracker/frontend/src/locales/en.js).
- **Security & Authorization**: Account and Goal queries in backend services strictly enforce authenticated ownership `user: req.user.id`. No sensitive error traces leaked.

---

## Review Focus

1. **Tab Query Synchronization**: Direct navigation to `/planning?tab=savings` or switching tabs updates the URL query string cleanly without causing layout jumps or state loss.
2. **Savings Cash Flow Math**: Accurate separation of Inflows vs Outflows for the designated savings account (transfers in vs transfers out + expenses).
3. **Emergency Fund Exclusive Relocation**: Ensure removing `FinancialShieldWidget` from `Dashboard.jsx` does not break dashboard data loading or cause any null reference issues.
4. **Goal Account Connection**: When creating/editing a goal on the Plans tab, selecting "Connect to Savings Account" correctly maps `linkedAccountId` and `allocationType`.
5. **Personalized Advice Accuracy**: Real-time generation of mathematical recommendations (e.g. discretionary category trimming, monthly surplus vs required pace) gracefully handles edge cases like zero income, zero goals, or brand new users.

---

### Task 1: Navigation & Routing Updates (FAB & Route Config)

**Files:**
- Modify: `frontend/src/components/BottomNav.jsx:131-140`
- Modify: `frontend/src/App.jsx:20-65`
- Modify: `frontend/src/locales/en.js`
- Modify: `frontend/src/locales/ar.js`

**Interfaces:**
- Consumes: `useLanguage()`, `useSearchParams()`
- Produces: `/planning` route, `/budgets` redirect to `/planning?tab=budgets`, updated FAB with `nav.planning`

- [ ] **Step 1: Add localization keys in `en.js` and `ar.js`**
  - Add `nav.planning`: "Planning" in `en.js`, "التخطيط" in `ar.js`.
  - Add `planning` section with tab titles: `budgets`, `savings`, `emergency`, `plans`.

- [ ] **Step 2: Update `BottomNav.jsx`**
  - Replace `{ path: '/budgets', icon: Target, label: t('nav.budgets') }` with `{ path: '/planning', icon: Target, label: t('nav.planning') }`.
  - Add `'/planning'` to `OVERFLOW_PATHS`.

- [ ] **Step 3: Update `App.jsx` routes**
  - Lazy load `Planning` from `./pages/Planning`.
  - Add `<Route path="/planning" element={<Planning />} />`.
  - Add `<Route path="/budgets" element={<Navigate to="/planning?tab=budgets" replace />} />`.

- [ ] **Step 4: Verify navigation**
  - Clicking the FAB Planning button navigates to `/planning`.
  - Navigating to `/budgets` automatically redirects to `/planning?tab=budgets`.

---

### Task 2: Create Main Planning Hub Shell (`Planning.jsx`)

**Files:**
- Create: `frontend/src/pages/Planning.jsx`
- Create: `frontend/src/components/planning/PlanningTabs.jsx`

**Interfaces:**
- Consumes: `useSearchParams()`, `useLanguage()`
- Produces: Animated segmented pill header supporting 4 tabs (`budgets`, `savings`, `emergency`, `plans`) with `AnimatePresence mode="wait"` view transitions.

- [ ] **Step 1: Build `PlanningTabs.jsx`**
  - Responsive segmented control pill matching Finova design standards.
  - Active indicator using `<motion.div layoutId="planningActiveTabPill" />` with `bg-[#8D6346]/30 border border-[#8D6346]/50`.
  - 4 tabs with icons:
    - Budgets (`Target`)
    - Savings (`PiggyBank` or `Vault`)
    - Emergency Fund (`ShieldCheck`)
    - Plans (`Sparkles`)

- [ ] **Step 2: Build `Planning.jsx` page container**
  - Handles `useSearchParams` (`searchParams.get('tab') || 'budgets'`).
  - Implements `handleTabChange` updating `?tab=<tabKey>` with `{ replace: true }`.
  - Header displays page title "Planning Hub / مركز التخطيط المالي" with quick context summary.
  - Wraps tab view changes in `<AnimatePresence mode="wait">` with spring transitions.

---

### Task 3: Extract & Integrate Budgets Tab (`BudgetsTab.jsx`)

**Files:**
- Create: `frontend/src/components/planning/BudgetsTab.jsx`
- Modify: `frontend/src/pages/Budgets.jsx` (refactor to delegate or alias to `BudgetsTab`)

**Interfaces:**
- Consumes: `budgetService`, `getCategories`, `getTransactions`, `smartBudgetService`
- Produces: Self-contained Budgets view preserving 100% of existing budget cards, master plans, period filters, and creation modals.

- [ ] **Step 1: Extract core logic of `Budgets.jsx` into `BudgetsTab.jsx`**
  - Ensure all features remain identical:
    - Master Budget Card (`MasterBudgetCard`)
    - Category budget cards grid with spent percentages
    - Period and category filters
    - Add/Edit Budget Modal (`BudgetModal`)
    - Delete confirmation modal (`ConfirmModal`)
    - Link to `SmartBudgetPlanner` (`/budgets/smart-planner`)

- [ ] **Step 2: Connect `BudgetsTab` inside `Planning.jsx`**
  - Render `BudgetsTab` when active tab is `budgets`.
  - Verify offline Dexie support remains intact via `budgetService`.

---

### Task 4: Build Savings Tab with Account Card & Cash Flow Analytics (`SavingsTab.jsx`)

**Files:**
- Create: `frontend/src/components/planning/SavingsTab.jsx`
- Create: `frontend/src/components/planning/SavingsCashFlowChart.jsx`
- Modify: `frontend/src/api/accounts.js` (if helper needed for savings accounts)

**Interfaces:**
- Consumes: `getAccounts()`, `getTransactions()`, `useLanguage()`
- Produces: Designated Savings Account hero card, Monthly In/Outflow metrics, Recharts Cash Flow Area/Bar Chart, and quick action to deposit or change designated savings account.

- [ ] **Step 1: Implement Savings Account Discovery Logic**
  - Filter accounts where `isSavingsAccount === true`.
  - If multiple savings accounts exist, allow user to toggle between them or view primary.
  - If NO savings account is set, render an elegant call-to-action glass card: "Designate a Savings Account" with one-tap configuration or creation modal.

- [ ] **Step 2: Build Savings Cash Flow Computation**
  - Given transactions and the selected savings account ID:
    - **Inflows (Money In)**: Transactions where `to_account === acc._id` or `(account === acc._id && type === 'income')`.
    - **Outflows (Money Out)**: Transactions where `from_account === acc._id` or `(account === acc._id && type === 'expense')`.
  - Aggregate totals per month for the last 6 months.

- [ ] **Step 3: Build `SavingsCashFlowChart.jsx`**
  - Recharts `ResponsiveContainer` with `BarChart` or `AreaChart`.
  - Inflow Series: Brand Green (`#34C759`) SVG gradient.
  - Outflow Series: Rose (`#FF3B30`) or Copper Brown (`#8D6346`) gradient.
  - Custom glassmorphic tooltip with `backdrop-blur-xl`, formatted currency, and month labels.

- [ ] **Step 4: Assemble `SavingsTab.jsx`**
  - Hero card: Account name, icon, current balance, last 4 digits, monthly net change.
  - Quick action buttons: "Deposit into Savings" (opens quick transfer modal) and "Manage Accounts".
  - Chart card: Cash Flow Movement (In vs Out).
  - Recent activity list: Filtered transactions involving this savings account.

---

### Task 5: Relocate Emergency Fund from Dashboard to Emergency Fund Tab (`EmergencyFundTab.jsx`)

**Files:**
- Create: `frontend/src/components/planning/EmergencyFundTab.jsx`
- Modify: `frontend/src/pages/Dashboard.jsx:856-860`
- Modify: `frontend/src/components/emergency/FinancialShieldWidget.jsx` (ensure stand-alone compatibility)

**Interfaces:**
- Consumes: `getEmergencyFund()`, `getAccounts()`, `depositEmergencyFund()`, `updateEmergencyFund()`
- Produces: Dedicated Emergency Fund management screen with Emergency Account Card + Financial Shield Widget; cleans up Dashboard.

- [ ] **Step 1: Remove `FinancialShieldWidget` from `Dashboard.jsx`**
  - Remove `<FinancialShieldWidget onUpdate={fetchData} />` from lines 856-860 of `Dashboard.jsx`.
  - Remove unused import of `FinancialShieldWidget` from `Dashboard.jsx`.
  - Verify Dashboard renders cleanly without layout gaps.

- [ ] **Step 2: Build `EmergencyFundTab.jsx`**
  - Card 1: **Designated Emergency Account Card**:
    - Displays account designated with `isEmergencyFund: true` or `shield.linkedAccount`.
    - Shows balance, account type, bank icon, and security reserve tag.
    - If unlinked, provides quick selector to link an account as the emergency reserve.
  - Card 2: **Financial Shield Widget**:
    - Embeds `FinancialShieldWidget` with complete interactive support (target months slider, runway duration, protection tier, burn breakdown, quick deposit modal).

---

### Task 6: Build Plans Tab with Goals, Account Connection & Data-Driven Advice (`PlansTab.jsx`)

**Files:**
- Create: `frontend/src/components/planning/PlansTab.jsx`
- Create: `frontend/src/components/planning/SavingsAdvicePanel.jsx`
- Create: `frontend/src/services/financialAdviceEngine.js`
- Modify: `frontend/src/components/savings/GoalModal.jsx` (add savings account connection prompt)

**Interfaces:**
- Consumes: `getSavingsGoals()`, `getAccounts()`, `getTransactions()`, `getEmergencyFund()`, `useLanguage()`
- Produces: Interactive Savings Goals management, Goal creation with "Connect to Savings Account" option, and real-time personalized financial advice cards with "Ask Nova" integration.

- [ ] **Step 1: Enhance `GoalModal.jsx` with Account Connection**
  - Add interactive toggle/radio question: "Connect this goal to a savings account? / ربط هذا الهدف بحساب ادخار؟"
  - Options:
    - **Connect to Savings Account**: Displays list of available savings accounts (or all accounts). Sets `linkedAccountId` and `allocationType: 'dedicated'` or `'virtual_jar'`.
    - **Virtual Unlinked Goal**: Unlinked goal tracked solely within Finova plans.

- [ ] **Step 2: Build `financialAdviceEngine.js`**
  - Calculates personalized, actionable advice based on user data:
    1. **Net Savings vs Goal Pace**:
       - Calculates monthly net surplus: $\text{Income} - \text{Essential Burn}$.
       - If surplus < total required pace: identifies monthly deficit and calculates extended deadline recommendations.
       - If surplus > total required pace: praises user and shows estimated completion acceleration.
    2. **Discretionary Spending Leaks**:
       - Analyzes transactions over the last 60 days to find top non-essential expense categories.
       - Recommends: "Reducing your spending in [Category] by 15% frees up EGP [Amount]/month, speeding up [Goal Title] by [Weeks/Months]!"
    3. **Emergency Cushion Pre-check**:
       - If Emergency Fund runway < 3 months, gently suggests prioritizing 1-3 months of emergency runway alongside goal funding.

- [ ] **Step 3: Build `SavingsAdvicePanel.jsx`**
  - Renders ambient glass cards for each advice item with appropriate iconography (`Sparkles`, `TrendingUp`, `Lightbulb`, `ShieldAlert`).
  - Includes an **"Ask Nova" Deep Strategy** button that launches the Nova AI Assistant with pre-filled context about the user's active goals for tailored conversational planning.

- [ ] **Step 4: Assemble `PlansTab.jsx`**
  - Header with total goals progress, total target, and aggregate required monthly pace.
  - Goals grid using `GoalJarCard` components with edit, delete, and contribute actions.
  - "New Goal" button opening enhanced `GoalModal`.
  - `SavingsAdvicePanel` positioned prominently with rich aesthetics.

---

### Task 7: Quality Assurance, Playwright Automated Testing & Pre-Flight Checks

**Files:**
- Create: `tests/planning-hub.spec.mjs`

- [ ] **Step 1: Run Playwright test for Planning Hub**
  - Authenticate using test account `gemini@gmail.com` / `123456789`.
  - Verify FAB button click navigates to `/planning`.
  - Verify tab query switching (`?tab=budgets`, `?tab=savings`, `?tab=emergency`, `?tab=plans`).
  - Verify `FinancialShieldWidget` is present on `/planning?tab=emergency` and NOT present on `/`.
  - Verify Goal creation with savings account connection works.
  - Capture desktop and mobile screenshots.

- [ ] **Step 2: Pre-flight checklist**
  - Confirm WCAG contrast compliance for all buttons and text.
  - Confirm no SVG filters or deprecated styles used.
  - Confirm bilingual AR / EN localization keys complete.
