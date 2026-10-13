# SMS Multi-Card Identifiers, Promo Filtering, Learning Manager & Bill Auto-Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Finova's SMS Auto-Logging engine with multi-card account linking, eliminate false-positive expenses from marketing/promotional SMS, provide user-facing management for local merchant learning rules, and automatically reconcile bill payments with SMS transactions to prevent duplicates.

**Architecture:** 
1. **Multi-Card Resolution**: `Account` models accept an array of 4-digit strings (`linkedCards`), and `accountResolver` searches natively across arrays while preserving zero-guessing isolation.
2. **Promotional SMS Filter**: A deterministic pre-parsing filter in `smsParser` flags marketing offers, discount percentages, "up to" thresholds, and promo codes, ignoring them with HTTP 200 to prevent false expenses.
3. **Local Learning Management**: A RESTful API and a dedicated Settings view allow users to audit, reassign, or delete `UserMerchantKnowledge` rules.
4. **Smart Bill Reconciliation**: A new `billReconciliationService` matches incoming SMS expenses to active unpaid bills by keywords, date window, and amount, atomically marking the bill paid with zero duplicate transactions; complemented by an in-app "Link Existing Transaction" action in the Bills view.

**Tech Stack:** React 19, Vite, Tailwind CSS v4, Zustand, Node.js, Express, MongoDB (Mongoose), Lucide React.

**Spec:** Brainstormed specification in conversation `e61f2bb3-8a39-4ea7-9111-130aa842c4f4`.

## Global Constraints
- **ABSOLUTE ZERO DATABASE DELETIONS**: Never use `deleteOne`, `deleteMany`, or `findOneAndDelete` for transaction data.
- **Strict Multi-Tenant Isolation**: Every database query and cache partition MUST enforce `{ user: userId }`.
- **Zero-Guessing Invariance**: If an account or bill match is ambiguous or unverified, leave it unassigned (`null`) rather than guessing a default.
- **Pure CSS Glassmorphism**: All UI components must use pure Tailwind CSS v4 backdrop blur (`backdrop-blur-[32px]`), Copper Brown (`#8D6346`), and ambient glow styling without SVG displacement filters.
- **Bilingual & Localization**: No raw strings in UI. All labels, alerts, and placeholders must exist in `ar.js` (RTL) and `en.js` (LTR).

## Review Focus
1. **Promotional messages resembling bank debits**: Messages containing the word "خصم" (discount) must be rejected, while messages containing "تم خصم" followed by amounts must pass.
2. **Duplicate cardLast4 across distinct accounts of the same user**: If two different accounts link the same 4-digit code, resolver must return `null` without throwing.
3. **Bill auto-matching threshold**: Must never auto-pay an unrelated bill when amounts match by pure coincidence without keyword or category confirmation.
4. **Backwards compatibility of `cardLast4`**: Existing accounts with single `cardLast4` strings must continue to resolve seamlessly alongside `linkedCards`.
5. **Reconciliation idempotency**: Replaying an SMS that paid a bill must not advance the bill's cycle a second time or throw concurrency errors.

---

### Task 1: Multi-Card Support in Account Schema & Resolver (Backend)

**Files:**
- Modify: `backend/models/Account.js:50-60`
- Modify: `backend/services/accountResolver.js:20-50`
- Create: `backend/test-multi-card-resolver.js`

**Interfaces:**
- Consumes: `userId` (ObjectId/string), `normalizedLast4` (4-digit string).
- Produces: `resolveUserAccount(userId, accountLast4)` returning matching Account document or `null`.

- [x] **Step 1: Write unit test for multi-card resolution**

