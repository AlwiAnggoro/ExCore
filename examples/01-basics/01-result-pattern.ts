/**
 * Example: Result Pattern
 *
 * Demonstrates how to use the Result pattern for error handling
 * without throwing exceptions.
 */

import { Result } from '@excore/core/shared';

// Example 1: Creating successful results
function divideNumbers(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Result.fail('Cannot divide by zero');
  }
  return Result.ok(a / b);
}

// Example 2: Handling results
const result1 = divideNumbers(10, 2);
if (result1.isSuccess) {
  console.log('✅ Division successful:', result1.value); // 5
} else {
  console.error('❌ Division failed:', result1.error);
}

const result2 = divideNumbers(10, 0);
if (result2.isFailure) {
  console.error('❌ Division failed:', result2.error); // Cannot divide by zero
}

// Example 3: Chaining results
function calculatePercentage(value: number, total: number): Result<number, string> {
  const divisionResult = divideNumbers(value, total);

  if (divisionResult.isFailure) {
    return Result.fail(divisionResult.error);
  }

  return Result.ok(divisionResult.value * 100);
}

const percentageResult = calculatePercentage(25, 100);
console.log('Percentage:', percentageResult.value); // 25

// Example 4: Multiple validation steps
interface UserInput {
  email: string;
  age: number;
}

function validateEmail(email: string): Result<string, string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return Result.fail('Invalid email format');
  }
  return Result.ok(email);
}

function validateAge(age: number): Result<number, string> {
  if (age < 18) {
    return Result.fail('Must be 18 or older');
  }
  if (age > 120) {
    return Result.fail('Invalid age');
  }
  return Result.ok(age);
}

function validateUser(input: UserInput): Result<UserInput, string> {
  const emailResult = validateEmail(input.email);
  if (emailResult.isFailure) {
    return Result.fail(emailResult.error);
  }

  const ageResult = validateAge(input.age);
  if (ageResult.isFailure) {
    return Result.fail(ageResult.error);
  }

  return Result.ok(input);
}

// Test validation
const validUser = validateUser({ email: 'user@example.com', age: 25 });
console.log('✅ Valid user:', validUser.isSuccess);

const invalidUser = validateUser({ email: 'invalid-email', age: 25 });
console.log('❌ Invalid user:', invalidUser.error); // Invalid email format

console.log('\n✨ Result Pattern examples completed!');
