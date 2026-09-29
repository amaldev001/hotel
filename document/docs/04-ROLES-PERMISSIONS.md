# 04 — Roles & Permissions Matrix

This document defines the system roles, operational permissions, authorization policy rules, and the complete REST endpoint access matrix for the platform.

---

## 1. System Roles `[D1]`

1. **Public / Unauthenticated**: Unauthenticated visitors browsing public discovery routes.
2. **Customer**: Self-registered users who manage profiles, addresses, carts, and place/track personal food orders (`[D2]`).
3. **Restaurant Owner**: Admin-provisioned users who operate exactly one assigned restaurant (`[D3]`). Staff accounts are not supported (`[D3]`).
4. **Administrator**: System administrators who manage users, create restaurants, oversee platform orders, process refunds, and maintain platform categories (`[D21]`). Administrators cannot place food orders (`[D21]`).

---

## 2. Capability Matrix

| Capability | Public | Customer | Restaurant Owner | Admin | Policy / Ownership Constraint |
|---|---|---|---|---|---|
| Register Account (`AUTH-001`) | Yes | No | No | No | Self-registration creates `customer` role only (`[D2]`). |
| Login / Logout (`AUTH-002`, `003`) | Yes | Yes | Yes | Yes | Valid credentials and `ACTIVE` status required. |
| View Own Profile / Change Password | No | Yes | Yes | Yes | Users can view and update only their own credentials (`[D19]`). |
| Saved Addresses (`CUS-001`) | No | Own | No | No | Customers manage up to 5 saved addresses (`[D22]`). |
| Browse / Search Restaurants | Yes | Yes | Yes | Yes | Public read access to `ACTIVE` restaurants (`[D27]`). |
| Browse Restaurant Menu | Yes | Yes | Yes | Yes | Public read access to active categories & non-deleted items. |
| Manage Cart (`CUS-006`) | No | Own | No | No | Customer manages 1 cart; max 30 items, single restaurant (`[D6]`). |
| Calculate Checkout Quote (`CUS-007`)| No | Own | No | No | Server computes authoritative totals (`[D9]`). |
| Place Orders (`CUS-008`, `010`) | No | Own | No | No | Customers place orders; Admin/Restaurant cannot place orders (`[D21]`). |
| View Customer Orders (`CUS-011`) | No | Own | No | No | Customers access only their own order history (`[D8]`). |
| Cancel Order (`CUS-013`, `RES-006`) | No | Own (early) | Own (pre-complete) | Any | Cancel rules per state machine; reason required for restaurant/admin (`[D13]`). |
| View Restaurant Orders (`RES-004`) | No | No | Own | Yes | Restaurant owners view only their restaurant's orders. |
| Advance Order Status (`RES-005`) | No | No | Own orders | No | Restaurant staff/owner advances order status (`[D8]`). |
| Manage Restaurant Profile (`RES-001`)| No | No | Own | Yes | Restaurant owner manages own parameters; Admin creates/manages all. |
| Manage Menu & Categories (`RES-002`)| No | No | Own | Yes | Owner manages own menu; Admin manages platform tags (`[D7]`). |
| User Status Management (`ADM-001`) | No | No | No | Yes | Admin can activate or suspend any user account (`[D21]`). |
| Restaurant Lifecycle (`ADM-002`) | No | No | No | Yes | Admin creates restaurants + owner account; toggles `ACTIVE`/`SUSPENDED` (`[D2]`). |
| Process Gateway Refunds (`ADM-005`) | No | No | No | Yes | Admin issues full refunds via gateway API (`[D14]`, `[D21]`). |
| View Financial Data (`DEC-023`) | No | Own | Own | Yes (Status only) | Admin views payment status and refund state; NEVER raw card data (`[D21]`, `[D23]`). |

---

## 3. Mandatory Authorization Evaluation Algorithm

Every protected HTTP request executed by the backend must pass through the following 5-step authorization evaluation sequence:

