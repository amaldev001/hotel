# 27 — Open Decisions Register

All 30 decisions are **RESOLVED**. No decision is outstanding.

| ID | Topic | Tag | Status | Decision | Date |
|---|---|---|---|---|---|
| DEC-001 | Payment gateway | `[D11]` | ✅ RESOLVED | `<RAZORPAY or STRIPE - EDIT ME>`, TEST mode, provider-hosted checkout. Card data never touches our servers. COD/pay-at-pickup supported. Fake provider exists only in test suites; server refuses to start with fake in production. | 2026-09-21 |
| DEC-002 | Delivery model | `[D8]` | ✅ RESOLVED | Delivery and Pickup supported. Restaurant staff advance all statuses. No driver role, no live maps. | 2026-09-21 |
| DEC-003 | Restaurant approval workflow | `[D2]` | ✅ RESOLVED | No approval workflow. Admin creates and suspends restaurants. Lifecycle is `ACTIVE` ↔ `SUSPENDED`. PENDING and APPROVED states removed everywhere. | 2026-09-21 |
| DEC-004 | Restaurant owner/staff model | `[D3]` | ✅ RESOLVED | One owner account per restaurant. One restaurant per owner. No staff accounts. | 2026-09-21 |
| DEC-005 | Multiple branches | `[D20]` | ✅ RESOLVED | **Out of v1 scope.** | 2026-09-21 |
| DEC-006 | One user managing multiple restaurants | `[D3]` | ✅ RESOLVED | Not supported. One owner per restaurant, one restaurant per owner, unique-indexed. | 2026-09-21 |
| DEC-007 | Reviews / ratings | `[D20]` | ✅ RESOLVED | **Out of v1 scope.** | 2026-09-21 |
| DEC-008 | Coupons / discounts | `[D20]` | ✅ RESOLVED | **Out of v1 scope.** | 2026-09-21 |
| DEC-009 | Favorites | `[D20]` | ✅ RESOLVED | **Out of v1 scope.** | 2026-09-21 |
| DEC-010 | Offers / promotions | `[D20]` | ✅ RESOLVED | **Out of v1 scope.** | 2026-09-21 |
| DEC-011 | Food variants / add-ons | `[D20]` | ✅ RESOLVED | **Out of v1 scope.** | 2026-09-21 |
| DEC-012 | Live GPS / driver tracking | `[D20]` | ✅ RESOLVED | **Out of v1 scope.** | 2026-09-21 |
| DEC-013 | Tax rules / rates | `[D9]` | ✅ RESOLVED | `tax = floor(subtotal × TAX_PERCENT / 100)`. `TAX_PERCENT` from env. All values as integers in minor units. | 2026-09-21 |
| DEC-014 | Delivery fee calculation | `[D9]` | ✅ RESOLVED | Each restaurant sets `deliveryFee` (integer, minor units). Server computes at quote/checkout. 0 for pickup orders. | 2026-09-21 |
| DEC-015 | Cancellation windows / rules | `[D13]` | ✅ RESOLVED | Customer may cancel only while `PAYMENT_PENDING` or `PLACED`. Restaurant may cancel/reject with reason before `OUT_FOR_DELIVERY`/completion. Admin may cancel any non-terminal order with reason. | 2026-09-21 |
| DEC-016 | Refunds / partial refunds | `[D14]` | ✅ RESOLVED | Cancelling/rejecting a PAID order sets `paymentStatus = REFUND_PENDING`. Admin triggers full refund via gateway API (idempotent). No partial refunds. | 2026-09-21 |
| DEC-017 | Operating hours / holiday exceptions | `[D10]` | ✅ RESOLVED | Weekly opening hours + `acceptingOrders` toggle, evaluated in `APP_TIMEZONE`. No holiday exceptions in v1. | 2026-09-21 |
| DEC-018 | Notification channels | `[D18]` | ✅ RESOLVED | In-app notifications only. Triggers: order events. Recipients: customer and restaurant owner. Email/SMS/push out of scope. | 2026-09-21 |
| DEC-019 | Authentication / session strategy | `[D17]` | ✅ RESOLVED | JWT in `httpOnly` cookie (`SameSite=Strict`, `Secure` in production, 1-day expiry, no refresh token). Argon2id. Origin check on state-changing requests. Rate limits on auth endpoints. Password 10–128 chars. `AUTH-005`/`006` out of scope. `POST /auth/change-password` added. | 2026-09-21 |
| DEC-020 | Image / file storage | `[D17]` | ✅ RESOLVED | JPEG/PNG/WebP only (magic byte check), max 2 MB, random filenames, local-volume default adapter. No external image URLs, no SVG. | 2026-09-21 |
| DEC-021 | Hosting | — | ✅ RESOLVED | Provider-neutral: Docker, env-based config, HTTPS at reverse proxy. | 2026-09-21 |
| DEC-022 | Application timezone | — | ✅ RESOLVED | `APP_TIMEZONE` env variable (IANA format, e.g. `America/New_York`). | 2026-09-21 |
| DEC-023 | Admin payment visibility | `[D21]` | ✅ RESOLVED | Admin sees payment status and refund state only. Never sees card data. | 2026-09-21 |
| DEC-024 | Payment / order creation sequencing | `[D11]` | ✅ RESOLVED | Order-first: online orders created as `PAYMENT_PENDING`, gateway session created, verified webhook moves order to `PLACED`. Unpaid orders become `EXPIRED` after 15 minutes. COD/pickup orders start as `PLACED` with `paymentStatus = PENDING`. | 2026-09-21 |
| DEC-025 | Webhook / event policy | `[D11]` | ✅ RESOLVED | Verify signature on RAW body; idempotent by provider event ID; amount and currency must match our order; out-of-order and duplicate events are safe; duplicates return 2xx. `POST /payments/verify` is a secondary check, never sole proof. | 2026-09-21 |
| DEC-026 | Data retention / deletion | — | ✅ RESOLVED | No hard deletion in v1 (deactivation only for accounts and `isDeleted` for menu items). Retention period is the owner's decision. Documented in `docs/37-KNOWN-LIMITATIONS.md`. | 2026-09-21 |
| DEC-027 | Search implementation | `[D16]` | ✅ RESOLVED | Database queries with escaped input and validated indexes. No external search engine. | 2026-09-21 |
| DEC-028 | Delivery service area rules | `[D8]` | ✅ RESOLVED | Delivery permitted only if customer delivery postal code is in restaurant `servicePostalCodes`. | 2026-09-21 |
| DEC-029 | Restaurant minimum-order rules | `[D9]` | ✅ RESOLVED | Each restaurant sets `minOrderAmount` (integer, minor units). Server enforces at quote and checkout. | 2026-09-21 |
| DEC-030 | Order notes / special instructions | — | ✅ RESOLVED | Optional order note, plain text, max 200 characters. Always rendered HTML-escaped. | 2026-09-21 |

