# SMS Account Detection Recovery & Non-Destructive Self-Transfer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-implement SMS account detection with 100% multi-tenant user isolation and introduce a non-destructive holding queue for IPN self-transfers that creates exactly one transfer transaction with zero database deletions.

**Architecture:** An enhanced linear regex parser normalizes Arabic/English SMS, extracts card/account last-4 identifiers (and wallet phone suffixes), strictly prevents false positives from transaction references or bank hotlines, and flags transfer candidates. A dedicated resolver guarantees multi-user tenant isolation. A stateful holding queue delays execution for candidate transfers up to 45 seconds to reconcile pairs into a single Transfer transaction with zero deletions.

**Tech Stack:** Node.js, Express, MongoDB (Mongoose), Jest / Node test runner.

**Spec:** `specs/001-sms-transfer-reconciliation/spec.md`

## Global Constraints
- **ABSOLUTE ZERO-DELETION MANDATE**: No code (controllers, services, or test scripts) may execute `deleteOne`, `deleteMany`, `findByIdAndDelete`, `findOneAndDelete`, `dropDatabase`, or any destructive database operations.
- **Strict Multi-Tenant Isolation**: Every database query and memory buffer MUST enforce `{ user: userId }`.
- **Zero-Guessing**: If an account cannot be resolved with certainty from explicit digits, it must remain `null`.

---

### Task 1: Fix Parser Regressions & Enhance Account Detection in `smsParser.js`

**Files:**
- Modify: `backend/services/smsParser.js`
- Test: `backend/test-sms-parser-full.js`

**Interfaces:**
- Consumes: Raw SMS text string.
- Produces: `parseSms(smsText)` returning `{ amount, type, direction, cardLast4, accountLast4, merchant, referenceNumber, isTransferCandidate, eventTimestamp, rawSms, confidence }`.

- [ ] **Step 1: Update `test-sms-parser-full.js` with all 28 test cases including transfer pair**

Ensure the test suite includes:
- Example 14: Banque Misr with Arabic comma `***6614،` -> `cardLast4: '6614'`
- Example 21: Vodafone Cash received on `على رقم محفظتك 01020441385` -> `cardLast4: '1385'`
- Example 26: QNB Alahli `المنتهى بـ 1122` (alif maqsura `ى`) -> `cardLast4: '1122'`
- Transfer Out: `from 0694 on 18/09` -> `cardLast4: '0694'`, `isTransferCandidate: true`
- Transfer In: `إلى حسابكم 4113` -> `cardLast4: '4113'`, `isTransferCandidate: true`
- Negative Cases: ensure hotline numbers (19700, 19623, 19951, 16990) and transaction references are NEVER matched as `cardLast4`.

- [ ] **Step 2: Run test to observe current failures**

Run: `node test-sms-parser-full.js`
Expected: FAIL on Example 21 and Example 26.

- [ ] **Step 3: Implement fixes in `backend/services/smsParser.js`**

1. Expand punctuation boundaries in `extractCardLast4` to include Arabic comma `،` (`\u060C`), colons, semicolons, and parentheses:
   `const BOUNDARY = '(?=[\\s.,:;()[\\]{}،\\u060C\\-]|$|[^\\d])';`
2. Update `المنتهية بـ` to support alif maqsura `ى`:
   `/(?:المنتهي[ةى]?|منتهي[ةى]?)\s*بـ?\s*(\d{4,16})/i`
3. Add wallet phone suffix extraction:
   `/(?:على\s+)?رقم\s+محفظتك\s+(\d{11})/i` -> slice(-4)
4. Update `vf_cash_received_ar` pattern to extract `cardLast4` from `على رقم محفظتك 01020441385`.
5. Add `isTransferCandidate: boolean` to the returned parsed object for all IPN transfer sent/received patterns.

- [ ] **Step 4: Run parser unit tests to verify all 28 pass**

Run: `node test-sms-parser-full.js`
Expected: ALL TESTS PASSED SUCCESSFULLY!

---

### Task 2: Multi-Tenant Account Resolver Isolation & Verification

**Files:**
- Verify/Modify: `backend/services/accountResolver.js`
- Test: `backend/test-account-resolver-mock.js` (NEW unit test with zero DB deletions)

**Interfaces:**
- Consumes: `resolveUserAccount(userId, accountLast4, session = null)`
- Produces: Mongoose Account document or `null`.

- [ ] **Step 1: Create mock unit test `backend/test-account-resolver-mock.js`**

Write a unit test that mocks `Account.find` (or uses an in-memory stub) to verify:
1. User A and User B each have an account with `cardLast4: '1984'`.
2. Calling `resolveUserAccount(userAId, '1984')` returns User A's account, never User B's.
3. Calling `resolveUserAccount(userBId, '1984')` returns User B's account, never User A's.
4. Calling `resolveUserAccount(userAId, '9999')` returns `null`.
5. User A having two accounts with `1984` returns `null` (zero-guessing).
6. Verify no calls to any destructive methods (`delete`, `remove`).

