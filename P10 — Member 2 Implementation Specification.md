# P10 — Member 2 Implementation Specification

## Branch

```text
feature/member2-beneficiary-transfer
```

## Project

**P10 — Digital Banking Account & Transaction Management System**

Backend:

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt/bcryptjs
- express-validator or Joi
- dotenv

---

# 1. MEMBER 2 SCOPE

This branch belongs to **Member 2 only**.

Implement ONLY:

### Module 4 — Beneficiary Management

### Module 5 — Fund Transfer Engine

### Module 8 — Minimum Balance & Transfer Limits Enforcement

Member 2 must integrate with the foundation created by Member 1.

Do NOT implement:

- Customer registration
- Login
- JWT generation
- KYC
- Account approval
- Account creation
- Transaction ledger implementation
- Account statements
- Suspicious transaction monitoring
- Account freeze/unfreeze
- Interest calculation
- Staff dashboard

The authentication middleware created by Member 1 should be reused.

---

# 2. PRIMARY OBJECTIVE

Build a secure beneficiary and fund-transfer system.

The complete flow should be:

```text id="q9n0h8"
Customer Login
      |
      v
JWT Authentication
      |
      v
Select Own ACTIVE Account
      |
      v
Add Beneficiary
      |
      v
Beneficiary Validated
      |
      v
Transfer Request
      |
      v
Validate Amount
      |
      v
Validate Sender Ownership
      |
      v
Validate Sender Status
      |
      v
Validate Beneficiary
      |
      v
Check Balance
      |
      v
Check Minimum Balance
      |
      v
Check Daily Transfer Limit
      |
      v
Execute Transfer
      |
      v
Update Sender Balance
      |
      v
Update Receiver Balance
      |
      v
Return Successful Transfer
```

The transfer operation must be designed carefully because incorrect balance updates could corrupt banking data.

---

# 3. IMPORTANT INTEGRATION RULE

Member 2 must NOT recreate authentication.

Reuse:

```text id="1y0shw"
middleware/auth.js
middleware/role.js
```

created by Member 1.

Authenticated user information should be available through:

```javascript id="7d5qaz"
req.user
```

Expected structure:

```javascript id="p2d7n3"
{
    userId: "USER_OBJECT_ID",
    role: "CUSTOMER"
}
```

Do not create a second incompatible JWT system.

---

# 4. EXPECTED FILES

Create/update:

```text id="y0l6vh"
models/
└── Beneficiary.js

controllers/
├── beneficiaryController.js
└── transferController.js

routes/
├── beneficiaryRoutes.js
└── transferRoutes.js

validators/
├── beneficiaryValidator.js
└── transferValidator.js

utils/
├── transferValidator.js
└── transactionHelpers.js
```

If the project already has a different structure, follow the existing MVC structure rather than creating duplicates.

---

# 5. BENEFICIARY MODEL

Create:

```text id="8g5m57"
models/Beneficiary.js
```

Schema:

```javascript id="2e3n1w"
{
    accountId: ObjectId,

    beneficiaryAccountNumber: String,

    nickname: String,

    createdAt: Date,

    updatedAt: Date
}
```

Use:

```text id="0m5v0g"
accountId → Account
```

with:

```javascript id="t0f0x8"
ref: "Account"
```

---

# 6. BENEFICIARY FIELD RULES

## accountId

This is the customer's own source account.

It must reference:

```text id="i4ip99"
Account._id
```

IMPORTANT:

Never accept an arbitrary account ID and assume it belongs to the authenticated customer.

Always verify:

```text id="p0z1v0"
account.userId === req.user.userId
```

---

## beneficiaryAccountNumber

Required.

Must be a valid existing account number.

Example:

```text id="70m4cs"
10000002
```

Store as String.

---

## nickname

Required or optional depending on the team's design.

Recommended:

```text id="m4m3d9"
Required
2–50 characters
```

Examples:

```text id="sj2x47"
"Arjun"
"Mom"
"College Friend"
```

---

# 7. BENEFICIARY INDEX

Create:

```text id="sq2zqf"
accountId
```

Recommended compound unique index:

```text id="e6av8m"
{
    accountId: 1,
    beneficiaryAccountNumber: 1
}
```

