# MEMBER 4 — IMPLEMENTATION SPECIFICATION
## Digital Banking Account & Transaction Management System

**Project:** P10 — Digital Banking Account & Transaction Management System  
**Course:** Advanced JavaScript Backend Frameworks — Node.js & Express JS  
**Semester:** 5th Semester — Christ University  
**Branch:** `feature/member4-freeze-dashboard-integration`

---

# 1. MEMBER 4 RESPONSIBILITY

Member 4 is responsible for:

### Module 10 — Account Freeze/Unfreeze
Allow authorized bank staff/admin users to freeze and unfreeze customer accounts.

### Module 12 — Staff Monitoring Dashboard
Provide backend APIs that allow bank staff/admin users to monitor important banking activity.

### Integration & Centralized Error Handling
Ensure the modules developed by Members 1, 2 and 3 work together consistently.

### Project Integration
Handle final integration testing, Postman consolidation, README updates, API consistency, and deployment/setup documentation.

---

# 2. STRICT SCOPE

Member 4 **MUST implement:**

- Account freeze endpoint
- Account unfreeze endpoint
- Freeze status validation
- Authorization for freeze/unfreeze
- Freeze/unfreeze audit trail
- Staff monitoring APIs
- Account statistics
- Transaction statistics
- Suspicious transaction summary
- Pending-account summary
- Frozen-account summary
- Centralized error handling
- Async error handling
- Integration testing
- Final Postman collection consolidation
- README integration/setup documentation

Member 4 **MUST NOT rewrite:**

- User registration
- Login
- JWT authentication
- KYC
- Account creation
- Account approval logic
- Beneficiary logic
- Fund transfer engine
- Minimum balance calculation
- Transaction ledger
- Statement generation
- Suspicious transaction detection rules
- Interest calculation

Those belong to Members 1, 2 and 3.

---

# 3. TEAM MODULE OWNERSHIP

Final ownership should remain:

```text
Member 1
├── Authentication
├── Customer onboarding/KYC
├── Account management
└── Account approval

Member 2
├── Beneficiary management
├── Fund transfer
└── Minimum balance & transfer limits

Member 3
├── Transaction ledger
├── Account statements
├── Suspicious transaction flagging
└── Interest calculation

Member 4
├── Account freeze/unfreeze
├── Staff monitoring dashboard
├── Centralized error handling
└── Integration/testing/documentation
```

Member 4 acts as the **integration owner**, but every member remains responsible for understanding their own modules.

---

# 4. EXPECTED PROJECT STRUCTURE

Follow the existing MVC architecture.

Recommended additional files:

```text
src/
│
├── controllers/
│   ├── freezeController.js
│   └── staffDashboardController.js
│
├── routes/
│   ├── freezeRoutes.js
│   └── staffDashboardRoutes.js
│
├── services/
│   ├── freezeService.js
│   └── staffDashboardService.js
│
├── middleware/
│   ├── authMiddleware.js
│   ├── roleMiddleware.js
│   ├── errorHandler.js
│   └── notFound.js
│
├── utils/
│   └── asyncHandler.js
│
└── models/
    └── AccountStatusHistory.js
```

If equivalent files already exist, **reuse them instead of creating duplicates.**

---

# 5. MODULE 10 — ACCOUNT FREEZE/UNFREEZE

## 5.1 Purpose

Bank staff should be able to temporarily freeze an account.

A frozen account should not be allowed to perform financial operations.

Example:

```text
ACTIVE
   ↓
FROZEN
```

Later:

```text
FROZEN
   ↓
ACTIVE
```

---

# 6. ACCOUNT STATUS

Member 1's Account model already contains:

```text
PENDING
ACTIVE
REJECTED
FROZEN
CLOSED
```

Do not create another status field.

Reuse:

```javascript
account.status
```

The source of truth must remain the Account model.

---

# 7. FREEZE ENDPOINT

Recommended:

```http
PUT /api/accounts/:id/freeze
```

Authorization:

