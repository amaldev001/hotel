# 24 — Traceability Matrix

This matrix maps every requirement ID to its implementation location and test coverage. Extend this matrix as features are implemented.

---

## 1. Authentication & Authorization

| Req ID | Requirement | Backend File(s) | Frontend File(s) | Test File(s) | Doc(s) |
|---|---|---|---|---|---|
| `AUTH-001` | Customer self-registration | `routes/auth.js`, `services/AuthService.js`, `models/User.js` | `pages/register.jsx` | `tests/auth/register.test.js` | `docs/10` |
| `AUTH-002` | User login + cookie | `routes/auth.js`, `services/AuthService.js` | `pages/login.jsx` | `tests/auth/login.test.js` | `docs/10` |
| `AUTH-003` | Logout & cookie clear | `routes/auth.js`, `services/AuthService.js` | `hooks/useAuth.js` | `tests/auth/logout.test.js` | `docs/10` |
| `AUTH-004` | Current user retrieval | `routes/auth.js`, `middleware/authenticate.js` | `context/AuthContext.jsx` | `tests/auth/me.test.js` | `docs/10` |
| `AUTH-005` | ~~Password recovery~~ | **OUT OF SCOPE** `[D19]` | — | `tests/auth/scope.test.js` (404 check) | `docs/10` |
| `AUTH-006` | ~~Password reset~~ | **OUT OF SCOPE** `[D19]` | — | `tests/auth/scope.test.js` (404 check) | `docs/10` |
| `AUTH-007` | Role-based authorization | `middleware/authorize.js` | Route guards (UX only) | `tests/auth/rbac.test.js` | `docs/04`, `docs/10` |
| `AUTH-008` | Account status enforcement | `middleware/authorize.js`, `middleware/authenticate.js` | — | `tests/auth/status.test.js` | `docs/10` |
| `AUTH-009` | Authenticated password change | `routes/auth.js`, `services/AuthService.js` | `pages/change-password.jsx` | `tests/auth/changePassword.test.js` | `docs/10` |

---

## 2. Customer & Discovery

| Req ID | Requirement | Backend File(s) | Frontend File(s) | Test File(s) | Doc(s) |
|---|---|---|---|---|---|
| `CUS-001` | Profile & address management (max 5) | `services/UserService.js`, `models/Address.js` | `pages/customer/profile.jsx`, `pages/customer/addresses.jsx` | `tests/address/address.test.js` | `docs/06`, `docs/07` |
| `CUS-002` | Restaurant listing & browsing | `routes/restaurants.js`, `services/RestaurantService.js` | `pages/restaurants.jsx` | `tests/restaurant/list.test.js` | `docs/07` |
| `CUS-003` | Database text search | `routes/restaurants.js`, `services/RestaurantService.js` | `pages/search.jsx`, `components/SearchBar.jsx` | `tests/restaurant/search.test.js` | `docs/07`, `docs/31` |
| `CUS-004` | Restaurant filtering (cuisine, postal) | `services/RestaurantService.js` | `components/Filters.jsx` | `tests/restaurant/filter.test.js` | `docs/07`, `docs/11` |
| `CUS-005` | Menu browsing | `routes/restaurants.js`, `services/MenuService.js` | `pages/restaurants/[id].jsx` | `tests/menu/browse.test.js` | `docs/07`, `docs/12` |
| `CUS-006` | Cart management (30 items, 1 restaurant) | `services/CartService.js`, `models/Cart.js` | `pages/customer/cart.jsx` | `tests/cart/cart.test.js` | `docs/13` |
| `CUS-007` | Server checkout quote | `services/CheckoutService.js` | `pages/customer/checkout.jsx` | `tests/checkout/quote.test.js` | `docs/13` |
| `CUS-008` | Idempotent order placement | `services/CheckoutService.js`, `models/Order.js` | `pages/customer/checkout.jsx` | `tests/checkout/place.test.js` | `docs/13` |
| `CUS-009` | Online payment checkout | `services/PaymentService.js`, `integrations/payment/` | `pages/customer/checkout/payment-status.jsx` | `tests/payment/online.test.js` | `docs/14` |
| `CUS-010` | COD / Pay-at-Pickup | `services/CheckoutService.js` | `components/PaymentMethodSelector.jsx` | `tests/checkout/cod.test.js` | `docs/14` |
| `CUS-011` | Order history | `routes/orders.js`, `services/OrderService.js` | `pages/customer/orders.jsx` | `tests/order/history.test.js` | `docs/07` |
| `CUS-012` | Order tracking timeline (15s poll) | `routes/orders.js` | `pages/customer/orders/[id].jsx`, `hooks/useOrderPolling.js` | `tests/order/tracking.test.js` | `docs/15`, `docs/19` |
| `CUS-013` | Customer order cancellation | `services/OrderService.js` | `components/OrderActions.jsx` | `tests/order/cancel.test.js` | `docs/15` |
| `CUS-014` | In-app notifications | `services/NotificationService.js` | `pages/customer/notifications.jsx` | `tests/notification/list.test.js` | `docs/16` |

---

## 3. Restaurant Management

