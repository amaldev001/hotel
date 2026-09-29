# 26 — Implementation Roadmap

> All decisions are resolved as of the documentation pack update (see `docs/27-OPEN-DECISIONS.md`). No blocking TBDs remain before Phase 1.

---

## Phase 0 — Product Decisions (COMPLETE)
All 30 open decisions (DEC-001 through DEC-030) resolved. Decision tags `[D1]` through `[D22]` applied throughout documentation.

---

## Phase 1 — Foundation & Bootstrap

**Goal**: Working server + database connection + admin account.

| Task | Key Docs |
|---|---|
| Monorepo structure: `server/`, `client/`, `scripts/` | `docs/05` |
| React app skeleton (no Tailwind; Vanilla CSS/CSS Modules) | `docs/05` |
| Express app with middleware stack (helmet, cookie-parser, CORS, rate-limit, errorHandler) | `docs/09` |
| MongoDB Replica Set connection + startup validation | `docs/21`, `docs/09` |
| Env config validation on startup (fail-fast if required vars missing) | `docs/21` |
| Centralized error handler with canonical error codes | `docs/17` |
| Zod validation middleware | `docs/17` |
| `scripts/createAdmin.js` — CLI bootstrap (reads env, creates admin, exits) | `docs/10` |
| `GET /api/health` and `GET /api/config` endpoints | `docs/07` |

---

## Phase 2 — Authentication

**Goal**: Login/logout/session for all roles. Password change for restaurant owners.

| Task | Key Docs |
|---|---|
| User model (Argon2id hash, status, mustChangePassword) | `docs/06`, `docs/10` |
| `POST /api/auth/register` (customer self-register) | `docs/10` |
| `POST /api/auth/login` (httpOnly cookie, rate limit) | `docs/10` |
| `POST /api/auth/logout` (clear cookie) | `docs/10` |
| `GET /api/auth/me` | `docs/10` |
| `POST /api/auth/change-password` | `docs/10` |
| authenticate + authorize middleware | `docs/10`, `docs/04` |
| Tests: all AUTH-001..009 | `docs/20` |

---

## Phase 3 — Restaurant & Menu

**Goal**: Admin creates restaurants+owners; owners manage profile, categories, items, uploads.

| Task | Key Docs |
|---|---|
| Restaurant model (servicePostalCodes, deliveryFee, minOrderAmount, acceptingOrders, operatingHours) | `docs/06`, `docs/11` |
| MenuCategory model + CuisineTag model | `docs/06`, `docs/12` |
| MenuItem model (diet, isAvailable, isDeleted, price as integer) | `docs/06`, `docs/12` |
| `POST /api/admin/restaurants` (create restaurant+owner in transaction) | `docs/07`, `docs/11` |
| `PATCH /api/admin/restaurants/:id/status` | `docs/07`, `docs/11` |
| `GET/PUT /api/restaurant/profile` | `docs/07`, `docs/11` |
| Menu category CRUD (restaurant-scoped) | `docs/07`, `docs/12` |
| Menu item CRUD + soft-delete | `docs/07`, `docs/12` |
| `POST /api/uploads` (magic byte check, 2MB, random filename, local volume) | `docs/12`, `docs/07` |
| `GET/POST/PATCH/DELETE /api/admin/categories` (cuisine tags) | `docs/07`, `docs/12` |
| Tests: RES-001..003, ADM-002, ADM-003, NFR-011 | `docs/20` |

---

## Phase 4 — Discovery, Addresses & Cart

**Goal**: Customers browse, search, manage addresses, manage carts.

| Task | Key Docs |
|---|---|
| Public restaurant list + search (sanitized DB query) | `docs/07`, `docs/11` |
| Public restaurant detail + menu endpoint | `docs/07`, `docs/12` |
| Address model + CRUD (max-5 enforcement) | `docs/06`, `docs/07` |
| Cart model + CRUD (1 restaurant, 30 items, qty 1–20, mismatch detection) | `docs/06`, `docs/13` |
| Tests: CUS-002..006, CUS-001, NFR-004 | `docs/20` |

