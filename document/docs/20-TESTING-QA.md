# 20 — Testing & QA

## 1. Testing Stack (Named Tools)

| Layer | Tool | Purpose |
|---|---|---|
| Backend unit & service tests | **Jest** | Business logic, service methods, validators |
| Backend API integration tests | **Jest + Supertest** | HTTP endpoint testing against in-memory or test-connected MongoDB |
| Frontend component tests | **Vitest + @testing-library/react** | React component rendering and interaction |
| End-to-end (E2E) tests | **Playwright** (preferred) or **Cypress** | Full user flow testing across browser + server |
| Linting | **ESLint + Prettier** | Code style and quality gates |

---

## 2. Test Environment Rules

- Backend tests run against a dedicated **test MongoDB instance** (not development or production).
- The fake payment provider (`PAYMENT_PROVIDER=fake`) is allowed ONLY in test environments.
- No test fixtures, seed data, or factory scripts may run against a production or staging database.
- Tests must set up and tear down their own data within the test suite.
- The test database must have a Replica Set enabled (required for MongoDB transactions). `[NFR-012]`

---

## 3. Required Test Suites

### 3.1 Authentication (`AUTH-001` – `AUTH-009`)

| Scenario | Requirement |
|---|---|
| Register with valid data → 201, cookie set | `AUTH-001` |
| Register with duplicate email → 409 `EMAIL_ALREADY_REGISTERED` | `AUTH-001` |
| Register with password < 10 chars → 400 `INVALID_INPUT` | `AUTH-001` `[D19]` |
| Register with password > 128 chars → 400 `INVALID_INPUT` | `AUTH-001` `[D19]` |
| Login with correct credentials → 200, cookie set | `AUTH-002` |
| Login with wrong password → 401 `INVALID_CREDENTIALS` | `AUTH-002` |
| Login with suspended account → 403 `ACCOUNT_SUSPENDED` | `AUTH-002` `AUTH-008` |
| Logout clears cookie → 200 | `AUTH-003` |
| `GET /auth/me` with valid cookie → 200 | `AUTH-004` |
| `POST /auth/forgot-password` → 404 (out of scope) | `AUTH-005` `[D19]` |
| `POST /auth/reset-password` → 404 (out of scope) | `AUTH-006` `[D19]` |
| Change password correct → 200; `mustChangePassword` set false | `AUTH-009` |
| Exceed 10 login attempts / 15 min → 429 `RATE_LIMITED` | `[D19]` |

### 3.2 Payment Gateway & Provider `[D11]` `[D24]` `[D25]`

| Scenario | Requirement |
|---|---|
| `PAYMENT_PROVIDER=fake` + `NODE_ENV=production` → server refuses to start | `[D11]` |
| `PAYMENT_PROVIDER=fake` + `NODE_ENV=test` → server starts normally | `[D11]` |
| Valid webhook signature → order transitions `PAYMENT_PENDING → PLACED` | `[D25]` |
| Invalid webhook signature → 400 `INVALID_WEBHOOK_SIGNATURE` | `[D25]` |
| Duplicate webhook event ID → 200, no second state transition | `[D25]` |
| Webhook amount mismatch → 400 `PAYMENT_AMOUNT_MISMATCH` | `[D25]` |
| Online order + no webhook for 15 min → order becomes `EXPIRED` | `[D24]` |
| COD order → status immediately `PLACED`, paymentStatus `PENDING` | `[D24]` |
| Admin triggers refund on `REFUND_PENDING` order → 200, `REFUNDED` | `[D16]` |
| Admin triggers refund on already `REFUNDED` order → idempotent 200 | `[D16]` `[D25]` |

### 3.3 Cart & Checkout `[D6]` `[D9]` `[D12]`

