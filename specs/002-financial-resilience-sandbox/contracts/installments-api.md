# Installments API Contract

**Base URL**: `/api/installments`  
**Authentication**: Bearer JWT (`protect` middleware)  

---

### 1. `GET /api/installments`
Fetches all user installments and aggregate burden summary.

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalMonthlyBurden": 6400,
      "totalRemainingObligations": 54000,
      "activeCount": 3,
      "debtToIncomeRatio": 28.5
    },
    "installments": [
      {
        "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "title": "iPhone 15 Pro",
        "provider": "valu",
        "totalAmount": 42000,
        "downPayment": 6000,
        "monthlyAmount": 3000,
        "totalMonths": 12,
        "paidMonths": 4,
        "remainingAmount": 24000,
        "progressPercent": 33,
        "dueDayOfMonth": 5,
        "nextDueDate": "2026-10-05T00:00:00.000Z",
        "isOverdue": false,
        "autoPay": false,
        "linkedAccountId": {
          "_id": "64e0a1b2c3d4e5f6a7b8c9d0",
          "name": "CIB Checking",
          "color": "#3b82f6"
        },
        "status": "active"
      }
    ]
  }
}
```

---

### 2. `POST /api/installments`
Creates a new installment contract. If `downPayment > 0`, optionally records an initial expense transaction.

**Request Body**:
```json
{
  "title": "Home Air Conditioner",
  "provider": "souhoola",
  "totalAmount": 24000,
  "downPayment": 4000,
  "monthlyAmount": 2000,
  "totalMonths": 10,
  "dueDayOfMonth": 10,
  "linkedAccountId": "64e0a1b2c3d4e5f6a7b8c9d0",
  "autoPay": false,
  "recordDownPaymentTransaction": true
}
```

---

### 3. `POST /api/installments/:id/pay`
Executes single-tap monthly installment payment.

**Request Body**:
```json
{
  "paymentDate": "2026-10-05T12:00:00.000Z",
  "accountId": "64e0a1b2c3d4e5f6a7b8c9d0"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "installment": {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "paidMonths": 5,
      "remainingAmount": 21000,
      "status": "active"
    },
    "transactionId": "64f2b3c4d5e6f7a8b9c0d1e2"
  }
}
```

---

### 4. `PUT /api/installments/:id`
Updates an existing installment plan (e.g. title, provider, autoPay, notes, dueDayOfMonth).

**Request Body**:
```json
{
  "title": "Home Air Conditioner (Bedrooms)",
  "dueDayOfMonth": 15,
  "autoPay": true,
  "notes": "Updated auto-debit preference"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "title": "Home Air Conditioner (Bedrooms)",
    "dueDayOfMonth": 15,
    "autoPay": true,
    "status": "active"
  }
}
```

---

### 5. `DELETE /api/installments/:id`
Deletes an installment contract.

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "تم حذف القسط بنجاح"
}
```
