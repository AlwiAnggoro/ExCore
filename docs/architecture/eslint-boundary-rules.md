# ESLint Architectural Boundary Rules

ExCore enforces Clean Architecture principles through ESLint rules that prevent violations of layer boundaries.

## Architecture Layers

```
┌─────────────────────────────────────────┐
│          Adapters (Presentation)        │  ← Framework-specific (REST, GraphQL)
├─────────────────────────────────────────┤
│          Application (Use Cases)        │  ← Business logic coordination
├─────────────────────────────────────────┤
│          Domain (Entities)              │  ← Pure business logic
├─────────────────────────────────────────┤
│          Infrastructure                 │  ← External systems (DB, Queue)
└─────────────────────────────────────────┘
```

## Dependency Rules

### Rule 1: Domain Layer Isolation

**Domain CANNOT import from:**
- ❌ Infrastructure
- ❌ Application
- ❌ Adapters

**Rationale:** Domain is the core business logic and must remain technology-agnostic.

**Example Violation:**
```typescript
// ❌ BAD - Domain importing infrastructure
// packages/core/src/modules/user/domain/User.ts
import { DatabaseConnection } from '../../../shared/infrastructure/database';

export class User extends Entity<UserProps> {
  // Domain entity shouldn't know about databases
}
```

**Correct Approach:**
```typescript
// ✅ GOOD - Domain remains pure
// packages/core/src/modules/user/domain/User.ts
import { Entity } from '../../../shared/domain/Entity';

export class User extends Entity<UserProps> {
  // Pure domain logic, no infrastructure dependencies
}
```

### Rule 2: Application Layer Boundaries

**Application CANNOT import from:**
- ❌ Adapters (REST, GraphQL controllers)
- ❌ Infrastructure implementations (only interfaces allowed)

**Rationale:** Application layer coordinates business logic but remains framework-agnostic.

**Example Violation:**
```typescript
// ❌ BAD - Application importing adapter
// packages/core/src/modules/user/application/usecases/RegisterUser.ts
import { RestController } from '../../../../adapters/rest/controllers';

export class RegisterUserUseCase {
  // Use cases shouldn't know about HTTP
}
```

**Correct Approach:**
```typescript
// ✅ GOOD - Application uses interfaces only
// packages/core/src/modules/user/application/usecases/RegisterUser.ts
import type { IUserRepository } from '../../domain/IUserRepository';
import type { IEmailService } from '../../../../shared/infrastructure/email/IEmailService';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly emailService: IEmailService
  ) {}
}
```

### Rule 3: Infrastructure Restrictions

**Infrastructure SHOULD NOT import:**
- ⚠️ Domain entities directly (use interfaces and DTOs)

**Rationale:** Infrastructure should adapt external systems to domain interfaces, not the other way around.

**Example Warning:**
```typescript
// ⚠️ AVOID - Infrastructure directly depending on domain entities
// packages/core/src/shared/infrastructure/persistence/UserRepository.ts
import { User } from '../../../modules/user/domain/User';

export class UserRepositoryPostgres {
  async save(user: User): Promise<void> {
    // Direct coupling to domain entity
  }
}
```

**Better Approach:**
```typescript
// ✅ BETTER - Infrastructure adapts through interfaces
// packages/core/src/modules/user/infrastructure/UserRepositoryPostgres.ts
import type { IUserRepository } from '../domain/IUserRepository';
import type { User } from '../domain/User';

export class UserRepositoryPostgres implements IUserRepository {
  async save(user: User): Promise<void> {
    // Implementation through interface contract
  }
}
```

### Rule 4: Adapter Restrictions

**Adapters SHOULD NOT import:**
- ❌ Domain entities directly (except events)
- ✅ Application layer interfaces (DTOs, use cases)

**Rationale:** Adapters translate external requests to application layer commands.

**Example Violation:**
```typescript
// ❌ BAD - Adapter directly using domain entity
// packages/core/src/adapters/rest/routes/user.routes.ts
import { User } from '../../../modules/user/domain/User';

app.post('/users', (req, res) => {
  const user = new User(req.body); // Directly creating domain entity
  res.json(user);
});
```

