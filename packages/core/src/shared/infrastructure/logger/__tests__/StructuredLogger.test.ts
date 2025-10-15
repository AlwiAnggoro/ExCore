import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StructuredLogger } from '../StructuredLogger';
import { trace, context, Span } from '@opentelemetry/api';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    logger = new StructuredLogger({
      serviceName: 'test-service',
      minLevel: 'debug',
      pretty: false,
    });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Basic Logging', () => {
    it('should log debug messages', () => {
      logger.debug('Debug message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.level).toBe('debug');
      expect(output.message).toBe('Debug message');
      expect(output.timestamp).toBeDefined();
    });

    it('should log info messages', () => {
      logger.info('Info message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.level).toBe('info');
      expect(output.message).toBe('Info message');
    });

    it('should log warn messages', () => {
      logger.warn('Warning message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.level).toBe('warn');
      expect(output.message).toBe('Warning message');
    });

    it('should log error messages to stderr', () => {
      logger.error('Error message');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(output.level).toBe('error');
      expect(output.message).toBe('Error message');
    });
  });

  describe('Metadata Logging', () => {
    it('should include metadata in logs', () => {
      logger.info('User action', { userId: '123', action: 'login' });
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.context.userId).toBe('123');
      expect(output.context.action).toBe('login');
    });

    it('should scrub PII from metadata', () => {
      logger.info('User created', {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
      });
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.context.username).toBe('john');
      expect(output.context.password).toBe('[REDACTED]');
      expect(output.context.email).toBe('[REDACTED_EMAIL]');
    });
  });

  describe('Error Logging', () => {
    it('should include error details', () => {
      const error = new Error('Test error');
      logger.error('Operation failed', error);
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(output.error.name).toBe('Error');
      expect(output.error.message).toBe('Test error');
      expect(output.error.stack).toBeDefined();
    });

    it('should scrub PII from error messages', () => {
      const error = new Error('Authentication failed for user@example.com');
      logger.error('Auth error', error);
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(output.error.message).toBe('Authentication failed for [REDACTED_EMAIL]');
    });

    it('should support error with metadata', () => {
      const error = new Error('Database error');
      logger.error('Query failed', error, { query: 'SELECT *', table: 'users' });
      const output = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(output.error.message).toBe('Database error');
      expect(output.context.query).toBe('SELECT *');
      expect(output.context.table).toBe('users');
    });
  });

  describe('Log Level Filtering', () => {
    it('should respect minimum log level', () => {
      const infoLogger = new StructuredLogger({
        serviceName: 'test',
        minLevel: 'info',
        pretty: false,
      });
      infoLogger.debug('Debug message');
      infoLogger.info('Info message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.level).toBe('info');
    });

    it('should filter debug and info when minLevel is warn', () => {
      const warnLogger = new StructuredLogger({
        serviceName: 'test',
        minLevel: 'warn',
        pretty: false,
      });
      warnLogger.debug('Debug');
      warnLogger.info('Info');
      warnLogger.warn('Warning');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.level).toBe('warn');
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with additional context', () => {
      const childLogger = logger.child({ requestId: 'req-123', userId: 'user-456' });
      childLogger.info('User action');
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.context.requestId).toBe('req-123');
      expect(output.context.userId).toBe('user-456');
      expect(output.context.service).toBe('test-service');
    });

    it('should inherit PII scrubbing in child logger', () => {
      const childLogger = logger.child({ sessionToken: 'secret-token' });
      childLogger.info('Session started');
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.context.sessionToken).toBe('[REDACTED]');
    });
  });

  describe('OpenTelemetry Integration', () => {
    it('should include trace context when span is active', () => {
      const mockSpan = {
        spanContext: () => ({
          traceId: 'trace-123',
          spanId: 'span-456',
          traceFlags: 1,
        }),
      } as unknown as Span;

      const mockContext = trace.setSpan(context.active(), mockSpan);

      context.with(mockContext, () => {
        logger.info('Traced message');
      });

      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.trace.traceId).toBe('trace-123');
      expect(output.trace.spanId).toBe('span-456');
    });

    it('should omit trace context when no span is active', () => {
      logger.info('Untraced message');
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.trace).toBeUndefined();
    });
  });

  describe('Pretty Mode', () => {
    it('should format logs in human-readable format', () => {
      const prettyLogger = new StructuredLogger({
        serviceName: 'test',
        pretty: true,
      });
      prettyLogger.info('Test message');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const output = consoleLogSpy.mock.calls[0][0];
      expect(typeof output).toBe('string');
      expect(output).toContain('INFO');
      expect(output).toContain('Test message');
    });

    it('should include colored output in pretty mode', () => {
      const prettyLogger = new StructuredLogger({
        serviceName: 'test',
        pretty: true,
      });
      prettyLogger.error('Error message');
      const output = consoleErrorSpy.mock.calls[0][0];
      expect(output).toContain('\x1b[31m'); // Red color for error
    });
  });

  describe('Service Name', () => {
    it('should use provided service name', () => {
      const customLogger = new StructuredLogger({
        serviceName: 'custom-service',
        pretty: false,
      });
      customLogger.info('Test', { extra: 'data' });
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.context.service).toBe('custom-service');
    });

    it('should use default service name when not provided', () => {
      const defaultLogger = new StructuredLogger({ pretty: false });
      defaultLogger.info('Test', { key: 'value' });
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.context.service).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty metadata', () => {
      logger.info('Message', {});
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.message).toBe('Message');
    });

    it('should handle undefined metadata', () => {
      logger.info('Message');
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.message).toBe('Message');
    });

    it('should handle very long messages', () => {
      const longMessage = 'x'.repeat(10000);
      logger.info(longMessage);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should handle nested metadata', () => {
      logger.info('Nested test', {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      });
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.context.level1.level2.level3.value).toBe('deep');
    });
  });

  describe('Timestamp', () => {
    it('should include ISO 8601 timestamp', () => {
      logger.info('Test');
      const output = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(output.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
