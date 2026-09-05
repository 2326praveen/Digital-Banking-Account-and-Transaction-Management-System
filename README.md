# Digital Banking System (P10) — Member 2 Module
## Beneficiary Management & Fund Transfer Engine

**Branch:** `feature/member2-beneficiary-transfer`  
**Role:** Member 2 (Scope: Module 4, Module 5, Module 8)

---

## 1. Project Scope & Architecture

This repository contains the implementation of **Member 2's scope** for the academic Digital Banking Account & Transaction Management System (P10):
- **Module 4: Beneficiary Management** (CRUD, ownership verification, account resolution, duplicate & self-beneficiary prevention)
- **Module 5: Fund Transfer Engine** (Strict 15-step validation pipeline, atomic balance mutations, minor-unit money arithmetic)
- **Module 8: Minimum Balance & Daily Transfer Limit Enforcement** (Account-driven dynamic minimum balance and daily transfer limits in `Asia/Kolkata` timezone)

### Explicitly Out of Scope (Handled by other members)
- **Member 1 Scope:** Customer registration, login, KYC verification, JWT issuance, account opening, approval workflow, staff dashboard.
- **Member 3 Scope:** Transaction ledger persistence (DEBIT/CREDIT records), audit logs, monthly statement generation, suspicious transaction flagging, freeze/unfreeze account actions.

---

## 2. Integration Contracts

### Contract with Member 1 (Auth & Account Management)
Member 2 consumes the following contracts from Member 1:
- `middleware/auth.js`: Verifies JWT Bearer token and attaches `req.user = { userId, role }`.
- `middleware/role.js`: Restricts routes by role (`role('CUSTOMER')`).
- `models/Account.js`: Account document schema with fields:
  ```js
  {
    userId: ObjectId (ref: 'User'),
    accountNumber: String (unique),
    type: String, // 'SAVINGS' | 'CHECKING' | 'SALARY' | 'CURRENT'
    balance: Number, // major currency units (e.g. ₹45000.50)
    status: String, // 'ACTIVE' | 'PENDING' | 'FROZEN' | 'REJECTED' | 'CLOSED'
    minimumBalance: Number, // e.g. ₹1000
    dailyTransferLimit: Number // e.g. ₹50000
  }
  ```
> **Stand-In Implementation:** This branch provides minimal, compatible stand-ins marked with `// TODO: replace with Member 1's implementation on merge` so Member 2's module runs and tests independently without creating duplicate or incompatible auth systems.

### Contract with Member 3 (Transaction Ledger & Auditing)
Member 2 provides clean integration hooks for Member 3's transaction ledger:
- **`transferId` Format:** `TRF-YYYYMMDD-NNNNNN` (e.g. `TRF-20260905-000001`), generated atomically and persisted via MongoDB counters so Member 3 can attach matching DEBIT/CREDIT ledger records without duplication.
- **`recordOutgoingTransfer({ accountId, amountMinor, date, transferId })`:** Hook to be replaced with Member 3's `Transaction.create(...)` on merge.
- **`getDailyOutgoingTotal(accountId, date)`:** Hook in `utils/transactionHelpers.js` calculating today's outgoing transfers in `Asia/Kolkata` timezone (to be hooked into `Transaction.aggregate` on merge).

---

## 3. Beneficiary Management (Module 4)

### Schema & Indexing (`models/Beneficiary.js`)
```js
{
  accountId: ObjectId (ref: "Account", required),
  beneficiaryAccountNumber: String (required, trim),
  nickname: String (required, 2-50 chars),
  createdAt: Date,
  updatedAt: Date
}
```
- **Compound Unique Index:** `{ accountId: 1, beneficiaryAccountNumber: 1 }` prevents adding duplicate beneficiaries under the same source account.

