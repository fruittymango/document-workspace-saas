# SOLUTION.md

## 1. Overview

This repository implements the Multi-Tenant Document Workspace described in
the assignment brief, plus a set of extensions built on top of the core
requirement.<a href="https://www.loom.com/share/900706163b994a2ab2ba3dfbb4c4dfde" target="_blank">(Project Walkthrough Video)</a>

- **Backend**: Next.js (Pages Router), TypeScript,
  PostgreSQL. Implements both the REST API and the client-facing screens for
  this submission.
- **Frontend**: a separate React + TypeScript (Vite) app, scaffolded but not
  yet built out — see (#8-frontend-status--whats-where-right-now) for
  exactly what that means and why.

**Why Next.js for the core deliverable:** the brief asks for a Node.js +
TypeScript backend and a React frontend as two things, but doesn't require
them to be two separate codebases. Given the time box, I chose one Next.js
codebase over a split Express API + separate SPA to reduce integration
surface area (no CORS, no cross-origin cookie configuration, one deployable)
— documented here as a deliberate trade-off, not an oversight. The API is
still implemented as real Next.js Route Handlers (`app/api/**/route.ts`),
which are ordinary HTTP endpoints under the hood — so the same backend can
serve the separate `frontend/` React app later without any rework; see the
[API contract](#6-api-contract) below.

---

## 2. Core requirements — mapping to the brief **(core)**

| Requirement                                          | Status     | Where                                                      |
| ---------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| Node.js + TypeScript backend                         | ✅         | `backend/` (Next.js)                                       |
| PostgreSQL, DDL provided                             | ✅         | `prisma\migrations`                                        |
| Tenant, User, Document, DocumentStatus domain model  | ✅         | `prisma\generated\models`                                  |
| Login only, seeded user, secure password storage     | ✅         | `app\api\auth\login\route.ts`, seed: `prisma\seed.ts`      |
| All document endpoints tenant-scoped                 | ✅         | see [4](#4-tenant-isolation-core)                          |
| List documents + text search on title, no pagination | ✅         | `GET /api/protected/documents?search=`                     |
| Update document status                               | ✅         | `PATCH /api/protected/documents/:id/status`                |
| Create document (optional)                           | ✅         | `POST /api/protected/documents`                            |
| Parameterized queries, connection pool               | ✅         | Prisma (`provider-managed pool`)                           |
| Env-based configuration                              | ✅         | `.env.example` files, see [9](#9-environments--running-it) |
| React frontend: login + documents screens            | ⏳ partial | see [8](#8-frontend-status--whats-where-right-now)         |

I'm calling this out up front because [6](#6-beyond-the-brief--rbac-licensing--billing)
below adds a meaningful amount of scope past the brief, and I want the base
case to be trivially verifiable before a reviewer has to wade through the
extensions.

---

## 3. Domain model & schema

```sql
-- CreateEnum
CREATE TYPE "license_status" AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "billing_interval" AS ENUM ('monthly', 'annual');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'complete', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_status" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER NOT NULL,
    "seat_limit" INTEGER NOT NULL,
    "document_limit" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "billing_interval" "billing_interval" NOT NULL DEFAULT 'monthly',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_licenses" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "license_status" NOT NULL DEFAULT 'trialing',
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "trial_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_payments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "tenant_license_id" UUID,
    "plan_id" UUID NOT NULL,
    "m_payment_id" TEXT NOT NULL,
    "pf_payment_id" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZAR',
    "status" "payment_status" NOT NULL DEFAULT 'pending',
    "raw_itn_payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "license_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "code" TEXT NOT NULL,
    "screen" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "documents_tenant_id_idx" ON "documents"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE INDEX "tenant_licenses_tenant_id_idx" ON "tenant_licenses"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_licenses_current_period_end_idx" ON "tenant_licenses"("current_period_end");

-- CreateIndex
CREATE UNIQUE INDEX "license_payments_m_payment_id_key" ON "license_payments"("m_payment_id");

-- CreateIndex
CREATE INDEX "license_payments_tenant_id_idx" ON "license_payments"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "user_roles_tenant_id_idx" ON "user_roles"("tenant_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "document_status"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_licenses" ADD CONSTRAINT "tenant_licenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_licenses" ADD CONSTRAINT "tenant_licenses_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_payments" ADD CONSTRAINT "license_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_payments" ADD CONSTRAINT "license_payments_tenant_license_id_fkey" FOREIGN KEY ("tenant_license_id") REFERENCES "tenant_licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_payments" ADD CONSTRAINT "license_payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION get_user_for_auth(p_email TEXT)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  name TEXT,
  surname TEXT,
  email TEXT,
  password_hash TEXT,
  license_id UUID,
  license_status license_status,
  tenant TEXT,
  role_code TEXT,
  role_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.tenant_id,
    u.name,
    u.surname,
    u.email,
    u.password_hash,
    tl.id   AS license_id,
    tl.status AS license_status,
    t.name  AS tenant,
    r.code  AS role_code,
    r.name  AS role_name
  FROM users u
  JOIN tenants t ON t.id = u.tenant_id
  LEFT JOIN tenant_licenses tl
  ON tl.tenant_id = u.tenant_id
  AND tl.status IN ('trialing', 'active', 'past_due')
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  WHERE u.email = p_email;
END;
$$;

-- Strip access from everyone else
REVOKE ALL ON FUNCTION get_user_for_auth(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_for_auth(TEXT) TO prod_app_user;

ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY document_tenant_isolation_policy ON "documents"
AS RESTRICTIVE
USING ("tenant_id" = current_setting('app.current_tenant', true)::uuid);

CREATE OR REPLACE FUNCTION get_user_details(p_id UUID)
RETURNS TABLE (
  id UUID,
  tenant_id UUID,
  name TEXT,
  surname TEXT,
  email TEXT,
  license_id UUID,
  license_status license_status,
  tenant TEXT,
  role_code TEXT,
  role_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.tenant_id,
    u.name,
    u.surname,
    u.email,
    tl.id   AS license_id,
    tl.status AS license_status,
    t.name  AS tenant,
    r.code  AS role_code,
    r.name  AS role_name
  FROM users u
  JOIN tenants t ON t.id = u.tenant_id
  LEFT JOIN tenant_licenses tl
  ON tl.tenant_id = u.tenant_id
  AND tl.status IN ('trialing', 'active', 'past_due')
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  WHERE u.id = p_id;
END;
$$;

-- Strip access from everyone else
REVOKE ALL ON FUNCTION get_user_details(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_details(UUID) TO prod_app_user;

CREATE OR REPLACE FUNCTION create_tenant_and_user(
  p_tenant_name TEXT,
  p_user_name TEXT,
  p_user_surname TEXT,
  p_user_email TEXT,
  p_user_password_hash TEXT
)
RETURNS TABLE (
  id            UUID,
  tenant_id     UUID,
  name          TEXT,
  surname       TEXT,
  email         TEXT,
  password_hash TEXT,
  created_at    TIMESTAMP,
  is_new        BOOLEAN,
  role_code     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing  users%ROWTYPE;
  v_tenant_id UUID;
  v_new_user  users%ROWTYPE;
  v_owner_role_id UUID;
BEGIN
  -- 1. Existing user by email → return as-is, no tenant/role created.
  SELECT * INTO v_existing FROM users u WHERE u.email = p_user_email;

  IF FOUND THEN
    RETURN QUERY
    SELECT v_existing.id, v_existing.tenant_id, v_existing.name, v_existing.surname,
          v_existing.email, v_existing.password_hash, v_existing.created_at, FALSE,
          r.code
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_existing.id
    LIMIT 1;
    RETURN;
  END IF;

  -- 2. Look up the system 'owner' role once, up front.
  --    If it's missing, fail loudly rather than silently creating an ownerless account.
  SELECT r.id INTO v_owner_role_id
  FROM roles r
  WHERE r.code = 'owner' AND r.tenant_id IS NULL;

  IF v_owner_role_id IS NULL THEN
    RAISE EXCEPTION 'System role "owner" is not seeded';
  END IF;

  BEGIN
    INSERT INTO tenants (name) VALUES (p_tenant_name)
    RETURNING tenants.id INTO v_tenant_id;

    INSERT INTO users (tenant_id, name, surname, email, password_hash)
    VALUES (v_tenant_id, p_user_name, p_user_surname, p_user_email, p_user_password_hash)
    RETURNING * INTO v_new_user;

    INSERT INTO user_roles (user_id, role_id, tenant_id)
    VALUES (v_new_user.id, v_owner_role_id, v_tenant_id);

    EXCEPTION WHEN unique_violation THEN
      -- Race: someone else's request for this email won first.
      -- Savepoint rollback undoes the tenant + user + role_assignment above.

      SELECT v_existing.id, v_existing.tenant_id, v_existing.name, v_existing.surname,
            v_existing.email, v_existing.password_hash, v_existing.created_at, FALSE,
            r.code
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = v_existing.id
      LIMIT 1;

      RETURN QUERY
      SELECT v_existing.id, v_existing.tenant_id, v_existing.name, v_existing.surname,
            v_existing.email, v_existing.password_hash, v_existing.created_at, FALSE, 'owner'::TEXT;
      RETURN;
  END;

  RETURN QUERY
  SELECT v_new_user.id, v_new_user.tenant_id, v_new_user.name, v_new_user.surname,
       v_new_user.email, v_new_user.password_hash, v_new_user.created_at, TRUE,
       'owner'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION create_tenant_and_user(TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_tenant_and_user(TEXT, TEXT, TEXT, TEXT, TEXT) TO prod_app_user;

-- Seed: document statuses
INSERT INTO "document_status" ("status") VALUES ('draft'),  ('unassigned'), ('assigned'), ('awaiting_signature'), ('filed'), ('archived');

-- Seed: base permission for the billing screen (add more codes as you add screens)
INSERT INTO "permissions" ("code", "screen", "description") VALUES
    ('billing.view', 'billing', 'Can view billing/license info'),
    ('billing.manage', 'billing', 'Can purchase/change plans and view payment history'),
    ('dashboard.view', 'dashboard', 'Can view dashboard'),
    ('users.view', 'users', 'Can view users'),
    ('users.manage', 'users', 'Can add/update/delete users');

-- Seed: system roles
INSERT INTO "roles" ("code", "name", "is_system") VALUES
    ('owner', 'Owner', true),
    ('admin', 'Admin', true),
    ('member', 'Member', true);

-- Seed: plans roles
INSERT INTO "plans" ("code", "name", "description", "price_cents", "seat_limit", "document_limit") VALUES
    ('starter', 'Starter', 'For small practices getting organized.', 29, 3, 50),
    ('pro', 'Professional', 'For growing firms that need more room.', 99, 10, 500),
    ('ent', 'Enterprise', 'For large practices with unlimited scale.', 299, 0, 0);

-- Wire owner/admin to full billing access; members get none by default
INSERT INTO "role_permissions" ("role_id", "permission_id")
SELECT r.id, p.id FROM "roles" r, "permissions" p
WHERE r.code IN ('owner', 'admin') AND p.screen = 'billing';

```

**Indexes / search:** `ILIKE` with a
`(tenant_id, title)` index is the simplest defensible choice at this scale;

### 3.1 Data & seeding strategy — two deliberately different mechanisms

Seed data falls into two categories that are handled differently, on
purpose, because they have different lifecycles:

- **Reference/lookup data** — document statuses is a small lookup table with fixed rows, e.g.
  `document_statuses(id, label)`. Lookups tables DocumentStatus
  are easier to extend later without an `ALTER TYPE`, an `ENUM` is simpler
  and enforces validity at the column level but introduces technical debt. Either way, this data is
  **inserted as part of the migration itself**, not the seed script —
  because it isn't sample data, it's part of the schema's contract. The
  application would be broken without it in _any_ environment (dev, test,
  staging, prod), so it travels with the migration that introduces the
  table/type that depends on it, and is versioned/applied the same way
  schema changes are.

- **Demo/sample data** — tenants, users, a license, and sample documents —
  lives in `prisma/seed.ts` and is run via `npx prisma db seed`. This is explicitly **not** part of the schema
  contract: it's only meant for local development and demoing the
  submission, and would never be run against a real production database.
  Keeping it separate from the migrations means production deployments can
  run migrations alone (schema + required lookup/enum data) without any
  risk of demo tenants/users being created outside a dev environment.

**Why this split matters, not just for tidiness:** if demo users were seeded
in a migration, running migrations in any environment — including
production — would create them. Separating "data the schema requires to
function" from "data that helps a human look at the app" keeps the
migration path safe to run anywhere, while keeping the seed script's
obviously-fake demo data (`toni@ledger.com`, etc.) confined to
`prisma db seed`, a command nobody would run against production by
accident the way they might accidentally re-run migrations.

---

## 4. Tenant isolation **(core)**

This is the requirement the brief weights most heavily ("Prevent
cross-tenant data access at all times"), so it gets its own section rather
than being folded into the schema notes.

**Mechanism:**

- _Middleware-derived scoping:_ every document/license/user query is
  scoped by a `tenantId` resolved from the authenticated session — never
  from a request param, query string, or body. `getSession()` is the single place this is derived, and
  `createTenantPrismaClient` requires it as a mandatory
  argument, so omitting it is a type error rather than a runtime bug.
- _Postgres Row-Level Security:_ policies on `documents` (and
  `tenant_licenses/users`) enforce `tenant_id = current_setting(...)`
  at the database level, so even a query missing a `WHERE tenant_id = ...`
  clause cannot return another tenant's rows.

**What is NOT used for scoping, deliberately:** `tenantId` is never read
from anything the client controls (URL params, body fields) — always
derived server-side from the authenticated session/token.

**How this was verified:** An end to end integration test confirms that tenant A's session
cannot list, read, or update tenant B's documents by ID, even when the ID is
known/guessed.

---

## 5. Authentication, security & concurrency safeguards

### 5.1 Authentication — JWT, dual delivery

Auth is JWT-based rather than server-side sessions. The token is issued on
login and carries `[userId, tenantId, role, exp]` as signed claims. It's
delivered two ways depending on the caller:

- **Browser-initiated requests** (the Next.js app itself): the JWT is set
  as an **httpOnly, secure, sameSite cookie**. The browser attaches it
  automatically; JavaScript never has direct access to it, so it isn't
  readable by an XSS payload the way a `localStorage` token would be.
- **Non-browser callers** (API clients, the separate `frontend/` app once
  it's built and calling cross-origin, future integrations): the same JWT
  is accepted via `Authorization: Bearer <token>`, since those callers
  don't get cookies for free the way same-site browser requests do.

The verification middleware checks **both** sources and accepts whichever is
present — cookie first, header as fallback (or vice versa, but cookie first) — verifying signature and expiry either way, and
resolving `userId`/`tenantId`/`role` only from the verified claims, never
from anything else in the request.

**Worth naming as a trade-off:** JWTs are stateless, which is convenient
here (no session store to keep in sync across serverless/edge functions),
but that statelessness means a compromised or logged-out token can't be
revoked instantly the way deleting a session row can — it's valid until it
expires.

### 5.2 CORS & origin allowlisting

The API is configured with an explicit origin allowlist (`sandbox.payfast.co.za, process.env.APP_URL`)
rather than a wildcard, combined with `credentials: true` since cookie-based
auth requires it — a wildcard origin is incompatible with credentialed
requests in any case.

**One distinction worth being precise about in this doc**, since it's easy
to conflate and a reviewer may probe it: CORS is a **browser-enforced**
mechanism — it governs which origins a _browser_ is allowed to let
JavaScript call your API from. It does nothing for **server-to-server**
calls, like PayFast's webhook hitting your API directly — no browser is
involved in that request, so there's no CORS check to bypass or rely on.
The protection for the PayFast webhook endpoint specifically has to be
something else: verifying **PayFast's request signature** (and/or using an IP
allowlist from PayFast) against the payload, so an attacker
can't just POST a fake "payment succeeded" webhook at your endpoint.
PayFast also makes provision of an endpoint that we hit to verify the payload we receive through the itn.
So in this write-up: _"CORS restricts which browser origins can call the
API directly; the PayFast webhook is protected separately via signature
verification, since CORS doesn't apply to that server-to-server request."_

### 5.3 Rate limiting (Upstash Redis)

Rate limiting is implemented using **Upstash Redis** — a good fit here
since it's HTTP-based (no persistent TCP connection to manage), which
suits Next.js's serverless/edge execution model better than a
long-lived Redis client would.

- **Keyed by:** IP
- **Applied to:** all endpoints i.e., login, signup, checkout — the endpoints worth
  protecting from brute-force/abuse;
- **Algorithm:** sliding window
- **On limit exceeded:** `429 Too Many Requests`

### 5.4 Idempotency (signup, checkout & payfast itn recon)

The same Redis store backs idempotency handling for **checkout** and
**signup**, using the claim pattern: an idempotency key (client-supplied
for checkout via an `Idempotency-Key` header; [email-derived for signup —
see 5.5]) is atomically claimed with `SET NX`, the request hash is
compared on retry, and:

- same key + same payload → the original response is replayed, no duplicate
  charge/account created
- same key + different payload → `409 Conflict`

This matters most for **checkout**, where a network retry after a slow
response must never risk charging twice or creating two license records
for the same purchase attempt.

### 5.5 Race-condition handling on signup

Two identical signup requests arriving at (or near) the same instant cannot
both succeed and create duplicate accounts for the same email. The
mechanism: an atomic `SET NX` claim in Redis on a key like `signup-lock:{email}` before
the user-creation logic runs, so the second concurrent request sees the key
already claimed and returns a clear "signup already in progress" or "email
already in use" response, rather than both requests racing to `INSERT` and
one of them surfacing a raw database unique-constraint error to the client.

**Worth keeping regardless of the Redis lock:** a `UNIQUE` constraint on
`(tenant_id, email)` at the
database level, as the authoritative backstop. The Redis claim is a fast,
graceful _first line_ of defense that produces a clean error message and
avoids the DB even being hit twice — but Redis isn't the system of record,
and a claim can in principle expire or the process can crash between the
claim and the actual insert. The DB constraint is what makes a duplicate
genuinely impossible, not just unlikely. If the two mechanisms disagree, the DB constraint is what
should win, and the app should turn that constraint violation into the same
clean "email already in use" error rather than a raw 500

---

## 6. Beyond the brief — RBAC, licensing & billing

The brief scopes out "roles/permissions beyond tenant scoping." I extended
past that line deliberately, and want to be upfront about why rather than
let it look like scope creep that happened by accident:

> The role I'm applying for involves multi-tenant SaaS product work /

> > billing systems is actually true from the Job Description — I wanted to
> > demonstrate how I'd approach that beyond the minimum ask. The core
> > tenant-isolation requirement above is complete and independently
> > verifiable regardless of these extensions; everything in this section is
> > additive on top of it, not a substitute for it.

**What was added:**

- **Role-based access** — `owner`, `admin`, `member` roles per user,
  scoped within a tenant (not a cross-tenant privilege — an owner in Tenant
  A has no visibility into Tenant B). It's the one place RBAC and tenant isolation could
  interact badly if a role check is ever evaluated before/instead of the
  tenant check.
- **Licensing / billing via PayFast** — A user will submit a license to buy/upgrade. This triggers a purchase and we respond with a PayFast url the front end will use to direct the user to. Upon a successful payment, our PayFast callback endpoint is authenticated & verified (signature check), and the tenant is scoped the same way everything else is. We use the mPaymentId from the url parameters to find and update the payment status for that order. We then create/update the license for the tenant: updates only happens on tenant licenses were payments were not fulfilled immediately.
- **User management** — This is tenant-scoped
  user creation by an owner/admin, not open registration (only new users with a tenant can signup)
- **Owner/admin screens** — dashboard, billing, users.

**Risk this introduces, named honestly:** more surface area than the brief
asked for means more surface area for a tenant-isolation mistake to hide in
— particularly the licensing/payment tables and the user-management screens,
since those are new write paths that didn't exist in the minimal version.
The same mandatory-tenantId-argument pattern is applied to the licensing repository
functions too.

---

## 7. API contract

**Auth for all endpoints below (except `/login`, `/signup`, and the PayFast
webhook):** either an httpOnly cookie (set automatically for
browser-initiated requests) or an `Authorization: Bearer <jwt>` header (for
non-browser callers). See [5.1](#51-authentication--jwt-dual-delivery).

### Auth

```
POST   /api/auth/signup      { name, surname, email, password, tenantName }
                              -> { token }
                              [Idempotency-Key required — see 5.5]
                              429 if rate-limited, 409 if email already
                              claimed/in progress

POST   /api/auth/login       { email, password }
                              -> { token }
                              (sets httpOnly cookie; also returns the JWT
                              in the body for non-browser callers)

POST   /api/auth/logout
GET    /api/protected/user          -> { userId, tenantId, role, name, surname, email }
```

### Documents (core)

```
GET    /api/protected/documents?search=      -> { documents: [...] }   (tenant-scoped)
POST   /api/protected/documents              { title, status } -> { document }
PATCH  /api/protected/documents/:id/status   { status } -> { document }
```

### [Users / Licensing / Billing — extension]

```
GET    /api/protected/users            -> tenant-scoped user list
POST   /api/protected/users             { email, role } -> admin create
GET    /api/protected/admin/stats      -> dashboard analytics
GET    /api/protected/plans            -> available license plans
POST   /api/protected/plans/checkout   -> creates order and payment request url [Idempotency-Key required — see 5.4]
GET    /api/protected/billing          -> current tenant's license/plan state
POST   /api/payfast/                   -> PayFast callback — signature-verified,
                                   not CORS-protected (see 5.2); resolves
                                   tenant from the transaction record, not
                                   from any client-supplied field
```

**Error format:** `{ error: string }`, and the status codes in play:

- `400` validation
- `401` unauthenticated (missing/invalid/expired JWT, cookie or header)
- `403` forbidden/unauthorized
- `404` not-found — see [4](#4-tenant-isolation-core)
- `409` idempotency-key reused with a different payload, or a signup/checkout
  claim already in progress
- `422` schema validation failure
- `429` rate limit exceeded (login, signup, checkout — see
  [5.3](#53-rate-limiting-upstash-redis))

**Note on 403 vs 404:** if a `member` hits an admin-only route a 403 is returned (reveals the route exists)

---

## 8. Frontend status — what's where right now

- **`backend/` (Next.js)** contains the actual working client-facing
  screens for this submission: login, documents list + search + status
  control, [dashboard, billing, users screens].
- **`frontend/` (React + Vite, separate app)** is scaffolded (with skeleton files) — intended as the target for a later
  migration off the Next.js UI, consuming the API contract in 7.

Being explicit about this split matters because the brief asks for "a
React SPA" as Task 2 — I'm stating plainly that the Next.js app _is_ the
React implementation serving that requirement today, and `frontend/` is the
next-phase target, not a second/duplicate implementation.

---

## 9. Environments & running it

```
[cp .env.example .env, list required vars: DATABASE_URL, JWT_SECRET,
 UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, PAYFAST_MERCHANT_ID,
 PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE, etc.]

# Docker
docker compose up

# Or locally
npm install
npx prisma migrate deploy   # applies schema + the lookup/enum data that
                            # ships inside the migrations (see §3.1) —
                            # safe to run in any environment, including prod
npx prisma db seed          # runs prisma/seed.ts: demo tenant(s), a user,
                            # a license, sample documents — dev/demo only,
                            # never run this against production
npm run dev
```

Seeded data: `prisma/seed.ts` creates — at least one
tenant, one user (with role), a license record, several
documents across a couple of statuses — and the login credentials for the
demo. See [3.1](#31-data--seeding-strategy--two-deliberately-different-mechanisms)
for why this is split from the migration-applied lookup/enum data rather
than combined into one seed step.

**Environment isolation:** `.env`, `.env.test`, `.env.production`
— Credentials reserved for development vs Credentials reserved for testing vs. Credentials reserved for deployment.

---

## 10. Testing

**End-to-end tests** — Playwright, at repo root in `e2e/` (deliberately not
nested inside `backend/` or `frontend/`, since these tests exercise the
whole running system through a browser rather than one package's
internals — see `e2e/README.md`). Covers the brief's core objectives
against known seeded demo accounts: login (success and failure), the
document status lifecycle, search, and — the one weighted most heavily by
the brief — tenant isolation proven through the actual rendered UI, not
just at the API layer.

Example — the login test doesn't stop at checking the URL changed, since a
client-side redirect can update the address bar before the authenticated
layout has actually rendered:

```typescript
test("logs in with a known seeded user and reaches the documents screen", async ({
  page,
}) => {
  const login = new LoginPage(page);
  await login.goto();

  await login.login(TENANT_A_USER.email, TENANT_A_USER.password);

  await expect(page.getByTestId("nav-documents")).toBeVisible();
  await expect(page).toHaveURL(/\/documents/);
});
```

Run with:

```bash
npx playwright test
```

See `e2e/README.md` for full setup and usage.

---

## 11. Trade-offs & what I'd do with more time

Being honest about gaps is worth more here than pretending there are none:

- JWTs are stateless — there's no server-side revocation list yet, so
  a logged-out or compromised token remains technically valid until it
  expires. Given more time, I'd add either short-lived access tokens with a
  refresh token, or a lightweight Redis-backed denylist for the explicit
  logout/password-change case.
- Rate-limit thresholds for the API are initial guesses,
  not tuned against real traffic patterns — I'd want to revisit these with
  actual usage data before calling them production-ready.
- PayFast webhook signature verification is implemented but not
  covered by a test for the tampered-payload case.
- RBAC checks and tenant checks are both present but not fully implemented to extended the frontend etc.
- The separate `frontend/` React app is unbuilt — next step is
  building it against the API contract in §7, reusing nothing from the
  Next.js UI beyond the contract itself.
- Audit logs & Auth0 implementation
- **Internationalization — English and Afrikaans.** The UI, error messages,
  and any transactional copy (e.g. PayFast checkout confirmation) are
  English-only right now, with no locale layer under them. Given more time
  I'd add:
  - a strings layer (`next-i18next
per locale`) so every
    user-facing string is looked up rather than hardcoded, from day one
    rather than retrofitted later — retrofitting i18n after strings are
    scattered through JSX is far more work than building the lookup habit
    in from the start
  - a locale switcher, with the choice persisted per user (a column on
    `users`, not just a client-side cookie, so it's a real user preference
    rather than a per-browser one)
  - `Accept-Language`-based default locale detection on first visit, with
    the explicit user preference always taking precedence once set
  - locale-aware date/number formatting (`Intl.DateTimeFormat` /
    `Intl.NumberFormat`) for document timestamps and billing amounts —
    worth calling out separately from string translation, since it's easy
    to translate all the labels and still leave dates/currency rendered in
    one fixed format regardless of locale
  - server-rendered error messages (validation errors, the generic
    login-failure message, rate-limit/idempotency-conflict responses) also
    need a translated counterpart, not just the static UI text — otherwise
    an Afrikaans-speaking user gets a translated screen with an English
    error message the first time something goes wrong

  Afrikaans specifically because I am of the view that the Afrikaans speaking population has a good stake in the market and this added feature will sell with them.

---

## 12. Why this approach, relative to the role

**Docu-Fin's own module list overlaps directly with what I built past the
minimum**, not by coincidence: _Multi-tenancy_, _Document Management_,
_User Permissions_, and _Billing_ are named as current platform modules,
and are exactly the four areas [6](#6-beyond-the-brief--rbac-licensing--billing)
extends into.

None of the above changes what [2](#2-core-requirements--mapping-to-the-brief-core)
and [4](#4-tenant-isolation-core) already demonstrate on their own — this
section is about where I chose to spend time _beyond_ that baseline, and
why those particular choices weren't arbitrary given what Docu-Fin is
actually building.
