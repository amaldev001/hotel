# 34 — Release Readiness Checklist

Complete every item before approving a production release. Items may not be waived without written justification.

---

## Product Gates

- [ ] All v1 requirements from `docs/02-SRS.md` implemented and tested.
- [ ] All acceptance criteria from `docs/03-FUNCTIONAL-REQUIREMENTS.md` verified.
- [ ] No blocking TBDs — all 30 decisions resolved (`docs/27-OPEN-DECISIONS.md`).
- [ ] `AUTH-005` / `AUTH-006` routes return `404` in production (confirmed by test).
- [ ] `PAYMENT_PROVIDER=fake` blocked in production (server startup test).
- [ ] No seed scripts, demo data, or test accounts present in the database.

---

## Code Quality Gates

- [ ] `npm run lint` passes with zero errors on `server/`.
- [ ] `npm run lint` passes with zero errors on `client/`.
- [ ] `npm run format:check` passes (Prettier) on both.
- [ ] `npm test` passes with **zero failures** on `server/`.
- [ ] `npm test` passes with **zero failures** on `client/`.
- [ ] Playwright E2E: customer order flow passes.
- [ ] Playwright E2E: restaurant fulfillment flow passes.
- [ ] Playwright E2E: admin cancel + refund flow passes.

---

## Security Gates

- [ ] JWT cookie flags confirmed: `httpOnly`, `SameSite=Strict`, `Secure`.
- [ ] Origin header check active on all state-changing routes.
- [ ] Helmet security headers present on all responses.
- [ ] Rate limiting active (auth, global, checkout).
- [ ] CORS configured to `CLIENT_URL` only (no wildcard).
- [ ] All secrets sourced from environment variables / secrets manager — none hardcoded.
- [ ] Payment webhook signature verification tested (valid + invalid signature).
- [ ] Webhook idempotency tested (duplicate event ID → no second state transition).
- [ ] File upload: SVG rejected, oversized file rejected, extension-mismatch accepted if magic bytes valid.
- [ ] No stack traces in API error responses (tested in staging).
- [ ] No passwords, tokens, or card data appearing in application logs (log review done).

---

## Data & Database Gates

- [ ] MongoDB Replica Set confirmed running in production environment.
- [ ] All required indexes confirmed present (`docs/31`).
- [ ] `explain("executionStats")` confirms IXSCAN on all primary query patterns.
- [ ] Unique indexes verified: `users.email`, `carts.customerId`, `payments.providerEventId`, `payments.providerOrderId`, `orders.(customerId+idempotencyKey)`.
- [ ] Restore test completed and documented: backup date, restore duration, data integrity confirmed.

---

## Payment Gates

- [ ] Payment gateway credentials are production (or production-TEST-mode) values.
- [ ] Webhook endpoint URL registered in payment provider dashboard.
- [ ] Webhook delivery confirmed in provider dashboard (test event received and processed).
- [ ] Order-first sequencing tested end-to-end: PAYMENT_PENDING → webhook → PLACED.
- [ ] 15-minute expiry job: tested with a forced-expired PAYMENT_PENDING order.
- [ ] Admin refund flow tested in staging against provider sandbox.

---

## Operations Gates

- [ ] `GET /api/health` returns `{ status: "ok" }` in production environment.
- [ ] Monitoring alerts configured for: 5xx rate, P95 latency, MongoDB connectivity, webhook failures, payment failures, process crashes.
- [ ] Expiry job health observable in logs.
- [ ] Upload directory on persistent volume (not container-ephemeral).
- [ ] HTTPS certificate valid and auto-renewal configured.
- [ ] Rollback procedure documented and tested on staging.

---

## Final Release Report

Record and sign off:

| Field | Value |
|---|---|
| Release version | |
| Release date | |
| Deployed by | |
| Known issues (if any) | |
| Outstanding limitations | See `docs/37-KNOWN-LIMITATIONS.md` |
| Rollback point / version | |
| Next review date | |
