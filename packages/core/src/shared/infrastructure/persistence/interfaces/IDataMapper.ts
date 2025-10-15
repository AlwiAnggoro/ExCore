import type { Result } from '../../../core/Result';

/**
 * Maps between domain entities and persistence representations.
 */
export interface IDataMapper<TDomain, TPersistence> {
  toPersistence(domain: TDomain): Result<TPersistence>;
  toDomain(persistence: TPersistence): Result<TDomain>;
}
