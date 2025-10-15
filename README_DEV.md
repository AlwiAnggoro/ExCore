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

| Phase | Focus | Status |
| --- | --- | --- |
| 0 | Architecture & Tooling | ✅ 100% Complete |
| 1 | Shared Kernel & Utilities | ✅ 100% Complete |
| 2 | Persistence Abstractions | ✅ 100% Complete |
| 3 | Identity Suite | ✅ 100% Complete |
| 4 | Cross-Cutting Guarantees | ✅ 100% Complete |
| 5 | Presentation & Adapter Layer | ✅ 100% Complete |
| 6 | Observability & Operations | ✅ 100% Complete |
| 7 | Packaging & DX Polish | ⚠️ 40% Complete (core packaging done) |
| 8 | Release Readiness | ⏳ Not Started |

**Overall Progress: ~93%**

See [roadmap.md](./roadmap.md) for detailed feature lists and completion status.

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

## Resources

- [DDD Reference](https://www.domainlanguage.com/ddd/reference/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
