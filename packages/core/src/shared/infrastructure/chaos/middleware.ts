import type { MiddlewareHandler } from 'hono';
import { getChaosEngine } from './ChaosEngine';

/**
 * Chaos middleware for HTTP requests
 */
export function chaosMiddleware(scenarioName = 'http-request'): MiddlewareHandler {
  return async (c, next) => {
    const chaosEngine = getChaosEngine();

    // Inject chaos before request processing
    await chaosEngine.maybeInjectChaos(scenarioName);

    await next();
  };
}