| Scenario | Requirement |
|---|---|
| Add item from Restaurant A; add from B → 409 `CART_RESTAURANT_MISMATCH` | `[D6]` |
| Cart with 30 items; add another → 400 `CART_LIMIT_EXCEEDED` | `[D6]` |
| Item with quantity 21 → 400 `CART_LIMIT_EXCEEDED` | `[D6]` |
| Checkout quote returns server-computed integers (no floats) | `[D4]` `[D9]` |
| Tax calculation: `floor(subtotal * TAX_PERCENT / 100)` | `[D9]` |
| Delivery address postal code not in servicePostalCodes → 400 `OUT_OF_SERVICE_AREA` | `[D28]` |
| Subtotal < minOrderAmount → 400 `MIN_ORDER_NOT_MET` | `[D9]` |
| Checkout without `Idempotency-Key` header → 400 `INVALID_INPUT` | `[D12]` |
| Repeat `Idempotency-Key` → same order returned | `[D12]` |
| Cart item becomes unavailable between add and checkout → 409 `ITEM_UNAVAILABLE` | `[BR-010]` |
| Closed restaurant at checkout → 409 `RESTAURANT_NOT_ELIGIBLE` | `[D10]` |
| `acceptingOrders=false` → 409 `RESTAURANT_NOT_ELIGIBLE` | `[D17]` |

### 3.4 Order State Machine `[D13]` `[D15]`

| Scenario | Requirement |
|---|---|
| `PLACED → CONFIRMED` by restaurant owner → 200 | `[RES-005]` |
| `PLACED → REJECTED` without reason → 400 `INVALID_INPUT` | `[D13]` |
| `PLACED → REJECTED` with reason → 200, paymentStatus=`REFUND_PENDING` if paid | `[D16]` |
| `PLACED → CANCELLED` by customer → 200 | `[D13]` |
| `PREPARING → CANCELLED` by customer → 409 `INVALID_STATE_TRANSITION` | `[D13]` |
| `DELIVERED → CANCELLED` by admin → 409 `INVALID_STATE_TRANSITION` (terminal) | `[D13]` |
| `READY → OUT_FOR_DELIVERY` on pickup order → 409 `INVALID_STATE_TRANSITION` | `[D8]` |
| `READY → COMPLETED` on delivery order → 409 `INVALID_STATE_TRANSITION` | `[D8]` |
| Admin cancels non-terminal order with reason → 200 | `[D13]` `[D21]` |
| Restaurant cannot cancel another restaurant's order → 403 `FORBIDDEN` | `[BR-007]` |

### 3.5 Menu & File Uploads `[D7]` `[D20]` `[D26]`

| Scenario | Requirement |
|---|---|
| Upload valid JPEG (2 MB or less) → 201, asset URL | `[D20]` |
| Upload SVG → 400 `INVALID_FILE_TYPE` | `[D20]` |
| Upload PNG > 2 MB → 400 `FILE_TOO_LARGE` | `[D20]` |
| Upload file with `.jpg` extension but PNG magic bytes → accepted as valid PNG | `[D20]` |
| Soft-delete item → excluded from public menu | `[D26]` |
| Deleted item in historical order snapshot → snapshot unchanged | `[D5]` `[D26]` |
| Item price must be a positive integer → float rejected | `[D4]` |
| Category must belong to same restaurant → validated server-side | `[D7]` |

### 3.6 Addresses `[D22]`

| Scenario | Requirement |
|---|---|
| Create 5th address → 201 | `[D22]` |
| Create 6th address → 400 `MAX_ADDRESSES_REACHED` | `[D22]` |
| Customer cannot view/edit another customer's address → 403 `FORBIDDEN` | `[BR-008]` |

### 3.7 Admin Workflows `[D21]`

| Scenario | Requirement |
|---|---|
| Admin creates restaurant + owner → 201; owner has `mustChangePassword=true` | `[D2]` `[D3]` |
| Admin suspends user → 200; suspended user login → 403 | `[ADM-001]` |
| Admin lists all restaurants → 200 | `[ADM-002]` |
| Non-admin accessing admin endpoint → 403 `FORBIDDEN` | `[AUTH-007]` |
| Admin cannot place an order → 403 `FORBIDDEN` | `[D21]` |

---

## 4. QA Reporting Requirements

- Never claim tests were run when they were not.
- Record: command executed, environment, pass/fail counts, known failures, and any skipped tests with reason.
- CI must run the full test suite on every pull request. PRs with failing tests must not merge.
