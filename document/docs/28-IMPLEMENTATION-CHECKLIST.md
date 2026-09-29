# 28 — Implementation Checklist

Use this as a living tracking document. Mark items `[x]` as they are completed. Do not mark complete without tests passing.

---

## Foundation
- [x] Repository structure (`server/`, `client/`, `scripts/`)
- [x] Express app with required middleware stack (helmet, cookie-parser, CORS, rate-limit, errorHandler)
- [x] MongoDB connection + startup validation (refuses to start if DB unavailable)
- [x] Env config validation on startup (exits non-zero if required variable is absent)
- [x] Centralized error handler with canonical error codes (`docs/17`)
- [x] Zod validation middleware
- [x] `GET /api/health` endpoint
- [x] `GET /api/config` endpoint (returns currency, timezone, taxPercent, appName)
- [x] `scripts/createAdmin.js` — reads ADMIN_* env vars, creates admin, exits
- [ ] ESLint + Prettier configured and passing

---

## Authentication
- [x] User model: `role`, `status`, `mustChangePassword`, Argon2 hash
- [x] `POST /api/auth/register` — customer only, rate-limited, Argon2id, httpOnly cookie
- [x] `POST /api/auth/login` — rate-limited (10/15min), cookie issued
- [x] `POST /api/auth/logout` — cookie cleared
- [x] `GET /api/auth/me` — returns user (no passwordHash)
- [x] `POST /api/auth/change-password` — verifies current password, rehashes
- [ ] `POST /api/auth/forgot-password` returns 404 (out of scope)
- [ ] `POST /api/auth/reset-password` returns 404 (out of scope)
- [x] protect middleware (JWT cookie → req.user)
- [x] restrictTo middleware (status → role → ownership)
- [x] Origin check middleware on POST/PUT/PATCH/DELETE

---

## Restaurant & Menu
- [x] Restaurant model (servicePostalCodes, deliveryFee, minOrderAmount, acceptingOrders, operatingHours as named-day object, status: ACTIVE/SUSPENDED)
- [x] CuisineTag model (admin-managed)
- [x] MenuCategory model (restaurantId scoped)
- [x] MenuItem model (diet: veg/non_veg, isAvailable, isDeleted, price as integer)
- [x] `POST /api/admin/restaurants` — creates restaurant+owner in MongoDB transaction
- [x] `PATCH /api/admin/restaurants/:id/status` — ACTIVE↔SUSPENDED
- [x] `GET/PUT /api/restaurant/profile` — owner-scoped
- [x] `POST /api/uploads/image` — magic byte validation, 2 MB limit, random filename, SVG rejection, old file deletion
- [x] Menu category CRUD — `GET`, `POST`, `PUT`, `DELETE /api/restaurant/categories`
- [x] Menu item CRUD — `GET`, `POST`, `PUT`, `PATCH`, `DELETE /api/restaurant/items`
- [x] `DELETE /api/restaurant/items/:id` — soft delete (isDeleted=true)
- [x] Cuisine tag admin CRUD — `GET /api/admin/cuisine-tags`, `POST`, `PUT`

---

## Discovery & Addresses
- [x] `GET /api/restaurants` — paginated, ACTIVE only, cuisine filter, postal code filter, openNow in APP_TIMEZONE
- [x] `GET /api/search/items?q=` — sanitized DB query across open restaurants
- [x] `GET /api/restaurants/:id` — public detail (omitting owner info)
- [x] `GET /api/restaurants/:id/menu` — categories + non-deleted items
- [x] Address model (max 5 per customer enforced)
- [x] `GET/POST/PUT/DELETE /api/profile/addresses` — customer-scoped with 5-limit enforcement

---

## Cart & Checkout
- [x] Cart model (unique index on customerId, max 30 items per cart)
- [x] `GET /api/cart`
- [x] `POST /api/cart/items` — mismatch detection (409 CART_RESTAURANT_MISMATCH), item/restaurant validation
- [x] `PATCH /api/cart/items/:id` — quantity 1–20
- [x] `DELETE /api/cart/items/:id`
- [x] `DELETE /api/cart`
- [x] `POST /api/checkout/quote` — integer arithmetic: subtotal, deliveryFee, floor(tax), total, per-line warnings, minOrder/postalCode/closed blocking
- [ ] `POST /api/checkout` — requires Idempotency-Key header; MongoDB transaction; online or COD/pickup flow

