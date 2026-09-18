# Feature Specification: SMS Account Detection Recovery & IPN Self-Transfer Recognition

**Feature Branch**: `001-sms-transfer-reconciliation`

**Created**: 2026-09-18

**Status**: Draft

**Input**: User description: "Read SMS_AUTO_LOGGING_IMPLEMENTATION_PLAN.md"

## Clarifications

### Session 2026-09-18
- Q: How should the system handle self-transfer pairing when one SMS message contains a reference number but the counterpart message does not? → A: Allow pairing if one reference is absent, but strictly reject if both are present and mismatch (provided all other strong criteria: opposite directions, identical amount, explicit distinct user-owned accounts, and within 45 seconds are satisfied).
- Q: What push notification should be sent to the user when a counterpart SMS arrives and triggers a self-transfer reconciliation? → A: Send an explicit self-transfer reconciliation push notification (e.g., "تم رصد تحويل ذاتي بمبلغ ... ج.م بين حساباتك") confirming that funds moved internally between the user's accounts without affecting net income or expense metrics.
- Q: How should the title of the reconciled self-transfer transaction be formatted in the transaction list? → A: Use a standardized title indicating an internal self-transfer (e.g., "تحويل ذاتي (IPN)" / "Self-Transfer (IPN)") governed by the user's language preference, letting account badges display the source and destination.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explicit Account Detection & Zero-Guessing Resolution (Priority: P1)

As a Finova user tracking expenses automatically via SMS alerts, I want bank messages in English and Arabic to reliably identify which of my accounts was affected, without guessing or making false matches, so that my account balances reflect reality.

**Why this priority**: Correct account association is the cornerstone of personal finance tracking. If the account is wrongly resolved or guessed, account balances become untrustworthy, and automated transfer pairing becomes impossible.

**Independent Test**: Can be fully tested by submitting sample bank messages in English and Arabic (containing explicit account patterns such as `from 0694 on` or `إلى حسابكم 4113`) and verifying that the exact user-owned account is linked, while ambiguous numbers (balances, phone numbers, reference IDs) are never misidentified as accounts.

**Acceptance Scenarios**:

1. **Given** a registered user with an account ending in `0694`, **When** an English IPN SMS arrives containing `from 0694 on 18/09`, **Then** the transaction is associated with the user's account ending in `0694`.
2. **Given** a registered user with an account ending in `4113`, **When** an Arabic SMS arrives containing `إلى حسابكم 4113 بمبلغ 350.00 جم` with Arabic-Indic numerals, **Then** the digits are normalized and associated with the user's account ending in `4113`.
3. **Given** an SMS containing an account number belonging to another user, **When** processed for the current user, **Then** the account is not matched and remains unassigned (`null`).
4. **Given** an SMS that contains a transaction reference, balance, or phone number but no explicit account identifier, **When** processed, **Then** the system does not guess any default or existing account and sets the account to unassigned (`null`).

---

### User Story 2 - Instant Self-Transfer Detection & Atomic Reconciliation (Priority: P1)

As a user transferring money between two of my own bank accounts using the Instant Payment Network (IPN / InstaPay), I want Finova to recognize the outgoing SMS from Bank A and incoming SMS from Bank B as a single internal transfer, so that my monthly income and expense metrics are not falsely inflated.

**Why this priority**: Self-transfers represent internal movement of existing money. Logging them as separate expense and income transactions distorts cash flow, inflates budget spending, and breaks financial reports.

**Independent Test**: Can be tested by sending an outgoing SMS from Account A followed by an incoming SMS to Account B for the same amount within 45 seconds, verifying that the two transactions are consolidated into exactly one transfer transaction from Account A to Account B with zero net effect on overall balance.

**Acceptance Scenarios**:

1. **Given** an outgoing SMS from Account `0694` for `350.00 EGP` with reference `43f3ef2a`, **When** followed within 45 seconds by an incoming SMS to Account `4113` for `350.00 EGP` with matching reference `43f3ef2a`, **Then** the two records are atomically converted into a single transfer from `0694` to `4113`.
2. **Given** an incoming SMS arriving first, **When** followed within 45 seconds by the matching outgoing SMS, **Then** the system reconciles the pair into the exact same transfer from the source to the destination account.
3. **Given** a successfully reconciled self-transfer, **Then** any temporary expense or income entries for the pair are removed, category budget deductions are reversed, and account transfer totals are updated.
4. **Given** an initial SMS transaction that triggered a notification, **When** reconciled with an incoming/outgoing counterpart, **Then** an explicit self-transfer reconciliation push notification is sent to the user confirming the internal transfer between the two accounts.

