# Food Ordering & Restaurant Management Platform
## Complete Implementation Documentation Pack

This is the implementation source of truth for a full-stack food ordering ecosystem.

---

### Approved & Resolved Technology Stack

| Layer | Technology | Decision |
|---|---|---|
| **Frontend** | React.js, Vanilla CSS / CSS Modules | `[D21]` |
| **Backend** | Node.js + Express.js | `[D21]` |
| **Database** | MongoDB + Mongoose (**Replica Set required**) | `[NFR-012]` |
| **Authentication** | JWT in `httpOnly` cookie (`SameSite=Strict`, 1-day expiry), Argon2id | `[D19]` |
| **Payment Gateway** | `<RAZORPAY or STRIPE - EDIT ME>` — TEST mode, provider-hosted checkout | `[D11]` |
| **Image/File Storage** | Local volume adapter (JPEG, PNG, WebP; magic bytes; 2 MB max) | `[D20]` |
| **Production Hosting** | Provider-neutral Docker + Nginx reverse proxy + HTTPS | `[D21]` |
| **API Style** | REST / JSON | — |

### Approved Runtime Dependencies
`express`, `mongoose`, `jsonwebtoken`, `cookie-parser`, `argon2`, `zod`, `multer`, `helmet`, `express-rate-limit`, `<RAZORPAY or STRIPE SDK - EDIT ME>`

### Approved Dev/Test Dependencies
`jest`, `supertest`, `vitest`, `@testing-library/react`, `eslint`, `prettier`

---

### Actors

| Role | Created By | Notes |
|---|---|---|
| Customer | Self-registration | `[D1]` `[D2]` |
| Restaurant Owner | Admin via `POST /api/admin/restaurants` | `mustChangePassword=true` `[D2]` `[D3]` |
| Administrator | `npm run create-admin` CLI script (env vars) | One per bootstrap `[D2]` |

---

### Important Implementation Rules

1. Anything not explicitly decided in these documents is **TBD**. An engineer or AI coding agent must not invent requirements.
2. **No seed, sample, demo or dummy data** anywhere in the codebase or database scripts. The only bootstrap is the `create-admin` script and admin-created restaurants.
3. All monetary values are **non-negative integers in minor units** — never floats. `[D4]`
4. The server **always recomputes** prices, totals, and taxes — client values are discarded. `[D5]`
5. MongoDB **Replica Set is required** in ALL environments including local development. `[NFR-012]`

---

### Reading Order

1. [`DOC-MAP.md`](./DOC-MAP.md) — find the right file for your concern
2. [`00-MASTER-SPEC.md`](./00-MASTER-SPEC.md) — product definition and global rules
3. [`01-PRD.md`](./01-PRD.md) — product requirements
4. [`02-SRS.md`](./02-SRS.md) — all requirement IDs
5. [`03-FUNCTIONAL-REQUIREMENTS.md`](./03-FUNCTIONAL-REQUIREMENTS.md) — acceptance criteria
6. [`04-ROLES-PERMISSIONS.md`](./04-ROLES-PERMISSIONS.md) — access matrix
7. [`27-OPEN-DECISIONS.md`](./27-OPEN-DECISIONS.md) — all 30 decisions resolved
8. Architecture / database / API documents (05, 06, 07)
9. Module documents (09–16)
10. Security / testing / deployment (18, 20, 21)
11. [`28-IMPLEMENTATION-CHECKLIST.md`](./28-IMPLEMENTATION-CHECKLIST.md) — build tracking
12. [`37-KNOWN-LIMITATIONS.md`](./37-KNOWN-LIMITATIONS.md) — v1 limitations
