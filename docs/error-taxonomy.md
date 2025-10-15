# Error Taxonomy

ExCore implements a comprehensive error handling strategy based on the Result pattern and domain-driven error modeling. This document defines the error taxonomy, classification, and handling patterns used throughout the framework.

## Core Principles

1. **Fail-Fast with Result Pattern**: Domain and application layers use `Result<T, E>` to explicitly model success/failure without throwing exceptions
2. **Type-Safe Errors**: Errors are typed and structured, not plain strings
3. **Layer-Specific Handling**: Each architectural layer has appropriate error handling strategies
4. **No Silent Failures**: All errors must be handled or propagated explicitly

## Error Categories

### 1. Domain Errors

**Definition**: Business rule violations that occur within domain entities and value objects.

**Characteristics**:
- Expected failures (not exceptional circumstances)
- Deterministic and predictable
- Part of normal business flow
- Should NOT throw exceptions

**Examples**:
```typescript
// Value Object validation error
const emailOrError = Email.create('invalid-email');
if (emailOrError.isFailure) {
  console.log(emailOrError.error); // "Email format is invalid"
}

// Entity business rule violation
const userOrError = User.create(email, passwordHash, ''); // empty name
if (userOrError.isFailure) {
  console.log(userOrError.error); // "Name is required"
}
```

**Error Types**:
- `ValidationError` - Input validation failures
- `BusinessRuleViolation` - Domain constraint violations
- `InvalidStateTransition` - Illegal state changes

**Handling Strategy**: Return `Result.fail<T, ErrorType>(error)` from domain methods

### 2. Application Errors

**Definition**: Use case coordination failures, such as resource not found or authorization failures.

**Characteristics**:
- Coordination-level failures
- May involve multiple domain operations
- Often related to external dependencies (via interfaces)

**Examples**:
```typescript
// User not found during login
async execute(dto: LoginDTO): Promise<Result<LoginResultDTO, ApplicationError>> {
  const userOrError = await this.userRepository.findByEmail(email);

  if (userOrError.isFailure || !userOrError.value) {
    return Result.fail(new NotFoundError('User', email.value));
  }

  // Password mismatch
  const isValid = await this.passwordHasher.compare(dto.password, user.passwordHash.value);
  if (!isValid) {
    return Result.fail(new AuthenticationError('Invalid credentials'));
  }
}
```

**Error Types**:
- `NotFoundError` - Entity/resource not found
- `AuthenticationError` - Authentication failures
- `AuthorizationError` - Permission denied
- `ConflictError` - Resource already exists
- `PreconditionFailedError` - Required preconditions not met
- `RateLimitExceededError` - Rate limit violations

**Handling Strategy**: Return `Result.fail<T, ApplicationError>(error)` from use cases

### 3. Infrastructure Errors

**Definition**: External system failures (database, network, filesystem, third-party APIs).

**Characteristics**:
- Unexpected and exceptional
- Non-deterministic (may succeed on retry)
- Outside application control
- Should be logged and monitored

**Examples**:
```typescript
// Database connection failure
async save(user: User): Promise<Result<void, InfrastructureError>> {
  try {
    await this.db.insert('users').values(UserMapper.toPersistence(user));
    return Result.ok(undefined);
  } catch (error) {
    logger.error('Database write failed', { error, userId: user.id });
    return Result.fail(new DatabaseError('Failed to save user', error));
  }
}

// External API failure
async sendEmail(to: string, subject: string): Promise<Result<void, InfrastructureError>> {
  try {
    await this.emailClient.send({ to, subject });
    return Result.ok(undefined);
  } catch (error) {
    logger.error('Email send failed', { error, to });
    return Result.fail(new ExternalServiceError('Email service', error));
  }
}
```

**Error Types**:
- `DatabaseError` - Database operation failures
- `NetworkError` - Network/connectivity issues
- `TimeoutError` - Operation timeout
- `ExternalServiceError` - Third-party service failures
- `FileSystemError` - File I/O errors