### Business Rules & Ownership Verification
1. **Ownership Enforcement:** `accountId` must belong to `req.user.userId` (403 `ACCOUNT_NOT_OWNED`).
2. **Account Status:** Source account must be `ACTIVE` (400 `ACCOUNT_NOT_ACTIVE`).
3. **Destination Resolution:** `beneficiaryAccountNumber` must resolve to an existing account (404 `BENEFICIARY_ACCOUNT_NOT_FOUND`).
4. **Self-Beneficiary Rejection:** Cannot add own account as a beneficiary (400 `SELF_BENEFICIARY`).
5. **Duplicate Rejection:** Cannot add duplicate beneficiary to the same source account (409 `DUPLICATE_BENEFICIARY`).

### API Endpoints
| Method | Endpoint | Auth / Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/beneficiaries` | Customer | Add a new beneficiary |
| `GET` | `/api/beneficiaries/account/:accountId` | Customer | List all beneficiaries for source account |
| `GET` | `/api/beneficiaries/:id` | Customer | Get a single beneficiary by ID (or list by account ID) |
| `DELETE` | `/api/beneficiaries/:id` | Customer | Delete own beneficiary |

---

## 4. Fund Transfer Engine & Limit Enforcement (Modules 5 & 8)

### Endpoint
`POST /api/transactions/transfer` (Protected: `CUSTOMER` role)

#### Request Body
```json
{
  "fromAccountId": "60d0fe4f5311236168a109ca",
  "beneficiaryId": "60d0fe4f5311236168a109cb",
  "amount": 5000.50
}
```

### Strict 15-Step Validation Sequence
Every fund transfer strictly executes through the following 15-step sequence in `services/transferService.js`:
1. **Authenticate & Validate Input IDs:** Verify ObjectId formats (400 `INVALID_ID`).
2. **Find Source Account:** Verify source account exists in DB (404 `ACCOUNT_NOT_FOUND`).
3. **Verify Ownership:** Verify `sourceAccount.userId === req.user.userId` (403 `ACCOUNT_NOT_OWNED`).
4. **Verify Source Status:** Verify source account is `ACTIVE` (409 `ACCOUNT_NOT_ACTIVE`).
5. **Find Beneficiary:** Lookup beneficiary by `beneficiaryId` (404 `BENEFICIARY_NOT_FOUND`).
6. **Verify Beneficiary Ownership:** Verify `beneficiary.accountId === sourceAccount._id` (403 `BENEFICIARY_NOT_OWNED`).
7. **Resolve Destination Account:** Find destination account by `beneficiary.beneficiaryAccountNumber` (404 `ACCOUNT_NOT_FOUND`).
8. **Verify Destination Status:** Verify destination account is `ACTIVE` (409 `ACCOUNT_NOT_ACTIVE`).
9. **Reject Self-Transfer:** Reject if `fromAccountId === destinationAccount._id` (400 `SELF_TRANSFER`).
10. **Validate Amount Precision & Convert to Minor Units:** Amount must be positive numeric with $\le 2$ decimal places (400 `INVALID_AMOUNT`). Convert once to integer paise (minor units) for all downstream checks.
11. **Check Sufficient Balance:** Verify `sourceAccount.balance >= amount` (409 `INSUFFICIENT_BALANCE`).
12. **Check Minimum Balance Requirement:** Verify `balance - amount >= sourceAccount.minimumBalance` reading dynamic value from the DB (409 `MINIMUM_BALANCE_VIOLATION`).
13. **Check Daily Transfer Limit:** Calculate sum of today's successful outgoing transfers in `Asia/Kolkata` timezone + new amount $\le$ `sourceAccount.dailyTransferLimit` (409 `DAILY_LIMIT_EXCEEDED`).
14. **Atomic Balance Update:** Execute database balance updates atomically using a MongoDB transaction session with conditional filter guards.
15. **Return Success Response:** Return transfer result with `transferId`, accounts, amount, and `remainingBalance`.

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "data": {
    "transferId": "TRF-20260905-000001",
    "fromAccount": "10000001",
    "toAccount": "10000002",
    "amount": 5000.50,
    "remainingBalance": 44999.50
  }
}
```

---

## 5. Architectural Highlights

