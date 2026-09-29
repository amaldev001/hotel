# 30 — API Contract Templates

Use this template for every endpoint in `docs/07-API-SPECIFICATION.md`. No endpoint is considered stable until its contract is fully documented in this format.

---

## Standard Endpoint Contract Template

```
METHOD /api/path
```

### Purpose
Describe exactly what the endpoint does in one to three sentences.

### Authentication
`Required` / `Not required`.
If required: JWT must be present in `httpOnly` cookie. Invalid or missing JWT → `401 UNAUTHORIZED`.

### Role
`Public` / `Customer` / `Restaurant Owner` / `Admin` / (multiple allowed).

### Ownership Rule
Describe which resource ownership constraint applies.
Example: `order.customerId === req.user._id` or `item.restaurantId === req.user.restaurantId`.
Write `None` for public or admin-only endpoints.

### Headers (if applicable)
```
Idempotency-Key: <uuid v4>     (required for checkout)
Content-Type: multipart/form-data   (required for uploads)
```

### Path Parameters
```
:id   ObjectId (24-char hex)
```

### Query Parameters
```
page    integer ≥ 1, default 1
limit   integer 1–100, default 20
status  string, enum value (optional filter)
```

### Request Body (JSON)
```json
{
  "field": "value"
}
```
Omit for GET / DELETE endpoints.

### Validation Rules
List all Zod constraints applied to body / query / params:
- `field`: required, string, 1–100 chars
- `price`: required, positive integer (minor units)
- `orderType`: required, enum `["delivery", "pickup"]`

### Success Response
```json
HTTP 200 OK
{
  "success": true,
  "data": {}
}
```
Or `201 Created` for creation endpoints.

### Paginated Response (for list endpoints)
```json
HTTP 200 OK
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

### Error Responses
List all error codes this endpoint can return:

| HTTP Status | Error Code | Condition |
|---|---|---|
| 400 | `INVALID_INPUT` | Schema validation failure |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Ownership or role mismatch |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT_CODE` | Business rule violation |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unhandled server error |

### Idempotency
`Required` (for checkout, webhooks) or `Not required`.
If required: describe the key source (e.g., `Idempotency-Key` header), the uniqueness scope (e.g., `customerId + idempotencyKey`), and repeat behavior (e.g., same response returned, no second order created).

### Side Effects
List all changes that occur as a result of this request:
- Database: Collections written to (create/update/delete)
- Notifications: Which notification types are created and for whom
- External provider: Whether a gateway API is called
- Audit log: Whether an `AuditLog` entry is written

### Security Notes
- Authorization checks applied (beyond standard middleware)
- Whether sensitive fields are stripped from response
- Whether raw body is required (webhook routes)
- Any PII that must not appear in logs

---

## Endpoint Contract File Rule

When documenting an endpoint:
1. Copy the template above.
2. Fill in all sections (do not leave any section as "TBD").
3. Add the completed contract to `docs/07-API-SPECIFICATION.md` under the appropriate group.
4. Update `docs/24-TRACEABILITY-MATRIX.md` with the requirement ID.

**No endpoint may be built without a completed contract.**

---

## Standard Error Codes Reference

See `docs/17-VALIDATION-ERROR-HANDLING.md` for the canonical error code registry and their HTTP status mappings. Always use codes from that registry; never invent new codes without adding them to `docs/17` first.
