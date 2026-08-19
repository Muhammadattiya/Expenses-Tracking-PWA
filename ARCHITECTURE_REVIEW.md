# Finova Architecture & Production-Readiness Review

## Scope and method

This review was initially documentation-only. Implementation began after the review was delivered; the current execution status is tracked below. Findings are based on the runtime entry points, routes, models, services, client API layer, IndexedDB schema, PWA worker, and the high-traffic pages.

## Execution status

| Workstream | Status | Delivered scope |
| --- | --- | --- |
| Shared push-delivery boundary | Complete | Added `backend/services/notificationService.js`; notification controller, SMS webhook, and cron jobs now use one delivery and expired-subscription cleanup path. |
| Bounded broadcast delivery | Complete | Push sends through the shared bulk path use a maximum concurrency of 10 rather than creating an unbounded promise set. |
| Backwards-compatible transaction pagination | Complete | `GET /transactions` retains its array response by default; supplying `limit` or `cursor` returns `{ items, nextCursor }` with validated filters and a stable cursor. |
| Process lifecycle and job deployment boundary | Complete | API startup now waits for MongoDB; both API and worker handle SIGINT/SIGTERM. `npm run worker` supports a dedicated scheduler process, while `RUN_CRON_JOBS=false` disables in-process jobs on API replicas. |
| Readiness monitoring | Complete | `GET /healthz` reports process health and MongoDB connection readiness for load balancers and deployments. |
| User-data deletion completeness | Complete | The delete-data use case now deletes every currently modeled user-owned financial record and push subscription while retaining the authenticated user profile. |
| Executable backend test entry points | Complete | `npm test` now runs the existing isolated SMS webhook integration suite; `npm run test:syntax` validates the primary runtime modules. |
| Hot-query indexes and secret-safe environment template | Complete | Added compound indexes for transaction category analytics, SMS dedupe lookup, debt history, receivables, and subscriptions; replaced example credential values with placeholders. A unique SMS index remains a planned migration after duplicate cleanup. |
| Server-side analytics aggregation | Planned | Requires API contract tests and a backwards-compatible migration path. |
| Durable background jobs and idempotent offline commands | Planned | Requires new persistence/worker infrastructure; it should not be introduced as a piecemeal controller change. |

## Executive summary

Finova is a React/Vite progressive web app backed by an Express/Mongoose REST API. Its domain coverage is strong, and the code already has useful boundaries—routes, controllers, services, Mongoose models, API wrappers, and lazy-loaded pages. The primary production risks come from moving complete datasets through several layers and then recomputing the same financial facts in several places.

The first priorities should be: paginate and aggregate transactions on the server; turn scheduled work into a single-leader, query-targeted worker; consolidate shared domain rules; and make offline commands idempotent and ordered. These changes can preserve the existing API behavior while making the system safe for substantially more users and transactions.

## Current architecture

```text
Browser (React 19 + Vite PWA)
  App providers → routes/pages/components
  API wrappers → Axios interceptors → Express REST API
  Dexie IndexedDB ← offline cache / mutation queue
  Workbox service worker ← asset/API cache + background-sync queue

Express application
  app.js → route → auth middleware → controller → service → Mongoose model
                                      ↘ external APIs / Web Push
  server.js → Mongo connection + in-process cron jobs

MongoDB
  Users, accounts, categories, transactions, budgets, bills,
  recurring transactions, investments, debts, receivables, subscriptions,
  smart budget plans, income profiles, simulation history
```

### Responsibilities by layer

