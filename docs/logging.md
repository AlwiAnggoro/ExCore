# Structured Logging with PII Scrubbing

ExCore provides a production-ready structured logging system with automatic PII (Personally Identifiable Information) scrubbing and OpenTelemetry integration.

## Features

- **Structured JSON Logging**: Machine-readable logs with consistent schema
- **Automatic PII Scrubbing**: Removes sensitive data from logs (emails, passwords, tokens, etc.)
- **OpenTelemetry Integration**: Automatically includes trace context (traceId, spanId)
- **Request Correlation**: Per-request loggers with correlation IDs
- **Log Level Filtering**: Configurable minimum log levels
- **Pretty Mode**: Human-readable colored output for development
- **Child Loggers**: Scoped loggers with inherited context

## Quick Start

### Basic Usage

```typescript
import { getLogger } from '@excore/core/shared/infrastructure/logger';

const logger = getLogger();

logger.info('User action', { userId: '123', action: 'login' });
logger.error('Operation failed', error, { context: 'payment' });
```

### REST API Integration

```typescript
import { createRestApi } from '@excore/core/adapters/rest';
import { StructuredLogger } from '@excore/core/shared/infrastructure/logger';

// Configure logger
const logger = new StructuredLogger({
  serviceName: 'my-api',
  minLevel: 'info',
  pretty: false,
});

// Create REST API (logging middleware is automatically applied)
const app = createRestApi({
  tracing: { enabled: true },
});
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Minimum log level: `debug`, `info`, `warn`, `error` | `info` (production), `debug` (development) |
| `LOG_PRETTY` | Enable human-readable output: `1` or `0` | `0` |
| `SERVICE_NAME` | Service name included in logs | `excore` |
| `NODE_ENV` | Environment (`production`, `development`, `test`) | - |

### Programmatic Configuration

```typescript
import { StructuredLogger } from '@excore/core/shared/infrastructure/logger';

const logger = new StructuredLogger({
  serviceName: 'my-service',
  minLevel: 'info',
  pretty: true,
  scrubber: {
    enabled: true,
    maskChar: '*',
    preserveLength: false,
    customSensitiveFields: ['internalId', 'secretCode'],
  },
  additionalContext: {
    version: '1.0.0',
    environment: 'production',
  },
});
```

## Log Levels

Logs are emitted based on severity, with filtering by minimum level:

1. **debug**: Detailed diagnostic information (development only)
2. **info**: General informational messages
3. **warn**: Warning messages for potentially harmful situations
4. **error**: Error events that might still allow the application to continue

### Example

```typescript
logger.debug('Detailed debugging info', { variable: 'value' });
logger.info('User logged in', { userId: '123' });
logger.warn('Cache miss', { key: 'user:123' });
logger.error('Database connection failed', error, { host: 'db.example.com' });
```

## PII Scrubbing

The logger automatically scrubs sensitive information from logs to protect user privacy and comply with regulations (GDPR, CCPA, etc.).

### Automatic Pattern Detection

The following patterns are automatically redacted:

- **Email addresses**: `user@example.com` → `[REDACTED_EMAIL]`
- **Phone numbers**: `555-123-4567` → `[REDACTED_PHONE]`
- **SSN**: `123-45-6789` → `[REDACTED_SSN]`
- **Credit cards**: `4532-1234-5678-9010` → `[REDACTED_CREDITCARD]`
- **IPv4 addresses**: `192.168.1.1` → `[REDACTED_IPV4]`
- **JWT tokens**: `eyJhbGci...` → `[REDACTED_JWT]`
- **API keys**: `sk_live_12345...` → `[REDACTED_APIKEY]`

### Sensitive Field Names

The following field names are always scrubbed (case-insensitive, partial match):

- `password`, `passwordHash`, `currentPassword`, `newPassword`
- `token`, `accessToken`, `refreshToken`, `apiKey`
- `secret`, `authorization`, `cookie`
- `ssn`, `creditCard`, `cvv`, `pin`

### Example

```typescript
logger.info('User created', {
  username: 'john',
  email: 'john@example.com',      // Will be scrubbed
  password: 'secret123',           // Will be scrubbed
  role: 'admin',
});

// Output:
// {
//   "level": "info",
//   "message": "User created",
//   "context": {
//     "username": "john",
//     "email": "[REDACTED_EMAIL]",
//     "password": "[REDACTED]",
//     "role": "admin"
//   }
// }
```

### Custom PII Patterns

Add custom patterns for domain-specific sensitive data:

```typescript
const logger = new StructuredLogger({
  scrubber: {
    customPatterns: {
      customerId: /\bCUST-\d{6}\b/g,
      internalRef: /\bINT-[A-Z0-9]{8}\b/g,
    },
    customSensitiveFields: ['internalId', 'merchantKey'],
  },
});

