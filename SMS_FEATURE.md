# SMS-to-Transaction Feature

## Overview
Finova supports converting bank SMS notifications into transactions automatically using a webhook endpoint. This feature is designed to be fully local (no external AI APIs are used) for privacy and cost reasons. The parsing is powered by regular expressions (`backend/services/smsParser.js`).

## Architecture

1. **Per-User Webhooks:**
   - There is a single webhook token assigned per `User`.
   - The token is a 16-byte hex string (`smsWebhookToken` in the User schema).
   - A single webhook URL looks like: `POST /api/sms/webhook/<USER_TOKEN>`
   - The user configures this single URL in iOS Shortcuts to forward all bank SMS messages.

2. **Parser (`smsParser.js`):**
   - Purely local regex-based.
   - Extracts `amount`, `type` (income/expense), `merchant`, `referenceNumber`, and `cardLast4`.
   - The extracted `cardLast4` is used to identify which Account this transaction belongs to.

3. **Status: `needs_manual_review` (No Auto-Confirm):**
   - ALL transactions generated from SMS webhooks are saved with `status: 'needs_manual_review'`.
   - The system will **never auto-confirm** an SMS transaction.
   - The `category` is always left as `null` so the user is forced to classify it during the review step.
   - The `account` is matched by `cardLast4`. If a match is found among the user's accounts, it's assigned. Otherwise, `account` is set to `null` and the user will choose it manually during review.

4. **Frontend Handling:**
   - Transactions with `account` or `category` as `null` are handled gracefully in the UI (e.g., in `TransactionCard`).
   - A visual badge ("تحتاج مراجعة" - Needs Review) is shown for SMS transactions.
   - Webhook URLs are displayed and can be copied or regenerated from the main Settings page (`Settings > SMS`).

## Setup and Migration
- Run `node backend/scripts/revertSmsTokens.js` to ensure all existing users get an assigned token and remove old account tokens.
- Users can access their unique webhook URL in the Finova frontend under Settings -> SMS.
