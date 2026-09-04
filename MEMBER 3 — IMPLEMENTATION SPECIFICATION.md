# MEMBER 3 — IMPLEMENTATION SPECIFICATION
## Digital Banking Account & Transaction Management System

**Project:** P10 — Digital Banking Account & Transaction Management System  
**Course:** Advanced JavaScript Backend Frameworks — Node.js & Express JS  
**Semester:** 5th Semester — Christ University  
**Branch:** `feature/member3-ledger-statements-monitoring`

---

# 1. MEMBER 3 RESPONSIBILITY

Member 3 is responsible for implementing the following modules:

### Module 6 — Transaction Ledger
Maintain a permanent transaction history for every account.

### Module 7 — Account Statement Generation
Allow customers to retrieve transaction statements for their accounts.

### Module 9 — Suspicious Transaction Flagging
Identify potentially suspicious transactions using predefined business rules and allow bank staff to monitor flagged transactions.

### Module 11 — Interest Calculation Job
Calculate and credit interest for eligible savings accounts using a scheduled backend job.

---

# 2. STRICT SCOPE

Member 3 **MUST implement:**

- Transaction model/ledger
- Debit and credit ledger entries
- Transaction history
- Account statement API
- Date/type filtering
- Pagination for statements
- Suspicious transaction detection
- Flagged transaction API
- Staff access to flagged transactions
- Interest calculation logic
- Scheduled interest job
- Tests for all above functionality

Member 3 **MUST NOT independently redesign or replace:**

- Authentication
- JWT middleware
- User registration
- KYC
- Account creation
- Account approval
- Beneficiary management
- Fund-transfer validation
- Minimum-balance enforcement
- Account freeze/unfreeze
- Staff dashboard UI
- Main RBAC implementation

These belong to other team members.

---

# 3. IMPORTANT TEAM INTEGRATION

The project is being developed by multiple members.

Member 1 owns:

- Users
- Authentication
- KYC
- Account creation
- Account approval
- Base RBAC

Member 2 owns:

- Beneficiaries
- Fund transfers
- Minimum balance
- Daily transfer limits

Member 3 owns:

- Transaction ledger
- Statements
- Suspicious transaction detection
- Interest

Member 4 owns:

- Freeze/unfreeze
- Staff dashboard
- Integration/error handling
- Postman/documentation consolidation

Therefore, **do not create duplicate authentication, account, or transfer logic.**

Reuse the existing:

```text
User
Account
Authentication middleware
Role middleware
Transfer service
Error handling
```

from the other branches after merging.

---

# 4. EXPECTED PROJECT STRUCTURE

Follow the project's MVC structure.

Recommended structure:

```text
src/
│
├── config/
│   └── db.js
│
├── models/
│   ├── User.js
│   ├── Account.js
│   ├── Beneficiary.js
│   └── Transaction.js
│
├── controllers/
│   ├── transactionController.js
│   ├── statementController.js
│   ├── suspiciousTransactionController.js
│   └── interestController.js
│
├── routes/
│   ├── transactionRoutes.js
│   ├── statementRoutes.js
│   ├── suspiciousTransactionRoutes.js
│   └── interestRoutes.js
│
├── services/
│   ├── transactionService.js
│   ├── suspiciousTransactionService.js
│   └── interestService.js
│
├── jobs/
│   └── interestJob.js
│
├── validators/
│   ├── statementValidator.js
│   └── transactionValidator.js
│
├── middleware/
│   ├── authMiddleware.js
│   └── roleMiddleware.js
│
├── utils/
│   ├── dateUtils.js
│   └── transactionUtils.js
│
└── server.js
```

If the existing project uses a slightly different structure, **follow the existing project structure rather than creating a second architecture.**

---

# 5. MODULE 6 — TRANSACTION LEDGER

## 5.1 Purpose

Every successful transfer must create a permanent ledger record.

For example:

Customer A:

```text
Balance before: ₹20,000
Transfer: ₹5,000
Balance after: ₹15,000
```

Customer B:

```text
Balance before: ₹10,000
Received: ₹5,000
Balance after: ₹15,000
```

The ledger should preserve both sides of the transfer.

---

# 6.2 Transaction Schema

