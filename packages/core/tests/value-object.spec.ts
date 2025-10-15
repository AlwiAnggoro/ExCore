import { describe, expect, it } from 'vitest';

import { ValueObject } from '../src/shared/domain/ValueObject';

interface NameProps {
  first: string;
  last: string;
}

class Name extends ValueObject<NameProps> {
  get first(): string {
    return this.props.first;
  }

  get last(): string {
    return this.props.last;
  }
}

describe('shared/domain/ValueObject', () => {
  it('treats value objects with identical props as equal', () => {
    const first = new Name({ first: 'Ada', last: 'Lovelace' });
    const second = new Name({ first: 'Ada', last: 'Lovelace' });

    expect(first.equals(second)).toBe(true);
  });

  it('treats value objects with differing props as not equal', () => {
    const first = new Name({ first: 'Ada', last: 'Lovelace' });
    const second = new Name({ first: 'Grace', last: 'Hopper' });

    expect(first.equals(second)).toBe(false);
  });
});