| Layer | Current responsibility | Assessment |
| --- | --- | --- |
| `frontend/src/pages` | Fetches data, holds view state, derives financial values, renders UI | Too much orchestration and domain calculation in individual pages. |
| `frontend/src/api` | One thin module per REST resource | Clear but repetitive; lacks shared request/query contracts. |
| `frontend/src/api/axios.js` + `db/db.js` + `sw.js` | Retries, local queueing, IndexedDB, and Workbox networking | Three partially overlapping offline systems with separate queues/caches. |
| `backend/routes` | Endpoint registration and auth attachment | Mostly thin and appropriate, but route style is inconsistent. |
| `backend/controllers` | HTTP-to-service translation | Mixed: some delegate cleanly, some include business/database logic and local error mapping. |
| `backend/services` | Core financial workflows and database access | Important rules exist here, but orchestration, persistence, notifications, and calculations are tightly coupled. |
| `backend/models` | Persistence schemas and indexes | Useful base indexes; several critical query patterns lack corresponding indexes or uniqueness guarantees. |
| `backend/services/cronJobs.js` | Recurrence, reminders, budget/survival notifications | Correct domain intent, but unsuitable as an in-process, full-scan scheduler at scale. |

## End-to-end data flow

### 1. Authenticated interactive request

1. A page imports a resource wrapper in `frontend/src/api`.
2. The wrapper calls the shared Axios instance.
3. Axios attaches the JWT from `localStorage`; transient network errors may be retried.
4. The request reaches `backend/app.js`, then a resource route. Protected routes decode the JWT in `backend/middleware/auth.js` and put the claim on `req.user`.
5. The controller invokes a service or directly queries Mongoose.
6. The service scopes reads/writes by `user`, may populate references, and returns JSON through the controller.
7. Pages retain the response in local React state and may calculate derived values again before rendering.

### 2. Transaction write and downstream effects

1. `AddTransaction` or an edit modal posts/puts/deletes through `api/transactions.js`.
2. `transactionService` normalizes the title, validates ownership of accounts/categories, and writes `Transaction`.
3. It re-fetches/populates the record for the response.
4. For relevant writes it starts budget-threshold and payday-survival checks as unawaited work.
5. The dashboard/analytics reload their resource sets independently on later navigation or explicit refresh.

The business outcome is correct in principle, but it couples a request to background notification orchestration and does not establish a durable event or idempotency boundary.

### 3. Analytics and dashboard reads

1. `Dashboard` fetches transactions, accounts, user/debt/survival/receivable data in parallel.
2. `Analytics` fetches analytics plus accounts, categories, debts, investments, budgets, bills, recurring entries, **all transactions**, and receivables in parallel.
3. `analyticsService` itself fetches every filtered transaction, populates references, and aggregates in Node.js.
4. `Analytics.jsx` additionally filters the all-transactions result per budget and per period in the browser.

This duplicates data transfer and calculations. The server can return summaries using MongoDB aggregation, and the client can request only the page/window it needs.

### 4. Offline write and sync flow

1. Axios queues failed mutating requests in Dexie when `navigator.onLine` is false.
2. The service worker separately queues failed `POST`/`PUT`/`DELETE` traffic with Workbox Background Sync.
3. On the browser `online` event, Axios replays its own queue in insertion order and deletes successes.
4. GET requests can also be served from Workbox's generic API cache.

The same mutation may be represented in two queues. Neither queue carries an idempotency key or dependency relationship, so replay after an ambiguous network failure can duplicate a successful create or apply edits in the wrong order.

### 5. Scheduled work and notifications

1. Each API process calls `initCronJobs()` in `backend/server.js`.
2. Every minute it loads due recurring transactions, all reminder-enabled recurring transactions, all active unpaid bills, active subscription users for budget checks, and active income profiles.
3. Daily, it scans all users/plans/subscriptions to send planning and risk notifications.
4. Work creates transactions, saves status changes, and sends Web Push directly.

With one Node process this runs, but multi-instance deployment causes duplicate job execution. Global scans and sequential per-record queries create rapidly growing database and push workloads.

## Critical problem areas

