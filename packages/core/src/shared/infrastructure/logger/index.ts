export { Logger, LogEntry } from './Logger';
export { StructuredLogger, StructuredLoggerConfig } from './StructuredLogger';
export { PIIScrubber, PIIScrubberConfig } from './PIIScrubber';

/**
 * Create a default logger instance
 */
import { StructuredLogger } from './StructuredLogger';

let defaultLogger: StructuredLogger | null = null;

export function getLogger(): StructuredLogger {
  if (!defaultLogger) {
    defaultLogger = new StructuredLogger();
  }
  return defaultLogger;
}

export function setLogger(logger: StructuredLogger): void {
  defaultLogger = logger;
}
