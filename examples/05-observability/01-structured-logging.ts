/**
 * Example: Structured Logging with PII Scrubbing
 *
 * Demonstrates how to use StructuredLogger with automatic PII redaction.
 */

import { StructuredLogger } from '@excore/core/shared';

// Example: Structured Logging
async function structuredLoggingExample() {
  console.log('=== Structured Logging Example ===\n');

  // Create logger in JSON mode
  const jsonLogger = new StructuredLogger({
    serviceName: 'excore-demo',
    environment: 'development',
    version: '1.0.0',
    pretty: false, // JSON output
  });

  // Create logger in pretty mode
  const prettyLogger = new StructuredLogger({
    serviceName: 'excore-demo',
    environment: 'development',
    version: '1.0.0',
    pretty: true, // Human-readable output
  });

  // Example 1: Basic logging
  console.log('1️⃣ Basic Logging:\n');
  prettyLogger.info('Application started');
  prettyLogger.debug('Loading configuration');
  prettyLogger.warn('High memory usage detected');
  prettyLogger.error('Failed to connect to database');

  // Example 2: Logging with context
  console.log('\n2️⃣ Logging with Context:\n');
  prettyLogger.info('User logged in', {
    userId: 'user-123',
    username: 'john.doe',
    ipAddress: '192.168.1.1',
  });

  prettyLogger.info('API request processed', {
    method: 'POST',
    path: '/api/users',
    statusCode: 201,
    duration: 45,
  });

  // Example 3: PII Scrubbing - Emails
  console.log('\n3️⃣ PII Scrubbing - Emails:\n');
  prettyLogger.info('User registration', {
    email: 'sensitive@example.com', // Will be redacted
    name: 'John Doe',
    age: 30,
  });

  // Example 4: PII Scrubbing - Passwords
  console.log('\n4️⃣ PII Scrubbing - Passwords:\n');
  prettyLogger.info('Login attempt', {
    username: 'john.doe',
    password: 'SuperSecret123!', // Will be redacted
    remember: true,
  });

  // Example 5: PII Scrubbing - Credit Cards
  console.log('\n5️⃣ PII Scrubbing - Credit Cards:\n');
  prettyLogger.info('Payment processed', {
    orderId: 'order-456',
    cardNumber: '4532-1234-5678-9010', // Will be redacted
    amount: 99.99,
    currency: 'USD',
  });

  // Example 6: PII Scrubbing - Tokens
  console.log('\n6️⃣ PII Scrubbing - Tokens:\n');
  prettyLogger.info('API request with auth', {
    endpoint: '/api/protected',
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Will be redacted
    userId: 'user-789',
  });

  // Example 7: Correlation IDs
  console.log('\n7️⃣ Correlation IDs:\n');
  prettyLogger.info('Processing request', {
    correlationId: 'req-abc-123',
    userId: 'user-456',
    action: 'create-post',
  });

  prettyLogger.info('Database query', {
    correlationId: 'req-abc-123',
    query: 'INSERT INTO posts',
    duration: 12,
  });

  prettyLogger.info('Request completed', {
    correlationId: 'req-abc-123',
    statusCode: 201,
    totalDuration: 58,
  });

  // Example 8: Error logging
  console.log('\n8️⃣ Error Logging:\n');
  try {
    throw new Error('Database connection timeout');
  } catch (error) {
    prettyLogger.error('Database error occurred', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      database: 'postgresql',
      host: 'db.example.com',
    });
  }

  // Example 9: Performance metrics
  console.log('\n9️⃣ Performance Metrics:\n');
  prettyLogger.info('Cache hit', {
    key: 'user:profile:123',
    ttl: 3600,
    size: 1024,
  });

  prettyLogger.info('Query performance', {
    operation: 'SELECT',
    table: 'users',
    duration: 5,
    rowsAffected: 1,
  });

  // Example 10: JSON mode output
  console.log('\n🔟 JSON Mode Output:\n');
  console.log('(Typical production format)\n');

  jsonLogger.info('User action', {
    userId: 'user-123',
    action: 'update-profile',
    changes: {
      name: 'John Smith',
      email: 'new-email@example.com', // Will be redacted
    },
  });

  // Example 11: Different log levels
  console.log('\n1️⃣1️⃣ Different Log Levels:\n');

  prettyLogger.debug('Debug info', { detail: 'Debugging information' });
  prettyLogger.info('Info message', { status: 'ok' });
  prettyLogger.warn('Warning message', { threshold: 80, current: 85 });
  prettyLogger.error('Error message', { code: 500, message: 'Internal error' });

  // Example 12: Structured business events
  console.log('\n1️⃣2️⃣ Business Events:\n');

  prettyLogger.info('Order created', {
    orderId: 'order-789',
    customerId: 'customer-456',
    amount: 299.99,
    items: 3,
    shippingMethod: 'express',
  });

  prettyLogger.info('Payment processed', {
    orderId: 'order-789',
    paymentMethod: 'credit-card',
    last4: '9010', // Safe to log
    amount: 299.99,
  });

  prettyLogger.info('Order shipped', {
    orderId: 'order-789',
    trackingNumber: 'TRACK-123456',
    carrier: 'DHL',
  });
}

// Run the example
structuredLoggingExample()
  .then(() => {
    console.log('\n✨ Structured Logging examples completed!');
  })
  .catch((error) => {
    console.error('❌ Example failed:', error);
  });
