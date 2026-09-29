# 05 — System Architecture

## 1. High-Level Architecture Diagram

```text
┌──────────────────────────────────────────────────────────────┐
│                    React.js Frontend (SPA)                    │
│          Vanilla CSS / CSS Modules  ·  Vitest / RTL           │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS REST (JSON)
                            │ httpOnly JWT Cookie
            ┌───────────────▼──────────────────┐
            │          Nginx (Reverse Proxy)    │
            │    TLS termination · /static      │
            └───────────────┬──────────────────┘
                            │ HTTP  (internal)
┌───────────────────────────▼──────────────────────────────────┐
│                  Node.js + Express.js API                     │
│  helmet → cookie-parser → cors → rate-limit → auth →         │
│  zod-validate → authorize → controller → service → model     │
│                                                               │
│  Integrations:  PaymentService  ·  FileStorageAdapter         │
│  Background:    OrderExpiryJob (15-min PAYMENT_PENDING)       │
└──────────┬──────────────────────────────┬────────────────────┘
           │  Mongoose ODM                │  multer (local vol)
┌──────────▼──────────────┐    ┌─────────▼──────────────────┐
│  MongoDB Replica Set    │    │  Local File Storage Volume  │
│  (transactions required)│    │  (JPEG · PNG · WebP only)   │
└─────────────────────────┘    └────────────────────────────┘
           │                              │
┌──────────▼──────────────┐    ┌─────────▼──────────────────┐
│ Payment Gateway API      │    │  Static file serving via    │
│ <RAZORPAY or STRIPE>     │    │  Nginx /uploads alias       │
│ (TEST mode, webhook)     │    └────────────────────────────┘
└─────────────────────────┘
```

---

## 2. Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **Routes** | HTTP method + path wiring. Route guard maps path to controller. |
| **Middleware** | Cross-cutting concerns: security headers, cookie parsing, CORS, rate limiting, authentication, validation, centralized error handling. |
| **Controllers** | Request extraction, delegation to services, response serialization. No business logic. |
| **Services** | Business rules, state machine transitions, workflow orchestration, transaction boundaries. |
| **Models (Mongoose)** | Schema definition, persistence, index declarations. No business logic. |
| **Integrations** | Isolated adapters for payment gateway and file storage. Adapter interface hides provider details. |
| **Background Jobs** | `OrderExpiryJob` — periodically queries `PAYMENT_PENDING` orders older than 15 minutes and transitions them to `EXPIRED`. |
| **Validators** | Zod schemas co-located with routes; separate middleware applies schema validation before controller is called. |

---

## 3. Design Principles

1. **Thin controllers**: Controllers do not contain business logic or DB queries.
2. **Centralized validation**: Every incoming body/query/param is validated via Zod schema before reaching controllers.
3. **Centralized error handling**: A single Express error middleware formats all thrown errors into the standard error envelope.
4. **Server-side business rules**: Prices, totals, order states, permission decisions, and payment verification are always computed server-side.
5. **Adapter-isolated integrations**: `PaymentAdapter` and `FileStorageAdapter` are interface types so the underlying provider can be swapped without changing service code.
6. **Transaction boundaries**: Multi-document atomic operations (e.g., create order + clear cart) are wrapped in MongoDB sessions using replica-set transactions (`[NFR-012]`).
7. **No test data in production path**: The application does not contain seed scripts, fixture loaders, or demo-data bootstrap code. The `create-admin` CLI script is the only bootstrap mechanism.

---

## 4. Payment Architecture — Provider-Hosted Checkout `[D11]`

```text
Customer Browser
  → POST /api/checkout          (create order PAYMENT_PENDING + gateway order/session)
  ← 201 { orderId, gatewayToken }

Customer Browser
  → Opens provider-hosted payment page (gateway redirect or embedded widget)
  → Card data goes directly to <RAZORPAY or STRIPE>, NEVER to our servers

Payment Gateway
  → POST /api/payments/webhook  (raw body, HMAC/SHA signature verified)
  → Server validates: signature · event ID uniqueness · amount · currency
  → On success: order status PAYMENT_PENDING → PLACED
  → On failure: order status remains PAYMENT_PENDING (expiry job will EXPIRE it)

Background Job (every ~1 min)
  → Finds orders where status = PAYMENT_PENDING AND createdAt < (now - 15min)
  → Updates status to EXPIRED (no payment was completed)
```

---

## 5. Suggested Server Source Tree

```text
server/
  src/
    config/           env validation, DB connection, timezone config
    middleware/       auth, validate, authorize, rawBody, errorHandler
    routes/           auth, restaurants, menu, cart, checkout, orders, payments,
                      notifications, uploads, admin, customer
    controllers/      one file per route group
    services/         AuthService, RestaurantService, MenuService, CartService,
                      CheckoutService, OrderService, PaymentService,
                      NotificationService, AdminService, AuditService
    models/           User, Restaurant, MenuCategory, MenuItem, Cart, Address,
                      Order, Payment, Notification, AuditLog
    integrations/     payment/ (PaymentAdapter + provider impl)
                      storage/ (FileStorageAdapter + localVolume impl)
    validators/       zod schemas per route group
    jobs/             orderExpiryJob.js
    utils/            money.js (minor unit helpers), pagination.js
    app.js            Express app factory
    server.js         HTTP server + replica-set check at startup
  scripts/
    createAdmin.js    CLI bootstrap — reads env, creates first admin, exits

client/
  src/
    components/
    pages/
    layouts/
    hooks/
    services/         API client, not business logic
    context/
    utils/
```

---

## 6. Environment Configuration

All configuration comes from environment variables validated at startup. See `docs/21-DEPLOYMENT.md` for the full environment variable table. The server **refuses to start** if:
- Any required variable is absent.
- `NODE_ENV=production` and `PAYMENT_PROVIDER=fake`.
- MongoDB cannot connect and confirm a replica set.