### Integer Minor-Units Arithmetic
To prevent floating-point drift (e.g. `0.1 + 0.2 === 0.30000000000000004`), amounts are converted to integer paise (`toMinorUnits(amount) = Math.round(amount * 100)`) at validation time. All balance evaluations, comparisons, and arithmetic are executed in integer minor units, and converted back to standard currency format (`toMajorUnits`) only at the response boundary.

### Atomic Persistent Transfer ID Generator
Transfer IDs (`TRF-YYYYMMDD-NNNNNN`) are backed by an atomic `$inc` on the MongoDB `Counter` collection. This guarantees gapless, monotonically increasing, collision-free transfer IDs across concurrent requests and server restarts.

### Atomicity & Concurrency Control
Transfers execute inside a MongoDB transaction session (`startSession` $\rightarrow$ `startTransaction` $\rightarrow$ `commitTransaction`).
In addition, the update query includes database-level conditional expression guards:
```js
{
  _id: sourceAccount._id,
  status: 'ACTIVE',
  $expr: {
    $gte: [
      { $round: [{ $subtract: ['$balance', transferAmountMajor] }, 2] },
      minBalanceMajor
    ]
  }
}
```
This guarantees that two simultaneous requests attempting to overdraw the account cannot both succeed, eliminating race conditions.

> **Standalone MongoDB Fallback:** When connecting to a standalone MongoDB instance without a replica set, multi-document transactions throw an unsupported error. The engine catches this and applies the conditional atomic update filter with compensation logic, documented here explicitly.

---

## 6. Error Code Reference

| Status | Error Code | Scenario |
| :--- | :--- | :--- |
| **400** | `INVALID_INPUT` / `INVALID_ID` | Malformed parameters, missing fields, or invalid ObjectId string |
| **400** | `INVALID_AMOUNT` | Zero, negative, non-numeric, or $>2$ decimal precision amount |
| **400** | `SELF_BENEFICIARY` | Attempting to add own account as beneficiary |
| **400** | `SELF_TRANSFER` | Attempting to transfer funds to the source account |
| **400** / **409** | `ACCOUNT_NOT_ACTIVE` | Source or destination account is `PENDING`, `FROZEN`, `REJECTED`, or `CLOSED` |
| **401** | `AUTH_REQUIRED` / `INVALID_TOKEN` | Missing or invalid JWT authorization header |
| **403** | `ACCOUNT_NOT_OWNED` | Source account does not belong to authenticated user |
| **403** | `BENEFICIARY_NOT_OWNED` | Beneficiary belongs to another source account / user |
| **403** | `FORBIDDEN` | Insufficient role permission |
| **404** | `ACCOUNT_NOT_FOUND` | Source or destination account not found |
| **404** | `BENEFICIARY_NOT_FOUND` | Beneficiary ID not found |
| **404** | `BENEFICIARY_ACCOUNT_NOT_FOUND` | Beneficiary account number does not resolve to an existing account |
| **409** | `DUPLICATE_BENEFICIARY` | Beneficiary already exists for this source account |
| **409** | `INSUFFICIENT_BALANCE` | Transfer amount exceeds current account balance |
| **409** | `MINIMUM_BALANCE_VIOLATION` | Transfer would reduce balance below account's required minimum balance |
| **409** | `DAILY_LIMIT_EXCEEDED` | Total outgoing transfers for today in `Asia/Kolkata` exceed daily limit |

---

## 7. Testing & Verification

### Automated Integration Test Suite (Replica Set Backed)
The test suite utilizes `MongoMemoryReplSet` (`mongodb-memory-server`) to spawn a single-node replica set with the WiredTiger storage engine during testing. This ensures multi-document MongoDB transactions (`session.startTransaction()`) are fully exercised and verified.

To run the test suite:
```bash
npm test
```

### Postman Collection
The collection is included in [`postman_collection.json`](./postman_collection.json) covering all positive and negative scenarios for both Beneficiary Management and Fund Transfer Engine.
