# P10 — Member 1 Implementation Specification

## Branch

```text
feature/member1-auth-kyc-accounts
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

# 1. IMPORTANT — SCOPE OF THIS BRANCH

This branch belongs to **Member 1 only**.

Implement ONLY the following responsibilities:

### Module 1 — Customer Onboarding & KYC Capture

### Module 2 — Account Approval Workflow

### Module 3 — Account Management

### Module 13 — Authentication & Role-Based Access Control foundation

Do NOT implement the following modules in this branch:

- Beneficiary Management
- Fund Transfer Engine
- Transaction Ledger
- Account Statement Generation
- Minimum Balance enforcement during transfers
- Daily transfer processing
- Suspicious Transaction Flagging
- Account Freeze/Unfreeze
- Interest Calculation Job
- Staff Monitoring Dashboard

Those modules belong to other team members.

However, the Account schema must contain the fields required by those future modules so that other team members can integrate without changing the fundamental schema.

---

# 2. PRIMARY OBJECTIVE

Build the complete authentication, customer onboarding, KYC, account creation, and account approval foundation.

The expected flow is:

```text
Customer
   |
   v
Register
   |
   v
KYC Status = PENDING
   |
   v
Login
   |
   v
JWT Token
   |
   v
Create Account
   |
   v
Account Status = PENDING
   |
   v
Bank Staff Login
   |
   v
View Pending Accounts
   |
   +-------> Approve
   |             |
   |             v
   |        Account = ACTIVE
   |
   +-------> Reject
                 |
                 v
          Account = REJECTED
