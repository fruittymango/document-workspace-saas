# Project Name

A minimal multi-tenant “Document Workspace” for accounting firms. Each firm (tenant) has users who log in and work only with their firm’s documents.

## Tech Stack

- **Framework:** Next.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **Caching:** Upstash Redis
- **Payments:** PayFast

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

> **Important**
>
> Never commit your `.env` file or production credentials to source control.

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

## 2. Demo Data

Demo/sample data is seeded using Prisma's standard seed mechanism.

Run:

```bash
npx prisma db seed
```

This populates the database with sample entities suitable for development and testing.

---

## 3. Role Creation (Required)

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

3. Run database migrations.

```bash
npx prisma migrate dev
```

4. Create required database roles.

```bash
npm run seed:roles
```

5. Seed demo data (optional).

```bash
npx prisma db seed
```

6. Start the application.

```bash
npm run start
```

---

# Production Deployment

Recommended deployment order:

1. Configure production environment variables.
2. Run Prisma migrations.
3. Execute the role creation script.
4. Start the application.

Demo data should **not** be seeded in production unless explicitly required.

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

# Notes

- Lookup/reference data is managed through Prisma migrations.
- Demo data is optional and intended for development and testing.
- Database role creation is a required deployment step and should be run for every new environment.
- The role creation script is idempotent and can be safely re-run.
- Production secrets should be managed using your deployment platform's secret management rather than committed configuration files.
