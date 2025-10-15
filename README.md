# ExCore

<div align="center">

**Production-Ready TypeScript Backend Framework**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8+-orange.svg)](https://pnpm.io/)

*Built with Clean Architecture, Domain-Driven Design, and TypeScript*

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture) • [Examples](#-examples)

</div>

---

## 📖 Overview

**ExCore** is a modular, plugin-based TypeScript framework designed for building enterprise-grade backend applications. It combines Clean Architecture principles with Domain-Driven Design patterns to provide a solid foundation for scalable, maintainable, and testable applications.

### Why ExCore?

- **🏗️ Clean Architecture**: Clear separation of concerns with strict layer boundaries
- **🎯 DDD-First**: Built-in support for Entities, Value Objects, Aggregates, and Domain Events
- **🔌 Modular Design**: Import only what you need with tree-shakable exports
- **🧪 Test-Friendly**: 209+ tests included, optimized for TDD/BDD workflows
- **📊 Production-Ready**: Observability, security, and operational features out of the box
- **🚀 TypeScript Native**: Full type safety with strict mode enabled
- **🔄 Event-Driven**: Built-in Outbox pattern for reliable event processing
- **🛡️ Security Hardened**: Input validation, PII scrubbing, rate limiting, RBAC/ABAC

---

## ✨ Features

### 🎯 Domain Modules

#### User Module
- User registration and profile management
- Email and password value objects with validation
- Domain events for user lifecycle (registered, updated, deleted)
- Repository pattern for persistence abstraction

#### Auth Module
- JWT-based authentication with token rotation
- Refresh token management with secure storage
- OAuth2 foundation (ready for extension)
- Session management and logout

#### Role Module
- Role-Based Access Control (RBAC)
- Permission management with hierarchical support
- Role assignment and revocation
- Wildcard permissions (`articles:*`, `users:read`)

#### Policy Module
- Fine-grained access control (RBAC/ABAC)
- Policy evaluation engine
- Resource-based permissions
- Context-aware authorization

### 🏗️ Infrastructure

#### Persistence
- **Repository Pattern**: Abstract data access with clean interfaces
- **Unit of Work**: Transaction management across aggregates
- **Kysely Integration**: Type-safe SQL query builder
- **Drizzle Migrations**: Schema versioning and migration management
- **Multi-Database Support**: PostgreSQL, MySQL, SQLite (MongoDB/Elasticsearch planned)

#### Event-Driven Architecture
- **Domain Events**: In-memory event bus for domain logic coordination
- **Outbox Pattern**: Reliable event publishing with at-least-once delivery
- **Retry Mechanism**: Exponential backoff with configurable attempts
- **Dead Letter Queue**: Failed events stored for manual intervention
- **Event Brokers**: Redis Streams, Kafka, NATS adapters

#### Real-Time Communication
- **Server-Sent Events (SSE)**: One-way server-to-client streaming
- **WebSocket Manager**: Bidirectional full-duplex communication
- **Connection Tracking**: Per-user and per-channel subscriptions
- **Heartbeat Support**: Keep-alive and reconnection handling

#### Rate Limiting
- **Redis-Backed**: Distributed rate limiting with ioredis
- **Token Bucket Algorithm**: Smooth rate limiting with burst support
- **Per-Route Configuration**: Different limits per endpoint
- **User-Aware**: Per-user rate limiting for authenticated requests
- **IP-Based Fallback**: Rate limiting for anonymous users

#### Idempotency
- **Request Deduplication**: Prevent duplicate processing of operations
- **Redis/SQL Backing**: Persistent idempotency key storage
- **TTL Support**: Automatic cleanup of old keys
- **Middleware Integration**: Easy REST/GraphQL integration

### 📊 Observability

#### Distributed Tracing
- **OpenTelemetry Integration**: Industry-standard tracing
- **W3C Trace Context**: Cross-service trace propagation
- **OTLP Exporter**: Send traces to Jaeger, Tempo, Zipkin
- **Automatic Instrumentation**: Spans created for HTTP requests
- **Error Tracking**: Exception recording and span status

#### Structured Logging
- **JSON Output**: Machine-readable logs with structured fields
- **PII Scrubbing**: Automatic redaction of sensitive data (emails, passwords, tokens, credit cards)
- **Correlation IDs**: Request tracking across services
- **Log Levels**: Debug, info, warn, error with configurable output
- **Pretty Mode**: Human-readable logs for development

#### Health & Metrics
- **Health Endpoint** (`/health`): Kubernetes liveness probe with database checks
- **Readiness Endpoint** (`/ready`): Kubernetes readiness probe with migration checks
- **Metrics Endpoint** (`/metrics`): Prometheus-format metrics (counters, gauges, histograms)
- **Build Info**: Version, commit SHA, and environment metadata
- **Custom Checks**: Pluggable health check system

#### Chaos Engineering
- **Fault Injection**: Latency, error, timeout, and circuit-breaker injection
- **Probability-Based**: Configure failure rates for testing
- **Environment Guards**: Safety mechanisms for production
- **Middleware Integration**: HTTP request fault injection
- **Testing Support**: Comprehensive chaos testing utilities

### 🔌 Adapters

#### REST Adapter (Hono)
- **Request Validation**: Zod schema validation with automatic error responses
- **Auth Guards**: JWT middleware with role-based access control
- **Rate Limiting**: Per-route and per-user rate limiting
- **Error Handling**: Centralized error mapping with consistent responses
- **OpenAPI Ready**: Schema generation support

#### GraphQL Adapter (Apollo Server)
- **Schema-First**: Type-safe resolvers with code generation
- **Authentication**: Context-based user authentication
- **Authorization**: Field-level permission checks
- **DataLoader**: Automatic batching and caching
- **Subscriptions**: Real-time updates over WebSocket

#### Real-Time Adapters
- **SSE Manager**: Server-Sent Events with channel subscriptions
- **WebSocket Manager**: Full-duplex communication with room support
- **Connection Tracking**: User and channel-based routing
- **Broadcast Support**: Pub/sub patterns for real-time updates

### 🛡️ Security

- **Input Validation**: Zod schemas at gateway level, business rules in domain
- **JWT Authentication**: Secure token-based authentication with rotation
- **RBAC/ABAC**: Role and attribute-based access control
- **Rate Limiting**: Prevent abuse with configurable rate limits
- **PII Scrubbing**: Automatic redaction in logs and error messages
- **Idempotency**: Prevent replay attacks with idempotency keys
- **SQL Injection Protection**: Parameterized queries via Kysely
- **CORS/CSRF**: Configurable cross-origin and CSRF protection

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **pnpm**: 8.0.0 or higher (recommended) or npm/yarn
- **PostgreSQL**: 14+ (for database features)
- **Redis**: 7+ (optional, for rate limiting and caching)

### Installation

```bash
# Clone the repository
git clone https://github.com/VenoMexx/ExCore.git
cd ExCore

# Install dependencies
pnpm install

# Build the project
pnpm build

# Run tests
pnpm test
```

### Basic Usage

```typescript
import { ExCore } from '@excore/core';
import { createRestApp } from '@excore/core/adapters/rest';

// Initialize the framework
const core = new ExCore({
  database: {
    url: process.env.DATABASE_URL,
  },
  logging: {
    level: 'info',
    pretty: true,
  },
});

// Create REST API
const app = createRestApp({
  auth: {
    jwtSecret: process.env.JWT_SECRET,
  },
  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60000,
  },
});

// Start the server
app.listen(3000, () => {
  console.log('ExCore server running on http://localhost:3000');
});
```

### Modular Imports

ExCore supports tree-shakable imports for optimal bundle size:

```typescript
// Import specific modules
import { User, Email } from '@excore/core/user';
import { LoginUseCase } from '@excore/core/auth';
import { Role, CreateRoleUseCase } from '@excore/core/role';
import { RBACPolicyEvaluator } from '@excore/core/policy';

// Import adapters
import { createRestApp } from '@excore/core/adapters/rest';
import { createGraphQLServer } from '@excore/core/adapters/graphql';
import { SSEManager, WebSocketManager } from '@excore/core/adapters/realtime';
```

---

## 🏗️ Architecture

ExCore follows Clean Architecture and DDD principles with strict layer boundaries:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│         (REST, GraphQL, WebSocket Adapters)                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│         (Use Cases, DTOs, Application Services)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                       Domain Layer                           │
│    (Entities, Value Objects, Aggregates, Domain Events)     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│     (Repositories, Event Bus, Database, External APIs)      │
└─────────────────────────────────────────────────────────────┘
```

### Project Structure

```
packages/core/
├── src/
│   ├── modules/              # Domain modules
│   │   ├── user/             # User aggregate, email/password value objects
│   │   ├── auth/             # JWT authentication, refresh tokens
│   │   ├── role/             # RBAC roles and permissions
│   │   └── policy/           # Policy evaluation engine
│   ├── adapters/             # Presentation adapters
│   │   ├── rest/             # REST API (Hono)
│   │   ├── graphql/          # GraphQL API (Apollo)
│   │   └── realtime/         # SSE/WebSocket managers
│   ├── shared/               # Cross-cutting concerns
│   │   ├── core/             # Result, Guard, UseCase abstractions
│   │   ├── domain/           # Entity, ValueObject, DomainEvent base classes
│   │   └── infrastructure/   # Persistence, telemetry, chaos
│   └── index.ts              # Public API exports
├── tests/
│   ├── unit/                 # Domain and application tests
│   ├── integration/          # Repository and infrastructure tests
│   └── e2e/                  # End-to-end API tests
└── package.json
```

### Layer Responsibilities

#### Domain Layer
- **Pure business logic**: No external dependencies
- **Entities**: Business objects with identity
- **Value Objects**: Immutable objects without identity
- **Aggregates**: Consistency boundaries
- **Domain Events**: State change notifications
- **Repository Interfaces**: Data access contracts

#### Application Layer
- **Use Cases**: Business workflows and orchestration
- **DTOs**: Data transfer objects for cross-layer communication
- **Application Services**: Coordinate domain objects
- **Validation**: Business rule validation

#### Infrastructure Layer
- **Repository Implementations**: Concrete data access
- **Event Publishers**: Outbox pattern implementation
- **External Services**: Email, SMS, payment gateways
- **Database Migrations**: Schema management

#### Presentation Layer
- **REST Controllers**: HTTP endpoints
- **GraphQL Resolvers**: GraphQL field resolvers
- **WebSocket Handlers**: Real-time message handlers
- **Input Validation**: Request payload validation

---

## 📚 Documentation

### Core Documentation

- **[Development Guide](./README_DEV.md)**: Setup, build, and contribution guidelines
- **[Roadmap](./roadmap.md)**: Project phases and completion status
- **[Architecture Decision Records](./docs/adr/)**: Design decisions and rationale

### Technical Guides

- **[Error Taxonomy](./docs/error-taxonomy.md)**: Error handling patterns and Result type
- **[Logging Guide](./docs/logging.md)**: Structured logging and PII scrubbing
- **[Chaos Engineering](./docs/chaos-engineering.md)**: Fault injection and resilience testing
- **[Runbooks](./docs/runbooks/)**: Operational procedures and troubleshooting

### Architecture Guides

- **[ESLint Boundary Rules](./docs/architecture/eslint-boundary-rules.md)**: Layer boundary enforcement
- **[Boundary Rule Examples](./docs/architecture/boundary-rules-examples.md)**: Practical examples

---

## 💡 Examples

### User Registration

```typescript
import { RegisterUserUseCase } from '@excore/core/user';
import { Email, PasswordHash } from '@excore/core/user';

const useCase = new RegisterUserUseCase(userRepository);

const result = await useCase.execute({
  email: 'user@example.com',
  password: 'SecurePass123!',
  name: 'John Doe',
});

if (result.isFailure) {
  console.error('Registration failed:', result.error);
} else {
  console.log('User registered:', result.value);
}
```

### JWT Authentication

```typescript
import { LoginUseCase } from '@excore/core/auth';

const loginUseCase = new LoginUseCase(
  userRepository,
  refreshTokenRepository,
  jwtService
);

const result = await loginUseCase.execute({
  email: 'user@example.com',
  password: 'SecurePass123!',
});

if (result.isSuccess) {
  const { accessToken, refreshToken } = result.value;
  // Use tokens for authenticated requests
}
```

### RBAC Permission Check

```typescript
import { RBACPolicyEvaluator } from '@excore/core/policy';

const evaluator = new RBACPolicyEvaluator();

const decision = await evaluator.evaluate({
  userId: 'user-123',
  roles: ['editor'],
  permissions: ['articles:write', 'articles:publish'],
  resource: 'articles',
  action: 'publish',
});

if (decision.value.allowed) {
  // User has permission to publish articles
}
```

### Real-Time SSE

```typescript
import { SSEManager } from '@excore/core/adapters/realtime';

const sseManager = new SSEManager();

// Add client connection
const connection = sseManager.addConnection(
  connectionId,
  sendFunction,
  closeFunction,
  userId,
  'notifications'
);

// Send to specific user
sseManager.sendToUser(userId, {
  type: 'notification',
  data: { message: 'New comment on your post' },
});

// Broadcast to channel
sseManager.sendToChannel('notifications', {
  type: 'system',
  data: { message: 'Server maintenance in 10 minutes' },
});
```

### Distributed Tracing

```typescript
import { createRestApp } from '@excore/core/adapters/rest';

const app = createRestApp({
  tracing: {
    enabled: true,
    serviceName: 'my-api',
    endpoint: 'http://localhost:4318/v1/traces',
    processor: 'batch',
    exporter: 'otlp',
  },
});

// Traces automatically created for all HTTP requests
// View in Jaeger: http://localhost:16686
```

---

## 🧪 Testing

ExCore includes comprehensive test coverage:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage report
pnpm test:coverage

# Run only unit tests
pnpm test:unit
```

### Test Statistics

- **Total Tests**: 209+
- **Unit Tests**: Domain logic, value objects, use cases
- **Integration Tests**: Repository implementations, database operations
- **E2E Tests**: Full API scenarios with authentication

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { Email } from '@excore/core/user';

describe('Email Value Object', () => {
  it('should create valid email', () => {
    const result = Email.create('user@example.com');
    expect(result.isSuccess).toBe(true);
  });

  it('should reject invalid email format', () => {
    const result = Email.create('invalid-email');
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('Email format is invalid');
  });
});
```

---

## 📊 Technical Metrics

| Metric | Value |
|--------|-------|
| **Test Coverage** | 209+ tests (unit, integration, e2e) |
| **Database Migrations** | 7 migrations ready |
| **Documentation** | 1100+ lines across guides |
| **TypeScript** | Strict mode enabled |
| **ESLint Rules** | Boundary enforcement active |
| **Phases Complete** | 6/8 (Phases 0-6 at 100%) |
| **Overall Progress** | ~93% |

---

## 🛠️ Development

### Prerequisites for Development

```bash
# Install pnpm globally
npm install -g pnpm

# Clone and setup
git clone https://github.com/VenoMexx/ExCore.git
cd ExCore
pnpm install
```

### Build

```bash
# Build all packages
pnpm build

# Build in watch mode
pnpm build:watch

# Clean build artifacts
pnpm clean
```

### Linting

```bash
# Lint code
pnpm lint

# Auto-fix linting issues
pnpm lint:fix

# Type checking
pnpm type-check
```

### Database Setup

```bash
# Set database URL
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/excore_dev"

# Generate migration from schema
pnpm --filter @excore/core db:generate

# Run migrations
pnpm --filter @excore/core db:migrate

# Open Drizzle Studio (database GUI)
pnpm --filter @excore/core db:studio
```

---

## 🗺️ Roadmap

**Current Status**: Phases 0-6 Complete (100%)

- ✅ **Phase 0**: Architecture & Tooling
- ✅ **Phase 1**: Shared Kernel & Utilities
- ✅ **Phase 2**: Persistence Abstractions
- ✅ **Phase 3**: Identity Suite (User/Auth/Role/Policy)
- ✅ **Phase 4**: Cross-Cutting Guarantees
- ✅ **Phase 5**: Presentation & Adapter Layer
- ✅ **Phase 6**: Observability & Operations
- 🔄 **Phase 7**: Packaging & DX Polish (40%)
- ⏳ **Phase 8**: Release Readiness

**Target Release**: v0.1.0 - December 2025

See [roadmap.md](./roadmap.md) for detailed progress and phase descriptions.

---

## 🤝 Contributing

We welcome contributions! Please see our [Development Guide](./README_DEV.md) for:

- Setup instructions
- Coding conventions
- Testing guidelines
- Pull request process

### Architectural Guidelines

ExCore enforces strict architectural boundaries:

- ❌ **Domain** cannot import from infrastructure or application
- ✅ **Domain** can only import from shared kernel
- ✅ **Application** can import from domain and shared
- ✅ **Infrastructure** can import from all layers

See [CLAUDE.md](./CLAUDE.md) for detailed architectural guidance.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

ExCore is built on the shoulders of giants:

- **Domain-Driven Design** by Eric Evans
- **Clean Architecture** by Robert C. Martin
- **Enterprise Integration Patterns** by Gregor Hohpe
- TypeScript, Node.js, and the open-source community

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/VenoMexx/ExCore/issues)
- **Discussions**: [GitHub Discussions](https://github.com/VenoMexx/ExCore/discussions)
- **Documentation**: [Project Wiki](https://github.com/VenoMexx/ExCore/wiki)

---

<div align="center">

**Built with ❤️ using Clean Architecture, Domain-Driven Design, and TypeScript**

[⬆ Back to Top](#excore)

</div>