| Priority | Finding | Evidence | Production impact | Behavior-preserving direction |
| --- | --- | --- | --- | --- |
| P0 | Unbounded transaction endpoints | `transactionService.getTransactions`, `analyticsService.getAnalytics`, simulation state builder | Memory, response time, mobile bandwidth, and Mongo load grow linearly with user history. | Add cursor pagination and server aggregation; retain an explicit export endpoint for full history. |
| P0 | Scheduler is in the web process | `backend/server.js`, `services/cronJobs.js` | Multiple replicas duplicate financial records/notifications; restarts and long jobs reduce API reliability. | Move jobs to a worker/queue with distributed locks and idempotent job keys. |
| P0 | Offline mutations have two replay systems without idempotency | Axios interceptor and `frontend/src/sw.js` | Duplicate writes and ordering bugs during reconnect or retry. | Choose one command queue, add operation IDs/idempotency keys, and implement server dedupe. |
| P0 | Public SMS webhook token is a bearer secret in the URL | `routes/smsWebhook.js`, `smsWebhookController.js` | URL secrets leak in logs/history; IP-only rate limiting is weak behind NAT/proxies; SMS data is retained. | Keep compatibility, but introduce signed requests/rotatable tokens, redacted logs, and retention/encryption policy. |
| P1 | Analytics fetches and computes overlapping datasets | `Analytics.jsx`, `analyticsService.js` | Duplicate CPU/network cost and different totals if logic drifts. | Create one query-specific analytics read model with server-owned calculation rules. |
| P1 | Cron jobs scan broad collections and issue N+1 queries | `cronJobs.js` | Cost increases with global users, bills, subscriptions, and plans; can miss the minute SLA. | Query only due records with indexes; batch subscriptions; queue notification work. |
| P1 | Some controllers bypass service layer and error behavior varies | `budgetController`, `debtController`, `notificationController` vs. other controllers | Harder testability, inconsistent status/error envelope, duplicate validation. | Adopt one controller wrapper + service/repository contract. |
| P1 | User-data deletion is incomplete | `authService.deleteAllUserData` | Personal data remains in bills, budgets, debts, subscriptions, profiles, histories, and plans. | Enumerate ownership models centrally and delete in a transaction/outbox workflow. |
| P1 | No visible automated test command | `backend/package.json` has placeholder test script; ad-hoc test files exist | Refactors have poor regression protection. | Add unit, API contract, integration, and migration/index test suites. |
| P2 | Large pages combine API orchestration, business rules, and presentation | e.g. `Settings.jsx` (~84 KB), `Dashboard.jsx`, `Analytics.jsx` | High change risk, rerender cost, difficult review/testing. | Extract page hooks, feature modules, selectors, and presentational components. |
| P2 | No cache around gold price or request coalescing | `investmentService.getGoldPrice` | Third-party latency/rate limits multiply with users. | Use TTL cache plus timeout/circuit breaker; persist last accepted quote if required. |

## Bad architecture decisions and why they matter

### Presentation layer owns domain calculations

Budget period calculations and transaction filtering appear in both backend budget logic and `Analytics.jsx`. A client can only calculate from data it fetched, which motivated the full-history request. This is a coupling loop: more UI features need more raw data, which makes the API less scalable.

**Refactor target:** a `financial-report`/`analytics` query service owns period normalization, budget spend, totals, and grouping. The UI receives a typed view model and retains only display-specific transformations.

### Transaction service invokes scheduler internals

`transactionService` imports cron functionality dynamically to trigger payday-survival checking. A CRUD service should not know whether consequences are scheduled, synchronous, push-based, or queued.

**Refactor target:** publish a durable `transaction.changed` domain event after commit. A notification worker consumes it. Until a broker is introduced, an outbox table/collection plus a worker preserves delivery semantics.

### Generic Workbox API caching for authenticated financial data

The service worker caches all `/api/` GET responses in one generic cache. Cache keys do not visibly include application user identity, and expiration is count/time based instead of data-policy based. On a shared device, stale private data can persist after logout unless explicitly cleared.

**Refactor target:** cache only safe, user-scoped read models with explicit versioned keys; clear client cache and IndexedDB on logout/account switch; define TTLs per resource.

### In-process scheduler doubles as workflow engine

Bill state transitions, recurring transaction generation, notifications, reminder deduplication, and planning alerts reside in one file. This creates long deployment/restart blast radius and makes a second instance unsafe.

