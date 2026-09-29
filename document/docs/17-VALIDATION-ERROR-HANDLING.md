# 17 — Validation, Errors & API Consistency

## 1. Validation Strategy

All incoming HTTP request data (body, query, path params) is validated using **Zod** schemas before reaching the controller layer. The validation middleware runs after authentication and before authorization.

### Validated Data Types
- Types (string, number, boolean, ObjectId)
- Required fields
- String lengths and pattern constraints
- Numeric ranges (integers, min/max)
- Enum values
- Array sizes (cart max 30 items, addresses max 5)
- Monetary values (must be non-negative integers)
- Pagination params (`page ≥ 1`, `limit 1–100`)
- File upload magic bytes and size (in upload middleware)
- ObjectIds (24-character hex)

---

## 2. Canonical Error Code Registry

All error codes are stable machine-readable strings. HTTP status codes follow standard categories.

| Error Code | HTTP Status | Meaning |
|---|---|---|
| `INVALID_INPUT` | 400 | Zod schema or type validation failure |
| `FILE_TOO_LARGE` | 400 | Upload exceeds 2 MB `[D20]` |
| `INVALID_FILE_TYPE` | 400 | Upload is not JPEG/PNG/WebP (magic byte check) `[D20]` |
| `MIN_ORDER_NOT_MET` | 400 | Cart subtotal < restaurant minOrderAmount `[D9]` |
| `OUT_OF_SERVICE_AREA` | 400 | Delivery address postal code not in servicePostalCodes `[D28]` |
| `CART_LIMIT_EXCEEDED` | 400 | Cart has 30 items, or item quantity > 20 `[D6]` |
| `MAX_ADDRESSES_REACHED` | 400 | Customer already has 5 saved addresses `[D22]` |
| `PAYMENT_AMOUNT_MISMATCH` | 400 | Webhook amount ≠ order total `[D25]` |
| `INVALID_WEBHOOK_SIGNATURE` | 400 | Webhook HMAC verification failed `[D25]` |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `ACCOUNT_SUSPENDED` | 403 | Authenticated user is suspended |
| `FORBIDDEN` | 403 | Insufficient role or ownership violation |
| `NOT_FOUND` | 404 | Requested resource does not exist |
| `ITEM_NOT_FOUND` | 404 | Menu item not found or soft-deleted |
| `EMAIL_ALREADY_REGISTERED` | 409 | Duplicate email on registration |
| `CART_RESTAURANT_MISMATCH` | 409 | Cart item from a different restaurant `[D6]` |
| `RESTAURANT_NOT_ELIGIBLE` | 409 | Restaurant suspended, not accepting orders, or outside hours |
| `ITEM_UNAVAILABLE` | 409 | Menu item isAvailable=false at checkout |
| `INVALID_STATE_TRANSITION` | 409 | Order state machine transition is not allowed |
| `IDEMPOTENCY_CONFLICT` | 409 | Same Idempotency-Key with different request payload `[D12]` |
| `PAYMENT_FAILED` | 402 | Provider-side payment failure |
| `RATE_LIMITED` | 429 | Rate limit exceeded for this IP/user |
| `INTERNAL_ERROR` | 500 | Unhandled server error |

---

## 3. Standard Response Envelopes

### Success
```json
{
  "success": true,
  "data": {}
}
```

### Paginated Success
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Password must be at least 10 characters",
    "details": {
      "field": "password"
    }
  }
}
```

---

## 4. Centralized Error Handler

All errors must flow through a single Express error middleware. The handler:
1. Maps known application error types to the canonical codes above.
2. Strips stack traces from responses in all environments.
3. Strips raw MongoDB or provider error messages from responses.
4. Returns `INTERNAL_ERROR` (500) for any unhandled exception.
5. Logs the original error internally (with request ID, user ID) for debugging — without logging sensitive data.

---

## 5. Non-Negotiable Rules

1. **Stable codes over human messages** — `error.code` is the contract; `error.message` is informational and may change.
2. **No stack traces in responses** — in any environment (development or production).
3. **No secrets in responses** — JWT signing key, payment secrets, webhook secrets must never appear.
4. **No raw provider errors** — wrap all gateway/provider errors into platform error codes before responding.
5. **Correct HTTP status categories** — 4xx for client errors, 5xx for server faults.
6. **Consistent envelope** — every response, success or error, follows the defined shapes above.