1. **Authentication Check**: Verify JWT signature from `httpOnly` cookie. Reject missing/invalid tokens with `401 Unauthorized`.
2. **Account Status Check**: Verify `user.status === "ACTIVE"`. Reject `SUSPENDED` users with `403 Forbidden` (`ACCOUNT_SUSPENDED`).
3. **Role Validation**: Match user `role` against route permission requirements. Reject unauthorized roles with `403 Forbidden`.
4. **Resource Ownership Check**: Verify that target resource ID (e.g. cart, order, address, restaurant) matches user ownership (`userId === resource.customerId` or `userId === restaurant.ownerId`).
5. **Operational Permission Check**: Validate action against state machine rules or business logic constraints.

---

## 4. Endpoint Access Matrix

| HTTP Method | Endpoint Path | Public | Customer | Restaurant | Admin | Resource Ownership Rule |
|---|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | Yes | No | No | No | Unauthenticated self-registration (`[D2]`). |
| `POST` | `/api/auth/login` | Yes | Yes | Yes | Yes | Unauthenticated or authenticated credentials check. |
| `POST` | `/api/auth/logout` | No | Yes | Yes | Yes | Clears session cookie for authenticated user. |
| `GET` | `/api/auth/me` | No | Yes | Yes | Yes | Returns authenticated user's profile. |
| `POST` | `/api/auth/change-password` | No | Yes | Yes | Yes | Authenticated user changes own password (`[D19]`). |
| `GET` | `/api/config` | Yes | Yes | Yes | Yes | Returns public app configuration (`APP_TIMEZONE`, `CURRENCY`). |
| `GET` | `/api/health` | Yes | Yes | Yes | Yes | System health & readiness indicator. |
| `GET` | `/api/restaurants` | Yes | Yes | Yes | Yes | List active restaurants (`[D8]`). |
| `GET` | `/api/search/items` | Yes | Yes | Yes | Yes | Search active menu items (`[D27]`). |
| `GET` | `/api/restaurants/:id` | Yes | Yes | Yes | Yes | Public details of active restaurant. |
| `GET` | `/api/restaurants/:id/menu` | Yes | Yes | Yes | Yes | Public categories & items of active restaurant. |
| `POST` | `/api/uploads/image` | No | No | Yes | Yes | Upload image asset (magic byte check, max 2 MB, `[D20]`). |
| `GET` | `/api/profile` | No | Yes | Yes | Yes | Authenticated user views own profile. |
| `PUT` | `/api/profile` | No | Yes | Yes | Yes | Authenticated user updates own profile. |
| `GET` | `/api/profile/addresses` | No | Yes | No | No | Customer views own saved addresses (`[D22]`). |
| `POST` | `/api/profile/addresses` | No | Yes | No | No | Customer creates saved address (max 5, `[D22]`). |
| `PUT` | `/api/profile/addresses/:id` | No | Yes | No | No | Customer updates own address (`address.customerId === user._id`). |
| `DELETE` | `/api/profile/addresses/:id` | No | Yes | No | No | Customer deletes own address (`address.customerId === user._id`). |
| `GET` | `/api/cart` | No | Yes | No | No | Customer views own active cart (`[D6]`). |
| `POST` | `/api/cart/items` | No | Yes | No | No | Customer adds item to own cart (`[D6]`). |
| `PATCH` | `/api/cart/items/:id` | No | Yes | No | No | Customer updates quantity of item in own cart. |
| `DELETE` | `/api/cart/items/:id` | No | Yes | No | No | Customer removes item from own cart. |
| `DELETE` | `/api/cart` | No | Yes | No | No | Customer clears own cart. |
| `POST` | `/api/checkout/quote` | No | Yes | No | No | Customer requests price quote for own cart (`[D9]`). |
| `POST` | `/api/checkout` | No | Yes | No | No | Customer places order (`Idempotency-Key` required, `[D11]`, `[D12]`). |
| `GET` | `/api/orders` | No | Yes | No | No | Customer lists own orders (`order.customerId === user._id`). |
| `GET` | `/api/orders/:id` | No | Yes | Own | Yes | Customer (own), Restaurant (own order), or Admin. |
| `POST` | `/api/orders/:id/cancel` | No | Yes | Own | Yes | Cancel order per state machine rules (`[D13]`). |
| `POST` | `/api/payments/webhook` | Yes | No | No | No | Provider webhook (verified by raw signature, `[D25]`). |
| `POST` | `/api/payments/verify` | No | Yes | No | No | Secondary payment verification check (`[D25]`). |
| `GET` | `/api/notifications` | No | Yes | Yes | No | Customer or Restaurant lists own in-app notifications (`[D18]`). |
| `PATCH` | `/api/notifications/:id/read`| No | Yes | Yes | No | Mark notification as read (`notification.userId === user._id`). |
| `GET` | `/api/notifications/unread-count`| No | Yes | Yes | No | Get count of unread notifications. |
| `GET` | `/api/restaurant/profile` | No | No | Own | Yes | Restaurant owner views own restaurant profile. |
| `PUT` | `/api/restaurant/profile` | No | No | Own | Yes | Restaurant owner updates own operational parameters (`[D9]`, `[D10]`). |
| `GET` | `/api/restaurant/orders` | No | No | Own | Yes | Restaurant owner views inbox for own restaurant (`[D8]`). |
| `PATCH` | `/api/orders/:id/status` | No | No | Own | No | Restaurant owner advances state for own order (`[D8]`, `[D15]`). |
| `GET` | `/api/restaurant/categories` | No | No | Own | Yes | Get categories for own restaurant (`[D7]`). |
| `POST` | `/api/restaurant/categories` | No | No | Own | Yes | Create category for own restaurant (`[D7]`). |
| `PUT` | `/api/restaurant/categories/:id` | No | No | Own | Yes | Update category for own restaurant. |
| `DELETE` | `/api/restaurant/categories/:id` | No | No | Own | Yes | Delete category for own restaurant. |
| `GET` | `/api/restaurant/items` | No | No | Own | Yes | Get items for own restaurant (`[D7]`). |
| `POST` | `/api/restaurant/items` | No | No | Own | Yes | Create menu item for own restaurant (`[D7]`). |
| `PUT` | `/api/restaurant/items/:id` | No | No | Own | Yes | Update menu item for own restaurant (`[D7]`). |
| `PATCH` | `/api/restaurant/items/:id/availability` | No | No | Own | Yes | Quick toggle item availability for own restaurant (`[D7]`). |
| `DELETE` | `/api/restaurant/items/:id` | No | No | Own | Yes | Soft-delete menu item (`isDeleted: true`, `[D26]`). |
| `GET` | `/api/admin/users` | No | No | No | Yes | Admin lists all users (`[D21]`). |
| `PATCH` | `/api/admin/users/:id/status`| No | No | No | Yes | Admin activates or suspends user status (`[D21]`). |
| `GET` | `/api/admin/restaurants` | No | No | No | Yes | Admin lists all restaurants (`[D21]`). |
| `POST` | `/api/admin/restaurants` | No | No | No | Yes | Admin provisions restaurant + owner account (`[D2]`, `[D3]`). |
| `PATCH` | `/api/admin/restaurants/:id/status`| No | No | No | Yes | Admin toggles restaurant status `ACTIVE` <-> `SUSPENDED` (`[D2]`). |
| `GET` | `/api/admin/orders` | No | No | No | Yes | Admin monitors platform orders (`[D21]`). |
| `POST` | `/api/admin/orders/:id/cancel`| No | No | No | Yes | Admin cancels non-terminal order with reason (`[D13]`, `[D21]`). |
| `POST` | `/api/admin/refunds` | No | No | No | Yes | Admin triggers full refund via gateway API (`[D14]`, `[D16]`, `[D21]`). |
| `GET` | `/api/admin/categories` | No | No | No | Yes | Admin lists global cuisine categories (`ADM-003`). |
| `POST` | `/api/admin/categories` | No | No | No | Yes | Admin creates global cuisine category (`ADM-003`). |
| `GET` | `/api/admin/dashboard` | No | No | No | Yes | Admin views platform performance dashboard (`ADM-006`). |
