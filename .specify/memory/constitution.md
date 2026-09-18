<!--
# Sync Impact Report
- Version Change: Uninitialized Template -> 1.0.0
- Ratification Date: 2026-09-18
- Last Amended Date: 2026-09-18
- Modified Principles:
  - [PRINCIPLE_1_NAME] -> I. 100% Financial Integrity & Atomic Reconciled Invariance
  - [PRINCIPLE_2_NAME] -> II. Deterministic, Non-AI Ingestion & Zero-Guessing Account Resolution
  - [PRINCIPLE_3_NAME] -> III. Security-First Architecture & Strict Multi-Tenant Isolation
  - [PRINCIPLE_4_NAME] -> IV. Concurrency-Safe Idempotency & Dual-Message Provenance
  - [PRINCIPLE_5_NAME] -> V. High Performance, ReDoS Immunity & Offline-First Harmony
- Added Sections:
  - Section 2: Financial Ingestion & Security Hardening Standards
  - Section 3: Development Workflow, Quality Gates & Testing Mandates
- Removed Sections: None
- Deferred Items / TODOs: None (all placeholders resolved)
-->

# Finova Constitution

## Core Principles

### I. 100% Financial Integrity & Atomic Reconciled Invariance
Financial data accuracy is non-negotiable. Every mutation touching balances, cash flows, analytics, or budgets MUST maintain perfect mathematical and accounting consistency.
- Self-transfers (such as IPN/InstaPay transfers between user-owned accounts) MUST NEVER result in inflated income or expense metrics; temporary states must be atomically reconciled into exactly one transfer transaction (`type: 'transfer'`).
- Reconciling transactions MUST atomically roll back all temporary effects (category spend in `Budget`, monthly/weekly income and expense counters, daily heatmaps) and apply accurate transfer deltas (`transferOut` from source account, `transferIn` to destination account).
- Multi-step state transitions and counterpart pairings MUST execute within ACID-compliant, retried MongoDB transactions (`session.withTransaction`) to guarantee zero intermediate or orphaned states.

### II. Deterministic, Non-AI Ingestion & Zero-Guessing Account Resolution
Financial record ingestion from SMS webhooks, notifications, or imports MUST be 100% deterministic, transparent, and auditable.
- External AI models, LLMs, external bank APIs, and opaque probabilistic heuristics MUST NOT be used for account resolution, transfer pairing, or financial mutations.
- Account resolution MUST rely exclusively on explicit, context-verified identifiers (such as card or account last 4 digits extracted from verified prefixes like `from 0694 on` or `إلى حسابكم 4113`).
- Account guessing is STRICTLY FORBIDDEN: the system MUST NEVER infer accounts from default accounts, only-account fallbacks, merchant names, categories, transaction type, or creation order. If an account cannot be resolved with certainty, the account field MUST remain `null`.

### III. Security-First Architecture & Strict Multi-Tenant Isolation
The application treats all external webhook inputs as untrusted and enforces end-to-end security per OWASP standards and Finova rules.
- Multi-tenant data isolation is absolute: all database queries, account lookups, transfer pairings, and mutations MUST enforce `user: userId` at the query boundary. A user MUST NEVER see, modify, or match accounts or transactions belonging to another tenant.
- Webhook tokens MUST be stored hashed with SHA-256 and matched via constant-time lookup. Plaintext tokens MUST NEVER be persisted or logged.
- Raw message payloads MUST be sanitized and redacted before storage, eliminating plain card numbers, account balances, and personal counterparty names.
- Strict payload limits (maximum 5KB) and rate limiters MUST guard ingestion endpoints to prevent resource exhaustion and abuse.

