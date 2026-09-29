# 31 — Database Index & Query Plan

## 1. Principles

- Only create indexes that support real, measured query patterns.
- Indexes have a write-time cost — do not create them blindly.
- All unique constraints (email, event IDs, idempotency) are enforced at the database level in addition to the application level.
- Verify index effectiveness with `explain("executionStats")` against realistic data before production.

---

## 2. Required Indexes (Derived from Resolved Decisions)

### users

| Fields | Type | Purpose |
|---|---|---|
| `{ email: 1 }` | Unique | Login lookup; prevent duplicate registration |

---

### restaurants

| Fields | Type | Purpose |
|---|---|---|
| `{ status: 1 }` | Standard | Filter ACTIVE restaurants for discovery listing |
| `{ ownerId: 1 }` | Unique | One restaurant per owner `[D3]`; restaurant owner profile lookup |
| `{ status: 1, cuisineCategories: 1 }` | Compound | Cuisine-filtered restaurant listing |
| `{ "address.postalCode": 1 }` | Standard | (Optional) if postal-code proximity search is added |

---

### menuCategories

| Fields | Type | Purpose |
|---|---|---|
| `{ restaurantId: 1, isActive: 1 }` | Compound | Menu category listing for a restaurant |

---

### menuItems

| Fields | Type | Purpose |
|---|---|---|
| `{ restaurantId: 1 }` | Standard | All items for a restaurant |
| `{ categoryId: 1 }` | Standard | Items in a category |
| `{ restaurantId: 1, isAvailable: 1, isDeleted: 1 }` | Compound | Available, non-deleted items at checkout validation |

> Text index on `{ name: "text", description: "text" }` for search. Validate this is sufficient before adding; consider separate index on `restaurants` collection as well for restaurant-name search.

---

### carts

| Fields | Type | Purpose |
|---|---|---|
| `{ customerId: 1 }` | Unique | One active cart per customer `[D6]`; fast cart lookup |

---

### addresses

| Fields | Type | Purpose |
|---|---|---|
| `{ customerId: 1 }` | Standard | Customer address list (max-5 enforcement) |

---

### orders

| Fields | Type | Purpose |
|---|---|---|
| `{ customerId: 1, createdAt: -1 }` | Compound | Customer order history, sorted by newest |
| `{ restaurantId: 1, status: 1, createdAt: -1 }` | Compound | Restaurant order inbox with status filter |
| `{ customerId: 1, idempotencyKey: 1 }` | Unique | Idempotency enforcement `[D12]` |
| `{ status: 1, createdAt: 1 }` | Compound | Expiry job query: `PAYMENT_PENDING` orders older than 15 min `[D24]` |
| `{ paymentStatus: 1 }` | Standard | Admin refund queue (`REFUND_PENDING` filter) `[D16]` |

---

### payments

| Fields | Type | Purpose |
|---|---|---|
| `{ providerOrderId: 1 }` | Unique | Payment lookup by gateway order ID `[D25]` |
| `{ providerEventId: 1 }` | Unique | Webhook idempotency: prevent duplicate event processing `[D25]` |
| `{ orderId: 1 }` | Standard | Payment record lookup by order |

---

### notifications

| Fields | Type | Purpose |
|---|---|---|
| `{ userId: 1, isRead: 1, createdAt: -1 }` | Compound | Notification list + unread filter for a user `[D18]` |

---

### auditLogs

| Fields | Type | Purpose |
|---|---|---|
| `{ actorId: 1, createdAt: -1 }` | Compound | Admin action history by actor |
| `{ targetType: 1, targetId: 1, createdAt: -1 }` | Compound | Audit trail for a specific resource |

---

## 3. Search Index Strategy `[D27]`

Search is implemented as MongoDB **text indexes** on restaurant and menu item names. No external search engine is used.

```js
// restaurants collection
{ name: "text", description: "text" }

// menuItems collection
{ name: "text", description: "text" }
```

Input from `q` query parameter must be:
1. Validated by Zod: string, 1–100 chars.
2. Escaped for regex or passed as text query string to MongoDB `$text` operator.
3. Never concatenated directly into a query string.

---

## 4. Pagination Requirements `[D16]`

- All list endpoints accept `page` (default 1) and `limit` (default 20, max 100, server-enforced).
- Do not return unbounded list responses — even for internal admin queries.
- Use `.skip((page - 1) * limit).limit(limit)` pattern or cursor-based pagination where performance requires it.

---

## 5. Pre-Production Index Validation

Before production deployment:
1. Run `db.collection.explain("executionStats").find({...})` for every common query pattern.
2. Confirm `IXSCAN` (index scan) not `COLLSCAN` (collection scan) for queries on large collections.
3. Confirm unique index violations are caught at the DB level as a safety net.
4. Remove any indexes created during development that are not in this document.
