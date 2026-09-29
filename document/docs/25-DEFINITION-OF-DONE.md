# 25 — Definition of Done

A feature is **Done** only when ALL of the following gates have been passed.

---

## Gate 1: Requirements

- [ ] Approved requirement exists (AUTH-xxx, CUS-xxx, RES-xxx, ADM-xxx, NFR-xxx).
- [ ] All acceptance criteria from `docs/03-FUNCTIONAL-REQUIREMENTS.md` are satisfied.
- [ ] No blocking TBD — all 30 decisions are resolved (`docs/27`).
- [ ] Zero seed, sample, demo, or dummy data created.

---

## Gate 2: Backend Implementation

- [ ] Route, controller, and service implemented.
- [ ] Zod validation schema covering all body / query / path parameters.
- [ ] Authorization middleware applied: authentication → account status → role → ownership.
- [ ] Resource ownership enforced server-side (not just client route guard).
- [ ] All business rules applied (state machine, min order, postal codes, quantity limits, etc.).
- [ ] Persistence via Mongoose model; no raw string query construction.
- [ ] All monetary values stored and returned as non-negative integers (minor units). `[D4]`
- [ ] Idempotency enforced where required (checkout, webhook). `[D12]` `[D25]`
- [ ] Error handled and returned via centralized error handler using canonical error codes. `[docs/17]`
- [ ] Audit log written for admin actions and order state changes. `[NFR-009]`

---

## Gate 3: Frontend Implementation

- [ ] Component renders all required states: Loading, Empty, Success, Validation Error, Server Error, Forbidden, Auth Expired, Not Found, Network Failure.
- [ ] API response values displayed; no client-side total computation.
- [ ] Form validation uses Zod or inline rules for UX only (backend re-validates).
- [ ] All user-supplied text rendered HTML-escaped (no `dangerouslySetInnerHTML` on untrusted content).
- [ ] Order tracking polling gated by `document.visibilityState === "visible"` and stops on terminal states. `[D15]`
- [ ] `mustChangePassword=true` users are redirected to change-password before other navigation.

---

## Gate 4: Security

- [ ] No secrets, tokens, or API keys in frontend source code.
- [ ] No sensitive data (passwords, tokens, card data, addresses, phone numbers) logged.
- [ ] File uploads validated by magic bytes, not file extension. `[D20]`
- [ ] Payment webhook verified on raw body before any JSON parsing. `[D25]`
- [ ] Rate limits applied to the relevant route.
- [ ] `PAYMENT_PROVIDER=fake` blocked in production. `[D11]`

---

## Gate 5: Testing

- [ ] Jest + Supertest backend integration tests covering the happy path, error codes, and authorization.
- [ ] Vitest component tests for frontend.
- [ ] State machine transitions tested for valid and invalid cases.
- [ ] Payment flow tested: online order-first sequencing, webhook idempotency, 15-minute expiry. `[D24]` `[D25]`
- [ ] `npm test` passes with **zero failures** on both `server/` and `client/`.
- [ ] `npm run lint` passes with **zero errors** on both `server/` and `client/`.

---

## Gate 6: Documentation

- [ ] `docs/24-TRACEABILITY-MATRIX.md` updated with new requirement rows.
- [ ] If API contract changed: `docs/07-API-SPECIFICATION.md` updated.
- [ ] If DB schema changed: `docs/06-DATABASE-DESIGN.md` updated.
- [ ] If new decision surfaced: `docs/27-OPEN-DECISIONS.md` updated or question raised.

---

## Gate 7: Delivery Report

The implementer must report:
- Files changed (paths).
- Test commands run and results (pass/fail counts).
- Known limitations or deviations from the specification.
- Any unresolved TBDs encountered.
