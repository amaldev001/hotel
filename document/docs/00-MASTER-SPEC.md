# 00 — Master Specification

## 1. Product Definition
A responsive web platform connecting customers with restaurants for food discovery, cart management, checkout, online payment, order placement, and order-status tracking, while providing restaurant operators and administrators with management dashboards.

## 2. Product Boundaries
### Customer
Discover restaurants/food, manage profile and addresses (up to 5 saved), manage a single-restaurant cart (max 30 items, quantity 1-20), quote checkout, select payment method (online payment or COD/pay-at-pickup), view order status, receive in-app notifications, and cancel orders prior to restaurant preparation.

### Restaurant (Owner)
Manage single restaurant information, weekly operating hours in `APP_TIMEZONE`, order acceptance toggle (`acceptingOrders`), service postal codes, delivery fee, minimum order amount, menu categories, menu items (veg/non-veg diet, preparation time, availability, image), view incoming order queue with status filters, advance order states, and reject/cancel orders with a reason prior to completion.

### Administrator
System bootstrap via CLI (`create-admin` script), manage users (activate/deactivate), create/suspend restaurants (`ACTIVE` <-> `SUSPENDED` lifecycle, no approval workflow), manage restaurant owners (assign temporary password, `mustChangePassword=true`), manage global cuisine tags (`ADM-003`), view/cancel any non-terminal order with reason, process full refunds for cancelled paid orders via payment gateway API, and view platform performance metrics.

---

## 3. Approved Baseline Stack & Dependencies
- **Frontend**: React.js, Vanilla CSS / CSS Modules
- **Backend**: Node.js, Express.js
- **Database**: MongoDB + Mongoose (Replica Set required for multi-document transactions)
- **Authentication**: JWT stored in `httpOnly` cookie (`SameSite=Strict`, `Secure` in production, 1-day expiry, no refresh tokens), Argon2 for password hashing
- **Payment Gateway**: `<RAZORPAY or STRIPE - EDIT ME>` (TEST mode, provider-hosted checkout, card data never touches server, COD/pay-at-pickup supported. Fake provider exists ONLY in automated test environments; server refuses to start with fake provider in production)
- **Image / File Storage**: Local volume storage adapter (JPEG, PNG, WebP only via file signature / magic bytes, max 2 MB, random filenames, no external image URLs, no SVG)
- **Hosting**: Provider-neutral containerization via Docker, environment-based configuration, HTTPS terminated at reverse proxy (e.g., Nginx)
- **Approved Dependencies List**:
  - Runtime / App: `express`, `mongoose`, `jsonwebtoken`, `cookie-parser`, `argon2`, `zod`, `multer`, `helmet`, `express-rate-limit`, `<RAZORPAY or STRIPE SDK - EDIT ME>`
  - Development & Testing: `jest`, `supertest`, `vitest`, `@testing-library/react`, `eslint`, `prettier`

---

## 4. Resolved Decisions Register Summary
The system design incorporates all 30 explicit decisions from `docs/27-OPEN-DECISIONS.md`:

