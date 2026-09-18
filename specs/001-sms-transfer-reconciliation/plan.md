# Implementation Plan: SMS Account Detection Recovery & IPN Self-Transfer Recognition

**Branch**: `001-sms-transfer-reconciliation` | **Date**: 2026-09-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-sms-transfer-reconciliation/spec.md`

## Summary

Resolve SMS account detection regressions for Arabic and English bank notifications, and implement an atomic, ACID-compliant reconciliation engine for IPN self-transfers. The system will detect when outgoing and incoming messages represent an internal fund movement between user-owned accounts within a 45-second window, consolidating them into a single `transfer` transaction, reversing temporary expense/income analytics, and enforcing strict idempotency and zero-guessing account resolution.

## Technical Context

**Language/Version**: Node.js (v18+) / CommonJS backend, React 19 / ES Modules frontend  
**Primary Dependencies**: Express 4.x, Mongoose 8.x / MongoDB Driver, Node `crypto` (SHA-256), `express-rate-limit`  
**Storage**: MongoDB (Mongoose collections: `Transaction`, `Account`, `User`, `Budget`, `UserAnalytics`)  
**Testing**: Node.js automated test runner scripts (`test-sms-regression.js`, `test-sms-transfer-integration.js`)  
**Target Platform**: Node.js Linux server (Render) & Webhook integration from iOS Shortcuts / mobile automations  
**Project Type**: Full-stack Web Application (Backend Node/Express API + Frontend React PWA)  
**Performance Goals**: SMS text normalization and parsing < 50ms; transfer reconciliation < 200ms  
**Constraints**: 100% financial balance integrity, zero external AI/LLMs/APIs, strict multi-tenancy (`user: userId`), ReDoS immunity, ACID MongoDB transaction with retry  
**Scale/Scope**: Configurable pairing window (`SMS_TRANSFER_PAIRING_WINDOW_SECONDS = 45`), dual SMS provenance, zero cross-user account matching  

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle I (100% Financial Integrity & Atomic Reconciled Invariance)**: Self-transfers consolidate into exactly one `transfer` transaction. Temporary expense/income deltas and budget spent increments are rolled back atomically in a retried MongoDB transaction (`session.withTransaction`).
- [x] **Principle II (Deterministic, Non-AI Ingestion & Zero-Guessing Account Resolution)**: No external LLMs or third-party APIs used. Explicit context extraction only (`from 0694 on`, `إلى حسابكم 4113`). Ambiguous or missing accounts remain `null`. Never guess accounts from defaults, only-account fallbacks, or merchants.
- [x] **Principle III (Security-First Architecture & Strict Multi-Tenant Isolation)**: All DB queries strictly enforce `{ user: userId }`. Tokens hashed with SHA-256. Raw SMS redacted for PII. 5KB request body limit and rate limiting enforced.
- [x] **Principle IV (Concurrency-Safe Idempotency & Dual-Message Provenance)**: Outgoing-first, incoming-first, and near-simultaneous arrivals handled safely. Pair idempotency key `sha256(minHash:maxHash)` prevents duplicate transfers. Replay checks both `smsHash` and `smsProvenance.smsHash`.
- [x] **Principle V (High Performance, ReDoS Immunity & Offline-First Harmony)**: Regular expressions verified linear and ReDoS-free. Compound indexes on `{ user: 1, smsHash: 1 }` and `{ user: 1, 'smsProvenance.smsHash': 1 }`. Seamless compatibility with Dexie/Workbox.

## Project Structure

### Documentation (this feature)

```text
specs/001-sms-transfer-reconciliation/
├── plan.md              # This implementation plan
├── research.md          # Phase 0: Design decisions, regex rules, concurrency architecture
├── data-model.md        # Phase 1: Entity models, schema updates, state transitions
├── quickstart.md        # Phase 1: Runnable integration test matrix
└── contracts/           # Phase 1: API & service contracts
    ├── webhook-contract.md
    └── reconciliation-service-contract.md
```

### Source Code Impact (repository root)

```text
backend/
├── models/
│   └── Transaction.js                        # [MODIFY] Add smsProvenance, smsDirection, and indexes
├── services/
│   ├── smsParser.js                          # [MODIFY] Arabic-Indic normalization, explicit patterns, directions
│   ├── accountResolver.js                    # [NEW] Isolated deterministic account matching scoped to user
│   └── transferReconciliationService.js      # [NEW] ACID transfer pairing, 10 rules, rollback deltas
├── controllers/
│   └── smsWebhookController.js               # [MODIFY] Use accountResolver, check provenance deduplication, trigger reconciliation
└── test-sms-regression.js                    # [MODIFY] Add new patterns and adversarial tests
└── test-sms-transfer-integration.js           # [NEW] End-to-end integration tests for self-transfers
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| None | N/A | Fully aligned with all Constitution v1.0.0 principles and existing codebase conventions |
