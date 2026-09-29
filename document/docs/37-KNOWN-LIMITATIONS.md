# 37 — Known Limitations

This document catalogs all known limitations, trade-offs, and intentional scope boundaries of v1 of the platform. Operators and stakeholders must review and acknowledge these before production deployment.

---

## 1. Data Retention & Deletion `[D26]`

**Limitation**: The platform performs no hard deletion of any records in v1. Deactivation mechanisms are:
- Users: `status = "SUSPENDED"` (account access blocked, record persists).
- Menu items: `isDeleted = true` (hidden from menus, record persists).
- Restaurants: `status = "SUSPENDED"` (hidden from discovery, record persists).

**Retention period**: The platform owner determines the data retention policy. No automated purging or archival job is provided. This is an operational and legal responsibility of the platform operator.

**Risk**: Indefinite data retention may create compliance obligations under data protection laws (e.g., GDPR, CCPA). The platform operator is responsible for implementing a compliant retention schedule before exposing the system to users in regulated jurisdictions.

**Resolution path**: Submit a change request via `docs/35-CHANGE-REQUEST-TEMPLATE.md` to add a hard-deletion or archival workflow in a future version.

---

## 2. Refund Policy — Full Refunds Only `[D16]`

**Limitation**: The platform supports full refunds only. Partial refunds (e.g., refunding one item from a multi-item order) are not supported in v1.

**Impact**: If a restaurant partially fulfills an order before it is cancelled, the full order amount is still refunded.

**Resolution path**: Partial refund support requires a change request that covers gateway API partial refund support, payment record schema extensions, and admin UI changes.

---

## 3. No Customer Reviews or Ratings `[D20]`

**Limitation**: Customers cannot leave reviews or star ratings for restaurants or menu items.

**Impact**: Restaurants have no in-platform reputation signal. Platform discovery is not influenced by customer feedback.

---

## 4. No Live GPS Order Tracking `[D8]` `[D20]`

**Limitation**: The order tracking feature displays a status timeline only. There is no live driver location tracking, no map view, and no delivery ETA calculation.

**Impact**: Customers cannot see the real-time location of their delivery. The platform relies on status transitions (OUT_FOR_DELIVERY → DELIVERED) as the delivery confirmation mechanism.

---

## 5. No Password Recovery `[D19]`

**Limitation**: Customers, restaurant owners, and admins cannot recover a forgotten password via email in v1. `AUTH-005` and `AUTH-006` are explicitly out of scope.

**Impact**: A user who forgets their password cannot independently recover their account. Platform operators must handle account recovery requests manually (e.g., via an admin resetting the account or issuing a new temporary password).

**Resolution path**: Password recovery requires email/SMS delivery infrastructure, which is out of v1 scope.

---

## 6. No Email, SMS, or Push Notifications `[D18]` `[D20]`

**Limitation**: Notifications exist only as in-app records. Users receive no email, SMS, or mobile push notifications for any event (order placed, confirmed, delivered, refunded, etc.).

**Impact**: Users must actively check the platform to see notification updates. A user who is not logged in will miss time-sensitive status changes.

---

## 7. No Restaurant Staff Accounts `[D3]`

**Limitation**: Each restaurant has exactly one owner account. No sub-accounts, staff roles, or manager accounts are supported. All restaurant operations (menu management, order management, settings) are performed by the single owner account.

**Impact**: High-volume restaurants with multiple operational staff must share a single login, which is a security and operational limitation.

---

## 8. No Multiple Restaurant Branches `[D3]` `[D20]`

**Limitation**: A restaurant entity represents a single location. Multiple branches of the same brand require separate restaurant registrations with separate owner accounts and separate Admin provisioning.

---

## 9. Search Limitations `[D27]`

**Limitation**: Restaurant and menu item search uses MongoDB text indexes. This supports basic full-text search but does not provide:
- Fuzzy / typo-tolerant matching
- Relevance ranking beyond MongoDB's default text score
- Faceted search or category-level filtering beyond cuisine tags
- Search analytics

---

## 10. No Scheduled or Future Orders `[D20]`

**Limitation**: Customers cannot schedule orders for a future time. Orders are placed immediately and must be within the restaurant's current operating hours.

---

## 11. Tax Calculation Accuracy `[D9]`

**Limitation**: Tax is calculated as `floor(subtotal × TAX_PERCENT / 100)` using a single platform-wide rate from `TAX_PERCENT` env variable. The platform does not support:
- Item-level tax rates
- Multi-jurisdiction tax (state + county + city)
- Tax exemptions
- Tax invoice generation

**Legal note**: The platform operator is responsible for ensuring the configured tax rate is correct for their jurisdiction and customer base. This platform does not provide legal tax advice.

---

## 12. No Invoices or Receipts `[D20]`

**Limitation**: The platform generates no formal invoices or PDF receipts. Order details visible in the order history serve as the informal record.

---

## 13. Legal & Compliance Responsibilities

The platform operator (the entity deploying this software) is solely responsible for:

- **Data protection compliance**: GDPR, CCPA, or applicable regional laws.
- **Payment compliance**: PCI-DSS compliance for cardholder data. The platform uses provider-hosted checkout to minimize scope, but compliance audits remain the operator's responsibility.
- **Tax compliance**: Correct tax rates, tax reporting, and applicable tax law obligations.
- **Consumer protection**: Refund policies, dispute resolution, and compliance with consumer rights laws.
- **Food safety regulations**: Any applicable food delivery, food handling, or restaurant licensing laws.
- **Terms of Service and Privacy Policy**: Creating legally reviewed terms for users of the platform (templates provided in `/terms` and `/privacy` pages are placeholders — not legal advice).

---

## 14. Single Timezone for All Operating Hours `[D10]` `[D22]`

**Limitation**: All restaurant operating hours are evaluated using a single `APP_TIMEZONE` environment variable. Platforms spanning multiple timezones with restaurants in different regions cannot apply per-restaurant timezone logic in v1.

---

## 15. No Inventory Management `[D20]`

**Limitation**: There is no inventory count or stock tracking. `isAvailable` is a manually toggled boolean — the system does not automatically mark items as unavailable based on stock levels.
