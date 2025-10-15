/**
 * Describes a query predicate that can be evaluated in-memory and translated for persistence.
 */
export interface ISpecification<TEntity> {
  isSatisfiedBy(entity: TEntity): boolean;

  /**
   * Produce a new specification representing logical AND between this and another spec.
   */
  and(other: ISpecification<TEntity>): ISpecification<TEntity>;

  /**
   * Produce a new specification representing logical OR between this and another spec.
   */
  or(other: ISpecification<TEntity>): ISpecification<TEntity>;

  /**
   * Produce a specification that negates the current predicate.
   */
  not(): ISpecification<TEntity>;
}
