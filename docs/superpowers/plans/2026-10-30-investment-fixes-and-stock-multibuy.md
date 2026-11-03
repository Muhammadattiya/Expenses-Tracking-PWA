# Investment Fixes & Multi-Asset Multi-Buy (DCA) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the USD live exchange rate display in currency investments, eliminate mobile horizontal modal swiping on iPhone (iOS Safari), and implement multi-buy lot tracking with weighted average cost basis (Dollar-Cost Averaging) and batch editing across all 3 investment types (Stocks, Gold, Foreign Currency).

**Architecture:**
- **Frontend Live Rates**: Prioritize live market exchange rates in `CurrencyCard.jsx` and `Investments.jsx` for USD holdings.
- **Frontend Modal Mobile Fixes**: Prevent horizontal overflow on iPhone 13 via `overflow-x-hidden touch-pan-y` and isolate `input[type="date"]` with `min-w-0 max-w-full block [color-scheme:dark]`.
- **Multi-Buy Architecture**:
  - Backend: Expand `Investment.js` with `purchases` subdocuments and `karat` enum `[18, 21, 24]`. Implement `buyMore`, `updateBatch`, and `deleteBatch` in `investmentService.js` that recalculate weighted average cost basis and handle double-entry ledger transfers.
  - Three dedicated "Buy More" Modals (`BuyMoreGoldModal`, `BuyMoreStockModal`, `BuyMoreCurrencyModal`) visually matching the original creation modals with locked asset identity and projected average price preview.
  - Expandable "Purchase Batches" (`سجل الدفعات`) drawer on all 3 cards (`GoldCard`, `StockCard`, `CurrencyCard`) with "+ Buy More" buttons in both the header action cluster and drawer.
  - `EditBatchModal` for modifying historical batch prices, quantities, and dates with live recalculation.
- **Accounting & Ledger**: Weighted average cost basis used for sales, preserving historical buy batches intact.
- **Localization**: Full Arabic and English translations in `ar.js` and `en.js`.

---

## Global Constraints

- Never use SVG displacement filters or chromatic aberration filters; pure CSS glassmorphism only (`backdrop-blur-[32px]`).
- Core visual identity is Copper Brown (`#8D6346`).
- All new text must use localization files (`ar.js` and `en.js`).
- All modals must use `createPortal(..., document.body)`.
- Prevent horizontal scrollbars (`overflow-x-hidden`) on mobile.
- Double-entry accounting via system `Investments` account (`excludeFromTotal: true`).

---

### Task 1: Fix USD Currency Live Rate Precedence

**Files:**
- Modify: `frontend/src/components/investments/CurrencyCard.jsx:22-26`
- Modify: `frontend/src/pages/Investments.jsx:120-124`

- [ ] **Step 1: Update rate calculation in CurrencyCard.jsx**
  In `frontend/src/components/investments/CurrencyCard.jsx`:
  Change lines 23-25 to:
  ```javascript
  const effectiveRate = (currCode === 'USD' && liveUsdRate)
    ? liveUsdRate
    : (item.currentPrice || item.purchasePrice);
  ```

- [ ] **Step 2: Update rate calculation in Investments.jsx**
  In `frontend/src/pages/Investments.jsx` inside `getEffectiveItemValue`:
  Change lines 122-123 to:
  ```javascript
  const liveRate = (code === 'USD' && gold?.usdToEgp) ? gold.usdToEgp : (item.currentPrice || item.purchasePrice);
  ```

---

### Task 2: Eliminate Modal Horizontal Swipe & Constrain Date Inputs on Mobile

**Files:**
- Modify: `frontend/src/components/investments/GoldInvestmentModal.jsx`
- Modify: `frontend/src/components/investments/StockInvestmentModal.jsx`
- Modify: `frontend/src/components/investments/CurrencyInvestmentModal.jsx`
- Modify: `frontend/src/components/investments/SellInvestmentModal.jsx`
- Modify: `frontend/src/components/investments/DeleteInvestmentModal.jsx`