Create:

```text
models/Transaction.js
```

Recommended fields:

```javascript
{
    accountId: ObjectId,
    type: "DEBIT" | "CREDIT",
    amount: Number,
    balanceAfter: Number,
    relatedAccount: ObjectId,
    transferId: String,
    flagged: Boolean,
    flagReason: String,
    status: "SUCCESS" | "FAILED",
    createdAt: Date
}
```

Use timestamps.

Example Mongoose structure:

```javascript
const transactionSchema = new mongoose.Schema(
    {
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            required: true,
            index: true
        },

        type: {
            type: String,
            enum: ["DEBIT", "CREDIT"],
            required: true
        },

        amount: {
            type: Number,
            required: true,
            min: 0.01
        },

        balanceAfter: {
            type: Number,
            required: true,
            min: 0
        },

        relatedAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
            default: null
        },

        transferId: {
            type: String,
            index: true
        },

        flagged: {
            type: Boolean,
            default: false
        },

        flagReason: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: ["SUCCESS", "FAILED"],
            default: "SUCCESS"
        }
    },
    {
        timestamps: true
    }
);
```

---

# 6.3 Important Ledger Rule

The ledger should represent what actually happened.

Do **not** create successful ledger records before the transfer has successfully completed.

For a successful ₹5,000 transfer:

```text
DEBIT
Account A
Amount: 5000
BalanceAfter: 15000

CREDIT
Account B
Amount: 5000
BalanceAfter: 15000
```

Both records should have the same:

```text
transferId
```

This allows the two sides of the transfer to be connected.

---

# 6.4 Transfer Integration With Member 2

Member 2 owns the actual transfer engine.

Member 3 owns the permanent ledger records.

Recommended flow:

```text
Customer
   |
   v
Transfer API
   |
   v
Validate transfer
   |
   v
Debit sender
   |
   v
Credit receiver
   |
   v
Create DEBIT ledger
   |
   v
Create CREDIT ledger
```

The exact transaction boundary must be agreed with Member 2.

### Critical requirement

Do not create ledger records if the transfer fails.

Bad:

```text
Create ledger
↓
Attempt balance update
↓
Transfer fails
```

Good:

```text
Validate
↓
Execute transfer
↓
Confirm success
↓
Create ledger records
```

Even better, if the team uses a MongoDB session:

```text
START TRANSACTION

Update sender
Update receiver
Create debit ledger
Create credit ledger

COMMIT
```

If anything fails:

```text
ROLLBACK
```

---

# 7. TRANSFER ID

Every transfer should have a unique identifier.

Example:

```text
TRX-20260904-ABC123
```

or use a UUID.

Example:

```javascript
const transferId = crypto.randomUUID();
```

Both ledger records from the same transfer should contain the same `transferId`.

Example:

```text
Transaction 1
type: DEBIT
transferId: abc-123

Transaction 2
type: CREDIT
transferId: abc-123
```

This makes auditing and debugging much easier.

---

# 8. TRANSACTION LEDGER API

Member 3 should expose an API to retrieve account transactions.

Recommended:

```http
GET /api/accounts/:accountId/transactions
```

Authentication:

```text
JWT required
```

Customer:

```text
Can only access their own account.
```

Bank Staff/Admin:

```text
May access transactions according to project RBAC requirements.
```

---

# 9. TRANSACTION FILTERS

Support useful query parameters.

Example:

```http
GET /api/accounts/123/transactions?type=DEBIT
```

Date filtering:

```http
GET /api/accounts/123/transactions?from=2026-09-01&to=2026-09-04
```

Pagination:

```http
GET /api/accounts/123/transactions?page=1&limit=20
```

Combined:

```http
GET /api/accounts/123/transactions?type=DEBIT&from=2026-09-01&to=2026-09-04&page=1&limit=20
```

---

# 10. PAGINATION

Never return thousands of transactions in one response.

Recommended defaults:

```text
page = 1
limit = 20
```

Maximum:

```text
limit = 100
```

Example response:

```json
{
    "success": true,
    "data": {
        "transactions": [],
        "pagination": {
            "page": 1,
            "limit": 20,
            "total": 45,
            "totalPages": 3
        }
    }
}
```

