# Food Ordering & Restaurant Management Platform

A full-stack food ordering platform with multi-role access (customer, restaurant owner, admin), real-time order lifecycle management, and Stripe payment integration.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js 22, Express 4, MongoDB (Mongoose 8), Zod, Argon2id |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, React Router 6 |
| **Auth** | JWT (HS256, httpOnly cookie, 24h TTL) |
| **Payments** | Stripe (test mode, webhook signature verification) |
| **Testing** | Jest + Supertest (backend), Vitest + Testing Library (frontend) |
| **Deployment** | Docker + Docker Compose |

## Getting Started

### Prerequisites

- Node.js ≥ 22
- MongoDB 7 (or use Docker Compose)
- npm ≥ 10

### Local Development

**1. Clone and install dependencies**

```bash
git clone <repo-url>
cd food-ordering-platform

# Install server + client dependencies
npm run install:all
```

**2. Configure environment**

```bash
# Copy the example env file and fill in all values
cp server/.env.example server/.env
```

Required variables (see [`server/.env.example`](server/.env.example) for full list):

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Min 32-char random string |
| `FRONTEND_ORIGIN` | e.g. `http://localhost:3000` |
| `APP_TIMEZONE` | e.g. `Asia/Kolkata` |
| `CURRENCY` | ISO code, e.g. `INR` |
| `TAX_PERCENT` | Integer, e.g. `5` |
| `STRIPE_SECRET_KEY` | Stripe test secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe test webhook secret |

**3. Create the first admin user**

```bash
npm --prefix server run create-admin
```

**4. Start development servers**

```bash
# Terminal 1 — Backend (http://localhost:5000)
npm run dev:server

# Terminal 2 — Frontend (http://localhost:3000, proxied to backend)
npm run dev:client
```

---

## Running Tests

```bash
# All tests (backend + frontend)
npm test

# Backend only (Jest + Supertest + MongoMemoryServer)
npm run test:server

# Frontend only (Vitest + Testing Library)
npm run test:client
```

**Test counts:**
- Backend: **75 tests** across **13 suites**
- Frontend: **39 tests** across **6 suites**

---

## Production Deployment

### Using Docker Compose

**1. Create a `.env` file in the project root:**

```bash
MONGO_ROOT_PASSWORD=your_very_secure_mongo_password
JWT_SECRET=your_very_long_random_jwt_secret_minimum_32_chars
FRONTEND_ORIGIN=https://yourdomain.com
APP_TIMEZONE=UTC
CURRENCY=USD
TAX_PERCENT=5
PAYMENT_GATEWAY=stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**2. Build and start:**

```bash
docker compose up -d --build
```

**3. Create admin user:**

```bash
docker compose exec app node scripts/createAdmin.js
```

### Environment Variables Reference

All secrets are required with no fallback defaults. The app will exit with a descriptive error if any are missing.

---

## API Overview

| Area | Base Path |
|------|-----------|
| Auth | `POST /api/auth/register`, `/login`, `/logout` |
| Health | `GET /api/health` |
| Config | `GET /api/config` |
| Catalog | `GET /api/restaurants`, `GET /api/restaurants/:id/menu` |
| Search | `GET /api/search/items` |
| Cart | `GET/POST/DELETE /api/cart` |
| Checkout | `POST /api/checkout/quote`, `POST /api/checkout` |
| Orders | `GET /api/orders`, `GET /api/orders/:id` |
| Payments | `POST /api/payments/webhook` |
| Profile | `GET/PUT /api/profile`, `/api/profile/addresses` |
| Notifications | `GET /api/notifications` |
| Restaurant | `PUT /api/restaurant/profile`, `/menu`, `/orders` |
| Admin | `GET /api/admin/users`, `/restaurants`, `/orders` |
| Uploads | `POST /api/uploads/image` |

Full API specification: [`document/docs/07-API-SPECIFICATION.md`](document/docs/07-API-SPECIFICATION.md)

---

## Project Structure

```
.
├── client/              # React 18 frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── components/  # Shared UI components
│   │   ├── context/     # AuthContext, ConfigContext
│   │   ├── pages/       # Route-level page components
│   │   ├── utils/       # API client, money formatter, date formatter
│   │   └── __tests__/   # Vitest test suites
│   └── vite.config.js
├── server/              # Express backend
│   ├── src/
│   │   ├── config/      # env.js (Zod validation), db.js
│   │   ├── controllers/ # Route handlers
│   │   ├── middleware/  # Auth, CORS, rate limit, error handler
│   │   ├── models/      # Mongoose schemas
│   │   ├── providers/   # Payment provider interface + Stripe
│   │   ├── routes/      # Express routers
│   │   ├── services/    # Business logic
│   │   ├── utils/       # AppError, asyncHandler, money helpers
│   │   ├── validators/  # Zod input schemas
│   │   ├── app.js       # Express app (exported for testing)
│   │   └── server.js    # Entry point (DB connect + listen)
│   └── tests/           # Jest integration test suites
├── document/docs/       # Full project documentation (38 docs)
├── Dockerfile           # Multi-stage production build
├── docker-compose.yml   # App + MongoDB
├── .github/workflows/   # GitHub Actions CI
└── .prettierrc          # Code formatting config
```

---

## Security Notes

- Passwords hashed with **Argon2id** (never bcrypt/MD5)
- JWT stored in **httpOnly cookie** only — never localStorage
- CORS restricted to `FRONTEND_ORIGIN` only
- All inputs validated with **Zod** before processing
- File uploads: magic-byte inspection + MIME whitelist (PNG, JPG, WebP only)
- Rate limiting: 100 req/15min global, 10 req/15min for auth
- Webhook signatures verified via **HMAC-SHA256**
- No secrets logged; no connection strings in logs
- Production rejects fake payment provider at startup

---

## Known Limitations

See [`document/docs/37-KNOWN-LIMITATIONS.md`](document/docs/37-KNOWN-LIMITATIONS.md) for the full list.

Key limitations:
- Stripe integration is in test/simulation mode (no live payments)
- No real-time push (WebSockets/SSE) — notifications are poll-based
- No email/SMS delivery for notifications (in-app only)
- Single-server deployment (no horizontal scaling / Redis session)