---

## Additional Rulings (Applied Globally)

| Tag | Ruling |
|---|---|
| `[D1]` | Roles: customer, restaurant, admin. |
| `[D2]` | Customers self-register. Admin creates restaurants + owner accounts (temporary password, `mustChangePassword=true`). First admin via `create-admin` script from env. |
| `[D4]` | Money stored and transmitted as integers in minor units in env `CURRENCY`. Never floats. |
| `[D5]` | Server always computes prices. Client totals ignored. Orders store immutable snapshots. |
| `[D6]` | One server-side cart per customer. One restaurant per cart. Different restaurant → 409 `CART_RESTAURANT_MISMATCH`. Max 30 lines, quantity 1–20. |
| `[D7]` | Categories belong to a restaurant. Cuisine tags on restaurants from admin-managed list (ADM-003). Menu items: name, description, price, diet (veg/non_veg), isAvailable, optional image, preparationTime. |
| `[D12]` | Checkout requires `Idempotency-Key` header. Repeated key returns same order. |
| `[D15]` | Tracking is stored status timeline. Customer UI polls every 15 s only while order is active and tab is visible. No sockets. |
| `[D16]` | Lists paginated: default 20, max 100. |
| `[D20]` | Out of v1: ratings, live maps, tips, partial refunds, invoices, inventory, scheduled orders, email/SMS/push. |
| `[D21]` | Admin: manage users, restaurants, orders, refunds, dashboard. Admin cannot place orders. |
| `[D22]` | Up to 5 saved addresses per customer. Chosen address snapshotted on order. |

---

## Decision Record Format (for future decisions)

For every new resolved decision, document:
- Selected option
- Rationale
- Date
- Affected modules
- Affected schemas
- Affected APIs
- Migration impact
- Owner
