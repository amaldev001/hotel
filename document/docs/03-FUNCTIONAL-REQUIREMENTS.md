# 03 — Functional Requirements & Acceptance Criteria

This document details testable **Given / When / Then** acceptance criteria for all requirements in `docs/02-SRS.md`.

---

## 1. Authentication & Session Management

### AUTH-001: Customer Registration
- **Given** valid registration details (name, email, valid phone, password between 10 and 128 characters),
- **When** `POST /api/auth/register` is invoked,
- **Then** the system creates a user with role `customer` and status `ACTIVE`, hashes the password using Argon2, sets an `httpOnly` JWT cookie (`SameSite=Strict`, 1-day expiry), and returns HTTP `201 Created` with the user profile object (excluding `passwordHash`).
- **Given** an email address that already exists in the system,
- **When** `POST /api/auth/register` is invoked,
- **Then** the system returns HTTP `409 Conflict` with error code `EMAIL_ALREADY_REGISTERED`.

### AUTH-002: User Login
- **Given** correct credentials for an `ACTIVE` user,
- **When** `POST /api/auth/login` is submitted,
- **Then** the system sets an `httpOnly` JWT cookie and returns HTTP `200 OK`.
- **Given** credentials for a user with status `SUSPENDED`,
- **When** `POST /api/auth/login` is submitted,
- **Then** the system returns HTTP `403 Forbidden` with error code `ACCOUNT_SUSPENDED`.
- **Given** incorrect password or non-existent email,
- **When** `POST /api/auth/login` is submitted,
- **Then** the system returns HTTP `401 Unauthorized` with error code `INVALID_CREDENTIALS`.

### AUTH-003: User Logout
- **Given** an authenticated user session,
- **When** `POST /api/auth/logout` is called,
- **Then** the system clears the JWT cookie and returns HTTP `200 OK`.

### AUTH-004: Current User Session Retrieval
- **Given** a request containing a valid, unexpired JWT cookie,
- **When** `GET /api/auth/me` is called,
- **Then** the system returns HTTP `200 OK` with user details (`_id`, `name`, `email`, `role`, `status`, `mustChangePassword`).

### AUTH-005 & AUTH-006: Password Recovery & Reset
- **Status**: **OUT OF SCOPE FOR V1** (`[D19]`). Requests to `/auth/forgot-password` or `/auth/reset-password` return HTTP `404 Not Found`.

### AUTH-007: Role-Based Authorization
- **Given** an authenticated user attempting to access a route restricted to another role or resource owned by another user,
- **When** the HTTP request is executed,
- **Then** the backend enforces access controls and returns HTTP `403 Forbidden` with error code `FORBIDDEN`.

### AUTH-008: Account Status Enforcement
- **Given** a user whose account status is `SUSPENDED`,
- **When** any authenticated state-changing request is performed,
- **Then** the backend blocks execution and returns HTTP `403 Forbidden` with error code `ACCOUNT_SUSPENDED`.

### AUTH-009: Authenticated Password Change
- **Given** an authenticated user providing `currentPassword` and a valid `newPassword` (10-128 chars),
- **When** `POST /api/auth/change-password` is executed,
- **Then** the system verifies `currentPassword`, updates the Argon2 hash, sets `mustChangePassword=false`, and returns HTTP `200 OK`.

---

## 2. Customer & Discovery Acceptance Criteria

### CUS-001: Customer Profile & Saved Addresses
- **Given** an authenticated customer with 4 saved addresses,
- **When** `POST /api/addresses` is called with valid address payload,
- **Then** the address is saved and HTTP `201 Created` is returned.
- **Given** an authenticated customer who already has 5 saved addresses (`[D22]`),
- **When** `POST /api/addresses` is called,
- **Then** the system rejects creation and returns HTTP `400 Bad Request` with error code `MAX_ADDRESSES_REACHED`.

### CUS-002: Restaurant Listing & Browsing
- **Given** active restaurants in the database,
- **When** `GET /api/restaurants` is called with pagination query `?page=1&limit=20` (`[D16]`),
- **Then** the system returns HTTP `200 OK` with `ACTIVE` restaurants, pagination metadata (`page`, `limit`, `total`, `totalPages`), omitting `SUSPENDED` restaurants.

