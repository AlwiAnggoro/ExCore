# Chaos Engineering Guide

ExCore provides built-in chaos engineering capabilities for testing system resilience and identifying weaknesses before they cause production incidents.

## Overview

Chaos engineering is the practice of intentionally injecting faults into a system to test its resilience and ensure it can withstand real-world failures. ExCore's chaos engine allows you to:

- **Inject latency** to simulate slow networks or dependencies
- **Trigger errors** to test error handling and recovery
- **Simulate timeouts** to verify timeout handling
- **Test circuit breakers** to validate failure isolation

## Quick Start

### Enable Chaos Engineering

```bash
# Enable chaos engine
export CHAOS_ENABLED=1

# Start your application
npm start
```

### Basic Usage

```typescript
import { getChaosEngine } from '@excore/core/shared/infrastructure/chaos';

const chaosEngine = getChaosEngine();

// Register a chaos scenario
chaosEngine.registerScenario({
  name: 'database-latency',
  enabled: true,
  probability: 0.1, // 10% of requests
  type: 'latency',
  config: {
    minMs: 100,
    maxMs: 500,
  },
});

// Inject chaos before database calls
async function queryDatabase() {
  await chaosEngine.maybeInjectChaos('database-latency');
  // Actual database query...
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CHAOS_ENABLED` | Enable chaos engine: `1` or `0` | `0` (disabled in production/test) |
| `CHAOS_SCENARIOS` | JSON array of scenarios | `[]` |

### Example Configuration

```bash
# Enable chaos
export CHAOS_ENABLED=1

# Configure scenarios via JSON
export CHAOS_SCENARIOS='[
  {
    "name": "api-latency",
    "enabled": true,
    "probability": 0.2,
    "type": "latency",
    "config": {"minMs": 100, "maxMs": 300}
  },
  {
    "name": "database-error",
    "enabled": true,
    "probability": 0.05,
    "type": "error",
    "config": {
      "errorType": "DatabaseError",
      "errorMessage": "Connection timeout",
      "statusCode": 500
    }
  }
]'
```

## Chaos Scenario Types

### 1. Latency Injection

Simulates slow dependencies (databases, external APIs, network delays).

```typescript
chaosEngine.registerScenario({
  name: 'slow-api',
  enabled: true,
  probability: 0.3, // 30% of requests
  type: 'latency',
  config: {
    minMs: 200,  // Minimum delay
    maxMs: 1000, // Maximum delay
  },
});

// Use in your code
async function callExternalAPI() {
  await chaosEngine.maybeInjectChaos('slow-api');
  return await fetch('https://api.example.com');
}
```

**Use Cases:**
- Test timeout handling
- Verify user experience under slow conditions
- Identify performance bottlenecks
- Test retry mechanisms

### 2. Error Injection

Throws errors to test error handling and recovery logic.

```typescript
chaosEngine.registerScenario({
  name: 'payment-failure',
  enabled: true,
  probability: 0.1, // 10% of requests
  type: 'error',
  config: {
    errorType: 'PaymentError',
    errorMessage: 'Payment gateway unavailable',
    statusCode: 503,
  },
});

// Use in your code
async function processPayment(amount: number) {
  await chaosEngine.maybeInjectChaos('payment-failure');
  // Process payment...
}
```

**Use Cases:**
- Test error handling logic
- Verify graceful degradation
- Validate error messages shown to users
- Test transaction rollback

### 3. Timeout Injection

Simulates operations that hang indefinitely.

```typescript
chaosEngine.registerScenario({
  name: 'database-hang',
  enabled: true,
  probability: 0.05, // 5% of requests
  type: 'timeout',
  config: {
    timeoutMs: 5000, // Wait 5 seconds then throw
  },
});

// Use in your code
async function queryDatabase() {
  await chaosEngine.maybeInjectChaos('database-hang');
  // Database query...
}
```

**Use Cases:**
- Test timeout configuration
- Verify resource cleanup on timeout
- Test circuit breaker triggers
- Identify hanging operations

### 4. Circuit Breaker Testing

Tests circuit breaker patterns and failure isolation.

```typescript
chaosEngine.registerScenario({
  name: 'service-circuit',
  enabled: true,
  probability: 1.0, // Always check
  type: 'circuit-breaker',
  config: {
    failureThreshold: 5,   // Open after 5 failures
    resetTimeMs: 30000,    // Reset after 30 seconds
  },
});

// Use in your code
async function callService() {
  await chaosEngine.maybeInjectChaos('service-circuit');
  // Service call...
}
```