```text
BANK_STAFF
ADMIN
```

Customers must not be able to freeze their own accounts through this endpoint.

---

# 8. UNFREEZE ENDPOINT

Recommended:

```http
PUT /api/accounts/:id/unfreeze
```

Authorization:

```text
BANK_STAFF
ADMIN
```

---

# 9. FREEZE REQUEST

Recommended body:

```json
{
    "reason": "Suspicious activity detected"
}
```

Reason should be required.

Validation:

```text
Minimum: 5 characters
Maximum: 500 characters
```

Do not allow:

```text
empty reason
null reason
extremely long reason
```

---

# 10. FREEZE WORKFLOW

When staff requests:

```http
PUT /api/accounts/:id/freeze
```

perform:

```text
1. Authenticate JWT
2. Verify BANK_STAFF/ADMIN role
3. Validate account ID
4. Find account
5. Verify current status
6. Validate freeze reason
7. Change ACTIVE → FROZEN
8. Create audit record
9. Return updated account status
```

---

# 11. VALID STATUS TRANSITIONS

Allowed:

```text
ACTIVE → FROZEN
FROZEN → ACTIVE
```

Not allowed:

```text
PENDING → FROZEN
REJECTED → FROZEN
CLOSED → FROZEN
FROZEN → FROZEN
```

If the account is already frozen:

```text
409 Conflict
```

Example error:

```json
{
    "success": false,
    "message": "Account is already frozen",
    "errorCode": "ACCOUNT_ALREADY_FROZEN"
}
```

---

# 12. UNFREEZE WORKFLOW

When staff requests:

```http
PUT /api/accounts/:id/unfreeze
```

perform:

```text
1. Authenticate
2. Verify staff role
3. Validate account ID
4. Find account
5. Confirm status = FROZEN
6. Change status → ACTIVE
7. Create audit record
8. Return updated account
```

If the account is already active:

```text
409 Conflict
```

---

# 13. ACCOUNT STATUS AUDIT

Freeze/unfreeze operations affect account availability and should be auditable.

Create:

```text
models/AccountStatusHistory.js
```

Recommended schema:

```javascript
{
    accountId: ObjectId,
    changedBy: ObjectId,
    previousStatus: String,
    newStatus: String,
    reason: String,
    createdAt: Date
}
```

References:

```text
accountId → Account
changedBy → User
```

Use timestamps.

---

# 14. AUDIT EXAMPLE

If staff freezes account:

```text
Account: 10000001

Previous:
ACTIVE

New:
FROZEN

Changed By:
Staff User ID

Reason:
Suspicious activity detected

Time:
2026-09-04T10:30:00Z
```

If later unfrozen:

```text
Previous:
FROZEN

New:
ACTIVE

Reason:
Investigation completed
```

This provides an audit trail.

---

# 15. IMPORTANT — DO NOT DELETE AUDIT RECORDS

Status history should be treated as historical information.

Do not expose an endpoint allowing normal users to:

```text
DELETE /status-history/:id
```

The audit history should remain available for staff/admin review.

---

# 16. FREEZE EFFECT ON TRANSFERS

Member 2 owns transfer validation.

Member 4 must coordinate with Member 2 so that:

```text
Account.status === "FROZEN"
```

causes financial operations to fail.

A frozen account must not be able to:

```text
Send money
Receive money
```

if the team's business rules define frozen accounts as fully blocked.

At minimum, outgoing transfers must be blocked.

The important requirement is:

**Do not duplicate transfer logic in Member 4.**

Instead, Member 2's transfer service should check account status.

If necessary, Member 4 should submit a small integration change to Member 2's code rather than implementing another transfer service.

---

# 17. FREEZE EFFECT ON BENEFICIARIES

A frozen customer should not be able to perform financial operations through the account.

Coordinate with Member 2.

Recommended:

```text
Frozen source account
        ↓
Cannot add beneficiary
Cannot initiate transfer
```

Existing beneficiaries do not need to be deleted.

---