**Correct Approach:**
```typescript
// ✅ GOOD - Adapter uses application DTOs
// packages/core/src/adapters/rest/routes/user.routes.ts
import type { RegisterUserDTO } from '../../../modules/user/application/dto/RegisterUserDTO';
import type { RegisterUserUseCase } from '../../../modules/user/application/usecases/RegisterUser';

app.post('/users', async (req, res) => {
  const dto: RegisterUserDTO = {
    email: req.body.email,
    password: req.body.password,
    name: req.body.name
  };

  const result = await registerUserUseCase.execute(dto);
  res.json(result);
});
```

## ESLint Configuration

### Boundary Rules by Layer

**Domain Layer** (`packages/core/src/modules/*/domain/**/*.ts`):
```json
{
  "no-restricted-imports": ["error", {
    "patterns": [
      "**/infrastructure/**",
      "**/adapters/**",
      "../application/**"
    ]
  }]
}
```

**Application Layer** (`packages/core/src/modules/*/application/**/*.ts`):
```json
{
  "no-restricted-imports": ["error", {
    "patterns": [
      "**/adapters/**",
      "**/infrastructure/*/implementation"
    ]
  }]
}
```

**Infrastructure Layer** (`packages/core/src/shared/infrastructure/**/*.ts`):
```json
{
  "no-restricted-imports": ["error", {
    "patterns": [
      "**/domain/**"
    ]
  }]
}
```

**Adapter Layer** (`packages/core/src/adapters/**/*.ts`):
```json
{
  "no-restricted-imports": ["error", {
    "patterns": [
      "**/domain/*"
    ]
  }]
}
```

## Running Boundary Checks

### Check All Files
```bash
npm run lint
```

### Auto-fix Issues
```bash
npm run lint:fix
```

### Type Check Only
```bash
npm run type-check
```

### CI Integration
```yaml
# .github/workflows/ci.yml
- name: Lint
  run: npm run lint

- name: Type Check
  run: npm run type-check
```

## Common Violations and Fixes

### Violation 1: Domain importing infrastructure

**Error:**
```
packages/core/src/modules/user/domain/User.ts
  5:1  error  Domain layer cannot import from infrastructure  no-restricted-imports
```

**Fix:** Move infrastructure dependency to repository interface:
```typescript
// Define interface in domain
export interface IUserRepository {
  save(user: User): Promise<void>;
}

// Implement in infrastructure
export class UserRepositoryPostgres implements IUserRepository {
  // Implementation with database
}
```

### Violation 2: Application importing adapter

**Error:**
```
packages/core/src/modules/user/application/usecases/RegisterUser.ts
  3:1  error  Application layer cannot import from adapters  no-restricted-imports
```

**Fix:** Inject dependencies through constructor:
```typescript
export class RegisterUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly emailService: IEmailService
  ) {}
}
```

### Violation 3: Circular dependencies

**Error:**
```
packages/core/src/modules/user/domain/User.ts
  2:1  error  Dependency cycle detected  import/no-cycle
```

**Fix:** Extract shared types to separate file or use dependency inversion.

## Benefits

1. **Testability**: Layers can be tested in isolation
2. **Maintainability**: Clear dependency flow prevents spaghetti code
3. **Flexibility**: Easy to swap implementations (e.g., change database)
4. **Team Alignment**: Automated enforcement of architectural decisions
5. **Onboarding**: New developers understand boundaries immediately

## Further Reading

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Dependency Inversion Principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)

## Troubleshooting

### ESLint not working

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Verify ESLint config:
   ```bash
   npx eslint --print-config packages/core/src/modules/user/domain/User.ts
   ```

3. Check parser:
   ```bash
   npx eslint --debug packages/core/src/modules/user/domain/User.ts
   ```

### False positives

If you encounter legitimate cases where cross-boundary imports are needed:

1. Document the reasoning
2. Use ESLint disable comments sparingly:
   ```typescript
   // eslint-disable-next-line no-restricted-imports -- Reason: legitimate case
   import { ... } from '...';
   ```

3. Consider if the architecture needs adjustment

### Performance issues

Large codebases may experience slow linting:

1. Use `.eslintignore` to exclude unnecessary files
2. Run ESLint on changed files only:
   ```bash
   git diff --name-only --diff-filter=ACMR | grep '\.ts$' | xargs eslint
   ```

3. Cache results:
   ```bash
   eslint --cache .
   ```
