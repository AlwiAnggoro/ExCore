# Chaos Engineering Incident Response Runbook Template

## Purpose

This runbook provides step-by-step procedures for responding to chaos engineering experiments and the incidents they reveal.

## When to Use

- During planned chaos engineering experiments
- When chaos reveals a system weakness
- When investigating cascading failures
- For post-mortem analysis after chaos tests

---

## Pre-Experiment Checklist

### Before Starting Chaos Tests

- [ ] **Verify environment**: Confirm not running in production (or have explicit approval)
- [ ] **Check monitoring**: Ensure all observability systems are operational
  - Logs aggregation working
  - Metrics collection active
  - Distributed tracing enabled
  - Alerting configured
- [ ] **Notify stakeholders**: Inform team of chaos test schedule
- [ ] **Baseline metrics**: Capture current system performance
  - Error rate: ____%
  - Latency p50/p95/p99: ____ms
  - Throughput: ____ req/s
  - CPU/Memory: ____%
- [ ] **Prepare rollback**: Have kill switch ready
  ```bash
  export CHAOS_ENABLED=0
  # or
  chaosEngine.setEnabled(false);
  ```
- [ ] **Test communication channels**: Verify incident channels work
- [ ] **Review expected behavior**: Document what *should* happen

---

## During Chaos Experiment

### Phase 1: Initiation (0-5 minutes)

1. **Enable chaos engine**
   ```bash
   export CHAOS_ENABLED=1
   export CHAOS_SCENARIOS='[...]'
   npm start
   ```

2. **Monitor key metrics** (check every 30 seconds):
   - Error rate
   - Response time (p95, p99)
   - Throughput
   - Resource utilization (CPU, memory, connections)

3. **Watch for unexpected behavior**:
   - Cascading failures
   - Resource exhaustion
   - Data corruption
   - User-facing errors

### Phase 2: Observation (5-30 minutes)

4. **Analyze impact**:
   - [ ] System remains operational? YES / NO
   - [ ] Errors contained to affected component? YES / NO
   - [ ] Circuit breakers triggered appropriately? YES / NO
   - [ ] Retries functioning correctly? YES / NO
   - [ ] Timeouts respected? YES / NO

5. **Check logs for anomalies**:
   ```bash
   # Filter for errors
   kubectl logs -f <pod> | grep ERROR

   # Check specific scenario
   kubectl logs -f <pod> | grep "database-latency"

   # View structured logs
   tail -f /var/log/app/app.log | jq 'select(.level=="error")'
   ```

6. **Review distributed traces**:
   - Open Jaeger/Tempo UI
   - Filter by chaos-affected services
   - Look for long-running spans
   - Identify bottlenecks

### Phase 3: Escalation (if needed)

7. **Trigger kill switch if**:
   - System instability detected
   - Cascading failures observed
   - Data corruption risk identified
   - User impact exceeds acceptable threshold

   ```bash
   # Immediate chaos disable
   export CHAOS_ENABLED=0
   kubectl rollout restart deployment/<app>
   ```

8. **Notify incident channel**:
   ```
   [CHAOS-INCIDENT] Chaos experiment causing unexpected impact
   Scenario: <name>
   Impact: <description>
   Actions taken: Disabled chaos, investigating
   ETA: <time>
   ```

---

## Post-Experiment Analysis

### Phase 4: Data Collection

9. **Capture evidence**:
   - [ ] Download logs from chaos period
   - [ ] Export metrics dashboard screenshots
   - [ ] Save distributed trace samples
   - [ ] Record error rate spike times

10. **Document findings**:
    - What was injected? (latency/error/timeout/circuit-breaker)
    - What broke? (component, failure mode)
    - What didn't break? (resilient components)
    - What was surprising? (unexpected behavior)

### Phase 5: Remediation Planning

11. **Identify gaps**:
    - [ ] Missing timeouts
    - [ ] Inadequate retries
    - [ ] Absent circuit breakers
    - [ ] Poor error handling
    - [ ] Resource leaks
    - [ ] Insufficient monitoring

12. **Create action items**:
    | Issue | Priority | Owner | Due Date |
    |-------|----------|-------|----------|
    | Missing DB timeout | P0 | @dev | 2025-10-20 |
    | No circuit breaker on API | P1 | @dev | 2025-10-25 |
    | Retry logic not working | P1 | @dev | 2025-10-25 |

13. **Update runbooks**:
    - [ ] Document new failure modes
    - [ ] Add mitigation procedures
    - [ ] Update alert thresholds
    - [ ] Revise incident playbooks

---

## Common Scenarios

### Scenario: High Latency Injection

**Symptoms:**
- Response times increase
- Request queue grows
- Timeout errors appear

**Expected Behavior:**
- Timeouts trigger after threshold
- Circuit breaker opens after N failures
- Cached data served as fallback
- User sees loading indicator, then fallback UI

**Unexpected Behavior:**
- System hangs indefinitely → **Missing timeouts**
- Memory leak from queued requests → **Resource leak**
- All requests fail → **Circuit breaker not working**

**Resolution:**
1. Verify timeout configuration
2. Check circuit breaker logs
3. Monitor connection pool
4. Review retry logic

### Scenario: Error Injection

**Symptoms:**
- Error rate spikes
- Some requests fail
- Errors logged

**Expected Behavior:**
- Errors handled gracefully
- Retries with exponential backoff
- Fallback to cached data
- User sees friendly error message

