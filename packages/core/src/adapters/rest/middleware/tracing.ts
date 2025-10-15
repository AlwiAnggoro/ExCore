import { context, SpanStatusCode } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import type { MiddlewareHandler } from 'hono';

import { getTracer } from '../../../shared/infrastructure/telemetry/TracerProvider';

const propagator = new W3CTraceContextPropagator();

/**
 * Tracing middleware that extracts incoming trace context and creates spans for HTTP requests
 */
export function tracingMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const tracer = getTracer();

    // Extract incoming trace context from headers
    const extractedContext = propagator.extract(
      context.active(),
      c.req.raw.headers,
      {
        get: (headers, key) => headers.get(key) ?? undefined,
        keys: (headers) => Array.from(headers.keys()),
      }
    );

    // Create span and run request in its context
    await context.with(extractedContext, async () => {
      const route = c.req.routePath || c.req.path || c.req.url;
      const span = tracer.startSpan(`${c.req.method} ${route}`);

      try {
        span.setAttribute('http.method', c.req.method);
        span.setAttribute('http.route', route);

        await next();

        span.setAttribute('http.status_code', c.res.status);
        if (c.res.status >= 400) {
          span.setStatus({ code: SpanStatusCode.ERROR });
        }
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  };
}
