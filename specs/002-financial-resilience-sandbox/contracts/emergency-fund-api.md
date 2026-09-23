# Emergency Fund API Contract

**Base URL**: `/api/emergency-fund`  
**Authentication**: Bearer JWT (`protect` middleware)  

---

### 1. `GET /api/emergency-fund`
Calculates and returns the user's current live Financial Shield metrics.

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "targetMonths": 6,
    "essentialMonthlyBurn": 18500,
    "targetAmount": 111000,
    "currentReserveAmount": 83250,
    "fundingRatio": 75,
    "runwayDurationMonths": 4.5,
    "protectionTier": "solid",
    "burnBreakdown": {
      "billsMonthly": 6200,
      "recurringMonthly": 1800,
      "installmentsMonthly": 4500,
      "discretionaryBaseline": 6000
    },
    "linkedAccount": {
      "_id": "64d0e1f2a3b4c5d6e7f8a9b0",
      "name": "Emergency Vault",
      "balance": 83250
    }
  }
}
```

---

### 2. `PUT /api/emergency-fund`
Updates user shield preferences (target coverage horizon or linked account).

**Request Body**:
```json
{
  "targetMonths": 6,
  "linkedAccountId": "64d0e1f2a3b4c5d6e7f8a9b0"
}
```

---

### 3. `POST /api/emergency-fund/deposit`
Executes a direct transfer from a checking account into the emergency fund account.

**Request Body**:
```json
{
  "fromAccountId": "64e0a1b2c3d4e5f6a7b8c9d0",
  "amount": 5000,
  "notes": "Monthly Emergency Reserve Deposit"
}
```
