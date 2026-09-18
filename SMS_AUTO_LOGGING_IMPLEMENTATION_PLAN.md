# Implementation Plan — SMS Account Detection Recovery & IPN Self-Transfer Recognition

## Goal

Fix SMS account detection regression, then detect and reconcile self-transfers represented by separate outgoing and incoming SMS messages.

The implementation must be deterministic, ownership-safe, idempotent, and preserve existing SMS parsing, merchant/category inference, analytics, and sync behavior.

## Hard Constraints

- Do not use any external AI, LLM, machine-learning model, external API, bank API, OCR service, or third-party matching/enrichment service.
- Use only local JavaScript logic, regex/pattern parsing, normalization utilities, existing Finova services, and MongoDB.
- Never guess an account based on default account, only-account fallback, merchant, category, transaction type, or account order.
- Never match accounts belonging to another user.
- Keep `null` when an account cannot be confidently resolved.
- Do not alter existing financial transaction semantics or convert unrelated nearby income/expense transactions into transfers.

## 1. Repair Account Detection

### Parser normalization

Add or centralize SMS normalization before extraction:

- Convert Arabic-Indic digits (`٠١٢٣٤٥٦٧٨٩`) into ASCII digits (`0123456789`).
- Normalize extracted account last-4 and references before use.
- Preserve raw SMS for existing redacted storage behavior.
- Keep existing supported bank patterns and ensure pattern-specific extraction has priority over generic fallback extraction.

### Explicit account/card extraction

Extract an account identifier only from safe, context-specific forms, including:

- English: `from 0694 on`, `on 0694 on`, `account ending in 9596`, `card ****1234`, and account/card number forms.
- Arabic: `إلى حسابكم 4113`, `من حسابك ...`, `حساب رقم xxx6201`, `بطاقة ... رقم 2513`, masked formats, and full account numbers using only their final four digits.

The supplied Arabic message must explicitly support `إلى حسابكم 4113` and produce:

```js
accountLast4: '4113'
```

Do not treat reference numbers, transaction/operation IDs, OTPs, phone numbers, dates/times, bank support numbers, balances, or arbitrary four-digit numbers as account identifiers.

### Account resolver

Extract account matching from `smsWebhookController` into a dedicated internal resolver:

1. Accept extracted normalized `accountLast4` and authenticated `userId`.
2. Query only `Account` records where both `user` and `cardLast4` match.
3. Return the matched account ID only when unambiguous.
4. Return `null` for missing, invalid, unknown, or ambiguous identifiers.
5. Preserve any existing deterministic resolver behavior after explicit last-4 matching.

## 2. Add SMS Transfer Metadata

Extend parser output internally with:

```js
{
  amount,
  type,                 // existing income or expense
  direction,            // 'incoming' or 'outgoing'
  accountLast4,
  referenceNumber,
  eventTimestamp,       // parsed bank timestamp when reliably available
  rawSms,
  confidence
}
```

Use the parsed bank timestamp for transfer pairing when a reliable complete datetime can be constructed. Use webhook receipt time as the fallback.

Create a configurable domain setting:

```js
SMS_TRANSFER_PAIRING_WINDOW_SECONDS = 45
```

Do not hardcode `45` in matching logic.

## 3. Exact IPN Self-Transfer Flow

### Outgoing SMS

Input:

```text
IPN transfer sent with amount of EGP 350.00 from 0694 on 18/09 at 07:32 AM. Ref# 43f3ef2a. For more details call 19700
```

The parser must produce:

```js
{
  direction: 'outgoing',
  type: 'expense', // temporary until reconciliation
  amount: 350.00,
  currency: 'EGP',
  accountLast4: '0694',
  referenceNumber: '43f3ef2a',
  eventTimestamp: parsedOutgoingTime
}
```

Resolve `0694` only against accounts owned by the authenticated webhook user. If no pair exists yet, save it using existing SMS behavior as an independent expense.

### Incoming SMS

Input:

```text
تم إستقبال تحويل لحظي إلى حسابكم 4113 بمبلغ 350.00 جم من MOHAMED AHMED ATIYA ABDELSALAM في 07:32 يوم 9/18/26 رقم المعاملة 43f3ef2a للمزيد أتصل ب 16990
```

The parser must produce:

```js
{
  direction: 'incoming',
  type: 'income', // temporary until reconciliation
  amount: 350.00,
  currency: 'EGP',
  accountLast4: '4113',
  referenceNumber: '43f3ef2a',
  eventTimestamp: parsedIncomingTime
}
```

Resolve `4113` only against accounts owned by the same authenticated user.

## 4. Transfer Reconciliation Service

Create an isolated internal SMS transfer reconciliation service. It runs after a recognized SMS transaction is persisted.

