# 02 — Software Requirements Specification (SRS)

## 1. Unified Requirement Identification Scheme

### 1.1 Authentication & User Management
- **AUTH-001**: Customer self-registration.
- **AUTH-002**: User login & httpOnly cookie session issuance.
- **AUTH-003**: User logout & cookie invalidation.
- **AUTH-004**: Current authenticated user session retrieval (`GET /auth/me`).
- **AUTH-005**: **[OUT OF SCOPE]** Password recovery (`/auth/forgot-password` disabled).
- **AUTH-006**: **[OUT OF SCOPE]** Password reset (`/auth/reset-password` disabled).
- **AUTH-007**: Role-based authorization & mandatory resource ownership validation.
- **AUTH-008**: Account status enforcement (`ACTIVE` vs `SUSPENDED`).
- **AUTH-009**: Authenticated user password change (`POST /auth/change-password`).

### 1.2 Customer & Discovery Workflows
- **CUS-001**: Profile management & saved delivery address management (max 5 addresses).
- **CUS-002**: Restaurant listing & detail page browsing.
- **CUS-003**: Database-backed restaurant and menu item text search.
- **CUS-004**: Restaurant filtering by cuisine tags and postal code eligibility.
- **CUS-005**: Restaurant menu browsing (categories, items, diet tags, availability).
- **CUS-006**: Shopping cart management (single restaurant, max 30 items, quantity 1-20).
- **CUS-007**: Server-side checkout price quote calculation (`POST /checkout/quote`).
- **CUS-008**: Idempotent order placement (`POST /checkout`).
- **CUS-009**: Provider-hosted online payment checkout & webhook verification (`<RAZORPAY or STRIPE - EDIT ME>`).
- **CUS-010**: Cash on Delivery (COD) and Pay at Pickup order placement.
- **CUS-011**: Customer order history & detailed order view.
- **CUS-012**: Order status tracking timeline with 15-second client polling.
- **CUS-013**: Customer order cancellation prior to restaurant confirmation/preparation.
- **CUS-014**: Customer in-app notification listing and mark-as-read.

### 1.3 Restaurant Management Workflows
- **RES-001**: Restaurant profile & operating parameters configuration (hours, deliveryFee, minOrderAmount, acceptingOrders, servicePostalCodes).
- **RES-002**: Menu category management (create, edit, reorder, delete).
- **RES-003**: Menu item management (create, edit, soft-delete, availability toggle, file upload).
- **RES-004**: Restaurant incoming order inbox & status filtering.
- **RES-005**: Restaurant order status advancement (`CONFIRMED`, `PREPARING`, `READY`, `OUT_FOR_DELIVERY`, `COMPLETED`).
- **RES-006**: Restaurant order rejection & cancellation with mandatory reason.
- **RES-007**: Restaurant historical order queue inspection.
- **RES-008**: Restaurant in-app notification alerts.

### 1.4 Administrator Workflows
- **ADM-001**: User account oversight & status toggling (`ACTIVE` <-> `SUSPENDED`).
- **ADM-002**: Restaurant creation & owner account provisioning (`mustChangePassword=true`).
- **ADM-003**: Platform global cuisine tag management.
- **ADM-004**: Administrative order cancellation with mandatory reason.
- **ADM-005**: Gateway API full refund processing (`REFUND_PENDING` -> `REFUNDED`).
- **ADM-006**: Administrative metrics dashboard.

### 1.5 Non-Functional Requirements
- **NFR-001**: Responsive user interface across mobile, tablet, and desktop breakpoints.
- **NFR-002**: Security controls (JWT httpOnly cookie, Argon2 hashing, 10-128 char password limit, CSRF origin check).
- **NFR-003**: Server-side access authorization and strict resource ownership boundaries.
- **NFR-004**: Schema-driven request input validation (Zod) and string escaping.
- **NFR-005**: Zero hardcoded secrets, validated environment configuration loading.
- **NFR-006**: Standardized JSON response formatting and HTTP status codes.
- **NFR-007**: Database indexing strategy supporting sub-100ms response times for core queries.
- **NFR-008**: Minor unit integer financial representation (zero floating-point currency calculations).
- **NFR-009**: Comprehensive system audit logging for admin operations and order state changes (`auditLogs`).
- **NFR-010**: Idempotency enforcement for order placement and payment webhooks.
- **NFR-011**: File upload validation (JPEG/PNG/WebP magic-byte checking, 2 MB max size, local volume storage).
- **NFR-012**: Mandatory MongoDB replica set configuration in all environments to support multi-document transactions.