```

The system must enforce authentication, authorization, validation, ownership, and valid status transitions.

---

# 3. CODING RULES

Follow these rules throughout the implementation:

1. Use MVC architecture.
2. Do not put all logic into `server.js`.
3. Use controllers for business logic.
4. Use routes for endpoint definitions.
5. Use middleware for authentication, authorization, and validation.
6. Use Mongoose models for database schemas.
7. Never store plain-text passwords.
8. Never hardcode JWT secrets.
9. Never trust `userId` supplied by a customer in the request body.
10. Never allow customers to directly modify account balance.
11. Never allow customers to change their own role.
12. Never allow customers to approve accounts.
13. Do not allow arbitrary account status changes.
14. Use centralized error handling.
15. Return consistent JSON responses.
16. Validate all incoming request data server-side.
17. Use async/await.
18. Handle rejected promises properly.
19. Do not expose passwords or password hashes in API responses.
20. Do not commit `.env`.

---

# 4. EXPECTED FOLDER STRUCTURE

Use or create the following structure:

```text
project-root/
│
├── config/
│   └── db.js
│
├── models/
│   ├── User.js
│   ├── Account.js
│   └── Approval.js
│
├── controllers/
│   ├── authController.js
│   └── accountController.js
│
├── routes/
│   ├── authRoutes.js
│   └── accountRoutes.js
│
├── middleware/
│   ├── auth.js
│   ├── role.js
│   ├── validate.js
│   └── errorHandler.js
│
├── utils/
│   ├── token.js
│   └── accountNumber.js
│
├── validators/
│   ├── authValidator.js
│   └── accountValidator.js
│
├── .env
├── .env.example
├── .gitignore
├── server.js
├── package.json
└── README.md
```

If some of these files already exist, modify them instead of creating duplicate files.

---

# 5. ENVIRONMENT VARIABLES

Use `.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/digital_banking
JWT_SECRET=replace_with_secure_secret
JWT_EXPIRES_IN=1d
```

`.env.example`:

```env
PORT=5000
MONGO_URI=
JWT_SECRET=
JWT_EXPIRES_IN=1d
```

`.gitignore` must contain:

```text
node_modules/
.env
```

Never commit the real `.env`.

---

# 6. USER MODEL

Create/update:

```text
models/User.js
```

Schema:

```javascript
{
    name: String,
    email: String,
    passwordHash: String,
    role: String,
    kycStatus: String,

    kyc: {
        phone: String,
        pan: String,
        address: String,
        dateOfBirth: Date
    },

    createdAt: Date,
    updatedAt: Date
}
```

Use Mongoose timestamps.

---

# 7. USER FIELD REQUIREMENTS

## name

Required.

Rules:

```text
minimum 2 characters
maximum 100 characters
trim whitespace
```

---

## email

Required.

Rules:

```text
valid email format
lowercase
trim whitespace
unique
```

Create a unique index.

---

## passwordHash

Required.

Never store a plain-text password.

Do NOT call the field `password`.

Use:

```text
passwordHash
```

---

# 8. USER ROLE

Allowed values:

```text
CUSTOMER
BANK_STAFF
ADMIN
```

Default:

```text
CUSTOMER
```

IMPORTANT:

A public registration request must NEVER be allowed to create an ADMIN or BANK_STAFF user.

If the request contains:

```json
{
    "role": "ADMIN"
}
```

the API must either reject the request or ignore the role and create the account as:

```text
CUSTOMER
```

Recommended behavior:

Ignore the submitted role and always create public registrations as `CUSTOMER`.

Staff/Admin accounts should be created through a controlled administrative mechanism or database seed.

---

# 9. KYC STATUS

Allowed values:

```text
PENDING
VERIFIED
REJECTED
```

New customer:

```text
kycStatus = PENDING
```

A customer must not be able to directly set:

```text
kycStatus = VERIFIED
```

through the public registration endpoint.

For this branch, KYC verification can be implemented through an authorized staff/admin endpoint if required by the existing project design.

---

# 10. KYC DATA

Store:

```text
phone
pan
address
dateOfBirth
```

Validation:

### Phone

10-digit Indian mobile number.

### PAN

Basic PAN format:

```text
ABCDE1234F
```

### Address

Required and non-empty.

### Date of birth

Must be a valid date.

---

# 11. ACCOUNT MODEL

Create/update:

```text
models/Account.js
```

Schema:

```javascript
{
    userId: ObjectId,

    accountNumber: String,

    type: String,

    balance: Number,

    minimumBalance: Number,

    dailyTransferLimit: Number,

    status: String,

    createdAt: Date,
    updatedAt: Date
}
```

Use:

```text
userId → User ObjectId
```

with Mongoose `ref: "User"`.

---

# 12. ACCOUNT TYPES

Allowed values:

```text
SAVINGS
CURRENT
```

Reject all other values.

---

# 13. ACCOUNT STATUS

Use:

```text
PENDING
ACTIVE
REJECTED
FROZEN
CLOSED
```

Member 1 primarily owns:

```text
PENDING → ACTIVE
PENDING → REJECTED
```

Other team members will later own:

```text
ACTIVE ↔ FROZEN
```

and other future transitions.

Do NOT implement freeze/unfreeze logic in this branch.

---

# 14. ACCOUNT DEFAULT CONFIGURATION

Use the following project defaults unless the team has agreed on different values.

### SAVINGS

```text
minimumBalance = 5000
dailyTransferLimit = 25000
```

### CURRENT

```text
minimumBalance = 10000
dailyTransferLimit = 100000
```

These values must be controlled by the backend.

Do not trust the customer to submit:

```json
{
    "minimumBalance": 0,
    "dailyTransferLimit": 999999999
}
```

The customer request should only specify the account type and initial deposit.

---

# 15. ACCOUNT NUMBER

Create:

```text
utils/accountNumber.js
```

Generate a unique account number.

Example:

```text
10000001
10000002
10000003
```

Store it as a String.

The database must have:

```text
unique: true
```

Before creating an account, ensure the generated account number is unique.

---

# 16. APPROVAL MODEL

Create:

```text
models/Approval.js
```

Schema:

```javascript
{
    accountId: ObjectId,

    staffId: ObjectId,

    decision: String,

    remarks: String,

    createdAt: Date
}
```

References:

```text
accountId → Account
staffId → User
```

Allowed decisions:

```text
APPROVED
REJECTED
```

Use timestamps.

---

# 17. DATABASE INDEXES

Create these indexes:

## User

```text
email → unique
```

## Account

```text
accountNumber → unique
userId
```

## Approval

```text
accountId
```

Use Mongoose indexes.

---

# 18. AUTHENTICATION — REGISTER

Endpoint:

```http
POST /api/auth/register
```

Request:

```json
{
    "name": "Rahul Sharma",
    "email": "rahul@gmail.com",
    "password": "Rahul@123",
    "phone": "9876543210",
    "pan": "ABCDE1234F",
    "address": "Bangalore",
    "dateOfBirth": "2004-05-15"
}
```

---

# 19. REGISTRATION LOGIC

Implement exactly this process:

```text
Request
   |
   v