### CUS-003: Database Text Search
- **Given** a search query `q=pizza`,
- **When** `GET /api/restaurants/search?q=pizza` is invoked,
- **Then** the backend sanitizes/escapes the input string (`[D27]`) and returns matching active restaurants/items using MongoDB indexes with HTTP `200 OK`.

### CUS-004: Restaurant Filtering
- **Given** active restaurants with assigned `cuisineCategories` and `servicePostalCodes`,
- **When** `GET /api/restaurants?cuisine=Italian&postalCode=10001` is queried,
- **Then** only restaurants matching the filters are returned.

### CUS-005: Menu Browsing
- **Given** a valid active `restaurantId`,
- **When** `GET /api/restaurants/:id/menu` is called,
- **Then** the system returns HTTP `200 OK` with active menu categories and non-deleted menu items (`isDeleted: false`).

### CUS-006: Cart Management
- **Given** an existing customer cart containing items from Restaurant A,
- **When** `POST /api/cart/items` is called with an item from Restaurant B,
- **Then** the system rejects the addition and returns HTTP `409 Conflict` with error code `CART_RESTAURANT_MISMATCH` (`[D6]`).
- **Given** a cart with 30 items or an item addition with `quantity=21`,
- **When** item addition or update is requested,
- **Then** the backend rejects the request returning HTTP `400 Bad Request` with error code `CART_LIMIT_EXCEEDED` (`[D6]`).

### CUS-007: Checkout Price Quote Calculation
- **Given** a customer cart with items, selected `orderType` (`delivery` or `pickup`), and `deliveryAddressId` (if delivery),
- **When** `POST /api/checkout/quote` is invoked,
- **Then** the backend validates restaurant `acceptingOrders=true`, operating hours in `APP_TIMEZONE`, item availability, item prices, min order amount (`minOrderAmount`), postal code serviceability, and returns HTTP `200 OK` with computed integers: `subtotal`, `deliveryFee`, `tax` (`TAX_PERCENT`), and `total` (`[D9]`, `[D13]`, `[D28]`).

### CUS-008 & CUS-009: Idempotent Order Placement & Online Payment
- **Given** a valid cart, address, and payment method `online` (`<RAZORPAY or STRIPE - EDIT ME>`),
- **When** `POST /api/checkout` is submitted with header `Idempotency-Key: <unique-uuid>`,
- **Then** the server creates an order in `PAYMENT_PENDING` state, creates the gateway order/session, returns HTTP `201 Created` with gateway tokens, and starts a 15-minute expiration timer (`[D11]`, `[D12]`, `[D24]`).
- **Given** a verified gateway payment webhook received at `POST /api/payments/webhook`,
- **When** raw body signature matches `PAYMENT_WEBHOOK_SECRET` and provider event ID is new,
- **Then** the system updates order status to `PLACED`, payment status to `COMPLETED`, records transaction ID, and returns HTTP `200 OK` (`[D25]`).

### CUS-010: Cash on Delivery (COD) / Pay at Pickup
- **Given** payment method `cod` or `pay_at_pickup`,
- **When** `POST /api/checkout` is submitted with `Idempotency-Key`,
- **Then** the server creates the order directly in `PLACED` status with payment status `PENDING` and clears the customer's cart (`[D24]`).

### CUS-012: Order Tracking Timeline
- **Given** an active customer order,
- **When** customer frontend polls `GET /api/orders/:id` every 15 seconds while tab is visible (`[D15]`),
- **Then** backend returns order details and complete `statusHistory` timeline array.

### CUS-013: Customer Order Cancellation
- **Given** a customer order in `PAYMENT_PENDING` or `PLACED` state,
- **When** `POST /api/orders/:id/cancel` is called by the customer,
- **Then** status updates to `CANCELLED`. If order payment status was `COMPLETED`, payment status updates to `REFUND_PENDING` (`[D13]`, `[D15]`, `[D16]`).

---

## 3. Restaurant Management Acceptance Criteria

