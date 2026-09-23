# Data Model: Financial Resilience & Decision Ecosystem

**Feature**: `002-financial-resilience-sandbox`  
**Date**: 2026-09-22  
**Status**: Completed  

---

## 1. Entity: `Installment`

Represents a structured financing contract, BNPL plan, or bank personal loan.

### Database Schema (Mongoose & Dexie IndexedDB)

```javascript
const installmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  provider: { 
    type: String, 
    enum: ['valu', 'souhoola', 'sympl', 'tabby', 'tamara', 'bank_cib', 'bank_nbe', 'bank_misr', 'gameya', 'other'],
    default: 'other' 
  },
  providerName: { type: String, trim: true }, // Custom name if 'other'
  totalAmount: { type: Number, required: true, min: 0 },
  downPayment: { type: Number, default: 0, min: 0 },
  monthlyAmount: { type: Number, required: true, min: 0 },
  totalMonths: { type: Number, required: true, min: 1 },
  paidMonths: { type: Number, default: 0, min: 0 },
  dueDayOfMonth: { type: Number, required: true, min: 1, max: 31 },
  linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  status: { type: String, enum: ['active', 'settled', 'paused'], default: 'active', index: true },
  autoPay: { type: Boolean, default: false },
  startDate: { type: Date, default: Date.now },
  nextDueDate: { type: Date, required: true },
  notes: { type: String, trim: true }
}, { timestamps: true });

// Compound Indexes
installmentSchema.index({ user: 1, status: 1 });
installmentSchema.index({ user: 1, nextDueDate: 1 });
```

### Derived / Computed Properties
- `remainingAmount`: `(totalMonths - paidMonths) * monthlyAmount`
- `progressPercent`: `Math.round((paidMonths / totalMonths) * 100)`
- `isOverdue`: `status === 'active' && nextDueDate < Date.now()`
- `clampedNextDueDate`: Clamps `dueDayOfMonth` to `Math.min(dueDayOfMonth, new Date(year, month + 1, 0).getDate())` to handle 28/29/30 day calendar boundaries.

---

## 2. Entity: `EmergencyFund` (Configuration & Shield State)

Stores the user's customized emergency coverage parameters.

```javascript
const emergencyFundSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  targetMonths: { type: Number, default: 6, min: 1, max: 24 }, // Recommended: 3 to 6
  linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }, // Primary reserve account
  customMonthlyBurnOverride: { type: Number, default: null }, // Optional user manual override
  notes: { type: String }
}, { timestamps: true });
```

### Computed Shield DTO (returned to Client)
```typescript
interface EmergencyFundShieldDTO {
  targetMonths: number;
  essentialMonthlyBurn: number;
  targetAmount: number;
  currentReserveAmount: number;
  fundingRatio: number; // percentage: (currentReserveAmount / targetAmount) * 100
  runwayDurationMonths: number; // currentReserveAmount / essentialMonthlyBurn
  protectionTier: 'vulnerable' | 'basic' | 'solid' | 'fortress';
  burnBreakdown: {
    billsMonthly: number;
    recurringMonthly: number;
    installmentsMonthly: number;
    discretionaryBaseline: number;
  };
  linkedAccount: { id: string; name: string; balance: number } | null;
}
```

---

## 3. Entity: `SavingsGoal`

Represents a visual savings pot with milestone pace tracking.

```javascript
const savingsGoalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    enum: ['car', 'marriage', 'vacation', 'real_estate', 'hajj_umrah', 'education', 'electronics', 'other'],
    default: 'other' 
  },
  icon: { type: String, default: 'Target' },
  color: { type: String, default: '#8D6346' },
  targetAmount: { type: Number, required: true, min: 1 },
  currentAmount: { type: Number, default: 0, min: 0 },
  targetDate: { type: Date, required: true },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  allocationType: { type: String, enum: ['dedicated', 'virtual_jar'], default: 'virtual_jar' },
  linkedAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  status: { type: String, enum: ['active', 'achieved', 'paused', 'cancelled'], default: 'active', index: true }
}, { timestamps: true });

savingsGoalSchema.index({ user: 1, status: 1 });
savingsGoalSchema.index({ user: 1, targetDate: 1 });
```

### Derived Pace & Over-Funding Computations
- `monthsRemaining`: `Math.max(1, Math.ceil((targetDate - Date.now()) / (1000 * 60 * 60 * 24 * 30)))`
- `requiredMonthlyPace`: `currentAmount >= targetAmount ? 0 : Math.max(0, Math.ceil((targetAmount - currentAmount) / monthsRemaining))`
- `progressPercent`: `Math.round((currentAmount / targetAmount) * 100)` (may exceed 100% on over-funding)
- `surplusAmount`: `Math.max(0, currentAmount - targetAmount)`
- `paceStatus`:
  - `ahead`: Current month contributions $\ge 120\%$ of required pace (or `currentAmount >= targetAmount`).
  - `on_track`: Current month contributions between $90\%$ and $119\%$ of required pace.
  - `behind`: Current month contributions $< 90\%$ of required pace.

---

## 4. Transient DTOs: Sandbox Simulation Pipeline & Decision

### `SimulationTimelinePoint`
Generated during discrete event simulation:
```typescript
interface SimulationTimelinePoint {
  date: string; // ISO date or month label (e.g. "2026-10-01" or "أكتوبر")
  baselineBalance: number;
  simulatedBalance: number;
  safetyFloorBalance: number;
  eventsOnDay?: {
    income: number;
    bills: number;
    installments: number;
    simulatedActionCost: number;
  };
}
```

### `DecisionVerdict`
Synthesized human-readable verdict:
```typescript
interface DecisionVerdict {
  status: 'safe' | 'caution' | 'critical';
  titleAr: string;
  titleEn: string;
  reasonAr: string;
  reasonEn: string;
  recoveryDays: number | null; // null if dailySavingsRate <= 0 (unrecoverable deficit)
  emergencyRunwayMonths: number;
  debtToIncomeRatio: number; // percentage
  goalDelays: Array<{
    goalId: string;
    goalTitle: string;
    delayDays: number;
    delayMonths: number;
    originalTargetDate: string;
    projectedTargetDate: string;
  }>;
  tradeOffSuggestions: Array<{
    type: 'installment_option' | 'budget_trim' | 'timing_delay';
    descriptionAr: string;
    descriptionEn: string;
    suggestedAction: any;
  }>;
}
```

### Decision Matrix Logic
1. **`critical`**: `min(simulatedBalance) < 0` || `simulatedBalance < safetyFloor * 0.75` || `newDTI > 40` || `(dailySavingsRate <= 0 && cashOutflow > 0)`.
2. **`caution`**: `simulatedBalance < safetyFloor` || `newDTI > 30` || `recoveryDays > 90` || `any(goalDelayDays > 30)`.
3. **`safe`**: All other conditions satisfied.
