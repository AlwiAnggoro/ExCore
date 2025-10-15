# ESLint Boundary Rules - Examples

This document provides concrete examples of architectural boundary violations and their fixes.

## Example 1: Domain Importing Infrastructure (VIOLATION)

### ❌ Violation

```typescript
// File: packages/core/src/modules/user/domain/User.ts
import { Entity } from '../../../shared/domain/Entity';
import { Email } from './Email';
import { PasswordHash } from './PasswordHash';
import { DatabaseConnection } from '../../../shared/infrastructure/database/DatabaseConnection'; // ❌ VIOLATION!

export class User extends Entity<UserProps> {
  private constructor(
    props: UserProps,
    id?: UniqueEntityID
  ) {
    super(props, id);
  }

  public static async create(
    email: Email,
    password: string,
    name: string
  ): Promise<Result<User>> {
    // ❌ BAD: Domain entity directly using database
    const connection = await DatabaseConnection.getInstance();
    const exists = await connection.query('SELECT * FROM users WHERE email = ?', [email.value]);

    if (exists.length > 0) {
      return Result.fail('User already exists');
    }

    // Create user...
  }
}
```

**ESLint Error:**
```
error  Domain layer cannot import from infrastructure. Domain must remain infrastructure-agnostic  no-restricted-imports
```

### ✅ Fix

```typescript
// File: packages/core/src/modules/user/domain/IUserRepository.ts
export interface IUserRepository {
  existsByEmail(email: Email): Promise<boolean>;
  save(user: User): Promise<Result<void>>;
  findByEmail(email: Email): Promise<Result<User | null>>;
}

// File: packages/core/src/modules/user/domain/User.ts
import { Entity } from '../../../shared/domain/Entity';
import { Email } from './Email';
import { PasswordHash } from './PasswordHash';

export class User extends Entity<UserProps> {
  // Pure domain logic, no infrastructure
  private constructor(
    props: UserProps,
    id?: UniqueEntityID
  ) {
    super(props, id);
  }

  public static create(
    email: Email,
    passwordHash: PasswordHash,
    name: string
  ): Result<User> {
    // Business rules validation only
    if (!name || name.trim().length === 0) {
      return Result.fail('Name is required');
    }

    return Result.ok(new User({ email, passwordHash, name, createdAt: new Date() }));
  }
}

// File: packages/core/src/modules/user/application/usecases/RegisterUserUseCase.ts
export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: RegisterUserDTO): Promise<Result<UserDTO>> {
    // Check if user exists (infrastructure concern)
    const exists = await this.userRepository.existsByEmail(Email.create(dto.email));
    if (exists) {
      return Result.fail('User already exists');
    }

    // Create domain entity
    const passwordHash = await this.passwordHasher.hash(dto.password);
    const userOrError = User.create(
      Email.create(dto.email),
      PasswordHash.create(passwordHash),
      dto.name
    );

    if (userOrError.isFailure) {
      return Result.fail(userOrError.error);
    }

    // Persist (infrastructure concern)
    await this.userRepository.save(userOrError.value);

    return Result.ok(UserMapper.toDTO(userOrError.value));
  }
}
```

---

## Example 2: Application Importing Adapter (VIOLATION)

### ❌ Violation

```typescript
// File: packages/core/src/modules/user/application/usecases/LoginUseCase.ts
import { Request, Response } from 'express'; // ❌ VIOLATION!
import type { IUserRepository } from '../../domain/IUserRepository';
import type { IJWTService } from '../../domain/IJWTService';

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: IJWTService
  ) {}

  // ❌ BAD: Use case directly handling HTTP
  async execute(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    const user = await this.userRepository.findByEmail(Email.create(email));
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password, generate token...
    const token = this.jwtService.sign({ userId: user.id });

    res.json({ token, user: UserMapper.toDTO(user) });
  }
}
```

**ESLint Error:**
```
error  Application layer cannot import from adapters. Application must remain framework-agnostic  no-restricted-imports
```