**Handling Strategy**:
- Catch exceptions at infrastructure boundaries
- Convert to `Result.fail<T, InfrastructureError>(error)`
- Log with context and correlation IDs
- Implement retry logic where appropriate

### 4. Presentation Errors

**Definition**: HTTP/GraphQL/gRPC adapter-level errors (request validation, serialization).

**Characteristics**:
- Protocol-specific
- Input validation at API gateway
- Error response formatting
- Status code mapping

**Examples**:
```typescript
// REST adapter validation error
app.post('/api/auth/register', async (req, res) => {
  // Zod validation
  const validation = RegisterSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request body',
      details: validation.error.issues
    });
  }

  const result = await registerUserUseCase.execute(validation.data);

  if (result.isFailure) {
    // Map application errors to HTTP status codes
    const statusCode = mapErrorToStatusCode(result.error);
    return res.status(statusCode).json({
      error: result.error.type,
      message: result.error.message
    });
  }

  return res.status(201).json(result.value);
});
```

**Error Types**:
- `ValidationError` - Request schema validation failures
- `MalformedRequestError` - Invalid JSON/request format
- `UnsupportedMediaTypeError` - Wrong content-type
- `PayloadTooLargeError` - Request body size exceeded

**Handling Strategy**:
- Validate at adapter boundary (Zod schemas)
- Map domain/application errors to HTTP status codes
- Format errors consistently (RFC 7807 Problem Details)
- Never leak internal error details to clients

## Error Structure

### Base Error Interface

```typescript
interface DomainError {
  readonly type: string;        // Error type (e.g., "ValidationError")
  readonly message: string;      // Human-readable message
  readonly context?: Record<string, unknown>; // Additional context
}

interface ApplicationError extends DomainError {
  readonly code: string;        // Machine-readable code (e.g., "USER_NOT_FOUND")
  readonly statusCode?: number; // Suggested HTTP status code
}

interface InfrastructureError extends ApplicationError {
  readonly originalError?: Error;  // Original caught exception
  readonly retryable: boolean;     // Can be retried?
}
```

### Example Error Implementations

```typescript
// Domain Error
class EmailValidationError implements DomainError {
  readonly type = 'ValidationError';
  readonly message: string;

  constructor(email: string) {
    this.message = `Email format is invalid: ${email}`;
  }
}

// Application Error
class UserNotFoundError implements ApplicationError {
  readonly type = 'NotFoundError';
  readonly code = 'USER_NOT_FOUND';
  readonly message: string;
  readonly statusCode = 404;

  constructor(identifier: string) {
    this.message = `User not found: ${identifier}`;
  }
}

// Infrastructure Error
class DatabaseError implements InfrastructureError {
  readonly type = 'InfrastructureError';
  readonly code = 'DATABASE_ERROR';
  readonly message: string;
  readonly statusCode = 500;
  readonly retryable = true;
  readonly originalError?: Error;

  constructor(operation: string, error?: Error) {
    this.message = `Database operation failed: ${operation}`;
    this.originalError = error;
  }
}
```

## Error Handling Patterns

### 1. Guard Clauses (Domain Layer)

```typescript
export class User extends Entity<UserProps> {
  static create(
    email: Email,
    passwordHash: PasswordHash,
    name: string
  ): Result<User, DomainError> {
    // Guard clause pattern
    const guardResult = Guard.combine([
      Guard.againstNullOrUndefined(email, 'email'),
      Guard.againstNullOrUndefined(passwordHash, 'passwordHash'),
      Guard.againstNullOrUndefined(name, 'name'),
      Guard.againstEmpty(name, 'name')
    ]);

    if (!guardResult.succeeded) {
      return Result.fail(new ValidationError(guardResult.message!));
    }

    return Result.ok(new User({ email, passwordHash, name, createdAt: new Date() }));
  }
}
```

