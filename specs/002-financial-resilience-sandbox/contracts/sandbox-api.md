# Financial Sandbox API Contract

**Base URL**: `/api/sandbox`  
**Authentication**: Bearer JWT (`protect` middleware)  

---

### 1. `POST /api/sandbox/run`
Runs a multi-month deterministic discrete-event simulation. Evaluates timeline, decision verdict, recovery days, and goal delays.

**Request Body**:
```json
{
  "horizonMonths": 6,
  "actions": [
    {
      "type": "purchase",
      "payload": {
        "amount": 25000,
        "accountId": "64e0a1b2c3d4e5f6a7b8c9d0",
        "categoryId": "64c0a1b2c3d4e5f6a7b8c9d9",
        "notes": "New Laptop"
      }
    }
  ]
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "verdict": {
      "status": "caution",
      "titleAr": "ممكن مع الحذر",
      "titleEn": "Viable with Caution",
      "reasonAr": "احتياطي الطوارئ سينخفض إلى 2.1 شهر فقط (الموصى به 3 أشهر على الأقل).",
      "reasonEn": "Emergency runway drops to 2.1 months (minimum 3 months recommended).",
      "recoveryDays": 52,
      "emergencyRunwayMonths": 2.1,
      "debtToIncomeRatio": 28.5,
      "goalDelays": [
        {
          "goalId": "64c1a2b3c4d5e6f7a8b9c0d9",
          "goalTitle": "مقدم سيارة",
          "delayDays": 60,
          "delayMonths": 2,
          "originalTargetDate": "2027-06-01T00:00:00.000Z",
          "projectedTargetDate": "2027-08-01T00:00:00.000Z"
        }
      ],
      "tradeOffSuggestions": [
        {
          "type": "installment_option",
          "descriptionAr": "تقسيط المبلغ على 6 أشهر بقسط 4,200 ج.م شهرياً يحافظ على درع الطوارئ بنسبة 100%.",
          "descriptionEn": "Splitting into 6 monthly installments of 4,200 EGP preserves your emergency shield at 100%."
        }
      ]
    },
    "timeline": [
      {
        "month": "أكتوبر 2026",
        "baselineBalance": 95000,
        "simulatedBalance": 70000,
        "safetyFloorBalance": 55500
      },
      {
        "month": "نوفمبر 2026",
        "baselineBalance": 102000,
        "simulatedBalance": 77000,
        "safetyFloorBalance": 55500
      }
    ],
    "before": {
      "currentBalance": 120000,
      "cashAvailable": 120000,
      "cashRemaining": 85000,
      "netWorth": 165000
    },
    "after": {
      "currentBalance": 95000,
      "cashAvailable": 95000,
      "cashRemaining": 60000,
      "netWorth": 140000
    },
    "difference": {
      "balance": -25000,
      "netWorth": -25000,
      "cashRemaining": -25000
    },
    "accountsImpact": [
      {
        "_id": "64e0a1b2c3d4e5f6a7b8c9d0",
        "name": "CIB Checking",
        "beforeBalance": 60000,
        "afterBalance": 35000,
        "difference": -25000
      }
    ]
  }
}
```

---

### 2. `POST /api/sandbox/apply`
**Atomic Commit-to-Reality Execution Bridge**. Converts approved simulation actions into real live documents within an ACID MongoDB transaction.

**Request Body**:
```json
{
  "actions": [
    {
      "type": "purchase",
      "payload": {
        "amount": 25000,
        "accountId": "64e0a1b2c3d4e5f6a7b8c9d0",
        "categoryId": "64c0a1b2c3d4e5f6a7b8c9d9",
        "notes": "New Laptop (Executed from Sandbox)"
      }
    }
  ]
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "تم تطبيق الخطة المالية بنجاح في حسابك الحقيقي",
  "data": {
    "transactionsCreated": 1,
    "installmentsCreated": 0,
    "budgetsUpdated": 0
  }
}
```