This prevents the same customer from adding the same beneficiary account twice to the same source account.

---

# 8. BENEFICIARY CREATION

Endpoint:

```http id="gy0m4u"
POST /api/beneficiaries
```

Authentication:

```text id="v6x0he"
Required
```

Role:

```text id="j2a2w4"
CUSTOMER
```

---

# 9. CREATE BENEFICIARY REQUEST

Example:

```json id="wdk4i1"
{
    "accountId": "64abc123...",
    "beneficiaryAccountNumber": "10000002",
    "nickname": "Arjun"
}
```

---

# 10. BENEFICIARY CREATION PROCESS

Implement:

```text id="b9z84x"
Request
   |
   v
JWT validation
   |
   v
Validate accountId
   |
   v
Find source account
   |
   v
Verify account belongs to authenticated user
   |
   v
Verify source account is ACTIVE
   |
   v
Validate beneficiary account number
   |
   v
Find beneficiary account
   |
   v
Verify beneficiary exists
   |
   v
Prevent self-beneficiary
   |
   v
Check duplicate beneficiary
   |
   v
Create beneficiary
```

---

# 11. SOURCE ACCOUNT OWNERSHIP

Suppose Rahul owns:

```text id="9w0w95"
Account A
```

and another user owns:

```text id="x6l3v2"
Account B
```

Rahul must NOT be able to create a beneficiary using Account B as his source account.

Always check:

```text id="2h1y01"
account.userId === req.user.userId
```

---

# 12. SOURCE ACCOUNT STATUS

Only:

```text id="j5i1mb"
ACTIVE
```

accounts should be allowed to add beneficiaries.

If:

```text id="m7cy4c"
PENDING
REJECTED
FROZEN
CLOSED
```

reject the request.

Response:

```json id="3f8j8n"
{
    "success": false,
    "message": "Only active accounts can manage beneficiaries",
    "errorCode": "ACCOUNT_NOT_ACTIVE"
}
```

---

# 13. BENEFICIARY EXISTENCE

Before adding:

```text id="w9g9xx"
beneficiaryAccountNumber
```

find the target account.

If it doesn't exist:

```text id="5u2lyx"
404 Not Found
```

Response:

```json id="u8t7fa"
{
    "success": false,
    "message": "Beneficiary account not found",
    "errorCode": "BENEFICIARY_ACCOUNT_NOT_FOUND"
}
```

---

# 14. SELF-BENEFICIARY

A customer should not add their own account as a beneficiary.

For example:

```text id="n0f7cj"
Rahul Account: 10000001

beneficiaryAccountNumber:
10000001
```

Reject:

```text id="d5ny2b"
400 Bad Request
```

Response:

```json id="8t3t2m"
{
    "success": false,
    "message": "You cannot add your own account as a beneficiary",
    "errorCode": "SELF_BENEFICIARY"
}
```

---

# 15. DUPLICATE BENEFICIARY

If Rahul already has:

```text id="2w9w98"
10000002 → Arjun
```

and tries to add:

```text id="gk9y27"
10000002 → Arjun
```

again:

```text id="x1f6z3"
409 Conflict
```

Response:

```json id="qf3n7s"
{
    "success": false,
    "message": "Beneficiary already exists",
    "errorCode": "DUPLICATE_BENEFICIARY"
}
```

---

# 16. BENEFICIARY SUCCESS RESPONSE

Status:

```text id="2i8x1f"
201 Created
```

Response:

```json id="b2h6q1"
{
    "success": true,
    "message": "Beneficiary added successfully",
    "data": {
        "id": "BENEFICIARY_ID",
        "accountId": "SOURCE_ACCOUNT_ID",
        "beneficiaryAccountNumber": "10000002",
        "nickname": "Arjun"
    }
}
```

---

# 17. LIST BENEFICIARIES

Endpoint:

```http id="y4d9z7"
GET /api/beneficiaries/:accountId
```

Authentication required.

The authenticated customer can only retrieve beneficiaries belonging to their own account.

Process:

```text id="v4j3n6"
JWT
 ↓
accountId
 ↓
Find Account
 ↓
Verify account.userId = req.user.userId
 ↓
Find Beneficiaries
```