# 18. FREEZE EFFECT ON INTEREST

Coordinate with Member 3.

Recommended project rule:

```text
FROZEN account
    ↓
No interest credited while frozen
```

However, the team must document the exact policy.

The most important thing is consistency across the system.

---

# 19. MODULE 12 — STAFF MONITORING DASHBOARD

This is a backend dashboard API.

There does not need to be a frontend unless the team chooses to build one.

The backend should expose useful aggregated statistics for:

```text
BANK_STAFF
ADMIN
```

---

# 20. DASHBOARD ENDPOINT

Recommended:

```http
GET /api/staff/dashboard
```

Authorization:

```text
BANK_STAFF
ADMIN
```

Customer:

```text
403 Forbidden
```

---

# 21. DASHBOARD SHOULD SHOW

At minimum:

```text
Total customers
Total accounts
Active accounts
Pending accounts
Frozen accounts
Rejected accounts
Total transactions
Flagged transactions
Total money transferred
```

These can be returned as summary metrics.

Example:

```json
{
    "success": true,
    "data": {
        "customers": 120,
        "totalAccounts": 145,
        "activeAccounts": 110,
        "pendingAccounts": 20,
        "frozenAccounts": 10,
        "rejectedAccounts": 5,
        "totalTransactions": 850,
        "flaggedTransactions": 12,
        "totalTransferred": 4250000
    }
}
```

---

# 22. DASHBOARD IMPLEMENTATION

Use MongoDB aggregation where appropriate.

For example:

```text
Account collection
      ↓
$group
      ↓
Count by status
```

Transaction collection:

```text
Transaction collection
      ↓
$match
      ↓
$group
      ↓
Total transactions / total amount
```

Do not retrieve thousands of documents into Node.js merely to calculate simple counts.

Prefer MongoDB aggregation.

---

# 23. DASHBOARD STATUS COUNTS

Account statistics should distinguish:

```text
ACTIVE
PENDING
FROZEN
REJECTED
CLOSED
```

Example:

```json
{
    "active": 110,
    "pending": 20,
    "frozen": 10,
    "rejected": 5,
    "closed": 0
}
```

---

# 24. DASHBOARD TRANSACTION STATISTICS

Use the Transaction collection created by Member 3.

Recommended:

```text
Total transactions
Total debit amount
Total credit amount
Total flagged transactions
```

Example:

```json
{
    "totalTransactions": 850,
    "totalDebit": 4200000,
    "totalCredit": 4250000,
    "flaggedTransactions": 12
}
```

Do not create a second transaction collection.

---

# 25. DASHBOARD DATE FILTER

Recommended:

```http
GET /api/staff/dashboard?from=2026-09-01&to=2026-09-04
```

Date filtering should affect transaction-related metrics.

For example:

```text
Total transactions
Total debit
Total credit
Flagged transactions
```

Account status counts can represent the current state unless the team decides to maintain historical snapshots.

---

# 26. DASHBOARD SECURITY

Only:

```text
BANK_STAFF
ADMIN
```

can access:

```text
GET /api/staff/dashboard
```

Customers must receive:

```text
403 Forbidden
```

Do not rely on hiding the dashboard button in the frontend.

---

# 27. DASHBOARD PERFORMANCE

Use aggregation queries.

Avoid:

```javascript
const allTransactions = await Transaction.find({});
const total = allTransactions.length;
```

Prefer:

```text
MongoDB aggregation
```

with:

```text
$count
$group
$match
```

as appropriate.

This is important for demonstrating good MongoDB design during the viva.

---

# 28. OPTIONAL DASHBOARD SECTIONS

If time permits, add:

### Recent transactions

```http
GET /api/staff/dashboard/recent-transactions
```

Return the latest 10–20 transactions.

### Recent flagged transactions

```http
GET /api/staff/dashboard/recent-flags
```

### Account status summary

```http
GET /api/staff/dashboard/account-summary
```

These are optional.

Do not sacrifice the mandatory functionality to build unnecessary features.

