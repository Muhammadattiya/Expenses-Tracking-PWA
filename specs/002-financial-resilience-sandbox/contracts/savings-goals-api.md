# Savings Goals API Contract

**Base URL**: `/api/savings-goals`  
**Authentication**: Bearer JWT (`protect` middleware)  

---

### 1. `GET /api/savings-goals`
Returns all active and achieved savings goals with live pace computations.

**Response `200 OK`**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "64c1a2b3c4d5e6f7a8b9c0d9",
      "title": "مقدم سيارة (Car Down Payment)",
      "category": "car",
      "targetAmount": 80000,
      "currentAmount": 32000,
      "progressPercent": 40,
      "targetDate": "2027-06-01T00:00:00.000Z",
      "monthsRemaining": 8,
      "requiredMonthlyPace": 6000,
      "currentMonthDeposits": 6000,
      "paceStatus": "on_track",
      "priority": "high",
      "allocationType": "virtual_jar",
      "linkedAccountId": {
        "_id": "64d0e1f2a3b4c5d6e7f8a9b0",
        "name": "Savings Account"
      },
      "status": "active"
    }
  ]
}
```

---

### 2. `POST /api/savings-goals`
Creates a new savings goal pot.

**Request Body**:
```json
{
  "title": "رحلة العمرة (Umrah Trip)",
  "category": "hajj_umrah",
  "targetAmount": 35000,
  "targetDate": "2027-03-01T00:00:00.000Z",
  "priority": "high",
  "allocationType": "virtual_jar",
  "linkedAccountId": "64d0e1f2a3b4c5d6e7f8a9b0"
}
```

---

### 3. `POST /api/savings-goals/:id/contribute`
Executes a deposit transfer from a checking account into the goal pot.

**Request Body**:
```json
{
  "fromAccountId": "64e0a1b2c3d4e5f6a7b8c9d0",
  "amount": 3500,
  "notes": "October Goal Deposit"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "goal": {
      "_id": "64c1a2b3c4d5e6f7a8b9c0d9",
      "currentAmount": 35500,
      "progressPercent": 101,
      "status": "achieved",
      "surplusAmount": 500
    },
    "transactionId": "64f2b3c4d5e6f7a8b9c0d1e5"
  }
}
```

---

### 4. `PUT /api/savings-goals/:id`
Updates savings goal details (e.g. title, targetAmount, targetDate, priority, status).

**Request Body**:
```json
{
  "title": "رحلة العمرة (محدث)",
  "targetAmount": 40000,
  "priority": "high"
}
```

**Response `200 OK`**:
```json
{
  "success": true,
  "data": {
    "_id": "64c1a2b3c4d5e6f7a8b9c0d9",
    "title": "رحلة العمرة (محدث)",
    "targetAmount": 40000,
    "requiredMonthlyPace": 4500,
    "status": "active"
  }
}
```

---

### 5. `DELETE /api/savings-goals/:id`
Deletes a savings goal.

**Response `200 OK`**:
```json
{
  "success": true,
  "message": "تم حذف هدف الادخار بنجاح"
}
```