Do not allow customers to retrieve another customer's beneficiaries.

---

# 18. GET SINGLE BENEFICIARY

Optional but recommended:

```http id="0s1lqv"
GET /api/beneficiaries/:id
```

Verify ownership through:

```text id="r3yy8x"
beneficiary.accountId
        ↓
Account.userId
        ↓
req.user.userId
```

---

# 19. DELETE BENEFICIARY

Recommended:

```http id="owt6t3"
DELETE /api/beneficiaries/:id
```

Authentication required.

Customer can only delete their own beneficiary.

Do not allow:

```text id="0b7t2w"
Customer A
   ↓
delete
   ↓
Customer B beneficiary
```

---

# 20. FUND TRANSFER MODULE

This is the most important part of Member 2's work.

Endpoint:

```http id="x5e4s4"
POST /api/transactions/transfer
```

Authentication:

```text id="6n2r0x"
Required
```

Role:

```text id="5xxk9x"
CUSTOMER
```

---

# 21. TRANSFER REQUEST

Recommended:

```json id="gj1j9f"
{
    "fromAccountId": "64sender...",
    "beneficiaryId": "64beneficiary...",
    "amount": 5000
}
```

Alternative design:

```json id="9u7xzi"
{
    "fromAccountId": "64sender...",
    "toAccountNumber": "10000002",
    "amount": 5000
}
```

Recommended approach:

Use `beneficiaryId`.

This allows the backend to verify that the beneficiary actually belongs to the sender's account.

---

# 22. TRANSFER PROCESS

The transfer must follow this exact validation order:

```text id="3qv5km"
1. Authenticate customer
        ↓
2. Validate request body
        ↓
3. Validate fromAccountId
        ↓
4. Find source account
        ↓
5. Verify source account ownership
        ↓
6. Verify source account status
        ↓
7. Find beneficiary
        ↓
8. Verify beneficiary belongs to source account
        ↓
9. Find destination account
        ↓
10. Verify destination account exists
        ↓
11. Prevent self-transfer
        ↓
12. Validate amount
        ↓
13. Check available balance
        ↓
14. Check minimum balance
        ↓
15. Check daily transfer limit
        ↓
16. Execute atomic-style balance update
        ↓
17. Return transfer result
```

---

# 23. SOURCE ACCOUNT OWNERSHIP

The customer must own the source account.

Check:

```javascript id="umw66n"
sourceAccount.userId.toString() === req.user.userId
```

If not:

```text id="v8qgkp"
403 Forbidden
```

or return 404 depending on the project's security policy.

Never trust:

```json id="x4gdki"
{
    "userId": "..."
}
```

from the request.

---

# 24. SOURCE ACCOUNT STATUS

Only:

```text id="8j9r7h"
ACTIVE
```

can initiate transfers.

Reject:

```text id="duj6r4"
PENDING
REJECTED
FROZEN
CLOSED
```

Example:

```json id="x5t3lz"
{
    "success": false,
    "message": "Transfers are allowed only from active accounts",
    "errorCode": "ACCOUNT_NOT_ACTIVE"
}
```

---

# 25. BENEFICIARY VALIDATION

The beneficiary must:

1. Exist.
2. Belong to the authenticated customer's source account.
3. Point to an existing destination account.

Check:

```text id="yq9y4g"
beneficiary.accountId === sourceAccount._id
```

Do NOT simply trust:

```text id="tq1p48"
beneficiaryId
```

without checking ownership.

---

# 26. DESTINATION ACCOUNT

Find:

```text id="4svq3k"
beneficiary.beneficiaryAccountNumber
```

in the Account collection.

If not found:

```text id="zqv3jd"
404
```

The destination account must be valid.

---

# 27. DESTINATION ACCOUNT STATUS

Recommended rule:

Destination account must also be:

```text id="0j3n5d"
ACTIVE
```

If destination is:

```text id="9w1i9r"
FROZEN
REJECTED
CLOSED
```

reject the transfer.

---

# 28. SELF TRANSFER

Prevent:

```text id="9g8m1j"
fromAccountId
       =
destinationAccountId
```

Return:

```text id="6t5h4m"
400 Bad Request
```

Response:

