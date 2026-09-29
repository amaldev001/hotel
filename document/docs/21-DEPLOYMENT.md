# 21 — Deployment Specification

## 1. Hosting Model `[D21]`

Provider-neutral. All deployment targets use:
- **Docker** containers for the API server.
- **Environment variable** based configuration (no config files committed to source control).
- **HTTPS** terminated at a reverse proxy (Nginx recommended) — application server speaks HTTP internally.
- **MongoDB Replica Set** required in ALL environments (development, staging, production) for transaction support. `[NFR-012]`

---

## 2. Environments

| Environment | Purpose |
|---|---|
| `development` | Local developer machines; fake payment provider allowed; HTTP acceptable |
| `test` | CI/CD test runs; isolated test database; fake payment provider allowed |
| `staging` | Pre-production; real payment in TEST/sandbox mode; HTTPS required |
| `production` | Live system; real payment in TEST or LIVE mode per owner decision; HTTPS required |

---

## 3. Environment Variable Table

All variables are NAMES only. Values are never committed to source control or documentation.

### Server

| Variable Name | Required | Purpose |
|---|---|---|
| `NODE_ENV` | Yes | `development` / `test` / `staging` / `production` |
| `PORT` | Yes | Express listen port |
| `MONGODB_URI` | Yes | MongoDB connection string (must include replica set name) |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 random bytes) |
| `CLIENT_URL` | Yes | Allowed CORS origin and Origin header check value |
| `COOKIE_NAME` | No | Cookie name override (default: `auth_token`) |
| `APP_TIMEZONE` | Yes | IANA timezone identifier e.g. `America/New_York` `[D22]` |
| `CURRENCY` | Yes | ISO 4217 currency code e.g. `USD` `[D4]` |
| `TAX_PERCENT` | Yes | Tax rate as decimal string e.g. `5` = 5% `[D9]` |
| `PAYMENT_PROVIDER` | Yes | `razorpay` / `stripe` / `fake` (fake only in non-production) `[D11]` |
| `PAYMENT_SECRET_KEY` | Yes | Provider API secret key |
| `PAYMENT_WEBHOOK_SECRET` | Yes | Provider webhook signature secret `[D25]` |
| `UPLOAD_DIR` | Yes | Absolute path to local file upload volume |
| `MAX_FILE_SIZE_MB` | No | Override max upload size (default: 2) `[D20]` |
| `RATE_LIMIT_WINDOW_MS` | No | Global rate limit window in ms (default: 900000) |
| `RATE_LIMIT_MAX` | No | Global rate limit max requests (default: 200) |
| `AUTH_RATE_LIMIT_MAX` | No | Auth-specific rate limit (default: 10) |

### Bootstrap Script (create-admin)

| Variable Name | Required | Purpose |
|---|---|---|
| `ADMIN_NAME` | Yes | Initial admin display name |
| `ADMIN_EMAIL` | Yes | Initial admin email |
| `ADMIN_PHONE` | Yes | Initial admin phone |
| `ADMIN_PASSWORD` | Yes | Initial admin password (10–128 chars) |

> [!CAUTION]
> `ADMIN_PASSWORD` and all `*_SECRET*` and `*_KEY` variables are sensitive credentials. They must be supplied via a secrets manager (e.g. Docker secrets, cloud secret manager) and NEVER stored in `.env` files committed to version control, docker-compose files, or documentation.

---

## 4. MongoDB Replica Set Requirement `[NFR-012]`

MongoDB transactions (used for atomic order + cart operations, restaurant + user creation, etc.) require a **Replica Set**. This applies to ALL environments:

- **Local development**: Use a MongoDB Replica Set Docker image (e.g., `bitnami/mongodb` with `MONGODB_REPLICA_SET_MODE=primary`) or `mongod --replSet rs0`.
- **Docker Compose**: Include a replica set configuration in `docker-compose.yml`.
- **CI/CD**: GitHub Actions / CI runner must provision a replica set MongoDB service.
- **Production**: Use a managed MongoDB service with replica sets (e.g., MongoDB Atlas M10+) or self-hosted replica set.

The server startup script MUST verify replica set availability before accepting HTTP requests. If the replica set is unavailable, the server exits with a non-zero code.

---

## 5. Docker Compose Structure (Reference)

```yaml
# Reference structure only — not a committed production file
services:
  api:
    build: ./server
    environment: []         # All variables from env file or secrets manager
    volumes:
      - uploads_volume:/app/uploads
    depends_on: [mongo]

  client:
    build: ./client
    depends_on: [api]

  mongo:
    image: bitnami/mongodb:latest
    environment:
      MONGODB_REPLICA_SET_MODE: primary
      MONGODB_REPLICA_SET_NAME: rs0
    volumes:
      - mongo_data:/bitnami/mongodb

  nginx:
    image: nginx:alpine
    ports: ["443:443", "80:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
      - uploads_volume:/var/www/uploads   # Serve static uploads

volumes:
  uploads_volume:
  mongo_data:
```

---

## 6. Production Release Checklist

- [ ] All environment variables set via secrets manager (no hardcoded values)
- [ ] `NODE_ENV=production` confirmed
- [ ] `PAYMENT_PROVIDER` is NOT `fake`
- [ ] MongoDB Replica Set connected and confirmed
- [ ] HTTPS configured on reverse proxy with valid TLS certificate
- [ ] CORS `CLIENT_URL` set to production frontend domain
- [ ] JWT_SECRET is min 32 cryptographically random bytes
- [ ] Rate limits configured
- [ ] File upload volume mounted and writable
- [ ] `npm test` passes with zero failures
- [ ] ESLint passes with zero errors
- [ ] No seed scripts, test data, or demo accounts in the database
- [ ] Webhook endpoint URL registered with payment provider
- [ ] `POST /api/health` returns `{ status: "ok" }`
- [ ] Monitoring and logging configured (no PII in logs)
- [ ] Database backup procedure verified
