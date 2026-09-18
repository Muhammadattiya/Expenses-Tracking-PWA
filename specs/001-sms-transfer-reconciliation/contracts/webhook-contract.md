# Interface Contract: SMS Ingestion Webhook

**Endpoint**: `POST /api/sms/webhook/:userToken`  
**Protocol**: HTTPS  
**Content-Type**: `application/json` or `text/plain` or `text/*`  
**Rate Limit**: 50 requests per 15 minutes per IP  
**Payload Limit**: 5 KB  

---

## 1. Request Formats

### JSON Payload
```http
POST /api/sms/webhook/a1b2c3d4e5f6... HTTP/1.1
Host: api.finova.app
Content-Type: application/json

{
  "text": "IPN transfer sent with amount of EGP 350.00 from 0694 on 18/09 at 07:32 AM. Ref# 43f3ef2a. For more details call 19700"
}
```

### Raw Text Payload (iOS Shortcut Default)
```http
POST /api/sms/webhook/a1b2c3d4e5f6... HTTP/1.1
Host: api.finova.app
Content-Type: text/plain

تم إستقبال تحويل لحظي إلى حسابكم 4113 بمبلغ 350.00 جم من MOHAMED AHMED ATIYA ABDELSALAM في 07:32 يوم 9/18/26 رقم المعاملة 43f3ef2a للمزيد أتصل ب 16990
```

---

## 2. Response Specifications

### Success: New Transaction Created (Temporary or Independent)
- **Status Code**: `200 OK`
- **Body**:
  ```json
  {
    "message": "Transaction saved",
    "id": "66e9f1a23c4d5e6f7a8b9c0d",
    "type": "expense"
  }
  ```

### Success: Self-Transfer Reconciled
- **Status Code**: `200 OK`
- **Body**:
  ```json
  {
    "message": "Self-transfer reconciled",
    "id": "66e9f1a23c4d5e6f7a8b9c0d",
    "type": "transfer",
    "from_account": "66e9a1111111111111111111",
    "to_account": "66e9b2222222222222222222",
    "amount": 350.00
  }
  ```

### Success: Deduplicated (Message already logged or part of reconciled transfer)
- **Status Code**: `200 OK`
- **Body**:
  ```json
  {
    "message": "Transaction already exists (deduplicated)",
    "id": "66e9f1a23c4d5e6f7a8b9c0d"
  }
  ```

### Ignored: Non-Financial Message
- **Status Code**: `200 OK` (so mobile shortcuts do not trigger system alerts)
- **Body**:
  ```json
  {
    "message": "Ignored: not a recognized financial transaction"
  }
  ```

### Error: Invalid Token
- **Status Code**: `404 Not Found`
- **Body**:
  ```json
  {
    "message": "Invalid webhook token"
  }
  ```

### Error: Malformed / Empty Request Body
- **Status Code**: `400 Bad Request`
- **Body**:
  ```json
  {
    "message": "Empty SMS body"
  }
  ```

### Error: Rate Limit Exceeded
- **Status Code**: `429 Too Many Requests`
- **Body**:
  ```json
  {
    "message": "Too many requests from this IP, please try again after 15 minutes"
  }
  ```
