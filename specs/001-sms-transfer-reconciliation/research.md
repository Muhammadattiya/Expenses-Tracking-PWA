# Research: SMS Account Detection Recovery & IPN Self-Transfer Recognition

**Feature**: `001-sms-transfer-reconciliation`  
**Date**: 2026-09-18  
**Status**: Completed  

---

## 1. SMS Text Normalization & Explicit Account Extraction

### Context
Bank SMS notifications in Egypt arrive in English or Arabic, and frequently use Arabic-Indic numerals (`٠١٢٣٤٥٦٧٨٩`) or non-standard spacing. Previous extraction heuristics suffered from regressions where account numbers were either missed (e.g., Arabic `إلى حسابكم 4113`) or conflated with reference numbers, phone numbers, or balances.

### Decision
1. **Pre-normalization pipeline**:
   - Convert all Arabic-Indic numerals (`٠`–`٩`) to standard ASCII digits (`0`–`9`).
   - Clean non-breaking spaces, zero-width joiners, and normalize whitespace.
   - Preserve the un-normalized message for redacted audit storage (`rawSms`).
2. **Strict contextual regex patterns**:
   - English patterns:
     - `/(?:from|on)\s+(\d{4})\s+on/i` (e.g., `from 0694 on 18/09`, `on 0694 on 24/08`)
     - `/(?:account|card)\s+(?:no\.?|number)?\s*ending\s+(?:in|with)\s+(\d{4})/i`
     - `/(?:card|account)\s+\*{2,}(\d{4})/i`
   - Arabic patterns:
     - `/(?:إلى|الى)\s+حسابكم\s+(\d{4})/i` (e.g., `إلى حسابكم 4113 بمبلغ`)
     - `/(?:من|إلى)\s+حسابك\s+(?:رقم\s+)?(\d{4,16})/i` (taking final 4 digits)
     - `/حساب\s+رقم\s*(?:xxx|\*{2,})?(\d{4})/i`
     - `/بطاقة\s*(?:[^\d]{0,30}?)\s*رقم\s*(?:xxx|\*{2,})?(\d{4})/i`
3. **Negative lookaheads and boundary safety**:
   - Explicitly reject candidate digits preceded or followed by reference indicators (`Ref#`, `رقم مرجعي`, `مرجع التاجر`, `رقم العملية`), phone indicators (`010`, `011`, `012`, `015`), or balance indicators (`المتاح`, `الرصيد`, `bal.`).
   - Ensure all regular expressions are strictly linear to guarantee **ReDoS immunity** (zero nested quantifiers like `(a+)+`).

### Alternatives Considered
- *Probabilistic NER or LLM parser*: Rejected per Constitution Principle II and Hard Constraints. External AI is forbidden, introduces latency and cost, and violates deterministic financial integrity.
- *Fuzzy matching on merchant or category*: Rejected per Constitution Principle II. An account must NEVER be guessed from the merchant or transaction type.

---

## 2. Dedicated Account Resolver Service

### Context
Previously, account matching resided directly in `smsWebhookController.js`. It queried `Account.findOne({ user: user._id, cardLast4: parsedData.cardLast4 })`. If the user had multiple accounts or if the last 4 digits were ambiguous, it could produce arbitrary selections or fallbacks.

### Decision
Create a dedicated resolver module `backend/services/accountResolver.js`:
1. Signature: `resolveUserAccount(userId, accountLast4, session = null)`
2. Query strictly scoped to `{ user: userId, cardLast4: accountLast4, isArchived: { $ne: true } }`.
3. If exactly 1 active account matches: return the account document.
4. If 0 accounts match: return `null`.
5. If >1 active accounts match with the same `cardLast4`: return `null` (treat as ambiguous; do not guess).
6. Never fallback to `isDefault: true` or the user's only registered account when `accountLast4` is missing or invalid.

### Alternatives Considered
- *Default to primary account*: Rejected. Misattributing bank transactions to an arbitrary account corrupts accounting reconciliations.

---

## 3. Direction, Metadata & Timestamp Extraction

### Context
A self-transfer pair requires knowing whether a message represents funds leaving an account (`outgoing`) or funds entering an account (`incoming`). The pairing window is bounded by 45 seconds (`SMS_TRANSFER_PAIRING_WINDOW_SECONDS = 45`).

### Decision
1. **Direction mapping**:
   - `outgoing`: Debits, POS purchases, IPN transfer sent, Vodafone Cash sent (`type: 'expense'`).
   - `incoming`: Credits, IPN transfer received, salary additions, refunds (`type: 'income'`).
2. **Reference number normalization**:
   - Extract reference strings (e.g., `43f3ef2a`, `509818302771`), strip punctuation, convert to lowercase.
