# payment-service

Demo payment microservice for the mQTT marketplace.
**No real bank or payment gateway is contacted**: a fake "bank" (`src/providers/demo.provider.js`) approves or declines the payment. Every attempt is stored in the service's own database (`payment_db`).

- Port `3005`, Express 5 + Prisma + PostgreSQL, ESM (same layout as product-service)
- Auth: JWT (HS256) signed by user-service. Same `JWT_SECRET` in every service.

## API

| Method | Path | Who | Notes |
|---|---|---|---|
| `POST` | `/api/payments` | any logged-in user | Body `{ "orderId", "amount" }`. Optional `Idempotency-Key` header. `201` = new attempt, `200` = replay of an earlier result. |
| `GET` | `/api/payments` | user (own) / admin (all) | `?orderId=&limit=&offset=` |
| `GET` | `/api/payments/:id` | owner / admin | Others get `404`. |
| `POST` | `/api/payments/:id/refund` | admin only | `SUCCESS` -> `REFUNDED`. Repeating it is safe. |
| `GET` | `/health`, `/ready` | public | Liveness / DB readiness. |

### Contract with order-service

`POST /api/payments` answers with the payment itself, **not** wrapped in `{ success, data }`:

```json
{ "id": "…", "orderId": "…", "userId": "…", "amount": 120.5, "status": "SUCCESS", "provider": "demo", "failureReason": null, "refundedAt": null, "createdAt": "…" }
```

`status` is `SUCCESS` or `FAILED`. A declined payment is still `201` with `status: "FAILED"`, so order-service can store the `paymentId` of the failed attempt.
Errors use `{ "success": false, "message": "…", "error": { "code", "message", "requestId" } }`.

### Rules enforced here

- One `SUCCESS` per order. A `FAILED` attempt does not block a retry.
- Same `Idempotency-Key` + same request = same stored result, never a second charge. Same key + different request = `409 IDEMPOTENCY_KEY_REUSED`.
- Concurrent requests for one order are serialised with a Postgres advisory lock.
- Unknown body fields are rejected; `amount` must be > 0 with at most 2 decimals; bodies are limited to 10 kB.

## Demo behaviour (environment variables)

| Variable | Default | Meaning |
|---|---|---|
| `PAYMENT_DEMO_DELAY_MS` | `300` | Simulated bank latency |
| `PAYMENT_DEMO_FAIL_RATE` | `0` | Probability (0-1) of a random decline |
| `PAYMENT_DEMO_MAX_AMOUNT` | empty | Decline every payment above this amount (deterministic) |

Example: `PAYMENT_DEMO_MAX_AMOUNT=1000` makes any order above 1000 end as `PAYMENT_FAILED`, handy to demo the failure path.

## Replacing the fake bank later

Write another provider with the same shape as `demo.provider.js` (`name`, `charge()`, `refund()`) and pass it to `buildApp({ provider })` in `src/server.js`. For a real gateway you will also want a `PENDING` status and a webhook endpoint to receive the final result.

## Known limits (on purpose, for the demo)

- `POST /api/payments` and the refund are meant to be called by order-service. Today any logged-in user can call `POST /api/payments` through the gateway; the later hardening step is an internal service credential (or not routing it publicly).
- The provider is called inside the DB transaction (that is what makes the lock effective). A slow real gateway needs the PENDING-then-webhook flow instead.

## Run

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run dev
npm test        # no database needed: tests use an in-memory fake
```
