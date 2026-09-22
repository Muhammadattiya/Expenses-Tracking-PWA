<!--
# Sync Impact Report
- Version Change: 1.0.0 -> 1.1.0 (MINOR: expanded platform governance with financial modeling, resilience pillars, and UI/design system)
- Ratification Date: 2026-09-18
- Last Amended Date: 2026-09-22
- Modified Principles:
  - Principle II: Deterministic, Non-AI Ingestion & Zero-Guessing Account Resolution -> II. Deterministic Modeling & Explainable Decision Intelligence
- Added Principles:
  - Principle III: Tri-Pillar Financial Resilience & Goal Governance
  - Principle VI: Premium Copper Brown & Ambient Glass UI Standard
- Added Sections:
  - Financial Modeling, Simulation & Resilience Standards
- Retained & Harmonized Sections:
  - Principle I: 100% Financial Integrity & Atomic Reconciled Invariance
  - Principle IV: Security-First Architecture & Strict Multi-Tenant Isolation (merged idempotency provenance)
  - Principle V: Offline-First PWA Harmony, ReDoS Immunity & High Performance
  - Financial Ingestion & Security Hardening Standards
  - Development Workflow, Quality Gates & Testing Mandates
- Deferred Items / TODOs: None (all placeholders resolved)
-->

# Finova Constitution

## Core Principles

### I. 100% Financial Integrity & Atomic Reconciled Invariance
Financial accuracy is absolute and non-negotiable. Every mutation touching balances, cash flows, analytics, debts, installments, or budgets MUST maintain perfect mathematical and accounting consistency.
- Self-transfers between user-owned accounts MUST NEVER inflate income or expense metrics; multi-step flows must reconcile atomically into exactly one transfer transaction (`type: 'transfer'`).
- Accounts flagged with `excludeFromTotal: true` MUST be omitted from global net cash calculations while preserving internal transaction history.
- Multi-step state transitions, debt settlements, and live execution of simulated plans MUST execute within ACID-compliant, retried MongoDB transactions (`session.withTransaction`) to guarantee zero orphaned or partially applied records.

### II. Deterministic Modeling & Explainable Decision Intelligence
Financial intelligence, ingestion, and simulation MUST be 100% deterministic, transparent, mathematically verifiable, and explainable.
- External generative AI models, LLMs, and probabilistic black-box engines MUST NOT be used for financial accounting, account resolution, cash runway calculations, or financial decision scoring.
- Ingestion pipelines (SMS, webhooks, imports) MUST resolve accounts exclusively through verified identifiers; guessing accounts from defaults, merchants, or creation order is STRICTLY FORBIDDEN.
- Simulation engines (Financial Sandbox) MUST use deterministic discrete-event projections, rule-based decision matrices, and exact algebraic formulas. Every score and recommendation MUST be transparently explainable to the user in human terms.