- [ ] **Step 1: Add overflow and touch constraints to all modal wrappers**
  In each modal, update outer wrapper and dialog:
  ```jsx
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-x-hidden touch-pan-y" dir={isRTL ? 'rtl' : 'ltr'}>
  ```
  Ensure the dialog has `max-w-md w-full overflow-hidden overflow-x-hidden`.
  Ensure the scrollable body has `overflow-y-auto overflow-x-hidden`.

- [ ] **Step 2: Constrain date inputs**
  Wrap each `<input type="date">` in `<div className="w-full min-w-0 max-w-full overflow-hidden">` and ensure `className` contains `w-full min-w-0 max-w-full block [color-scheme:dark]`.

---

### Task 3: Backend Multi-Buy, Weighted Average & Batch CRUD Service

**Files:**
- Modify: `backend/models/Investment.js`
- Modify: `backend/services/investmentService.js`
- Modify: `backend/controllers/investmentController.js`
- Modify: `backend/routes/investments.js`

- [ ] **Step 1: Update Investment Model**
  - Update `karat` enum to `[18, 21, 24]`.
  - Add `purchases` schema:
    ```javascript
    purchases: [{
      quantity: { type: Number, required: true, min: 0.00000001 },
      price: { type: Number, required: true, min: 0 },
      date: { type: Date, default: Date.now },
      from_account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
      transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
      title: { type: String }
    }]
    ```

- [ ] **Step 2: Initialize `purchases` on `create`**
  In `investmentService.create`:
  Populate initial lot in `purchases` with the initial purchase quantity, price, date, and `from_account`.

- [ ] **Step 3: Implement `buyMore` in `investmentService.js`**
  Calculates new total quantity and new weighted average price:
  `((currentQty * currentPrice) + (newQty * newPrice)) / (currentQty + newQty)`.
  Creates a ledger transfer transaction if `from_account` is provided. Appends to `purchases`.

- [ ] **Step 4: Implement `updateBatch` in `investmentService.js`**
  Updates the specific purchase batch in `purchases` (quantity, price, date).
  Recalculates total `quantity` and weighted average `purchasePrice` across all batches.
  Updates linked transaction amount if account deduction exists.

- [ ] **Step 5: Implement `deleteBatch` in `investmentService.js`**
  Removes the specified batch from `purchases`.
  If batches remain: recalculates total `quantity` and weighted average `purchasePrice`.
  Optionally reverses the linked transaction if requested.

- [ ] **Step 6: Expose Routes and Controllers**
  - `POST /api/investments/:id/buy-more` -> `controller.buyMore`
  - `PUT /api/investments/:id/batches/:batchId` -> `controller.updateBatch`
  - `DELETE /api/investments/:id/batches/:batchId` -> `controller.deleteBatch`

---

### Task 4: Frontend API & Localization Strings

**Files:**
- Modify: `frontend/src/api/investments.js`
- Modify: `frontend/src/locales/ar.js`
- Modify: `frontend/src/locales/en.js`

- [ ] **Step 1: Add API functions in `api/investments.js`**
  - `buyMoreInvestment(id, data)`
  - `updateInvestmentBatch(id, batchId, data)`
  - `deleteInvestmentBatch(id, batchId, revertTransaction)`

- [ ] **Step 2: Add localization keys in `ar.js` and `en.js`**
  - `investments.buyMore`: "شراء إضافي" / "Buy More"
  - `investments.purchaseBatches`: "سجل الدفعات" / "Purchase Batches"
  - `investments.batch`: "دفعة" / "Batch"
  - `investments.editBatch`: "تعديل الدفعة" / "Edit Batch"
  - `investments.deleteBatch`: "حذف الدفعة" / "Delete Batch"
  - `investments.deleteBatchConfirm`: "هل أنت متأكد من حذف هذه الدفعة؟" / "Are you sure you want to delete this batch?"
  - `investments.projectedAvgPrice`: "السعر المتوسط الجديد" / "New Average Price"
  - `investments.newQuantity`: "الكمية المضافة" / "Additional Quantity"
  - `investments.buyPriceUnit`: "سعر الشراء" / "Purchase Price"
  - `investments.buySuccess`: "تمت إضافة العملية وتحديث متوسط السعر" / "Purchase added and average price updated"