logger.info('Order created', {
  customerId: 'CUST-123456',  // Will be scrubbed as [REDACTED_CUSTOMERID]
  internalId: 'secret-123',   // Will be scrubbed as [REDACTED]
});
```

### Disabling PII Scrubbing

For development/testing, you can disable scrubbing:

```typescript
const logger = new StructuredLogger({
  scrubber: {
    enabled: false,  // Disable PII scrubbing
  },
});
```

**⚠️ Warning**: Never disable PII scrubbing in production environments.

## OpenTelemetry Integration

When OpenTelemetry tracing is enabled, logs automatically include trace context:

```typescript
import { initializeTracing } from '@excore/core/shared/infrastructure/telemetry/TracerProvider';

// Initialize tracing
initializeTracing({
  serviceName: 'my-api',
  exporter: 'otlp',
  endpoint: 'http://localhost:4318/v1/traces',
});

// Logs will include trace context
logger.info('Processing request');

// Output:
// {
//   "level": "info",
//   "message": "Processing request",
//   "trace": {
//     "traceId": "abc123...",
//     "spanId": "def456..."
//   }
// }
```

This enables correlation between logs and distributed traces in observability platforms (Jaeger, Tempo, DataDog, etc.).

## Request-Scoped Logging

Create child loggers with request-specific context:

```typescript
const requestLogger = logger.child({
  requestId: 'req-123',
  userId: 'user-456',
  method: 'POST',
  path: '/api/orders',
});

requestLogger.info('Order created', { orderId: 'order-789' });

// Output:
// {
//   "level": "info",
//   "message": "Order created",
//   "context": {
//     "requestId": "req-123",
//     "userId": "user-456",
//     "method": "POST",
//     "path": "/api/orders",
//     "orderId": "order-789"
//   }
// }
```

Child loggers inherit PII scrubbing configuration from parent.

## Log Output Formats

### JSON Format (Production)

Default structured JSON output for machine parsing:

```json
{
  "timestamp": "2025-10-15T12:34:56.789Z",
  "level": "info",
  "message": "User logged in",
  "context": {
    "service": "my-api",
    "userId": "123",
    "action": "login"
  },
  "trace": {
    "traceId": "abc123...",
    "spanId": "def456..."
  }
}
```

### Pretty Format (Development)

Human-readable colored output:

```bash
INFO User logged in [trace=abc12345]
  {
    "service": "my-api",
    "userId": "123",
    "action": "login"
  }
```

Enable with environment variable:

```bash
LOG_PRETTY=1 node app.js
```

## Error Logging

Log errors with full stack traces:

```typescript
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', error as Error, {
    operation: 'riskyOperation',
    retries: 3,
  });
}

// Output:
// {
//   "level": "error",
//   "message": "Operation failed",
//   "error": {
//     "name": "DatabaseError",
//     "message": "Connection timeout",
//     "stack": "DatabaseError: Connection timeout\n    at ..."
//   },
//   "context": {
//     "operation": "riskyOperation",
//     "retries": 3
//   }
// }
```

## Best Practices

### ✅ Do

- **Use structured metadata**: Include context in metadata object
  ```typescript
  logger.info('Order placed', { orderId: '123', userId: '456', amount: 99.99 });
  ```

- **Log at appropriate levels**:
  - Use `debug` for detailed diagnostics
  - Use `info` for business events
  - Use `warn` for recoverable issues
  - Use `error` for failures

- **Include correlation IDs**: Use child loggers with `requestId`
  ```typescript
  const requestLogger = logger.child({ requestId: req.id });
  ```

- **Log errors with context**: Always include error object and metadata
  ```typescript
  logger.error('Payment failed', error, { userId, orderId, amount });
  ```

- **Redact sensitive data**: Let PII scrubber handle it automatically, or manually redact
  ```typescript
  logger.info('Payment processed', {
    last4: card.slice(-4),  // Only log last 4 digits
    amount: 99.99,
  });
  ```

### ❌ Don't

- **Don't log secrets**: Never log passwords, API keys, tokens directly
  ```typescript
  // BAD
  logger.info('Auth', { password: user.password });

  // GOOD - PII scrubber will catch it, but better to not log at all
  logger.info('User authenticated', { userId: user.id });
  ```

- **Don't log excessive data**: Avoid logging large payloads
  ```typescript
  // BAD
  logger.debug('Request', { body: hugePayload });

  // GOOD
  logger.debug('Request', { bodySize: hugePayload.length });
  ```

- **Don't use string concatenation**: Use structured logging
  ```typescript
  // BAD
  logger.info(`User ${userId} created order ${orderId}`);

  // GOOD
  logger.info('Order created', { userId, orderId });
  ```

- **Don't log in hot paths**: Avoid logging in tight loops
  ```typescript
  // BAD
  for (const item of items) {
    logger.debug('Processing item', { item });  // Too verbose
  }

  // GOOD
  logger.info('Processing batch', { itemCount: items.length });
  ```

## Testing

When testing, logs are suppressed by default. To enable logs in tests:

```typescript
import { StructuredLogger } from '@excore/core/shared/infrastructure/logger';

