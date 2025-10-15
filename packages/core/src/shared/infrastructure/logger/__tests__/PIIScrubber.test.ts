import { describe, it, expect, beforeEach } from 'vitest';
import { PIIScrubber } from '../PIIScrubber';

describe('PIIScrubber', () => {
  let scrubber: PIIScrubber;

  beforeEach(() => {
    scrubber = new PIIScrubber({ enabled: true });
  });

  describe('String Pattern Scrubbing', () => {
    it('should scrub email addresses', () => {
      const input = 'Contact us at support@example.com for help';
      const result = scrubber.scrub(input);
      expect(result).toBe('Contact us at [REDACTED_EMAIL] for help');
    });

    it('should scrub phone numbers', () => {
      const input = 'Call me at 555-123-4567';
      const result = scrubber.scrub(input);
      expect(result).toBe('Call me at [REDACTED_PHONE]');
    });

    it('should scrub SSN', () => {
      const input = 'SSN: 123-45-6789';
      const result = scrubber.scrub(input);
      expect(result).toBe('SSN: [REDACTED_SSN]');
    });

    it('should scrub credit card numbers', () => {
      const input = 'Card: 4532-1234-5678-9010';
      const result = scrubber.scrub(input);
      expect(result).toBe('Card: [REDACTED_CREDITCARD]');
    });

    it('should scrub IPv4 addresses', () => {
      const input = 'Server IP: 192.168.1.100';
      const result = scrubber.scrub(input);
      expect(result).toBe('Server IP: [REDACTED_IPV4]');
    });

    it('should scrub JWT tokens', () => {
      const input = 'Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = scrubber.scrub(input);
      expect(result).toBe('Token: [REDACTED_JWT]');
    });

    it('should scrub multiple patterns in one string', () => {
      const input = 'Email john@example.com, phone 555-1234, IP 10.0.0.1';
      const result = scrubber.scrub(input) as string;
      expect(result).toContain('[REDACTED_EMAIL]');
      expect(result).toContain('[REDACTED_PHONE]');
      expect(result).toContain('[REDACTED_IPV4]');
    });
  });

  describe('Object Field Scrubbing', () => {
    it('should scrub sensitive field names', () => {
      const input = {
        username: 'john',
        password: 'secret123',
        email: 'john@example.com',
      };
      const result = scrubber.scrub(input) as Record<string, unknown>;
      expect(result.username).toBe('john');
      expect(result.password).toBe('[REDACTED]');
      expect(result.email).toBe('[REDACTED_EMAIL]');
    });

    it('should scrub nested sensitive fields', () => {
      const input = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            apiKey: 'sk_live_12345678901234567890',
          },
        },
      };
      const result = scrubber.scrub(input) as any;
      expect(result.user.name).toBe('John');
      expect(result.user.credentials.password).toBe('[REDACTED]');
      expect(result.user.credentials.apiKey).toBe('[REDACTED]');
    });

    it('should scrub all token-related fields', () => {
      const input = {
        accessToken: 'abc123',
        refreshToken: 'def456',
        token: 'ghi789',
      };
      const result = scrubber.scrub(input) as Record<string, unknown>;
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.refreshToken).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
    });

    it('should scrub authorization headers', () => {
      const input = {
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer token123',
          cookie: 'session=abc123',
        },
      };
      const result = scrubber.scrub(input) as any;
      expect(result.headers['content-type']).toBe('application/json');
      expect(result.headers.authorization).toBe('[REDACTED]');
      expect(result.headers.cookie).toBe('[REDACTED]');
    });
  });

  describe('Array Scrubbing', () => {
    it('should scrub all items in array', () => {
      const input = ['email: test@example.com', 'password: secret', 'normal text'];
      const result = scrubber.scrub(input) as string[];
      expect(result[0]).toBe('email: [REDACTED_EMAIL]');
      expect(result[1]).toContain('secret');
      expect(result[2]).toBe('normal text');
    });

    it('should scrub objects in arrays', () => {
      const input = [
        { username: 'john', password: 'secret' },
        { username: 'jane', password: 'hidden' },
      ];
      const result = scrubber.scrub(input) as any[];
      expect(result[0].password).toBe('[REDACTED]');
      expect(result[1].password).toBe('[REDACTED]');
    });
  });

  describe('Preserve Length Mode', () => {
    it('should preserve string length with mask characters', () => {
      const scrubberWithPreserve = new PIIScrubber({
        enabled: true,
        preserveLength: true,
        maskChar: '*',
      });
      const input = 'Email: test@example.com';
      const result = scrubberWithPreserve.scrub(input) as string;
      expect(result).toContain('*');
      expect(result.length).toBe(input.length);
    });
  });

  describe('Custom Patterns', () => {
    it('should support custom PII patterns', () => {
      const customScrubber = new PIIScrubber({
        enabled: true,
        customPatterns: {
          customId: /\bCUST-\d{6}\b/g,
        },
      });
      const input = 'Customer ID: CUST-123456';
      const result = customScrubber.scrub(input);
      expect(result).toBe('Customer ID: [REDACTED_CUSTOMID]');
    });

    it('should support custom sensitive fields', () => {
      const customScrubber = new PIIScrubber({
        enabled: true,
        customSensitiveFields: ['internalId', 'secretCode'],
      });
      const input = {
        publicId: '123',
        internalId: '999',
        secretCode: 'xyz',
      };
      const result = customScrubber.scrub(input) as Record<string, unknown>;
      expect(result.publicId).toBe('123');
      expect(result.internalId).toBe('[REDACTED]');
      expect(result.secretCode).toBe('[REDACTED]');
    });
  });

  describe('Partial Masking', () => {
    it('should partially mask strings showing first and last characters', () => {
      const value = 'abcdefghij';
      const result = scrubber.maskPartial(value, 3, 3);
      expect(result).toBe('abc****hij');
    });

    it('should not mask short strings', () => {
      const value = 'abc';
      const result = scrubber.maskPartial(value, 3, 3);
      expect(result).toBe('abc');
    });
  });

  describe('Disabled Mode', () => {
    it('should not scrub when disabled', () => {
      const disabledScrubber = new PIIScrubber({ enabled: false });
      const input = {
        email: 'test@example.com',
        password: 'secret',
      };
      const result = disabledScrubber.scrub(input);
      expect(result).toEqual(input);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined', () => {
      expect(scrubber.scrub(null)).toBe(null);
      expect(scrubber.scrub(undefined)).toBe(undefined);
    });

    it('should handle numbers and booleans', () => {
      expect(scrubber.scrub(123)).toBe(123);
      expect(scrubber.scrub(true)).toBe(true);
    });

    it('should handle empty objects and arrays', () => {
      expect(scrubber.scrub({})).toEqual({});
      expect(scrubber.scrub([])).toEqual([]);
    });

    it('should handle circular references gracefully', () => {
      const obj: any = { name: 'test' };
      obj.self = obj;
      // Should not throw (may hit recursion limit or handle it)
      expect(() => scrubber.scrub(obj)).not.toThrow();
    });
  });

  describe('Case Sensitivity', () => {
    it('should scrub fields regardless of case', () => {
      const input = {
        PASSWORD: 'secret1',
        Password: 'secret2',
        password: 'secret3',
        PassWord: 'secret4',
      };
      const result = scrubber.scrub(input) as Record<string, unknown>;
      expect(result.PASSWORD).toBe('[REDACTED]');
      expect(result.Password).toBe('[REDACTED]');
      expect(result.password).toBe('[REDACTED]');
      expect(result.PassWord).toBe('[REDACTED]');
    });
  });

  describe('Compound Field Names', () => {
    it('should scrub fields containing sensitive keywords', () => {
      const input = {
        userPassword: 'secret',
        passwordHash: 'hash123',
        oldPassword: 'old',
        newPasswordConfirm: 'new',
      };
      const result = scrubber.scrub(input) as Record<string, unknown>;
      expect(result.userPassword).toBe('[REDACTED]');
      expect(result.passwordHash).toBe('[REDACTED]');
      expect(result.oldPassword).toBe('[REDACTED]');
      expect(result.newPasswordConfirm).toBe('[REDACTED]');
    });
  });
});