---

# 11. MODULE 7 — ACCOUNT STATEMENT

Create:

```text
controllers/statementController.js
routes/statementRoutes.js
```

Recommended endpoint:

```http
GET /api/accounts/:accountId/statement
```

---

# 12. STATEMENT FUNCTIONALITY

A statement should provide:

- Account number
- Account type
- Current balance
- Transaction list
- Debit total
- Credit total
- Opening balance if available
- Closing/current balance
- Date range

Example:

```json
{
    "success": true,
    "data": {
        "accountNumber": "10000001",
        "accountType": "SAVINGS",
        "currentBalance": 25000,
        "totalDebit": 10000,
        "totalCredit": 15000,
        "transactions": []
    }
}
```

---

# 13. STATEMENT FILTERS

Support:

```text
from
to
type
page
limit
```

Example:

```http
GET /api/accounts/123/statement?from=2026-09-01&to=2026-09-30
```

If no dates are supplied:

```text
Return the latest transactions according to pagination.
```

---

# 14. STATEMENT OWNERSHIP

A customer must not be able to access another customer's statement.

Example:

Customer A:

```text
GET /api/accounts/A/statement
```

Allowed.

Customer A attempting:

```text
GET /api/accounts/B/statement
```

Must return:

```text
403 Forbidden
```

or the project's standardized ownership error.

Never rely only on the frontend to enforce this.

---

# 15. MODULE 9 — SUSPICIOUS TRANSACTION FLAGGING

Create a service:

```text
services/suspiciousTransactionService.js
```

The purpose is to automatically identify potentially suspicious transactions.

This is an academic banking simulation, so use **simple deterministic rules** rather than claiming to implement a real banking fraud-detection system.

---

# 16. SUSPICIOUS TRANSACTION RULES

Implement at least these rules.

## Rule 1 — Large Transaction

Flag a transaction if:

```text
amount >= 50000
```

Example:

```text
₹60,000 → FLAGGED
₹10,000 → normal
```

Make the threshold configurable using `.env`.

Example:

```text
SUSPICIOUS_AMOUNT_THRESHOLD=50000
```

---

# 17. RULE 2 — Multiple Large Transactions

Flag when an account performs several large outgoing transactions within a short period.

Example:

```text
3 transactions
₹40,000
₹40,000
₹40,000
```

within a configured period.

Possible configuration:

```text
SUSPICIOUS_TRANSACTION_COUNT=3
SUSPICIOUS_TRANSACTION_WINDOW_MINUTES=30
```

The exact values can be adjusted by the team.

---

# 18. RULE 3 — Unusual Transaction Frequency

Flag an account when it performs an unusually high number of transfers within a short period.

Example:

```text
10 transfers within 10 minutes
```

This should be implemented as a simple configurable rule.

Do not attempt machine learning.

The project only requires a simplified backend implementation.

---

# 19. FLAGGING BEHAVIOR

When a transaction is suspicious:

```text
flagged = true
flagReason = "Transaction amount exceeds suspicious threshold"
```

Example:

```json
{
    "flagged": true,
    "flagReason": "Transaction amount exceeds suspicious threshold"
}
```

Do not delete or alter the transaction.

Flagging should be an additional audit attribute.

---

# 20. IMPORTANT — FLAG BOTH SIDES OR DEBIT SIDE?

For the initial implementation, use the **DEBIT transaction** as the primary suspicious transaction.

Example:

```text
Customer A
   |
   | ₹100,000
   v
Customer B
```

Flag:

```text
Customer A's DEBIT
```

Optionally mark the related CREDIT as flagged as well, but the team should choose one consistent policy.

Recommended:

```text
DEBIT = primary suspicious record
CREDIT = normal unless business rule requires otherwise
```

Document this decision in README.

---

# 21. STAFF FLAGGED TRANSACTIONS API

Recommended endpoint:

```http
GET /api/staff/flagged-transactions
```

Allowed roles:

```text
BANK_STAFF
ADMIN
```

Customer access:

```text
403 Forbidden
```

---

# 22. FLAGGED TRANSACTION FILTERS

Support:

```text
page
limit
from
to
status
```

Example:

```http
GET /api/staff/flagged-transactions?page=1&limit=20
```

Response:

```json
{
    "success": true,
    "data": {
        "transactions": [],
        "pagination": {
            "page": 1,
            "limit": 20,
            "total": 5,
            "totalPages": 1
        }
    }
}
```

---

# 23. STAFF SHOULD SEE

Each flagged transaction should provide enough information for monitoring.

Recommended fields:

```text
transaction ID
account ID
account number
transaction type
amount
related account
flag reason
createdAt
```

Do not expose:

```text
passwordHash
JWT
sensitive authentication information
```

---

# 24. MODULE 11 — INTEREST CALCULATION

Implement a scheduled interest calculation job.

Purpose:

```text
Calculate interest on eligible savings accounts
and credit the interest to the account.
```

---

# 25. ELIGIBILITY

Recommended rule:

```text
Only ACTIVE SAVINGS accounts receive interest.
```

Do not calculate interest for:

```text
CURRENT
PENDING
REJECTED
FROZEN
CLOSED
```

unless the project team explicitly decides otherwise.

---

# 26. INTEREST RATE

Keep the rate configurable.

Example `.env`:

```text
ANNUAL_INTEREST_RATE=4
```

This represents:

```text
4% annual interest
```

Do not hardcode the value throughout the application.

---

# 27. SIMPLE INTEREST FORMULA

For an academic implementation:

```text
Interest = Principal × Rate × Time
```

For one month:

```text
monthlyRate = annualRate / 12 / 100

interest = balance × monthlyRate
```

Example:

```text
Balance = ₹12,000
Annual interest = 4%

Monthly interest:

12000 × (4 / 12 / 100)

= ₹40
```

Round appropriately to two decimal places.

---

# 28. INTEREST TRANSACTION

Interest should not simply modify the balance without leaving an audit trail.

When interest is credited:

```text
Account balance
+
Interest amount
```

and create a ledger record:

```text
type = CREDIT
amount = interest
```

Recommended additional field:

```text
transactionCategory = "INTEREST"
```

If the current Transaction schema does not contain this field, coordinate with the team before modifying the shared schema.

---

# 29. AVOID DOUBLE CREDITING

This is extremely important.

The interest job must not credit the same account twice for the same period.

For example:

```text
September interest
```

must not accidentally be applied twice because the server restarted.

Recommended solution:

Create an interest record/model.

Example:

```text
InterestRecord
```

Fields:

```javascript
{
    accountId: ObjectId,
    period: String,
    rate: Number,
    principal: Number,
    interestAmount: Number,
    processedAt: Date
}
```

Add a unique compound index:

```text
accountId + period
```

Example:

```text
accountId: ABC123
period: 2026-09
```

can exist only once.

---

# 30. INTEREST JOB

Use a scheduling library such as:

```text
node-cron
```

Example concept:

```text
Run once per month.
```

For development/testing, also expose a protected manual execution function.

Example:

```http
POST /api/staff/interest/run
```

Allowed:

```text
ADMIN
```

or:

```text
BANK_STAFF
ADMIN
```

depending on the team's RBAC decision.

This makes it possible to demonstrate the feature during the viva without waiting for the monthly schedule.

---

# 31. INTEREST JOB SAFETY

Before crediting interest:

```text
Check account exists
Check account is ACTIVE
Check account type is SAVINGS
Check interest for this period has not already been processed
Calculate interest
Update balance
Create CREDIT ledger record
Create interest record
```

If anything fails, do not silently continue as though the account was processed successfully.

Log the error and handle it using the project's centralized error/logging strategy.

---

# 32. ACCOUNT BALANCE CONSISTENCY

When interest is credited:

```text
oldBalance = account.balance

interest = calculated amount

newBalance = oldBalance + interest
```

The ledger must contain:

```text
balanceAfter = newBalance
```

Example:

```text
Old balance: ₹20,000
Interest: ₹66.67

New balance: ₹20,066.67
```

Ledger:

```text
CREDIT
Amount: ₹66.67
BalanceAfter: ₹20,066.67
```

---

# 33. API ROUTES SUMMARY

Member 3 should implement approximately:

### Transaction history

```http
GET /api/accounts/:accountId/transactions
```