### III. Tri-Pillar Financial Resilience & Goal Governance
The application architecture enforces a balanced financial resilience model built on three mutually supporting pillars:
- **Emergency Fund (Financial Shield)**: Essential living expenses (bills, groceries, recurring commitments, installments) define the user's monthly fixed burn rate. The system MUST actively protect a liquid emergency buffer of 3 to 6 months.
- **Structured Installments & Debt Governance**: Structured commitments (BNPL, bank loans, Gam'eya) MUST be tracked with exact installment counts, due days, and balances. The system MUST monitor the Debt-to-Income (DTI) ratio and alert when monthly commitments exceed 40% of income.
- **Purpose-Driven Savings Goals**: Savings accounts MUST NOT remain passive balances; they MUST tie to concrete goals with target amounts, target dates, and automated pace tracking. Simulations MUST evaluate the opportunity cost of purchases against these active life milestones.

### IV. Security-First Architecture & Strict Multi-Tenant Isolation
All user inputs, webhooks, and client payloads are treated as untrusted and guarded per OWASP standards.
- Multi-tenant data isolation is absolute: all database queries, account lookups, debt associations, and simulation runs MUST enforce `user: userId` at the query boundary. A user MUST NEVER access or mutate data belonging to another tenant.
- Webhook tokens and sensitive secrets MUST be stored hashed with SHA-256; plaintext credentials MUST NEVER be persisted or logged.
- All ingestion pipelines MUST enforce idempotency via message hashing and deterministic sorted-hash pairing keys (`sha256(minHash:maxHash)`), tolerating unordered arrivals and retries without duplication.

### V. Offline-First PWA Harmony, ReDoS Immunity & High Performance
Finova is an offline-first Progressive Web App. System architecture MUST deliver instantaneous local responsiveness while maintaining reliable cloud synchronization.
- All regular expressions in parsers MUST be linear and audited against ReDoS (Regular Expression Denial of Service).
- Read operations MUST prioritize local cache (`NetworkFirst` with Dexie IndexedDB mirroring); mutations MUST queue via Background Sync when offline without blocking user interactions.
- Simulation workflows MUST execute in-memory on deep-cloned state snapshots, guaranteeing sub-10ms response times without database write latency.

### VI. Premium Copper Brown & Ambient Glass UI Standard
User interfaces MUST evoke high trust, physical depth, and visual excellence adhering to the Finova Design System.
- **Color & Lighting**: The core visual identity relies on **Copper Brown (`#8D6346`)** with ambient blur glow spheres over deep dark backgrounds (`#141115` for Dashboard, `#100E11` for Debts/Sandbox).
- **Pure CSS Glassmorphism**: Surfaces MUST use pure, high-performance CSS (`backdrop-blur-[32px]`, `bg-[#2B2321]/30`, `bg-black/20`, subtle borders `border-white/10` and `border-[#8D6346]/30`). SVG displacement filters and chromatic aberration filters are strictly banned.
- **Language & Direction**: Arabic (RTL) is the default primary language, with full English (LTR) parity. All strings MUST use localization keys (`ar.js` and `en.js`); hardcoded strings, variable names, and raw translation keys in user-facing views are strictly forbidden.
- **Mobile Stacking & Modals**: All modals MUST be rendered via `createPortal(..., document.body)` to prevent z-index stacking issues with bottom navigation and page transitions. Views MUST use window scrolling to eliminate nested double scrollbars.

---

## Financial Modeling, Simulation & Resilience Standards

### 1. In-Memory Sandbox Isolation
- Simulations executed under `/api/sandbox/run` MUST NEVER mutate live database documents.
- State builders MUST load read-only snapshots and create pure deep clones in RAM before applying scenario actions.
- The "Commit to Reality" bridge MUST validate user confirmation and apply all queued actions atomically within a database transaction.

### 2. Burn Rate & Emergency Runway Formulas
- Monthly Essential Burn Rate MUST dynamically aggregate:
  - Active bills annualized to monthly equivalents (weekly $\times \frac{52}{12}$, monthly, yearly $\div 12$).
  - Active recurring expense commitments.
  - Active monthly installment payments.
  - Historical baseline for essential living expenses.
- Emergency Runway MUST be calculated as: $\text{Runway (Months)} = \frac{\text{Liquid Emergency Cash}}{\text{Monthly Essential Burn Rate}}$.

### 3. Installment Governance
- Every installment plan MUST track total amount, down payment, monthly payment, total months, paid months, due day of the month, and linked payment account.
- Paying an installment MUST atomically decrement remaining obligation, increment paid count, and record an expense transaction against the linked account.

---

## Financial Ingestion & Security Hardening Standards

### 1. Ingestion Threat Modeling & Attack Surface Control
- All incoming webhook bodies MUST undergo strict type and size constraints (maximum 5KB). Malformed payloads MUST fail fast.
- Text normalization (Arabic-Indic digit conversion `٠١٢٣٤٥٦٧٨٩` $\rightarrow$ `0123456789`, whitespace trimming) MUST precede all regex matching.
- Production logging MUST use standard prefixes (`[CRON]`, `[PUSH]`, `[ERROR]`, `[WARNING]`) and MUST NEVER log personal financial values, card numbers, or verbose DB records.

### 2. Pairing & Reconciliation Rules
- A self-transfer pair requires: identical authenticated user, one expense and one income, identical normalized amounts, distinct verified accounts owned by the user, timestamps within `SMS_TRANSFER_PAIRING_WINDOW_SECONDS = 45`, and matching references if present.

---

## Development Workflow, Quality Gates & Testing Mandates

### 1. Test-Driven & Regression-Proof Development
- Every accounting rule, simulation scenario, parser change, or reconciliation logic MUST be accompanied by deterministic automated tests.
- Automated testing MUST utilize Playwright with test credentials (`gemini@gmail.com` / `123456789`), validating both Desktop (1280x800) and Mobile (iPhone 14) viewports in Arabic (RTL) and English (LTR).

### 2. No "Quick-and-Dirty" Fixes (استسهال ممنوع)
- Shortcuts that compromise data integrity, introduce SVG filter performance bottlenecks, hardcode UI text, or bypass domain models are strictly banned.
- All code additions MUST seamlessly adhere to Zustand state management, Dexie schemas, and Mongoose transactional safeguards.

---

## Governance

This Constitution represents the supreme architectural, financial, and design authority for the Finova platform.
- All proposed plans, specs, tasks, pull requests, and implementations MUST strictly adhere to these principles.
- Amendments require explicit documentation, semantic version bumping (MAJOR for breaking changes, MINOR for new principles/sections, PATCH for wording refinements), and formal user approval.
- Code reviews MUST verify compliance with each principle prior to integration.

**Version**: 1.1.0 | **Ratified**: 2026-09-18 | **Last Amended**: 2026-09-22