---

### User Story 3 - Concurrency, Retry & Replay Idempotency (Priority: P2)

As a user whose phone automation might experience network retries, delays, or duplicate SMS deliveries, I want the system to handle duplicate or replayed webhook calls safely, so that duplicate transactions are never created.

**Why this priority**: Automated webhooks often retry upon transient network interruptions. Duplicate deliveries must never cause financial ledger corruption or create phantom transfers.

**Independent Test**: Can be tested by sending the exact same SMS message multiple times, or replaying both messages of a paired transfer, and verifying that the final transaction state is returned each time without creating additional records.

**Acceptance Scenarios**:

1. **Given** an SMS message that has already been recorded, **When** the same message is delivered again, **Then** the system recognizes the duplicate and returns the existing transaction without changes.
2. **Given** a self-transfer pair that has already been reconciled, **When** either or both counterpart SMS messages are replayed, **Then** the existing reconciled transfer is returned with no new records created.
3. **Given** two counterpart messages arriving almost simultaneously, **When** processed concurrently, **Then** exactly one reconciled transfer is produced and no duplicate or half-completed records remain.

---

### User Story 4 - Independent Transaction & Unpaired Fallback Preservation (Priority: P3)

As a user sending money to an external person or paying a merchant, I want legitimate one-sided transactions to remain normal expenses or income without being falsely paired as transfers.

**Why this priority**: The system must only pair true self-transfers. Normal payments, purchases, and peer-to-peer transfers must be safely preserved.

**Independent Test**: Can be tested by sending an outgoing payment to a merchant or third party where no matching counterpart arrives within the 45-second window, verifying it remains a standard expense.

**Acceptance Scenarios**:

1. **Given** an outgoing SMS payment to an external person, **When** no incoming counterpart arrives within 45 seconds, **Then** the transaction remains an independent expense.
2. **Given** an outgoing and incoming transaction with identical amounts but different reference numbers, **When** evaluated, **Then** they are rejected from pairing and remain independent transactions.
3. **Given** two transactions with identical amounts and matching references, but where the source and destination account are the same, **When** evaluated, **Then** pairing is rejected.

---

### Edge Cases

