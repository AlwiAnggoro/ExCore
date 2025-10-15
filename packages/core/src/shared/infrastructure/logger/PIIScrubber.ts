/**
 * PII Scrubbing utility for removing sensitive data from logs
 */

// PII patterns to detect and scrub
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  // JWT tokens (header.payload.signature)
  jwt: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  // API keys (alphanumeric strings 20+ chars)
  apiKey: /\b[A-Za-z0-9_-]{20,}\b/g,
};

// Sensitive field names to always scrub
const SENSITIVE_FIELDS = new Set([
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'authorization',
  'cookie',
  'ssn',
  'creditCard',
  'cvv',
  'pin',
]);

export interface PIIScrubberConfig {
  enabled?: boolean;
  maskChar?: string;
  preserveLength?: boolean;
  customPatterns?: Record<string, RegExp>;
  customSensitiveFields?: string[];
}

export class PIIScrubber {
  private enabled: boolean;
  private maskChar: string;
  private preserveLength: boolean;
  private patterns: Record<string, RegExp>;
  private sensitiveFields: Set<string>;

  constructor(config: PIIScrubberConfig = {}) {
    this.enabled = config.enabled ?? process.env.NODE_ENV !== 'test';
    this.maskChar = config.maskChar ?? '*';
    this.preserveLength = config.preserveLength ?? false;
    this.patterns = { ...PII_PATTERNS, ...(config.customPatterns || {}) };
    this.sensitiveFields = new Set([
      ...SENSITIVE_FIELDS,
      ...(config.customSensitiveFields || []),
    ]);
  }

  /**
   * Scrub PII from any value (string, object, array)
   */
  scrub(value: unknown): unknown {
    if (!this.enabled) {
      return value;
    }

    if (typeof value === 'string') {
      return this.scrubString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.scrub(item));
    }

    if (value && typeof value === 'object') {
      return this.scrubObject(value as Record<string, unknown>);
    }

    return value;
  }

  /**
   * Scrub PII patterns from strings
   */
  private scrubString(text: string): string {
    let result = text;

    for (const [name, pattern] of Object.entries(this.patterns)) {
      result = result.replace(pattern, (match) => {
        if (this.preserveLength) {
          return this.maskChar.repeat(match.length);
        }
        return `[REDACTED_${name.toUpperCase()}]`;
      });
    }

    return result;
  }

  /**
   * Scrub sensitive fields from objects
   */
  private scrubObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if field name is sensitive
      if (this.isSensitiveField(lowerKey)) {
        result[key] = '[REDACTED]';
        continue;
      }

      // Recursively scrub nested structures
      result[key] = this.scrub(value);
    }

    return result;
  }

  /**
   * Check if a field name is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    // Exact match
    if (this.sensitiveFields.has(fieldName)) {
      return true;
    }

    // Partial match (contains sensitive keyword)
    for (const sensitive of this.sensitiveFields) {
      if (fieldName.includes(sensitive)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Partially mask a string (show first/last N characters)
   */
  maskPartial(value: string, showFirst = 3, showLast = 3): string {
    if (!this.enabled || value.length <= showFirst + showLast) {
      return value;
    }

    const first = value.slice(0, showFirst);
    const last = value.slice(-showLast);
    const masked = this.maskChar.repeat(value.length - showFirst - showLast);

    return `${first}${masked}${last}`;
  }
}
