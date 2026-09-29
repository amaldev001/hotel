# 29 — Data Flow & Sequence Specification

## 1. Security Boundary Reminder

The client is an **untrusted boundary**. The server never accepts client claims about:
- User role, account status, or ownership
- Item prices or order totals
- Payment success, payment status
- Order status or cart contents
- Discount amounts or promotional values

---

## 2. Checkout Quote Flow

```mermaid
sequenceDiagram
    participant C as Customer Browser
    participant API as Express API
    participant DB as MongoDB

    C->>API: POST /api/checkout/quote<br/>{orderType, deliveryAddressId?}
    API->>API: Authenticate JWT cookie
    API->>DB: Load Cart (customerId)
    API->>DB: Load Restaurant (restaurantId)
    API->>API: Verify ACTIVE + acceptingOrders + within operating hours (APP_TIMEZONE)
    alt Delivery order
        API->>DB: Load Address (deliveryAddressId)
        API->>API: Check postalCode ∈ servicePostalCodes
    end
    API->>DB: Reload all MenuItem prices (by menuItemId)
    API->>API: Compute subtotal = Σ(price × qty) [integer arithmetic]
    API->>API: Verify subtotal ≥ minOrderAmount
    API->>API: deliveryFee = restaurant.deliveryFee (0 for pickup)
    API->>API: tax = floor(subtotal × TAX_PERCENT / 100)
    API->>API: total = subtotal + deliveryFee + tax
    API-->>C: 200 {subtotal, deliveryFee, taxPercent, tax, total, currency}
```

---

## 3. Online Payment Checkout & Webhook Flow `[D11]` `[D24]` `[D25]`

```mermaid
sequenceDiagram
    participant C as Customer Browser
    participant API as Express API
    participant DB as MongoDB
    participant GW as Payment Gateway

    C->>API: POST /api/checkout<br/>Idempotency-Key: <uuid><br/>{orderType, deliveryAddressId, paymentMethod: "online"}
    API->>DB: Check (customerId + idempotencyKey) uniqueness
    API->>API: Run full checkout validation (same as quote)
    API->>DB: BEGIN MongoDB Transaction
    API->>DB: Create Order {status: PAYMENT_PENDING, paymentStatus: PENDING}
    API->>DB: Create Payment {status: PENDING, amount, currency}
    API->>GW: createOrder(amount, currency, orderId)
    GW-->>API: {providerOrderId, gatewayToken}
    API->>DB: Save providerOrderId to Payment
    API->>DB: Clear Cart
    API->>DB: COMMIT Transaction
    API-->>C: 201 {order, gatewayData: {token, providerOrderId}}

    Note over C,GW: Customer completes payment on PROVIDER-HOSTED page<br/>Card data goes DIRECTLY to gateway — never to our server

    GW->>API: POST /api/payments/webhook<br/>(raw body, provider signature header)
    API->>API: Verify HMAC signature (PAYMENT_WEBHOOK_SECRET, raw body)
    API->>DB: Check providerEventId uniqueness (idempotency)
    API->>DB: Load Payment by providerOrderId
    API->>API: Validate amount + currency match Order snapshot
    API->>DB: BEGIN MongoDB Transaction
    API->>DB: Order: PAYMENT_PENDING → PLACED
    API->>DB: Payment: PENDING → COMPLETED, set providerPaymentId
    API->>DB: Append statusHistory entry {byRole: "system"}
    API->>DB: Create Notification: ORDER_PLACED → restaurant owner
    API->>DB: Create AuditLog entry
    API->>DB: COMMIT Transaction
    API-->>GW: 200 OK
```

---

## 4. Unpaid Order 15-Minute Expiry Job `[D24]`

```mermaid
sequenceDiagram
    participant Job as OrderExpiryJob (background)
    participant DB as MongoDB

    loop Every ~60 seconds
        Job->>DB: Find orders where<br/>status = PAYMENT_PENDING<br/>AND createdAt < (now - 15min)
        alt Orders found
            Job->>DB: BEGIN MongoDB Transaction
            Job->>DB: Order: PAYMENT_PENDING → EXPIRED
            Job->>DB: Payment: PENDING → FAILED
            Job->>DB: Append statusHistory {status: EXPIRED, byRole: system}
            Job->>DB: Create Notification: ORDER_EXPIRED → customer
            Job->>DB: Create AuditLog entry {actorRole: system}
            Job->>DB: COMMIT Transaction
        else No orders found
            Job->>Job: No-op, wait for next interval
        end
    end
```

---

## 5. Admin Order Cancellation & Full Refund Flow `[D13]` `[D14]` `[D16]`

```mermaid
sequenceDiagram
    participant A as Admin Browser
    participant API as Express API
    participant DB as MongoDB
    participant GW as Payment Gateway

    A->>API: POST /api/admin/orders/:id/cancel<br/>{reason: "Fraud detected"}
    API->>API: Authenticate + verify role = admin
    API->>DB: Load Order
    API->>API: Verify order is non-terminal
    API->>DB: BEGIN MongoDB Transaction
    API->>DB: Order: current status → CANCELLED
    API->>DB: Append statusHistory {byRole: admin, reason}
    alt paymentStatus = COMPLETED
        API->>DB: Payment: COMPLETED → REFUND_PENDING
        API->>DB: Create Notification: ORDER_CANCELLED → customer
    end
    API->>DB: Create AuditLog entry {actorRole: admin, action: ORDER_CANCELLED}
    API->>DB: COMMIT Transaction
    API-->>A: 200 OK

    Note over A,GW: Admin separately triggers refund

    A->>API: POST /api/admin/refunds<br/>{orderId}
    API->>API: Authenticate + verify role = admin
    API->>DB: Load Order + Payment
    API->>API: Verify paymentStatus = REFUND_PENDING
    API->>GW: refund(providerPaymentId, amount) [idempotent call]
    GW-->>API: {refundId, status: "succeeded"}
    API->>DB: BEGIN MongoDB Transaction
    API->>DB: Payment: REFUND_PENDING → REFUNDED, set refundId
    API->>DB: Create Notification: REFUND_INITIATED + REFUND_COMPLETED → customer
    API->>DB: Create AuditLog entry {actorRole: admin, action: REFUND_TRIGGERED}
    API->>DB: COMMIT Transaction
    API-->>A: 200 {refundId, status: "REFUNDED"}
```

---

## 6. Restaurant Status Advancement Flow

```mermaid
sequenceDiagram
    participant R as Restaurant Browser
    participant API as Express API
    participant DB as MongoDB

    R->>API: PATCH /api/orders/:id/status<br/>{status: "CONFIRMED"}
    API->>API: Authenticate JWT
    API->>DB: Load Order
    API->>API: Verify order.restaurantId === user.restaurantId
    API->>API: Validate state machine transition (PLACED → CONFIRMED allowed)
    API->>DB: BEGIN MongoDB Transaction
    API->>DB: Order: status = CONFIRMED
    API->>DB: Append statusHistory {status: CONFIRMED, byRole: restaurant}
    API->>DB: Create Notification: ORDER_CONFIRMED → customer
    API->>DB: Create AuditLog entry
    API->>DB: COMMIT Transaction
    API-->>R: 200 {order}
```

---

## 7. Failure Principle

If any external service (payment gateway, file storage) fails, the server must:
1. Preserve a consistent internal state (do not partially commit).
2. Return an appropriate error code to the client.
3. Allow safe retry without creating duplicate financial records or orders.
4. Never swallow errors silently — log with request ID (no PII in logs).