- [ ] **Step 2: Run test to verify behavior**

Run: `node test-account-resolver-mock.js`
Expected: PASS with 100% tenant isolation.

---

### Task 3: Non-Destructive Transfer Holding Queue & Delayed Reconciliation

**Files:**
- Modify: `backend/services/transferReconciliationService.js`
- Test: `backend/test-transfer-holding-mock.js` (NEW unit test with mock timers and zero DB mutations)

**Interfaces:**
- Consumes:
  - `handleIncomingSmsForTransfer({ user, parsedData, accountId, smsText, smsHash, onFinalizeSingle })`
- Produces:
  - `{ status: 'held', message: '...' }` if waiting for counterpart.
  - `{ status: 'reconciled', transaction: transferTx }` if paired into 1 Transfer transaction with zero deletions.

- [ ] **Step 1: Write test `backend/test-transfer-holding-mock.js`**

Test scenarios:
1. Outgoing transfer candidate arrives -> placed in holding queue.
2. Incoming transfer candidate arrives 5 seconds later with same amount and ref -> immediately reconciled into 1 Transfer transaction (`from_account`, `to_account`, `amount`, `type: 'transfer'`). Counterpart timer canceled.
3. Verify zero `deleteOne` or `deleteMany` calls are made.
4. Test single transfer candidate arrives -> timer fires at 45 seconds -> `onFinalizeSingle` called to create 1 single transaction.
5. Test cross-user messages with same amount and ref -> NEVER paired across users.

- [ ] **Step 2: Run test to verify it fails before implementation**

Run: `node test-transfer-holding-mock.js`
Expected: FAIL.

- [ ] **Step 3: Implement `transferHoldingQueue` in `transferReconciliationService.js`**

1. Remove any `Transaction.deleteOne` or destructive rollback code.
2. Maintain in-memory Map partitioned strictly by `userId`:
   `const transferHoldingQueue = new Map();`
3. If incoming SMS is a transfer candidate:
   - Check if matching counterpart exists in `transferHoldingQueue.get(String(userId))`.
   - Criteria: opposite direction, exact amount (`Math.abs(a - b) < 0.001`), both accounts resolved and distinct, ref match if present, within 45 seconds.
   - If match found:
     - Clear timeout of counterpart.
     - Remove counterpart from queue.
     - Create single `Transaction` with `type: 'transfer'`, `from_account`, `to_account`.
     - Record `smsProvenance` with both message hashes.
     - Return `{ isReconciled: true, transaction: transferTx }`.
   - If no match found:
     - Add to `transferHoldingQueue.get(String(userId))`.
     - Set timer for `SMS_TRANSFER_PAIRING_WINDOW_SECONDS` (45s).
     - Return `{ isPending: true }`.
     - When timer expires: call `onFinalizeSingle(candidate)` to insert a regular single transaction into the database without any deletions.

- [ ] **Step 4: Run test to verify implementation passes**

Run: `node test-transfer-holding-mock.js`
Expected: PASS.

---

### Task 4: Integrate Webhook Controller (`smsWebhookController.js`)

**Files:**
- Modify: `backend/controllers/smsWebhookController.js`
- Test: `backend/test-webhook-e2e-dryrun.js` (NEW non-destructive dry-run test)

**Interfaces:**
- Consumes: `POST /api/webhook/sms/:userToken`
- Produces: HTTP response `{ message, id, status, isReconciled }`.

- [ ] **Step 1: Wire `handleSmsWebhook` to use the non-destructive holding queue**

1. For regular non-transfer SMS:
   - Create transaction immediately (`Transaction.create`).
   - Apply analytics and budget deltas.
   - Send push notification.
   - Return 200 OK.
2. For transfer candidates (`parsedData.isTransferCandidate`):
   - Check deduplication first (`smsHash`).
   - Call `transferReconciliationService.processTransferCandidate({ user, parsedData, accountId, smsText, smsHash, finalizeCallback })`.
   - If held: return 200 OK (`{ status: 'pending', message: 'Transfer candidate held for counterpart' }`).
   - If reconciled: return 200 OK (`{ status: 'reconciled', id: transferTx._id, isReconciled: true }`).
   - If timeout expires: `finalizeCallback` creates the single transaction, applies deltas, and fires notification with ZERO deletions.

- [ ] **Step 2: Run e2e dry-run test (with mocked Mongoose or isolated test IDs, ZERO deletions)**

Run: `node test-webhook-e2e-dryrun.js`
Expected: PASS.

---

### Task 5: Final Verification & Audit

- [ ] **Step 1: Run full parser test suite**

Run: `node test-sms-parser-full.js`
Expected: 28/28 tests passing.

- [ ] **Step 2: Search entire codebase to guarantee zero `deleteOne` or `deleteMany` in any new/modified files**

Ensure no destructive calls exist in `smsParser.js`, `accountResolver.js`, `transferReconciliationService.js`, `smsWebhookController.js`, or any new test scripts.