Validate input
   |
   v
Check duplicate email
   |
   v
Hash password using bcrypt
   |
   v
Create User
   |
   v
role = CUSTOMER
   |
   v
kycStatus = PENDING
   |
   v
Return safe response
```

Do not return:

```text
password
passwordHash
JWT secret
```

---

# 20. REGISTRATION SUCCESS

Status:

```text
201 Created
```

Response:

```json
{
    "success": true,
    "message": "Customer registered successfully",
    "data": {
        "userId": "USER_ID",
        "name": "Rahul Sharma",
        "email": "rahul@gmail.com",
        "role": "CUSTOMER",
        "kycStatus": "PENDING"
    }
}
```

---

# 21. DUPLICATE REGISTRATION

If email already exists:

```text
409 Conflict
```

Response:

```json
{
    "success": false,
    "message": "Email is already registered",
    "errorCode": "DUPLICATE_EMAIL"
}
```

---

# 22. AUTHENTICATION — LOGIN

Endpoint:

```http
POST /api/auth/login
```

Request:

```json
{
    "email": "rahul@gmail.com",
    "password": "Rahul@123"
}
```

Logic:

```text
Request
   |
   v
Validate input
   |
   v
Find user by email
   |
   v
bcrypt.compare()
   |
   v
Generate JWT
   |
   v
Return token
```

---

# 23. JWT PAYLOAD

JWT should contain only necessary identity information.

Recommended:

```json
{
    "userId": "USER_OBJECT_ID",
    "role": "CUSTOMER"
}
```

Do not put:

```text
password
passwordHash
KYC documents
account balance
```

inside the JWT.

Use:

```env
JWT_SECRET
JWT_EXPIRES_IN
```

from `.env`.

---

# 24. LOGIN SUCCESS RESPONSE

Status:

```text
200 OK
```

Response:

```json
{
    "success": true,
    "message": "Login successful",
    "data": {
        "token": "JWT_TOKEN",
        "user": {
            "id": "USER_ID",
            "name": "Rahul Sharma",
            "email": "rahul@gmail.com",
            "role": "CUSTOMER",
            "kycStatus": "PENDING"
        }
    }
}
```

---

# 25. INVALID LOGIN

If credentials are incorrect:

```text
401 Unauthorized
```

Response:

```json
{
    "success": false,
    "message": "Invalid email or password",
    "errorCode": "INVALID_CREDENTIALS"
}
```

Do not reveal whether the email or password was incorrect.

---

# 26. JWT AUTHENTICATION MIDDLEWARE

Create/update:

```text
middleware/auth.js
```

Middleware should:

1. Read the `Authorization` header.
2. Verify `Bearer <token>` format.
3. Extract token.
4. Verify token using `JWT_SECRET`.
5. Decode user ID and role.
6. Attach authenticated user to request.
7. Continue with `next()`.

Example:

```text
Authorization: Bearer eyJ...
```

After successful verification:

```javascript
req.user = {
    userId: decoded.userId,
    role: decoded.role
};
```

---

# 27. AUTHENTICATION ERRORS

No token:

```text
401
```

Invalid token:

```text
401
```

Expired token:

```text
401
```

Use consistent responses.

Example:

```json
{
    "success": false,
    "message": "Authentication required",
    "errorCode": "AUTH_REQUIRED"
}
```

or:

```json
{
    "success": false,
    "message": "Invalid or expired token",
    "errorCode": "INVALID_TOKEN"
}
```

---

# 28. ROLE AUTHORIZATION MIDDLEWARE

Create/update:

```text
middleware/role.js
```

It should accept allowed roles.

Example:

```javascript
authorize("BANK_STAFF", "ADMIN")
```

If the user's role is not allowed:

```text
403 Forbidden
```

Response:

```json
{
    "success": false,
    "message": "You do not have permission to perform this action",
    "errorCode": "FORBIDDEN"
}
```

---

# 29. CUSTOMER PROFILE

Implement:

```http
GET /api/customers/me
```

Authentication required.

The user ID must come from:

```text
req.user.userId
```

not from the request query/body.

Return the authenticated user's profile.

Never return:

```text
passwordHash
```

---

# 30. ACCOUNT CREATION

Endpoint:

```http
POST /api/accounts
```

Authentication:

```text
Required
```

Role:

```text
CUSTOMER
```

Request:

```json
{
    "type": "SAVINGS",
    "initialDeposit": 10000
}
```

Do NOT accept these from the client:

```text
userId
accountNumber
status
minimumBalance
dailyTransferLimit
```

The backend controls those values.

---

# 31. ACCOUNT CREATION LOGIC

Implement:

```text
JWT
 |
 v