```json id="4xk4vf"
{
    "success": false,
    "message": "You cannot transfer money to the same account",
    "errorCode": "SELF_TRANSFER"
}
```

---

# 29. AMOUNT VALIDATION

Amount must:

```text id="7w6h5j"
be present
be numeric
be greater than 0
```

Reject:

```text id="q7p6w9"
0
-100
"hello"
null
undefined
```

Recommended:

```text id="uwt3yd"
amount > 0
```

---

# 30. DECIMAL / MONEY HANDLING

Avoid floating-point problems where practical.

For a student project, you may use MongoDB `Number`, but ensure:

```text id="x8qg2z"
amount >= 0
```

and round monetary calculations to two decimal places.

Example:

```text id="jv4v2w"
5000.00
```

Do not allow:

```text id="2l5w4a"
5000.999999
```

without normalization.

---

# 31. AVAILABLE BALANCE

Suppose:

```text id="5ot4r1"
Balance = ₹50,000
```

Transfer:

```text id="3o7j2h"
₹20,000
```

Remaining:

```text id="2d9y1c"
₹30,000
```

The transfer must be rejected if the account would violate minimum balance.

---

# 32. MINIMUM BALANCE

Use the field created by Member 1:

```text id="9ux5b4"
account.minimumBalance
```

Do NOT hardcode a new minimum balance inside Member 2's transfer controller.

Example:

```text id="8l9q6a"
Balance = ₹10,000
Minimum = ₹5,000
Transfer = ₹4,000

Remaining = ₹6,000

Allowed
```

But:

```text id="t7d2l3"
Balance = ₹10,000
Minimum = ₹5,000
Transfer = ₹6,000

Remaining = ₹4,000

Rejected
```

---

# 33. MINIMUM BALANCE ERROR

Return:

```text id="v7w3k1"
409 Conflict
```

Example:

```json id="1f4z6y"
{
    "success": false,
    "message": "Transfer would violate the minimum balance requirement",
    "errorCode": "MINIMUM_BALANCE_VIOLATION"
}
```

---

# 34. DAILY TRANSFER LIMIT

Use:

```text id="2xq2gk"
account.dailyTransferLimit
```

Do NOT create another field for this.

Example:

```text id="j4v9mt"
Daily limit = ₹25,000
```

Customer has already transferred:

```text id="5z6h7j"
₹15,000
```

Customer attempts:

```text id="k8n9b0"
₹12,000
```

Total:

```text id="z4t3q2"
₹27,000
```

Reject.

---

# 35. DAILY LIMIT CALCULATION

Query today's successful outgoing transfers for the source account.

Conceptually:

```text id="9m7f2d"
Today's outgoing transfers
+
new transfer amount
<=
dailyTransferLimit
```

Only successful debit transactions should count.

Do not count:

```text id="j7k5l3"
failed transfers
rejected transfers
cancelled transfers
```

If the Transaction collection has not yet been implemented by Member 3, coordinate the interface with Member 3 before final integration.

---

# 36. TIMEZONE

The assignment allows the team to assume a single timezone.

Use:

```text id="w8t4e6"
Asia/Kolkata
```

for this project if the team has not selected another timezone.

Daily transfer limits should reset according to the chosen project timezone.

Document this in the README.

---

# 37. TRANSFER ATOMICITY

The transfer involves:

```text id="z8f3x1"
Sender balance decrease
+
Receiver balance increase
```

These operations should not leave the database in an inconsistent state.

Use MongoDB transactions/session if the MongoDB deployment supports transactions.

Preferred:

```text id="8v4k1d"
startSession()
startTransaction()

update sender
update receiver

commitTransaction()
```

If anything fails:

```text id="4j9z6m"
abortTransaction()
```

This ensures:

```text id="8k3l5p"
Either BOTH balance updates happen
or
NEITHER happens
```

Do not perform sender update and receiver update independently without considering failure between them.

---

# 38. IMPORTANT MONGODB REQUIREMENT

MongoDB transactions require an appropriate MongoDB deployment configuration.

If local MongoDB is being used, configure a replica set if required.

If transactions cannot be used in the team's environment, implement the safest atomic-style approach possible and document the limitation.

Do NOT claim a transaction is atomic if the implementation is actually two independent updates.

