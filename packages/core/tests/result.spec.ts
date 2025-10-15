import { describe, expect, it } from 'vitest';

import { Result } from '../src/shared/core/Result';

describe('shared/core/Result', () => {
  it('creates a successful result and exposes the value', () => {
    const result = Result.ok(42);

    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.value).toBe(42);
  });

  it('creates a failed result and exposes the error', () => {
    const result = Result.fail('boom');

    expect(result.isSuccess).toBe(false);
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('boom');
  });

  it('throws when accessing the value of a failed result', () => {
    const result = Result.fail('nope');

    expect(() => result.value).toThrow('Cannot retrieve the value from a failed result.');
  });

  it('throws when accessing the error of a successful result', () => {
    const result = Result.ok('yes');

    expect(() => result.error).toThrow('Cannot retrieve the error from a successful result.');
  });

  it('combines multiple results and returns the first failure', () => {
    const first = Result.ok('a');
    const second = Result.fail('failure');
    const third = Result.ok('c');

    const combined = Result.combine([first, second, third]);

    expect(combined.isFailure).toBe(true);
    expect(combined.error).toBe('failure');
  });

  it('combines successful results and returns success', () => {
    const combined = Result.combine([Result.ok(1), Result.ok(2)]);

    expect(combined.isSuccess).toBe(true);
  });
});
