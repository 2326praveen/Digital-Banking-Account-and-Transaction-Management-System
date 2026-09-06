# Digital Banking Account & Transaction Management System

An academic Node.js and Express backend for account, transaction, and staff operations. This repository currently contains Member 4's integration-ready account freeze/unfreeze workflow, status audit trail, staff dashboard APIs, and shared error handling. Authentication, onboarding, transfers, ledger, suspicious-transaction rules, statements, and interest processing can be merged into the shared model contracts without duplicating those modules here.

## Technology

- Node.js 20+
- Express.js
- MongoDB with Mongoose
- JWT middleware contract
- Node.js built-in test runner

## Structure

```text
src/
	controllers/    HTTP request handling
	middleware/     JWT/RBAC, 404, and centralized errors
	models/         shared User, Account, Transaction, and status history contracts
	routes/         protected Member 4 endpoints
	services/       freeze workflow and dashboard aggregations
	utils/          AppError and asyncHandler
test/             HTTP smoke tests
postman/          collection and environment templates
```

## Setup

```bash
npm install
copy .env.example .env
npm test
npm start
```

Set `MONGO_URI` and `JWT_SECRET` in `.env` before starting the server. The API listens on `PORT` (default `5000`). Development watch mode is available with `npm run dev`.

## Member 4 APIs

All account-control endpoints require `Authorization: Bearer <JWT>` and a `BANK_STAFF` or `ADMIN` role.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `PUT` | `/api/accounts/:id/freeze` | Change `ACTIVE` to `FROZEN`; body requires `{ "reason": "..." }` with 5-500 characters |
| `PUT` | `/api/accounts/:id/unfreeze` | Change `FROZEN` to `ACTIVE`; optional reason is recorded |
| `GET` | `/api/accounts/:id/status-history` | Read the staff-only immutable status audit trail |
| `GET` | `/api/staff/dashboard` | Read account and transaction statistics |

The dashboard accepts optional `from` and `to` query parameters in `YYYY-MM-DD` format. Date filters apply to transaction metrics. Account counts represent current status. Transaction totals use MongoDB aggregation and include total debit, total credit, flagged count, and total transferred (debit total).

## Status and errors

`Account.status` is the single source of truth. Valid Member 4 transitions are `ACTIVE -> FROZEN` and `FROZEN -> ACTIVE`; pending, rejected, and closed accounts cannot be frozen. Every response uses:

```json
{
	"success": false,
	"message": "Human-readable message",
	"errorCode": "ERROR_CODE"
}
```

Important error codes include `ACCOUNT_ALREADY_FROZEN`, `ACCOUNT_NOT_FROZEN`, `ACCOUNT_NOT_FOUND`, `INVALID_ACCOUNT_ID`, `INVALID_FREEZE_REASON`, `INVALID_DATE_RANGE`, `UNAUTHORIZED`, `FORBIDDEN`, and `ROUTE_NOT_FOUND`.

## Integration contracts

When the other members' modules are merged, preserve these fields:

- `Account.status`: `PENDING`, `ACTIVE`, `REJECTED`, `FROZEN`, or `CLOSED`
- `User.role`: `CUSTOMER`, `BANK_STAFF`, or `ADMIN`
- `Transaction.accountId`, `Transaction.type` (`DEBIT`/`CREDIT`), `Transaction.amount`, `Transaction.flagged`, and `createdAt`

Member 2's transfer and beneficiary services should reject operations from accounts whose status is `FROZEN`. Member 3's interest policy should explicitly decide whether frozen accounts are excluded. Neither module should be duplicated in this repository.

## Testing

Run `npm test` for the current smoke tests. They verify the health endpoint, missing JWT handling, customer dashboard denial, and the standard unknown-route response. Full freeze and aggregation tests require a MongoDB test database and the merged Member 1-3 modules.

Import `postman/Digital Banking API.postman_collection.json` and `postman/Digital Banking API.postman_environment.json` into Postman. Set `baseUrl`, then populate the token and ID variables after login/setup.

## Security and limitations

This is a simplified academic backend, not a production banking system. Do not commit `.env`, secrets, credentials, or real customer data. The included model files are minimal integration contracts and should be reconciled with the team's authoritative schemas during merge rather than duplicated.
