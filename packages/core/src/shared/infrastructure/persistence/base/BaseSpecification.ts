import type { ISpecification } from '../interfaces/ISpecification';

abstract class AbstractSpecification<TEntity> implements ISpecification<TEntity> {
  abstract isSatisfiedBy(entity: TEntity): boolean;

  and(other: ISpecification<TEntity>): ISpecification<TEntity> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<TEntity>): ISpecification<TEntity> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<TEntity> {
    return new NotSpecification(this);
  }
}

class AndSpecification<TEntity> extends AbstractSpecification<TEntity> {
  constructor(
    private readonly left: ISpecification<TEntity>,
    private readonly right: ISpecification<TEntity>
  ) {
    super();
  }

  isSatisfiedBy(entity: TEntity): boolean {
    return this.left.isSatisfiedBy(entity) && this.right.isSatisfiedBy(entity);
  }
}

class OrSpecification<TEntity> extends AbstractSpecification<TEntity> {
  constructor(
    private readonly left: ISpecification<TEntity>,
    private readonly right: ISpecification<TEntity>
  ) {
    super();
  }

  isSatisfiedBy(entity: TEntity): boolean {
    return this.left.isSatisfiedBy(entity) || this.right.isSatisfiedBy(entity);
  }
}

class NotSpecification<TEntity> extends AbstractSpecification<TEntity> {
  constructor(private readonly target: ISpecification<TEntity>) {
    super();
  }

  isSatisfiedBy(entity: TEntity): boolean {
    return !this.target.isSatisfiedBy(entity);
  }
}

/**
 * Base class to derive concrete specifications from, providing default combinators.
 */
export abstract class BaseSpecification<TEntity> extends AbstractSpecification<TEntity> {}

/**
 * Convenience specification that accepts a predicate for in-memory evaluation.
 */
export class InMemorySpecification<TEntity> extends BaseSpecification<TEntity> {
  constructor(private readonly predicate: (entity: TEntity) => boolean) {
    super();
  }

  static from<TEntity>(predicate: (entity: TEntity) => boolean): InMemorySpecification<TEntity> {
    return new InMemorySpecification(predicate);
  }

  isSatisfiedBy(entity: TEntity): boolean {
    return this.predicate(entity);
  }
}