---

# 29. CENTRALIZED ERROR HANDLING

Member 4 owns final centralized error handling.

Create/reuse:

```text
middleware/errorHandler.js
```

All controllers should ultimately pass unexpected errors to this middleware.

---

# 30. STANDARD ERROR RESPONSE

Use:

```json
{
    "success": false,
    "message": "Human-readable error message",
    "errorCode": "ERROR_CODE"
}
```

For development, stack traces may be logged server-side.

Do not expose internal stack traces to normal API users in production-style responses.

---

# 31. CUSTOM APPLICATION ERROR

Create a reusable error class if the project does not already have one.

Example concept:

```javascript
class AppError extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
}
```

Then controllers/services can throw:

```javascript
throw new AppError(
    "Account is already frozen",
    409,
    "ACCOUNT_ALREADY_FROZEN"
);
```

The centralized middleware converts it into the standard response.

---

# 32. HANDLE COMMON ERRORS

Centralized error handling should cover:

```text
Validation errors
MongoDB validation errors
Duplicate key errors
Invalid ObjectId
JWT errors
Unauthorized errors
Forbidden errors
Not found errors
Application errors
Unexpected server errors
```

Example invalid ObjectId:

```text
GET /api/accounts/not-a-valid-id
```

should not crash the server.

Return something like:

```json
{
    "success": false,
    "message": "Invalid account ID",
    "errorCode": "INVALID_ACCOUNT_ID"
}
```

---

# 33. ASYNC ERROR HANDLING

Do not leave unhandled promise rejections.

Recommended helper:

```text
utils/asyncHandler.js
```

Example:

```javascript
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
```

Then:

```javascript
router.get(
    "/dashboard",
    authMiddleware,
    roleMiddleware("BANK_STAFF", "ADMIN"),
    asyncHandler(getDashboard)
);
```

---

# 34. 404 HANDLER

Create a final route-not-found middleware.

Example response:

```json
{
    "success": false,
    "message": "Route not found",
    "errorCode": "ROUTE_NOT_FOUND"
}
```

Do not allow unknown routes to return confusing default HTML responses.

---

# 35. ERROR MIDDLEWARE ORDER

The application should approximately follow:

```text
Routes
   ↓
404 middleware
   ↓
Central error middleware
```

The error handler should be registered after the routes.

---

# 36. FREEZE ERROR CODES

Recommended:

```text
ACCOUNT_NOT_FOUND
ACCOUNT_ALREADY_FROZEN
ACCOUNT_NOT_FROZEN
ACCOUNT_CANNOT_BE_FROZEN
ACCOUNT_CANNOT_BE_UNFROZEN
INVALID_FREEZE_REASON
INVALID_ACCOUNT_ID
UNAUTHORIZED
FORBIDDEN
```

---

# 37. DASHBOARD ERROR CODES

Recommended:

```text
DASHBOARD_ACCESS_DENIED
INVALID_DATE_RANGE
DASHBOARD_QUERY_FAILED
```

---

# 38. ACCOUNT STATUS AUDIT API

Recommended endpoint:

```http
GET /api/accounts/:id/status-history
```

Authorization:

```text
BANK_STAFF
ADMIN
```

Customers should not automatically receive internal staff audit information unless the team explicitly decides otherwise.

Example response:

```json
{
    "success": true,
    "data": [
        {
            "previousStatus": "ACTIVE",
            "newStatus": "FROZEN",
            "reason": "Suspicious activity detected",
            "changedBy": "staffUserId",
            "createdAt": "2026-09-04T10:30:00Z"
        }
    ]
}
```

---

# 39. API SUMMARY

Member 4's primary APIs:

```text
PUT  /api/accounts/:id/freeze
PUT  /api/accounts/:id/unfreeze
GET  /api/accounts/:id/status-history

GET  /api/staff/dashboard
```

Optional:

```text
GET /api/staff/dashboard/recent-transactions
GET /api/staff/dashboard/recent-flags
```

