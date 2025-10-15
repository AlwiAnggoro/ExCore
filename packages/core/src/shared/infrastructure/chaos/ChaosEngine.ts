/**
 * Chaos Engineering Engine for fault injection and resilience testing
 */

export interface ChaosConfig {
  enabled?: boolean;
  scenarios?: ChaosScenario[];
}

export interface ChaosScenario {
  name: string;
  enabled: boolean;
  probability: number; // 0.0 to 1.0
  type: 'latency' | 'error' | 'timeout' | 'circuit-breaker';
  config: LatencyConfig | ErrorConfig | TimeoutConfig | CircuitBreakerConfig;
}

export interface LatencyConfig {
  minMs: number;
  maxMs: number;
}

export interface ErrorConfig {
  errorType: string;
  errorMessage: string;
  statusCode?: number;
}

export interface TimeoutConfig {
  timeoutMs: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeMs: number;
}

export class ChaosEngine {
  private enabled: boolean;
  private scenarios: Map<string, ChaosScenario>;
  private circuitStates: Map<string, CircuitState>;

  constructor(config: ChaosConfig = {}) {
    this.enabled = this.resolveEnabled(config.enabled);
    this.scenarios = new Map();
    this.circuitStates = new Map();

    if (config.scenarios) {
      for (const scenario of config.scenarios) {
        this.scenarios.set(scenario.name, scenario);
      }
    }

    this.loadScenariosFromEnv();
  }

  /**
   * Execute a chaos scenario if conditions are met
   */
  async maybeInjectChaos(scenarioName: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const scenario = this.scenarios.get(scenarioName);
    if (!scenario || !scenario.enabled) {
      return;
    }

    // Probability check
    if (Math.random() > scenario.probability) {
      return;
    }

    await this.executeScenario(scenario);
  }

  /**
   * Execute a specific chaos scenario
   */
  private async executeScenario(scenario: ChaosScenario): Promise<void> {
    switch (scenario.type) {
      case 'latency':
        await this.injectLatency(scenario.config as LatencyConfig);
        break;
      case 'error':
        this.injectError(scenario.config as ErrorConfig);
        break;
      case 'timeout':
        await this.injectTimeout(scenario.config as TimeoutConfig);
        break;
      case 'circuit-breaker':
        this.checkCircuitBreaker(scenario.name, scenario.config as CircuitBreakerConfig);
        break;
    }
  }

  /**
   * Inject artificial latency
   */
  private async injectLatency(config: LatencyConfig): Promise<void> {
    const delay = Math.floor(Math.random() * (config.maxMs - config.minMs + 1)) + config.minMs;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Inject an error
   */
  private injectError(config: ErrorConfig): never {
    const error: any = new Error(config.errorMessage);
    error.name = config.errorType;
    if (config.statusCode) {
      error.statusCode = config.statusCode;
    }
    throw error;
  }

  /**
   * Inject a timeout (infinite wait)
   */
  private async injectTimeout(config: TimeoutConfig): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, config.timeoutMs));
    throw new Error('Chaos timeout exceeded');
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(name: string, config: CircuitBreakerConfig): void {
    let state = this.circuitStates.get(name);

    if (!state) {
      state = { failures: 0, lastFailure: 0, isOpen: false };
      this.circuitStates.set(name, state);
    }

    const now = Date.now();

    // Check if circuit should reset
    if (state.isOpen && now - state.lastFailure > config.resetTimeMs) {
      state.isOpen = false;
      state.failures = 0;
    }

    // If circuit is open, reject immediately
    if (state.isOpen) {
      throw new Error('Circuit breaker open');
    }

    // Increment failures
    state.failures++;
    state.lastFailure = now;

    // Open circuit if threshold reached
    if (state.failures >= config.failureThreshold) {
      state.isOpen = true;
    }
  }

  /**
   * Register a new chaos scenario
   */
  registerScenario(scenario: ChaosScenario): void {
    this.scenarios.set(scenario.name, scenario);
  }

  /**
   * Enable/disable a scenario
   */
  toggleScenario(name: string, enabled: boolean): void {
    const scenario = this.scenarios.get(name);
    if (scenario) {
      scenario.enabled = enabled;
    }
  }

  /**
   * Get all registered scenarios
   */
  getScenarios(): ChaosScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Enable/disable chaos engine globally
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if chaos engine is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Resolve enabled state from config and environment
   */
  private resolveEnabled(configEnabled?: boolean): boolean {
    if (typeof configEnabled === 'boolean') {
      return configEnabled;
    }

    // Only enable in non-production, non-test environments by default
    if (process.env.CHAOS_ENABLED === '1') {
      return true;
    }

    if (process.env.CHAOS_ENABLED === '0') {
      return false;
    }

    // Default: disabled in production and test
    return process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test';
  }

  /**
   * Load scenarios from environment variables
   */
  private loadScenariosFromEnv(): void {
    const scenariosJson = process.env.CHAOS_SCENARIOS;
    if (!scenariosJson) {
      return;
    }

    try {
      const scenarios = JSON.parse(scenariosJson) as ChaosScenario[];
      for (const scenario of scenarios) {
        this.scenarios.set(scenario.name, scenario);
      }
    } catch (error) {
      console.error('Failed to parse CHAOS_SCENARIOS:', error);
    }
  }
}

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

// Singleton instance
let chaosEngine: ChaosEngine | null = null;

export function getChaosEngine(): ChaosEngine {
  if (!chaosEngine) {
    chaosEngine = new ChaosEngine();
  }
  return chaosEngine;
}

export function setChaosEngine(engine: ChaosEngine): void {
  chaosEngine = engine;
}
