# 13 — Cart & Checkout

## 1. Cart Rules `[D6]`

| Rule | Value |
|---|---|
| Active carts per customer | 1 |
| Restaurants per cart | 1 |
| Max line items per cart | 30 |
| Quantity per line item | Integer 1–20 |

---

## 2. Cart Operations & Validation

### Adding an Item (`POST /api/cart/items`)
1. Verify item: `isDeleted=false`, `isAvailable=true`, belongs to an `ACTIVE` restaurant.
2. If cart is empty → create cart for `{ customerId, restaurantId }`.
3. If cart belongs to a **different restaurant** → return `409 CART_RESTAURANT_MISMATCH` with `{ existingRestaurantId }`.
   - The frontend MUST display a confirmation dialog: "Your cart contains items from [existing restaurant]. Replace with items from [new restaurant]?"
   - If customer confirms, frontend calls `DELETE /api/cart` then re-adds the item.
4. If cart already has 30 items → return `400 CART_LIMIT_EXCEEDED`.
5. If item already exists in cart → increment quantity (up to max 20); if it would exceed 20, return `400 CART_LIMIT_EXCEEDED`.
6. Otherwise → add new cart line with requested quantity.

---

## 3. Server-Side Checkout Algorithm

The checkout algorithm is executed during both `POST /api/checkout/quote` and `POST /api/checkout`. Client-supplied prices and totals are **ignored**.

```text
Step 1:  Authenticate customer; verify status ACTIVE.
Step 2:  Load cart (must be non-empty).
Step 3:  Validate body: { orderType, deliveryAddressId?, paymentMethod }.
Step 4:  Load restaurant — must be ACTIVE.
Step 5:  Verify acceptingOrders === true.
Step 6:  Verify restaurant is within operating hours (APP_TIMEZONE).
Step 7:  If orderType="delivery": load deliveryAddress, verify postalCode ∈ servicePostalCodes.
Step 8:  Reload all menu items from DB (not from cart or client).
Step 9:  For each cart line:
           - item must exist (isDeleted=false)
           - item must be available (isAvailable=true)
           - use item.price from DB (ignore any client price)
           - validate quantity: integer 1–20
           - lineTotal = unitPrice * quantity  (integer arithmetic)
Step 10: subtotal = Σ(lineTotal) for all lines.
Step 11: Verify subtotal ≥ restaurant.minOrderAmount → 400 MIN_ORDER_NOT_MET.
Step 12: deliveryFee = (orderType="delivery") ? restaurant.deliveryFee : 0
Step 13: tax = Math.floor(subtotal * TAX_PERCENT / 100)   [integer, minor units]
Step 14: total = subtotal + deliveryFee + tax
```

> [!IMPORTANT]
> All monetary values (`subtotal`, `deliveryFee`, `tax`, `total`, `unitPrice`, `lineTotal`) MUST be non-negative integers in minor currency units. Floating-point arithmetic is forbidden. `[D4]`

---

## 4. Quote Endpoint (`POST /api/checkout/quote`)

Returns the server-computed quote without creating an order. Clients MUST display these server values; they MUST NOT compute their own totals.

**Request body:**
```json
{ "orderType": "delivery", "deliveryAddressId": "<ObjectId>" }
```

**Success response (`200`):**
```json
{
  "success": true,
  "data": {
    "subtotal": 2498,
    "deliveryFee": 150,
    "taxPercent": 5,
    "tax": 124,
    "total": 2772,
    "currency": "USD"
  }
}
```

---

## 5. Order Placement (`POST /api/checkout`) `[D12]` `[D24]`

### Required Header
```
Idempotency-Key: <client-generated UUID v4>
```
A repeated `Idempotency-Key` returns the same response without creating a new order.

### Online Payment Flow
```text
1. Run checkout algorithm (Steps 1–14 above).
2. Check (customerId + idempotencyKey) uniqueness — return existing order if key is a repeat.
3. Open MongoDB session/transaction.
4. Create Order: { status: "PAYMENT_PENDING", paymentMethod: "online", paymentStatus: "PENDING" }
5. Create Payment record: { status: "PENDING", amount: total, currency }
6. Call PaymentAdapter.createOrder(amount, currency, orderId) → get providerOrderId + gatewayToken.
7. Save providerOrderId to Payment record.
8. Clear customer cart.
9. Commit transaction.
10. Return 201 { order, gatewayData: { token, providerOrderId } }

Order is now PAYMENT_PENDING. Background job expires it after 15 minutes if webhook never arrives.
```

### COD / Pay-at-Pickup Flow
```text
1. Run checkout algorithm.
2. Check idempotency.
3. Open MongoDB session/transaction.
4. Create Order: { status: "PLACED", paymentMethod: "cod"/"pay_at_pickup", paymentStatus: "PENDING" }
5. Clear customer cart.
6. Commit transaction.
7. Create notification: ORDER_PLACED → restaurant owner.
8. Return 201 { order }
```

---

## 6. Idempotency Behavior `[D12]`

| Scenario | Behavior |
|---|---|
| New `Idempotency-Key` with valid payload | Process normally, create order |
| Repeat `Idempotency-Key`, same payload | Return the same order that was created originally (HTTP 200 or 201) |
| Repeat `Idempotency-Key`, different payload | Return `409 IDEMPOTENCY_CONFLICT` |
| Missing `Idempotency-Key` header | Return `400 INVALID_INPUT` |

The `(customerId, idempotencyKey)` pair is stored on the Order and has a unique compound index. `[D12]`

---

## 7. Pricing Formula Summary

```
subtotal    = Σ (item.price × quantity)     [integers, minor units]
deliveryFee = restaurant.deliveryFee         [0 for pickup]
tax         = floor(subtotal × TAX_PERCENT / 100)
total       = subtotal + deliveryFee + tax
```

No discounts, coupons, or promotional calculations exist in v1. `[D20]`
