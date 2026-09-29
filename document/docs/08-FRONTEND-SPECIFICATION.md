# 08 — Frontend Specification

## 1. Public Routes (Unauthenticated Accessible)

| Path | Component / Page | States Required |
|---|---|---|
| `/` | Landing / home page | Loading, content |
| `/login` | Login form | Loading, validation error, server error, rate-limited |
| `/register` | Customer registration form | Loading, validation error, server error |
| `/restaurants` | Restaurant discovery list | Loading, empty (no results), error, content |
| `/restaurants/:id` | Restaurant detail + menu | Loading, not found, error, content |
| `/search` | Search results | Loading, empty, error, content |
| `/privacy` | Privacy Policy (static) | Content |
| `/terms` | Terms of Service (static) | Content |
| `/refund-policy` | Refund Policy (static) | Content |
| `*` (404) | 404 Not Found page | Content |

---

## 2. Customer Routes (Authenticated, role=customer)

| Path | Component / Page | States Required |
|---|---|---|
| `/customer` | Customer dashboard / home | Loading, content |
| `/customer/profile` | Profile view & edit form | Loading, validation error, success, server error |
| `/customer/change-password` | Change password form `[D19]` | Loading, validation error, success, forbidden (if `mustChangePassword` not applicable) |
| `/customer/addresses` | Saved address list & management | Loading, empty, error, limit-reached |
| `/customer/cart` | Cart view | Loading, empty, mismatch modal, error |
| `/customer/checkout` | Checkout form (orderType, address, payment method) | Loading, validation error, quote error, error |
| `/customer/checkout/payment-status` | Post-payment result page `[D24]` | Loading (polling), success, failure, expired |
| `/customer/orders` | Order history list | Loading, empty, error |
| `/customer/orders/:id` | Order detail + status timeline | Loading, not found, error, polling (active orders, 15s, tab-visible only `[D15]`) |
| `/customer/notifications` | In-app notification list | Loading, empty, error `[D18]` |

> [!IMPORTANT]
> The route `/customer/restaurants` (duplicate of public `/restaurants`) is **removed**. Customers use the public discovery routes.

---

## 3. Restaurant Owner Routes (Authenticated, role=restaurant)

| Path | Component / Page | States Required |
|---|---|---|
| `/restaurant` | Restaurant dashboard | Loading, content |
| `/restaurant/profile` | Restaurant profile & settings | Loading, validation error, success |
| `/restaurant/change-password` | Change password (required if `mustChangePassword=true`) | Loading, validation error, success |
| `/restaurant/categories` | Menu category management | Loading, empty, error |
| `/restaurant/menu` | Menu item management | Loading, empty, error |
| `/restaurant/orders` | Order inbox with status filters | Loading, empty, error |
| `/restaurant/orders/:id` | Order detail & status controls | Loading, not found, error |
| `/restaurant/settings` | Operating hours & operational settings | Loading, validation error, success |
| `/restaurant/notifications` | In-app notifications | Loading, empty, error `[D18]` |

---

## 4. Admin Routes (Authenticated, role=admin)

| Path | Component / Page | States Required |
|---|---|---|
| `/admin` | Admin dashboard metrics | Loading, error |
| `/admin/users` | User management table | Loading, empty, error |
| `/admin/users/:id` | User detail & status control | Loading, not found, error |
| `/admin/restaurants` | Restaurant management table | Loading, empty, error |
| `/admin/restaurants/new` | Create restaurant + owner form | Loading, validation error, success |
| `/admin/restaurants/:id` | Restaurant detail & status control | Loading, not found, error |
| `/admin/orders` | Platform order oversight | Loading, empty, error |
| `/admin/orders/:id` | Order detail with cancel & refund actions | Loading, not found, error |
| `/admin/categories` | Cuisine tag management | Loading, empty, error |
| `/admin/change-password` | Admin password change | Loading, validation error, success |

---

## 5. Shared UI State Requirements

Every route with data fetching must handle ALL of the following states:

| State | Description |
|---|---|
| **Loading** | Spinner or skeleton while API request is in flight |
| **Empty** | Friendly empty-state illustration and call-to-action when list is empty |
| **Success** | Rendered data content |
| **Validation Error** | Inline field-level messages from Zod schema for form submissions |
| **Server Error** | Safe error message from API response (`error.message`); no stack trace exposed |
| **Forbidden** | Friendly 403 page redirecting to appropriate dashboard |
| **Authentication Expired** | Detect `401` response, clear local state, redirect to `/login` |
| **Not Found** | Friendly 404 inline or dedicated `/404` page |
| **Network Error** | Offline or connection failure message with retry button |

