import { trace, context } from '@opentelemetry/api';
import type { Logger, LogEntry } from './Logger';
import { PIIScrubber, PIIScrubberConfig } from './PIIScrubber';

export interface StructuredLoggerConfig {
  serviceName?: string;
  minLevel?: 'debug' | 'info' | 'warn' | 'error';
  pretty?: boolean;
  scrubber?: PIIScrubberConfig;
  additionalContext?: Record<string, unknown>;
}

/**
 * Structured logger with JSON output, PII scrubbing, and OpenTelemetry integration
 */
export class StructuredLogger implements Logger {
  private serviceName: string;
  private minLevel: 'debug' | 'info' | 'warn' | 'error';
  private pretty: boolean;
  private scrubber: PIIScrubber;
  private baseContext: Record<string, unknown>;

  private readonly levelPriority = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(config: StructuredLoggerConfig = {}) {
    this.serviceName = config.serviceName ?? process.env.SERVICE_NAME ?? 'excore';
    this.minLevel = config.minLevel ?? this.resolveMinLevel();
    this.pretty = config.pretty ?? process.env.LOG_PRETTY === '1';
    this.scrubber = new PIIScrubber(config.scrubber);
    this.baseContext = {
      service: this.serviceName,
      ...(config.additionalContext || {}),
    };
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, undefined, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, undefined, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, undefined, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log('error', message, error, meta);
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Record<string, unknown>): Logger {
    return new StructuredLogger({
      serviceName: this.serviceName,
      minLevel: this.minLevel,
      pretty: this.pretty,
      scrubber: { enabled: this.scrubber['enabled'] },
      additionalContext: {
        ...this.baseContext,
        ...additionalContext,
      },
    });
  }

  /**
   * Core logging method
   */
  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    error?: Error,
    meta?: Record<string, unknown>
  ): void {
    // Check minimum log level
    if (this.levelPriority[level] < this.levelPriority[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.scrubber.scrub(message) as string,
      context: this.buildContext(meta),
      trace: this.extractTraceContext(),
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: this.scrubber.scrub(error.message) as string,
        stack: error.stack,
      };
    }

    this.write(entry);
  }

  /**
   * Build log context by merging base context with metadata
   */
  private buildContext(
    meta?: Record<string, unknown>
  ): Record<string, unknown> | undefined {
    if (!meta && Object.keys(this.baseContext).length === 1) {
      // Only service name, skip for brevity
      return undefined;
    }

    const context = { ...this.baseContext };

    if (meta) {
      const scrubbedMeta = this.scrubber.scrub(meta) as Record<string, unknown>;
      Object.assign(context, scrubbedMeta);
    }

    return context;
  }

  /**
   * Extract OpenTelemetry trace context (traceId, spanId) if available
   */
  private extractTraceContext(): { traceId?: string; spanId?: string } | undefined {
    const span = trace.getSpan(context.active());
    if (!span) {
      return undefined;
    }

    const spanContext = span.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    };
  }

  /**
   * Write log entry to stdout/stderr
   */
  private write(entry: LogEntry): void {
    const output = this.pretty ? this.formatPretty(entry) : JSON.stringify(entry);

    if (entry.level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  /**
   * Format log entry for human-readable output (development mode)
   */
  private formatPretty(entry: LogEntry): string {
    const levelColors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';
    const color = levelColors[entry.level];

    let output = `${color}${entry.level.toUpperCase()}${reset} ${entry.message}`;

    if (entry.trace?.traceId) {
      output += ` [trace=${entry.trace.traceId.slice(0, 8)}]`;
    }

    if (entry.context && Object.keys(entry.context).length > 1) {
      output += `\n  ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n${entry.error.stack}`;
      }
    }

    return output;
  }

  /**
   * Resolve minimum log level from environment
   */
  private resolveMinLevel(): 'debug' | 'info' | 'warn' | 'error' {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();

    if (envLevel === 'debug' || envLevel === 'info' || envLevel === 'warn' || envLevel === 'error') {
      return envLevel;
    }

    // Default: info in production, debug otherwise
    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  }
}