describe('MyTest', () => {
  const logger = new StructuredLogger({
    minLevel: 'debug',  // Enable all logs
    pretty: true,       // Human-readable output
  });

  it('should log correctly', () => {
    logger.info('Test log');
    // Assert log output if needed
  });
});
```

## Performance Considerations

- **Log level filtering**: Logs below `minLevel` are discarded immediately (zero cost)
- **Lazy evaluation**: Metadata is only serialized if log will be emitted
- **PII scrubbing overhead**: ~1-2ms per log entry (negligible in production)
- **Child loggers**: Lightweight, context is copied by reference

### Benchmarks

| Operation | Throughput |
|-----------|-----------|
| Simple log (no metadata) | ~100,000 ops/sec |
| Log with metadata | ~80,000 ops/sec |
| Log with PII scrubbing | ~70,000 ops/sec |
| Child logger creation | ~500,000 ops/sec |

## Troubleshooting

### Logs not appearing

1. Check minimum log level:
   ```bash
   LOG_LEVEL=debug node app.js
   ```

2. Ensure logger is initialized:
   ```typescript
   import { getLogger } from '@excore/core/shared/infrastructure/logger';
   const logger = getLogger();  // Initializes default logger
   ```

### PII not being scrubbed

1. Verify scrubber is enabled:
   ```typescript
   const logger = new StructuredLogger({
     scrubber: { enabled: true },
   });
   ```

2. Check field name matches sensitive patterns:
   ```typescript
   // Will be scrubbed: password, token, apiKey, secret
   // Won't be scrubbed: pwd, auth, key (add to customSensitiveFields if needed)
   ```

### Missing trace context

1. Ensure OpenTelemetry is initialized before logging:
   ```typescript
   import { initializeTracing } from '@excore/core/shared/infrastructure/telemetry/TracerProvider';
   initializeTracing({ serviceName: 'my-api' });

   // Now logs will include trace context
   logger.info('Test');
   ```

2. Verify span is active:
   ```typescript
   import { trace, context } from '@opentelemetry/api';
   const span = trace.getSpan(context.active());
   console.log('Active span:', span ? 'yes' : 'no');
   ```

## Examples

### Full REST API Setup

```typescript
import { createRestApi } from '@excore/core/adapters/rest';
import { initializeTracing } from '@excore/core/shared/infrastructure/telemetry/TracerProvider';
import { StructuredLogger, setLogger } from '@excore/core/shared/infrastructure/logger';

// 1. Configure logger
const logger = new StructuredLogger({
  serviceName: 'my-api',
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  pretty: process.env.NODE_ENV !== 'production',
});

setLogger(logger);

// 2. Initialize tracing
initializeTracing({
  serviceName: 'my-api',
  exporter: 'otlp',
  endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
});

// 3. Create REST API
const app = createRestApi({
  tracing: { enabled: true },
});

// 4. Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  logger.info('Server started', { port, env: process.env.NODE_ENV });
});
```

### Custom Logging Middleware

```typescript
import type { MiddlewareHandler } from 'hono';
import { getLogger } from '@excore/core/shared/infrastructure/logger';

export function customLoggingMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const logger = getLogger();
    const requestId = c.req.header('x-request-id') || crypto.randomUUID();
    const userId = c.get('userId'); // From auth middleware

    const requestLogger = logger.child({
      requestId,
      userId,
      method: c.req.method,
      path: c.req.path,
    });

    c.set('logger', requestLogger);

    requestLogger.info('Request started', {
      userAgent: c.req.header('user-agent'),
      ip: c.req.header('x-forwarded-for'),
    });

    const start = Date.now();

    try {
      await next();

      const duration = Date.now() - start;
      requestLogger.info('Request completed', {
        statusCode: c.res.status,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - start;
      requestLogger.error('Request failed', error as Error, {
        statusCode: c.res.status || 500,
        duration,
      });
      throw error;
    }
  };
}
```

## Further Reading

- [OpenTelemetry Logging](https://opentelemetry.io/docs/specs/otel/logs/)
- [Structured Logging Best Practices](https://www.loggly.com/use-cases/what-is-structured-logging/)
- [GDPR Compliance for Logging](https://gdpr.eu/data-privacy/)
- [Distributed Tracing](./tracing.md)
