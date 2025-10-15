import { describe, expect, it } from 'vitest';

import { Entity } from '../src/shared/domain/Entity';
import { UniqueEntityID } from '../src/shared/domain/UniqueEntityID';

class TestEntity extends Entity<{ name: string }> {
  get name(): string {
    return this.props.name;
  }
}

describe('shared/domain/Entity', () => {
  it('creates a new entity with an auto-generated id', () => {
    const entity = new TestEntity({ name: 'first' });

    expect(entity.id).toBeInstanceOf(UniqueEntityID);
    expect(entity.name).toBe('first');
  });

  it('considers entities with the same id equal', () => {
    const id = new UniqueEntityID('fixed-id');
    const first = new TestEntity({ name: 'one' }, id);
    const second = new TestEntity({ name: 'two' }, id);

    expect(first.equals(second)).toBe(true);
  });

  it('considers entities with different ids not equal', () => {
    const first = new TestEntity({ name: 'one' });
    const second = new TestEntity({ name: 'two' });

    expect(first.equals(second)).toBe(false);
  });
});