3. **Timestamp extraction**:
   - Parse exact bank datetime when complete components exist (e.g., `18/09 at 07:32 AM` or `9/18/26 في 07:32`).
   - Fall back to webhook arrival time (`new Date()`).
4. **Configurable pairing window**:
   - Defined in domain config: `const SMS_TRANSFER_PAIRING_WINDOW_SECONDS = 45;`.

---

## 4. Transfer Reconciliation Engine & ACID Concurrency

### Context
An IPN self-transfer sends two messages: an outgoing SMS and an incoming SMS. They can arrive:
- Outgoing first, incoming second (e.g. 5 seconds apart).
- Incoming first, outgoing second.
- Near-simultaneously (two requests hitting the server within milliseconds).
- Webhook retried by mobile client on network failure.

### Decision
Create `backend/services/transferReconciliationService.js`:
1. **Reconciliation lifecycle**:
   - When an SMS arrives and is saved as a temporary record (either `expense` or `income`), the reconciliation service immediately checks for an eligible counterpart.
   - Candidate search query:
     ```javascript
     {
       user: userId,
       source: 'sms_shortcut',
       type: currentTx.type === 'expense' ? 'income' : 'expense',
       amount: currentTx.amount,
       _id: { $ne: currentTx._id },
       createdAt: {
         $gte: new Date(Date.now() - SMS_TRANSFER_PAIRING_WINDOW_SECONDS * 1000),
         $lte: new Date(Date.now() + SMS_TRANSFER_PAIRING_WINDOW_SECONDS * 1000)
       }
     }
     ```
2. **Strict Validation Criteria (All 10 MUST pass)**:
   - Rule 1: Both belong to the same authenticated `user`.
   - Rule 2: One is `outgoing` and one is `incoming`.
   - Rule 3: `amount` matches exactly.
   - Rule 4: Both source and destination accounts are explicitly resolved (neither is `null`).
   - Rule 5: Source account `_id` != Destination account `_id`.
   - Rule 6: Both accounts owned by authenticated user.
   - Rule 7: Messages are within `SMS_TRANSFER_PAIRING_WINDOW_SECONDS` (45s).
   - Rule 8: If both messages have reference numbers, references must match exactly after normalization.
   - Rule 9: If neither has a reference, pair only if rules 1–7 are strongly verified.
   - Rule 10: If references differ, pairing is strictly rejected.
3. **ACID Transaction & Concurrency Lock**:
   - All state changes execute within `withRetry(async () => { session.withTransaction(...) })`.
   - Derive a deterministic pair idempotency key:
     `pairKey = sha256([min(hashA, hashB), max(hashA, hashB)].join(':'))`.
   - If a transaction with `pairKey` already exists, return the existing transfer.
   - Atomically:
     - Update the primary transaction to `type: 'transfer'`, set `from_account`, `to_account`, `referenceNumber`, `idempotencyKey: pairKey`, and `smsProvenance: [hashOutMeta, hashInMeta]`.
     - Delete the counterpart temporary transaction from `Transaction`.
     - Roll back temporary analytics: call `applyTransactionDelta(userId, counterpartTx, -1)`.
     - Roll back temporary budget: if counterpart was an expense, call `updateBudgetIncrementally(userId, counterpartTx, -1, session)`.
     - Apply transfer analytics delta: call `applyTransactionDelta(userId, reconciledTransferTx, 1)`.

### Alternatives Considered
- *Two-phase async background worker (node-cron)*: Rejected. Instant reconciliation is required so the user's mobile screen and push notification reflect the true transfer immediately without a 1-minute delay.
- *Leaving both transactions and adding a hidden link*: Rejected. Distorts cash flow, doubles transactions on exports/sync, and violates Constitution Principle I.

---

## 5. Idempotency, Duplicate Replay & Data Provenance

### Context
Mobile automations can retry HTTP requests if a cell tower handover occurs mid-request.

### Decision
1. Retain legacy `smsHash` on `Transaction` with unique index `{ user: 1, smsHash: 1 }`.
2. When a transfer is reconciled, store both SMS hashes in an array `smsProvenance: [{ smsHash, direction, reference, timestamp }]`.
3. Add a partial multi-key index on `{ user: 1, 'smsProvenance.smsHash': 1 }`.
4. In `smsWebhookController`:
   - Compute `smsHash = sha256(smsText)`.
   - Check if an existing transaction matches `smsHash: smsHash` OR `'smsProvenance.smsHash': smsHash`.
   - If found, immediately return `200 OK` with the existing transaction and message `'Transaction already exists (deduplicated)'`.