Get authenticated user
 |
 v
Verify user exists
 |
 v
Validate account type
 |
 v
Validate initial deposit
 |
 v
Check KYC eligibility
 |
 v
Generate account number
 |
 v
Determine account defaults
 |
 v
Create account
 |
 v
status = PENDING
 |
 v
Return account
```

---

# 32. KYC ELIGIBILITY

Recommended rule:

```text
kycStatus must be VERIFIED
```

before creating a banking account.

If:

```text
kycStatus = PENDING
```

reject account creation.

Response:

```json
{
    "success": false,
    "message": "KYC verification is required before opening an account",
    "errorCode": "KYC_NOT_VERIFIED"
}
```

Status:

```text
400 Bad Request
```

If the team decides that account applications may be created before KYC verification, document that decision consistently across the project.

---

# 33. INITIAL DEPOSIT

Rules:

```text
initialDeposit >= 0
```

Recommended:

```text
initialDeposit >= minimumBalance
```

For example:

```text
Savings minimum = ₹5,000
Initial deposit = ₹2,000
```

should be rejected.

Response:

```json
{
    "success": false,
    "message": "Initial deposit must satisfy the minimum balance requirement",
    "errorCode": "MINIMUM_BALANCE_REQUIRED"
}
```

---

# 34. ACCOUNT CREATION SUCCESS

Status:

```text
201 Created
```

Response:

```json
{
    "success": true,
    "message": "Account application created successfully",
    "data": {
        "accountId": "ACCOUNT_ID",
        "accountNumber": "10000001",
        "type": "SAVINGS",
        "balance": 10000,
        "minimumBalance": 5000,
        "dailyTransferLimit": 25000,
        "status": "PENDING"
    }
}
```

---

# 35. ACCOUNT RETRIEVAL

Implement:

```http
GET /api/accounts
```

Authentication required.

Customer should receive only their own accounts.

Query using:

```text
req.user.userId
```

Example:

```javascript
Account.find({
    userId: req.user.userId
});
```

Never accept arbitrary user IDs from customers.

---

# 36. SINGLE ACCOUNT RETRIEVAL

Implement:

```http
GET /api/accounts/:id
```

Authentication required.

For customers:

```text
account.userId === req.user.userId
```

must be true.

If not authorized, return:

```text
403
```

or:

```text
404
```

depending on the team's security approach.

Do not leak another customer's account information.

---

# 37. ACCOUNT UPDATE

Do NOT create a generic endpoint that allows customers to update every Account field.

Customers must NOT directly update:

```text
balance
accountNumber
userId
status
minimumBalance
dailyTransferLimit
```

These are controlled by backend business logic.

If no customer account update is required, do not implement a generic account update endpoint.

---

# 38. ACCOUNT APPROVAL — STAFF

Endpoint:

```http
GET /api/staff/pending-accounts
```

Authentication:

```text
Required
```

Roles:

```text
BANK_STAFF
ADMIN
```

Return accounts where:

```text
status = PENDING
```

Customers must receive:

```text
403 Forbidden
```

---

# 39. APPROVE / REJECT ACCOUNT

Endpoint:

```http
PUT /api/accounts/:id/approve
```

Authentication:

```text
Required
```

Roles:

```text
BANK_STAFF
ADMIN
```

Request for approval:

```json
{
    "status": "APPROVED",
    "remarks": "KYC verified successfully"
}
```

Request for rejection:

```json
{
    "status": "REJECTED",
    "remarks": "KYC documents could not be verified"
}
```

---

# 40. APPROVAL WORKFLOW

Only this transition is allowed:

```text
PENDING → ACTIVE
```

when approved.

And:

```text
PENDING → REJECTED
```

when rejected.

Do NOT allow:

```text
ACTIVE → APPROVED
ACTIVE → REJECTED
REJECTED → ACTIVE
FROZEN → APPROVED
```

unless a future business rule explicitly adds such functionality.

---

# 41. APPROVAL VALIDATION

Before changing status:

1. Validate MongoDB ID.
2. Find account.
3. Ensure account exists.
4. Ensure current status is `PENDING`.
5. Validate requested status.
6. Verify authenticated user role.
7. Update status.
8. Create approval record.
9. Return updated account status.

---

# 42. INVALID STATUS TRANSITION

If account is already:

```text
ACTIVE
```

and staff tries to approve it:

Return:

```text
409 Conflict
```

Response:

```json
{
    "success": false,
    "message": "Only pending accounts can be approved or rejected",
    "errorCode": "INVALID_STATUS_TRANSITION"
}
```

This is an important business-rule test.

---

# 43. APPROVAL AUDIT RECORD

When staff approves:

```text
approvals.decision = APPROVED
```

When staff rejects:

```text
approvals.decision = REJECTED
```

Store:

```text
accountId
staffId
decision
remarks
createdAt
```

The staff ID must come from:

```text
req.user.userId
```

Never trust a client-supplied `staffId`.

---

# 44. APPROVAL HISTORY

Implement:

```http
GET /api/accounts/:id/approval-history
```

Authentication required.

Customer may view the approval history for their own account.

Staff/Admin may view authorized account approval history.

Do not expose unrelated customer information.

---

# 45. KYC VERIFICATION — OPTIONAL BUT RECOMMENDED

If the project requires staff to verify KYC separately, implement:

```http
PUT /api/customers/:id/kyc
```

Allowed roles:

```text
BANK_STAFF
ADMIN
```

Request:

```json
{
    "kycStatus": "VERIFIED"
}
```

or:

```json
{
    "kycStatus": "REJECTED"
}
```

Customer cannot call this endpoint.

If this endpoint is implemented, validate KYC status transitions and record who performed the verification.

---

# 46. VALID MONGODB ID CHECKING

Every endpoint receiving:

```text
:id
```

must validate whether the ID is a valid MongoDB ObjectId before querying.

Invalid:

```text
/api/accounts/hello
```

must NOT crash the server.

Return:

```text
400 Bad Request
```

or:

```text
404 Not Found
```

with a clean JSON response.

---

# 47. CENTRALIZED ERROR HANDLER

Use:

```text
middleware/errorHandler.js
```

All controllers should pass unexpected errors to the centralized error handler.

The server must not crash because of:

```text
invalid MongoDB ID
duplicate key
validation error
database error
unexpected exception
```

Response format:

```json
{
    "success": false,
    "message": "Meaningful error message",
    "errorCode": "ERROR_CODE"
}
```

---

# 48. VALIDATION MIDDLEWARE

Use:

```text
express-validator
```

or:

```text
Joi
```

Validation must happen before controller logic.

At minimum validate:

```text
Registration
Login
Account creation
Account approval
KYC update
```

---

# 49. SECURITY — MASS ASSIGNMENT

Never use:

```javascript
User.create(req.body);
```

Never use:

```javascript
Account.create(req.body);
```

without explicitly selecting allowed fields.

For registration:

```text
name
email
password
phone
pan
address
dateOfBirth
```

For account creation:

```text
type
initialDeposit
```

Everything else must be controlled by the backend.

---

# 50. SECURITY — OWNERSHIP

Customer requests must always use:

```text
req.user.userId
```

For example:

```javascript
const accounts = await Account.find({
    userId: req.user.userId
});
```

Do not allow:

```text
?userId=another-user
```

to override ownership.

---

# 51. SECURITY — PASSWORD

Use bcrypt/bcryptjs.

Registration:

```text
plain password
       ↓
