# 07 — REST API Specification

Base URL: `/api`. All request and response bodies are JSON unless noted (file uploads use `multipart/form-data`). See `docs/30-API-CONTRACT-TEMPLATES.md` for the per-endpoint contract format, `docs/17-VALIDATION-ERROR-HANDLING.md` for error codes, and `docs/04-ROLES-PERMISSIONS.md` for the full endpoint access matrix.

---

## 1. Standard Envelopes

### Success Response
```json
{ "success": true, "data": {} }
```

### Paginated Success Response
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Safe human-readable message",
    "details": {}
  }
}
```
Never expose stack traces, secrets, or raw DB/provider error messages.

---

## 2. Pagination Contract `[D16]`
All list endpoints accept:
- `page` — integer ≥ 1, default `1`
- `limit` — integer 1–100, default `20`, max enforced server-side

---

## 3. Standard Error Codes (aligned with `docs/17`)

| Code | HTTP Status | Meaning |
|---|---|---|
| `INVALID_INPUT` | 400 | Schema or type validation failure |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `ACCOUNT_SUSPENDED` | 403 | Authenticated user is suspended |
| `FORBIDDEN` | 403 | Insufficient role or ownership |
| `NOT_FOUND` | 404 | Resource does not exist |
| `EMAIL_ALREADY_REGISTERED` | 409 | Duplicate email on registration |
| `CART_RESTAURANT_MISMATCH` | 409 | Cart item from different restaurant `[D6]` |
| `CART_LIMIT_EXCEEDED` | 400 | >30 items or quantity >20 `[D6]` |
| `MAX_ADDRESSES_REACHED` | 400 | Customer already has 5 addresses `[D22]` |
| `INVALID_STATE_TRANSITION` | 409 | Order state machine violation |
| `RESTAURANT_NOT_ELIGIBLE` | 409 | Restaurant not accepting orders |
| `OUT_OF_SERVICE_AREA` | 400 | Postal code not in servicePostalCodes `[D28]` |
| `MIN_ORDER_NOT_MET` | 400 | Subtotal < minOrderAmount `[D9]` |
| `ITEM_UNAVAILABLE` | 400 | Menu item isAvailable=false |
| `ITEM_NOT_FOUND` | 404 | Menu item isDeleted=true or not found |
| `PAYMENT_FAILED` | 402 | Provider-side payment failure |
| `PAYMENT_AMOUNT_MISMATCH` | 400 | Webhook amount ≠ order total `[D25]` |
| `INVALID_WEBHOOK_SIGNATURE` | 400 | Webhook HMAC verification failure `[D25]` |
| `IDEMPOTENCY_CONFLICT` | 409 | Same Idempotency-Key with different payload `[D12]` |
| `INVALID_FILE_TYPE` | 400 | Upload is not JPEG/PNG/WebP `[D20]` |
| `FILE_TOO_LARGE` | 400 | Upload exceeds 2 MB `[D20]` |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

---

## 4. Authentication Endpoints

### `POST /api/auth/register` — Customer self-registration `[AUTH-001]`
- **Auth**: None
- **Role**: Public
- **Body**: `{ name, email, phone, password }` — password 10–128 chars
- **Success**: `201` `{ user: { _id, name, email, role, status } }` + sets JWT cookie
- **Errors**: `INVALID_INPUT`, `EMAIL_ALREADY_REGISTERED`

### `POST /api/auth/login` — Login `[AUTH-002]`
- **Auth**: None
- **Body**: `{ email, password }`
- **Success**: `200` `{ user }` + sets JWT cookie
- **Errors**: `INVALID_CREDENTIALS` (401), `ACCOUNT_SUSPENDED` (403)
- **Rate limit**: 10 attempts / 15 min per IP

### `POST /api/auth/logout` — Logout `[AUTH-003]`
- **Auth**: Required
- **Success**: `200` — clears JWT cookie

### `GET /api/auth/me` — Current user `[AUTH-004]`
- **Auth**: Required
- **Success**: `200` `{ user: { _id, name, email, role, status, mustChangePassword } }`

### `POST /api/auth/change-password` — Authenticated password change `[AUTH-009]`
- **Auth**: Required
- **Body**: `{ currentPassword, newPassword }` — newPassword 10–128 chars
- **Success**: `200`, sets `mustChangePassword=false`
- **Errors**: `INVALID_CREDENTIALS` (401 — wrong current), `INVALID_INPUT`
- **Side effects**: Updates Argon2 hash; all existing sessions remain valid (no session rotation in v1)

> [!IMPORTANT]
> `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` return `404`. These endpoints are **OUT OF SCOPE** for v1. `[AUTH-005]` `[AUTH-006]` `[D19]`

---

## 5. System / Config Endpoints

### `GET /api/health` — Readiness check
- **Auth**: None
- **Success**: `200` `{ status: "ok", timestamp, db: "connected" }`

### `GET /api/config` — Public app configuration
- **Auth**: None
- **Success**: `200` `{ currency, timezone, taxPercent }` — values from env `[D9]` `[D22]`

---

## 6. Restaurant Discovery (Public)

### `GET /api/restaurants` — List active restaurants
- **Auth**: None
- **Query**: `page`, `limit`, `cuisine` (CuisineTag id), `postalCode`, `search`
- **Success**: `200` paginated list of `ACTIVE` restaurants
- **Notes**: Search is sanitized DB text query `[D27]`; `postalCode` filters by `servicePostalCodes` `[D28]`

### `GET /api/restaurants/search` — Dedicated search
- **Auth**: None
- **Query**: `q` (required, max 100 chars), `page`, `limit`
- **Success**: `200` paginated matching restaurants and menu items
- **Notes**: Input escaped, queries validated indexes `[D27]`

### `GET /api/restaurants/:id` — Restaurant detail
- **Auth**: None
- **Success**: `200` restaurant object (excludes ownerId)
- **Errors**: `NOT_FOUND` (404)

### `GET /api/restaurants/:id/menu` — Restaurant menu
- **Auth**: None
- **Success**: `200` `{ categories: [...], items: [...] }` — only `isActive` categories and `isDeleted=false` items

---

## 7. File Upload

### `POST /api/uploads` — Upload image asset `[D20]`
- **Auth**: Required
- **Role**: Restaurant Owner, Admin
- **Content-Type**: `multipart/form-data`
- **Constraints**: JPEG / PNG / WebP validated by magic bytes, max 2 MB, random filename
- **Success**: `201` `{ url: "/uploads/<random-filename>.<ext>" }`
- **Errors**: `INVALID_FILE_TYPE` (400), `FILE_TOO_LARGE` (400)

---

## 8. Customer Profile & Addresses

### `GET /api/customer/profile` / `PUT /api/customer/profile`
- **Auth**: Required — Customer
- **Ownership**: `user._id === JWT sub`
- `PUT` body: `{ name, phone }` (email/role not updatable here)

### `GET /api/addresses` — List saved addresses
- **Auth**: Required — Customer

### `POST /api/addresses` — Create address
- **Auth**: Required — Customer
- **Limit**: Max 5 `[D22]`; returns `MAX_ADDRESSES_REACHED` if exceeded
- **Body**: `{ label, name, phone, addressLine1, addressLine2, city, state, postalCode, landmark }`

### `PUT /api/addresses/:id` — Update address
- **Auth**: Required — Customer — Ownership: `address.customerId === user._id`

### `DELETE /api/addresses/:id` — Delete address
- **Auth**: Required — Customer — Ownership: `address.customerId === user._id`

---

## 9. Cart `[D6]`

### `GET /api/cart` — Get active cart
- **Auth**: Required — Customer

### `POST /api/cart/items` — Add item
- **Auth**: Required — Customer
- **Body**: `{ menuItemId, quantity }` — quantity integer 1–20
- **Validation**: Cart max 30 items; item must exist, `isDeleted=false`, `isAvailable=true`; restaurant must be `ACTIVE`
- **Errors**: `CART_RESTAURANT_MISMATCH` (409), `CART_LIMIT_EXCEEDED` (400), `ITEM_UNAVAILABLE` (400)
- **Side effect**: If cart exists for a different restaurant, returns `CART_RESTAURANT_MISMATCH` with `{ existingRestaurantId }` for frontend confirmation flow `[D6]`

### `PATCH /api/cart/items/:id` — Update quantity
- **Auth**: Required — Customer — Ownership: cart belongs to customer
- **Body**: `{ quantity }` — integer 1–20

### `DELETE /api/cart/items/:id` — Remove item
- **Auth**: Required — Customer — Ownership

### `DELETE /api/cart` — Clear cart
- **Auth**: Required — Customer

---

## 10. Checkout & Quotes `[D9]` `[D12]` `[D24]`

### `POST /api/checkout/quote` — Server price quote
- **Auth**: Required — Customer
- **Body**: `{ orderType, deliveryAddressId? }`
- **Server validates**: Restaurant `ACTIVE` & `acceptingOrders=true`, operating hours in `APP_TIMEZONE`, all cart items `isAvailable=true` & `isDeleted=false`, delivery postal code in `servicePostalCodes` (if delivery), subtotal ≥ `minOrderAmount`
- **Computes** (all integers, minor units): `subtotal`, `deliveryFee` (0 for pickup), `tax = floor(subtotal * TAX_PERCENT / 100)`, `total = subtotal + deliveryFee + tax`
- **Success**: `200` `{ subtotal, deliveryFee, taxPercent, tax, total, currency }`
- **Errors**: `OUT_OF_SERVICE_AREA`, `MIN_ORDER_NOT_MET`, `ITEM_UNAVAILABLE`, `RESTAURANT_NOT_ELIGIBLE`

### `POST /api/checkout` — Place order `[CUS-008]` `[CUS-010]`
- **Auth**: Required — Customer
- **Headers**: `Idempotency-Key: <uuid>` — required `[D12]`
- **Body**: `{ orderType, deliveryAddressId?, paymentMethod }` — paymentMethod: `"online"` | `"cod"` | `"pay_at_pickup"`
- **Server performs** (in MongoDB transaction):
  - Same validations as quote
  - Recompute authoritative totals (client totals ignored `[D5]`)
  - Create Order snapshot
  - For `online`: create gateway order/session → return `PAYMENT_PENDING` + gateway tokens
  - For `cod`/`pay_at_pickup`: set status `PLACED`, paymentStatus `PENDING`
  - Clear cart
- **Idempotency**: Repeated `Idempotency-Key` returns same response `[D12]`
- **Success**: `201` `{ order, gatewayData? }`
- **Errors**: `IDEMPOTENCY_CONFLICT`, `RESTAURANT_NOT_ELIGIBLE`, `MIN_ORDER_NOT_MET`, `OUT_OF_SERVICE_AREA`

---

## 11. Orders

### `GET /api/orders` — Customer order history
- **Auth**: Required — Customer
- **Query**: `page`, `limit`, `status`
- **Ownership**: Only `order.customerId === user._id`

### `GET /api/orders/:id` — Order detail
- **Auth**: Required — Customer (own), Restaurant (own), Admin
- **Success**: `200` full order including `statusHistory`, payment status `[D23]`

### `POST /api/orders/:id/cancel` — Cancel order
- **Auth**: Required — Customer (own), Admin
- **Customer**: May cancel if status in `["PAYMENT_PENDING", "PLACED"]` `[D13]`
- **Admin**: May cancel any non-terminal order; `reason` required
- **Body**: `{ reason? }` — reason required for admin
- **Side effects**: If `paymentStatus === "COMPLETED"`, sets `paymentStatus = "REFUND_PENDING"`; sends notification; writes audit log

### `PATCH /api/orders/:id/status` — Advance order status (Restaurant) `[RES-005]` `[RES-006]`
- **Auth**: Required — Restaurant Owner
- **Ownership**: `order.restaurantId === user.restaurantId`
- **Body**: `{ status, reason? }` — `reason` required for `REJECTED`, `CANCELLED`
- **Validates**: State machine transition per `docs/15`
- **Errors**: `INVALID_STATE_TRANSITION` (409), `FORBIDDEN` (403)

---

## 12. Payments `[D11]` `[D24]` `[D25]`

### `POST /api/payments/webhook` — Provider webhook
- **Auth**: None (verified via raw-body HMAC signature `[D25]`)
- **Headers**: Provider-specific signature header (e.g., `X-Razorpay-Signature` or `Stripe-Signature`)
- **Content-Type**: `application/json` (raw body preserved for signature verification)
- **Processing**:
  1. Verify signature against `PAYMENT_WEBHOOK_SECRET`
  2. Check `providerEventId` uniqueness (idempotency)
  3. Validate event amount and currency match order snapshot
  4. On success event: transition `PAYMENT_PENDING → PLACED`, update Payment record
  5. On failure event: log failure, leave in `PAYMENT_PENDING` (expiry job handles cleanup)
- **Duplicates**: Return `200` without reprocessing `[D25]`
- **Success**: `200` (always respond quickly to acknowledge webhook)
- **Errors**: `INVALID_WEBHOOK_SIGNATURE` (400), `PAYMENT_AMOUNT_MISMATCH` (400)

### `POST /api/payments/verify` — Secondary payment verification `[D25]`
- **Auth**: Required — Customer
- **Body**: `{ orderId, providerPaymentId }`
- **Notes**: Secondary check only. A successful response here does NOT alone prove payment; definitive proof requires webhook. Returns current payment status.

---

## 13. Notifications `[D18]`

### `GET /api/notifications` — List notifications
- **Auth**: Required — Customer, Restaurant
- **Query**: `page`, `limit`, `isRead`
- **Ownership**: Only `notification.userId === user._id`

### `GET /api/notifications/unread-count` — Unread count
- **Auth**: Required — Customer, Restaurant
- **Success**: `200` `{ count: 5 }`

### `PATCH /api/notifications/:id/read` — Mark as read
- **Auth**: Required — Customer, Restaurant
- **Ownership**: `notification.userId === user._id`
- **Success**: `200`

---

## 14. Restaurant Management (Owner)

### `GET /api/restaurant/profile` — View own restaurant
- **Auth**: Required — Restaurant Owner

### `PUT /api/restaurant/profile` — Update own restaurant
- **Auth**: Required — Restaurant Owner
- **Body**: `{ name?, description?, logo?, banner?, contact?, address?, operatingHours?, servicePostalCodes?, deliveryFee?, minOrderAmount?, acceptingOrders?, cuisineCategories? }`
- **Validation**: `deliveryFee`, `minOrderAmount` must be non-negative integers `[D4]`; `operatingHours` in proper format evaluated in `APP_TIMEZONE` `[D10]`

### `GET /api/restaurant/orders` — Order inbox `[RES-004]`
- **Auth**: Required — Restaurant Owner
- **Query**: `page`, `limit`, `status` (can filter by order status)
- **Ownership**: Only orders for own restaurant

### Menu Categories

### `POST /api/menu-categories` — Create category
- **Auth**: Required — Restaurant Owner
- **Body**: `{ name, description?, sortOrder? }`

### `PUT /api/menu-categories/:id` — Update category
- **Auth**: Required — Restaurant Owner — Ownership: `category.restaurantId === user.restaurantId`

### `DELETE /api/menu-categories/:id` — Delete category
- **Auth**: Required — Restaurant Owner — Ownership

### Menu Items

### `POST /api/menu-items` — Create item
- **Auth**: Required — Restaurant Owner
- **Body**: `{ categoryId, name, description?, price, image?, diet, isAvailable, preparationTime }`
- **Validation**: `price` must be positive integer `[D4]`; `diet` enum `["veg", "non_veg"]` `[D7]`; `categoryId` must belong to same restaurant `[D7]`

### `GET /api/menu-items/:id` — Get item
- **Auth**: Required — Restaurant Owner

### `PUT /api/menu-items/:id` — Update item
- **Auth**: Required — Restaurant Owner — Ownership: `item.restaurantId === user.restaurantId`

### `DELETE /api/menu-items/:id` — Soft-delete item `[D26]`
- **Auth**: Required — Restaurant Owner — Ownership
- **Side effect**: Sets `isDeleted=true`. Does not remove from historical order snapshots.

---

## 15. Admin Suite `[D21]`

### `GET /api/admin/users` — List all users
- **Auth**: Required — Admin
- **Query**: `page`, `limit`, `role`, `status`, `search`

### `PATCH /api/admin/users/:id/status` — Toggle user status `[ADM-001]`
- **Auth**: Required — Admin
- **Body**: `{ status }` — enum `["ACTIVE", "SUSPENDED"]`
- **Side effect**: Writes audit log

### `GET /api/admin/restaurants` — List all restaurants
- **Auth**: Required — Admin
- **Query**: `page`, `limit`, `status`

### `POST /api/admin/restaurants` — Create restaurant + owner `[ADM-002]`
- **Auth**: Required — Admin
- **Body**: `{ restaurant: { name, ... }, owner: { name, email, phone, temporaryPassword } }`
- **Server**: Creates Restaurant (`status: "ACTIVE"`), creates User (`role: "restaurant"`, `mustChangePassword: true`), links via `ownerId`, runs in MongoDB transaction
- **Validation**: `temporaryPassword` must be 10–128 chars; must not be a default value
- **Success**: `201` `{ restaurant, owner: { _id, email, mustChangePassword } }`

### `PATCH /api/admin/restaurants/:id/status` — Toggle restaurant status `[ADM-002]`
- **Auth**: Required — Admin
- **Body**: `{ status }` — enum `["ACTIVE", "SUSPENDED"]`
- **Side effect**: Writes audit log

### `GET /api/admin/orders` — Platform order overview `[ADM-004]`
- **Auth**: Required — Admin
- **Query**: `page`, `limit`, `status`, `restaurantId`, `customerId`

### `POST /api/admin/orders/:id/cancel` — Cancel any non-terminal order `[ADM-004]`
- **Auth**: Required — Admin
- **Body**: `{ reason }` — required, non-empty string
- **Validates**: Order must not be in terminal state (`REJECTED`, `CANCELLED`, `EXPIRED`, `DELIVERED`, `COMPLETED`)
- **Side effects**: Set `REFUND_PENDING` if paid; notify customer; writes audit log

### `POST /api/admin/refunds` — Trigger full refund `[ADM-005]`
- **Auth**: Required — Admin
- **Body**: `{ orderId }`
- **Validates**: `order.paymentStatus === "REFUND_PENDING"`
- **Server**: Calls gateway refund API (idempotent — safe to retry), updates `paymentStatus → "REFUNDED"`, stores `refundId`, writes audit log, notifies customer
- **Success**: `200` `{ refundId, status: "REFUNDED" }`

### `GET /api/admin/categories` — List cuisine tags `[ADM-003]`
- **Auth**: Required — Admin

### `POST /api/admin/categories` — Create cuisine tag `[ADM-003]`
- **Auth**: Required — Admin
- **Body**: `{ name }`
- **Errors**: `INVALID_INPUT` (duplicate name)

### `GET /api/admin/dashboard` — Metrics `[ADM-006]`
- **Auth**: Required — Admin
- **Success**: `200` `{ totalOrders, ordersToday, revenue, activeRestaurants, pendingRefunds }`