- **DEC-001 [D11] Payment Gateway**: Provider-hosted checkout via `<RAZORPAY or STRIPE - EDIT ME>` in TEST mode. COD / pay-at-pickup supported. Fake provider restricted strictly to test suites.
- **DEC-002 [D8] Delivery Model**: Supports Delivery and Pickup. Restaurant staff advance order statuses. No driver role, no live maps.
- **DEC-003 [D2] Restaurant Approval Workflow**: No approval workflow. Lifecycle is `ACTIVE` <-> `SUSPENDED`. Admin creates restaurants and assigns owner accounts directly.
- **DEC-004, DEC-006 [D3] Staff & Owner Model**: One owner account per restaurant, one restaurant per owner. No restaurant staff accounts.
- **DEC-005, DEC-007..012 [D20/D7] V1 Scope Exclusions**: Out of v1 scope: multiple branches, customer reviews/ratings, coupons/discounts, favorites, promotions, food variants/add-ons, live driver GPS.
- **DEC-013, DEC-014, DEC-029 [D9] Pricing & Taxes**: Tax is calculated as `subtotal * (TAX_PERCENT / 100)` from env. Each restaurant sets `deliveryFee` and `minOrderAmount` (stored in minor units). Backend computes all quotes (`POST /checkout/quote`).
- **DEC-015 [D13] Order Cancellation**: Customers may cancel only while `PAYMENT_PENDING` or `PLACED`. Restaurants may reject/cancel with a reason before `OUT_FOR_DELIVERY`/`READY`. Admin may cancel any non-terminal order with a reason.
- **DEC-016 [D14] Refund Policy**: Cancelling/rejecting a PAID order sets payment status to `REFUND_PENDING`. Admin triggers a full refund via gateway API. No partial refunds.
- **DEC-017 [D10] Operating Hours**: Weekly opening hours plus `acceptingOrders` toggle, evaluated in `APP_TIMEZONE`. No holiday exceptions in v1.
- **DEC-018 [D18] Notifications**: In-app notifications only for order events, delivered to customer and restaurant dashboards.
- **DEC-019 [D17] Security & Session**: JWT in `httpOnly` cookie (`SameSite=Strict`, `Secure` in prod, 1-day expiry). Argon2 password hashing. Origin header check on state-changing requests. Rate limits on auth endpoints. Password recovery/reset (`AUTH-005`/`AUTH-006`) is OUT OF SCOPE. Change password (`POST /auth/change-password`) available for authenticated users.
- **DEC-020 [D17] File Uploads**: JPEG/PNG/WebP only (signature validated), max 2 MB, random filenames, stored via local volume adapter. No SVG, no external URLs.
- **DEC-021 Hosting**: Provider-neutral Docker containerization, env-based config, HTTPS reverse proxy.
- **DEC-022 Timezone**: System timezone defined by `APP_TIMEZONE` environment variable.
- **DEC-023 [D21] Admin Payment Visibility**: Admin views payment status and refund state, never sensitive financial card data.
- **DEC-024 [D11] Order & Payment Sequencing**: Order-first sequencing. Online orders created as `PAYMENT_PENDING`, gateway order/session generated, verified webhook updates status to `PLACED`. Unpaid online orders expire after 15 minutes via background job. COD / pay-at-pickup orders start directly as `PLACED` with payment status `PENDING`.
- **DEC-025 [D11] Payment Webhooks**: Verified signature on raw request body, idempotent by provider event ID. Amount and currency must match order snapshot. Out-of-order and duplicate events handled safely (duplicates return 2xx).
- **DEC-026 Data Retention**: Soft-deletion for menu items and deactivations only. Hard deletion is out of scope for v1; retention policy is determined by platform owner.
- **DEC-027 [D16] Search**: Database queries using validated indexes and sanitized regex/text queries. No external search engine.
- **DEC-028 [D8] Service Area**: Delivery permitted only if customer delivery postal code matches restaurant `servicePostalCodes`.
- **DEC-030 Order Notes**: Optional plain text note, max 200 characters, sanitized and HTML-escaped on rendering.

---

## 5. Global Engineering Rules
1. **Authoritative Backend**: Backend is sole authority for security, permissions, prices, totals, order state transitions, and payment verification. Client-supplied totals are strictly ignored.
2. **No Seed or Demo Data Rule**: Zero seed, sample, demo, or dummy data script is permitted in the codebase or database migrations. System bootstrapping occurs exclusively via the CLI script `npm run create-admin` (which reads credentials from environment variables) and subsequent admin creation of restaurants.
3. **Integer Currency / Minor Units**: All monetary values (`subtotal`, `deliveryFee`, `tax`, `total`, item prices, `minOrderAmount`) are stored and transmitted as non-negative integers representing minor currency units (e.g., cents, paise). Floating-point currency representation is strictly forbidden (`[D4]`).
4. **Immutable Snapshots**: Order records preserve immutable snapshots of item names, unit prices, quantities, restaurant metadata, delivery address, and fees at the exact moment of order creation.
5. **No Secrets in Source Code**: All configuration and credentials originate from validated environment variables. Fallback hardcoded secrets are forbidden.
6. **No Raw Card Data**: Card numbers, CVVs, and raw payment instruments NEVER touch application servers or databases.