bcrypt.hash()
       ↓
passwordHash
       ↓
MongoDB
```

Login:

```text
entered password
       ↓
bcrypt.compare()
       ↓
passwordHash
```

Never log passwords.

Never return password hashes.

---

# 52. API SUMMARY

Member 1 must implement at least:

```text
POST   /api/auth/register
POST   /api/auth/login

GET    /api/customers/me

POST   /api/accounts
GET    /api/accounts
GET    /api/accounts/:id

GET    /api/staff/pending-accounts

PUT    /api/accounts/:id/approve

GET    /api/accounts/:id/approval-history
```

Optional:

```text
PUT /api/customers/:id/kyc
```

---

# 53. RESPONSE FORMAT

Success:

```json
{
    "success": true,
    "message": "Operation successful",
    "data": {}
}
```

Failure:

```json
{
    "success": false,
    "message": "Meaningful error message",
    "errorCode": "ERROR_CODE"
}
```

Keep response formats consistent.

---

# 54. HTTP STATUS CODES

Use:

```text
200 → successful retrieval/update
201 → resource created
400 → validation/business input error
401 → missing/invalid authentication
403 → authenticated but unauthorized
404 → resource not found
409 → business conflict/duplicate
500 → unexpected server error
```

---

# 55. REQUIRED POSTMAN TESTS

Create a Postman collection for Member 1.

---

## Authentication Tests

### Test 1

Valid registration.

Expected:

```text
201
```

### Test 2

Missing name.

Expected:

```text
400
```

### Test 3

Invalid email.

Expected:

```text
400
```

### Test 4

Weak password.

Expected:

```text
400
```

### Test 5

Duplicate email.

Expected:

```text
409
```

### Test 6

Attempt to register with:

```json
{
    "role": "ADMIN"
}
```

Expected:

```text
role must NOT become ADMIN
```

---

# 56. LOGIN TESTS

### Test 1

Correct email/password.

Expected:

```text
200
JWT returned
```

### Test 2

Wrong password.

Expected:

```text
401
```

### Test 3

Unknown email.

Expected:

```text
401
```

---

# 57. JWT TESTS

### Test 1

Protected endpoint without token.

Expected:

```text
401
```

### Test 2

Invalid JWT.

Expected:

```text
401
```

### Test 3

Expired JWT.

Expected:

```text
401
```

### Test 4

Valid JWT.

Expected:

```text
200
```

---

# 58. ACCOUNT TESTS

### Test 1

Create valid savings account.

Expected:

```text
201
```

### Test 2

Create valid current account.

Expected:

```text
201
```

### Test 3

Invalid account type.

Expected:

```text
400
```

### Test 4

Negative initial deposit.

Expected:

```text
400
```

### Test 5

Deposit below minimum balance.

Expected:

```text
400
```

### Test 6

Customer attempts to submit another user's `userId`.

Expected:

```text
Server ignores/rejects supplied userId.
```

### Test 7

Customer views own account.

Expected:

```text
200
```

### Test 8

Customer attempts to view another user's account.

Expected:

```text
403 or 404
```

---

# 59. APPROVAL TESTS

### Test 1

Staff views pending accounts.

Expected:

```text
200
```

### Test 2

Staff approves pending account.

Expected:

```text
200
status = ACTIVE
```

### Test 3

Staff rejects pending account.

Expected:

```text
200
status = REJECTED
```

### Test 4

Customer attempts to approve account.

Expected:

```text
403
```

### Test 5

Approve already ACTIVE account.

Expected:

```text
409
```

### Test 6

Invalid account ID.

Expected:

```text
400/404
```

### Test 7

Verify approval record exists.

Expected:

```text
accountId
staffId
decision
remarks
createdAt
```

---

# 60. END-TO-END TEST

The complete Member 1 flow must work:

```text
1. Register Customer
        ↓