---

## Phase 5 — Checkout & Payment

**Goal**: Quote, order placement (online + COD/pickup), webhook, expiry.

| Task | Key Docs |
|---|---|
| `POST /api/checkout/quote` (integer arithmetic, all validations) | `docs/13` |
| `POST /api/checkout` (idempotency, MongoDB transaction, cart clear) | `docs/13`, `docs/14` |
| PaymentAdapter interface + provider implementation (`<RAZORPAY or STRIPE - EDIT ME>`) | `docs/14`, `docs/05` |
| `POST /api/payments/webhook` (raw body, signature, idempotency, amount validation) | `docs/14`, `docs/07` |
| `POST /api/payments/verify` (secondary check) | `docs/14`, `docs/07` |
| Order expiry background job (15-minute PAYMENT_PENDING → EXPIRED) | `docs/14`, `docs/09` |
| Tests: CUS-007..010, NFR-008, NFR-010, `[D11]`, `[D24]`, `[D25]` | `docs/20` |

---

## Phase 6 — Order Lifecycle & Notifications

**Goal**: Full state machine, tracking, in-app notifications, audit logs.

| Task | Key Docs |
|---|---|
| Order state machine + statusHistory | `docs/15` |
| `PATCH /api/orders/:id/status` (restaurant transitions, reason enforcement) | `docs/07`, `docs/15` |
| `POST /api/orders/:id/cancel` (customer + admin cancellation) | `docs/07`, `docs/15` |
| `POST /api/admin/orders/:id/cancel` | `docs/07`, `docs/15` |
| NotificationService (create notification records on order events) | `docs/16` |
| AuditService + AuditLog model | `docs/06`, `docs/09` |
| Notification CRUD endpoints | `docs/07`, `docs/16` |
| Tests: CUS-011..013, RES-004..007, ADM-004, NFR-009 | `docs/20` |

---

## Phase 7 — Admin Suite & Refunds

**Goal**: Full admin management console.

| Task | Key Docs |
|---|---|
| `GET/PATCH /api/admin/users` + status toggle | `docs/07`, `docs/04` |
| `GET /api/admin/orders` (platform-wide order list) | `docs/07` |
| `POST /api/admin/refunds` (gateway refund API, idempotent) | `docs/07`, `docs/14` |
| `GET /api/admin/dashboard` (metrics) | `docs/07` |
| Tests: ADM-001, ADM-005, ADM-006 | `docs/20` |

---

## Phase 8 — Frontend

**Goal**: All customer, restaurant, admin pages with correct states.

| Task | Key Docs |
|---|---|
| All public pages (home, login, register, restaurants, search, privacy, terms, refund-policy, 404) | `docs/08` |
| Customer pages (profile, addresses, cart, checkout, payment-status, orders, notifications, change-password) | `docs/08` |
| Restaurant pages (dashboard, profile, categories, menu, orders, settings, notifications, change-password) | `docs/08` |
| Admin pages (dashboard, users, restaurants, orders, categories, change-password) | `docs/08` |
| 15-second order polling with tab visibility gating | `docs/19` |
| Tests: Vitest component tests, Playwright E2E critical flows | `docs/20` |

---

## Phase 9 — Hardening & Release

**Goal**: Full QA gate, security review, production deployment.

| Task | Key Docs |
|---|---|
| Full test suite execution (`npm test` — zero failures) | `docs/20` |
| ESLint + Prettier clean | `docs/22` |
| Security review against `docs/18` and `docs/32` | `docs/18`, `docs/32` |
| Production Docker Compose + Nginx + TLS configuration | `docs/21` |
| MongoDB Replica Set in all environments confirmed | `docs/21` |
| Release readiness checklist | `docs/34` |
