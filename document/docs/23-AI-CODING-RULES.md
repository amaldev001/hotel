# 23 — AI Coding Rules

These rules are **mandatory** for all AI-assisted code generation in this project. They supersede general AI agent defaults where they conflict.

---

## 1. Core Fidelity Rules

1. **Read the master specification first** (`docs/00-MASTER-SPEC.md`) before generating any code.
2. **Treat documentation as source of truth.** Implementation must match what is written in `docs/`.
3. **Never invent requirements.** If a feature is not explicitly specified, do not implement it.
4. **Never invent API fields or endpoints.** Only implement what is documented in `docs/07-API-SPECIFICATION.md`.
5. **Never invent database fields or collection names.** Only implement schemas defined in `docs/06-DATABASE-DESIGN.md`.
6. **Never invent payment provider behavior.** Use only the payment flow documented in `docs/14-PAYMENT-INTEGRATION.md`.
7. **Never invent tax, fee, or refund rules.** Use only the formulas in `docs/13-CART-CHECKOUT.md` and `docs/14`.
8. **If a required decision is still TBD, stop and ask.** All 30 decisions are resolved (`docs/27`). If a new ambiguity surfaces, report it explicitly rather than guessing.

---

## 2. Scope & Change Rules

9. **Do not add features outside scope.** See `docs/01-PRD.md` §4.2 for the explicit v1 out-of-scope list.
10. **Do not silently replace stack components.** The tech stack is finalized in `docs/00-MASTER-SPEC.md` §3.
11. **Do not silently change API or database contracts.** Any change to a documented contract requires updating the relevant documentation file first.
12. **Do not weaken security controls to make tests pass.**
13. **Avoid unrelated file changes** in the same commit or PR as the feature being implemented.

---

## 3. Security Rules

14. **Never trust client-supplied prices, totals, roles, order statuses, or payment results.** These are always computed or verified server-side. `[D5]` `[BR-013]`
15. **Never commit credentials, API keys, or secrets** to source control in any form (including comments, strings, or `.env` files).
16. **All configuration must originate from validated environment variables.** Hardcoded fallback values for secrets are forbidden. Rate-limit defaults are acceptable. `[NFR-005]`
17. **Keep business logic server-side.** The frontend performs only UX validation; backend re-validates all inputs.
18. **Enforce resource ownership server-side.** A frontend route guard does not constitute authorization.

---

## 4. No Seed or Demo Data Rule

19. **No seed scripts, sample data, fixture loaders, or demo accounts** may be created anywhere in the codebase, database, or migration scripts.
20. **The only bootstrap mechanism is `scripts/createAdmin.js`** (the `npm run create-admin` CLI), which reads from environment variables and creates the first admin account only.
21. **Admin then creates restaurants** through the application (`POST /api/admin/restaurants`). No other data initialization path is permitted.
22. **Test suites set up and tear down their own data** within the test database. Test fixtures belong in test files, not in shared seed scripts.

---

## 5. Payment & Financial Rules

23. **All monetary values must be non-negative integers in minor units** (cents, paise). Never generate floating-point arithmetic for currency calculations. `[D4]`
24. **Use integer math for tax**: `Math.floor(subtotal * TAX_PERCENT / 100)`. `[D9]`
25. **Card data never touches application code.** Payment gateway integration uses provider-hosted checkout only. `[D11]`
26. **Webhook signature must be verified on the raw body** before any JSON parsing. `[D25]`
27. **Webhook idempotency is mandatory** — store and check `providerEventId` before processing any event. `[D25]`

---

## 6. Logging & Privacy Rules

28. **Never log personal data**: customer names, email addresses, phone numbers, or delivery addresses in operational (high-volume) log statements.
29. **Never log payment data**: card numbers, provider API keys, webhook signature secrets, or raw payment payloads.
30. **Never log passwords** (plain-text or hashed) or JWT tokens.
31. **Audit logs** (the `auditLogs` collection) may record actor IDs, action types, target IDs, and non-PII metadata. They must not contain the above sensitive data either.

---

## 7. Completion Definition

A feature is **not complete** until ALL of the following are true:
- Backend: route, validation, authorization, service logic, persistence, and error handling implemented.
- Frontend: component rendering, loading/empty/error states, and form validation implemented.
- Tests: Jest/Supertest tests for backend; Vitest tests for frontend component.
- Documentation: `docs/24-TRACEABILITY-MATRIX.md` updated with new rows.
- Linting: `npm run lint` passes with zero errors on both `server/` and `client/`.
- Tests: `npm test` passes with zero failures on both `server/` and `client/`.

---

## 8. Ambiguity Protocol

| Situation | Action |
|---|---|
| Explicitly documented requirement | Implement exactly as documented |
| Resolved decision (DEC-001..030, D1..D22) | Follow the resolution in `docs/27-OPEN-DECISIONS.md` |
| Neither documented nor resolved | Mark as TBD, stop, and ask the user before proceeding |
| Conflicting documentation | Report the conflict explicitly; do not guess |

---

## 9. Reporting Requirements

After every implementation task, report:
- Files changed (paths)
- Tests executed (commands run)
- Test results (pass/fail counts)
- Known limitations or deviations from the spec
- Any unresolved TBDs encountered