Create `backend/test-multi-card-resolver.js`:
```javascript
const assert = require('assert');
const mongoose = require('mongoose');
const Account = require('./models/Account');
const { resolveUserAccount } = require('./services/accountResolver');

async function runTest() {
  console.log('Testing Multi-Card Account Resolver...');
  const userId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();

  // Mock Account.find
  const mockAccounts = [
    {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      name: 'CIB Account',
      cardLast4: '0694',
      linkedCards: ['0694', '4113', '9988'],
      isArchived: false
    },
    {
      _id: new mongoose.Types.ObjectId(),
      user: userId,
      name: 'NBE Account',
      cardLast4: '1234',
      linkedCards: ['1234'],
      isArchived: false
    },
    {
      _id: new mongoose.Types.ObjectId(),
      user: otherUserId,
      name: 'Other User Account',
      cardLast4: '4113',
      linkedCards: ['4113'],
      isArchived: false
    }
  ];

  Account.find = function(query) {
    return {
      lean: async function() {
        return mockAccounts.filter(acc => {
          if (String(acc.user) !== String(query.user)) return false;
          if (acc.isArchived) return false;
          const target = query.$or ? query.$or[0].linkedCards : query.cardLast4;
          return (acc.linkedCards && acc.linkedCards.includes(target)) || acc.cardLast4 === target;
        });
      }
    };
  };

  // Test 1: Match primary card
  const acc1 = await resolveUserAccount(userId, '0694');
  assert.strictEqual(acc1.name, 'CIB Account', 'Should match primary card 0694');

  // Test 2: Match secondary linked card
  const acc2 = await resolveUserAccount(userId, '4113');
  assert.strictEqual(acc2.name, 'CIB Account', 'Should match linked card 4113');

  // Test 3: Match tertiary linked card
  const acc3 = await resolveUserAccount(userId, '9988');
  assert.strictEqual(acc3.name, 'CIB Account', 'Should match linked card 9988');

  // Test 4: Tenant isolation
  const accOther = await resolveUserAccount(userId, '9999');
  assert.strictEqual(accOther, null, 'Unlinked card should return null');

  console.log('✅ Multi-Card Account Resolver unit tests passed successfully!');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
```

- [x] **Step 2: Run test to observe failure**

Run: `node backend/test-multi-card-resolver.js`
Expected: FAIL (because `accountResolver.js` does not yet query `linkedCards`).

- [x] **Step 3: Update `backend/models/Account.js`**

