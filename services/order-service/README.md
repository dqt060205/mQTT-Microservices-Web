# Order Service

Part of **mQTT**. Creates orders from the user's cart, stores purchase-time snapshots, tracks status, and lets users view or cancel orders.

- Stack: Node.js 20+, Express, Prisma + PostgreSQL (`order_db`), JWT
- Default port: `3004`
- Does **not** read other services' databases: it calls Cart, Product and Payment over REST and forwards the caller's JWT.

## API

All `/api/orders` routes need `Authorization: Bearer <jwt>` (signed with the same `JWT_SECRET` as user-service; the user id is read from `sub` or `id`, role from `role`).

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders` | Create an order from the current cart |
| GET | `/api/orders?page=1&limit=10&status=PAID` | List the current user's orders |
| GET | `/api/orders/:id` | Order details (admins can read any order) |
| PATCH | `/api/orders/:id/cancel` | Cancel an eligible order |
| GET | `/health` | Health check (no auth) |

`POST /api/orders` body:

```json
{ "shippingName": "Nguyen Van A", "shippingPhone": "0901234567", "shippingAddress": "1 Dai Co Viet, Hanoi" }
```

### Checkout flow

1. `GET cart-service /api/cart` (empty cart -> `400`)
2. `GET product-service /api/products/:id` for every item: checks it exists and has stock (`409` if not) and snapshots name and price
3. Create the order as `PENDING` with its items
4. `POST payment-service /api/payments` (simulated)
5. Status becomes `PAID`, or `PAYMENT_FAILED` if the payment is declined or the service is unreachable (the order is kept)
6. On `PAID`, `DELETE cart-service /api/cart`

### Statuses

`PENDING` -> `PAID` | `PAYMENT_FAILED` -> `SHIPPED` -> `DELIVERED`, and `CANCELLED`.
Cancellable: `PENDING`, `PAYMENT_FAILED`, `PAID` (no refund yet, see TODO in `order.service.js`).

## Contracts expected from other services

| Service | Call | Expected response |
|---|---|---|
| Cart | `GET /api/cart` | `{ "items": [{ "id", "productId", "quantity" }] }` |
| Cart | `DELETE /api/cart` | any 2xx |
| Product | `GET /api/products/:id` | `{ "id", "name", "price", "stock", "imageUrl?" }` (404 if missing) |
| Payment | `POST /api/payments` `{ orderId, amount }` | `{ "id", "status": "SUCCESS" \| "FAILED" }` |

If your services use different shapes, adjust only `src/clients/*.js` and the `loadLine` function in `src/services/order.service.js`.

## Project layout

```
order-service/
├── prisma/schema.prisma        # Order, OrderItem, OrderStatus
├── src/
│   ├── server.js               # wiring + listen + graceful shutdown
│   ├── app.js                  # express app factory (testable)
│   ├── config/env.js
│   ├── routes/ controllers/ validators/ middlewares/
│   ├── services/order.service.js   # business logic (dependency-injected)
│   ├── clients/                # cart / product / payment REST clients
│   └── lib/ utils/
├── test/                       # node:test + supertest, no DB needed
├── Dockerfile  .dockerignore  .env.example  .gitignore
└── package.json
```

## Run locally

```bash
cp .env.example .env            # set JWT_SECRET and DATABASE_URL
npm install
npx prisma migrate dev --name init   # creates order_db tables + prisma/migrations (commit it)
npm run dev
npm test
```

Without the other services running you can still test the validation and auth paths with Postman; a full checkout needs cart, product and payment services (or mocks) on the URLs in `.env`.

## Docker

The image runs `prisma migrate deploy` on start, so commit the `prisma/migrations` folder first. Run `npm install` once so `package-lock.json` exists (the Dockerfile uses `npm ci`).

Snippet for the root `compose.yaml`:

```yaml
  order-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: order_db
    volumes:
      - order_db_data:/var/lib/postgresql/data

  order-service:
    build: ./services/order-service
    environment:
      PORT: 3004
      DATABASE_URL: postgresql://postgres:postgres@order-db:5432/order_db?schema=public
      JWT_SECRET: ${JWT_SECRET}
      CART_SERVICE_URL: http://cart-service:3003
      PRODUCT_SERVICE_URL: http://product-service:3002
      PAYMENT_SERVICE_URL: http://payment-service:3005
    depends_on:
      - order-db

# top level
volumes:
  order_db_data:
```

## Not done yet

- Stock reservation/decrement (needs an endpoint in product-service)
- Refund on cancelling a paid order
- Admin endpoint to move orders to `SHIPPED` / `DELIVERED`
- Event-based flow (RabbitMQ) instead of synchronous calls
