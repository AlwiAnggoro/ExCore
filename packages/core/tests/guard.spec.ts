import { describe, expect, it } from 'vitest';

import { Guard } from '../src/shared/core/Guard';

describe('shared/core/Guard', () => {
  it('detects null or undefined values', () => {
    const result = Guard.againstNullOrUndefined(null, 'email');

    expect(result.succeeded).toBe(false);
    expect(result.message).toContain('email');
  });

  it('passes through defined values', () => {
    const result = Guard.againstNullOrUndefined('value', 'email');

    expect(result.succeeded).toBe(true);
  });

  it('checks a collection of arguments and short-circuits on failure', () => {
    const result = Guard.againstNullOrUndefinedBulk([
      { argument: 'ok', argumentName: 'first' },
      { argument: undefined, argumentName: 'second' },
      { argument: 'still ok', argumentName: 'third' },
    ]);

    expect(result.succeeded).toBe(false);
    expect(result.message).toContain('second');
  });

  it('validates value membership using isOneOf', () => {
    const result = Guard.isOneOf('b', ['a', 'b', 'c'], 'letter');

    expect(result.succeeded).toBe(true);
  });

  it('validates numeric ranges', () => {
    const inside = Guard.inRange(5, 1, 10, 'number');
    const outside = Guard.inRange(15, 1, 10, 'number');

    expect(inside.succeeded).toBe(true);
    expect(outside.succeeded).toBe(false);
    expect(outside.message).toContain('number');
  });

  it('combines guard results and stops at the first failure', () => {
    const combined = Guard.combine([
      Guard.againstNullOrUndefined('ok', 'first'),
      Guard.againstNullOrUndefined(undefined, 'second'),
      Guard.againstEmpty('value', 'third'),
    ]);

    expect(combined.succeeded).toBe(false);
    expect(combined.message).toContain('second');
  });
});
