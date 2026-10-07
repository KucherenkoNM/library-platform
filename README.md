# «Читай!» — Library Management Platform

Production-oriented multi-tenant library management platform. The repository contains the completed **Stage 0** foundation plus **Stage 1 — data and multi-tenancy** from `docs/implementation-plan.md`.

## Current implementation status

### Stage 0 — completed and manually verified

- pnpm monorepo;
- React 19 + TypeScript + Vite frontend;
- NestJS + TypeScript API;
- PostgreSQL, Redis and S3-compatible object storage in Docker Compose;
- Prisma, Tailwind/shadcn baseline, ESLint/Prettier;
- Zod environment validation;
- Swagger/OpenAPI;
- liveness/readiness checks;
- structured Pino logging;
- CI baseline.

The local object-storage container uses `soldevelo/minio:2025.7.23`. The development bucket is created through `MINIO_DEFAULT_BUCKETS`; there is no separate `minio-init` service.

### Stage 1 — implemented, pending owner manual gate

Data foundation:

- `Library`;
- `Branch`;
- `User`;
- `Role` / `Permission`;
- `UserRole` / `RolePermission`;
- `LibrarySettings`;
- `CirculationRule`;
- append-oriented `AuditLog`;
- Stage 1 Prisma migration with tenant/index constraints.

Multi-tenancy/RBAC foundation:

- request-scoped server tenant context;
- reusable tenant-scoped repository base convention;
- tenant-safe `BranchesRepository` reference implementation;
- canonical permission codes;
- DB-backed effective permission resolver;
- `@RequirePermissions(...)` metadata and `PermissionGuard`;
- tenant-isolation integration tests against PostgreSQL.

Seed:

- canonical permissions from the architecture document;
- system role templates: Administrator, Librarian, Cataloger and Manager;
- demo library;
- two demo branches;
- library settings and a demo default circulation rule;
- tenant-owned Administrator role;
- demo admin employee assigned to that tenant role.

Authentication, login, refresh tokens and route protection are **not** implemented here because they belong to Stage 2. The Stage 1 context/guard foundation is designed for the Stage 2 authentication guard to populate the trusted `TenantContextService`.

## Canonical documentation

Read before further implementation:

1. `docs/prd.md`
2. `docs/architecture.md`
3. `docs/implementation-plan.md`
4. `docs/screens.md`
5. `docs/user-flows.md`
6. `docs/consistency-audit.md`
7. `docs/development-prompt.md`

Canonical Staff routes use `/staff/*`. Public catalog routes use `/` and `/catalog/*`. Reader Account Full v1 uses `/reader/*`.

## Prerequisites

Target local environment:

- Node.js 24 LTS;
- Corepack;
- pnpm 12.10.0;
- Docker Desktop / Docker Compose.

The package engine range also permits compatible Node 22.12+ environments, but Node 24 LTS is the verified target line from the Stage 0 handoff.

## Local setup

PowerShell:

```powershell
Copy-Item .env.example .env
corepack enable
corepack prepare pnpm@12.10.0 --activate
pnpm install
docker compose up -d
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm prisma:seed
```

Then run:

```powershell
pnpm dev
```

## Local URLs

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Liveness: `http://localhost:3000/health/live`
- Readiness: `http://localhost:3000/health/ready`
- Object-storage console: `http://localhost:9001`

`/health/ready` is healthy only when PostgreSQL, Redis and the configured S3 bucket are reachable.

## Database workflow

Validate and generate Prisma client:

```powershell
pnpm prisma:validate
pnpm prisma:generate
```

Development migration:

```powershell
pnpm prisma:migrate:dev
```

Seed Stage 1 data:

```powershell
pnpm prisma:seed
```

The seed is idempotent for its canonical permissions/templates and demo tenant records. Demo circulation numbers are demonstration values, not hard-coded product defaults.

Never edit production schema manually outside migrations.

## Testing and quality gates

Unit tests:

```powershell
pnpm test
```

Database-sensitive tenant isolation tests require PostgreSQL with Stage 1 migrations applied:

```powershell
pnpm test:integration
```

Full Stage 1 local gate:

```powershell
pnpm install
docker compose up -d
docker compose ps
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate:dev
pnpm prisma:seed
pnpm typecheck
pnpm lint
pnpm test
pnpm test:integration
pnpm build
```

`pnpm check` covers Prisma validation, typecheck, lint, unit tests, tenant integration tests and build. Infrastructure, migrations and seed must already be prepared before running it.

## Tenant/RBAC implementation convention

- `Library` is the tenant.
- A client-provided `libraryId` is never authorization input.
- Stage 2 authentication will establish `{ userId, libraryId }` in `TenantContextService` from verified server-side identity.
- Tenant-owned repositories extend `TenantScopedRepository` or follow the same convention: every read/write filter receives `libraryId` from trusted context, applied by the repository itself.
- Backend authorization uses permission codes, not hard-coded role-name checks.
- System roles are templates. The demo employee receives a tenant-owned Administrator role copied from the system template.
- Frontend permission hiding will remain UX-only; protected actions require backend guards.

See `docs/stage-1-verification.md` for the Stage 1 handoff and verification checklist.

## Environment rules

`.env.example` contains development-only example values. Real secrets must never be committed. In production, inject configuration through the deployment platform or a secret manager.

## Architecture guardrails

- `Library` is the tenant.
- Tenant authorization never trusts client-provided `libraryId`.
- `Book` and `BookCopy` remain separate.
- Redis is never source of truth.
- Production files use S3-compatible object storage.
- Backend owns business rules and critical validation.
- No mock buttons or fake persistence may replace real feature logic.
