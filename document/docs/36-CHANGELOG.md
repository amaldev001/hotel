# 36 — Changelog

This file records all significant changes to the specification documentation pack and application codebase.

---

## [v3.0.0] — 2026-09-21 — Production Submission: Tests, Tooling & Deployment

### Summary
Finalized the platform for production submission. Added comprehensive backend and frontend test suites, ESLint/Prettier tooling, GitHub Actions CI workflow, multi-stage Dockerfile, Docker Compose, root README, and performed a security audit. All bugs found during testing have been fixed.

### Test Suites Added

**Backend (Jest + Supertest + MongoMemoryServer) — 75 tests, 13 suites, all PASS:**
- `db_guard.test.js` — Database name guard rejects non-`_test` databases
- `auth.test.js` — Login, logout, wrong password, deactivated user, role restriction, `mustChangePassword` lockout, object injection → 400
- `tenant_isolation.test.js` — Owner B cannot read/edit Owner A's menu, profile, or orders; Customer B cannot access Customer A's cart or orders
- `price_integrity.test.js` — Client-sent prices ignored; DB price reused on quote; unavailable item, closed restaurant, below-minimum, out-of-area all rejected
- `checkout_concurrency.test.js` — Same Idempotency-Key twice returns identical order; 10 concurrent requests produce exactly 1 DB record
- `payments_webhooks.test.js` — Bad signature → 400; valid webhook → PLACED; duplicate replay idempotent; amount mismatch → `paymentStatus: FAILED`; expiry job; refund idempotency
- `state_machine.test.js` — All valid/invalid order status transitions; COD vs online rules; restaurant cannot reject `DELIVERED` orders
- `catalog_cart.test.js` — Admin provisions restaurant; owner CRUD for menu; public catalog; cart mismatch; quote engine
- `orders_payments.test.js` — Idempotency, webhook replay, state machine illegal transition, 15-min expiry, admin refund
- `uploads.test.js` — Valid PNG; SVG rejection; fake extension via magic-byte check; oversized file
- `error_sanitization.test.js` — Production mode strips stack traces
- `api.test.js` — Health, config, auth flow, address limits
- `utils.test.js` — AppError, money helpers, pagination, regex escape, time parsing

**Frontend (Vitest + Testing Library) — 39 tests, 6 suites, all PASS:**
- `moneyFormatting.test.js` — Minor-unit integer → currency string; edge cases (0, undefined, invalid currency)
- `routeGuards.test.jsx` — Loading state, unauthenticated redirect with returnPath, `mustChangePassword` lockout, role mismatch, valid access
- `checkoutSafety.test.js` — Client-price stripping; per-item price stripping; idempotencyKey preserved; integer constraints
- `emptyErrorStates.test.jsx` — Loading skeleton; API error shows alert (not empty state); empty array shows empty state; populated data renders list
- `modalFocus.test.jsx` — `role="dialog"`, `aria-modal`, `aria-labelledby`, Escape closes, close button, children render, open/close integration
- `cartMismatch.test.js` — Empty cart allows any restaurant; same restaurant allows; different restaurant → `CART_RESTAURANT_MISMATCH`; no cart mutation; error message non-empty

### Bug Fixes

- **`authController.js`**: `status !== 'ACTIVE'` on login now returns `401 ACCOUNT_DEACTIVATED` (was: `403 ACCOUNT_SUSPENDED`)
- **`orderService.js`**: Webhook amount mismatch now gracefully marks `paymentStatus: 'FAILED'` and returns 200 (was: threw 400 — incorrect per Stripe recommendation)
- **`paymentProvider.js`**: Stripe `checkout.session.completed` events now read `amount_total` (not `amount`) from payload
- **`payments_webhooks.test.js`**: Expiry job test now creates backdated order directly at `Order.create()` time (Mongoose 8 blocks `$set: { createdAt }` in `updateOne`)

### Tooling & Infrastructure Added