**Use Cases:**
- Test circuit breaker logic
- Verify failure isolation
- Test automatic recovery
- Validate fallback mechanisms

## HTTP Middleware Integration

Apply chaos to all HTTP requests:

```typescript
import { createRestApi } from '@excore/core/adapters/rest';
import { chaosMiddleware, getChaosEngine } from '@excore/core/shared/infrastructure/chaos';

// Configure scenarios
const chaosEngine = getChaosEngine();
chaosEngine.registerScenario({
  name: 'http-request',
  enabled: true,
  probability: 0.1,
  type: 'latency',
  config: { minMs: 100, maxMs: 500 },
});

// Create REST API with chaos middleware
const app = createRestApi();
app.use('*', chaosMiddleware('http-request'));
```

## Probability Configuration

Chaos scenarios use probability to control injection frequency:

- `0.0`: Never inject (0%)
- `0.1`: Inject 10% of the time
- `0.5`: Inject 50% of the time
- `1.0`: Always inject (100%)

```typescript
// Low probability for production-like testing
chaosEngine.registerScenario({
  name: 'rare-failure',
  probability: 0.01, // 1% of requests
  // ...
});

// High probability for aggressive testing
chaosEngine.registerScenario({
  name: 'frequent-failure',
  probability: 0.5, // 50% of requests
  // ...
});
```

## Safety Guardrails

### 1. Environment-Based Activation

Chaos is **disabled by default** in production and test environments:

```typescript
// Chaos will NOT run in production unless explicitly enabled
process.env.NODE_ENV = 'production';
// Must set CHAOS_ENABLED=1 to override
```

### 2. Toggle Scenarios

Quickly enable/disable scenarios without restart:

```typescript
// Disable a problematic scenario
chaosEngine.toggleScenario('dangerous-test', false);

// Re-enable later
chaosEngine.toggleScenario('dangerous-test', true);
```

### 3. Global Kill Switch

Instantly disable all chaos:

```typescript
// Disable all chaos scenarios
chaosEngine.setEnabled(false);

// Re-enable
chaosEngine.setEnabled(true);
```

## Testing Strategies

### Progressive Chaos Testing

Start small and gradually increase chaos intensity:

```typescript
// Phase 1: Low probability, single scenario
chaosEngine.registerScenario({
  name: 'api-latency',
  probability: 0.05, // 5%
  type: 'latency',
  config: { minMs: 100, maxMs: 200 },
});

// Phase 2: Increase probability
chaosEngine.toggleScenario('api-latency', false);
chaosEngine.registerScenario({
  name: 'api-latency',
  probability: 0.2, // 20%
  type: 'latency',
  config: { minMs: 100, maxMs: 500 },
});

// Phase 3: Add error scenarios
chaosEngine.registerScenario({
  name: 'api-errors',
  probability: 0.1,
  type: 'error',
  config: { errorType: 'NetworkError', errorMessage: 'Connection refused' },
});
```

### Targeted Testing

Test specific components:

```typescript
// Database layer
await chaosEngine.maybeInjectChaos('database-query');

// Cache layer
await chaosEngine.maybeInjectChaos('cache-get');

// External API
await chaosEngine.maybeInjectChaos('external-api-call');

// Payment processing
await chaosEngine.maybeInjectChaos('payment-gateway');
```

### Load Testing with Chaos

Combine with load testing tools:

```bash
# Start application with chaos
CHAOS_ENABLED=1 npm start &

# Run load test
artillery run load-test.yml

# Analyze results for failures
```

## Observability Integration

Chaos events are automatically logged and traced:

```typescript
import { getLogger } from '@excore/core/shared/infrastructure/logger';

const logger = getLogger();

async function resilientOperation() {
  try {
    await chaosEngine.maybeInjectChaos('database-latency');
    // Operation logic...
  } catch (error) {
    logger.error('Operation failed (chaos may be involved)', error);
    // Handle error...
  }
}
```

View chaos-induced failures in your observability platform (Jaeger, DataDog, etc.) using trace context.

## Best Practices

### ✅ Do

1. **Start in non-production**: Test chaos in staging/dev first
2. **Use low probabilities initially**: Start with 1-5% injection rate
3. **Monitor impact**: Watch metrics and logs during chaos tests
4. **Test one scenario at a time**: Isolate variables
5. **Document findings**: Record what breaks and how to fix it
6. **Automate chaos tests**: Include in CI/CD pipeline
7. **Test recovery mechanisms**: Verify systems recover after chaos stops

