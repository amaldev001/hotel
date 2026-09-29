# 33 — Operations, Monitoring & Backup

## 1. Health Check Endpoint

```
GET /api/health
```

Returns real-time readiness status. Used by load balancers, Docker health checks, and monitoring systems.

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "db": "connected",
  "replicaSet": "rs0"
}
```

Returns `503 Service Unavailable` if MongoDB is unreachable.

---

## 2. Application Logging

### Structured Log Fields
All log entries must include:
- `timestamp` (ISO 8601)
- `level` (`info`, `warn`, `error`)
- `requestId` — unique per HTTP request (attach via middleware)
- `userId` — authenticated user ID (not email or name)
- `method` + `path` + `statusCode` for HTTP logs

### Data That Must NEVER Appear in Logs `[NFR-011]`
- Passwords (plain-text or hashed)
- JWT tokens
- Payment gateway API keys
- Webhook signature secrets
- Raw webhook payloads
- Customer names, email addresses, phone numbers (in high-volume operational logs)
- Delivery addresses
- Payment card data of any kind

### Log Sanitization
Apply a log sanitizer middleware that strips or masks sensitive field names from log output before writing (e.g., redact `password`, `token`, `secret`, `authorization`, `cookie` field values).

---

## 3. Key Monitoring Metrics

| Metric | Alert Threshold |
|---|---|
| API error rate (5xx) | > 1% of requests over 5 minutes |
| API P95 response latency | > 2 seconds |
| MongoDB connection failures | Any failure in production |
| Payment webhook failures | > 2 consecutive failures |
| Order expiry job failures | Any failure (check job execution logs) |
| Authentication failure rate | > 50/min (potential brute force) |
| Application process crashes | Any crash (auto-restart + alert) |
| Upload directory disk usage | > 80% capacity |

---

## 4. Background Job Monitoring

The `OrderExpiryJob` must be observable:
- Log each run: count of orders found, count transitioned to `EXPIRED`, duration.
- Alert on job failure or if job has not run within 3 minutes.
- Job must be idempotent — safe to restart if process crashes mid-run.

---

## 5. Database Backup Strategy

### Requirements
- Production MongoDB Replica Set must have an automated daily backup.
- Backup retention: minimum 30 days (owner decision for longer retention, see `docs/37`).
- Backups must be stored in a separate location from the primary database host.
- Backup encryption at rest is required.

### Restore Procedure
1. Identify the target restore point (timestamp).
2. Restore to a staging environment first — never restore directly to production without verification.
3. Verify key data integrity (user accounts, recent orders, payment records).
4. Document the restore test result (date, duration, data integrity check result).

**A backup is not considered reliable until a restore test has been performed.**

---

## 6. Incident Response Process

| Step | Action |
|---|---|
| 1. Detect | Monitoring alert fires or user reports |
| 2. Assess | Identify scope — what is affected, since when |
| 3. Contain | Disable affected feature or route if safe to do so |
| 4. Recover | Apply fix, restore from backup if necessary |
| 5. Verify | Confirm recovery with smoke tests and monitoring |
| 6. Document | Write root cause analysis |
| 7. Improve | Implement corrective action to prevent recurrence |

### Payment Incident Protocol
If a payment discrepancy is suspected (duplicate charges, missed webhooks, incorrect amounts):
1. Do NOT manually modify the `payments` collection without a verified audit trail.
2. Retrieve the provider's event log for the relevant `providerOrderId`.
3. Compare with the platform's `payments` and `orders` collections.
4. Document all discrepancies before taking corrective action.
5. Admin refund trigger is the only supported correction mechanism. `[D16]`

---

## 7. File Storage Operations

- Upload directory (`UPLOAD_DIR` env) must be on a persistent volume — not container-ephemeral storage.
- Nginx serves the `/uploads/` path as a static alias to `UPLOAD_DIR`.
- File deletion is not supported in v1 (files persist even after soft-deleting a menu item). `[D26]`
- Monitor disk usage — alert at 80% capacity.
