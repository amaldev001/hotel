# 19 — UI/UX Specification

## 1. Design Principles

- **Responsive**: Works correctly on mobile (≥320px), tablet, and desktop viewports.
- **Accessible**: Labels for all form controls, keyboard navigation, visible focus indicators, semantic HTML5 elements, sufficient color contrast (WCAG AA minimum), meaningful error messages.
- **Predictable**: Loading states appear within 200ms of initiating a request; empty states explain what to do next.
- **Consistent**: Error codes from the API map to consistent UI messages. Monetary values display formatted from minor units using `CURRENCY` from `GET /api/config`.
- **Safe text rendering**: All user-supplied text (restaurant descriptions, order notes, rejection reasons) is HTML-escaped before rendering. No `dangerouslySetInnerHTML` on untrusted content. `[D30]`

---

## 2. Customer UX

### Discovery
- Restaurant cards show: name, logo, cuisine tags, delivery fee (formatted), minimum order (formatted), estimated delivery time.
- Cuisine tag filter chips and postal code search.
- Search bar debounced (300ms), submits to `GET /api/restaurants/search?q=`.

### Cart
- Persistent cart indicator in navigation (item count badge).
- If adding an item from a different restaurant → display confirmation dialog: "Your cart has items from [Restaurant A]. Replace with items from [Restaurant B]?" with Cancel and Clear & Add buttons.
- Cart line quantity controls respect the 1–20 per-item limit: decrement at 1 removes the item after confirmation.

### Checkout
- Order type selector: **Delivery** | **Pickup** as radio buttons.
- Address selector for delivery: renders saved addresses; "Add new" CTA.
- Payment method selector: **Online** (`<RAZORPAY or STRIPE - EDIT ME>`) | **Cash on Delivery** | **Pay at Pickup**.
- All pricing values (subtotal, delivery fee, tax, total) are **fetched from `POST /api/checkout/quote`** and displayed. The client never computes totals.
- Before placing: "Place Order" button triggers `POST /api/checkout` with `Idempotency-Key`.

### Payment Status Page
- After online payment: redirect to `/customer/checkout/payment-status?orderId=...`.
- Poll `GET /api/orders/:id` every 3 seconds (up to 60 seconds).
- Display: **Payment Processing** (PAYMENT_PENDING) → **Order Placed** (PLACED) → **Payment Failed** (EXPIRED after 15 min, or FAILED state).

### Order Tracking `[D15]`
- Display order `statusHistory` as a vertical timeline.
- Poll `GET /api/orders/:id` every **15 seconds** while:
  - `document.visibilityState === "visible"` AND
  - Order status is non-terminal.
- Stop polling on terminal states: `DELIVERED`, `COMPLETED`, `CANCELLED`, `REJECTED`, `EXPIRED`.

### Monetary Display
- All amounts are received from the server as integers (minor units).
- Frontend formats: `(amount / 100).toFixed(2)` prepended with currency symbol from config.
- No client-side currency arithmetic for order totals.

---

## 3. Restaurant Owner UX

- **Dashboard** prominently shows incoming orders requiring action (`PLACED` state).
- Order cards show: order ID, items summary, total (formatted), order type badge (Delivery/Pickup), customer note.
- Status action buttons are contextual — only valid next transitions shown (per state machine in `docs/15`).
- **Rejection / Cancellation**: action requires a reason text input; "Confirm" button disabled until reason is non-empty.
- **acceptingOrders toggle**: prominent, visible; toggling off shows confirmation dialog.
- Menu availability toggle per item (`isAvailable` switch) is immediately actionable.
- `mustChangePassword=true` → redirect to `/restaurant/change-password` before any other navigation; cannot dismiss.

---

## 4. Admin UX

- **Dashboard**: Metric cards for total orders, pending refunds, active restaurants.
- **Data tables**: Paginated, with status badge columns and search/filter controls.
- **Destructive actions** (suspend user, cancel order, create restaurant with temp password) require confirmation dialogs.
- **Refund action**: Confirmation dialog showing order ID and refund amount before calling `POST /api/admin/refunds`.
- Admin never sees card numbers or raw payment data. Only shows payment status and refund state. `[D23]`

---

## 5. Global UI States (Required on Every Data-Fetching Component)

| State | UI Treatment |
|---|---|
| Loading | Spinner or skeleton layout (not blank white space) |
| Empty | Illustration + descriptive message + primary CTA |
| Success | Rendered data |
| Validation Error | Inline messages below each invalid field |
| Server Error | Toast or inline message from `error.message`; no technical details |
| Forbidden (403) | "You don't have permission" message; link to dashboard |
| Auth Expired (401) | Clear local auth state; redirect to `/login` with return URL |
| Not Found (404) | Friendly not-found page |
| Network Failure | "Connection issue — please try again" with retry button |

---

## 6. Static / Legal Pages

The following pages are required and contain static (non-dynamic) content:

| Page | Path | Content Owner |
|---|---|---|
| Privacy Policy | `/privacy` | Platform operator |
| Terms of Service | `/terms` | Platform operator |
| Refund Policy | `/refund-policy` | Platform operator — reflects v1 full-refund-only policy `[D16]` |
| 404 Not Found | `*` | Frontend — friendly error page |

Content for these pages is the legal responsibility of the platform owner. The documentation does not dictate legal text.
