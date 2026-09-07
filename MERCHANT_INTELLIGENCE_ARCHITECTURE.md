# Merchant Intelligence & Category Assignment Architecture

## 1. Current Architecture
**Pipeline:** `SMS` → `smsParser` → `merchant string` → `extractIntent()` → `resolveCategory()` → `Transaction`
- **Merchant Info:** Stored directly in `Transaction.title`.
- **Intent Info:** Only exists ephemerally during execution; never saved.
- **Category Info:** User-scoped MongoDB documents.
- **Mappings/Aliases:** Do not exist.
- **Learning:** User corrections to a transaction category only affect that specific transaction. The system does not "learn".
- **Global Knowledge:** Relies purely on NLP semantic keyword matching (e.g., matching the word "coffee" in "Starbucks coffee").

## 2. Current Gaps
- **No Merchant Normalization:** Gateways like `PAYMOB*` pollute the merchant string, breaking semantic matching.
- **No Direct Brand Knowledge:** `WAFFARHA` has no semantic keywords (like 'market' or 'cafe'), so it always fails to `UNKNOWN`.
- **No Memory:** The system cannot learn from user manual corrections.

## 3. Proposed Architecture
The new architecture inserts a Merchant Intelligence layer that operates *before* the semantic NLP fallback.

**Pipeline:**
1. `SMS Parser` extracts raw merchant (e.g., `PAYMOB*LIMBO CAFE C`).
2. `Merchant Normalization` cleans gateways and suffixes (e.g., `LIMBO CAFE`).
3. `Merchant Intelligence Layer`:
   - **Step A:** Check `UserMerchantMapping` (DB). If found, return `categoryId`.
   - **Step B:** Check `GlobalMerchantDictionary` (JSON). If found, return `intentId`.
   - **Step C:** Fallback to Semantic NLP (`extractIntent`). If found, return `intentId`.
4. `Category Resolver`: Maps `intentId` to user's `Category` (if Step A was skipped).
5. `Transaction Creation`.

## 4. Merchant Normalization
A deterministic function `normalizeMerchantToken(rawString)` will:
1. **Remove Gateway Prefixes:** Strip known prefixes: `^(PAYMOB|FAWRYPF|FAWRY|AMAN|MEEZA|OPAY|KASHEER|VODAFONE CASH)[\*\-\s]+`
2. **Remove Common Suffixes:** Strip location/branch noise: `[\*\-\s]+(CAIRO|ALX|EG|EGYPT|ZAYED|#\d+)$`
3. **Normalize Whitespace:** Trim and replace multiple spaces with a single space.
4. **Standardize Case:** Convert entirely to UPPERCASE for deterministic exact matching.
*Important:* Do NOT remove distinct brand words. `AMAZON` and `AMAZON WEB SERVICES` remain distinct tokens.

## 5. Gateway Handling
Gateways like `PAYMOB` or `FAWRY` do not imply a specific category (Fawry could be a utility bill or a retail purchase). 
- If normalization yields an empty string (e.g., the raw string was *only* `FAWRY`), the system must safely abort to `UNKNOWN`.
- If the raw string is `FAWRYPF*HANA MARKETSQAL`, normalization yields `HANA MARKETSQAL`. This allows the downstream Semantic NLP to successfully detect `MARKET` and assign the `groceries` intent.

## 6. Global Merchant Knowledge
**Storage Model:** Static JSON file (`backend/data/globalMerchants.json`).
**Why JSON?** Zero database overhead, instant memory cache lookup (O(1)), version-controlled, trivial to rollback via Git, and avoids polluting MongoDB with thousands of global rows before an Admin UI exists.
**Schema:**
```json
{
  "WAFFARHA": "shopping",
  "STARBUCKS": "coffee",
  "KFC": "fast_food",
  "NETFLIX": "subscriptions"
}
```
*Note:* Keys are exactly what `normalizeMerchantToken()` outputs. Values are strictly `intentId` strings, NEVER category IDs.

## 7. User Merchant Overrides (Learning)
**Storage Model:** MongoDB Collection `UserMerchantMapping`.
**Schema:**
- `user`: ObjectId (Index)
- `merchantToken`: String (Normalized)
- `category`: ObjectId
**Flow:** When a user manually changes a transaction's category in the UI, the frontend calls `POST /api/merchants/learn`. The system upserts the `UserMerchantMapping` for that specific user.

## 8. Semantic Keyword Matching
If the merchant is not in User Overrides and not in Global JSON, the system passes the normalized token to the existing `extractIntent(merchant, { fallbackPrefix: true })`.
- **Safety:** Semantic matching uses Strict or Prefix-bound matching (as designed in the previous audit). It will never globally substring match. Dangerous words like `RENT` will not trigger inside `CURRENT` because of left-boundary enforcement.

