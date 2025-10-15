import { describe, expect, it } from 'vitest';

import { UniqueEntityID } from '../src/shared/domain/UniqueEntityID';

describe('shared/domain/UniqueEntityID', () => {
  it('generates a uuid when none is provided', () => {
    const id = new UniqueEntityID();

    expect(typeof id.toString()).toBe('string');
    expect(id.toString()).toMatch(/[0-9a-f-]{10,}/i);
  });

  it('respects provided identifiers', () => {
    const id = new UniqueEntityID('fixed-id');

    expect(id.toValue()).toBe('fixed-id');
  });

  it('compares equality by underlying value', () => {
    const first = new UniqueEntityID('same');
    const second = new UniqueEntityID('same');
    const third = new UniqueEntityID('other');

    expect(first.equals(second)).toBe(true);
    expect(first.equals(third)).toBe(false);
  });
});
