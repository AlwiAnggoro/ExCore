# ExCore Development Guide

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Build the Project

```bash
pnpm build
```

### 3. Run Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run only unit tests
pnpm test:unit
```

### 4. Lint & Format

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format
```

### 5. Database Setup

```bash
# Generate migration from schema
pnpm --filter @excore/core db:generate

# Run migrations
pnpm --filter @excore/core db:migrate

# Open Drizzle Studio (database GUI)
pnpm --filter @excore/core db:studio
```

### 6. Run Examples

```bash
# Build first
pnpm build

# Run basic example (in-memory)
npx tsx examples/basic-usage.ts

# Run database integration example (requires PostgreSQL)
# Set DATABASE_URL environment variable first
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/excore_dev"
npx tsx examples/database-usage.ts
```

## Project Structure

```
ExCore/
├── packages/
│   └── core/
│       ├── src/
│       │   ├── shared/           # Shared kernel (DDD building blocks)
│       │   │   ├── domain/       # Entity, ValueObject, AggregateRoot
│       │   │   ├── core/         # Result, Guard, UseCase
│       │   │   └── infrastructure/ # Logger, DI Container
│       │   ├── modules/          # Domain modules
│       │   │   └── user/         # User module
│       │   │       ├── domain/   # User aggregate, value objects
│       │   │       ├── application/ # Use cases, DTOs
│       │   │       └── infrastructure/ (coming soon)
│       │   ├── adapters/         # Presentation adapters (REST, GraphQL)
│       │   └── ExCore.ts         # Framework initialization
│       ├── tests/
│       └── package.json
├── examples/                      # Usage examples
├── package.json
└── pnpm-workspace.yaml
```

## Current Implementation Status

| Phase | Focus | Status | Notes |
| --- | --- | --- | --- |
| 0 | Architecture & Tooling | 🚧 In Progress (75%) | Repo layout, TS/ESLint/Prettier, Vitest, build tooling done; ADR bundle, GitHub Actions pipeline, hooks, ESLint boundaries outstanding |
| 1 | Shared Kernel & Utilities | ✅ Nearly Complete (95%) | Entities, ValueObjects, Result/Guard, DomainEvents, DI container, console logger, config loader done; error taxonomy documentation pending |
| 2 | Persistence Abstractions | ✅ Nearly Complete (90%) | Repositories, migrations, outbox pipeline, Testcontainers ready; broker integration and specification pattern outstanding |
| 3 | Identity Suite | ✅ Core Complete (90%) | User/Auth modules shipped with E2E coverage; role tests and optional policy module pending |
| 4 | Cross-Cutting Guarantees | 🚧 Hardening (70%) | Idempotency, audit trail, memory limiter, outbox pipeline shipped; Redis limiter, broker retries, idempotency and rate-limit tests outstanding |
| 5 | Presentation & Adapter Layer | 🚧 In Progress (85%) | REST and GraphQL adapters near-ready; rate limiting integration, observability context, SSE/WebSocket scaffolding pending |
| 6 | Observability & Operations | ⚪ Not Started | OpenTelemetry pipeline, health/readiness endpoints, PII-safe logging to implement |
| 7 | Packaging & DX Polish | ⚪ Not Started | Exports map tightening, Typedoc/Docusaurus, ExCore CLI, release automation outstanding |
| 8 | Release Readiness | ⚪ Not Started | Security review, load/performance tests, launch notes, migration guide, v0.2.0 planning pending |

### Immediate Next Steps

- ADR baseline (template plus starter ADRs for DDD structure, repository pattern, JWT strategy, outbox pattern)
- GitHub Actions CI pipeline (lint -> test -> build with PR checks and branch protections)
- Husky and lint-staged hooks with ESLint boundaries enforcement
- Phase 4 hardening (Redis rate limiter, broker integration with retries, idempotency and rate-limit test suites)

**Next focus:** close out Phase 0 documentation/CI/hook work, then drive Phase 4 hardening before expanding observability.

## Development Workflow

### Creating a New Module

1. Create directory structure:
```bash
mkdir -p packages/core/src/modules/{module-name}/{domain,application,infrastructure}
```

2. Implement domain layer (entities, value objects, events)
3. Implement application layer (use cases, DTOs)
4. Implement infrastructure layer (repository implementations)
5. Export public API in `index.ts`
6. Add module to `tsup.config.ts` exports
7. Update `packages/core/package.json` exports map

### Writing Tests

- **Unit tests**: Test domain logic and use cases in isolation
- **Integration tests**: Test with real database (Testcontainers)
- **E2E tests**: Full scenario tests with all layers

Place tests next to the code they test: `Email.test.ts` next to `Email.ts`

### Architectural Rules

ExCore enforces strict layer boundaries via ESLint:

- ❌ **Domain** cannot import from infrastructure or application
- ✅ **Domain** can only import from shared kernel
- ✅ **Application** can import from domain and shared
- ✅ **Infrastructure** can import from all layers
- ✅ **Presentation** can import from application, domain, and shared

## Key Concepts

### Result Pattern

Use `Result<T, E>` instead of throwing exceptions:

```typescript
const emailOrError = Email.create('test@example.com');
if (emailOrError.isFailure) {
  return Result.fail(emailOrError.error);
}
const email = emailOrError.value;
```

### Domain Events

Aggregate roots can raise domain events:

```typescript
user.addDomainEvent(new UserRegisteredEvent(user.userId, user.email.value));
DomainEvents.dispatchEventsForAggregate(user.userId);
```

### Dependency Injection

Register and resolve dependencies:

```typescript
DependencyContainer.register('UserRepository', UserRepositoryImpl);
const repo = DependencyContainer.resolve<IUserRepository>('UserRepository');
```

## Troubleshooting

### Build Errors

If you encounter build errors, try:
```bash
rm -rf dist packages/*/dist
pnpm install
pnpm build
```

### Test Failures

Run tests with verbose output:
```bash
pnpm test -- --reporter=verbose
```

## Contributing

See `CLAUDE.md` for detailed architectural guidance and conventions.

## Resources

- [DDD Reference](https://www.domainlanguage.com/ddd/reference/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
