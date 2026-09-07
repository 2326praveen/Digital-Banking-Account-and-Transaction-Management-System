# Digital Banking Account & Transaction Management System

Member 1 backend foundation for authentication, KYC, account applications, and account approval.

## Setup

1. Install MongoDB and start it locally.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set a strong `JWT_SECRET`.
4. Run `npm run dev` (or `npm start`).

The API listens on `http://localhost:5000` by default.

## Endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/customers/me`
- `PUT /api/customers/:id/kyc` (staff/admin)
- `POST /api/accounts`
- `GET /api/accounts`
- `GET /api/accounts/:id`
- `GET /api/staff/pending-accounts` (staff/admin)
- `PUT /api/accounts/:id/approve` (staff/admin)
- `GET /api/accounts/:id/approval-history`

Public registration always creates a `CUSTOMER` with `PENDING` KYC. Staff/admin users must be provisioned through a controlled database seed or administrative process; no public staff registration endpoint is exposed.