---

# 40. FREEZE TEST CASES

### Test 1 — Successful freeze

Active account:

```text
ACTIVE → FROZEN
```

Should return success.

---

### Test 2 — Successful unfreeze

Frozen account:

```text
FROZEN → ACTIVE
```

Should return success.

---

### Test 3 — Freeze already frozen account

Expected:

```text
409
ACCOUNT_ALREADY_FROZEN
```

---

### Test 4 — Unfreeze active account

Expected:

```text
409
ACCOUNT_NOT_FROZEN
```

---

### Test 5 — Customer attempts freeze

Expected:

```text
403
```

---

### Test 6 — No JWT

Expected:

```text
401
```

---

### Test 7 — Invalid account ID

Expected:

```text
400
INVALID_ACCOUNT_ID
```

---

### Test 8 — Account does not exist

Expected:

```text
404
ACCOUNT_NOT_FOUND
```

---

### Test 9 — Freeze reason missing

Expected:

```text
400
INVALID_FREEZE_REASON
```

---

# 41. DASHBOARD TEST CASES

### Test 1

BANK_STAFF can access dashboard.

### Test 2

ADMIN can access dashboard.

### Test 3

CUSTOMER receives 403.

### Test 4

Unauthenticated user receives 401.

### Test 5

Dashboard counts are correct.

### Test 6

Transaction totals are correct.

### Test 7

Flagged transaction count matches Member 3's transaction collection.

### Test 8

Date filtering works.

### Test 9

Invalid date range is rejected.

---

# 42. ERROR HANDLER TESTS

Test:

```text
Invalid ObjectId
Invalid JSON
Validation failure
Duplicate database key
Unknown route
Unauthorized request
Forbidden request
Unexpected service error
```

The server should remain running after errors.

---

# 43. INTEGRATION TESTING

After all members merge their branches, Member 4 should test the complete system.

The minimum end-to-end flow:

```text
Register
   ↓
Login
   ↓
Submit KYC
   ↓
Create Account
   ↓
Staff Approves Account
   ↓
Add Beneficiary
   ↓
Transfer Money
   ↓
Ledger Created
   ↓
Statement Updated
   ↓
Suspicious Rule Checked
   ↓
Staff Dashboard Updated
```

Then test:

```text
Freeze Account
   ↓
Attempt Transfer
   ↓
Transfer Rejected
   ↓
Unfreeze Account
   ↓
Transfer Allowed
```

Finally:

```text
Interest Job
   ↓
Interest Credit
   ↓
Ledger Entry
   ↓
Statement Updated
```

---

# 44. IMPORTANT INTEGRATION CHECK

Member 4 must verify that account status is respected throughout the system.

For example:

```text
Account.status = FROZEN
```

should prevent the appropriate operations.

Test at least:

```text
Transfer
Beneficiary creation
Interest processing
```

according to the rules agreed with Members 2 and 3.

Do not implement duplicate checks in multiple unrelated places if they can be centralized appropriately.

---

# 45. POSTMAN COLLECTION

Member 4 should consolidate everyone's Postman requests.

Final collection:

```text
Digital Banking API
│
├── Authentication
│   ├── Register
│   └── Login
│
├── Customer/KYC
│
├── Accounts
│   ├── Create
│   ├── List
│   ├── Get
│   ├── Freeze
│   ├── Unfreeze
│   └── Status History
│
├── Beneficiaries
│
├── Transfers
│
├── Transactions
│
├── Statements
│
├── Suspicious Transactions
│
├── Interest
│
└── Staff
    ├── Pending Accounts
    ├── Flagged Transactions
    └── Dashboard
```

---

# 46. POSTMAN ENVIRONMENT

Create variables such as:

```text
baseUrl
customerToken
staffToken
adminToken
customerAccountId
beneficiaryId
transactionId
```

Example:

```text
{{baseUrl}}/api/staff/dashboard
```

This makes the demonstration much easier.

---

# 47. README RESPONSIBILITY