---

## 6. Key Component Requirements

### 6.1 Customer Components
- **Restaurant Card**: Name, logo, cuisine tags, delivery fee, min order, estimated delivery time, ACTIVE badge.
- **Search Bar**: Controlled input with debounced submission.
- **Menu Category Tabs**: Horizontal scrollable tab navigation.
- **Menu Item Card**: Name, description, diet indicator (🟢 veg / 🔴 non-veg), price (formatted from minor units), preparation time, availability badge, add-to-cart button.
- **Cart Sidebar / Summary**: Item list, quantity controls (1–20), subtotal, delivery fee, tax, total — all values from server quote.
- **Address Selector**: List saved addresses with "Add New" CTA; max 5 badge warning.
- **Checkout Summary**: Renders quote response fields; client does NOT compute total.
- **Order Type Selector**: Delivery / Pickup radio.
- **Payment Method Selector**: Online / COD / Pay at Pickup.
- **Order Timeline**: `statusHistory` array rendered as a vertical stepper.
- **Payment Result Page**: Polls `GET /api/orders/:id` after returning from provider checkout; shows PLACED, PAYMENT_FAILED, or EXPIRED state.

### 6.2 Restaurant Components
- **Order Queue Card**: Order ID, items, total, orderType, status badge, action buttons.
- **Order Status Controls**: Contextual buttons based on current status and allowed transitions.
- **Rejection / Cancellation Dialog**: Requires reason text input before confirming.
- **Menu Item Form**: All fields including diet radio and image uploader.
- **Availability Toggle**: `isAvailable` switch per menu item.
- **Operating Hours Editor**: Day-by-day open/close time pickers.
- **acceptingOrders Toggle**: Global on/off switch for order intake.

### 6.3 Admin Components
- **Metric Cards**: Total orders, revenue (formatted from minor units), active restaurants, pending refunds.
- **User Management Table**: Columns for name, email, role, status; action to toggle status.
- **Restaurant Creation Form**: Two-panel form for restaurant details + owner account with temporary password input.
- **Refund Trigger Button**: Confirmation dialog before calling `POST /api/admin/refunds`.
- **Order Cancel Form**: Mandatory reason text area before admin cancellation.

---

## 7. Security Rules

1. **No secrets in React source code** — API keys, payment secrets, JWT signing keys must never appear in frontend code or environment files committed to source control.
2. **Frontend guards are UX only** — Route guards (role checks, redirect logic) are convenience; all real access control is enforced by the backend API.
3. **Render API responses as untrusted input** — Always escape user-provided text before rendering (order notes, restaurant descriptions, etc.) `[D30]`.
4. **Cookie management is automatic** — Never manually read, write, or parse the JWT cookie from JavaScript. The `httpOnly` flag prevents this by design `[D19]`.
5. **Active tab polling only** — `GET /api/orders/:id` polling every 15 seconds must be gated by `document.visibilityState === "visible"` `[D15]`.

---

## 8. Implementation & Test Suite Status

- **Technology Stack**: React 18, Vite, Tailwind CSS, Lucide icons, React Router v6, Axios (`withCredentials: true`).
- **State Management**: `AuthContext` (loads `/api/config` and `/api/auth/me`), `CartContext` (server-synchronised cart state & mismatch handling), `ToastContext` (app-wide notifications).
- **Guards & Routing**: Protected routes enforce authentication, role checks, and `mustChangePassword` redirection to `/change-password`.
- **Formatting**: `formatMoney` helper formats integer minor units into currency strings using `Intl.NumberFormat`.
- **Testing**: Vitest + `@testing-library/react` suite verifying:
  - `moneyFormatting.test.js`: Minor currency unit formatting and edge cases.
  - `routeGuards.test.jsx`: Authentication, role enforcement, and password change redirects.
  - `checkoutSafety.test.js`: Client-submitted price stripping and integer monetary constraints.
  - `emptyErrorStates.test.jsx`: Distinct loading (skeleton), empty, and error rendering.
  - `modalFocus.test.jsx`: Modal focus trap, dialog role, and Escape key handling.
  - `cartMismatch.test.js`: Cross-restaurant cart items prompt replace modal.

