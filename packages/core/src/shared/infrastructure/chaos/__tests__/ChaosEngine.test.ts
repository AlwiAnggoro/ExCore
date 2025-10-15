import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChaosEngine, ChaosScenario } from '../ChaosEngine';

describe('ChaosEngine', () => {
  let chaosEngine: ChaosEngine;

  beforeEach(() => {
    chaosEngine = new ChaosEngine({ enabled: true });
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const engine = new ChaosEngine();
      expect(engine.getScenarios()).toHaveLength(0);
    });

    it('should initialize with scenarios', () => {
      const scenarios: ChaosScenario[] = [
        {
          name: 'test-latency',
          enabled: true,
          probability: 0.5,
          type: 'latency',
          config: { minMs: 100, maxMs: 200 },
        },
      ];

      const engine = new ChaosEngine({ enabled: true, scenarios });
      expect(engine.getScenarios()).toHaveLength(1);
      expect(engine.getScenarios()[0].name).toBe('test-latency');
    });

    it('should respect enabled flag', () => {
      const engine = new ChaosEngine({ enabled: false });
      expect(engine.isEnabled()).toBe(false);
    });
  });

  describe('Scenario Registration', () => {
    it('should register new scenario', () => {
      const scenario: ChaosScenario = {
        name: 'db-latency',
        enabled: true,
        probability: 0.3,
        type: 'latency',
        config: { minMs: 50, maxMs: 150 },
      };

      chaosEngine.registerScenario(scenario);
      const scenarios = chaosEngine.getScenarios();
      expect(scenarios.find((s) => s.name === 'db-latency')).toBeDefined();
    });

    it('should toggle scenario on/off', () => {
      const scenario: ChaosScenario = {
        name: 'toggleable',
        enabled: true,
        probability: 1.0,
        type: 'latency',
        config: { minMs: 10, maxMs: 20 },
      };

      chaosEngine.registerScenario(scenario);
      chaosEngine.toggleScenario('toggleable', false);

      const scenarios = chaosEngine.getScenarios();
      expect(scenarios.find((s) => s.name === 'toggleable')?.enabled).toBe(false);
    });
  });

  describe('Latency Injection', () => {
    it('should inject latency within configured range', async () => {
      const scenario: ChaosScenario = {
        name: 'latency-test',
        enabled: true,
        probability: 1.0, // Always trigger
        type: 'latency',
        config: { minMs: 50, maxMs: 100 },
      };

      chaosEngine.registerScenario(scenario);

      const start = Date.now();
      await chaosEngine.maybeInjectChaos('latency-test');
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(150); // Some margin for execution overhead
    });

    it('should not inject latency when probability is 0', async () => {
      const scenario: ChaosScenario = {
        name: 'no-latency',
        enabled: true,
        probability: 0.0,
        type: 'latency',
        config: { minMs: 1000, maxMs: 2000 },
      };

      chaosEngine.registerScenario(scenario);

      const start = Date.now();
      await chaosEngine.maybeInjectChaos('no-latency');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50); // Should be nearly instant
    });
  });

  describe('Error Injection', () => {
    it('should throw error when scenario triggers', async () => {
      const scenario: ChaosScenario = {
        name: 'error-test',
        enabled: true,
        probability: 1.0,
        type: 'error',
        config: {
          errorType: 'DatabaseError',
          errorMessage: 'Connection failed',
          statusCode: 500,
        },
      };

      chaosEngine.registerScenario(scenario);

      await expect(chaosEngine.maybeInjectChaos('error-test')).rejects.toThrow('Connection failed');
    });

    it('should not throw error when probability is 0', async () => {
      const scenario: ChaosScenario = {
        name: 'no-error',
        enabled: true,
        probability: 0.0,
        type: 'error',
        config: {
          errorType: 'Error',
          errorMessage: 'Should not throw',
        },
      };

      chaosEngine.registerScenario(scenario);

      await expect(chaosEngine.maybeInjectChaos('no-error')).resolves.not.toThrow();
    });

    it('should include status code in error', async () => {
      const scenario: ChaosScenario = {
        name: 'http-error',
        enabled: true,
        probability: 1.0,
        type: 'error',
        config: {
          errorType: 'HTTPError',
          errorMessage: 'Bad Gateway',
          statusCode: 502,
        },
      };

      chaosEngine.registerScenario(scenario);

      try {
        await chaosEngine.maybeInjectChaos('http-error');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.statusCode).toBe(502);
      }
    });
  });

  describe('Timeout Injection', () => {
    it('should throw timeout error after delay', async () => {
      const scenario: ChaosScenario = {
        name: 'timeout-test',
        enabled: true,
        probability: 1.0,
        type: 'timeout',
        config: {
          timeoutMs: 100,
        },
      };

      chaosEngine.registerScenario(scenario);

      const start = Date.now();
      await expect(chaosEngine.maybeInjectChaos('timeout-test')).rejects.toThrow('Chaos timeout exceeded');
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after threshold failures', async () => {
      const scenario: ChaosScenario = {
        name: 'circuit-test',
        enabled: true,
        probability: 1.0,
        type: 'circuit-breaker',
        config: {
          failureThreshold: 3,
          resetTimeMs: 1000,
        },
      };

      chaosEngine.registerScenario(scenario);

      // First 3 calls should increment failure count
      for (let i = 0; i < 3; i++) {
        try {
          await chaosEngine.maybeInjectChaos('circuit-test');
        } catch (error: any) {
          // Circuit might open on 3rd call
        }
      }

      // 4th call should definitely throw circuit breaker open
      await expect(chaosEngine.maybeInjectChaos('circuit-test')).rejects.toThrow('Circuit breaker open');
    });

    it('should reset circuit after timeout', async () => {
      const scenario: ChaosScenario = {
        name: 'circuit-reset',
        enabled: true,
        probability: 1.0,
        type: 'circuit-breaker',
        config: {
          failureThreshold: 2,
          resetTimeMs: 100,
        },
      };

      chaosEngine.registerScenario(scenario);

      // Trigger failures to open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await chaosEngine.maybeInjectChaos('circuit-reset');
        } catch {}
      }

      // Circuit should be open
      await expect(chaosEngine.maybeInjectChaos('circuit-reset')).rejects.toThrow('Circuit breaker open');

      // Wait for reset
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Circuit should reset (may not throw immediately)
      try {
        await chaosEngine.maybeInjectChaos('circuit-reset');
      } catch (error: any) {
        // First call after reset might fail, but not with "circuit breaker open"
        expect(error.message).not.toBe('Circuit breaker open');
      }
    });
  });

  describe('Global Enable/Disable', () => {
    it('should not inject chaos when globally disabled', async () => {
      const scenario: ChaosScenario = {
        name: 'disabled-test',
        enabled: true,
        probability: 1.0,
        type: 'error',
        config: {
          errorType: 'Error',
          errorMessage: 'Should not throw',
        },
      };

      chaosEngine.setEnabled(false);
      chaosEngine.registerScenario(scenario);

      await expect(chaosEngine.maybeInjectChaos('disabled-test')).resolves.not.toThrow();
    });

    it('should inject chaos when globally enabled', async () => {
      const scenario: ChaosScenario = {
        name: 'enabled-test',
        enabled: true,
        probability: 1.0,
        type: 'error',
        config: {
          errorType: 'Error',
          errorMessage: 'Should throw',
        },
      };

      chaosEngine.setEnabled(true);
      chaosEngine.registerScenario(scenario);

      await expect(chaosEngine.maybeInjectChaos('enabled-test')).rejects.toThrow('Should throw');
    });
  });

  describe('Scenario Enable/Disable', () => {
    it('should not inject chaos for disabled scenario', async () => {
      const scenario: ChaosScenario = {
        name: 'scenario-disabled',
        enabled: false,
        probability: 1.0,
        type: 'error',
        config: {
          errorType: 'Error',
          errorMessage: 'Should not throw',
        },
      };

      chaosEngine.registerScenario(scenario);

      await expect(chaosEngine.maybeInjectChaos('scenario-disabled')).resolves.not.toThrow();
    });
  });

  describe('Non-existent Scenario', () => {
    it('should not throw for non-existent scenario', async () => {
      await expect(chaosEngine.maybeInjectChaos('non-existent')).resolves.not.toThrow();
    });
  });

  describe('Probability Testing', () => {
    it('should respect probability distribution', async () => {
      const scenario: ChaosScenario = {
        name: 'prob-test',
        enabled: true,
        probability: 0.5,
        type: 'error',
        config: {
          errorType: 'Error',
          errorMessage: 'Random failure',
        },
      };

      chaosEngine.registerScenario(scenario);

      let errorCount = 0;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        try {
          await chaosEngine.maybeInjectChaos('prob-test');
        } catch {
          errorCount++;
        }
      }

      // With probability 0.5, expect roughly 500 errors (with some margin)
      expect(errorCount).toBeGreaterThan(400);
      expect(errorCount).toBeLessThan(600);
    });
  });

  describe('Multiple Scenarios', () => {
    it('should handle multiple registered scenarios', async () => {
      const scenarios: ChaosScenario[] = [
        {
          name: 'latency-1',
          enabled: true,
          probability: 1.0,
          type: 'latency',
          config: { minMs: 10, maxMs: 20 },
        },
        {
          name: 'latency-2',
          enabled: true,
          probability: 1.0,
          type: 'latency',
          config: { minMs: 30, maxMs: 40 },
        },
      ];

      scenarios.forEach((s) => chaosEngine.registerScenario(s));

      const start1 = Date.now();
      await chaosEngine.maybeInjectChaos('latency-1');
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      await chaosEngine.maybeInjectChaos('latency-2');
      const duration2 = Date.now() - start2;

      expect(duration1).toBeGreaterThanOrEqual(10);
      expect(duration1).toBeLessThan(30);
      expect(duration2).toBeGreaterThanOrEqual(30);
    });
  });
});