### Statement

```http
GET /api/accounts/:accountId/statement
```

### Staff flagged transactions

```http
GET /api/staff/flagged-transactions
```

### Optional manual interest execution

```http
POST /api/staff/interest/run
```

The exact route naming can be adjusted to match the existing project conventions.

---

# 34. VALIDATION

Use the project's existing validation approach.

Validate:

```text
accountId
from
to
type
page
limit
```

Transaction type:

```text
DEBIT
CREDIT
```

Page:

```text
positive integer
```

Limit:

```text
1–100
```

Dates:

```text
valid ISO/date format
```

Reject invalid ranges:

```text
from > to
```

Return a consistent validation error.

---

# 35. DATE/TIME HANDLING

Use a consistent timezone.

The project is being developed in India, so the team can standardize business-day calculations around:

```text
Asia/Kolkata
```

However, MongoDB should continue storing timestamps consistently, preferably in UTC.

Do not mix arbitrary local timestamps throughout the application.

For daily/monthly calculations, explicitly define the timezone behavior.

Document it in README.

---

# 36. DATABASE INDEXES

The transaction collection should have useful indexes.

At minimum:

```javascript
transactionSchema.index({ accountId: 1, createdAt: -1 });
```

For flagged transactions:

```javascript
transactionSchema.index({
    flagged: 1,
    createdAt: -1
});
```

For transfer lookup:

```javascript
transactionSchema.index({
    transferId: 1
});
```

These improve:

```text
account statements
transaction history
flagged transaction queries
transfer lookup
```

---

# 37. QUERY PERFORMANCE

Avoid loading all transactions into memory.

Bad:

```javascript
const transactions = await Transaction.find({
    accountId
});
```

and then filtering thousands of records in JavaScript.

Prefer database filtering:

```javascript
Transaction.find({
    accountId,
    type,
    createdAt: {
        $gte: from,
        $lte: to
    }
})
```

with:

```text
sort
skip
limit
```

---

# 38. OWNERSHIP CHECK

For customer transaction/statement APIs:

```text
JWT userId
        ↓
Account.userId
        ↓
Requested accountId
```

The customer can only access their own account.

Never trust:

```text
accountId
```

from the URL by itself.

---

# 39. RBAC

Reuse the existing role middleware.

Staff endpoint:

```text
BANK_STAFF
ADMIN
```

Customer endpoints:

```text
CUSTOMER
```

If the project already supports staff access to customer records, follow that implementation.

Do not create a second RBAC system.

---

# 40. ERROR CODES

Use consistent error codes.

Recommended:

```text
ACCOUNT_NOT_FOUND
ACCOUNT_NOT_OWNED
ACCOUNT_NOT_ACTIVE
TRANSACTIONS_NOT_FOUND
INVALID_TRANSACTION_TYPE
INVALID_DATE_RANGE
INVALID_PAGINATION
UNAUTHORIZED
FORBIDDEN
INTEREST_ALREADY_PROCESSED
INTEREST_CALCULATION_FAILED
```

Example:

```json
{
    "success": false,
    "message": "You do not have access to this account",
    "errorCode": "ACCOUNT_NOT_OWNED"
}
```

---

# 41. HTTP STATUS CODES

Use sensible HTTP codes.

```text
200 → Successful GET
201 → Resource created
400 → Validation/business input error
401 → Missing/invalid JWT
403 → Insufficient permissions/ownership
404 → Resource not found
409 → Conflict
500 → Unexpected server error
```

Do not return HTTP 200 for every failure.

---

# 42. SECURITY REQUIREMENTS

Never expose:

```text
passwordHash
JWT secret
environment variables
database credentials
```

Do not allow users to modify:

```text
account.balance
transaction.flagged
transaction.balanceAfter
transaction.createdAt
```

through public customer endpoints.

These fields must be controlled by backend logic.

---

# 43. IMMUTABLE LEDGER

A transaction record should be treated as immutable.

After creation:

```text
amount
type
accountId
balanceAfter
createdAt
```

should not be casually modified.

If a correction is required, create another compensating transaction rather than modifying historical records.

Example:

Wrong credit:

```text
+₹5,000
```

Correction:

```text
DEBIT ₹5,000
```