### IV. Concurrency-Safe Idempotency & Dual-Message Provenance
All ingestion pipelines MUST tolerate unordered arrivals, network retries, duplicate deliveries, and race conditions without creating duplicate records or state drift.
- Messages arriving in any order (outgoing-first, incoming-first, or near-simultaneous) within the configurable pairing window (`SMS_TRANSFER_PAIRING_WINDOW_SECONDS = 45`) MUST pair deterministically.
- Idempotency MUST be enforced through SHA-256 message hashing and a deterministic, sorted-hash pair idempotency key (`sha256(minHash:maxHash)`).
- Webhook retries or repeated deliveries MUST return the existing final transaction state without creating duplicate expense, income, or transfer records.
- Reconciled transfer records MUST preserve dual provenance (both original SMS hashes, parsed directions, normalized references, and receipt timestamps).

### V. High Performance, ReDoS Immunity & Offline-First Harmony
System architecture MUST deliver sub-50ms parser execution while maintaining full compatibility with Finova's offline-first PWA ecosystem.
- All regular expressions used in SMS parsing MUST be linear and thoroughly audited against Regular Expression Denial of Service (ReDoS / Catastrophic Backtracking).
- Database operations MUST utilize selective compound and partial indexes (`{ user: 1, smsHash: 1 }`, `{ user: 1, idempotencyKey: 1 }`) to eliminate full table scans.
- Background sync, IndexedDB (`Dexie`), and Service Worker caching (`Workbox`) MUST integrate seamlessly with server-side transactions without schema mismatches or sync deadlocks.

## Financial Ingestion & Security Hardening Standards

### 1. Ingestion Threat Modeling & Attack Surface Control
- **Input Validation**: All incoming webhook bodies MUST be parsed with strict type and size constraints. Invalid, malformed, or empty payloads MUST fail fast with standard client error responses.
- **Normalization**: Text normalization (converting Arabic-Indic digits `٠١٢٣٤٥٦٧٨٩` to ASCII `0123456789`, whitespace trimming, reference normalization) MUST occur prior to pattern matching.
- **Error Handling**: Database and parser errors MUST log concise error details server-side per Finova logging guidelines (`[ERROR]`), but MUST NEVER expose stack traces or internal implementation details to webhook clients.

### 2. Pairing & Reconciliation Rules
- A valid self-transfer pair requires ALL of the following criteria:
  1. Both transactions belong to the same authenticated user.
  2. One transaction is outgoing (`expense`) and the other is incoming (`income`).
  3. Both normalized amounts are identical.
  4. Both source and destination accounts are explicitly extracted, resolved, and verified as distinct accounts owned by the same user.
  5. Transaction timestamps fall within the defined window (`SMS_TRANSFER_PAIRING_WINDOW_SECONDS`).
  6. Normalized reference numbers MUST match if present in both messages. If references differ, pairing is strictly rejected.
- A failure of any pairing condition MUST preserve the transaction as an independent income or expense record rather than forcing an invalid transfer.

## Development Workflow, Quality Gates & Testing Mandates

### 1. Test-Driven & Regression-Proof Development
- Every parser extension, regex modification, or reconciliation change MUST be accompanied by comprehensive unit and integration tests.
- An adversarial regression corpus MUST verify negative test cases: transaction IDs, balances, phone numbers, and timestamps MUST NOT be misclassified as account numbers.
- Self-transfer tests MUST cover outgoing-first, incoming-first, simultaneous arrival, boundary window limits (1s, 45s, 46s), duplicate delivery, cross-user isolation, and unmatched counterpart scenarios.

### 2. No "Quick-and-Dirty" Fixes (استسهال ممنوع)
- Workarounds that compromise architecture or financial integrity to achieve quick results are strictly banned.
- All code changes MUST respect existing domain models, service boundaries, and state management conventions.

## Governance

This Constitution represents the supreme architectural and security authority for the Finova platform and its SMS auto-logging pipeline.
- All proposed plans, specs, tasks, pull requests, and implementations MUST strictly adhere to these principles.
- Amendments to this Constitution require explicit documentation, version bumping (following SemVer: MAJOR for breaking governance changes, MINOR for new principles/rules, PATCH for wording clarifications), and formal user approval.
- Code reviews MUST verify compliance with each principle prior to integration.

**Version**: 1.0.0 | **Ratified**: 2026-09-18 | **Last Amended**: 2026-09-18