2. User created
        ↓
3. role = CUSTOMER
        ↓
4. kycStatus = PENDING
        ↓
5. Login
        ↓
6. JWT received
        ↓
7. Complete/verify KYC
        ↓
8. Create Account
        ↓
9. Account = PENDING
        ↓
10. Login as Bank Staff
        ↓
11. View Pending Accounts
        ↓
12. Approve Account
        ↓
13. Account = ACTIVE
        ↓
14. Customer views own account
```

---

# 61. INTEGRATION CONTRACT WITH MEMBER 2

Member 2 is responsible for:

```text
Beneficiary Management
Fund Transfer
Minimum Balance
Daily Limits
```

Member 2 will depend on:

```text
Account._id
Account.userId
Account.accountNumber
Account.balance
Account.minimumBalance
Account.dailyTransferLimit
Account.status
```

Do not rename these fields without communicating with Member 2.

Member 2 must be able to determine:

```text
account.status === "ACTIVE"
```

before transferring money.

---

# 62. INTEGRATION CONTRACT WITH MEMBER 3

Member 3 is responsible for:

```text
Transaction Ledger
Statements
Suspicious Transactions
Interest
```

They will reference:

```text
Account._id
```

using:

```text
Transaction.accountId
```

Do not embed the complete Account object into transactions.

---

# 63. INTEGRATION CONTRACT WITH MEMBER 4

Member 4 is responsible for:

```text
Freeze/Unfreeze
Staff Dashboard
```

They will use:

```text
Account.status
User.role
Approval
```

Do not implement freeze/unfreeze logic here.

Member 4 will extend the existing account status workflow.

---

# 64. IMPORTANT SHARED CONTRACTS

Do not change these values without team agreement.

### Roles

```text
CUSTOMER
BANK_STAFF
ADMIN
```

### KYC

```text
PENDING
VERIFIED
REJECTED
```

### Account Types

```text
SAVINGS
CURRENT
```

### Account Status

```text
PENDING
ACTIVE
REJECTED
FROZEN
CLOSED
```

### Approval Decisions

```text
APPROVED
REJECTED
```

---

# 65. DO NOT IMPLEMENT

Member 1 must NOT implement:

```text
Beneficiary CRUD
Fund transfers
Debit transactions
Credit transactions
Transaction ledger
Statements
Suspicious transaction logic
Freeze/unfreeze
Interest jobs
Staff dashboard
```

Only provide the account/user infrastructure required for these modules.

---

# 66. COPILOT IMPLEMENTATION INSTRUCTIONS

When implementing this specification:

1. First inspect the existing project structure.
2. Do not overwrite working code unnecessarily.
3. Reuse existing Express configuration if present.
4. Reuse existing MongoDB connection if present.
5. Reuse the project's existing error-handling conventions if they satisfy this specification.
6. Create missing models/controllers/routes/middleware.
7. Keep Member 1 code isolated and modular.
8. Do not implement unrelated modules.
9. Use async/await.
10. Add proper try/catch or async error propagation.
11. Validate all input.
12. Test every endpoint.
13. Fix integration errors before declaring completion.
14. Ensure the project starts successfully with `npm run dev` or the existing start command.
15. Do not modify `.env` with real secrets.
16. Do not add `node_modules` to Git.
17. Do not commit passwords, API keys, JWT secrets, or MongoDB credentials.

---

# 67. DEFINITION OF DONE

Member 1 is complete only when:

## Database

- [ ] User schema implemented
- [ ] Account schema implemented
- [ ] Approval schema implemented
- [ ] User email unique index
- [ ] Account number unique index
- [ ] Account userId index
- [ ] Approval accountId index
- [ ] Mongoose references configured correctly

## Authentication

- [ ] Registration works
- [ ] Passwords hashed with bcrypt
- [ ] Login works
- [ ] JWT generated
- [ ] JWT verified
- [ ] Missing JWT returns 401
- [ ] Invalid JWT returns 401
- [ ] Expired JWT returns 401

## Authorization

- [ ] CUSTOMER role works
- [ ] BANK_STAFF role works
- [ ] ADMIN role works
- [ ] Customer cannot access staff endpoints
- [ ] Customer cannot modify another user's account
- [ ] Customer cannot approve accounts

## KYC

- [ ] KYC fields stored
- [ ] KYC starts as PENDING
- [ ] Validation implemented
- [ ] Customer cannot self-verify KYC

## Accounts

- [ ] Savings account works
- [ ] Current account works
- [ ] Account number generated
- [ ] Account number unique
- [ ] Initial balance validated
- [ ] Minimum balance configured
- [ ] Daily transfer limit configured
- [ ] Account starts as PENDING
- [ ] Customer can view own accounts
- [ ] Customer cannot view another customer's account

## Approval

- [ ] Staff can view pending accounts
- [ ] Staff can approve accounts
- [ ] Staff can reject accounts
- [ ] Approval remarks stored
- [ ] Approval history stored
- [ ] Invalid status transitions rejected
- [ ] Approval audit record created

## Error Handling

- [ ] Validation errors handled
- [ ] Invalid ObjectId handled
- [ ] Duplicate email handled
- [ ] Duplicate account number handled
- [ ] Unauthorized requests handled
- [ ] Forbidden requests handled
- [ ] Not-found requests handled
- [ ] Unexpected errors handled centrally
- [ ] Server does not crash on bad input

## Security

- [ ] `.env` not committed
- [ ] JWT secret in environment variables
- [ ] MongoDB URI in environment variables
- [ ] Plain-text passwords never stored
- [ ] Password hashes never returned
- [ ] Mass assignment prevented
- [ ] User ownership enforced
- [ ] Role escalation prevented

## Testing

- [ ] Registration happy path
- [ ] Registration validation
- [ ] Duplicate registration
- [ ] Login happy path
- [ ] Invalid login
- [ ] Missing JWT
- [ ] Invalid JWT
- [ ] Role authorization
- [ ] Account creation
- [ ] Account retrieval
- [ ] Account ownership
- [ ] Account approval
- [ ] Account rejection
- [ ] Invalid status transition
- [ ] Invalid ID
- [ ] Approval history

---

# 68. FINAL ACCEPTANCE CRITERIA

The branch should be considered successful only if this scenario works without manually editing MongoDB:

```text
CUSTOMER REGISTERS
        ↓