### ✅ Fix

```typescript
// File: packages/core/src/modules/user/application/dto/LoginDTO.ts
export interface LoginDTO {
  email: string;
  password: string;
}

export interface LoginResultDTO {
  token: string;
  user: UserDTO;
}

// File: packages/core/src/modules/user/application/usecases/LoginUseCase.ts
import type { IUserRepository } from '../../domain/IUserRepository';
import type { IJWTService } from '../../domain/IJWTService';
import type { IPasswordHasher } from '../../domain/IPasswordHasher';
import { LoginDTO, LoginResultDTO } from '../dto/LoginDTO';

export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly jwtService: IJWTService,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(dto: LoginDTO): Promise<Result<LoginResultDTO>> {
    // Find user
    const userOrError = await this.userRepository.findByEmail(Email.create(dto.email));
    if (userOrError.isFailure || !userOrError.value) {
      return Result.fail('Invalid credentials');
    }

    const user = userOrError.value;

    // Verify password
    const isValid = await this.passwordHasher.compare(dto.password, user.passwordHash.value);
    if (!isValid) {
      return Result.fail('Invalid credentials');
    }

    // Generate token
    const token = this.jwtService.sign({ userId: user.id.toString() });

    return Result.ok({
      token,
      user: UserMapper.toDTO(user)
    });
  }
}

// File: packages/core/src/adapters/rest/routes/auth.routes.ts
import { LoginUseCase } from '../../../modules/user/application/usecases/LoginUseCase';

app.post('/api/auth/login', async (req, res) => {
  const dto: LoginDTO = {
    email: req.body.email,
    password: req.body.password
  };

  const result = await loginUseCase.execute(dto);

  if (result.isFailure) {
    return res.status(401).json({ error: result.error });
  }

  return res.json(result.value);
});
```

---

## Example 3: Circular Dependency (VIOLATION)

### ❌ Violation

```typescript
// File: packages/core/src/modules/user/domain/User.ts
import { Order } from '../../order/domain/Order'; // ❌ VIOLATION!

export class User extends Entity<UserProps> {
  private orders: Order[] = [];

  addOrder(order: Order): void {
    this.orders.push(order);
  }
}

// File: packages/core/src/modules/order/domain/Order.ts
import { User } from '../../user/domain/User'; // ❌ VIOLATION!

export class Order extends Entity<OrderProps> {
  constructor(
    props: OrderProps,
    private readonly user: User
  ) {
    super(props);
  }
}
```

**ESLint Error:**
```
error  Dependency cycle detected  import/no-cycle
```

### ✅ Fix - Option 1: Use IDs Instead

```typescript
// File: packages/core/src/modules/user/domain/User.ts
import { UniqueEntityID } from '../../../shared/domain/UniqueEntityID';

export class User extends Entity<UserProps> {
  private orderIds: UniqueEntityID[] = [];

  addOrderId(orderId: UniqueEntityID): void {
    this.orderIds.push(orderId);
  }

  getOrderIds(): readonly UniqueEntityID[] {
    return this.orderIds;
  }
}

// File: packages/core/src/modules/order/domain/Order.ts
import { UniqueEntityID } from '../../../shared/domain/UniqueEntityID';

export class Order extends Entity<OrderProps> {
  constructor(
    props: OrderProps,
    private readonly userId: UniqueEntityID
  ) {
    super(props);
  }

  getUserId(): UniqueEntityID {
    return this.userId;
  }
}
```

### ✅ Fix - Option 2: Domain Events

