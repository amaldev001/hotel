# 32 — Security Threat Model

## 1. Threat: Account Takeover

**Attack vectors**: Brute-force login, stolen cookies, credential stuffing.

| Control | Implementation |
|---|---|
| Argon2id password hashing | Strong adaptive hash; see `docs/10` for parameters |
| Password length constraint | 10–128 characters enforced before hashing `[D19]` |
| Login rate limiting | 10 attempts per 15 minutes per IP |
| httpOnly cookie | JavaScript cannot read the JWT cookie |
| `SameSite=Strict` cookie | Cookie not sent on cross-site navigation |
| `Secure` cookie in production | Cookie only sent over HTTPS |
| No password recovery (v1) | `AUTH-005`/`AUTH-006` disabled — reduces attack surface `[D19]` |

---

## 2. Threat: Horizontal Privilege Escalation

**Attack vector**: Customer A queries or modifies Customer B's orders, cart, or addresses.

| Control | Implementation |
|---|---|
| Ownership enforcement | Every resource endpoint checks `resource.customerId === req.user._id` |
| Server-side checks only | Frontend route guards are UX only; server re-validates on every request |
| Mongoose queries scoped to userId | `Order.findOne({ _id: orderId, customerId: userId })` pattern |

---

## 3. Threat: Vertical Privilege Escalation

**Attack vector**: Customer attempts admin-only or restaurant-only actions.

| Control | Implementation |
|---|---|
| Role check in middleware | `authorize(['admin'])` on admin routes before controller |
| Admin cannot place orders | Enforced in checkout route middleware `[D21]` |
| Restaurant-scoped menu and order access | `item.restaurantId === user.restaurantId` validated server-side |

---

## 4. Threat: Price / Total Manipulation

**Attack vector**: Client sends modified item prices, totals, or discount values in checkout request.

| Control | Implementation |
|---|---|
| Server reloads prices | Prices fetched from DB at checkout; client prices ignored `[D5]` `[BR-013]` |
| Integer-only arithmetic | No floating-point rounding errors in monetary calculations `[D4]` |
| Quote before checkout | `POST /checkout/quote` gives server-computed values for display |
| No client-trusted totals | Body field `total` from client is discarded |

---

## 5. Threat: Fake Payment Success

**Attack vector**: Client forges a payment success callback or sends a fake webhook.

| Control | Implementation |
|---|---|
| Webhook signature verification | HMAC computed on raw body using `PAYMENT_WEBHOOK_SECRET` `[D25]` |
| Raw body preservation | `express.raw()` before `express.json()` on webhook route |
| `POST /payments/verify` is secondary only | Client callback never sole proof of payment `[D25]` |
| Fake provider blocked in production | Server exits if `PAYMENT_PROVIDER=fake` and `NODE_ENV=production` `[D11]` |

---

## 6. Threat: Duplicate Order / Duplicate Charge

**Attack vector**: Network retry or client re-submission creates multiple orders or charges.

| Control | Implementation |
|---|---|
| `Idempotency-Key` header required | Unique key enforced per checkout submission `[D12]` |
| `(customerId, idempotencyKey)` unique index | DB-level enforcement |
| Provider event ID uniqueness | Webhook events deduplicated by `providerEventId` unique index `[D25]` |
| Gateway idempotency | `<RAZORPAY or STRIPE - EDIT ME>` SDK idempotency keys used where supported |

---

## 7. Threat: Malicious File Upload

**Attack vectors**: SVG with embedded script, PHP/JS file disguised as image, oversized file.

| Control | Implementation |
|---|---|
| Magic byte validation | JPEG, PNG, WebP signatures checked — not file extension `[D20]` |
| SVG rejected | No SVG accepted (XSS/SSRF risk via SVG parser) |
| 2 MB size limit | Enforced before storage write |
| Random filename assignment | Client filename discarded; random UUID used |
| Static file serving via Nginx | Upload directory served by Nginx, not Express — reduces script execution risk |
| No external image URLs | Images must be uploaded; URL injection not possible |

---

## 8. Threat: Injection (NoSQL / Query)

**Attack vectors**: NoSQL operator injection (`$where`, `$gt`), regex injection in search.

| Control | Implementation |
|---|---|
| Zod schema validation | All inputs typed and shape-validated before reaching queries |
| Mongoose typed queries | Query fields are typed via Mongoose schema — prevents operator injection |
| Escaped text search | Search query parameter sanitized before `$text` or regex query |
| No raw string concatenation into queries | Mongoose query builder used throughout |

---

## 9. Threat: CSRF (Cross-Site Request Forgery)

**Attack vector**: Malicious site triggers state-changing request using victim's browser cookies.

| Control | Implementation |
|---|---|
| `SameSite=Strict` | Cookie not sent on cross-site navigations in modern browsers |
| Origin header check | Server verifies `Origin` header matches `CLIENT_URL` on all state-changing methods `[D19]` |
| Defence-in-depth | Both controls applied; either alone is partial protection |

---

## 10. Threat: Secret / Credential Leakage

**Attack vectors**: Secrets in source code, logs, error responses, env files committed to git.

| Control | Implementation |
|---|---|
| No secrets in source code | All secrets from environment variables only `[NFR-005]` |
| No secrets in responses | Error handler strips internal details `[docs/17]` |
| No PII / tokens in logs | Logging rules enforced `[NFR-011]` `[docs/23]` |
| No `.env` files committed | `.gitignore` must exclude all `.env*` files |
| Audit logs PII-free | Metadata only; no passwords, tokens, or payment secrets |

---

## 11. Threat: Data Exposure via Over-permissive API

**Attack vectors**: API returns fields the caller should not see.

| Control | Implementation |
|---|---|
| `passwordHash` never returned | All user serialization explicitly excludes hash |
| Admin payment visibility limited | Payment status + refund state only; no card data `[D23]` |
| Suspended restaurant hidden | Discovery only returns `ACTIVE` restaurants |
| Soft-deleted items excluded | `isDeleted: true` items excluded from all customer-facing responses |

---

## 12. Threat: Abuse / Denial of Service

**Attack vectors**: Request flooding, bot registration, cart stuffing, upload spam.

| Control | Implementation |
|---|---|
| Global rate limit | 200 req / 15 min per IP |
| Auth rate limit | 10 req / 15 min per IP on login/register |
| Checkout rate limit | 20 req / 15 min per IP per user |
| Cart limits | Max 30 items, quantity 1–20 per line `[D6]` |
| File upload size limit | 2 MB maximum `[D20]` |
| Address limit | Max 5 per customer `[D22]` |