**Refactor target:** split into named jobs (`recurring.execute`, `bill.evaluate`, `notification.send`), enqueue only due work, and record a unique execution key such as `recurringId + scheduledAt`.

## Duplicate and divergent logic

| Concern | Duplicate locations | Consolidation |
| --- | --- | --- |
| Transaction reference validation | Transaction writes validate ownership; other resources implement their own account/category checks | `OwnershipValidator`/repository helpers for `requireOwnedAccount`, `requireOwnedCategory`. |
| Recurrence date math | `cronJobs.js` manually advances dates; `ForecastEngine` has separate increment functions | One tested `RecurrenceSchedule` module, including time zone and custom interval rules. |
| Reminder eligibility | Bills and recurring transactions repeat date normalization and last-notified logic | A reusable `shouldSendDailyReminder({ dueAt, leadDays, lastSentAt, now, timeZone })`. |
| Push delivery + expired subscription cleanup | Cron jobs, notification controller, SMS webhook | A single `NotificationService` with bounded concurrency, retry policy, and cleanup. |
| Budget period/spend rules | `budgetEngine.js`, `Analytics.jsx`, likely smart budget flows | One domain period calculator and aggregation query. |
| CRUD controller error handling | Most controllers catch/map locally while some use `next` | Shared async handler and centralized error mapper. |
| API wrapper boilerplate | almost every `frontend/src/api/*.js` | Keep resource modules, but build from a typed request client and shared CRUD factory where appropriate. |

## Database and query risks

### Existing strengths

`Transaction` has useful `(user, date)`, `(user, type, date)`, and `(user, account, date)` indexes. Accounts and categories have user-scoped unique names; due-date indexes exist for bills and recurring transactions.

### Missing or misaligned indexes to evaluate with `explain()`

Do not add indexes blindly; first capture the normalized query set and validate each candidate with production-like data.

| Query pattern | Candidate index | Notes |
| --- | --- | --- |
| Filtered transaction analytics by category/date | `{ user: 1, category: 1, date: -1 }` | Needed for category budget spending and analytics filtering. |
| SMS deduplication | `{ user: 1, smsHash: 1 }`, unique with partial filter | Current separate `smsHash` index still allows race duplicates. |
| Debt transactions per user/debt/date | `{ user: 1, debtId: 1, date: -1 }` | Supports debt detail/history endpoint. |
| Receivables list | `{ user: 1, createdAt: -1 }` | Avoids in-memory sort as records grow. |
| Notification subscriptions | unique `{ endpoint: 1 }`, plus `{ user: 1 }` | Makes upsert and per-user sending explicit. |
| Smart plan queries | `{ user: 1, status: 1, period: 1, startDate: 1, endDate: 1 }` | Supports daily reminder lookups. |
| Active income schedules | Queryable schedule fields plus `{ isActive: 1, frequency: 1 }` | A generic active scan cannot scale; prefer materialized next-run timestamp. |

Avoid a MongoDB regex title search over the full dataset. For the current substring behavior, cap date ranges and paginate. If product needs scalable search, use Atlas Search or a dedicated search index.

## Clean target architecture

```text
frontend/features/<feature>
  views ── feature hooks ── query/mutation client ── API
                         └─ normalized local cache + one command outbox

backend/src
  http/routes → http/controllers → application use-cases
                                      ├─ domain services (pure rules)
                                      ├─ repositories (Mongo queries)
                                      └─ outbox publisher
  worker
    queue consumer → scheduled jobs / notifications / projections
```

### Design rules

1. **Commands vs. queries:** commands validate and mutate one aggregate, then publish an event. Queries return purpose-built read models rather than raw complete collections.
2. **One source of truth for rules:** period boundaries, transaction signs, recurrence advancement, ownership checks, and notification eligibility are domain modules with focused tests.
3. **Explicit contracts:** version API responses and validate request payloads at the edge. Generate or share TypeScript/OpenAPI types so UI and server cannot silently drift.
4. **Durable background work:** jobs are independently deployable and idempotent. The API never relies on process-local timers for correctness.
5. **Privacy-aware local storage:** local caches are user-scoped, clear on logout, and have retention/size limits.