- **Delayed Counterpart**: An incoming SMS arrives 46 seconds after the outgoing SMS (exceeding the 45-second window). The transactions remain two independent transactions (expense and income).
- **Unresolved Accounts**: An incoming and outgoing SMS share the exact same amount and reference, but the account on one or both sides could not be resolved from the SMS text. Pairing is not performed; both remain independent entries to prevent attributing funds to guessed accounts.
- **Reference Number Absent on Both**: Both messages have matching amounts, opposite directions, verified distinct owned accounts, and arrive within 45 seconds, but neither bank included a reference number. Pairing is permitted because all other verified criteria are met.
- **Asymmetric Reference Presence**: One message contains a reference number but the counterpart bank notification omits it. Pairing is permitted provided all other strong criteria (opposite directions, identical amount, distinct user-owned accounts, within 45 seconds) are satisfied.
- **Mismatched References**: Both messages arrive within the time window for the same amount, but carry different non-empty transaction reference numbers. Pairing is strictly forbidden.
- **Cross-User Collision**: User A and User B execute transactions with the same amount and reference number at the same moment. Each user's transactions and accounts remain strictly isolated to their own account; no cross-pairing occurs.
- **Arabic-Indic Numerals**: An SMS message contains numbers formatted as `٠١٢٣٤٥٦٧٨٩` in the amount, account digits, or timestamp. The system normalizes these to standard digits before matching.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST normalize all incoming message text, converting Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`) to standard digits (`0123456789`) and standardizing whitespace prior to information extraction.
- **FR-002**: The system MUST extract account and card identifiers only from explicit, unambiguous contextual patterns (such as `from <digits> on`, `on <digits> on`, `ending in <digits>`, `إلى حسابكم <digits>`, `من حسابك`, `بطاقة ... رقم <digits>`).
- **FR-003**: The system MUST NOT extract account identifiers from reference numbers, transaction IDs, one-time passcodes (OTPs), phone numbers, available balances, dates, or arbitrary numbers.
- **FR-004**: The system MUST resolve extracted account identifiers solely against the authenticated user's configured accounts. If no unambiguous match is found, the account field MUST remain unassigned (`null`).
- **FR-005**: The system MUST NEVER guess or default to an account based on a user's default account, only-account fallback, merchant name, category, or transaction type.
- **FR-006**: The system MUST extract transaction direction (`outgoing` for debits/expenses or `incoming` for credits/deposits), monetary amount, reference number (when present), and event timestamp.
- **FR-007**: The system MUST enforce a configurable self-transfer pairing time window with a default of 45 seconds (`SMS_TRANSFER_PAIRING_WINDOW_SECONDS = 45`).
- **FR-008**: The system MUST evaluate eligible counterpart transactions for self-transfer pairing requiring that:
  - Both transactions belong to the same user.
  - One transaction is outgoing and one is incoming.
  - Both amounts are equal.
  - Both source and destination accounts are explicitly extracted and resolved.
  - The source and destination accounts are different from each other and both owned by the user.
  - The transactions fall within the pairing time window.
  - Reference numbers match exactly if present on both messages, or at least one message lacks a reference number while all other criteria are satisfied.
- **FR-009**: The system MUST reject self-transfer pairing if reference numbers are present on both messages and do not match. If one message lacks a reference number, pairing is permitted provided all other strong criteria (opposite directions, identical amount, distinct user-owned accounts, within 45 seconds) are satisfied.
- **FR-010**: The system MUST atomically reconcile valid paired messages into exactly one `transfer` transaction with a standardized self-transfer title (e.g., "تحويل ذاتي (IPN)" / "Self-Transfer (IPN)") and the designated source (`from_account`) and destination (`to_account`) accounts.
- **FR-011**: The system MUST eliminate the superseded temporary expense or income transaction upon reconciliation, ensuring all temporary budget deductions and income/expense metrics are rolled back.
- **FR-012**: The system MUST preserve dual-message provenance on the reconciled transfer, retaining both original message hashes, parsed directions, normalized reference, and receipt timestamps.
- **FR-013**: The system MUST enforce idempotency: duplicate deliveries or replays of either or both counterpart messages MUST return the existing transaction state without creating duplicate records.
- **FR-014**: If no counterpart arrives within the pairing window or pairing criteria fail, the system MUST preserve the transaction as an independent income or expense record.
- **FR-015**: Upon successful reconciliation of a self-transfer, the system MUST dispatch an explicit push notification confirming the internal transfer between the resolved source and destination accounts, preventing misleading separate income/expense alerts.

### Key Entities

- **SMS Transaction Record**: Represents a financial transaction ingested from an automated message, containing amount, type (`expense`, `income`, or `transfer`), direction (`outgoing` or `incoming`), resolved account, category, reference number, sanitized message text, and unique message hash.
- **Reconciled Transfer Record**: A unified transaction record of type `transfer` containing source account (`from_account`), destination account (`to_account`), transfer amount, reference number, and dual-message provenance metadata linking both original SMS hashes.
- **User Account**: Represents a user's financial account (e.g., bank account or wallet) containing an explicit 4-digit identifier (`cardLast4`) used for deterministic matching.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100% Transfer Reconciliation Accuracy**: All eligible self-transfer message pairs arriving within the 45-second window are consolidated into a single transfer record, leaving zero phantom income or expense records.
- **SC-002**: **100% Financial Ledger Balance**: Overall net balance impact of self-transfers is exactly zero, with source and destination account balances adjusted correctly.
- **SC-003**: **Zero False-Positive Account Matches**: When no explicit account identifier is present in an SMS, 100% of transactions remain unassigned (`null`) rather than guessed.
- **SC-004**: **Zero Cross-Tenant Leakage**: Under all operating conditions, 0% of accounts or transactions are paired or matched across different users.
- **SC-005**: **Zero Duplicate Transactions**: 100% of replayed or duplicate webhook submissions return the existing transaction without creating duplicate database entries.
- **SC-006**: **Sub-50ms Parsing Performance**: SMS text normalization, regex extraction, and account resolution execute in under 50 milliseconds per message.

## Assumptions

- Messages are forwarded via HTTPS webhook by client-side automations (e.g., iOS Shortcuts or Android automation apps).
- The user has configured accounts in Finova with matching 4-digit identifiers (`cardLast4`).
- Bank SMS timestamps or webhook receipt timestamps accurately reflect transaction occurrence times within typical mobile network tolerances.
- Ingestion tokens are securely managed and authenticated per user prior to transaction processing.
