# Service Contract: Transfer Reconciliation Engine

**Location**: `backend/services/transferReconciliationService.js`  
**Internal Module**: CommonJS Module  

---

## 1. Primary Method: `attemptTransferReconciliation`

```typescript
interface ReconciliationInput {
  userId: string | mongoose.Types.ObjectId;
  currentTransaction: TransactionDocument;
  parsedSms: ParsedSmsResult;
  smsHash: string;
}

interface ReconciliationResult {
  isReconciled: boolean;
  transaction: TransactionDocument; // Either the single transfer, or original transaction
  counterpartId?: mongoose.Types.ObjectId;
}

function attemptTransferReconciliation(
  input: ReconciliationInput
): Promise<ReconciliationResult>;
```

### Preconditions
1. `currentTransaction` is persisted in the database.
2. `userId` is the authenticated owner of `currentTransaction`.
3. `parsedSms` contains explicit extracted metadata (`amount`, `direction`, `accountLast4`, `referenceNumber`).

### Execution Invariants
- Executes within `withRetry(async () => { session.withTransaction(...) })`.
- Bounded search window: `SMS_TRANSFER_PAIRING_WINDOW_SECONDS = 45`.
- Atomicity: If any step fails, the entire transaction is aborted and rolled back.
- When pairing is successful:
  - Exactly one transaction is updated to `type: 'transfer'`.
  - The other transaction is deleted from the `Transaction` collection.
  - Analytics and Budget deltas are updated atomically/asynchronously with exact reversal of the superseded counterpart.

---

## 2. Account Resolver: `resolveUserAccount`

**Location**: `backend/services/accountResolver.js`

```typescript
function resolveUserAccount(
  userId: string | mongoose.Types.ObjectId,
  accountLast4: string | null
): Promise<AccountDocument | null>;
```

### Rules
1. If `accountLast4` is falsy, non-string, or does not match `/^\d{4}$/`: returns `null`.
2. Searches `Account` with `{ user: userId, cardLast4: accountLast4, isArchived: { $ne: true } }`.
3. If matches count === 1: returns the matched `Account`.
4. If matches count !== 1 (0 or >1): returns `null`.
5. NEVER queries accounts of other users.
6. NEVER falls back to default or un-verified accounts.