USER CREATED
        ↓
ROLE = CUSTOMER
        ↓
KYC = PENDING
        ↓
CUSTOMER LOGS IN
        ↓
JWT GENERATED
        ↓
CUSTOMER BECOMES KYC-ELIGIBLE
        ↓
CUSTOMER CREATES SAVINGS ACCOUNT
        ↓
ACCOUNT = PENDING
        ↓
BANK STAFF LOGS IN
        ↓
STAFF VIEWS PENDING ACCOUNTS
        ↓
STAFF APPROVES ACCOUNT
        ↓
ACCOUNT = ACTIVE
        ↓
APPROVAL RECORD CREATED
        ↓
CUSTOMER VIEWS ACCOUNT
        ↓
CUSTOMER CAN SEE ONLY THEIR OWN ACCOUNT
```

The following must also fail correctly:

```text
CUSTOMER → APPROVE ACCOUNT
        ↓
403 FORBIDDEN
```

```text
NO JWT → PROTECTED ENDPOINT
        ↓
401 UNAUTHORIZED
```

```text
ACTIVE ACCOUNT → APPROVE AGAIN
        ↓
409 INVALID_STATUS_TRANSITION
```

```text
CUSTOMER → VIEW SOMEONE ELSE'S ACCOUNT
        ↓