Add `linkedCards` to `accountSchema` in [backend/models/Account.js](file:///d:/expenses-tracker/backend/models/Account.js):
```javascript
  linkedCards: {
    type: [String],
    default: [],
    validate: {
      validator: function(cards) {
        if (!Array.isArray(cards)) return false;
        return cards.every(c => typeof c === 'string' && /^\d{4}$/.test(c.trim()));
      },
      message: 'Every linked card must be exactly 4 digits'
    }
  },
```

- [x] **Step 4: Update `backend/services/accountResolver.js`**

Modify `resolveUserAccount` in [backend/services/accountResolver.js](file:///d:/expenses-tracker/backend/services/accountResolver.js):
```javascript
  const query = {
    user: userId,
    $or: [
      { linkedCards: normalizedLast4 },
      { cardLast4: normalizedLast4 }
    ],
    isArchived: { $ne: true }
  };
```

- [x] **Step 5: Run unit tests to verify pass**

Run: `node backend/test-multi-card-resolver.js`
Expected: PASS with `✅ Multi-Card Account Resolver unit tests passed successfully!`.

---

### Task 2: Multi-Card Input UI in Account Modals (Frontend)

**Files:**
- Modify: `frontend/src/components/modals/AddAccountModal.jsx` (or `AccountModal.jsx`)
- Modify: `frontend/src/locales/en.js`
- Modify: `frontend/src/locales/ar.js`

**Interfaces:**
- Consumes: Account state `{ name, type, linkedCards: [] }`.
- Produces: Form payload with `linkedCards: string[]` and `cardLast4: string`.

- [x] **Step 1: Add localization keys in `en.js` and `ar.js`**

In [frontend/src/locales/en.js](file:///d:/expenses-tracker/frontend/src/locales/en.js):
```javascript
"linkedCardsLabel": "Linked Cards / Identifiers",
"linkedCardsPlaceholder": "Type 4 digits and press Enter (e.g. 1234)",
"linkedCardsHelp": "Add the last 4 digits of all cards and account numbers linked to this account for SMS auto-logging.",
"duplicateCardError": "This card number is already added",
"invalidCardError": "Card identifier must be exactly 4 digits",
```

In [frontend/src/locales/ar.js](file:///d:/expenses-tracker/frontend/src/locales/ar.js):
```javascript
"linkedCardsLabel": "البطاقات والأرقام المرتبطة",
"linkedCardsPlaceholder": "أدخل آخر 4 أرقام واضغط Enter (مثال: 1234)",
"linkedCardsHelp": "أضف آخر 4 أرقام لجميع البطاقات أو الحسابات التابعة لهذا الحساب ليتم رصد رسائلها تلقائياً.",
"duplicateCardError": "هذا الرقم مضاف بالفعل",
"invalidCardError": "يجب أن يتكون الرقم من 4 أرقام فقط",
```

- [x] **Step 2: Implement chip input component in Account Modal**

In the account creation/edit modal, replace the single `cardLast4` input with an interactive chip tag input:
- Allows entering 4-digit numbers.
- Pressing `Enter` or `,` validates `/^\d{4}$/` and appends to `linkedCards`.
- Displays chip badges styled with `bg-white/10 border border-white/20 px-2.5 py-1 rounded-xl text-xs font-mono text-white flex items-center gap-1.5`.
- Chip has an `×` button that removes it from the array.
- On save, sets `cardLast4: linkedCards[0] || ''` and `linkedCards: linkedCards`.

---

### Task 3: Promotional & Marketing SMS Filter (Backend)

**Files:**
- Modify: `backend/services/smsParser.js`
- Modify: `backend/controllers/smsWebhookController.js`
- Create: `backend/test-sms-promo-filter.js`

**Interfaces:**
- Consumes: Raw/normalized SMS string.
- Produces: `isPromotionalOrMarketingSms(text): boolean`.

- [x] **Step 1: Write unit test for promotional message detection**

Create `backend/test-sms-promo-filter.js`:
```javascript
const assert = require('assert');
const { parseSms } = require('./services/smsParser');

const promoCases = [
  // User's exact example
  "خصمك جاهز خصم %10 لحد 300 جنيه على الموبايلات، الإكسسوارات والتليفزيونات استخدم كود: FIRST10 https://myeand.page.link/Eshop الكود متاح لجميع المنتجات المقدمة من اتصالات",
  // Telecom offers
  "اشترك الآن واستمتع بخصم يصل إلى 50% على باقات الموبايل والإنترنت. العرض ساري لفترة محدودة استخدم بروموكود: SUMMER26",
  "وفر حتى 200 جنيه عند الدفع باستخدام الكود SAVE20 من خلال اللينك bit.ly/eshop",
  "خصومات تصل إلى 40% على جميع الإلكترونيات تسوق الآن من خلال فروعنا أو الموقع"
];

const legitimateTxCases = [
  "تم خصم مبلغ 350.00 جم من بطاقتكم المنتهية بـ 9988 يوم 25-08-2026",
  "Your Debit Card **1984 had a Successful transaction of EGP 257.14 @Top Up ETISALAT Egypt",
  "تم خصم 404.7 EGP من بطاقة المدفوعة مقدما رقم 2513 باستخدام Mobile Payment عند PAYMOB*LIMBO CAFE C يوم 20/07/26",
  "IPN transfer sent with amount of EGP 350.00 from 0694 on 18/09 at 07:32 AM. Ref# 43f3ef2a."
];

console.log('Testing Promotional SMS Filter...');

promoCases.forEach((sms, i) => {
  const result = parseSms(sms);
  assert.strictEqual(result, null, `Promo case ${i + 1} must be rejected (returned null)`);
});

legitimateTxCases.forEach((sms, i) => {
  const result = parseSms(sms);
  assert.notStrictEqual(result, null, `Legitimate tx case ${i + 1} must NOT be rejected`);
  assert.ok(result.amount > 0, `Legitimate tx case ${i + 1} must extract amount`);
});

console.log('✅ Promotional SMS Filter unit tests passed successfully!');
```

- [x] **Step 2: Run test to observe failure**

Run: `node backend/test-sms-promo-filter.js`
Expected: FAIL (Promo case 1 parsed as expense of 300).

- [x] **Step 3: Implement `isPromotionalOrMarketingSms` in `backend/services/smsParser.js`**

Add in [backend/services/smsParser.js](file:///d:/expenses-tracker/backend/services/smsParser.js):
```javascript
/**
 * Detects whether an SMS is a promotional, discount, or marketing message.
 * @param {string} text 
 * @returns {boolean}
 */
const isPromotionalOrMarketingSms = (text) => {
  if (!text) return false;
  
  // 1. Promo codes, coupons, vouchers
  if (/(?:استخدم كود|كود الخصم|كود:|بروموكود|promo\s*code|voucher|كوبون|coupon)/i.test(text)) {
    return true;
  }

  // 2. Percentage discounts and promo words
  if (/(?:خصمك\s+جاهز|خصم\s*%\s*\d+|\d+%\s*خصم|خصم\s+يصل\s+إلى|خصومات\s+تصل|وفر\s+حتى|وفر\s+الآن|أقوى\s+الخصومات|عروض\s+حصرية)/i.test(text)) {
    return true;
  }

  // 3. "Up to" thresholds (not actual debits)
  if (/(?:لحد\s+\d+\s*(?:جنيه|جم|EGP)|حتى\s+\d+\s*(?:جنيه|جم|EGP)|بحد\s+أقصى\s+\d+)/i.test(text)) {
    return true;
  }

  // 4. Marketing URLs combined with shop/offer keywords
  if (/(?:page\.link|eshop|bit\.ly|bit\.do|تسوق\s+الآن|اشتراك\s+شهري)/i.test(text)) {
    // If it lacks real transaction confirmation phrases like "تم خصم" or "Successful transaction", reject it
    if (!/(?:تم\s+خصم|تم\s+الآن\s+خصم|تم\s+سحب|تم\s+دفع\s+مبلغ|Successful\s+transaction|debited\s+from)/i.test(text)) {
      return true;
    }
  }

  return false;
};
```

In `parseSms(smsText)`:
```javascript
  const normalized = normalizeSmsText(smsText);
  if (!normalized) return null;

  if (isPromotionalOrMarketingSms(normalized)) {
    return null;
  }
```

- [x] **Step 4: Run unit test to verify pass**

Run: `node backend/test-sms-promo-filter.js`
Expected: PASS with `✅ Promotional SMS Filter unit tests passed successfully!`.

---

### Task 4: Local Learning Management API (Backend)

**Files:**
- Create: `backend/controllers/merchantKnowledgeController.js`
- Modify: `backend/routes/integrations.js`
- Create: `backend/test-merchant-knowledge-api.js`

**Interfaces:**
- Consumes: Authenticated user JWT, `UserMerchantKnowledge` model.
- Produces: Endpoints:
  - `GET /api/integrations/merchant-knowledge`
  - `PUT /api/integrations/merchant-knowledge/:id`
  - `DELETE /api/integrations/merchant-knowledge/:id`

- [x] **Step 1: Write integration test for Merchant Knowledge API**

Create `backend/test-merchant-knowledge-api.js`:
```javascript
const assert = require('assert');
const controller = require('./controllers/merchantKnowledgeController');
const UserMerchantKnowledge = require('./models/UserMerchantKnowledge');

async function testApi() {
  console.log('Testing Merchant Knowledge API...');
  
  // Test listing
  let sentData = null;
  const req = { user: { id: '660000000000000000000001' } };
  const res = {
    status: (code) => res,
    json: (data) => { sentData = data; }
  };

  UserMerchantKnowledge.find = () => ({
    sort: () => ({
      lean: async () => [
        { _id: 'rule_1', user: req.user.id, normalizedMerchant: 'ETISALAT', intentId: 'bills' }
      ]
    })
  });

  await controller.getLearnedMerchants(req, res, (e) => { throw e; });
  assert.ok(Array.isArray(sentData), 'Should return an array');
  assert.strictEqual(sentData[0].normalizedMerchant, 'ETISALAT');

  console.log('✅ Merchant Knowledge API test passed!');
}

testApi().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
```

- [x] **Step 2: Create controller `backend/controllers/merchantKnowledgeController.js`**

Implement `getLearnedMerchants`, `updateLearnedMerchant`, and `deleteLearnedMerchant`:
```javascript
const UserMerchantKnowledge = require('../models/UserMerchantKnowledge');
const Category = require('../models/Category');

exports.getLearnedMerchants = async (req, res, next) => {
  try {
    const rules = await UserMerchantKnowledge.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .lean();

    // Attach category details corresponding to intentId
    const categories = await Category.find({ user: req.user.id }).lean();
    const enriched = rules.map(rule => {
      const matchedCategory = categories.find(c => c.intentId === rule.intentId);
      return {
        ...rule,
        category: matchedCategory ? {
          _id: matchedCategory._id,
          name: matchedCategory.name,
          color: matchedCategory.color,
          icon: matchedCategory.icon
        } : null
      };
    });

    res.status(200).json(enriched);
  } catch (error) {
    next(error);
  }
};

exports.updateLearnedMerchant = async (req, res, next) => {
  try {
    const { intentId } = req.body;
    const rule = await UserMerchantKnowledge.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { intentId },
      { new: true }
    );
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.status(200).json(rule);
  } catch (error) {
    next(error);
  }
};

exports.deleteLearnedMerchant = async (req, res, next) => {
  try {
    const rule = await UserMerchantKnowledge.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });
    if (!rule) return res.status(404).json({ message: 'Rule not found' });
    res.status(200).json({ message: 'Rule deleted successfully' });
  } catch (error) {
    next(error);
  }
};
```

- [x] **Step 3: Mount routes in `backend/routes/integrations.js`**

```javascript
const merchantKnowledgeController = require('../controllers/merchantKnowledgeController');

router.get('/merchant-knowledge', requireAuth, merchantKnowledgeController.getLearnedMerchants);
router.put('/merchant-knowledge/:id', requireAuth, merchantKnowledgeController.updateLearnedMerchant);
router.delete('/merchant-knowledge/:id', requireAuth, merchantKnowledgeController.deleteLearnedMerchant);
```

- [x] **Step 4: Run test to verify pass**

Run: `node backend/test-merchant-knowledge-api.js`
Expected: PASS with `✅ Merchant Knowledge API test passed!`.

---

### Task 5: Local Learning Management UI in Settings (Frontend)

**Files:**
- Modify: `frontend/src/api/integrations.js`
- Modify: `frontend/src/pages/Settings.jsx`
- Modify: `frontend/src/locales/en.js`
- Modify: `frontend/src/locales/ar.js`

**Interfaces:**
- Consumes: `GET /api/integrations/merchant-knowledge`, `PUT`, `DELETE`.
- Produces: UI component inside Settings with search, list of learned rules, category editing, and deletion.

- [x] **Step 1: Add API client functions in `frontend/src/api/integrations.js`**

```javascript
export const getLearnedMerchants = async () => {
  const response = await api.get('/integrations/merchant-knowledge');
  return response.data;
};

export const updateLearnedMerchant = async (id, intentId) => {
  const response = await api.put(`/integrations/merchant-knowledge/${id}`, { intentId });
  return response.data;
};

export const deleteLearnedMerchant = async (id) => {
  const response = await api.delete(`/integrations/merchant-knowledge/${id}`);
  return response.data;
};
```

- [x] **Step 2: Add localization keys**

In `en.js`:
```javascript
"smartRulesTitle": "Smart Categorization Rules",
"smartRulesDesc": "Review and manage how Finova automatically categorizes transactions from known merchants.",
"noRulesFound": "No custom categorization rules yet. Rules are learned automatically as you categorize transactions.",
"searchMerchants": "Search learned merchants...",
"editRule": "Edit Category",
"deleteRuleConfirm": "Are you sure you want to delete this classification rule?",
```

In `ar.js`:
```javascript
"smartRulesTitle": "قواعد التصنيف التلقائي",
"smartRulesDesc": "راجع وعدّل كيف يقوم التطبيق بتصنيف المعاملات القادمة من التجار والخدمات تلقائياً.",
"noRulesFound": "لا توجد قواعد تصنيف مخصصة حالياً. يتعلم التطبيق تلقائياً عند تصنيفك للمعاملات.",
"searchMerchants": "بحث في التجار المسجلين...",
"editRule": "تعديل التصنيف",
"deleteRuleConfirm": "هل أنت متأكد من حذف قاعدة التصنيف لهذا التاجر؟",
```

- [x] **Step 3: Integrate into `frontend/src/pages/Settings.jsx`**

Add a new segmented tab or view option in Settings:
- Lists rules with merchant name in bold mono.
- Displays Category pill (name + icon + color).
- Provides Edit Category modal and Delete button with `ConfirmModal`.
- Search input filters merchants client-side in real-time.

---

### Task 6: Smart Bill Reconciliation Engine (Backend)

**Files:**
- Modify: `backend/models/Bill.js:20-40`
- Modify: `backend/models/Transaction.js:110-120`
- Create: `backend/services/billReconciliationService.js`
- Modify: `backend/controllers/smsWebhookController.js:150-165, 220-235`
- Create: `backend/test-bill-sms-reconciliation.js`

**Interfaces:**
- Consumes: `user` (User document), `newTx` (Transaction document).
- Produces: `matchAndReconcileBill(userId, newTx)` returning `{ matched: boolean, bill: Object|null }`.

- [x] **Step 1: Write integration test for bill auto-reconciliation**

Create `backend/test-bill-sms-reconciliation.js`:
```javascript
const assert = require('assert');
const mongoose = require('mongoose');
const { matchAndReconcileBill } = require('./services/billReconciliationService');
const Bill = require('./models/Bill');

async function testBillMatching() {
  console.log('Testing Bill Auto-Reconciliation...');

  const userId = new mongoose.Types.ObjectId();
  const mockBill = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    name: 'فاتورة WE انترنت',
    expectedAmount: 350,
    dueDate: new Date(),
    status: 'upcoming',
    keywords: ['we', 'telecom egypt'],
    save: async function() { this.status = 'paid'; return this; }
  };

  Bill.find = function(query) {
    return {
      lean: false,
      exec: async () => [mockBill]
    };
  };

  const txWE = {
    _id: new mongoose.Types.ObjectId(),
    user: userId,
    amount: 350,
    title: 'WE Internet Payment',
    date: new Date()
  };

  const result = await matchAndReconcileBill(userId, txWE);
  assert.strictEqual(result.matched, true, 'Bill should match WE keyword and amount');
  assert.strictEqual(result.bill._id, mockBill._id);

  console.log('✅ Bill Auto-Reconciliation test passed!');
}

testBillMatching().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
```

- [x] **Step 2: Update `Bill.js` and `Transaction.js` schemas**

In [backend/models/Bill.js](file:///d:/expenses-tracker/backend/models/Bill.js):
```javascript
  keywords: {
    type: [String],
    default: [],
    trim: true
  },
```

In [backend/models/Transaction.js](file:///d:/expenses-tracker/backend/models/Transaction.js):
```javascript
  bill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill'
  },
```

- [x] **Step 3: Implement `backend/services/billReconciliationService.js`**

```javascript
const Bill = require('../models/Bill');
const billService = require('./billService');

const matchAndReconcileBill = async (userId, transaction) => {
  if (!transaction || transaction.type !== 'expense' || !transaction.amount) {
    return { matched: false, bill: null };
  }

  const txAmount = Number(transaction.amount);
  const txTitle = (transaction.title || '').toLowerCase();
  const txDate = transaction.date ? new Date(transaction.date) : new Date();

  // Find active unpaid bills for this user
  const bills = await Bill.find({
    user: userId,
    status: { $in: ['upcoming', 'due_today', 'overdue'] },
    isActive: { $ne: false }
  });

  for (const bill of bills) {
    const billDueDate = new Date(bill.dueDate);
    const dayDiff = Math.abs(txDate.getTime() - billDueDate.getTime()) / (1000 * 60 * 60 * 24);

    // 1. Timing window: within +/- 7 days of due date
    if (dayDiff > 7) continue;

    // 2. Amount match: exact or within 10% tolerance for variable utility bills
    const amountDiff = Math.abs(bill.expectedAmount - txAmount);
    const isAmountMatch = amountDiff <= 0.01 || (amountDiff / bill.expectedAmount) <= 0.10;
    if (!isAmountMatch) continue;

    // 3. Keyword or Name match
    const billName = (bill.name || '').toLowerCase();
    const hasKeywordMatch = Array.isArray(bill.keywords) && bill.keywords.some(kw => 
      kw && txTitle.includes(kw.trim().toLowerCase())
    );
    const hasNameMatch = txTitle.includes(billName) || billName.includes(txTitle);

    if (hasKeywordMatch || hasNameMatch) {
      // High-confidence match: atomically mark bill as paid
      await billService.markAsPaid(userId, bill._id, String(transaction._id));
      return { matched: true, bill };
    }
  }

  return { matched: false, bill: null };
};

module.exports = {
  matchAndReconcileBill
};
```

- [x] **Step 4: Integrate into `backend/controllers/smsWebhookController.js`**

Inside `handleSmsWebhook`, immediately after creating `newTx`:
```javascript
    try {
      const { matchAndReconcileBill } = require('../services/billReconciliationService');
      const billRecon = await matchAndReconcileBill(user._id, newTx);
      if (billRecon.matched) {
        newTx.bill = billRecon.bill._id;
        await newTx.save();
        console.log(`[SMS Webhook] Bill auto-reconciled: bill="${billRecon.bill.name}" tx="${newTx._id}"`);
      }
    } catch (billErr) {
      console.error('[SMS Webhook] Bill reconciliation error:', billErr.message);
    }
```

- [x] **Step 5: Run unit test to verify pass**

Run: `node backend/test-bill-sms-reconciliation.js`
Expected: PASS with `✅ Bill Auto-Reconciliation test passed!`.

---

### Task 7: Manual "Link to Existing Transaction" Action in Bills Screen (Frontend)

**Files:**
- Modify: `frontend/src/pages/Bills.jsx`
- Modify: `frontend/src/components/bills/BillCard.jsx`
- Modify: `frontend/src/locales/en.js`
- Modify: `frontend/src/locales/ar.js`

**Interfaces:**
- Consumes: Bill object, recent transactions.
- Produces: API call to `payBill(billId, transactionId)` with existing transaction ID.

- [x] **Step 1: Add localization keys**

In `en.js`:
```javascript
"linkExistingTransaction": "Link Existing Transaction",
"linkExistingDesc": "Select a recorded transaction from bank SMS or manual entry to settle this bill without creating a duplicate.",
"createNewExpense": "Record New Expense",
"markPaidOnly": "Mark Paid Only (No Expense)",
"billSettledWithExisting": "Bill settled and linked to existing transaction successfully!",
"smsKeywordsLabel": "SMS Auto-Match Keywords",
"smsKeywordsPlaceholder": "e.g. we, telecom, electricity (press Enter)",
```

In `ar.js`:
```javascript
"linkExistingTransaction": "ربط بمعاملة مسجلة مسبقاً",
"linkExistingDesc": "اختر معاملة مسجلة من رسائل البنك أو يدوياً لسداد الفاتورة بدون إنشاء معاملة مكررة.",
"createNewExpense": "تسجيل مصروف جديد",
"markPaidOnly": "تحديد كمدفوعة فقط (بدون تسجيل مصروف)",
"billSettledWithExisting": "تم سداد الفاتورة وربطها بالمعاملة بنجاح!",
"smsKeywordsLabel": "كلمات مطابقة رسائل البنك",
"smsKeywordsPlaceholder": "مثال: we, فودافون, كهرباء (اضغط Enter)",
```

- [x] **Step 2: Add payment action modal to `BillCard.jsx` / `Bills.jsx`**

When user taps "Pay Bill":
- Display modal with 3 choices:
  1. **"ربط بمعاملة سابقة (Link Existing Transaction)"**: Opens a list of recent expenses. User selects one $\rightarrow$ calls `payBill(bill._id, selectedTx._id)`. **Zero duplicate transactions!**
  2. **"تسجيل معاملة جديدة (Record New Expense)"**: Navigates to `/add-transaction?billId=...`.
  3. **"تحديد كمدفوعة فقط (Mark Paid Only)"**: Calls `payBill(bill._id)` with no transaction ID.

---

### Task 8: End-to-End Test Suite & Verification

**Files:**
- Create: `backend/test-sms-suite-e2e.js`

- [x] **Step 1: Write comprehensive regression runner**

Create `backend/test-sms-suite-e2e.js` executing all unit/integration tests in sequence:
- `test-sms-parser-full.js`
- `test-multi-card-resolver.js`
- `test-sms-promo-filter.js`
- `test-merchant-knowledge-api.js`
- `test-bill-sms-reconciliation.js`
- `test-transfer-holding-mock.js`

- [x] **Step 2: Run test suite**

Run: `node backend/test-sms-suite-e2e.js`
Expected: All suites PASS with 0 failures.