## Phased refactoring plan (no functional change)

### Phase 0 — establish safety rails

- Add a real root workspace configuration and separate `lint`, `test`, `test:integration`, and `build` scripts.
- Write API contract tests for transactions, budgets, bills, recurring schedules, SMS dedupe, and offline replay.
- Standardize `AppError`, JSON error envelope, async-controller wrapper, structured logs, correlation IDs, and redaction.
- Capture baseline request count, p50/p95 latency, Mongo `explain` plans, cron duration, queue depth, and push failures.

### Phase 1 — make reads bounded and deterministic

- Introduce `GET /transactions?cursor=&limit=&from=&to=&account=&category=&type=` while retaining the current unbounded endpoint only temporarily/for export.
- Return `{ items, nextCursor }`, use a stable cursor `(date, _id)`, whitelist/validate filters, and select only needed populated fields.
- Replace analytics `find + populate + JavaScript loop` with a Mongo aggregation pipeline that returns summary, monthly buckets, top categories/accounts, heatmap, and separately paged transaction rows.
- Make `Dashboard` and `Analytics` feature hooks request only their read models. Remove browser-side full-history budget filtering.

### Phase 2 — centralize the financial domain

- Extract `PeriodCalculator`, `TransactionReferencePolicy`, `RecurrenceSchedule`, `ReminderPolicy`, and `NotificationService`.
- Make controllers thin: parse validated input → call a use case → send result; all errors flow to one error handler.
- Keep repositories responsible only for persistence; move `populate`/projection choices into query repositories.
- Replace Mongoose `Mixed` simulation action payloads with discriminated, validated action schemas while retaining the persisted JSON shape.

### Phase 3 — reliable asynchronous processing

- Add an outbox record within the transaction write boundary; a worker publishes/processes events after commit.
- Move cron scheduling to a singleton worker with a distributed lock (or a managed scheduler). Use due-record queries and cursor batches.
- Add unique execution keys for recurring/income events to make reruns harmless.
- Queue push sends with bounded concurrency, retry/backoff, and a dead-letter policy.

### Phase 4 — unify offline and operational hardening

- Select either Workbox Background Sync **or** a Dexie command outbox; do not replay both.
- Attach `operationId` to every mutation; backend stores/deduplicates it per user and request intent.
- Define conflict rules: e.g., a queued update to a deleted record returns a resolvable conflict rather than silently retrying forever.
- Clear Workbox caches/Dexie stores on logout; constrain cached authenticated data by user/version/TTL.
- Add health/readiness endpoints, graceful shutdown, Mongo retry policy, configuration validation, rate limiting for all public auth-sensitive routes, and secret redaction.

## Production-grade implementation patterns

These are target patterns, not applied changes. They retain current semantics while providing safer boundaries.

### Cursor-based transaction query

```js
// Application query: stable ordering avoids skipped/duplicated rows.
async function listTransactions({ userId, cursor, limit = 50, filters }) {
  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const filter = buildTransactionFilter(userId, filters);

  if (cursor) {
    const { date, id } = decodeCursor(cursor);
    filter.$or = [
      { date: { $lt: date } },
      { date, _id: { $lt: id } },
    ];
  }

  const rows = await Transaction.find(filter)
    .sort({ date: -1, _id: -1 })
    .limit(pageSize + 1)
    .select('title amount type date status account category from_account to_account')
    .populate('account category from_account to_account', 'name type icon color')
    .lean();

  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  return { items, nextCursor: hasMore ? encodeCursor(items.at(-1)) : null };
}
```

### Idempotent command boundary

