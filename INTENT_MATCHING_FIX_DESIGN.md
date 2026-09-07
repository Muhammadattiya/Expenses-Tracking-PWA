# Intent Matching Fix Design

## 1. Problem Statement
The recent Intent System Reliability Audit discovered two primary limitations when categorizing automatic SMS transactions:
1. **Missing English/Brand Coverage:** The taxonomy is heavily optimized for Arabic/Quick Add. Major English brands common in SMS messages (e.g., Carrefour, Talabat, Amazon) are missing, resulting in `null` intent.
2. **Concatenated Merchant Failures:** POS gateways frequently concatenate branch codes to merchant categories (e.g., `FAWRYPF*HANA MARKETSQAL`). The current regex relies on strict word boundaries `(?:\s|$)`, causing the intent system to miss keywords embedded inside these POS-generated strings (like `market` inside `MARKETSQAL`).

## 2. Root Cause
- **Taxonomy:** `INTENTS` array in `intentTaxonomy.js` lacks comprehensive English brand translations for existing Arabic intents.
- **Regex:** `(?:^|\s|[بفلك]|لل)${normKw}(?:\s|$)` forces a keyword to be perfectly isolated by whitespace or start/end of string. SMS merchants often replace spaces with asterisks (`*`), hyphens (`-`), or simply concatenate words together to fit character limits.

## 3. Options Considered
### A. Global Substring Matching (e.g., `.*${normKw}.*`)
- **False-Positive Risk:** CRITICAL. (`rent` matches `current`, `car` matches `careful`).
- **Impact:** Disastrous for Quick Add and SMS.
- **Verdict:** REJECTED.

### B. Merchant-Token Normalization
- **Complexity:** HIGH. Attempting to intelligently auto-split `MARKETSQAL` into `MARKET` + `SQAL` without a dictionary is computationally heavy and unreliable.
- **Verdict:** REJECTED.

### C. Explicit Merchant Alias Mapping
- **Maintainability:** LOW. Mapping every possible POS gateway variation (`MARKETSQAL`, `MARKETALX`, `STARBUCKS CAIRO`) creates an infinite, unmaintainable list.
- **Verdict:** REJECTED.

### D. Hybrid Strict-Match → Controlled SMS Prefix Match
- **Mechanism:** Run the normal strict extraction first. If it fails, and the input is an SMS merchant, run a "Prefix Match" fallback (`(?:^|\W|_)${normKw}`) only for keywords `length >= 4`.
- **False-Positive Risk:** LOW. A prefix match requires the keyword to be at the *start* of a word boundary. `market` will match `marketsqal`, but `rent` will NOT match `trenta`. The length restriction prevents `bus` from matching `business`.
- **Impact on Quick Add:** NONE (only runs on SMS fallback).
- **Verdict:** RECOMMENDED.

## 4. Risk Analysis
- **Random Substrings:** Prevented by enforcing the left-side word boundary (`^|\W|_`).
- **Numeric Noise (Phone numbers, IDs):** Prevented because the system matches against alphabetical taxonomy keywords. A phone number `01012345678` will never prefix-match a keyword like `coffee`.
- **Quick Add Regression:** Prevented by isolating the fallback logic behind an `isSmsMode` flag passed from the SMS controller.

## 5. Recommended Architecture
Preserve the existing semantic boundary:
`SMS Parser` → `merchant extraction` → `extractIntent(merchant, { fallbackPrefix: true })` → `Category resolver` → `Transaction`

## 6. Exact Files Expected To Change
1. `backend/services/quickAdd/intentTaxonomy.js`
2. `backend/services/quickAdd/nlpParser.js`
3. `backend/controllers/smsWebhookController.js`

## 7. Exact Functions Expected To Change
1. `extractIntent(text, options = {})`: Add a secondary loop that utilizes a prefix-matching regex if `options.fallbackPrefix === true` and the first strict pass yielded no results.

## 8. Taxonomy Changes
The following additions are strictly justified by existing SMS samples and tests:

