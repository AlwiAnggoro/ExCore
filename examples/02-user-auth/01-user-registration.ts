/**
 * Example: User Registration
 *
 * Demonstrates how to register a new user using the User module.
 */

import { Email, PasswordHash } from '@excore/core/user';
import { RegisterUserUseCase } from '@excore/core/user';
import { Result } from '@excore/core/shared';

// Mock repository for demonstration
class MockUserRepository {
  private users: Map<string, any> = new Map();

  async existsByEmail(email: string): Promise<boolean> {
    return this.users.has(email);
  }

  async save(user: any): Promise<Result<void, string>> {
    this.users.set(user.email.value, user);
    console.log(`📝 User saved: ${user.email.value}`);
    return Result.ok(undefined);
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.users.get(email) || null;
  }

  getAll(): any[] {
    return Array.from(this.users.values());
  }
}

// Example: User Registration Flow
async function registerUserExample() {
  console.log('=== User Registration Example ===\n');

  // Create repository
  const userRepository = new MockUserRepository();

  // Create use case
  const registerUseCase = new RegisterUserUseCase(userRepository);

  // Example 1: Successful registration
  console.log('1️⃣ Successful Registration:');
  const result1 = await registerUseCase.execute({
    email: 'john.doe@example.com',
    password: 'SecurePass123!',
    name: 'John Doe',
  });

  if (result1.isSuccess) {
    console.log('✅ User registered successfully!');
    console.log('User ID:', result1.value.id);
    console.log('Email:', result1.value.email);
    console.log('Name:', result1.value.name);
  } else {
    console.log('❌ Registration failed:', result1.error);
  }

  // Example 2: Invalid email format
  console.log('\n2️⃣ Invalid Email Format:');
  const result2 = await registerUseCase.execute({
    email: 'invalid-email',
    password: 'SecurePass123!',
    name: 'Jane Doe',
  });

  if (result2.isFailure) {
    console.log('❌ Registration failed:', result2.error);
  }

  // Example 3: Duplicate email
  console.log('\n3️⃣ Duplicate Email:');
  const result3 = await registerUseCase.execute({
    email: 'john.doe@example.com', // Same as first user
    password: 'AnotherPass456!',
    name: 'John Smith',
  });

  if (result3.isFailure) {
    console.log('❌ Registration failed:', result3.error);
  }

  // Example 4: Weak password
  console.log('\n4️⃣ Weak Password:');
  const result4 = await registerUseCase.execute({
    email: 'weak@example.com',
    password: '12345',
    name: 'Weak Password User',
  });

  if (result4.isFailure) {
    console.log('❌ Registration failed:', result4.error);
  }

  // Example 5: Multiple successful registrations
  console.log('\n5️⃣ Multiple Successful Registrations:');
  const users = [
    { email: 'alice@example.com', password: 'AlicePass123!', name: 'Alice' },
    { email: 'bob@example.com', password: 'BobPass456!', name: 'Bob' },
    { email: 'charlie@example.com', password: 'CharliePass789!', name: 'Charlie' },
  ];

  for (const userData of users) {
    const result = await registerUseCase.execute(userData);
    if (result.isSuccess) {
      console.log(`✅ ${userData.name} registered successfully`);
    }
  }

  // Show all registered users
  console.log('\n📊 All Registered Users:');
  const allUsers = userRepository.getAll();
  allUsers.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name} (${user.email.value})`);
  });
}

// Run the example
registerUserExample()
  .then(() => {
    console.log('\n✨ User Registration examples completed!');
  })
  .catch((error) => {
    console.error('❌ Example failed:', error);
  });