```js
// A client-generated operation ID makes retry/replay safe.
async function createTransactionCommand({ userId, operationId, input }) {
  return mongoose.connection.transaction(async (session) => {
    const prior = await Operation.findOne({ user: userId, operationId }).session(session);
    if (prior) return prior.result;

    const transaction = await transactionUseCase.create({ userId, input, session });
    const result = toTransactionDto(transaction);
    await Operation.create([{ user: userId, operationId, result }], { session });
    await Outbox.create([{ type: 'transaction.changed', payload: { transactionId: transaction.id } }], { session });
    return result;
  });
}
```

Use the Mongo transaction only after confirming the deployment is a replica set or compatible managed cluster. If not, use a unique operation record plus a recoverable outbox publisher.

### Due-work worker query

```js
// Claim work atomically; only a worker owns this transition.
const job = await RecurringTransaction.findOneAndUpdate(
  { isActive: true, nextExecutionDate: { $lte: now }, leaseUntil: { $lte: now } },
  { $set: { leaseUntil: addMinutes(now, 5) } },
  { sort: { nextExecutionDate: 1 }, new: true }
);
```

The completed job should write a unique execution record before creating the transaction. A retry then observes the prior execution instead of creating a duplicate.

## Maintainability standards to adopt

- Use one language/module standard consistently (prefer TypeScript for new/refactored modules; avoid a big-bang conversion).
- Organize frontend by feature rather than global `pages/components/api` alone: `features/transactions`, `features/budgets`, `features/analytics`.
- Keep a page component under a reviewable size by moving fetching to hooks and pure calculations to selectors.
- Enforce dependency direction with ESLint import boundaries: UI cannot import Mongoose/domain infrastructure; controllers cannot query models directly once repositories exist.
- Add schema validation at HTTP and environment boundaries (for example Zod/Joi/express-validator); never trust `req.body` as a model update document.
- Prefer allowlisted updates over passing raw request bodies to `findOneAndUpdate`.
- Use `lean()` for read-only list/query paths and explicit `select`/populate projections; keep hydrated documents only when methods/save are needed.
- Add JSDoc/TypeScript types for financial amounts, date/time-zone assumptions, and transaction variants. Currency should be represented consistently (ideally integer minor units or a documented decimal policy) before expanding to more currencies.

## Security and data integrity follow-ups

- Restrict CORS to configured origins and apply sensible body limits per route rather than 50 MB globally.
- Verify VAPID configuration at startup without logging secrets; protect administrative broadcast endpoint with stronger auth/audit/rate controls.
- Store a compound unique SMS dedupe key and use atomic insertion/catch duplicate-key errors instead of find-then-create.
- Validate ObjectIds and ownership for every relation—including budget account/category and recurring references.
- Ensure account/category archive/delete and all user-data deletion rules are documented as domain policies, then execute related writes atomically where supported.
- Decide whether `rawSms`, profile images, and local PWA caches require encryption, retention limits, or explicit consent under the intended privacy regime.

## Verification checklist for the refactor program

1. Transaction CRUD, transfer, settlement, SMS-import, recurring, bill-payment, budget, and analytics contract tests retain current output semantics.
2. Replaying an identical offline command 10 times produces one persisted mutation and one downstream notification event.
3. Two worker replicas produce one recurring transaction and one notification for the same scheduled occurrence.
4. A user with 100k transactions receives a bounded dashboard/analytics response without full-history transfer.
5. `explain('executionStats')` confirms no collection scans for hot user-scoped read and due-work queries.
6. Logout removes all private client caches; delete-account removes every owned collection, subscriptions, and queued events.
7. Load tests verify p95 API latency, worker throughput, queue lag, and third-party price/push failure behavior against agreed SLOs.

## Suggested success metrics

- 95th-percentile dashboard and analytics API latency under an agreed target at 100k transactions per active user.
- Zero duplicate transaction creation under retry, reconnect, or multi-worker scheduling tests.
- No global collection scan in recurring/bill/reminder hot paths.
- One authoritative calculation path for budget spend, period boundaries, recurrence, and push delivery.
- Test coverage concentrated on financial invariants and API contracts, not only rendered components.
