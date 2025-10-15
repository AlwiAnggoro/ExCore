/**
 * Example: Value Objects
 *
 * Demonstrates how to create and use Value Objects in ExCore.
 * Value Objects are immutable objects defined by their attributes.
 */

import { ValueObject } from '@excore/core/shared';
import { Result } from '@excore/core/shared';

// Example 1: Simple Value Object - Email
interface EmailProps {
  value: string;
}

class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(email: string): Result<Email, string> {
    if (!email || email.trim().length === 0) {
      return Result.fail('Email cannot be empty');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Result.fail('Email format is invalid');
    }

    return Result.ok(new Email({ value: email.toLowerCase() }));
  }
}

// Example 2: Complex Value Object - Money
interface MoneyProps {
  amount: number;
  currency: string;
}

class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  public static create(amount: number, currency: string): Result<Money, string> {
    if (amount < 0) {
      return Result.fail('Amount cannot be negative');
    }

    const validCurrencies = ['USD', 'EUR', 'GBP', 'TRY'];
    if (!validCurrencies.includes(currency)) {
      return Result.fail(`Invalid currency. Must be one of: ${validCurrencies.join(', ')}`);
    }

    return Result.ok(new Money({ amount, currency }));
  }

  public add(other: Money): Result<Money, string> {
    if (this.currency !== other.currency) {
      return Result.fail('Cannot add money with different currencies');
    }

    return Money.create(this.amount + other.amount, this.currency);
  }

  public format(): string {
    return `${this.amount.toFixed(2)} ${this.currency}`;
  }
}

// Example 3: Value Object with validation - PhoneNumber
interface PhoneNumberProps {
  countryCode: string;
  number: string;
}

class PhoneNumber extends ValueObject<PhoneNumberProps> {
  private constructor(props: PhoneNumberProps) {
    super(props);
  }

  get fullNumber(): string {
    return `${this.props.countryCode}${this.props.number}`;
  }

  public static create(countryCode: string, number: string): Result<PhoneNumber, string> {
    // Remove spaces and dashes
    const cleanNumber = number.replace(/[\s-]/g, '');

    if (!cleanNumber.match(/^\d{10}$/)) {
      return Result.fail('Phone number must be 10 digits');
    }

    if (!countryCode.startsWith('+')) {
      return Result.fail('Country code must start with +');
    }

    return Result.ok(new PhoneNumber({ countryCode, number: cleanNumber }));
  }

  public format(): string {
    const { countryCode, number } = this.props;
    return `${countryCode} (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
  }
}

// Usage Examples
console.log('=== Email Value Object ===');
const email1 = Email.create('user@example.com');
const email2 = Email.create('user@example.com');
const email3 = Email.create('invalid-email');

if (email1.isSuccess && email2.isSuccess) {
  console.log('✅ Email 1:', email1.value.value);
  console.log('✅ Email 2:', email2.value.value);
  console.log('Emails are equal:', email1.value.equals(email2.value)); // true (same value)
}

if (email3.isFailure) {
  console.log('❌ Invalid email:', email3.error);
}

console.log('\n=== Money Value Object ===');
const money1 = Money.create(100, 'USD');
const money2 = Money.create(50, 'USD');
const money3 = Money.create(75, 'EUR');

if (money1.isSuccess && money2.isSuccess) {
  console.log('✅ Money 1:', money1.value.format());
  console.log('✅ Money 2:', money2.value.format());

  const sum = money1.value.add(money2.value);
  if (sum.isSuccess) {
    console.log('✅ Sum:', sum.value.format()); // 150.00 USD
  }
}

if (money1.isSuccess && money3.isSuccess) {
  const invalidSum = money1.value.add(money3.value);
  if (invalidSum.isFailure) {
    console.log('❌ Cannot add:', invalidSum.error); // Different currencies
  }
}

console.log('\n=== PhoneNumber Value Object ===');
const phone1 = PhoneNumber.create('+1', '5551234567');
const phone2 = PhoneNumber.create('+90', '5551234567');

if (phone1.isSuccess) {
  console.log('✅ Phone 1:', phone1.value.format());
  console.log('Full number:', phone1.value.fullNumber);
}

if (phone2.isSuccess) {
  console.log('✅ Phone 2:', phone2.value.format());
}

console.log('\n✨ Value Objects examples completed!');
