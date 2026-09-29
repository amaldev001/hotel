# 14 — Payment Integration

## 1. Provider `[D11]`

**Selected gateway**: `<RAZORPAY or STRIPE - EDIT ME>` — TEST mode only during development.

- Provider-hosted checkout: card data never touches application servers.
- COD (Cash on Delivery) and Pay-at-Pickup are supported as non-gateway payment methods.
- **Fake / mock payment provider**: may exist inside automated test suites only. The server **refuses to start** (`process.exit(1)`) if `PAYMENT_PROVIDER=fake` is set when `NODE_ENV=production`.

---

## 2. Payment States

```text
PENDING         → Initial state for all payments at order creation
COMPLETED       → Webhook confirmed payment success
FAILED          → Webhook or verify confirmed payment failure
REFUND_PENDING  → Order was cancelled/rejected after payment was COMPLETED
REFUNDED        → Admin has triggered and gateway confirmed full refund
```

---

## 3. Online Payment Sequencing `[D24]`

Order-first approach — the order is created BEFORE the payment is processed.

```text
[Customer] POST /api/checkout
           ↓
[Server]   Creates Order { status: PAYMENT_PENDING }
           Creates Payment { status: PENDING }
           Calls PaymentAdapter.createOrder(amount, currency) → providerOrderId + gatewayToken
           Returns 201 { orderId, gatewayToken, providerOrderId }
           ↓
[Customer] Opens provider-hosted payment page (redirect or embedded widget)
           Enters card details DIRECTLY with <RAZORPAY or STRIPE> — never with our server
           ↓
[Gateway]  Processes payment
           Sends webhook POST /api/payments/webhook (async, may arrive seconds later)
           ↓
[Server]   Verifies webhook → updates Order to PLACED, Payment to COMPLETED
```

---

## 4. Webhook Processing `[D25]`

### Security — Raw Body Signature Verification
1. The route MUST use raw body (not parsed JSON) for signature computation.
2. Compute HMAC using `PAYMENT_WEBHOOK_SECRET` and compare to provider header.
3. Reject with `400 INVALID_WEBHOOK_SIGNATURE` if mismatch.

### Idempotency by Provider Event ID
1. Extract `providerEventId` from webhook payload.
2. Query `payments` collection for existing `providerEventId`.
3. If found → return `200` immediately without reprocessing (idempotent duplicate).
4. If not found → process event and store `providerEventId`.

### Amount & Currency Validation
- `webhook.amount === order.pricing.total` — must match exactly (minor units).
- `webhook.currency === order.pricing.currency` — must match.
- Mismatch → return `400 PAYMENT_AMOUNT_MISMATCH` and do NOT update order status.

### Event Handling

| Webhook Event | Action |
|---|---|
| Payment success | Order: `PAYMENT_PENDING → PLACED`; Payment: `PENDING → COMPLETED`; notify restaurant |
| Payment failure | Log failure; Payment: `PENDING → FAILED`; leave order in `PAYMENT_PENDING` (expiry handles cleanup) |
| Refund success | Payment: `REFUND_PENDING → REFUNDED`; update `refundId`; notify customer |

### Response Policy
- Always return `200` promptly — payment gateways may retry on non-2xx responses.
- Duplicate events return `200` immediately.

---

## 5. Order Expiry Background Job `[D24]`

```text
Runs every ~60 seconds.

Query:
  db.orders.find({
    status: "PAYMENT_PENDING",
    createdAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) }
  })

For each result:
  - Set status = "EXPIRED"
  - Append to statusHistory: { status: "EXPIRED", at: now, byRole: "system" }
  - Set Payment.status = "FAILED" (if PENDING)
  - Create Notification: ORDER_EXPIRED → customer
  - Write AuditLog entry

This is idempotent — re-running on an already-EXPIRED order is a no-op.
```

---

## 6. COD / Pay-at-Pickup Flow `[D24]`

```text
POST /api/checkout { paymentMethod: "cod" | "pay_at_pickup" }
  → Order created: { status: "PLACED", paymentStatus: "PENDING" }
  → No gateway call required
  → Cart cleared
  → Notification: ORDER_PLACED → restaurant
```

Payment is settled physically at delivery or pickup. No gateway callback expected.

---

## 7. Refund Policy `[D16]`

- **Full refunds only** — no partial refunds in v1.
- Triggered by Admin only via `POST /api/admin/refunds { orderId }`.
- Prerequisite: `order.paymentStatus === "REFUND_PENDING"`.
- Server calls `PaymentAdapter.refund(providerPaymentId, amount)` on the gateway API.
- Refund API call is **idempotent** — safe to retry without double-refunding.
- On gateway confirmation: `paymentStatus → "REFUNDED"`, `refundId` stored.
- Customer notified via in-app notification: `REFUND_COMPLETED`.
- Audit log written with admin actor.

### Refund Trigger Conditions
| Who cancels order | Was order paid (COMPLETED)? | Result |
|---|---|---|
| Customer (PAYMENT_PENDING or PLACED) | No — `paymentStatus=PENDING` | No refund needed |
| Customer (PLACED, COD) | No | No refund needed |
| Customer (PLACED, online, paid) | Yes | `paymentStatus → REFUND_PENDING` |
| Restaurant rejects/cancels (before OUT_FOR_DELIVERY) | Yes | `paymentStatus → REFUND_PENDING` |
| Admin cancels any non-terminal | Yes | `paymentStatus → REFUND_PENDING` |

---

## 8. Secondary Verification Endpoint `[D25]`

`POST /api/payments/verify` exists as a secondary check for the client to query payment status. It is **never the sole proof of payment**. Authoritative payment confirmation requires webhook verification.

---

## 9. Admin Payment Visibility `[D23]`

Admins may view:
- `order.paymentMethod`
- `order.paymentStatus`
- `payment.status`
- `payment.refundId` (after refund)
- `payment.providerOrderId`

Admins MUST NOT see:
- Card numbers, CVVs, billing addresses entered into the provider checkout
- Provider API secret keys
- Raw webhook signature secrets