rather than editing the old record.

This supports auditability.

---

# 44. TESTING REQUIREMENTS

Create tests for all four modules.

## Transaction tests

### Test 1
Successful transaction ledger retrieval.

### Test 2
Customer cannot access another customer's transactions.

### Test 3
Invalid account ID.

### Test 4
Account not found.

### Test 5
Invalid transaction type.

### Test 6
Pagination.

### Test 7
Date filtering.

---

# 45. STATEMENT TESTS

### Test 1
Generate statement successfully.

### Test 2
Statement contains debit transactions.

### Test 3
Statement contains credit transactions.

### Test 4
Date filtering works.

### Test 5
Customer ownership is enforced.

### Test 6
Invalid date range is rejected.

### Test 7
Pagination works.

---

# 46. SUSPICIOUS TRANSACTION TESTS

### Test 1
Transaction below threshold is not flagged.

### Test 2
Transaction above threshold is flagged.

### Test 3
Flag reason is stored.

### Test 4
Customer cannot access staff flagged-transactions endpoint.

### Test 5
BANK_STAFF can access flagged transactions.

### Test 6
ADMIN can access flagged transactions.

### Test 7
Flagged transactions are returned with pagination.

---

# 47. INTEREST TESTS

### Test 1
Active savings account receives interest.

### Test 2
Current account does not receive interest.

### Test 3
Frozen account does not receive interest.

### Test 4
Rejected account does not receive interest.

### Test 5
Interest calculation is correct.

### Test 6
Interest creates a CREDIT ledger record.

### Test 7
Same period cannot be processed twice.

### Test 8
Manual interest execution works if implemented.

---

# 48. POSTMAN TEST COLLECTION

Create Postman requests for:

```text
Member 3
│
├── Transaction Ledger
│   ├── Get Transactions
│   ├── Get Debit Transactions
│   ├── Get Credit Transactions
│   └── Get Paginated Transactions
│
├── Statements
│   ├── Full Statement
│   ├── Date Filtered Statement
│   └── Paginated Statement
│
├── Suspicious Transactions
│   └── Get Flagged Transactions
│
└── Interest
    └── Run Interest Job
```

Include authorization headers.

Example:

```http
Authorization: Bearer {{customerToken}}
```

Staff:

```http
Authorization: Bearer {{staffToken}}
```

---

# 49. ENVIRONMENT VARIABLES

Do not hardcode business thresholds.

Recommended:

```text
SUSPICIOUS_AMOUNT_THRESHOLD=50000
SUSPICIOUS_TRANSACTION_COUNT=3
SUSPICIOUS_TRANSACTION_WINDOW_MINUTES=30
ANNUAL_INTEREST_RATE=4
```

Use `.env.example`:

```text
SUSPICIOUS_AMOUNT_THRESHOLD=
SUSPICIOUS_TRANSACTION_COUNT=
SUSPICIOUS_TRANSACTION_WINDOW_MINUTES=
ANNUAL_INTEREST_RATE=
```

Never commit the actual `.env`.

---

# 50. GIT RULES

Branch:

```text
feature/member3-ledger-statements-monitoring
```

Recommended commits:

```text
feat: add transaction ledger model
feat: add transaction history endpoint
feat: add account statement generation
feat: add statement filtering and pagination
feat: add suspicious transaction detection
feat: add flagged transaction endpoint
feat: add interest calculation service
feat: add scheduled interest job
test: add member3 transaction tests
test: add statement and interest tests
docs: document member3 modules
```

Avoid one giant commit such as:

```text
finished everything
```

---

# 51. PULL REQUEST CHECKLIST

Before creating the PR:

```text
[ ] Transaction model works
[ ] Ledger records are immutable
[ ] Transfer integration completed
[ ] Statement endpoint works
[ ] Pagination works
[ ] Date filters work
[ ] Ownership checks work
[ ] Suspicious transaction rules work
[ ] Flagged endpoint is staff-only
[ ] Interest calculation works
[ ] Interest cannot be duplicated
[ ] Interest creates ledger record
[ ] Scheduled job works
[ ] Tests pass
[ ] No passwords/secrets committed
[ ] .env excluded
[ ] README updated
[ ] Postman collection updated
```