---

# 39. CONCURRENCY

Avoid this unsafe pattern:

```text id="l0r8n3"
Read balance
   ↓
Calculate new balance
   ↓
Wait
   ↓
Update balance
```

because two simultaneous requests could potentially spend the same balance.

Prefer conditional updates / transactions.

For example, conceptually:

```text id="8t7k2v"
Update account
WHERE
_id = sender
AND
balance - amount >= minimumBalance
```

Then verify the update succeeded.

A MongoDB transaction with appropriate checks is preferred.

---

# 40. TRANSFER SUCCESS RESPONSE

Example:

```json id="6s0u4f"
{
    "success": true,
    "message": "Transfer completed successfully",
    "data": {
        "fromAccount": "10000001",
        "toAccount": "10000002",
        "amount": 5000,
        "remainingBalance": 45000
    }
}
```

Status:

```text id="8g9h0j"
200 OK
```

Member 3 will later add ledger records around this transfer.

---

# 41. IMPORTANT INTEGRATION WITH MEMBER 3

Member 3 owns:

```text id="3j0k5l"
Transaction Ledger
```

Member 2 owns:

```text id="z6r9y2"
Transfer execution
```

Therefore coordinate the exact transfer/transaction boundary.

Recommended flow:

```text id="r1x4v8"
Member 2 Transfer Controller
        |
        v
Validate transfer
        |
        v
Execute balance transaction
        |
        v
Create/trigger transaction ledger records
```

However, do not duplicate Member 3's ledger implementation.

Agree with Member 3 on a helper/service interface if needed.

---

# 42. RECOMMENDED TRANSFER SERVICE

Instead of placing every transfer operation inside the controller, create:

```text id="e4t5q1"
services/
└── transferService.js
```

The controller should handle:

```text id="j9k0l2"
HTTP request
validation
response
```

The service should handle:

```text id="m3n4b5"
ownership
beneficiary validation
balance checks
limit checks
database transaction
balance updates
```

This keeps the business logic clean.

---

# 43. BENEFICIARY API SUMMARY

Implement:

```text id="f8g9h0"
POST   /api/beneficiaries
GET    /api/beneficiaries/:accountId
GET    /api/beneficiaries/:id
DELETE /api/beneficiaries/:id
```

Authentication required for all.

Customer ownership required for all.

---

# 44. TRANSFER API SUMMARY

Implement:

```text id="c7d8e9"
POST /api/transactions/transfer
```

Authentication required.

Role:

```text id="g0h1i2"
CUSTOMER
```

---

# 45. BUSINESS RULE SUMMARY

The transfer must fail if:

```text id="j3k4l5"
Source account does not exist
Source account is not owned by customer
Source account is not ACTIVE
Beneficiary does not exist
Beneficiary belongs to another account
Destination account does not exist
Destination account is not ACTIVE
Destination is same as source
Amount <= 0
Insufficient balance
Minimum balance would be violated
Daily transfer limit would be exceeded
Database transaction fails
```

---

# 46. ERROR CODES

Use consistent codes:

```text id="m6n7o8"
ACCOUNT_NOT_FOUND
ACCOUNT_NOT_ACTIVE
ACCOUNT_NOT_OWNED
BENEFICIARY_NOT_FOUND
BENEFICIARY_NOT_OWNED
BENEFICIARY_ACCOUNT_NOT_FOUND
DUPLICATE_BENEFICIARY
SELF_BENEFICIARY
SELF_TRANSFER
INVALID_AMOUNT
INSUFFICIENT_BALANCE
MINIMUM_BALANCE_VIOLATION
DAILY_LIMIT_EXCEEDED
TRANSFER_FAILED
```

---

# 47. HTTP STATUS CODES

Use:

```text id="p9q0r1"
200 → successful retrieval/transfer
201 → beneficiary created
400 → invalid request/business input
401 → authentication failure
403 → ownership/permission failure
404 → resource not found
409 → business conflict
500 → unexpected error
```

---

# 48. VALIDATION

Use the project's selected validation library.

Validate:

### Beneficiary

```text id="s2t3u4"
accountId
beneficiaryAccountNumber
nickname
```

### Transfer

