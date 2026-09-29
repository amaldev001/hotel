# 22 — Development Workflow

## 1. Local Environment Setup

### Prerequisites
- Node.js LTS
- Docker (for MongoDB Replica Set)
- MongoDB with Replica Set (see `docs/21` — required for transactions)

### First-time Setup
```bash
# 1. Clone repository
git clone <repo>

# 2. Copy env example
cp server/.env.example server/.env
# Edit server/.env with development values (NEVER commit .env)

# 3. Start MongoDB Replica Set via Docker
docker compose up -d mongo

# 4. Install server dependencies
cd server && npm install

# 5. Bootstrap first admin account
npm run create-admin
# Reads ADMIN_NAME, ADMIN_EMAIL, ADMIN_PHONE, ADMIN_PASSWORD from .env

# 6. Install client dependencies
cd ../client && npm install

# 7. Start development servers
# Terminal 1:
cd server && npm run dev
# Terminal 2:
cd client && npm run dev
```

> [!IMPORTANT]
> No seed scripts. No demo data. The only bootstrap is `npm run create-admin`. Admin must create restaurants through the application. `[D2]`

---

## 2. Feature Development Sequence

For every feature:
1. Read all relevant documentation files in `docs/`.
2. Identify cross-cutting requirements (auth, validation, ownership, idempotency).
3. Confirm no blocking TBDs — if any remain, stop and resolve before implementing.
4. Implement service layer first (business logic, unit-testable).
5. Add Zod validation schema.
6. Wire up route → controller → service.
7. Add authorization middleware.
8. Implement frontend component.
9. Write Jest/Supertest integration tests (backend) and Vitest component tests (frontend).
10. Run: `npm run lint && npm test` — both must pass with zero errors.
11. Review for security gaps (see `docs/18` checklist).
12. Update `docs/24-TRACEABILITY-MATRIX.md` with new entries.
13. Report: files changed, tests run, results, limitations.

---

## 3. Code Quality Gates

All pull requests must pass before merge:

```bash
# Backend
cd server
npm run lint          # ESLint — zero errors
npm run format:check  # Prettier — zero formatting issues
npm test              # Jest — zero failures

# Frontend
cd client
npm run lint          # ESLint — zero errors
npm run format:check  # Prettier
npm test              # Vitest — zero failures
```

---

## 4. Build Sequence (Implementation Order)

```
Phase 1: Foundation
  → Database models + indexes
  → Env config validation
  → Error handler middleware
  → create-admin script

Phase 2: Authentication
  → Register, login, logout, /auth/me, change-password
  → JWT cookie middleware
  → Authorization middleware
  → Rate limiting

Phase 3: Restaurant & Menu
  → Admin: create restaurant + owner
  → Restaurant: profile, operating hours, settings
  → Menu categories, menu items, soft-delete
  → File upload adapter

Phase 4: Discovery & Cart
  → Public restaurant listing + search
  → Cart CRUD (single restaurant, limits)
  → Address management

Phase 5: Checkout & Payments
  → Checkout quote (POST /checkout/quote)
  → Order placement + idempotency
  → Payment adapter (provider integration)
  → Webhook endpoint + raw body + signature
  → Order expiry background job

Phase 6: Order Management
  → State machine transitions
  → Notification creation
  → Audit logging
  → Admin cancel + refund

Phase 7: Admin & Notifications
  → Admin user/restaurant management
  → Admin dashboard
  → Notification list/read endpoints

Phase 8: QA & Hardening
  → Full test suite execution
  → E2E tests (Playwright)
  → Security review
  → Deployment configuration
```

---

## 5. Git Conventions

- Focused commits with meaningful messages describing the "why."
- No credentials, `.env` files, or personal tokens in commits.
- Do not combine unrelated refactors with feature work in one commit or PR.
- Branch naming: `feat/`, `fix/`, `docs/`, `chore/` prefixes.