---

### Task 5: The Three "Buy More" Modals & EditBatchModal

**Files:**
- Create: `frontend/src/components/investments/BuyMoreGoldModal.jsx`
- Create: `frontend/src/components/investments/BuyMoreStockModal.jsx`
- Create: `frontend/src/components/investments/BuyMoreCurrencyModal.jsx`
- Create: `frontend/src/components/investments/EditBatchModal.jsx`

- [ ] **Step 1: Build `BuyMoreGoldModal.jsx`**
  Mirrors `GoldInvestmentModal` styling, locks gold asset name and karat, provides inputs for additional grams, buy rate/gram (prefilled with live rate if available), date, and funding account. Shows projected new average rate.

- [ ] **Step 2: Build `BuyMoreStockModal.jsx`**
  Mirrors `StockInvestmentModal` styling, locks stock name and symbol, provides inputs for additional shares, price per share, date, and funding account. Shows projected new average price.

- [ ] **Step 3: Build `BuyMoreCurrencyModal.jsx`**
  Mirrors `CurrencyInvestmentModal` styling, locks currency code, provides inputs for additional foreign amount, exchange rate (prefilled with live USD rate if USD), date, and funding account. Shows projected new average rate.

- [ ] **Step 4: Build `EditBatchModal.jsx`**
  A focused modal to edit a batch's quantity, price, and date with live preview of the recalculated average price.

---

### Task 6: Card UI Updates (`GoldCard`, `StockCard`, `CurrencyCard`) & `Investments.jsx`

**Files:**
- Modify: `frontend/src/components/investments/GoldCard.jsx`
- Modify: `frontend/src/components/investments/StockCard.jsx`
- Modify: `frontend/src/components/investments/CurrencyCard.jsx`
- Modify: `frontend/src/pages/Investments.jsx`

- [ ] **Step 1: Add "+ Buy More" Button to Card Headers**
  In `GoldCard`, `StockCard`, and `CurrencyCard`:
  Add a sleek `+` button in the action cluster next to Sell (`<ArrowUpRight />`).

- [ ] **Step 2: Add Expandable Purchase Batches Drawer**
  In `GoldCard`, `StockCard`, and `CurrencyCard`:
  If `item.purchases?.length > 1` (or click to view), render toggle button `سجل الدفعات (X)`.
  When clicked, animate open `<motion.div>` listing all batches with:
  - Batch date, quantity, unit price, total cost.
  - Edit (`<Pencil />`) and Delete (`<Trash2 />`) icon buttons per batch.
  - Bottom "+ Buy More" button inside drawer.

- [ ] **Step 3: Wire Up Modals in `Investments.jsx`**
  Integrate handlers and state for:
  - `buyingMoreItem` -> renders `BuyMoreGoldModal`, `BuyMoreStockModal`, or `BuyMoreCurrencyModal`.
  - `editingBatchInfo` -> renders `EditBatchModal`.
  - Batch deletion with toast notification and `finova-data-updated` event.

---

### Task 7: Verification & Testing

- [ ] **Step 1: Verify USD Live Rate display** in currency cards.
- [ ] **Step 2: Verify iPhone 13 (390px) modal viewports** without horizontal scrolling.
- [ ] **Step 3: Verify multi-buy calculations** across stocks, gold, and currency.
- [ ] **Step 4: Verify batch editing and deletion** recalculates weighted averages properly.