403/404
```

```text
CUSTOMER → SET ROLE = ADMIN
        ↓
REJECTED/IGNORED
```

---

# 69. GIT COMMIT PLAN

Use branch:

```text
feature/member1-auth-kyc-accounts
```

Recommended commits:

```text
feat: create user mongoose schema

feat: implement customer registration

feat: add bcrypt password hashing

feat: implement JWT login

feat: add authentication middleware

feat: add role authorization middleware

feat: create account schema

feat: implement account creation

feat: implement account retrieval and ownership checks

feat: create approval schema

feat: implement pending account workflow

feat: implement account approval and rejection

feat: add approval audit history

feat: add request validation

fix: handle invalid account IDs

test: add member 1 postman test cases

docs: document member 1 APIs
```

Make meaningful commits rather than one giant final commit.

---

# 70. HANDOFF CHECKLIST

Before merging this branch into `main`, give the team:

```text
✓ User schema
✓ Account schema
✓ Approval schema
✓ JWT middleware
✓ Role middleware
✓ Authentication APIs
✓ Customer APIs
✓ Account APIs
✓ Approval APIs
✓ Validation
✓ Error handling
✓ Postman collection
✓ API documentation
✓ Database field documentation
✓ Status/role constants
```

The branch must be safe for Members 2, 3, and 4 to build on.

---

# 71. MEMBER 1 FINAL GOAL

The final Member 1 implementation should provide a secure and reliable foundation for the banking system.

A customer must be able to:

```text
Register
   ↓
Submit KYC
   ↓
Authenticate
   ↓
Receive JWT
   ↓
Create account
   ↓
Wait for approval
   ↓
View their account
```

Authorized bank staff must be able to:

```text
Authenticate
   ↓
View pending applications
   ↓
Approve/reject
   ↓
Create an audit record
```

And unauthorized users must be prevented from accessing or modifying resources they do not own.

**Do not implement the other banking modules. Build a clean foundation that the remaining three team members can directly integrate with.**