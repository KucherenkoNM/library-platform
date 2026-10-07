# «Читай!» — Library Management Platform

Production-oriented multi-tenant library management platform. This repository currently contains **Stage 0 — project skeleton** from `docs/implementation-plan.md`.

## Stage 0 scope

Implemented in this stage:

- pnpm monorepo;
- `apps/web`: React 19 + TypeScript + Vite;
- `apps/api`: NestJS + TypeScript;
- PostgreSQL, Redis and S3-compatible MinIO development infrastructure;
- Prisma 7 scaffold and Stage 0 bootstrap migration;
- Tailwind CSS + shadcn/ui configuration;
- ESLint + Prettier;
- Zod environment validation;
- Swagger/OpenAPI;
- `/health/live` and `/health/ready`;
- structured Pino logging with secret redaction;
- baseline tests and GitHub Actions CI.

Domain models, authentication, RBAC and product feature screens are intentionally **not** implemented in Stage 0. They start in later stages exactly as defined in `docs/implementation-plan.md`.

## Canonical documentation

Read before implementation:

1. `docs/prd.md`
2. `docs/architecture.md`
3. `docs/implementation-plan.md`
4. `docs/screens.md`
5. `docs/user-flows.md`
6. `docs/consistency-audit.md`
7. `docs/development-prompt.md`

Canonical Staff routes use `/staff/*`. Public catalog routes use `/` and `/catalog/*`. Reader Account Full v1 uses `/reader/*`.

## Prerequisites

Recommended:

- Node.js 24 LTS;
- Corepack;
- pnpm 12.10.0;
- Docker + Docker Compose.

The package engine range also allows compatible Node 22.12+ environments, but Node 24 LTS is the target development/runtime line.

## Local setup

```bash
cp .env.example .env
corepack enable
corepack prepare pnpm@12.10.0 --activate

docker compose up -d

pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

No hidden manual database or bucket setup is required: Docker Compose starts PostgreSQL and Redis, while `minio-init` creates the development bucket.

## Local URLs

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Liveness: `http://localhost:3000/health/live`
- Readiness: `http://localhost:3000/health/ready`
- MinIO console: `http://localhost:9001`

`/health/ready` is healthy only when PostgreSQL, Redis and the configured S3 bucket are all reachable.

## Database workflow

Stage 0 intentionally has no domain tables. The bootstrap migration only initializes the migration chain; Stage 1 introduces the first domain models according to `docs/implementation-plan.md`.

```bash
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate
```

For future development migrations:

```bash
pnpm prisma:migrate:dev
```

Never edit production schema manually outside migrations.

## Quality gates

Run:

```bash
pnpm prisma:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

or:

```bash
pnpm check
```

Before advancing to the next implementation stage, all relevant gates must be green and migrations must apply successfully against PostgreSQL.

## Environment rules

`.env.example` contains **development-only example values**. Real secrets must never be committed. In production, inject configuration through the deployment platform or a secret manager.

## Architecture guardrails

- `Library` is the tenant.
- Tenant authorization never trusts client-provided `libraryId`.
- `Book` and `BookCopy` remain separate.
- Redis is never source of truth.
- Production files use S3-compatible object storage.
- Backend owns business rules and critical validation.
- No mock buttons or fake persistence may replace real feature logic.

See `docs/architecture.md` and `docs/development-prompt.md` for the complete rules.