```text id="v5w6x7"
fromAccountId
beneficiaryId
amount
```

Do not rely on frontend/Postman validation.

---

# 49. INVALID OBJECT IDS

Before querying:

```text id="y8z9a0"
fromAccountId
beneficiaryId
accountId
```

check whether they are valid MongoDB ObjectIds.

Invalid IDs must not crash the server.

Return a clean response.

---

# 50. OWNERSHIP CHECKS

For every customer operation:

```text id="b1c2d3"
req.user.userId
```

must be compared against the account owner.

Examples:

```text id="e4f5g6"
Add beneficiary
     ↓
Source account owner = current user

List beneficiaries
     ↓
Account owner = current user

Transfer
     ↓
Source account owner = current user

Delete beneficiary
     ↓
Beneficiary account owner = current user
```

---

# 51. DO NOT TRUST CLIENT DATA

Never trust:

```json id="h7i8j9"
{
    "userId": "..."
}
```

or:

```json id="k0l1m2"
{
    "balance": 999999
}
```

or:

```json id="n3o4p5"
{
    "minimumBalance": 0
}
```

or:

```json id="q6r7s8"
{
    "dailyTransferLimit": 999999999
}
```

These must come from the database/backend.

---

# 52. BENEFICIARY SECURITY

Never allow:

```text id="t9u0v1"
Customer A
     ↓
source account = Customer B's account
```

Always verify account ownership.

Never allow:

```text id="w2x3y4"
Customer A
     ↓
transfer
     ↓
Customer B's beneficiary
```

unless that beneficiary belongs to the source account.

---

# 53. TEST CASES — BENEFICIARY

Create Postman tests.

### Test 1

Add valid beneficiary.

Expected:

```text id="z5a6b7"
201
```

### Test 2

Invalid source account.

Expected:

```text id="c8d9e0"
404
```

### Test 3

Source account belongs to another user.

Expected:

```text id="f1g2h3"
403
```

### Test 4

Destination account doesn't exist.

Expected:

```text id="i4j5k6"
404
```

### Test 5

Add own account.

Expected:

```text id="l7m8n9"
400
```

### Test 6

Duplicate beneficiary.

Expected:

```text id="o0p1q2"
409
```

### Test 7

Frozen source account.

Expected:

```text id="r3s4t5"
400/409
```

### Test 8

List own beneficiaries.

Expected:

```text id="u6v7w8"
200
```

### Test 9

Attempt to list another customer's beneficiaries.

Expected:

```text id="x9y0z1"
403/404
```

### Test 10

Delete own beneficiary.

Expected:

```text id="a2b3c4"
200
```

---

# 54. TEST CASES — TRANSFER

### Test 1 — Successful transfer

```text id="d5e6f7"
Balance = ₹50,000
Minimum = ₹5,000
Transfer = ₹5,000
```

Expected:

```text id="g8h9i0"
200
```

---

### Test 2 — Zero amount

```text id="j1k2l3"
amount = 0
```

Expected:

```text id="m4n5o6"
400
```

---

### Test 3 — Negative amount

```text id="p7q8r9"
amount = -500
```

Expected:

```text id="s0t1u2"
400
```

---

### Test 4 — Insufficient balance

```text id="v3w4x5"
Balance = ₹10,000
Transfer = ₹20,000
```

Expected:

```text id="y6z7a8"
409
```

---

### Test 5 — Minimum balance violation

```text id="b9c0d1"
Balance = ₹10,000
Minimum = ₹5,000
Transfer = ₹6,000
```

Expected:

```text id="e2f3g4"
409
```

---

### Test 6 — Daily limit

```text id="h5i6j7"
Daily limit = ₹25,000
Already transferred = ₹20,000
New transfer = ₹10,000
```

Expected:

```text id="k8l9m0"
409
```

---

### Test 7 — Frozen account

```text id="n1o2p3"
Source account = FROZEN
```

Expected:

```text id="q4r5s6"
409
```

---

### Test 8 — Invalid beneficiary

```text id="t7u8v9"
beneficiaryId = nonexistent
```

Expected:

```text id="w0x1y2"
404
```

---

### Test 9 — Beneficiary belongs to another source account

Expected:

```text id="z3a4b5"
403
```

