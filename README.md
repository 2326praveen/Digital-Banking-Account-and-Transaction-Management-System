# Digital-Banking-Account-and-Transaction-Management-System
## Member 3 — Ledger, Statements, Suspicious Flagging, Interest

- Transaction ledger: GET /api/accounts/:accountId/transactions
- Statement: GET /api/accounts/:accountId/statement
- Flagged transactions (staff): GET /api/staff/flagged-transactions
- Manual interest run: POST /api/staff/interest/run

Suspicious transaction policy: only the DEBIT side of a transfer is flagged, per team decision.

Interest: simple monthly interest on ACTIVE SAVINGS accounts, idempotent per account+period via InterestRecord.
