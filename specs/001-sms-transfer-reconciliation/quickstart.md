# Quickstart Validation Guide: SMS Transfer Reconciliation

**Feature**: `001-sms-transfer-reconciliation`  
**Date**: 2026-09-18  

---

## Prerequisites

1. Node.js (v18+) installed.
2. Local MongoDB instance running or `MONGODB_URI` pointing to a test database.
3. Dependencies installed in `backend/` (`npm install`).

---

## Validation Scenarios

### Scenario 1: Run Parser & Regression Suite
Verify that all existing bank SMS patterns continue to pass and new patterns (`0694`, `إلى حسابكم 4113`, Arabic-Indic numerals) parse accurately.

```bash
cd backend
node test-sms-regression.js
```

**Expected Outcome**:
- All test cases pass with `[PASS]`.
- Arabic-Indic digits normalize without error.
- Reference numbers and balances are not extracted as card numbers.

---

### Scenario 2: End-to-End Self-Transfer Verification Script
A dedicated test suite validating the complete lifecycle of IPN self-transfers.

```bash
cd backend
node test-sms-transfer-integration.js
```

**Test Matrix executed by the script**:
1. **Outgoing-First Order**:
   - Outgoing SMS (Account `0694`, 350 EGP, Ref `43f3ef2a`) sent at $t=0$.
   - Incoming SMS (Account `4113`, 350 EGP, Ref `43f3ef2a`) sent at $t=5s$.
   - **Verification**: Exactly 1 transaction exists with `type: 'transfer'`, `from_account: 0694`, `to_account: 4113`, amount `350`.
2. **Incoming-First Order**:
   - Incoming SMS sent first, followed by Outgoing SMS within 10s.
   - **Verification**: Reconciles to identical transfer.
3. **Window Exceeded (> 45 seconds)**:
   - Outgoing SMS sent at $t=0$.
   - Incoming SMS sent at $t=50s$.
   - **Verification**: Both records remain independent (`1 expense` and `1 income`).
4. **Mismatched Reference Numbers**:
   - Outgoing SMS (Ref `1111aaaa`), Incoming SMS (Ref `2222bbbb`).
   - **Verification**: Pairing rejected; both remain independent.
5. **Duplicate / Replay Deliveries**:
   - Re-send outgoing SMS; re-send incoming SMS.
   - **Verification**: Deduplicated (`200 OK`), transfer remains singular.
6. **Cross-Tenant Isolation**:
   - User A sends outgoing SMS; User B receives incoming SMS.
   - **Verification**: No pairing occurs across tenants.
