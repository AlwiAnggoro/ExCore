import { Result } from '../../../core/Result';
import type { IUnitOfWork } from '../interfaces/IUnitOfWork';
import { PostgreSQLConnectionManager } from './PostgreSQLConnectionManager';

type Operation = 'begin' | 'commit' | 'rollback';

/**
 * In-memory implementation of the unit of work pattern. This acts as a
 * scaffold for the future PostgreSQL-backed implementation while still
 * providing realistic behaviour for services that depend on transactional
 * semantics.
 */
export class PostgreSQLUnitOfWork implements IUnitOfWork {
  private active = false;
  private readonly history: Operation[] = [];

  constructor(private readonly connectionManager: PostgreSQLConnectionManager) {}

  async begin(): Promise<Result<void>> {
    this.history.push('begin');
    if (!this.connectionManager.isConnected()) {
      await this.connectionManager.connect();
    }

    this.active = true;
    return Result.ok<void>(undefined);
  }

  async commit(): Promise<Result<void>> {
    this.history.push('commit');
    this.active = false;
    return Result.ok<void>(undefined);
  }

  async rollback(): Promise<Result<void>> {
    this.history.push('rollback');
    this.active = false;
    return Result.ok<void>(undefined);
  }

  async execute<T>(operation: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
      let beginResult: Result<void, string>;
      try {
        beginResult = await this.begin();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return Result.fail<T, string>(message);
      }

      if (beginResult.isFailure) {
        return Result.fail<T, string>(beginResult.error);
      }

      const outcome = await operation();
      if (outcome.isFailure) {
        await this.rollback();
        return outcome;
      }

      const commitResult = await this.commit();
      if (commitResult.isFailure) {
        await this.rollback();
        return Result.fail<T, string>(commitResult.error);
      }

      return outcome;
    } catch (error) {
      await this.rollback();
      const message = error instanceof Error ? error.message : String(error);
      return Result.fail<T, string>(message);
    }
  }

  isInTransaction(): boolean {
    return this.active;
  }

  getOperationHistory(): ReadonlyArray<Operation> {
    return this.history;
  }
}