```typescript
// File: packages/core/src/modules/order/domain/events/OrderCreatedEvent.ts
export class OrderCreatedEvent implements IDomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly occurredAt: Date
  ) {}
}

// File: packages/core/src/modules/order/domain/Order.ts
export class Order extends AggregateRoot<OrderProps> {
  private constructor(props: OrderProps, id?: UniqueEntityID) {
    super(props, id);
  }

  static create(userId: string, items: OrderItem[]): Result<Order> {
    const order = new Order({ userId, items, status: 'pending', createdAt: new Date() });

    // Emit event instead of direct coupling
    order.addDomainEvent(new OrderCreatedEvent(
      order.id.toString(),
      userId,
      new Date()
    ));

    return Result.ok(order);
  }
}

// File: packages/core/src/modules/user/application/subscribers/OrderCreatedSubscriber.ts
export class OrderCreatedSubscriber {
  constructor(private readonly userRepository: IUserRepository) {}

  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    const user = await this.userRepository.findById(event.userId);
    if (user) {
      // Update user statistics, send notification, etc.
    }
  }
}
```

---

## Example 4: Infrastructure Importing Domain (WARNING)

### ⚠️ Suboptimal

```typescript
// File: packages/core/src/shared/infrastructure/persistence/UserRepositoryPostgres.ts
import { User } from '../../../modules/user/domain/User'; // ⚠️ Direct coupling

export class UserRepositoryPostgres {
  async save(user: User): Promise<void> {
    // Direct database access with domain entity
    await this.db.insert('users').values({
      id: user.id.toString(),
      email: user.email.value,
      password_hash: user.passwordHash.value,
      name: user.name,
      created_at: user.createdAt
    });
  }
}
```

### ✅ Better - Using Mapper Pattern

```typescript
// File: packages/core/src/modules/user/infrastructure/mappers/UserMapper.ts
interface UserPersistence {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
}

export class UserMapper {
  static toPersistence(user: User): UserPersistence {
    return {
      id: user.id.toString(),
      email: user.email.value,
      password_hash: user.passwordHash.value,
      name: user.name,
      created_at: user.createdAt
    };
  }

  static toDomain(raw: UserPersistence): Result<User> {
    const emailOrError = Email.create(raw.email);
    const passwordHashOrError = PasswordHash.create(raw.password_hash);

    if (emailOrError.isFailure) {
      return Result.fail(emailOrError.error);
    }

    if (passwordHashOrError.isFailure) {
      return Result.fail(passwordHashOrError.error);
    }

    const user = User.create(
      emailOrError.value,
      passwordHashOrError.value,
      raw.name
    );

    return user;
  }
}

// File: packages/core/src/modules/user/infrastructure/UserRepositoryPostgres.ts
import type { IUserRepository } from '../domain/IUserRepository';
import type { User } from '../domain/User';
import { UserMapper } from './mappers/UserMapper';

export class UserRepositoryPostgres implements IUserRepository {
  async save(user: User): Promise<Result<void>> {
    const persistence = UserMapper.toPersistence(user);

    await this.db.insert('users').values(persistence);

    return Result.ok();
  }

  async findByEmail(email: Email): Promise<Result<User | null>> {
    const raw = await this.db
      .select()
      .from('users')
      .where('email', email.value)
      .first();

    if (!raw) {
      return Result.ok(null);
    }

    return UserMapper.toDomain(raw);
  }
}
```

---

## Summary

| Violation Type | Impact | Fix Strategy |
|---------------|--------|--------------|
| Domain → Infrastructure | High | Extract interface, use DI |
| Application → Adapter | High | Use DTOs, inject dependencies |
| Circular Dependencies | High | Use IDs, domain events, or extract shared types |
| Infrastructure → Domain | Medium | Use mappers, implement repository pattern |
| Adapter → Domain | Medium | Go through application layer, use DTOs |

## Quick Reference

**✅ Allowed:**
- Domain → Shared (Entity, ValueObject, Result)
- Application → Domain (entities, interfaces)
- Application → Shared (Result, Guard)
- Infrastructure → Application (use cases via DI)
- Infrastructure → Domain (interfaces only)
- Adapter → Application (use cases, DTOs)

**❌ Forbidden:**
- Domain → Application
- Domain → Infrastructure
- Domain → Adapter
- Application → Infrastructure (implementations)
- Application → Adapter
- Adapter → Domain (except events)
