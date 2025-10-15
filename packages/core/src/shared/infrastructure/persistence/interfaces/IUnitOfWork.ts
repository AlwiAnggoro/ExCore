import type { Result } from '../../../core/Result';

/**
 * Represents a transactional boundary for coordinating repository operations.
 */
export interface IUnitOfWork {
  begin(): Promise<Result<void>>;
  commit(): Promise<Result<void>>;
  rollback(): Promise<Result<void>>;
  execute<T>(operation: () => Promise<Result<T>>): Promise<Result<T>>;
}
