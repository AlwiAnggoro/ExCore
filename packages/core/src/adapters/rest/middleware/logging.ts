import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';

interface Logger {
  info(message: string, meta?: unknown): void;
  error(message: string, error?: Error, meta?: unknown): void;
  child(meta: Record<string, unknown>): Logger;
}

const baseLogger: Logger = {
  info(message, meta) {
    if (meta) {
      console.info(message, meta);
    } else {
      console.info(message);
    }
  },
  error(message, error, meta) {
    if (error && meta) {
      console.error(message, error, meta);
    } else if (error) {
      console.error(message, error);
    } else if (meta) {
      console.error(message, meta);
    } else {
      console.error(message);
    }
  },
  child(meta) {
    return {
      info(message, childMeta) {
        baseLogger.info(message, childMeta ?? meta);
      },
      error(message, error, childMeta) {
        baseLogger.error(message, error, childMeta ?? meta);
      },
      child(extraMeta) {
        return baseLogger.child({ ...meta, ...extraMeta });
      },
    };
  },
};

function getLogger(): Logger {
  return baseLogger;
}

/**
 * Logging middleware that creates request-scoped logger with correlation ID
 */
export function loggingMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    const logger = getLogger();
    const requestId = c.req.header('x-request-id') || randomUUID();
    const startTime = Date.now();

    // Create request-scoped logger
    const requestLogger = logger.child({
      requestId,
      method: c.req.method,
      path: c.req.path,
    });

    // Store logger in context for access in handlers
    c.set('logger', requestLogger);

    requestLogger.info('Request started');

    try {
      await next();

      const duration = Date.now() - startTime;
      requestLogger.info('Request completed', {
        statusCode: c.res.status,
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      requestLogger.error(
        'Request failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          statusCode: c.res.status || 500,
          duration,
        }
      );
      throw error;
    }
  };
}
