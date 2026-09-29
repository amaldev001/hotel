# 11 — Restaurant Management

## 1. Restaurant Lifecycle `[D3]`

Restaurant status follows a two-state lifecycle managed **exclusively by Admin**. There is no approval workflow, no PENDING state, and no self-approval by the restaurant owner.

```
ACTIVE  <──────────────────────────────────────────────>  SUSPENDED
         Admin: POST /api/admin/restaurants (creates ACTIVE)
         Admin: PATCH /api/admin/restaurants/:id/status
```

| Status | Meaning |
|---|---|
| `ACTIVE` | Restaurant is visible to customers and can receive orders (subject to `acceptingOrders` and operating hours). Public list/detail endpoints return ONLY public fields (omitting owner email, owner phone, and internal flags). |
| `SUSPENDED` | Restaurant hidden from discovery (returns HTTP 404 to public requests); no new orders accepted; owner access blocked for order management. |

---

## 2. Creation — Admin-Only `[D2]` `[D3]`

Admin creates a restaurant via `POST /api/admin/restaurants` in a single atomic operation:
1. Restaurant record created (`status: "ACTIVE"`).
2. Owner user account created simultaneously (`role: "restaurant"`, `mustChangePassword: true`).
3. `restaurant.ownerId` links to the new user — 1-to-1, enforced by unique index.
4. Admin provides a temporary password (10–128 chars, no hardcoded default allowed).
5. Operation runs in a MongoDB transaction. `[NFR-012]`

---

## 3. Restaurant Profile Fields

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, max 100 chars |
| `description` | String | Optional, max 500 chars |
| `logo` | String | Asset path (local volume), validated upload `[D20]` |
| `banner` | String | Asset path (local volume), validated upload `[D20]` |
| `cuisineCategories` | `[ObjectId]` | References admin-managed `CuisineTag` list `[ADM-003]` |
| `contact.phone` | String | Optional |
| `contact.email` | String | Optional |
| `address.*` | Object | Restaurant physical location |
| `servicePostalCodes` | `[String]` | Array of postal codes eligible for delivery `[D28]` |
| `deliveryFee` | Number | Non-negative integer, minor units `[D4]` `[D9]` |
| `minOrderAmount` | Number | Non-negative integer, minor units `[D4]` `[D9]` |
| `acceptingOrders` | Boolean | Manual toggle — overrides operating hours `[D17]` |
| `operatingHours` | Object | Day-by-day schedule — see §4 `[D10]` |
| `status` | String | `ACTIVE` / `SUSPENDED` — admin-managed only `[D3]` |

---

## 4. Operating Hours Format `[D10]` `[D17]` `[D22]`

Operating hours are stored as a named-day object, evaluated in `APP_TIMEZONE` at request time:

```json
{
  "monday":    { "open": "09:00", "close": "22:00", "isOpen": true },
  "tuesday":   { "open": "09:00", "close": "22:00", "isOpen": true },
  "wednesday": { "open": "09:00", "close": "22:00", "isOpen": true },
  "thursday":  { "open": "09:00", "close": "22:00", "isOpen": true },
  "friday":    { "open": "09:00", "close": "23:00", "isOpen": true },
  "saturday":  { "open": "10:00", "close": "23:00", "isOpen": true },
  "sunday":    { "open": "10:00", "close": "20:00", "isOpen": false }
}
```

- Times are `HH:MM` in 24-hour format.
- `isOpen: false` means the restaurant does not accept orders on that day regardless of `open`/`close` values.
- Evaluation: the current day and time is derived using `APP_TIMEZONE` environment variable. `[D22]`
- Holiday exceptions are **out of scope for v1**.
- `acceptingOrders: false` overrides operating hours — the restaurant will not receive orders even if within hours.

---

## 5. Order Eligibility Check (Checkout & Quote)

Before accepting an order, the server evaluates ALL of the following:

1. `restaurant.status === "ACTIVE"`
2. `restaurant.acceptingOrders === true`
3. Current time in `APP_TIMEZONE` is within operating hours for the current day
4. For delivery orders: customer `deliveryAddress.postalCode` is in `restaurant.servicePostalCodes` `[D28]`
5. `order.pricing.subtotal ≥ restaurant.minOrderAmount` `[D9]`

---

## 6. Service Postal Code Delivery Restriction `[D28]`

```text
servicePostalCodes: ["10001", "10002", "10003"]

On checkout or quote (delivery orders only):
  if (deliveryAddress.postalCode NOT IN restaurant.servicePostalCodes)
    → 400 OUT_OF_SERVICE_AREA
```

---

## 7. Ownership Rules

| Operation | Allowed Actor |
|---|---|
| Create restaurant | Admin only (`[D2]`) |
| Update restaurant profile | Owning restaurant owner, Admin |
| Toggle `acceptingOrders` | Owning restaurant owner |
| Toggle restaurant `status` | Admin only |
| View restaurant orders | Owning restaurant owner, Admin |

---

## 8. V1 Limitations (Out of Scope)

Per `[D3]` / `[D20]`:
- No multiple branches per restaurant.
- No transfer of restaurant ownership.
- No restaurant staff accounts below the owner level.
- No holiday / date-specific exception schedules.
- No geographic radius-based service area (postal code list only).

---

## 9. Implementation Verification

- **Admin Provisioning**: `POST /api/admin/restaurants` executes in a MongoDB transaction, atomically creating the restaurant record and owner user (`role: "restaurant"`, `mustChangePassword: true`) with temporary password validation.
- **Tenant Isolation**: Backend tests verify restaurant A cannot view, update, or delete restaurant B's menu, orders, or profile settings.
- **Order Eligibility**: Checkout & quote services evaluate restaurant status (`ACTIVE`), manual toggle (`acceptingOrders`), operating hours in `APP_TIMEZONE`, service postal code eligibility (`OUT_OF_SERVICE_AREA`), and minimum order amount (`MIN_ORDER_NOT_MET`).