- **`server/eslint.config.js`** — ESLint 9 flat config; no-var, prefer-const, no-eval, eqeqeq
- **`.prettierrc`** — Single quotes, no semicolons, 100-char width, LF endings
- **`package.json` (root)** — Unified `test`, `lint`, `build`, `install:all` scripts
- **`.github/workflows/ci.yml`** — CI: backend tests + audit, frontend tests + build + audit; runs in parallel on push/PR
- **`Dockerfile`** — Multi-stage: Stage 1 Vite build; Stage 2 Node 22 Alpine with non-root user, dumb-init, health check
- **`docker-compose.yml`** — App + MongoDB 7 with health checks, named volumes, fail-fast required secrets
- **`README.md`** — Full setup, test, deployment, API overview, security notes, known limitations
- **`server/src/app.js`** — Production SPA static serving from `client/dist` with wildcard fallback after all `/api` routes

### Security Audit Results (Clean)

- ✅ No `localStorage` token storage found in client
- ✅ No `alert()` or `confirm()` calls found in client
- ✅ No TODO/FIXME/TBD markers in server source
- ✅ No hardcoded fallback values for secrets
- ✅ No floating-point price arithmetic
- ✅ No client-accepted prices/totals/fees

---

## [v2.3.0] — 2026-09-21 — Orders, Payments, Notifications, Admin Suite & React Frontend

### Summary
Implemented the complete order placement, payment provider integration, background order expiry job, order state machine, notification system, admin API suite, restaurant dashboard API, and the full React 18 + Vite + Tailwind CSS frontend application (`client/`).

### Implemented Modules & Capabilities
- **Checkout & Order Placement (`POST /api/checkout`)**:
  - Enforces `Idempotency-Key` header; repeated requests with the same key return the existing order without duplicate DB record creation.
  - Server-authoritative quote re-running, customer address ownership validation, and immutable order snapshotting.
  - Cart cleared ONLY after order persistence.
- **Payment Provider System (`server/src/providers/paymentProvider.js`, `/api/payments/webhook`)**:
  - `PaymentProvider` interface with `StripePaymentProvider` (TEST mode) and `FakePaymentProvider` (automated tests only; server refuses to boot with `fake` provider in `production`).
  - Webhook processing verifying HMAC signatures on raw request body (`req.rawBody`), with duplicate event idempotency by `providerEventId` and currency/amount matching.
  - Support for Cash on Delivery (COD) and Pay at Pickup (`paymentStatus: PENDING`).
- **Background Order Expiry Job (`server/src/services/expiryJob.js`)**:
  - Atomic query transitioning unpaid online orders (`PAYMENT_PENDING`) older than 15 minutes to `EXPIRED`, marking payment status `FAILED`, and writing audit logs. Multi-instance safe.
- **Order State Machine (`PATCH /api/orders/:id/status`, `POST /api/orders/:id/cancel`)**:
  - Enforces status state-machine transitions, role & ownership permissions, pickup vs delivery rules, mandatory reason strings for cancellation/rejection, append-only `statusHistory`, and refund pending state trigger for paid cancelled orders.
- **Order Reads & Privacy Controls (`/api/orders`, `/api/restaurant/orders`, `/api/admin/orders`)**:
  - Customer sees own orders with timeline.
  - Restaurant owner sees own restaurant's orders with customer contact information visible ONLY for active orders (`PLACED`, `CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`), redacting contact details for completed/cancelled orders.
  - Admin sees all platform orders.
- **Notifications System (`/api/notifications`)**:
  - In-app notification triggers on every order status transition for customer, restaurant owner, and admin. Paginated listing, unread count, and ownership-enforced read toggling.