### RES-001: Restaurant Profile & Settings
- **Given** an authenticated restaurant owner,
- **When** `PUT /api/restaurant/profile` is called with updated `operatingHours`, `deliveryFee`, `minOrderAmount`, `acceptingOrders`, or `servicePostalCodes`,
- **Then** backend validates owner ownership of the restaurant, updates settings and returns HTTP `200 OK` (`[D9]`, `[D10]`, `[D17]`, `[D28]`). Restaurant owners can ONLY edit their assigned restaurant's profile.

### RES-002: Menu Category & Item Management
- **Given** an authenticated restaurant owner,
- **When** category or item CRUD operations (`/api/restaurant/categories`, `/api/restaurant/items`) are performed,
- **Then** backend enforces strict ownership verification on EVERY route (preventing any restaurant owner from reading or modifying another restaurant's menu data), validating integer minor unit prices and supporting quick availability toggle via `PATCH /api/restaurant/items/:id/availability`.

### RES-003: Menu Item Management & Image Upload
- **Given** an image file upload to `POST /api/uploads/image` by a restaurant owner or admin,
- **When** the file is validated as JPEG, PNG, or WebP via magic bytes signature check and size <= 2 MB (`[D20]`),
- **Then** system saves file with random name to local storage adapter volume and returns asset URL. If SVG or > 2 MB, returns HTTP `400 Bad Request` with `INVALID_FILE_TYPE` or `FILE_TOO_LARGE`. When an existing logo, banner, or menu item image is replaced, the old file is automatically deleted from disk.

### RES-005: Order Status Advancement
- **Given** a restaurant order in `PLACED` status,
- **When** restaurant calls `PATCH /api/orders/:id/status` with status `CONFIRMED`,
- **Then** system validates transition against order state machine, records `byRole: "restaurant"` in status history, and returns HTTP `200 OK`.

### RES-006: Restaurant Rejection / Cancellation
- **Given** a restaurant order prior to `OUT_FOR_DELIVERY` or `COMPLETED`,
- **When** restaurant calls `PATCH /api/orders/:id/status` with status `REJECTED` or `CANCELLED` and a required non-empty `reason` string (`[D15]`),
- **Then** system updates order state, sets payment status to `REFUND_PENDING` if previously paid, and notifies customer via in-app notification (`[D16]`, `[D18]`).

---

## 4. Admin Management Acceptance Criteria

### ADM-002: Restaurant & Owner Account Creation
- **Given** an authenticated Admin,
- **When** `POST /api/admin/restaurants` is submitted with restaurant details and owner info (`name`, `email`, `temporaryPassword`),
- **Then** system creates the restaurant (`status: "ACTIVE"`), creates the owner user (`role: "restaurant"`, `mustChangePassword: true`), links them 1-to-1 (`[D3]`), and returns HTTP `201 Created`.

### ADM-005: Administrative Full Refund Processing
- **Given** an order with payment status `REFUND_PENDING`,
- **When** Admin calls `POST /api/admin/refunds` with `orderId`,
- **Then** backend invokes payment gateway refund API (`<RAZORPAY or STRIPE - EDIT ME>`), updates payment status to `REFUNDED`, writes audit log entry (`[D14]`, `[D16]`, `[D21]`), and returns HTTP `200 OK`.

---

## 5. Non-Functional Acceptance Criteria

### NFR-008: Financial Integer Storage
- **Given** any price or monetary calculation,
- **When** data is stored in MongoDB or transmitted via API,
- **Then** all values MUST be non-negative integers representing minor units (cents/paise). Floating-point numbers return validation error `400 Bad Request`.

### NFR-010: Webhook & Order Idempotency
- **Given** a duplicated payment webhook request with identical provider event ID,
- **When** `POST /api/payments/webhook` is processed,
- **Then** the backend detects duplicate event ID, skips reprocessing, and returns HTTP `200 OK` (`[D25]`).

### NFR-012: MongoDB Replica Set Requirement
- **Given** multi-collection state changes (e.g. order creation and cart clearing),
- **When** executed on backend,
- **Then** operations run within a MongoDB session transaction requiring a running Replica Set in all environments.