| Req ID | Requirement | Backend File(s) | Frontend File(s) | Test File(s) | Doc(s) |
|---|---|---|---|---|---|
| `RES-001` | Restaurant profile & settings | `services/RestaurantService.js`, `models/Restaurant.js` | `pages/restaurant/profile.jsx`, `pages/restaurant/settings.jsx` | `tests/restaurant/profile.test.js` | `docs/11` |
| `RES-002` | Menu category management | `services/MenuService.js`, `models/MenuCategory.js` | `pages/restaurant/categories.jsx` | `tests/menu/categories.test.js` | `docs/12` |
| `RES-003` | Menu item management + upload | `services/MenuService.js`, `integrations/storage/`, `models/MenuItem.js` | `pages/restaurant/menu.jsx` | `tests/menu/items.test.js`, `tests/upload/upload.test.js` | `docs/12` |
| `RES-004` | Restaurant order inbox + filters | `routes/orders.js`, `services/OrderService.js` | `pages/restaurant/orders.jsx` | `tests/order/inbox.test.js` | `docs/07` |
| `RES-005` | Order status advancement | `services/OrderService.js` | `components/OrderStatusControls.jsx` | `tests/order/transitions.test.js` | `docs/15` |
| `RES-006` | Order rejection / cancellation (reason required) | `services/OrderService.js` | `components/RejectionDialog.jsx` | `tests/order/reject.test.js` | `docs/15` |
| `RES-007` | Historical order inspection | `routes/orders.js` | `pages/restaurant/orders.jsx` | `tests/order/history.test.js` | `docs/07` |
| `RES-008` | Restaurant in-app notifications | `services/NotificationService.js` | `pages/restaurant/notifications.jsx` | `tests/notification/restaurant.test.js` | `docs/16` |

---

## 4. Admin Management

| Req ID | Requirement | Backend File(s) | Frontend File(s) | Test File(s) | Doc(s) |
|---|---|---|---|---|---|
| `ADM-001` | User management (activate/suspend) | `services/AdminService.js`, `routes/admin.js` | `pages/admin/users.jsx` | `tests/admin/users.test.js` | `docs/04`, `docs/07` |
| `ADM-002` | Restaurant + owner creation & status toggle | `services/AdminService.js`, `routes/admin.js` | `pages/admin/restaurants.jsx`, `pages/admin/restaurants/new.jsx` | `tests/admin/restaurants.test.js` | `docs/10`, `docs/11` |
| `ADM-003` | Platform cuisine tag management | `routes/admin.js`, `services/MenuService.js`, `models/CuisineTag.js` | `pages/admin/categories.jsx` | `tests/admin/cuisineTags.test.js` | `docs/12` |
| `ADM-004` | Order oversight & admin cancellation | `services/OrderService.js`, `services/AdminService.js` | `pages/admin/orders.jsx` | `tests/admin/orderCancel.test.js` | `docs/15` |
| `ADM-005` | Gateway refund processing | `services/PaymentService.js`, `services/AdminService.js` | `pages/admin/orders/[id].jsx` | `tests/admin/refund.test.js` | `docs/14` |
| `ADM-006` | Admin metrics dashboard | `routes/admin.js`, `services/AdminService.js` | `pages/admin/index.jsx` | `tests/admin/dashboard.test.js` | `docs/07` |

---

## 5. Non-Functional Requirements

| Req ID | Requirement | Backend File(s) | Frontend File(s) | Test File(s) | Doc(s) |
|---|---|---|---|---|---|
| `NFR-001` | Responsive UI | — | `styles/`, layout components | Playwright E2E viewport tests | `docs/19` |
| `NFR-002` | Secure authentication controls | `middleware/authenticate.js`, `middleware/rateLimit.js` | — | `tests/auth/security.test.js` | `docs/10`, `docs/18` |
| `NFR-003` | Server-side authorization | `middleware/authorize.js` | — | `tests/auth/rbac.test.js` | `docs/04`, `docs/10` |
| `NFR-004` | Input validation (Zod) | `validators/` | Form components | All API integration tests | `docs/17` |
| `NFR-005` | Validated env config, no secret fallbacks | `config/env.js` | — | `tests/config/env.test.js` | `docs/21`, `docs/23` |
| `NFR-006` | Standardized error format | `middleware/errorHandler.js` | Error boundary | All API tests | `docs/17` |
| `NFR-007` | Database indexes | `models/` (index declarations) | — | `tests/db/indexes.test.js` | `docs/31` |
| `NFR-008` | Integer currency / no floats | `utils/money.js`, all service files | — | `tests/checkout/money.test.js` | `docs/13`, `docs/06` |
| `NFR-009` | Audit logging | `services/AuditService.js`, `models/AuditLog.js` | — | `tests/audit/auditLog.test.js` | `docs/06` |
| `NFR-010` | Idempotency enforcement | `services/CheckoutService.js`, `services/PaymentService.js` | — | `tests/checkout/idempotency.test.js`, `tests/payment/webhook.test.js` | `docs/13`, `docs/14` |
| `NFR-011` | File upload validation (magic bytes) | `middleware/upload.js`, `integrations/storage/` | Upload component | `tests/upload/upload.test.js` | `docs/12`, `docs/18` |
| `NFR-012` | MongoDB Replica Set (transactions) | `config/db.js`, `services/CheckoutService.js` | — | `tests/db/transactions.test.js` | `docs/21`, `docs/09` |