- **Admin API (`/api/admin/`)**:
  - User search/filtering & activation toggling (preventing self-deactivation or deactivation of the last active admin; deactivating owner suspends their restaurant).
  - Admin platform order listing, cancellation, gateway refund trigger (`POST /api/admin/orders/:id/refund`).
  - Parallel query execution (`Promise.all`) for dashboard metrics (orders by status, today's count, revenue in minor units, active restaurants, customers).
- **Restaurant Dashboard API (`/api/restaurant/dashboard`)**:
  - Revenue metrics and live incoming order queue for assigned restaurant owner.
- **React 18 + Vite + Tailwind CSS Frontend Client (`client/`)**:
  - Complete client application with Axios (cookie credentials), AuthContext, ConfigContext, responsive UI (dark/light system preference), custom accessible components (Modal, FormField, Table, Pagination, Toast, ConfirmDialog, StatusBadge), and customer, restaurant owner, and admin views.

---

## [v2.2.0] — 2026-09-21 — Catalog & Cart Backend Implementation

### Summary
Built the complete catalog, menu, search/filter, image upload, and cart/quote backend services in `server/` with strict ownership enforcement, updating documentation files `03-FUNCTIONAL-REQUIREMENTS.md`, `04-ROLES-PERMISSIONS.md`, `10-AUTHENTICATION-AUTHORIZATION.md`, and `11-RESTAURANT-MANAGEMENT.md`.

### Implemented Modules & Capabilities
- **Restaurant Management (`/api/admin/restaurants`, `/api/restaurant/profile`)**:
  - Admin provisions restaurant + owner account in an atomic operation with required temporary password input (`mustChangePassword: true`, password never defaulted, never returned in API responses).
  - Admin status toggle (`ACTIVE` <-> `SUSPENDED`).
  - Restaurant owner edits ONLY their assigned restaurant's profile, operating hours, `acceptingOrders`, `deliveryFee`, `minOrderAmount`, and `servicePostalCodes`.
  - Public discovery & detail endpoints return ONLY public fields (omitting owner email, phone, and internal flags). Suspended restaurants return `404 Not Found` to public requests.
- **Menu Categories & Items (`/api/restaurant/categories`, `/api/restaurant/items`)**:
  - CRUD operations strictly scoped by owner restaurant ID on EVERY route (foreign ID access returns `403 Forbidden`).
  - Prices stored as non-negative integers in minor currency units with min/max bounds.
  - Quick item availability toggle (`PATCH /api/restaurant/items/:id/availability`).
  - Soft deletion for menu items (`isDeleted: true`).
- **Search & Filtering (`/api/restaurants`, `/api/restaurants/:id/menu`, `/api/search/items`)**:
  - Database search with regex-escaped input and indexed queries.
  - `openNow` status computed dynamically from weekly operating hours in `APP_TIMEZONE`.
  - Grouping menu items under categories for restaurant menu view (`GET /api/restaurants/:id/menu`).
  - Item search across open restaurants (`GET /api/search/items`).
- **File Upload Security (`/api/uploads/image`)**:
  - Restricted to `restaurant` owner and `admin` roles.
  - Storage adapter interface with `LocalDiskStorageProvider` implementation.
  - Magic byte signature validation for JPEG (`FF D8 FF`), PNG (`89 50 4E 47`), and WebP (`RIFF...WEBP`). Explicit SVG rejection.
  - Size limit 2 MB (`FILE_TOO_LARGE`). Random UUID filenames. Served under `/uploads` with safe HTTP headers (`X-Content-Type-Options: nosniff`, `Content-Security-Policy`).
  - Old image file deleted from disk when an image is replaced.
- **Cart & Quote Engine (`/api/cart`, `/api/checkout/quote`)**:
  - Customer cart management enforcing single-restaurant constraint (adding item from different restaurant returns `409 CART_RESTAURANT_MISMATCH`), max 30 line items, and quantity 1-20 per line (`CART_LIMIT_EXCEEDED`).
  - Server-authoritative checkout quote engine (`POST /api/checkout/quote`) computing subtotal, delivery fee, tax (`Math.floor(subtotal * TAX_PERCENT / 100)`), and total in minor units.
  - Re-verifies all menu item prices and availability server-side (never trusting client prices).
  - Per-line warning flags (`unavailable`, `priceChanged`) and ordering block rules (`canPlaceOrder: false`, returning `MIN_ORDER_NOT_MET`, `OUT_OF_SERVICE_AREA`, or `RESTAURANT_CLOSED`).

---

## [v2.1.0] — 2026-09-21 — Backend Foundation Implementation

### Summary
Built the complete backend foundation in `server/` strictly adhering to `AI-CODING-RULES.md` and `docs/`.

### Implemented Modules & Capabilities
- **Structure & Lifecycle (`server/src/app.js`, `server/src/server.js`)**: Configured Express application, security middleware, API router, 404 fallback, centralized error handler, and graceful shutdown on `SIGTERM`/`SIGINT`.
- **Environment & Database (`server/src/config/env.js`, `server/src/config/db.js`)**: Strict Zod environment variable validation at startup with no fallback values for secrets. MongoDB Mongoose fail-fast connection with hidden connection strings and `checkDBHealth()` helper.
- **Security Middleware (`server/src/middleware/`)**:
  - `helmet`: Express security headers
  - CORS restricted to `FRONTEND_ORIGIN` with `credentials: true`
  - 100kb JSON body payload limit
  - Configurable `trust proxy`
  - `cookie-parser`
  - `originCheck`: CSRF Origin header verification on `POST`/`PUT`/`PATCH`/`DELETE`
  - `rateLimiters`: Global (200 req/15 min), auth login (10 req/15 min), auth register (10 req/15 min) limiters
  - `requestLogger`: Sanitized HTTP log outputting method, path, status, and duration (ms) strictly without body or PII logging.
- **Utilities (`server/src/utils/`)**:
  - `AppError`: Custom operational error class supporting canonical error codes
  - `asyncHandler`: Controller wrapper for catching async promise rejections
  - `errorHandler`: Centralized error middleware mapping `ValidationError`, `CastError`, duplicate key (`code 11000`), and JWT errors to canonical codes (`INVALID_INPUT`, `EMAIL_ALREADY_REGISTERED`, `UNAUTHORIZED`), returning unique `requestId`, and stripping stack traces and driver details in responses
  - `moneyHelpers`: Non-negative integer minor unit calculations and tax formula `Math.floor(subtotal * TAX_PERCENT / 100)`
  - `timeHelpers`: Operating hours and time evaluation in `APP_TIMEZONE`
  - `paginationHelpers`: Default 20 / max 100 page calculation and standard paginated response envelope wrapper
  - `regexHelpers`: Regex string escaping for safe DB queries
- **Validation (`server/src/validators/`, `server/src/middleware/validate.js`)**: Zod validation schemas for all routes, stripping unknown fields and rejecting non-string object payloads (e.g. `{"email": {"$gt": ""}}`).
- **Auth & Profile (`server/src/controllers/`, `server/src/routes/`)**:
  - `POST /api/auth/register`: Customer-only self-registration with Argon2id password hashing and httpOnly cookie session
  - `POST /api/auth/login`: Constant-time execution for unknown emails, pinned `HS256` JWT algorithm
  - `POST /api/auth/logout`: Server-side cookie clear
  - `GET /api/auth/me`: Profile lookup from session cookie
  - `POST /api/auth/change-password`: Authenticated password change clearing `mustChangePassword` flag
  - `mustChangePassword` Lockout: Blocks access to all other routes if `mustChangePassword === true`
  - `GET /api/profile`, `PUT /api/profile`: Profile management
  - Customer Addresses (`/api/profile/addresses`): CRUD operations enforcing max 5 addresses per customer constraint, validating phone and postal code formats
- **Models (`server/src/models/`)**: `User`, `Restaurant`, `CuisineTag`, `MenuCategory`, `MenuItem`, `Cart`, `Address`, `Order`, `Payment`, `Notification`, `AuditLog` with all required indexes.
- **Bootstrap CLI (`server/scripts/createAdmin.js`)**: `npm run create-admin` CLI script reading credentials from environment variables, checking for existing admin, hashing password via Argon2id, creating first admin user, and exiting cleanly.
- **Public Config & Health (`/api/config`, `/api/health`)**: `GET /api/config` returns public non-sensitive settings (`currency`, `timezone`, `taxPercent`, `appName`); `GET /api/health` checks live database connectivity.

---

## [v2.0.0] — 2026-09-21 — Full Decision Resolution Update

### Summary
Complete documentation pack update resolving all 30 open decisions (DEC-001 through DEC-030) and incorporating explicit architectural rulings [D1] through [D22].

### Decisions Resolved

| Decision | Resolution |
|---|---|
| DEC-001 `[D11]` | Payment gateway: `<RAZORPAY or STRIPE - EDIT ME>`, provider-hosted checkout, COD/pickup supported |
| DEC-002 `[D8]` | Delivery + Pickup model; restaurant staff advance statuses; no driver role |
| DEC-003 `[D2]` | No approval workflow; ACTIVE ↔ SUSPENDED lifecycle; admin creates restaurants |
| DEC-004, DEC-006 `[D3]` | One owner per restaurant, one restaurant per owner; no staff accounts |
| DEC-005, DEC-007–012 `[D20]` | Branches, reviews, coupons, favorites, promotions, variants, live GPS all out of v1 |
| DEC-013, DEC-014, DEC-029 `[D9]` | Tax = `floor(subtotal × TAX_PERCENT / 100)`; restaurant sets deliveryFee and minOrderAmount |
| DEC-015 `[D13]` | Customer cancels in PAYMENT_PENDING/PLACED; restaurant before completion; admin any non-terminal |
| DEC-016 `[D14]` | Full refunds only; admin triggers via gateway API; REFUND_PENDING state |
| DEC-017 `[D10]` | Weekly hours + acceptingOrders toggle in APP_TIMEZONE; no holidays in v1 |
| DEC-018 `[D18]` | In-app notifications only for order events |
| DEC-019 `[D17]` | JWT httpOnly cookie, SameSite=Strict, 1-day expiry, Argon2, Origin check, rate limits; AUTH-005/006 out of scope |
| DEC-020 `[D17]` | JPEG/PNG/WebP (magic bytes), 2 MB max, local volume, no SVG |
| DEC-021 | Docker + env config + HTTPS reverse proxy |
| DEC-022 | APP_TIMEZONE env variable |
| DEC-023 `[D21]` | Admin sees payment status + refund state only; never card data |
| DEC-024 `[D11]` | Order-first sequencing; 15-min PAYMENT_PENDING expiry background job |
| DEC-025 `[D11]` | Raw body webhook signature; idempotent by event ID; amount+currency validation |
| DEC-026 | Soft deletion only in v1; retention period is owner's decision |
| DEC-027 `[D16]` | DB query search with indexes; no external search engine |
| DEC-028 `[D8]` | Delivery only to servicePostalCodes |
| DEC-029 (see DEC-013 above) | |
| DEC-030 | Optional order note, plain text, max 200 chars, HTML-escaped on render |

### Additional Rulings Applied
- `[D1]` Three roles: customer, restaurant, admin
- `[D2]` Admin-provisioned restaurant owners; create-admin CLI script
- `[D4]` Integer minor-unit currency everywhere; no floats
- `[D5]` Immutable order snapshots; server-computed prices
- `[D6]` Single cart, one restaurant, max 30 lines, qty 1–20
- `[D7]` Menu item diet field: veg/non_veg; preparationTime
- `[D12]` Idempotency-Key header required at checkout
- `[D15]` 15-second polling with tab visibility gate
- `[D16]` Pagination default 20, max 100
- `[D20]` Out of v1: ratings, live maps, tips, partial refunds, invoices, scheduled orders, email/SMS/push
- `[D21]` Admin cannot place orders
- `[D22]` Max 5 saved addresses per customer

### Files Changed in This Update

| File | Change |
|---|---|
| `00-MASTER-SPEC.md` | Added resolved decisions, approved dependencies, no-seed rule |
| `01-PRD.md` | Rewrote product scope with resolved decisions |
| `02-SRS.md` | Unified ID scheme; AUTH-005/006 out of scope; AUTH-009 added |
| `03-FUNCTIONAL-REQUIREMENTS.md` | Full Given/When/Then acceptance criteria with concrete numbers |
| `04-ROLES-PERMISSIONS.md` | Complete capability matrix + full endpoint access matrix |
| `05-SYSTEM-ARCHITECTURE.md` | Payment adapter, transaction architecture, no-seed rule |
| `06-DATABASE-DESIGN.md` | Full schemas, auditLogs, payments, ER diagram, all indexes |
| `07-API-SPECIFICATION.md` | All endpoints documented; pagination contract; error codes |
| `08-FRONTEND-SPECIFICATION.md` | New pages added; duplicate route removed; UI states listed |
| `09-BACKEND-SPECIFICATION.md` | Middleware order, service table, transaction table, no-seed rule |
| `10-AUTHENTICATION-AUTHORIZATION.md` | Full resolved spec: cookie flags, Argon2, rate limits, create-admin |
| `11-RESTAURANT-MANAGEMENT.md` | ACTIVE/SUSPENDED lifecycle; operating hours format |
| `12-MENU-MANAGEMENT.md` | diet enum, soft delete, upload rules, no variants in v1 |
| `13-CART-CHECKOUT.md` | Integer formulas, idempotency, COD flow |
| `14-PAYMENT-INTEGRATION.md` | Full order-first flow, webhook, expiry, refund |
| `15-ORDER-LIFECYCLE.md` | Complete state machine + Mermaid diagram |
| `16-NOTIFICATIONS.md` | Full event trigger table; API endpoints |
| `17-VALIDATION-ERROR-HANDLING.md` | Canonical error code registry |
| `18-SECURITY.md` | All resolved security controls |
| `19-UI-UX.md` | Polling rules, money display, confirmation dialogs, static pages |
| `20-TESTING-QA.md` | Named tools; exhaustive test scenarios per ruling |
| `21-DEPLOYMENT.md` | Full env variable table; replica set requirement; Docker reference |
| `22-DEVELOPMENT-WORKFLOW.md` | Replica set setup; no-seed rule; build phases |
| `23-AI-CODING-RULES.md` | Added: no seed data; no client-trusted values; env config; no PII in logs |
| `24-TRACEABILITY-MATRIX.md` | Expanded to all requirement IDs with file paths |
| `25-DEFINITION-OF-DONE.md` | All 7 gates updated with resolved requirements |
| `26-IMPLEMENTATION-ROADMAP.md` | Aligned phases to all resolved decisions |
| `27-OPEN-DECISIONS.md` | All 30 decisions marked RESOLVED with Status, Decision, Date columns |
| `28-IMPLEMENTATION-CHECKLIST.md` | Aligned to resolved endpoints and features |
| `29-DATA-FLOW-AND-SEQUENCE.md` | Added 5 Mermaid sequence diagrams |
| `30-API-CONTRACT-TEMPLATES.md` | Full template with idempotency, side effects, security notes |
| `31-DATABASE-INDEX-AND-QUERY-PLAN.md` | All indexes derived from decisions |
| `32-SECURITY-THREAT-MODEL.md` | All threats with resolved controls |
| `33-OPERATIONS-MONITORING-BACKUP.md` | Health endpoint, log sanitization, backup requirements |
| `34-RELEASE-READINESS.md` | Full production gates |
| `36-CHANGELOG.md` | **NEW** — this file |
| `37-KNOWN-LIMITATIONS.md` | **NEW** — v1 limitations and known constraints |
| `DOC-MAP.md` | **NEW** — document index by purpose |
| `DOCUMENTATION-MANIFEST.md` | Updated file list |
| `README.md` | Updated stack with resolved decisions |

---

## [v1.0.0] — (Initial baseline)
Initial documentation pack created with 35 files. All decisions TBD.