Member 4 should consolidate the final README.

README should contain:

```text
Project title
Project overview
Objectives
Technology stack
Architecture
Features/modules
Roles
Database collections
ER/collection relationship diagram
API overview
Environment variables
Installation
Running the server
MongoDB setup
JWT setup
Postman instructions
Team member contributions
Testing
Known limitations
```

Do not write false claims such as:

```text
"Production-grade banking security"
"Real-time fraud detection"
"Fully compliant banking system"
```

Describe it accurately as a simplified academic banking backend.

---

# 48. ENVIRONMENT DOCUMENTATION

Create/update:

```text
.env.example
```

Possible variables:

```text
PORT=5000
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=
SUSPICIOUS_AMOUNT_THRESHOLD=
SUSPICIOUS_TRANSACTION_COUNT=
SUSPICIOUS_TRANSACTION_WINDOW_MINUTES=
ANNUAL_INTEREST_RATE=
```

Never commit:

```text
.env
```

---

# 49. GITIGNORE CHECK

Ensure:

```text
.env
node_modules/
coverage/
logs/
```

are ignored where appropriate.

Never commit:

```text
JWT secrets
MongoDB passwords
API keys
personal credentials
```

---

# 50. DATABASE INDEX REVIEW

Member 4 should review the final schemas after merging.

Expected important indexes include:

```text
User.email → unique

Account.accountNumber → unique
Account.userId → index

Beneficiary.accountId → index

Transaction.accountId + createdAt → index
Transaction.flagged + createdAt → index
Transaction.transferId → index

Approval.accountId → index

AccountStatusHistory.accountId + createdAt → index
```

Do not blindly add indexes everywhere.

Be prepared to explain why each important index exists.

---

# 51. FINAL API RESPONSE FORMAT

All APIs should follow the same general structure.

Success:

```json
{
    "success": true,
    "message": "Operation completed successfully",
    "data": {}
}
```

Error:

```json
{
    "success": false,
    "message": "Something went wrong",
    "errorCode": "ERROR_CODE"
}
```

Do not mix completely different response structures between modules.

---

# 52. CODE QUALITY REVIEW

Before final submission, check:

```text
No console.log debugging left unnecessarily
No duplicated middleware
No duplicated models
No hardcoded secrets
No plaintext passwords
No giant controllers
No business logic inside routes
No database queries inside random utility files
No uncaught async errors
No unused imports
No commented-out dead code
```

Use:

```text
Controller
   ↓
Service
   ↓
Model/Database
```

where the logic is complex enough to justify a service layer.

---

# 53. INTEGRATION REVIEW WITH MEMBER 1

Verify:

```text
JWT authentication works
CUSTOMER role works
BANK_STAFF role works
ADMIN role works
Account model contains required status
Account ownership works
Account approval works
```

Do not modify Member 1's authentication implementation unless an integration bug requires it.

---

# 54. INTEGRATION REVIEW WITH MEMBER 2

Verify:

```text
Beneficiary works
Transfer works
Minimum balance works
Daily transfer limit works
Frozen accounts cannot perform transfers
```

Coordinate any changes rather than copying Member 2's transfer code.

---

# 55. INTEGRATION REVIEW WITH MEMBER 3

Verify:

```text
Transactions are recorded
Statements display transfers
Suspicious transactions are flagged
Staff can see flagged transactions
Interest creates ledger records
Frozen accounts follow the agreed interest policy
```

---

# 56. TESTING WITH SAMPLE DATA

Prepare demonstration accounts.

Example:

```text
Customer A
Account: 10000001
Balance: ₹100,000
Status: ACTIVE

Customer B
Account: 10000002
Balance: ₹50,000
Status: ACTIVE
```

Staff:

```text
Role: BANK_STAFF
```

Admin:

```text
Role: ADMIN
```

Use these accounts for Postman testing.

Do not put real personal information into the repository.

---

# 57. DEMONSTRATION FLOW FOR VIVA