### 2. Result Chaining (Application Layer)

```typescript
export class RegisterUserUseCase {
  async execute(dto: RegisterUserDTO): Promise<Result<UserDTO, ApplicationError>> {
    // Chain multiple operations
    const emailOrError = Email.create(dto.email);
    if (emailOrError.isFailure) {
      return Result.fail(new ValidationError('Invalid email'));
    }

    const exists = await this.userRepository.existsByEmail(emailOrError.value);
    if (exists) {
      return Result.fail(new ConflictError('User', dto.email));
    }

    const passwordHash = await this.passwordHasher.hash(dto.password);
    const passwordHashOrError = PasswordHash.create(passwordHash);
    if (passwordHashOrError.isFailure) {
      return Result.fail(new ValidationError('Invalid password hash'));
    }

    const userOrError = User.create(
      emailOrError.value,
      passwordHashOrError.value,
      dto.name
    );

    if (userOrError.isFailure) {
      return Result.fail(new ValidationError(userOrError.error.message));
    }

    const saveResult = await this.userRepository.save(userOrError.value);
    if (saveResult.isFailure) {
      return Result.fail(new InfrastructureError('Failed to save user'));
    }

    return Result.ok(UserMapper.toDTO(userOrError.value));
  }
}
```

### 3. Try-Catch at Boundaries (Infrastructure Layer)

```typescript
export class UserRepositoryKysely implements IUserRepository {
  async save(user: User): Promise<Result<void, InfrastructureError>> {
    try {
      await this.db.transaction().execute(async (trx) => {
        const persistence = UserMapper.toPersistence(user);

        await trx
          .insertInto('users')
          .values(persistence)
          .execute();

        // Store domain events in outbox
        for (const event of user.domainEvents) {
          await trx
            .insertInto('outbox')
            .values(OutboxMapper.toPersistence(event))
            .execute();
        }
      });

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('User save failed', {
        userId: user.id.toString(),
        error
      });

      return Result.fail(
        new DatabaseError('save user', error as Error)
      );
    }
  }
}
```

### 4. HTTP Error Mapping (Presentation Layer)

```typescript
function mapErrorToStatusCode(error: ApplicationError): number {
  if (error.statusCode) {
    return error.statusCode;
  }

  switch (error.type) {
    case 'ValidationError':
      return 400;
    case 'AuthenticationError':
      return 401;
    case 'AuthorizationError':
      return 403;
    case 'NotFoundError':
      return 404;
    case 'ConflictError':
      return 409;
    case 'PreconditionFailedError':
      return 412;
    case 'RateLimitExceededError':
      return 429;
    case 'InfrastructureError':
    case 'DatabaseError':
      return 500;
    case 'ExternalServiceError':
      return 502;
    case 'TimeoutError':
      return 504;
    default:
      return 500;
  }
}

// Error response formatter (RFC 7807)
function formatErrorResponse(error: ApplicationError, requestId: string) {
  return {
    type: `https://excore.io/errors/${error.type}`,
    title: error.type,
    status: mapErrorToStatusCode(error),
    detail: error.message,
    instance: requestId,
    ...(error.context && { context: error.context })
  };
}
```

## Best Practices

### ✅ DO:
- Use `Result<T, E>` pattern in domain and application layers
- Define specific error types for each category
- Include context in error messages (avoid generic "Error occurred")
- Log infrastructure errors with correlation IDs
- Return early with guard clauses
- Map errors appropriately at layer boundaries
- Use typed error responses (never plain strings)

### ❌ DON'T:
- Throw exceptions for business rule violations
- Return `null` or `undefined` to indicate failure
- Use plain strings as error messages
- Leak internal error details to API clients
- Catch and swallow errors silently
- Use generic `Error` type in Result
- Mix exception throwing with Result pattern

## Error Monitoring

### Structured Logging

```typescript
logger.error('Use case failed', {
  useCase: 'RegisterUserUseCase',
  error: {
    type: error.type,
    code: error.code,
    message: error.message
  },
  context: {
    email: dto.email, // PII will be scrubbed by PIIScrubber
    correlationId: context.correlationId
  }
});
```

### Metrics

```typescript
// Track error rates by type
metrics.counter('errors.total', {
  type: error.type,
  layer: 'application',
  useCase: 'RegisterUserUseCase'
});

