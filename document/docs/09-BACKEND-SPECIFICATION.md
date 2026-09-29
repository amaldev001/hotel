# 09 — Backend Specification

## 1. Responsibilities
Authentication, authorization, request validation, business logic, persistence, payment orchestration, order state machine enforcement, file upload processing, in-app notification creation, background job management, and audit logging.

---

## 2. Mandatory Middleware Execution Order

```text
1. helmet()                  — Security headers (CSP, HSTS, X-Frame-Options, etc.)
2. rawBodyCapture()          — Buffer raw body BEFORE json() for webhook signature verification
3. express.json()            — Parse JSON body (excluding /payments/webhook)
4. cookieParser()            — Parse signed cookies
5. cors()                    — Origin restriction (allowlist from CLIENT_URL env)
6. express-rate-limit()      — Global rate limit; stricter limits on auth & payment routes
7. authenticate()            — Verify JWT cookie; attach req.user (or null for public routes)
8. zod-validate()            — Schema validation per route; returns INVALID_INPUT on failure
9. authorize()               — Role + account status + ownership enforcement
10. controller()             — Delegate to service; serialize response
11. errorHandler()           — Centralized catch: format all errors into standard envelope
```

> [!IMPORTANT]
> The raw body MUST be captured (e.g., `express.raw({ type: 'application/json' })`) on the `/api/payments/webhook` route path BEFORE `express.json()` parses it. Signature verification requires the raw bytes. `[D25]`

---

## 3. Service Layer

| Service | Key Responsibilities |
|---|---|
| `AuthService` | Register, login (Argon2 verify), issue/clear JWT cookie, change-password |
| `UserService` | Profile read/update, address CRUD (max-5 enforcement) |
| `RestaurantService` | Profile CRUD, operating hours evaluation in `APP_TIMEZONE` `[D10]`, acceptingOrders toggle, status lifecycle `[D3]` |
| `MenuService` | Category + item CRUD, ownership validation, soft-delete `[D26]`, cuisine tag admin operations `[ADM-003]` |
| `CartService` | Cart CRUD, restaurant mismatch detection, max-30-item enforcement, quantity 1-20 enforcement `[D6]` |
| `CheckoutService` | Quote computation (subtotal, tax, fee, total — all integers `[D4]`), idempotency key check `[D12]`, order creation transaction `[NFR-012]` |
| `OrderService` | State machine transitions `[D13]` `[D15]`, cancel/reject with reason, expiry job logic |
| `PaymentService` | Gateway adapter calls, webhook event processing, refund API invocation `[D14]` `[D16]` `[D25]` |
| `NotificationService` | Create in-app notification records for order events `[D18]` |
| `AdminService` | User/restaurant status management, restaurant+owner provisioning `[D2]` `[D3]`, admin order cancel, refund trigger |
| `AuditService` | Write `AuditLog` records for admin actions and state changes `[NFR-009]` |

---

## 4. Critical Server-Side Enforcement Checklist

Every checkout / order / payment workflow MUST validate ALL of the following before proceeding:

- [ ] JWT valid and user `status === "ACTIVE"` `[AUTH-008]`
- [ ] Role matches route requirements `[AUTH-007]`
- [ ] Resource ownership verified `[BR-007]` `[BR-008]`
- [ ] Restaurant `status === "ACTIVE"` AND `acceptingOrders === true`
- [ ] Restaurant is open per `operatingHours` in `APP_TIMEZONE` (delivery/checkout only) `[D10]`
- [ ] All cart items: `isDeleted=false`, `isAvailable=true`, exist in correct restaurant
- [ ] Delivery postal code in restaurant `servicePostalCodes` (for delivery orders) `[D28]`
- [ ] Server-recomputed totals — client-supplied amounts are strictly ignored `[D5]` `[BR-013]`
- [ ] `subtotal ≥ minOrderAmount` `[D9]`
- [ ] `Idempotency-Key` header present and checked for duplicates `[D12]`
- [ ] Order state machine transition is valid before persisting `[BR-009]`
- [ ] Webhook: raw-body signature verified, amount matches, event ID is new `[D25]`
- [ ] File uploads: magic bytes match JPEG/PNG/WebP, size ≤ 2 MB `[D20]`

---

## 5. MongoDB Transaction Usage `[NFR-012]`

All workflows that touch multiple collections atomically MUST run inside a Mongoose session with `session.withTransaction()`. The server **requires** a MongoDB Replica Set in all environments (including Docker local development). The server startup script must confirm replica set availability before accepting requests.

| Workflow | Collections Modified |
|---|---|
| Place online order | `orders` (create), `carts` (clear), `payments` (create) |
| Place COD/pickup order | `orders` (create), `carts` (clear) |
| Webhook: payment success | `orders` (status update), `payments` (update), `notifications` (create), `auditLogs` (create) |
| Admin create restaurant + owner | `restaurants` (create), `users` (create) |
| Admin cancel + refund trigger | `orders` (status update), `payments` (update), `notifications` (create), `auditLogs` (create) |

---

## 6. Background Job — Order Expiry `[D24]`

```js
// Runs every ~60 seconds
// Finds: { status: "PAYMENT_PENDING", createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) } }
// Updates: status → "EXPIRED", appends to statusHistory
// Creates: Notification (ORDER_EXPIRED) for customer
// Writes: AuditLog entry (actor: system)
```

The expiry job MUST be idempotent — re-running on an already-expired order is a no-op.

---

## 7. Argon2 Password Configuration

```js
// Server-side hash parameters
argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,   // 64 MB
  timeCost: 3,
  parallelism: 1
})
```

Password constraints: 10–128 characters, enforced via Zod schema before hashing. `[D19]`

---

## 8. File Storage Adapter Interface `[D20]`

```js
// FileStorageAdapter interface
interface FileStorageAdapter {
  save(file: Buffer, ext: string): Promise<string>  // returns relative URL path
  delete(path: string): Promise<void>
}

// DefaultLocalVolumeAdapter: saves to /uploads/<uuid>.<ext>
// Adapter is injected into services; swapping provider requires only new adapter implementation
```

---

## 9. No Seed or Demo Data Rule

The backend MUST NOT contain:
- Database seed scripts (`seed.js`, `seed.ts`, or similar)
- Fixture loaders or factory methods that insert records into a production or staging database
- Demo user accounts, sample restaurants, or test menu items outside of automated test databases

The ONLY bootstrap mechanism is `scripts/createAdmin.js`, which:
1. Reads `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PHONE`, `ADMIN_PASSWORD` from environment variables
2. Creates a single admin user record
3. Exits with a non-zero code if any variable is missing or the email already exists

---

## 10. Implementation & Test Suite Status

- **Database Connection Safety**: Startup checks prevent connecting to non-test databases during automated test execution (database name must end in `_test`).
- **Transactional Consistency**: MongoDB transactions (`session.withTransaction()`) implemented across order placement, webhook payments, and admin restaurant provisioning.
- **Testing**: Jest + Supertest test suite with `mongodb-memory-server` passing 75 tests across 13 test suites covering:
  - Auth (login, logout, deactivated users, wrong roles, mustChangePassword, rate limits, cookie flags).
  - Tenant isolation (preventing cross-restaurant/customer resource access).
  - Price integrity (client price stripping, quote recalculations).
  - Idempotency (duplicate headers and concurrent checkout handling).
  - Payment webhooks (bad signatures, event deduplication, status updates).
  - Order state machine transitions and 15-minute background order expiry job.

