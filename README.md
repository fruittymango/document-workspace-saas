# Docu-Fin — Multi-Tenant Document Workspace

A multi-tenant document workspace for accounting firms, built as a technical vetting submission. See SOLUTION.md for the full design rationale, trade-offs, and API contract.

## Project structure

```
.
├── backend/           # Next.js app — the complete client-facing implementation
│                      # (API routes + UI screens) for this submission
├── frontend/          # React + Vite — scaffolded placeholder only, not
│                      # built out yet (see frontend/README.md and
│                      # SOLUTION.md 8 for why)
├── e2e/               # Playwright end-to-end tests (see e2e/README.md)
├── SOLUTION.md
└── README.md          # this file
```

## Tech Stack

- **Framework:** Next.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **An Upstash Redis database** — used for rate limiting and idempotency
  (see [SOLUTION.md 5.3–5.5](./SOLUTION.md#53-rate-limiting-upstash-redis)).
  Upstash is HTTP-based, so a local `docker-compose` Redis container isn't a
  drop-in substitute — create a free Upstash database at
  [upstash.com](https://upstash.com) and use its REST URL/token, including
  for local development. (Credentials are provided with the env)
- **PayFast sandbox merchant credentials** — for the billing/checkout flow.
  Sign up for a PayFast sandbox account at
  [sandbox.payfast.co.za](https://sandbox.payfast.co.za) if you don't
  already have test credentials in your env.

---

# Prerequisites

Before running the application, ensure you are in the backend folder and have:

- Node.js (LTS recommended)
- npm, pnpm, or yarn
- PostgreSQL
- A `.env` file configured with the required environment variables

---

# Installation

```bash
npm install
```

---

# Environment Variables

Create a `.env` file in the project root.

| Variable                   | Description                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `MIGRATION_DATABASE_URL`   | Database connection used for Prisma migrations. Typically connects with elevated privileges. |
| `DATABASE_URL`             | Primary application database connection used by Prisma Client.                               |
| `PROD_APP_PASSWORD`        | Password used by the application database user in production.                                |
| `PROD_MIGRATION_PASSWORD`  | Password used by the migration database user in with elevated privileges.                    |
| `PROD_SYSTEM_PASSWORD`     | Password used by the system/administrative database user in production.                      |
| `JWT_SECRET`               | Secret used to sign and verify JWT tokens.                                                   |
| `UPSTASH_REDIS_REST_URL`   | Upstash Redis REST endpoint (for example: `https://....upstash.io`).                         |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST authentication token.                                                     |
| `APP_URL`                  | Base URL of the application (for example `http://localhost:3000`).                           |
| `PAYFAST_MODE`             | PayFast environment (use: `https://sandbox.payfast.co.za`).                                  |
| `PAYFAST_MERCHANT_ID`      | PayFast merchant ID.                                                                         |
| `PAYFAST_MERCHANT_KEY`     | PayFast merchant key.                                                                        |
| `PAYFAST_URL`              | PayFast endpoint URL.                                                                        |
| `PAYFAST_PASSPHRASE`       | PayFast passphrase.                                                                          |

---

# Database Setup

## Apply Migrations

```bash
npx prisma migrate dev
```

---

# Seeding

This project uses multiple seed processes, each with a different purpose.

## 1. Lookup Data

Lookup/reference data is seeded **during Prisma migrations**.

No manual execution is required after migrations have completed.

Examples include:

- Status tables
- Static lookup values
- Configuration records

---

## 2. Role Creation (Required)

The role creation script is separate from the standard Prisma seed.

Its purpose is to create the required application roles for both:

- Local environments
- Production environments

The script authenticates using credentials supplied in the environment variables and creates or updates the required database roles.

Run:

```bash
npm run seed:roles
```

This script should be executed:

- After a new database has been created
- During initial production deployment
- Whenever database roles need to be recreated

Unlike demo data, this script is intended for operational database setup and should be considered part of the deployment process.

---

## 3. Demo Data

Demo/sample data is seeded using Prisma's standard seed mechanism.

Run:

```bash
npx prisma db seed
```

This populates the database with sample entities suitable for development and testing.

---

## Seeded demo accounts

After seeding, two tenants exist specifically to demonstrate tenant
isolation — logging in as one and confirming you cannot see the other's
documents is the fastest way to sanity-check the core requirement:

| Tenant                  | Email                | Password    |
| ----------------------- | -------------------- | ----------- |
| `Bossman Trading`       | `themba@bossman.com` | `octro@123` |
| `Beacon Carrim Pty Ltd` | `carol@carrim.com`   | `octro@123` |

---

# Running the Application

```bash
npm run build
npm run start
```

---

# Typical Local Setup

1. Install dependencies.

```bash
npm install
```

2. Configure `.env`.

3. Create required database roles.

```bash
npm run seed:roles
```

4. Run database migrations.

```bash
npx prisma migrate dev
```

5. Seed demo data (optional).

```bash
npx prisma db seed
```

6. Build the application.

```bash
npm run buil
```

---

7. Start the application.

```bash
npm run start
```

---

# Project Scripts

Typical scripts may include:

```bash
npm run dev            # Start development server
npm run build          # Build application
npm run start          # Start production server
npm run seed:roles     # Create/update database roles
npx prisma db seed     # Seed demo data
npx prisma migrate dev
npx prisma migrate deploy
```

---

# End-to-end tests (Playwright)

See [`e2e/README.md`](./e2e/README.md) for full setup. Quick version:

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
npx playwright test
```

Requires the app running (locally or via Docker) and seeded (optionally the
`E2E_*` environment variables from `e2e/README.md` pointing at your demo
accounts above).

# Troubleshooting

- **`PrismaClientInitializationError` / schema out of sync** — run
  `npx prisma generate` after pulling changes that touch
  `prisma/schema.prisma`, and re-run `npx prisma migrate deploy` if new
  migrations were added.
- **Port already in use** — `[document your actual ports; e.g. "another
process on 3000/5432 — stop it or change PORT / docker-compose's port
mapping."]`
- **PayFast webhook never fires locally** — PayFast needs a **publicly
  reachable URL** to POST its callback to; `localhost` isn't reachable from
  PayFast's servers. For local testing, tunnel your local server with
  something like `ngrok http 3000 --host-header="localhost:3000"` (or Cloudflare Tunnel, since Cloudflare
  is already in the stack) and point your PayFast sandbox app's webhook URL
  at the tunnel's public address instead of `localhost`.
- **Upstash rate limiting errors on every request** — double-check
  `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are for an actual
  Upstash database, not a local Redis instance — the client speaks
  Upstash's REST protocol, not the standard Redis wire protocol, so a local
  `redis-server` won't respond correctly even on the right port.

---

# Notes

- Lookup/reference data is managed through Prisma migrations.
- Demo data is optional and intended for development and testing.
- Database role creation is a required deployment step and should be run for every new environment.
- The role creation script is idempotent and can be safely re-run.
- Production secrets should be managed using your deployment platform's secret management rather than committed configuration files.