---

### Test 10 — Self transfer

Expected:

```text id="c6d7e8"
400
```

---

### Test 11 — No JWT

Expected:

```text id="f9g0h1"
401
```

---

### Test 12 — Customer tries another user's account

Expected:

```text id="i2j3k4"
403/404
```

---

# 55. CONCURRENCY TEST

Test two transfers arriving almost simultaneously.

Example:

```text id="l5m6n7"
Balance = ₹10,000
Minimum = ₹1,000

Request A = ₹8,000
Request B = ₹8,000
```

The system must NOT allow both.

At most one should succeed because allowing both could create an invalid balance.

This is an important test of the transfer implementation.

---

# 56. INTEGRATION TEST WITH MEMBER 1

The following must work using Member 1's account/authentication implementation:

```text id="o8p9q0"
Register
   ↓
KYC verification
   ↓
Create account
   ↓
Staff approval
   ↓
Account becomes ACTIVE
   ↓
Customer login
   ↓
JWT
   ↓
Add beneficiary
```

Do not create fake authentication or fake accounts just to test your module.

---

# 57. INTEGRATION TEST WITH MEMBER 3

After Member 3 implements the ledger:

Successful transfer should result in:

```text id="r1s2t3"
Sender
   ↓
DEBIT

Receiver
   ↓
CREDIT
```

Member 2 must coordinate with Member 3 so that the same transfer does not create duplicate ledger records.

Recommended unique transfer reference:

```text id="u4v5w6"
transferId
```

If the team chooses to implement it, both debit and credit records can reference the same transfer ID.

---

# 58. RECOMMENDED TRANSFER ID

Consider generating:

```text id="x7y8z9"
transferId
```

for every transfer.

Example:

```text id="a0b1c2"
TRF-20260904-000001
```

Then:

```text id="d3e4f5"
DEBIT
transferId = TRF-20260904-000001

CREDIT
transferId = TRF-20260904-000001
```

This makes the two sides of a transfer easy to identify.

Coordinate this with Member 3 before implementing it.

---

# 59. TRANSACTION BOUNDARY

The ideal final architecture is:

```text id="g6h7i8"
HTTP Request
      ↓
transferController
      ↓
transferService
      ↓
Validation
      ↓
MongoDB Transaction
      |
      +---- Sender Balance
      |
      +---- Receiver Balance
      |
      +---- Ledger Records
      |
      +---- Commit
      ↓
Response
```

However, Member 2 should not duplicate Member 3's ledger code.

Define a clean interface between the two members.

---

# 60. README / DOCUMENTATION REQUIREMENTS

Document:

```text id="j9k0l1"
1. Beneficiary APIs
2. Transfer API
3. Request bodies
4. Response bodies
5. Authentication requirements
6. Ownership rules
7. Minimum balance rules
8. Daily limit rules
9. Error codes
10. Transfer atomicity approach
11. MongoDB transaction requirements
12. Integration requirements
```

---

# 61. GIT BRANCH

Use:

```text id="m2n3o4"
feature/member2-beneficiary-transfer
```

Recommended commits:

```text id="p5q6r7"
feat: create beneficiary schema

feat: add beneficiary validation

feat: implement beneficiary creation

feat: implement beneficiary listing

feat: implement beneficiary deletion

feat: add beneficiary ownership checks

feat: implement transfer service

feat: add transfer amount validation

feat: add minimum balance validation

feat: add daily transfer limit validation

feat: implement atomic transfer processing

feat: add transfer ownership validation

test: add beneficiary API tests

test: add transfer business rule tests

docs: document beneficiary and transfer APIs
```

Commit regularly.

Do not make one giant:

```text id="s8t9u0"
final-project-working
```

commit.

---

# 62. DEFINITION OF DONE

Member 2 is complete only when:

## Beneficiary

- [ ] Beneficiary schema implemented
- [ ] Account reference implemented
- [ ] Beneficiary account validation
- [ ] Source account ownership validation
- [ ] Source account status validation
- [ ] Self-beneficiary prevented
- [ ] Duplicate beneficiary prevented
- [ ] Add beneficiary works
- [ ] List beneficiaries works
- [ ] Get beneficiary works
- [ ] Delete beneficiary works
- [ ] Customer cannot access another user's beneficiary