Member 4 should be able to demonstrate:

### 1. Staff login

Receive JWT.

### 2. Staff opens dashboard

```http
GET /api/staff/dashboard
```

Show:

```text
Accounts
Transactions
Flags
```

### 3. Staff freezes an account

```http
PUT /api/accounts/:id/freeze
```

with:

```json
{
    "reason": "Suspicious activity detected"
}
```

### 4. Customer attempts transfer

Transfer should fail because the account is frozen.

### 5. Staff unfreezes account

```http
PUT /api/accounts/:id/unfreeze
```

### 6. Customer transfers again

Transfer should now work if all other business rules pass.

### 7. Show status history

```http
GET /api/accounts/:id/status-history
```

This demonstrates:

```text
Operational control
RBAC
Business rules
Auditability
Integration
```

---

# 58. GIT COMMIT PLAN

Recommended branch:

```text
feature/member4-freeze-dashboard-integration
```

Suggested commits:

```text
feat: add account freeze workflow
feat: add account unfreeze workflow
feat: add account status audit history
feat: add staff dashboard service
feat: add staff dashboard endpoints
feat: add centralized error handler
feat: add async error handling
test: add freeze and unfreeze tests
test: add staff dashboard tests
test: add integration tests
docs: consolidate project README
docs: update Postman collection
```

Avoid a single commit such as:

```text
final project done
```

---

# 59. PULL REQUEST CHECKLIST

Before merging:

```text
[ ] Freeze endpoint works
[ ] Unfreeze endpoint works
[ ] Freeze reason validated
[ ] Status transitions validated
[ ] Freeze/unfreeze audit records created
[ ] Staff authorization works
[ ] Admin authorization works
[ ] Customer access blocked
[ ] Dashboard works
[ ] Dashboard aggregation is correct
[ ] Dashboard authorization works
[ ] Date filtering works
[ ] Central error handler works
[ ] Invalid ObjectId handled
[ ] Unknown routes handled
[ ] Async errors handled
[ ] Integration tests pass
[ ] Postman collection consolidated
[ ] README updated
[ ] .env excluded
[ ] No secrets committed
[ ] No duplicate models/middleware
```

---

# 60. FINAL DEFINITION OF DONE

Member 4 is complete when:

```text
✓ Account freeze works
✓ Account unfreeze works
✓ Invalid status transitions are rejected
✓ Freeze/unfreeze actions are auditable
✓ Only authorized staff/admin can freeze accounts
✓ Staff dashboard works
✓ Dashboard uses MongoDB aggregation appropriately
✓ Flagged transaction count is integrated with Member 3
✓ Transaction statistics are integrated with Member 3
✓ Frozen status is respected by financial operations
✓ Centralized error handling works
✓ Async errors are handled
✓ Invalid ObjectIds are handled
✓ Unknown routes return standardized errors
✓ Integration tests pass
✓ Postman collection is complete
✓ README is complete
✓ .env is excluded
✓ Git history is clean
✓ All modules work together
```

---

# 61. FINAL COPILOT INSTRUCTION

When implementing this specification:

**First inspect the existing repository.**

Do not assume models, middleware, controllers, or utilities are missing.

Before creating anything:

```text
Search existing files.
Reuse existing authentication.
Reuse existing RBAC.
Reuse existing Account model.
Reuse existing Transaction model.
Reuse existing error handling if present.
```

The Account model's existing:

```text
status
```

field is the source of truth for account lifecycle.

Do not create:

```text
isFrozen
freezeStatus
accountLocked
```

as competing fields.

Use:

```text
status = "FROZEN"
```

consistently.

Do not implement a second transfer engine.

Do not implement a second suspicious transaction detector.

Do not implement a second interest calculator.

Member 4's job is to **integrate and operationalize the modules**, not duplicate them.

Prioritize:

```text
Security
Authorization
Auditability
Consistency
Database performance
Error handling
Integration
Maintainability
```

The finished system should be straightforward to demonstrate through Postman and explain during the viva.