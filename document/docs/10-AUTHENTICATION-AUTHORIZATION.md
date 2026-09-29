# 10 — Authentication & Authorization

## 1. Resolved Strategy `[D19]`

**Session mechanism**: JWT stored in an `httpOnly` cookie.

| Property | Value |
|---|---|
| Cookie flag: `httpOnly` | Yes — JavaScript cannot read the cookie |
| Cookie flag: `SameSite` | `Strict` |
| Cookie flag: `Secure` | Yes in production; optional in development |
| Cookie name | `auth_token` (or env-configured name) |
| JWT expiry | 24 hours (1 day) |
| Refresh tokens | None in v1 |
| Token revocation | None in v1 (logout simply clears the cookie server-side) |
| Password hashing | Argon2id — see `docs/09` for parameters |
| Password length | 10–128 characters (enforced by Zod validation before hashing) |
| Password recovery | **OUT OF SCOPE** — `AUTH-005`, `AUTH-006` disabled `[D19]` |
| Password change | `POST /api/auth/change-password` for authenticated users `[AUTH-009]` |

---

## 2. Endpoints

| Method | Path | Purpose | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Customer self-register | No |
| `POST` | `/api/auth/login` | Login, set cookie | No |
| `POST` | `/api/auth/logout` | Clear cookie | Yes |
| `GET` | `/api/auth/me` | Return user from cookie | Yes |
| `POST` | `/api/auth/change-password` | Change authenticated user's password | Yes |
| `POST` | `/api/auth/forgot-password` | **REMOVED — returns 404** | — |
| `POST` | `/api/auth/reset-password` | **REMOVED — returns 404** | — |

---

## 3. Registration Flow

1. Validate body via Zod: `name` (1–100), `email` (valid format), `phone`, `password` (10–128 chars).
2. Normalize email to lowercase.
3. Check email uniqueness — return `EMAIL_ALREADY_REGISTERED` (409) if duplicate.
4. Hash password with Argon2id.
5. Create user: `role: "customer"`, `status: "ACTIVE"`, `mustChangePassword: false`.
6. Issue JWT cookie (24h).
7. Return `201` with user profile (no `passwordHash`).

---

## 4. Admin-Provisioned Accounts `[D2]`

When Admin creates a restaurant + owner account via `POST /api/admin/restaurants`:
1. Admin provides a `temporaryPassword` (10–128 chars) as required input. System rejects any hardcoded default values, and the temporary password is NEVER returned in API responses.
2. User created: `role: "restaurant"`, `status: "ACTIVE"`, `mustChangePassword: true`.
3. On next login, frontend detects `mustChangePassword: true` and redirects to `/restaurant/change-password` before any other navigation.
4. After successful change-password, `mustChangePassword` is set to `false`.

---

## 5. Authorization Middleware

Every protected route runs authorization through the following sequence:

```text
1. Extract and verify JWT signature from httpOnly cookie
   → 401 UNAUTHORIZED if missing or invalid

2. Load user from DB using JWT sub (userId)
   → 401 UNAUTHORIZED if user not found

3. Check user.status === "ACTIVE"
   → 403 ACCOUNT_SUSPENDED if suspended

4. Check user.role matches route role requirements
   → 403 FORBIDDEN if wrong role

5. Check resource ownership (where applicable):
   - Cart:     cart.customerId === user._id
   - Address:  address.customerId === user._id
   - Order:    order.customerId === user._id (customer), or order.restaurantId === user.restaurantId (restaurant)
   - MenuItem: item.restaurantId === user's restaurant's _id
   → 403 FORBIDDEN on ownership mismatch

6. Pass to controller
```

---

## 6. CSRF Protection — Origin Check `[D19]`

For all state-changing HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`):

```text
- The server reads the `Origin` header
- If Origin is missing or does not match CLIENT_URL (env variable), return 403 FORBIDDEN
- Applied as a middleware before authorization
```

This is the CSRF protection mechanism chosen for `httpOnly SameSite=Strict` cookies. No separate CSRF token is required given `SameSite=Strict`, but Origin check provides defence-in-depth.

---

## 7. Rate Limiting `[D19]`

| Route | Limit |
|---|---|
| `POST /api/auth/login` | 10 requests / 15 min per IP |
| `POST /api/auth/register` | 10 requests / 15 min per IP |
| `POST /api/checkout` | 20 requests / 15 min per IP per user |
| `POST /api/payments/webhook` | Standard rate limit (provider IP range if known) |
| Global | 200 requests / 15 min per IP |

Rate-limit responses return `HTTP 429` with error code `RATE_LIMITED`.

---

## 8. JWT Payload Structure

```json
{
  "sub": "<userId>",
  "role": "<role>",
  "iat": 1700000000,
  "exp": 1700086400
}
```

**Do not embed** sensitive profile data, addresses, phone numbers, or payment data in JWT payload.

---

## 9. Logout Semantics

```text
POST /api/auth/logout
→ Server clears the cookie: Set-Cookie: auth_token=; Max-Age=0; HttpOnly; SameSite=Strict
→ Returns 200
→ No server-side token blacklist in v1 (cookie expiry is the sole revocation mechanism)
```

---

## 10. `create-admin` CLI Bootstrap Script

```text
npm run create-admin

Environment variables required:
  ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD

Behaviour:
  - Connects to MongoDB
  - Validates all 4 env vars are present (exits non-zero if any is missing)
  - Rejects if ADMIN_EMAIL already exists
  - Hashes ADMIN_PASSWORD with Argon2id
  - Creates User: { role: "admin", status: "ACTIVE", mustChangePassword: false }
  - Logs success and exits 0

This is the ONLY mechanism to create an admin account. No seed scripts.
```

---

## 11. Implementation Verification

- **Cookie Flags**: Enforces `httpOnly: true`, `SameSite: Strict`, and `Secure` (in production).
- **Password Security**: Argon2id hashing for password storage; password length Zod schema validation (10-128 chars).
- **Force Password Change**: Users with `mustChangePassword: true` are locked to password change endpoints; frontend guards force redirection to `/change-password`.
- **Testing**: Backend Jest tests verify login/logout, invalid passwords, deactivated user blocking, wrong roles, rate limiting, and cookie security flags. Frontend Vitest tests verify route guard protection.

