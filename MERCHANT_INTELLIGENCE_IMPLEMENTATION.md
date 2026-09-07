# Merchant Intelligence Implementation - Phase 1

This document outlines the Phase 1 implementation of the Merchant Intelligence system, which acts as a deterministic layer between raw SMS merchant parsing and semantic intent classification.

## 1. Files Created
- `backend/services/merchantIntelligence/merchantNormalizer.js`: Handles deterministic merchant string cleaning (gateways, suffixes, spaces).
- `backend/data/globalMerchants.json`: In-memory JSON dictionary for O(1) global brand lookups.
- `backend/services/merchantIntelligence/globalMerchantDictionary.js`: The core service executing the lookup pipeline.
- `backend/test-merchant-intelligence.js`: Comprehensive test suite proving logic and precedence.

## 2. Files Changed
- `backend/services/quickAdd/nlpParser.js`: Updated `extractIntent(text, options)` to accept a `{ fallbackPrefix: true }` parameter, enabling strict left-boundary with open right-boundary prefix matching. A critical bug where `[^a-zA-Z0-9]` incorrectly matched Arabic letters was fixed by using `(?:^|\\s|[\\-\\*\\.,_]|[بفلك]|لل)`.

## 3. Normalization Behavior
The system aggressively yet safely normalizes strings to ensure maximum lookup accuracy:
- Trims whitespace and converts to `UPPERCASE`.
- Strips known suffixes if preceded by space or punctuation (`CAIRO`, `ALX`, `EG`, `#123`).
- Resolves redundant/duplicate whitespaces down to a single space.
- Does NOT destroy English/Arabic text indiscriminately. 

## 4. Global Dictionary
The dictionary maps known high-confidence brands directly to semantic `intentId`s (never `categoryId`).
- Provides O(1) instantaneous lookup.
- E.g., `STARBUCKS` -> `coffee`.
- Replaces LLM guessing with exact, deterministic rules.

## 5. Gateway Handling
Common payment gateway prefixes (`PAYMOB`, `FAWRYPF`, `AMAN`, `MEEZA`) are stripped *only* if followed by a separator (`*`, `-`, or space).
- `PAYMOB*LIMBO CAFE` -> `LIMBO CAFE`
- `FAWRY` alone -> remains `FAWRY` (and fails safely to `UNKNOWN`).

## 6. Classification Result Structure
The system returns a strict, deterministic object without fake probabilistic scores:
```json
{
  "merchant": "PAYMOB*LIMBO CAFE",
  "normalizedMerchant": "LIMBO CAFE",
  "intentId": "coffee",
  "source": "GLOBAL_MERCHANT",
  "matchedKey": "LIMBO CAFE"
}
```
Available sources implemented in Phase 1: `GLOBAL_MERCHANT`, `SEMANTIC_KEYWORD`, `UNKNOWN`.

## 7. Intent Fallback
If the global dictionary misses, the system passes the normalized merchant to `extractIntent(..., { fallbackPrefix: true })`.
- This targets concatenated merchants like `FAWRYPF*HANA MARKETSQAL`.
- The strict left-boundary (`^`, `\s`, punctuation) combined with an open right-boundary allows `market` to match `MARKETSQAL`.
- A minimum keyword length of 4 is enforced to prevent `bus` matching `business`.

## 8. Unknown Behavior
If the dictionary and semantic fallback fail, the system returns `intentId: null` and `source: 'UNKNOWN'`. It makes absolutely ZERO guesses. `WAFFARHA` correctly resolves to `UNKNOWN`.

## 9. Security Considerations
- **No Direct Category Mapping:** The dictionary only resolves to `intentId`, never raw DB IDs. User isolation is mathematically preserved.
- **False-Positive Prevention:** Hardcoded safety exclusions (`MARKETPLACE`, `RENTAL`, `MARKETING`, `UNKNOWN MERCHANT`) exist in the classification wrapper to prevent prefix-matches on common generic English words. 

## 10. Performance
- **O(1) Memory Lookup:** `globalMerchants.json` is loaded synchronously exactly once when the service starts up via `require`. No database or disk I/O occurs on request.

## 11. Tests
A dedicated suite `test-merchant-intelligence.js` was built and passed (48 tests).
- Confirmed Gateway stripping.
- Confirmed Precedence (Global > Semantic).
- Confirmed False-Positive exclusions.
- Confirmed pure Unkown fallbacks.

## 12. Known Limitations
- `UserMerchantMapping` is not yet implemented (scheduled for next Phase).
- The SMS Webhook does not yet consume this service.
- The safety exceptions list is hardcoded; if merchants with those exact names exist, they will be forced into `UNKNOWN` until user-override mappings are introduced.