| Keyword | Target Intent | Source / Justification | Rec |
| :--- | :--- | :--- | :--- |
| `carrefour` | `groceries` | Audit Failure (Brand, High Confidence) | ADD |
| `amazon` | `shopping` | Audit Failure (Brand, High Confidence) | ADD |
| `talabat` | `groceries` | Audit Failure (Brand, High Confidence) | ADD |
| `swvl` | `transportation`| SMS Sample 3 (Brand, High Confidence) | ADD |
| `top up` | `bills` | SMS Sample 1 (Generic, High Confidence) | ADD |
| `recharge` | `bills` | SMS Sample 2 (Generic, High Confidence) | ADD |
| `market` | `groceries` | SMS Pos Gateways (Generic, High Confidence)| ADD |
| `fawry` | N/A | POS Gateway (Too generic, spans bills/transfers) | DO NOT ADD |
| `paymob` | N/A | POS Gateway (Too generic) | DO NOT ADD |

## 9. Matching Changes
Update `extractIntent` in `nlpParser.js`:
```javascript
function extractIntent(text, options = { fallbackPrefix: false }) {
   // ... [Existing strict match logic exactly as is] ...
   // If bestIntent found, return it.

   // Controlled Fallback for SMS concatenated merchants
   if (!bestIntent && options.fallbackPrefix) {
      for (const intent of INTENTS) {
         let matches = 0;
         for (const kw of intent.keywords) {
            if (kw.length < 4) continue; // Safety control: prevent short prefix false positives
            const normKw = normalizeArabic(kw);
            // Left boundary is strict (start of string or non-word char), Right boundary is open (prefix match)
            const regex = new RegExp(`(?:^|[^a-zA-Z0-9]|[بفلك]|لل)${normKw}`, 'gi');
            matches += (normText.match(regex) || []).length;
            matches += (francoText.match(regex) || []).length;
         }
         if (matches > 0) scores[intent.id] = matches;
      }
      // ... [Calculate maxScore and assign bestIntent] ...
   }
   
   return bestIntent;
}
```

## 10. Safety Controls
1. **Left-Boundary Enforcement:** The fallback regex `(?:^|[^a-zA-Z0-9])` guarantees that the keyword is the *beginning* of a word.
2. **Length Minimum:** `kw.length < 4` guarantees that short generic words (e.g., `gas`, `bus`, `tea`) are not used in prefix matching, preventing `business` from triggering `bus` -> `transportation`.
3. **Explicit Opt-In:** The fallback is only executed if `options.fallbackPrefix` is explicitly passed by `smsWebhookController.js`. Quick Add remains 100% unaffected.

## 11. Test Plan
The following tests MUST be added and pass before merging:

1. **Existing Intent & SMS Tests:** Run `test-quickadd.js` and `test-sms-regression.js` to prove zero regression.
2. **New English Brand Cases:** Assert `extractIntent('Carrefour Maadi') === 'groceries'`.
3. **Concatenated Merchant Cases:** Assert `extractIntent('FAWRYPF*HANA MARKETSQAL', { fallbackPrefix: true }) === 'groceries'`.
4. **Adversarial False-Positive Cases:** Assert `extractIntent('BUSINESS MEETING', { fallbackPrefix: true }) === null` (proves length boundary prevents `bus`).
5. **Punctuation Boundaries:** Assert `extractIntent('PAYMOB*LIMBO CAFE') === 'coffee'` (proves non-word characters `*` act as valid boundaries).

## 12. Rollback Strategy
Because the logic is strictly scoped behind an `options.fallbackPrefix` flag, disabling the fix in production simply requires reverting the boolean argument in `smsWebhookController.js`. The taxonomy expansions are purely additive and harmless to Quick Add.

## 13. Production Risk Assessment
**Risk Level: VERY LOW**
The proposed architecture leverages the existing proven parser while carefully relaxing constraints exclusively for the SMS pipeline. By implementing Left-Boundary Enforcement and Length Minimums, we eliminate the false-positive risks associated with standard substring matching. The taxonomy additions accurately reflect real-world Egyptian financial behavior without over-indexing on ambiguous payment gateways.