## Fund Transfer

- [ ] Transfer endpoint works
- [ ] JWT required
- [ ] Customer role required
- [ ] Source account ownership verified
- [ ] Source account existence verified
- [ ] Source account ACTIVE check
- [ ] Beneficiary existence verified
- [ ] Beneficiary ownership verified
- [ ] Destination account verified
- [ ] Destination ACTIVE check
- [ ] Self-transfer prevented
- [ ] Amount validated
- [ ] Balance validated
- [ ] Minimum balance validated
- [ ] Daily limit validated
- [ ] Balance updates handled safely
- [ ] Atomic transaction used where supported
- [ ] Failed transfer does not partially update balances

## Security

- [ ] No client-controlled userId
- [ ] No client-controlled balance
- [ ] No client-controlled minimum balance
- [ ] No client-controlled daily limit
- [ ] Ownership checks everywhere
- [ ] Invalid IDs handled
- [ ] JWT middleware reused
- [ ] Role middleware reused

## Testing

- [ ] Successful beneficiary
- [ ] Duplicate beneficiary
- [ ] Self-beneficiary
- [ ] Unauthorized beneficiary
- [ ] Successful transfer
- [ ] Invalid amount
- [ ] Insufficient balance
- [ ] Minimum balance violation
- [ ] Daily limit violation
- [ ] Frozen account
- [ ] Invalid beneficiary
- [ ] Unauthorized source account
- [ ] Self-transfer
- [ ] Missing JWT
- [ ] Concurrent transfer scenario

---

# 63. FINAL ACCEPTANCE FLOW

The following complete flow must work:

```text id="v1w2x3"
CUSTOMER LOGIN
       ↓
JWT
       ↓
CUSTOMER SELECTS OWN ACCOUNT
       ↓
ACCOUNT = ACTIVE
       ↓
ADD BENEFICIARY
       ↓
BENEFICIARY VERIFIED
       ↓
TRANSFER ₹5,000
       ↓
SOURCE OWNERSHIP CHECK
       ↓
ACCOUNT STATUS CHECK
       ↓
BENEFICIARY CHECK
       ↓
DESTINATION CHECK
       ↓
BALANCE CHECK
       ↓
MINIMUM BALANCE CHECK
       ↓
DAILY LIMIT CHECK
       ↓
ATOMIC TRANSFER
       ↓
SENDER BALANCE DECREASED
       ↓
RECEIVER BALANCE INCREASED
       ↓
MEMBER 3 LEDGER RECORDS
       ↓
SUCCESS RESPONSE
```

---

# 64. FAILURE SCENARIO ACCEPTANCE

The following must fail safely:

```text id="y4z5a6"
₹10,000 balance
₹5,000 minimum
₹6,000 transfer
        ↓
TRANSFER REJECTED
        ↓
Balance remains ₹10,000
```

The following must also fail:

```text id="b7c8d9"
FROZEN ACCOUNT
      ↓
TRANSFER
      ↓
REJECTED
```

And:

```text id="e0f1g2"
DAILY LIMIT = ₹25,000
TODAY'S TRANSFERS = ₹20,000
NEW TRANSFER = ₹10,000
      ↓
REJECTED
```

And:

```text id="h3i4j5"
CUSTOMER A
      ↓
attempts to use
      ↓
CUSTOMER B's account
      ↓
REJECTED
```

---

# 65. MEMBER 2 FINAL GOAL

The final Member 2 implementation must provide a secure banking transfer engine where an authenticated customer can manage beneficiaries and transfer funds only from accounts they own and only when all banking business rules are satisfied.

The system must protect against:

```text id="k6l7m8"
Unauthorized account access
Unauthorized beneficiary use
Invalid transfers
Insufficient balance
Minimum balance violations
Daily limit violations
Frozen/inactive accounts
Self transfers
Duplicate beneficiaries
Concurrent balance corruption
Partial balance updates
```

The implementation must be cleanly separated from Member 1's authentication/account foundation and Member 3's transaction ledger.

**Member 2 owns the decision and execution of whether a transfer is allowed and the safe movement of balances. Member 3 owns the permanent transaction ledger records.**