// Track retryable vs non-retryable errors
if (error instanceof InfrastructureError && error.retryable) {
  metrics.counter('errors.retryable');
}
```

### Alerting Thresholds

- **Domain Errors**: No alerts (expected failures)
- **Application Errors**: Alert on sudden spikes (>5x baseline)
- **Infrastructure Errors**: Alert on any occurrence (should be rare)
- **Timeout Errors**: Alert if >1% of requests

## Testing Error Scenarios

### Unit Tests

```typescript
describe('User.create', () => {
  it('should fail when name is empty', () => {
    const result = User.create(
      Email.create('test@example.com').value,
      PasswordHash.create('hash').value,
      '' // empty name
    );

    expect(result.isFailure).toBe(true);
    expect(result.error.type).toBe('ValidationError');
    expect(result.error.message).toContain('name');
  });
});
```

### Integration Tests

```typescript
describe('RegisterUserUseCase', () => {
  it('should fail when user already exists', async () => {
    // Arrange
    const existingUser = await createUser();

    // Act
    const result = await registerUseCase.execute({
      email: existingUser.email,
      password: 'Password123',
      name: 'Test User'
    });

    // Assert
    expect(result.isFailure).toBe(true);
    expect(result.error.type).toBe('ConflictError');
    expect(result.error.code).toBe('USER_ALREADY_EXISTS');
  });
});
```

### E2E Tests

```typescript
describe('POST /api/auth/register', () => {
  it('should return 409 when user already exists', async () => {
    // Arrange
    await createUser({ email: 'test@example.com' });

    // Act
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Password123',
        name: 'Test User'
      });

    // Assert
    expect(response.status).toBe(409);
    expect(response.body.type).toBe('ConflictError');
  });
});
```

## Migration Guide

### From Exception-Based to Result Pattern

**Before (Exception-based):**
```typescript
class UserService {
  async register(email: string): Promise<User> {
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email'); // ❌
    }

    const existing = await this.repo.findByEmail(email);
    if (existing) {
      throw new Error('User exists'); // ❌
    }

    return await this.repo.save(new User(email));
  }
}
```

**After (Result pattern):**
```typescript
class RegisterUserUseCase {
  async execute(dto: RegisterUserDTO): Promise<Result<UserDTO, ApplicationError>> {
    const emailOrError = Email.create(dto.email);
    if (emailOrError.isFailure) {
      return Result.fail(new ValidationError('Invalid email')); // ✅
    }

    const exists = await this.repo.existsByEmail(emailOrError.value);
    if (exists) {
      return Result.fail(new ConflictError('User', dto.email)); // ✅
    }

    const userOrError = User.create(emailOrError.value, dto.name);
    if (userOrError.isFailure) {
      return Result.fail(new ValidationError(userOrError.error.message));
    }

    await this.repo.save(userOrError.value);
    return Result.ok(UserMapper.toDTO(userOrError.value));
  }
}
```

## Summary

ExCore's error taxonomy provides:

1. **Type Safety**: Errors are typed at compile-time
2. **Explicitness**: All failure paths are visible in type signatures
3. **Composability**: Results can be chained and combined
4. **Layer Separation**: Each layer handles errors appropriately
5. **Observability**: Errors are logged, tracked, and monitored

By following this taxonomy, ExCore applications achieve:
- Predictable error handling behavior
- Better debugging and troubleshooting
- Improved API consumer experience
- Reduced production incidents
- Clearer code intent and flow