Search only the current user’s recent SMS-originated transactions for one eligible opposite-direction candidate. Convert two SMS transactions into one transfer only when all conditions are true:

1. Both transactions belong to the same user.
2. One is outgoing and one is incoming.
3. Both normalized amounts are equal.
4. Both accounts were explicitly extracted and resolved.
5. The resolved accounts are different.
6. Both accounts are owned by the same authenticated user.
7. The messages are within `SMS_TRANSFER_PAIRING_WINDOW_SECONDS`.
8. If both messages contain references, references must match exactly after normalization.
9. If references are absent, pairing is allowed only when all other strong evidence exists: opposite direction, equal amount, explicit distinct resolved user-owned accounts, and time-window match.
10. Different present references must reject pairing.

Never pair messages based only on opposite directions, amount, and timestamp.

### Final transfer

For a valid pair, atomically reconcile the two temporary transactions into exactly one transaction:

```js
{
  type: 'transfer',
  amount: 350.00,
  from_account: accountEnding0694._id,
  to_account: accountEnding4113._id,
  referenceNumber: '43f3ef2a',
  source: 'sms_shortcut'
}
```

The final state must contain:

- Exactly one `transfer`.
- No remaining outgoing `expense` for the paired SMS.
- No remaining incoming `income` for the paired SMS.
- Correct source account: `0694`.
- Correct destination account: `4113`.
- Correct transfer analytics and balances.
- No income/expense cash-flow effect for the reconciled pair.

If no qualifying counterpart exists, preserve the normal independent SMS expense or income transaction.

Support outgoing-first, incoming-first, near-simultaneous arrival, delayed arrival within 45 seconds, missing counterpart, webhook retries, and duplicate deliveries.

## 5. Idempotency and Storage

Preserve existing `smsHash` duplicate protection and extend it for paired messages.

Store both SMS identities/provenance on the resulting transfer, including:

- Both SMS hashes.
- Parsed directions.
- Normalized reference.
- Resolved account IDs.
- Event/receipt timestamps.
- Stable transfer-pair idempotency key derived from the two sorted SMS hashes.

Before processing an SMS, check both legacy `smsHash` and all SMS hashes retained on reconciled transfer records.

Use a retried MongoDB transaction for locating the candidate, validating pair conditions, converting one transaction to `transfer`, preserving both SMS identities, removing the superseded income/expense transaction, and preventing duplicate transfer creation.

Replaying either SMS must return the existing final transaction state without creating another expense, income, or transfer.

## 6. Financial and Analytics Integrity

Use existing transaction/analytics services, or extend them with a dedicated SMS reconciliation operation.

The reconciliation must correctly reverse temporary expense/income effects and apply final transfer effects for account totals, transfer-in/out analytics, cash-flow calculations, budgets, transaction sync, offline clients, exports, and notifications where applicable.

Do not leave stale expense/income analytics after conversion.

## 7. Tests

Add a repeatable backend SMS integration test command.

### Account detection tests

- English IPN outgoing message extracts `0694`.
- Arabic IPN incoming message extracts `4113` from `إلى حسابكم 4113`.
- Arabic-Indic account digits normalize correctly.
- Explicit account wins over unrelated numbers.
- Reference, phone, date, time, balance, and OTP values are not used as account last-4.
- Unknown last-4 returns `null`.
- A matching last-4 belonging to another user is never selected.
- Multiple user accounts resolve to the correct explicit last-4.
- Existing SMS regression corpus continues to pass.

### Self-transfer tests

- Exact supplied `0694 → 4113`, `350 EGP`, reference `43f3ef2a` pair.
- Outgoing-first, incoming-first, and near-simultaneous processing.
- One second apart, exactly 45 seconds apart, and more than 45 seconds apart.
- Same reference and amount with unresolved source/destination account.
- Same amount with different references.
- Different amount with same reference.
- Same amount and nearby timestamps but unrelated transactions.
- Missing counterpart remains independent.
- Duplicate outgoing, duplicate incoming, and duplicate delivery of both messages.
- Cross-user isolation.
- No-reference pair with two explicit different owned accounts.
- Same account on both sides must not become a transfer.

### Final integrity assertions

For a valid pair, assert one transfer only; zero paired expense/income transactions remain; correct `from_account`, `to_account`, amount, and reference; correct balances and analytics; no duplicate transfer after replay; and no cross-user account association.

## Non-Goals

- No external AI or API integration.
- No probabilistic account matching.
- No account inference from merchant/category.
- No historical migration of old SMS income/expense pairs.
- No changes to manual transfer behavior.
- No changes to the existing financial transaction model beyond SMS provenance required for reconciliation.