**Unexpected Behavior:**
- Errors bubble to user → **Poor error handling**
- Infinite retries → **No backoff/max retries**
- Entire service fails → **No isolation**

**Resolution:**
1. Add error boundaries
2. Implement retry with backoff
3. Add fallback mechanisms
4. Improve error messages

### Scenario: Timeout Injection

**Symptoms:**
- Operations hang
- Resources accumulate
- Slow response times

**Expected Behavior:**
- Operation times out after configured duration
- Resources cleaned up
- Error logged with context
- Retry attempted

**Unexpected Behavior:**
- Connections not released → **Resource leak**
- No timeout error → **Missing timeout**
- System becomes unresponsive → **Cascading failure**

**Resolution:**
1. Configure operation timeouts
2. Add cleanup handlers
3. Implement connection pooling
4. Monitor resource usage

### Scenario: Circuit Breaker Trigger

**Symptoms:**
- Circuit opens after failures
- Requests rejected immediately
- Error messages change

**Expected Behavior:**
- Circuit opens after threshold
- Half-open state after timeout
- Circuit closes when healthy
- Fallback data served

**Unexpected Behavior:**
- Circuit never closes → **Reset logic broken**
- Circuit never opens → **Threshold too high**
- Circuit opens too quickly → **Threshold too low**

**Resolution:**
1. Review circuit breaker config
2. Adjust thresholds
3. Verify reset timer
4. Test half-open behavior

---

## Metrics to Track

### System Health

| Metric | Pre-Chaos | During Chaos | Post-Chaos | Status |
|--------|-----------|--------------|------------|--------|
| Error Rate | 0.1% | 15% | 0.2% | ✅ Recovered |
| Latency p95 | 100ms | 800ms | 120ms | ✅ Recovered |
| Throughput | 1000 req/s | 800 req/s | 950 req/s | ✅ Recovered |
| CPU Usage | 40% | 75% | 42% | ✅ Recovered |
| Memory | 2GB | 2.5GB | 2.1GB | ✅ Recovered |

### Chaos-Specific Metrics

- **Injection Rate**: How often chaos triggered (should match probability)
- **Impact Scope**: % of requests affected
- **Recovery Time**: Time to return to baseline after chaos stops
- **Cascading Failures**: Number of secondary failures

---

## Communication Templates

### Starting Chaos Test

```
[CHAOS-TEST-START]
Scenario: <name>
Target: <component>
Probability: <X%>
Duration: <Y minutes>
Expected impact: <description>
Monitoring: <dashboard link>
Contact: @oncall
```

### Chaos Test Complete

```
[CHAOS-TEST-COMPLETE]
Scenario: <name>
Duration: <Y minutes>
Results: PASS / FAIL / MIXED
Findings: <summary>
Action items: <count>
Full report: <link>
```

### Chaos-Induced Incident

```
[CHAOS-INCIDENT]
Severity: SEV2
Scenario: <name>
Impact: <description>
Affected users: <count>
Actions taken: <list>
Status: INVESTIGATING / MITIGATING / RESOLVED
Next update: <time>
```

---

## Tools and Commands

### Check Chaos Status

```bash
# View active scenarios
curl http://localhost:3000/chaos/scenarios

# Check if chaos is enabled
env | grep CHAOS

# View chaos engine logs
kubectl logs -f <pod> | grep -i chaos
```

### Disable Chaos

```bash
# Environment variable
export CHAOS_ENABLED=0

# Kubernetes ConfigMap
kubectl edit configmap chaos-config

# API call (if available)
curl -X POST http://localhost:3000/chaos/disable
```

### View Impact

```bash
# Error rate
kubectl exec -it <pod> -- curl localhost:9090/metrics | grep error_rate

# Latency percentiles
kubectl exec -it <pod> -- curl localhost:9090/metrics | grep latency

# Trace search
# Open Jaeger UI, filter by "error=true" and time range
```

---

## Post-Mortem Template

### Incident Summary

- **Date**: 2025-10-15
- **Duration**: 30 minutes
- **Chaos Scenario**: database-timeout
- **Severity**: SEV3
- **Impact**: 5% error rate, no user data loss

### Timeline

| Time | Event |
|------|-------|
| 10:00 | Chaos test started with database-timeout (prob=0.1) |
| 10:05 | Error rate increased to 5% |
| 10:10 | Circuit breaker opened |
| 10:15 | Noticed connection pool exhaustion |
| 10:20 | Disabled chaos, investigating |
| 10:30 | System recovered to baseline |

### Root Cause

Database timeout scenario revealed that connection pool was not releasing connections on timeout, leading to pool exhaustion.

### What Went Well

- Circuit breaker triggered appropriately
- Monitoring detected issue quickly
- Kill switch worked instantly
- No data corruption occurred

### What Went Wrong

- Connection leak on timeout
- No pool exhaustion alerting
- Timeout value too high (30s)

### Action Items

- [ ] Fix connection cleanup on timeout (P0, @dev, 2025-10-16)
- [ ] Add pool exhaustion alerts (P1, @sre, 2025-10-18)
- [ ] Reduce timeout to 10s (P1, @dev, 2025-10-17)
- [ ] Add connection pool metrics (P2, @sre, 2025-10-20)

---

## References

- [Chaos Engineering Documentation](../chaos-engineering.md)
- [OpenTelemetry Tracing Guide](../tracing.md)
- [Structured Logging Guide](../logging.md)
- [Incident Response Playbook](./incident-response.md)