## 9. Brand Mapping
Brands are mapped using the Global JSON Dictionary.
- **Aliases:** To prevent duplicate JSON files, normalization handles standardizing punctuation. For alias variations (e.g., `MCDONALDS` and `MC DONALDS`), both keys will simply point to `fast_food` in the JSON dictionary.

## 10. Unknown Merchant Behavior
If User Override = `null` AND Global JSON = `null` AND Semantic NLP = `null`:
- **Result:** Intent is `null`. Category is `null`.
- **Action:** Transaction is created with status `needs_manual_review` (or simply uncategorized).
- **Safety:** The system makes ZERO guesses. It waits for the user to manually categorize it, which automatically trains the `UserMerchantMapping` for next time.

## 11. Deterministic Confidence Model
Confidence is binary and structural based on the source of truth:
1. **User Override:** 100% (User explicitly stated this).
2. **Global Dictionary:** 90% (Curated deterministic exact match).
3. **Semantic NLP:** 70% (Inferred from keywords like "Cafe").
4. **Unknown:** 0%.

## 12. Precedence Rules
1. `UserMerchantMapping` (Overrides everything, specific to user).
2. `GlobalMerchantDictionary` (Curated Exact Match).
3. `Semantic NLP` (Keyword Inference).
4. `UNKNOWN`.

## 13. Security / Isolation
- Global dictionaries map to **Intents** (`shopping`), which are system-level strings. They never map to a MongoDB `categoryId`.
- User overrides map to `categoryId`, but are queried strictly with `{ user: req.user.id }`.
- It is architecturally impossible for User A's correction of `WAFFARHA` to impact User B, because the lookup requires `userId`.

## 14. Data Model Recommendation
- Create **`UserMerchantMapping`** Mongoose model.
- Add `merchantToken` (String) to the existing **`Transaction`** model to preserve the exact normalized string used for classification, ensuring that if normalization rules change, historical learning links remain intact.

## 15. Storage & Performance Strategy
- **Global:** In-memory static JSON. (0ms latency, 0 DB queries).
- **User:** Single MongoDB index lookup on `{ user: 1, merchantToken: 1 }`. (1-2ms latency).
- Synchronous SMS webhook processing remains highly performant.

## 16. Seed Data Strategy
Initial `globalMerchants.json` should seed high-value, unambiguous Egyptian/Global brands:
- `WAFFARHA` → `shopping`
- `UBER` → `transportation`
- `CAREEM` → `transportation`
- `SWVL` → `transportation`
- `CARREFOUR` → `groceries`
- `TALABAT` → `groceries`
- `NETFLIX` → `subscriptions`
- `SPOTIFY` → `subscriptions`
- `AMAZON` → `shopping`
- `NOON` → `shopping`

## 17. Correction/Learning Flow
1. SMS arrives: "WAFFARHA". Normalizes to `WAFFARHA`.
2. Lookup: `UNKNOWN`.
3. Tx created with `category: null`.
4. User opens app, selects "Shopping" category for this Tx.
5. Frontend requests `POST /merchants/learn { token: "WAFFARHA", categoryId: "123" }`.
6. Next SMS for "WAFFARHA" → Lookup finds User mapping → Auto-assigns Category "123".

## 18. Testing Strategy
1. **Normalization Tests:** Assert `PAYMOB*LIMBO CAFE C` normalizes to `LIMBO CAFE C`.
2. **Gateway Strip Tests:** Assert `FAWRY` normalizes to `` (empty) and falls back safely.
3. **Precedence Tests:** Mock User mapping + Global mapping. Assert User wins.
4. **User Isolation Tests:** Assert User A's mapping does not resolve for User B.
5. **E2E Integration:** Send SMS → Normalization → Global Lookup → Intent → Category.

## 19. Migration Strategy
1. Create `UserMerchantMapping` collection.
2. Create `backend/data/globalMerchants.json`.
3. Add `normalizeMerchantToken` logic.
4. Inject the 3-step lookup into `smsWebhookController.js`.
5. Expose `POST /merchants/learn` API for the frontend.

## 20. Rollback Strategy
If merchant normalization behaves unexpectedly, the controller can be reverted to pass the raw `parsedData.merchant` directly into `extractIntent`, bypassing the new layers. JSON global mappings can be reverted instantly via Git.

## 21. Production Risk Assessment
**Risk Level: VERY LOW.**
By enforcing a strict Zero-LLM, deterministic precedence model, the system is incapable of hallucinating categories. The worst-case scenario is returning `UNKNOWN`, which safely preserves the transaction for manual user review. User isolation is guaranteed via the `user` field in the database layer.
