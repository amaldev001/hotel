# 16 — Notifications

## 1. Channel `[D18]`

In-app notifications only. Email, SMS, and push notifications are **out of scope for v1**. `[D20]`

---

## 2. Notification Schema

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "type": "ORDER_PLACED",
  "title": "New Order Received",
  "message": "Order #ORD-001 has been placed.",
  "referenceType": "order",
  "referenceId": "ObjectId",
  "isRead": false,
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

---

## 3. Event Trigger Table `[D18]`

Every order event listed creates a notification record for the appropriate recipient.

| Event Type | Recipient | Trigger | Title (example) |
|---|---|---|---|
| `ORDER_PLACED` | Restaurant Owner | Customer places COD/pickup order (`PLACED`) | "New order received" |
| `ORDER_PLACED` | Customer | COD/pickup order confirmed placed | "Order placed successfully" |
| `ORDER_PLACED_RESTAURANT` | Restaurant Owner | Webhook transitions order to `PLACED` | "New order received (online)" |
| `ORDER_CONFIRMED` | Customer | Restaurant advances to `CONFIRMED` | "Your order is confirmed" |
| `ORDER_REJECTED` | Customer | Restaurant rejects order | "Your order was rejected" |
| `ORDER_PREPARING` | Customer | Restaurant advances to `PREPARING` | "Your order is being prepared" |
| `ORDER_READY` | Customer | Restaurant advances to `READY` | "Your order is ready" |
| `ORDER_OUT_FOR_DELIVERY` | Customer | Restaurant advances to `OUT_FOR_DELIVERY` | "Your order is on the way" |
| `ORDER_DELIVERED` | Customer | Restaurant marks `DELIVERED` | "Your order has been delivered" |
| `ORDER_COMPLETED` | Customer | Restaurant marks `COMPLETED` | "Your order has been completed" |
| `ORDER_CANCELLED` | Customer | Restaurant/Admin cancels order | "Your order was cancelled" |
| `ORDER_CANCELLED` | Restaurant Owner | Customer cancels order | "Order was cancelled by customer" |
| `ORDER_EXPIRED` | Customer | System expires unpaid order after 15 min | "Your order has expired" |
| `PAYMENT_COMPLETED` | Customer | Webhook confirms payment | "Payment successful" |
| `PAYMENT_FAILED` | Customer | Webhook confirms payment failure | "Payment failed" |
| `REFUND_INITIATED` | Customer | Admin triggers refund | "Your refund has been initiated" |
| `REFUND_COMPLETED` | Customer | Gateway confirms refund | "Your refund is complete" |

---

## 4. API Endpoints

### `GET /api/notifications`
- **Auth**: Customer, Restaurant Owner
- **Query**: `page` (default 1), `limit` (default 20, max 100), `isRead` (boolean filter)
- **Ownership**: `notification.userId === user._id`
- **Response**: Paginated notification list

### `GET /api/notifications/unread-count`
- **Auth**: Customer, Restaurant Owner
- **Response**: `{ "count": 3 }`

### `PATCH /api/notifications/:id/read`
- **Auth**: Customer, Restaurant Owner
- **Ownership**: `notification.userId === user._id`
- **Action**: Sets `isRead = true`
- **Response**: `200 { success: true }`

---

## 5. Implementation Rules

1. Notification creation is a **side effect** of order state transitions — it must not block the primary transaction. Notification failure does not roll back the order state change.
2. Notification content MUST NOT include: card data, payment secrets, addresses or phone numbers in raw form. Include only safe identifiers (order ID, status).
3. Notifications are stored in the `notifications` collection and fetched by the authenticated user.
4. In-app notifications are read by the frontend polling the list endpoint (no WebSockets required).
5. `userId` links to the User document — restaurant notifications go to the owner's `userId`.