---

# 52. END-TO-END ACCEPTANCE FLOW

The following scenario must work after integration.

## Step 1 — Customer has an active account

Example:

```text
Account: 10000001
Type: SAVINGS
Balance: ₹100,000
Status: ACTIVE
```

---

## Step 2 — Customer performs transfer

Customer transfers:

```text
₹10,000
```

---

## Step 3 — Member 2 executes transfer

Sender:

```text
₹100,000 → ₹90,000
```

Receiver:

```text
₹50,000 → ₹60,000
```

---

## Step 4 — Member 3 creates ledger

Sender:

```text
DEBIT
₹10,000
BalanceAfter: ₹90,000
```

Receiver:

```text
CREDIT
₹10,000
BalanceAfter: ₹60,000
```

Both have the same:

```text
transferId
```

---

## Step 5 — Customer requests statement

```http
GET /api/accounts/10000001/statement
```

The transfer appears in the statement.

---

## Step 6 — Suspicious transfer

Customer transfers:

```text
₹60,000
```

If the threshold is:

```text
₹50,000
```

the transaction becomes:

```text
flagged: true
```

with:

```text
flagReason
```

---

## Step 7 — Staff checks flagged transactions

Staff sends:

```http
GET /api/staff/flagged-transactions
```

The suspicious transaction appears.

---

## Step 8 — Interest

At the configured interest period:

```text
Savings account
₹90,000
```

Interest is calculated.

Example at 4% annual rate for one month:

```text
₹300
```

Balance becomes:

```text
₹90,300
```

A CREDIT ledger entry is created:

```text
type: CREDIT
amount: 300
category: INTEREST
```

The same month's interest cannot be credited twice.

---

# 53. IMPORTANT IMPLEMENTATION PRINCIPLES

### Principle 1 — Do not duplicate transfer logic

Member 2 owns the transfer engine.

Member 3 consumes the successful transfer result and creates ledger entries according to the agreed integration design.

---

### Principle 2 — Ledger is permanent

Do not casually update/delete historical transactions.

---

### Principle 3 — Database filtering over JavaScript filtering

Use MongoDB queries for:

```text
dates
types
flags
pagination
sorting
```

---

### Principle 4 — Customer ownership must be checked

Never trust:

```text
/account/:id
```

without checking ownership.

---

### Principle 5 — Staff authorization must be enforced server-side

Frontend visibility is not security.

---

### Principle 6 — Interest must be idempotent

Running the job twice must not credit the same period twice.

---

### Principle 7 — Every financial change needs an audit trail

If money changes:

```text
Account balance changes
+
Ledger record
```

---

# 54. DEFINITION OF DONE

Member 3 is considered complete only when:

```text
✓ Transaction ledger works
✓ Transfer creates appropriate ledger records
✓ Debit/credit balances are captured
✓ Statements can be generated
✓ Statement filtering works
✓ Pagination works
✓ Ownership is enforced
✓ Suspicious transactions are detected
✓ Flagged transactions are accessible to staff
✓ Interest calculation works
✓ Interest is credited correctly
✓ Interest creates a ledger record
✓ Duplicate interest is prevented
✓ Scheduled job works
✓ Validation exists
✓ Error handling exists
✓ MongoDB indexes exist
✓ Postman requests work
✓ Tests pass
✓ No secrets are committed
✓ README is updated
✓ Code integrates with Members 1, 2 and 4
```

---

# 55. FINAL COPILOT INSTRUCTION

When implementing this specification, follow the existing project's architecture and coding conventions.

**Do not rewrite working code from other members.**

Before creating a new model, controller, middleware, utility, or service, check whether the project already contains an equivalent.

Use:

```text
Node.js
Express.js
MongoDB
Mongoose
JWT
existing authentication middleware
existing RBAC middleware
server-side validation
centralized error handling
```

Maintain clean MVC separation.

Financial operations must prioritize:

```text
Consistency
Auditability
Authorization
Validation
Idempotency
Error handling
```

Do not claim that the system provides real-world banking-grade fraud detection or security. This is a simplified academic banking backend.

The final implementation should be easy to demonstrate through Postman and easy to explain during the viva.