---

## Payments
- [ ] Payment model (providerOrderId unique, providerEventId unique)
- [ ] PaymentAdapter interface + `<RAZORPAY or STRIPE - EDIT ME>` implementation
- [ ] Fake adapter (test only; blocked in production)
- [ ] `POST /api/payments/webhook` — raw body, signature verify, event ID idempotency, amount match
- [ ] `POST /api/payments/verify` — secondary status check
- [ ] Order expiry background job (queries PAYMENT_PENDING + createdAt < now-15min → EXPIRED)

---

## Order Lifecycle
- [ ] Order model (orderType, statusHistory, idempotencyKey, paymentStatus, cancelReason, note ≤200 chars)
- [ ] `GET/api/orders` — customer history, paginated
- [ ] `GET /api/orders/:id` — customer own, restaurant own, admin
- [ ] `POST /api/orders/:id/cancel` — customer (PAYMENT_PENDING/PLACED only), admin (any non-terminal + reason)
- [ ] `PATCH /api/orders/:id/status` — restaurant; state machine enforced; reason required for REJECTED/CANCELLED
- [ ] `GET /api/restaurant/orders` — inbox, status filter, paginated
- [ ] AuditLog written for all state transitions and admin actions
- [ ] `POST /api/admin/orders/:id/cancel` — reason required

---

## Notifications
- [ ] Notification model
- [ ] NotificationService triggered on each order event (see `docs/16` event table)
- [ ] `GET /api/notifications` — paginated, isRead filter
- [ ] `GET /api/notifications/unread-count`
- [ ] `PATCH /api/notifications/:id/read`

---

## Admin Suite
- [ ] `GET /api/admin/users` — paginated, role/status filter
- [ ] `PATCH /api/admin/users/:id/status` — ACTIVE↔SUSPENDED + audit log
- [ ] `GET /api/admin/restaurants`
- [ ] `GET /api/admin/orders` — platform wide, paginated
- [ ] `POST /api/admin/refunds` — gateway refund API, idempotent, REFUND_PENDING→REFUNDED + audit log
- [ ] `GET /api/admin/dashboard` — metrics

---

## Frontend Pages
- [ ] Public: `/`, `/login`, `/register`, `/restaurants`, `/restaurants/:id`, `/search`
- [ ] Public static: `/privacy`, `/terms`, `/refund-policy`, `/404`
- [ ] Customer: profile, change-password, addresses, cart, checkout, payment-status, orders, orders/:id, notifications
- [ ] Restaurant: dashboard, profile, change-password, categories, menu, orders, orders/:id, settings, notifications
- [ ] Admin: dashboard, users, users/:id, restaurants, restaurants/new, restaurants/:id, orders, orders/:id, categories, change-password
- [ ] All data-fetching pages have Loading, Empty, Error, Forbidden, Auth-Expired, Not-Found states
- [ ] 15-second order polling with tab visibility gate
- [ ] mustChangePassword redirect enforced

---

## QA & Security
- [ ] All test scenarios from `docs/20` implemented and passing
- [ ] `PAYMENT_PROVIDER=fake` + `NODE_ENV=production` → server refuses to start (tested)
- [ ] Auth-005/006 endpoints return 404 (tested)
- [ ] No seed scripts or demo data in codebase
- [ ] Playwright E2E: customer order flow, restaurant fulfillment flow, admin cancel+refund

---

## Release
- [ ] All env vars set via secrets manager (none hardcoded)
- [ ] MongoDB Replica Set confirmed in all environments
- [ ] HTTPS configured at reverse proxy
- [ ] Webhook URL registered with payment provider
- [ ] `POST /api/health` returns 200
- [ ] Zero failures: `npm test` on server + client
- [ ] Zero errors: `npm run lint` on server + client
- [ ] Release readiness checklist (`docs/34`) completed
