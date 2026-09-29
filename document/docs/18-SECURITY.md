# 18 — Security Requirements

## 1. Authentication Security `[D19]`

| Control | Implementation |
|---|---|
| Session storage | JWT in `httpOnly` cookie — JavaScript cannot read it |
| Cookie `SameSite` | `Strict` — cookie sent only on same-site requests |
| Cookie `Secure` | Required in production; optional in development |
| Cookie expiry | 24 hours (1 day); no refresh token |
| Password hashing | Argon2id — 10–128 character passwords enforced |
| CSRF protection | Origin header check on all `POST`, `PUT`, `PATCH`, `DELETE` requests; `CLIENT_URL` from env |
| Rate limiting | Login/register: 10 req / 15 min per IP; global: 200 req / 15 min per IP |

---

## 2. HTTP Security Headers `[D21]`

Applied via `helmet()` middleware on all responses:

| Header | Value |
|---|---|
| `Content-Security-Policy` | Configured to restrict external scripts, frames, and object sources |
| `Strict-Transport-Security` | Enabled (production) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `no-referrer` |
| `X-XSS-Protection` | `0` (deprecated, rely on CSP) |

---

## 3. API Security

| Control | Rule |
|---|---|
| CORS | Strict allowlist from `CLIENT_URL` env; no wildcard origin |
| Authorization check order | Auth → account status → role → ownership → operation (see `docs/10`) |
| Client-supplied values | Prices, totals, roles, order status, payment status are **never trusted** from client `[D5]` |
| Input validation | All request data validated via Zod schema before controller runs |
| Output encoding | All user-provided text (order notes, restaurant descriptions) is HTML-escaped before rendering `[D30]` |
| Error messages | No stack traces, no raw DB errors, no secret exposure in responses |

---

## 4. Payment Security `[D11]` `[D25]` `[D23]`

| Control | Rule |
|---|---|
| Card data | NEVER touches application servers — provider-hosted checkout only |
| Webhook verification | Signature computed on raw request body using `PAYMENT_WEBHOOK_SECRET` |
| Webhook idempotency | Provider event ID uniqueness enforced via DB unique index |
| Webhook amount validation | Amount and currency must exactly match order snapshot |
| Raw body preservation | Express raw body middleware captures bytes before JSON parsing on webhook route |
| Admin visibility | Payment status and refund state only — no card numbers, CVVs, or billing addresses `[D23]` |
| Fake provider | Forbidden in production — server refuses to start if `PAYMENT_PROVIDER=fake` and `NODE_ENV=production` |

---

## 5. File Upload Security `[D20]`

| Control | Rule |
|---|---|
| Accepted formats | JPEG, PNG, WebP **only** |
| Format validation | Magic byte inspection (not file extension check) |
| Maximum size | 2 MB |
| Filenames | Random UUID-assigned — client filename discarded |
| No SVG | Rejected — risk of XSS/SSRF via SVG parsing |
| No external URLs | Images must be uploaded; external URLs are not accepted as image values |
| Storage location | Local volume `/uploads/` — served via Nginx static alias |
| Content-Type | Server sets correct `Content-Type` header when serving files |

---

## 6. Database Security

| Control | Rule |
|---|---|
| Passwords | Stored as Argon2id hashes only; never returned in any API response |
| PII in logs | Personal data (names, addresses, phone numbers, emails) must not appear in application logs |
| Payment data in logs | Payment tokens, card data, webhook secrets must never be logged |
| Queries | Use Mongoose schema-bound queries; no raw string concatenation into queries |
| Indexes | All unique indexes (email, event IDs) enforced at DB level as well as application level |
| Replica set | Required for transaction support — see `docs/21` |

---

## 7. Logging Security `[NFR-011]`

The following data MUST NEVER appear in application logs, error output, or audit records:

- Passwords (plain-text or hashed)
- JWT tokens
- Payment gateway secret keys
- Webhook signature secrets
- Raw card data (even partially masked beyond last 4 digits)
- Full delivery addresses
- Customer phone numbers
- Customer email addresses (in high-volume operational logs — acceptable in targeted admin audit logs)

---

## 8. Admin Security Boundaries `[D21]` `[D23]`

- Admins cannot place food orders.
- Admins see payment status and refund state — not card data.
- All admin actions are recorded in `auditLogs` with actor, action, target, and timestamp.
- Admin account can only be created via the `create-admin` CLI script with env variables.

---

## 9. Abuse Protection

High-risk operations requiring rate limiting beyond the global limit:

| Operation | Risk |
|---|---|
| Login | Brute force credential attack |
| Registration | Account spam / abuse |
| Checkout | Order flooding |
| File upload | Storage exhaustion |
| Search | Database query flooding |
| Admin operations | Insider abuse |

Rate-limit configuration values come from environment variables. Hard fallback defaults are acceptable for rate limiting (not for secrets).
