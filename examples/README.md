# ExCore Examples

Welcome to the ExCore examples! This directory contains practical, runnable examples demonstrating how to use ExCore's features and modules.

## 📚 Table of Contents

- [Getting Started](#getting-started)
- [Examples Overview](#examples-overview)
- [Running Examples](#running-examples)
- [Example Categories](#example-categories)

---

## 🚀 Getting Started

### Prerequisites

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build
```

### Running an Example

```bash
# Run any example using tsx
npx tsx examples/01-basics/01-result-pattern.ts

# Or use Node.js directly (after building)
node examples/01-basics/01-result-pattern.js
```

---

## 📖 Examples Overview

### 01. Basics

Learn the fundamental patterns and building blocks of ExCore.

| File | Description | Concepts |
|------|-------------|----------|
| `01-result-pattern.ts` | Error handling without exceptions | Result<T, E>, Success/Failure |
| `02-value-objects.ts` | Immutable domain objects | ValueObject, Equality, Validation |

**Key Takeaways:**
- ✅ Use `Result` pattern instead of throwing exceptions
- ✅ Create immutable Value Objects for domain concepts
- ✅ Validate inputs at object creation time
- ✅ Compare Value Objects by their attributes

**Run Examples:**
```bash
npx tsx examples/01-basics/01-result-pattern.ts
npx tsx examples/01-basics/02-value-objects.ts
```

---

### 02. User & Authentication

Examples demonstrating user management and JWT authentication.

| File | Description | Concepts |
|------|-------------|----------|
| `01-user-registration.ts` | User registration flow | RegisterUserUseCase, Email, PasswordHash |
| `02-authentication.ts` | JWT login and token refresh | LoginUseCase, RefreshTokenUseCase, JWT |

**Key Takeaways:**
- ✅ Validate email and password formats
- ✅ Use use cases for business logic
- ✅ Generate and verify JWT tokens
- ✅ Implement refresh token flow
- ✅ Handle authentication errors gracefully

**Run Examples:**
```bash
npx tsx examples/02-user-auth/01-user-registration.ts
npx tsx examples/02-user-auth/02-authentication.ts
```

---

### 03. Roles & Permissions

Learn how to implement Role-Based Access Control (RBAC).

| File | Description | Concepts |
|------|-------------|----------|
| `01-role-management.ts` | Create and manage roles | CreateRoleUseCase, Role, Permissions |
| `02-policy-evaluation.ts` | Evaluate user permissions | RBACPolicyEvaluator, PolicyContext |

**Key Takeaways:**
- ✅ Create roles with specific permissions
- ✅ Use wildcard permissions (`articles:*`)
- ✅ Evaluate permissions for users
- ✅ Support multiple roles per user
- ✅ Implement hierarchical permissions

**Run Examples:**
```bash
npx tsx examples/03-roles-permissions/01-role-management.ts
npx tsx examples/03-roles-permissions/02-policy-evaluation.ts
```

---

### 04. Real-Time Communication

Examples showing how to implement real-time features.

| File | Description | Concepts |
|------|-------------|----------|
| `01-sse-server.ts` | Server-Sent Events for push notifications | SSEManager, Channels, Broadcasting |

**Key Takeaways:**
- ✅ Send real-time updates to specific users
- ✅ Broadcast messages to channels
- ✅ Track active connections
- ✅ Handle connection lifecycle
- ✅ Implement heartbeat mechanism

**Run Examples:**
```bash
npx tsx examples/04-real-time/01-sse-server.ts
```

---

### 05. Observability

Learn how to implement logging and monitoring.

| File | Description | Concepts |
|------|-------------|----------|
| `01-structured-logging.ts` | JSON logging with PII scrubbing | StructuredLogger, PII Redaction, Correlation IDs |

**Key Takeaways:**
- ✅ Use structured (JSON) logging
- ✅ Automatic PII scrubbing (emails, passwords, tokens, credit cards)
- ✅ Add correlation IDs for request tracking
- ✅ Log errors with context
- ✅ Support both JSON and pretty modes

**Run Examples:**
```bash
npx tsx examples/05-observability/01-structured-logging.ts
```

---

## 🎯 Example Patterns

### Pattern 1: Result-Based Error Handling

```typescript
import { Result } from '@excore/core/shared';

function doSomething(): Result<string, string> {
  if (/* error condition */) {
    return Result.fail('Error message');
  }
  return Result.ok('Success value');
}

const result = doSomething();
if (result.isSuccess) {
  console.log('Success:', result.value);
} else {
  console.error('Error:', result.error);
}
```

### Pattern 2: Use Case Execution

```typescript
import { RegisterUserUseCase } from '@excore/core/user';

const useCase = new RegisterUserUseCase(repository);

const result = await useCase.execute({
  email: 'user@example.com',
  password: 'SecurePass123!',
  name: 'John Doe',
});

if (result.isSuccess) {
  console.log('User registered:', result.value);
}
```

### Pattern 3: Value Object Creation

```typescript
import { Email } from '@excore/core/user';

const emailResult = Email.create('user@example.com');

if (emailResult.isSuccess) {
  const email = emailResult.value;
  console.log('Valid email:', email.value);
}
```

### Pattern 4: Policy Evaluation

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
  // User has permission
}
```

---

## 🔍 Example Structure

Each example follows this structure:

1. **Import Statements**: Import required modules from ExCore
2. **Mock/Setup**: Create mock repositories or services
3. **Example Scenarios**: Multiple scenarios demonstrating different use cases
4. **Error Handling**: Show how to handle failures
5. **Output**: Console output with clear formatting

---

## 💡 Tips

### Best Practices

1. **Always Check Results**: Never assume operations succeed
   ```typescript
   if (result.isSuccess) {
     // Use result.value
   } else {
     // Handle result.error
   }
   ```

2. **Use TypeScript**: Take advantage of type safety
   ```typescript
   const result: Result<User, string> = await useCase.execute(dto);
   ```

3. **Validate Early**: Validate inputs at the domain boundary
   ```typescript
   const email = Email.create(input); // Validates format
   if (email.isFailure) return email; // Early return
   ```

4. **Separate Concerns**: Use layers correctly
   - **Domain**: Business logic, validation
   - **Application**: Use cases, orchestration
   - **Infrastructure**: Persistence, external services

### Common Pitfalls

❌ **Don't throw exceptions in domain logic**
```typescript
// Bad
if (!email) throw new Error('Invalid email');

// Good
if (!email) return Result.fail('Invalid email');
```

❌ **Don't skip validation**
```typescript
// Bad
const user = new User({ email: input }); // No validation

// Good
const emailResult = Email.create(input);
if (emailResult.isFailure) return emailResult;
const user = new User({ email: emailResult.value });
```

❌ **Don't ignore errors**
```typescript
// Bad
const result = await useCase.execute(dto);
console.log(result.value); // Might be undefined!

// Good
if (result.isSuccess) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

---

## 📚 Further Reading

- **[Main README](../README.md)**: Project overview and features
- **[Development Guide](../README_DEV.md)**: Setup and contribution guidelines
- **[Roadmap](../roadmap.md)**: Project phases and completion status
- **[Documentation](../docs/)**: Detailed technical documentation

---

## 🤝 Contributing Examples

Want to add more examples? Great! Please:

1. Follow the existing example structure
2. Add clear comments and explanations
3. Include multiple scenarios (success + failure cases)
4. Update this README with your example
5. Test your example before submitting

---

## 📝 Example Checklist

When creating a new example:

- [ ] Clear purpose and learning objectives
- [ ] Imports from `@excore/core/*`
- [ ] Mock implementations for dependencies
- [ ] Multiple scenarios (at least 3)
- [ ] Success and failure cases
- [ ] Clear console output with emojis
- [ ] Comments explaining key concepts
- [ ] TypeScript types included
- [ ] Entry in this README

---

## ✨ Summary

These examples demonstrate:

- ✅ **Basics**: Result pattern, Value Objects
- ✅ **User & Auth**: Registration, JWT authentication
- ✅ **RBAC**: Roles, permissions, policy evaluation
- ✅ **Real-Time**: SSE for push notifications
- ✅ **Observability**: Structured logging with PII scrubbing

Start with the basics and progress through each category to master ExCore! 🚀

---

**Built with ❤️ using Clean Architecture, Domain-Driven Design, and TypeScript**