### ❌ Don't

1. **Don't enable in production without preparation**: Always test in lower environments first
2. **Don't set 100% probability in production**: Start low (1-10%)
3. **Don't inject chaos without monitoring**: Always have observability enabled
4. **Don't test during critical periods**: Avoid peak traffic or maintenance windows
5. **Don't ignore chaos findings**: Fix discovered issues promptly
6. **Don't run chaos without stakeholder awareness**: Communicate with team

## Example Scenarios

### Scenario 1: Test Database Resilience

```typescript
// Simulate database connection pool exhaustion
chaosEngine.registerScenario({
  name: 'db-connection-timeout',
  enabled: true,
  probability: 0.2,
  type: 'timeout',
  config: { timeoutMs: 5000 },
});

// Expected behavior:
// - Application should retry with exponential backoff
// - Circuit breaker should open after threshold
// - Users should see graceful error message
// - System should recover when chaos stops
```

### Scenario 2: Test External API Failure

```typescript
// Simulate third-party API downtime
chaosEngine.registerScenario({
  name: 'external-api-down',
  enabled: true,
  probability: 0.5,
  type: 'error',
  config: {
    errorType: 'ServiceUnavailable',
    errorMessage: 'Third-party API is down',
    statusCode: 503,
  },
});

// Expected behavior:
// - Application should use cached data if available
// - Fallback to alternative data source
// - Queue requests for retry
// - Alert operators about dependency failure
```

### Scenario 3: Test Network Latency

```typescript
// Simulate poor network conditions
chaosEngine.registerScenario({
  name: 'network-latency',
  enabled: true,
  probability: 0.3,
  type: 'latency',
  config: { minMs: 1000, maxMs: 3000 },
});

// Expected behavior:
// - Requests should complete within timeout window
// - Loading indicators should show for users
// - Timeouts should be handled gracefully
// - No resource leaks (connections, memory)
```

## Runbook Templates

See [Runbook Templates](./runbooks/) for detailed incident response procedures:

- [Database Chaos Runbook](./runbooks/database-chaos.md)
- [API Chaos Runbook](./runbooks/api-chaos.md)
- [Circuit Breaker Runbook](./runbooks/circuit-breaker.md)

## Metrics and Monitoring

Track chaos impact with custom metrics:

```typescript
import { getLogger } from '@excore/core/shared/infrastructure/logger';

const logger = getLogger();

async function monitoredChaos(scenarioName: string) {
  const start = Date.now();
  let success = true;

  try {
    await chaosEngine.maybeInjectChaos(scenarioName);
  } catch (error) {
    success = false;
    logger.error('Chaos injection occurred', error, { scenarioName });
  }

  const duration = Date.now() - start;

  logger.info('Chaos check completed', {
    scenarioName,
    success,
    duration,
  });
}
```

## Troubleshooting

### Chaos not triggering

1. Check chaos engine is enabled:
   ```typescript
   console.log('Chaos enabled:', chaosEngine.isEnabled());
   ```

2. Verify scenario is registered:
   ```typescript
   console.log('Scenarios:', chaosEngine.getScenarios());
   ```

3. Check probability is not 0:
   ```typescript
   const scenarios = chaosEngine.getScenarios();
   scenarios.forEach(s => console.log(s.name, s.probability));
   ```

### Too much chaos

1. Reduce probability:
   ```typescript
   chaosEngine.toggleScenario('aggressive-test', false);
   ```

2. Disable globally:
   ```typescript
   chaosEngine.setEnabled(false);
   ```

3. Set environment variable:
   ```bash
   export CHAOS_ENABLED=0
   ```

### Unexpected failures

1. Check chaos is disabled in production:
   ```bash
   echo $CHAOS_ENABLED  # Should be 0 or unset
   ```

2. Review active scenarios:
   ```typescript
   const active = chaosEngine.getScenarios().filter(s => s.enabled);
   console.log('Active scenarios:', active.map(s => s.name));
   ```

## Further Reading

- [Principles of Chaos Engineering](https://principlesofchaos.org/)
- [Chaos Engineering at Netflix](https://netflixtechblog.com/tagged/chaos-engineering)
- [AWS Fault Injection Simulator](https://aws.amazon.com/fis/)
- [Gremlin Chaos Engineering Platform](https://www.gremlin.com/)
